DO $$
BEGIN
  CREATE TYPE "workflow_status" AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "workflow_type" AS ENUM (
    'listing_intelligence',
    'competitor_analysis',
    'opportunity_analysis',
    'launch_pack_generation',
    'bulk_launch_generation',
    'etsy_listing_launch_pack'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "provider" AS ENUM ('etsy', 'shopify', 'amazon', 'gumroad', 'internal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "batch_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'credits' AND column_name = 'balance'
  ) THEN
    ALTER TABLE "credits" RENAME COLUMN "balance" TO "credits_available";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "credits" ADD COLUMN IF NOT EXISTS "credits_available" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "credits" ADD COLUMN IF NOT EXISTS "credits_used" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN IF NOT EXISTS "workflow_id" uuid;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "status" "batch_status" DEFAULT 'pending' NOT NULL,
  "total_jobs" integer DEFAULT 0 NOT NULL,
  "completed_jobs" integer DEFAULT 0 NOT NULL,
  "failed_jobs" integer DEFAULT 0 NOT NULL,
  "file_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "batch_id" uuid;
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "source_provider" "provider" DEFAULT 'internal' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "progress" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "credits_spent" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "error_message" text;
--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "type" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "workflows"
  ALTER COLUMN "type" TYPE "workflow_type"
  USING "type"::"workflow_type";
--> statement-breakpoint
ALTER TABLE "workflows"
  ALTER COLUMN "status" TYPE "workflow_status"
  USING "status"::"workflow_status";
--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "status" SET DEFAULT 'pending'::"workflow_status";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workflow_id" uuid NOT NULL,
  "provider" "provider" DEFAULT 'etsy' NOT NULL,
  "source_url" text NOT NULL,
  "listing_title" text NOT NULL,
  "listing_description" text DEFAULT '' NOT NULL,
  "listing_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "raw_listing_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "listing_score" integer NOT NULL,
  "seo_score" integer NOT NULL,
  "conversion_score" integer NOT NULL,
  "keyword_coverage" integer NOT NULL,
  "emotional_hook_score" integer NOT NULL,
  "cta_strength" integer NOT NULL,
  "strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "keyword_gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "optimized_title" text NOT NULL,
  "optimized_description" text NOT NULL,
  "suggested_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitor_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workflow_id" uuid NOT NULL,
  "provider" "provider" DEFAULT 'etsy' NOT NULL,
  "source_url" text NOT NULL,
  "listing_title" text NOT NULL,
  "listing_description" text DEFAULT '' NOT NULL,
  "listing_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "keyword_opportunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "differentiation_strategy" text NOT NULL,
  "raw_listing_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workflow_id" uuid NOT NULL,
  "keyword" text NOT NULL,
  "demand_score" integer NOT NULL,
  "competition_score" integer NOT NULL,
  "trend_score" integer NOT NULL,
  "opportunity_score" integer NOT NULL,
  "product_ideas" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "launch_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workflow_id" uuid NOT NULL,
  "idea_name" text NOT NULL,
  "niche_keyword" text,
  "seo_titles" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "keyword_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "optimized_description" text NOT NULL,
  "faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tiktok_hooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "pinterest_captions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "email_launch_sequence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "launch_calendar" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "workflow_batches"
    ADD CONSTRAINT "workflow_batches_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "credit_transactions"
    ADD CONSTRAINT "credit_transactions_workflow_id_workflows_id_fk"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "workflows"
    ADD CONSTRAINT "workflows_batch_id_workflow_batches_id_fk"
    FOREIGN KEY ("batch_id") REFERENCES "public"."workflow_batches"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "listing_analyses"
    ADD CONSTRAINT "listing_analyses_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "listing_analyses"
    ADD CONSTRAINT "listing_analyses_workflow_id_workflows_id_fk"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "competitor_analyses"
    ADD CONSTRAINT "competitor_analyses_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "competitor_analyses"
    ADD CONSTRAINT "competitor_analyses_workflow_id_workflows_id_fk"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "opportunities"
    ADD CONSTRAINT "opportunities_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "opportunities"
    ADD CONSTRAINT "opportunities_workflow_id_workflows_id_fk"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "launch_packs"
    ADD CONSTRAINT "launch_packs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "launch_packs"
    ADD CONSTRAINT "launch_packs_workflow_id_workflows_id_fk"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_user_created_idx" ON "projects" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credits_user_id_idx" ON "credits" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_batches_user_created_idx" ON "workflow_batches" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_user_created_idx" ON "workflows" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_user_status_idx" ON "workflows" USING btree ("user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_type_status_idx" ON "workflows" USING btree ("type", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_batch_idx" ON "workflows" USING btree ("batch_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_events_event_idx" ON "stripe_webhook_events" USING btree ("stripe_event_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listing_analyses_workflow_idx" ON "listing_analyses" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_analyses_user_created_idx" ON "listing_analyses" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_analyses_source_idx" ON "listing_analyses" USING btree ("source_url");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "competitor_analyses_workflow_idx" ON "competitor_analyses" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_analyses_user_created_idx" ON "competitor_analyses" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "opportunities_workflow_idx" ON "opportunities" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_keyword_idx" ON "opportunities" USING btree ("keyword");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_user_created_idx" ON "opportunities" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "launch_packs_workflow_idx" ON "launch_packs" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "launch_packs_user_created_idx" ON "launch_packs" USING btree ("user_id", "created_at");
