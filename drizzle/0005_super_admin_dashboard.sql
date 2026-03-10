DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('super_admin', 'admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_tier" AS ENUM ('free', 'starter', 'pro', 'growth', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM ('inactive', 'trialing', 'active', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "store_platform" AS ENUM ('etsy', 'shopify', 'amazon', 'gumroad');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "store_connection_status" AS ENUM ('connected', 'syncing', 'error', 'disconnected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "billing_record_type" AS ENUM ('subscription', 'credits', 'refund', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "moderation_status" AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "moderation_item_type" AS ENUM ('ai_template', 'community_template', 'listing_export');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "alert_severity" AS ENUM ('info', 'warning', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "alert_status" AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "worker_node_role" AS ENUM ('web', 'worker', 'socket');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "worker_node_status" AS ENUM ('healthy', 'degraded', 'offline');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "feature_toggle_scope" AS ENUM ('global', 'tier', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "feature_toggle_state" AS ENUM ('enabled', 'disabled', 'beta');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'user';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "user_status" NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_tier" "subscription_tier" NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_status" "subscription_status" NOT NULL DEFAULT 'inactive';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users" ("role", "status");
CREATE INDEX IF NOT EXISTS "users_subscription_idx" ON "users" ("subscription_tier", "subscription_status");
CREATE INDEX IF NOT EXISTS "users_last_login_idx" ON "users" ("last_login_at");

CREATE TABLE IF NOT EXISTS "store_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform" "store_platform" NOT NULL,
  "status" "store_connection_status" NOT NULL DEFAULT 'connected',
  "store_name" text NOT NULL,
  "external_account_id" varchar(255),
  "api_status" varchar(100) NOT NULL DEFAULT 'healthy',
  "last_sync_at" timestamptz,
  "products_count" integer NOT NULL DEFAULT 0,
  "error_message" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "store_connections_platform_status_idx" ON "store_connections" ("platform", "status");
CREATE INDEX IF NOT EXISTS "store_connections_user_platform_idx" ON "store_connections" ("user_id", "platform");

CREATE TABLE IF NOT EXISTS "billing_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "billing_record_type" NOT NULL,
  "status" "subscription_status" NOT NULL DEFAULT 'active',
  "amount_cents" integer NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'usd',
  "credits_amount" integer NOT NULL DEFAULT 0,
  "provider" varchar(50) NOT NULL DEFAULT 'stripe',
  "reference" varchar(255),
  "description" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "billing_records_type_created_idx" ON "billing_records" ("type", "created_at");
CREATE INDEX IF NOT EXISTS "billing_records_user_created_idx" ON "billing_records" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "ai_usage_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "workflow_id" uuid REFERENCES "workflows"("id") ON DELETE SET NULL,
  "feature" varchar(100) NOT NULL,
  "model" varchar(100) NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "total_tokens" integer NOT NULL DEFAULT 0,
  "cost_usd_micros" integer NOT NULL DEFAULT 0,
  "cache_hit" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_usage_events_feature_created_idx" ON "ai_usage_events" ("feature", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_user_created_idx" ON "ai_usage_events" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_workflow_idx" ON "ai_usage_events" ("workflow_id");

CREATE TABLE IF NOT EXISTS "content_moderation_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "workflow_id" uuid REFERENCES "workflows"("id") ON DELETE SET NULL,
  "type" "moderation_item_type" NOT NULL,
  "status" "moderation_status" NOT NULL DEFAULT 'pending',
  "title" text NOT NULL,
  "summary" text,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "moderated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "moderation_notes" text,
  "moderated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "content_moderation_items_status_created_idx" ON "content_moderation_items" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "content_moderation_items_type_status_idx" ON "content_moderation_items" ("type", "status");
CREATE INDEX IF NOT EXISTS "content_moderation_items_user_created_idx" ON "content_moderation_items" ("user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "content_moderation_items_workflow_idx" ON "content_moderation_items" ("workflow_id");

CREATE TABLE IF NOT EXISTS "community_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" varchar(100) NOT NULL,
  "status" "moderation_status" NOT NULL DEFAULT 'pending',
  "popularity_score" integer NOT NULL DEFAULT 0,
  "downloads_count" integer NOT NULL DEFAULT 0,
  "usage_count" integer NOT NULL DEFAULT 0,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "approved_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "community_templates_category_status_idx" ON "community_templates" ("category", "status");
CREATE INDEX IF NOT EXISTS "community_templates_popularity_idx" ON "community_templates" ("popularity_score", "downloads_count");
CREATE INDEX IF NOT EXISTS "community_templates_user_created_idx" ON "community_templates" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "feature_toggles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(120) NOT NULL,
  "scope" "feature_toggle_scope" NOT NULL DEFAULT 'global',
  "state" "feature_toggle_state" NOT NULL DEFAULT 'enabled',
  "description" text,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_tier" "subscription_tier",
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_toggles_key_scope_idx" ON "feature_toggles" ("key", "scope", "user_id", "subscription_tier");
CREATE INDEX IF NOT EXISTS "feature_toggles_user_idx" ON "feature_toggles" ("user_id");

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "target_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" varchar(150) NOT NULL,
  "entity_type" varchar(120) NOT NULL,
  "entity_id" varchar(255),
  "result" varchar(50) NOT NULL DEFAULT 'success',
  "ip_address" varchar(100),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_created_idx" ON "admin_audit_logs" ("action", "created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_created_idx" ON "admin_audit_logs" ("actor_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "admin_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" varchar(120) NOT NULL,
  "severity" "alert_severity" NOT NULL DEFAULT 'warning',
  "status" "alert_status" NOT NULL DEFAULT 'open',
  "title" text NOT NULL,
  "message" text NOT NULL,
  "threshold_value" integer,
  "observed_value" integer,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "acknowledged_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_alerts_severity_status_idx" ON "admin_alerts" ("severity", "status");
CREATE INDEX IF NOT EXISTS "admin_alerts_source_created_idx" ON "admin_alerts" ("source", "created_at");

CREATE TABLE IF NOT EXISTS "worker_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "node_name" varchar(120) NOT NULL,
  "host" varchar(255) NOT NULL,
  "role" "worker_node_role" NOT NULL,
  "status" "worker_node_status" NOT NULL DEFAULT 'healthy',
  "pm2_process_name" varchar(120) NOT NULL,
  "queue_names" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "cpu_percent" integer NOT NULL DEFAULT 0,
  "memory_mb" integer NOT NULL DEFAULT 0,
  "backlog_count" integer NOT NULL DEFAULT 0,
  "uptime_seconds" integer NOT NULL DEFAULT 0,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_heartbeat_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "worker_nodes_host_role_idx" ON "worker_nodes" ("host", "role", "pm2_process_name");
CREATE INDEX IF NOT EXISTS "worker_nodes_status_heartbeat_idx" ON "worker_nodes" ("status", "last_heartbeat_at");

CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(120) NOT NULL UNIQUE,
  "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_settings_key_idx" ON "admin_settings" ("key");
