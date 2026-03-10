DO $$ BEGIN
  ALTER TYPE "workflow_type" ADD VALUE IF NOT EXISTS 'multi_channel_launch_pack';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "multi_channel_launch_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "workflow_id" uuid NOT NULL UNIQUE REFERENCES "workflows"("id") ON DELETE CASCADE,
  "cache_key" varchar(64) NOT NULL,
  "cache_hit" boolean NOT NULL DEFAULT false,
  "product_name" text NOT NULL,
  "product_type" text NOT NULL,
  "summary" text NOT NULL,
  "target_audience" text NOT NULL,
  "channels" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "multi_channel_launch_packs_workflow_idx" ON "multi_channel_launch_packs" ("workflow_id");
CREATE INDEX IF NOT EXISTS "multi_channel_launch_packs_user_created_idx" ON "multi_channel_launch_packs" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "multi_channel_launch_packs_cache_idx" ON "multi_channel_launch_packs" ("cache_key", "created_at");
