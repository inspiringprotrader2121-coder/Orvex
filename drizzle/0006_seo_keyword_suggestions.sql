DO $$ BEGIN
  ALTER TYPE "workflow_type" ADD VALUE IF NOT EXISTS 'seo_keyword_analysis';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "seo_keyword_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "workflow_id" uuid NOT NULL UNIQUE REFERENCES "workflows"("id") ON DELETE CASCADE,
  "input_text" text NOT NULL,
  "source" text NOT NULL,
  "cache_key" varchar(64) NOT NULL,
  "cache_hit" boolean NOT NULL DEFAULT false,
  "optimized_title" text NOT NULL,
  "optimized_description" text NOT NULL,
  "optimized_meta_description" text NOT NULL,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "keywords" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "auto_applied" boolean NOT NULL DEFAULT false,
  "applied_listing_id" uuid REFERENCES "listings"("id") ON DELETE SET NULL,
  "auto_apply_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "seo_keyword_suggestions_cache_idx" ON "seo_keyword_suggestions" ("cache_key", "created_at");
CREATE INDEX IF NOT EXISTS "seo_keyword_suggestions_user_created_idx" ON "seo_keyword_suggestions" ("user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_keyword_suggestions_workflow_idx" ON "seo_keyword_suggestions" ("workflow_id");
