DO $$ BEGIN
  ALTER TYPE "workflow_type" ADD VALUE IF NOT EXISTS 'listing_forge';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
  "workflow_id" uuid NOT NULL UNIQUE REFERENCES "workflows"("id") ON DELETE CASCADE,
  "product_name" text NOT NULL,
  "target_audience" text NOT NULL,
  "product_type" text NOT NULL,
  "tone" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "faq" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "listings_workflow_idx" ON "listings" ("workflow_id");
CREATE INDEX IF NOT EXISTS "listings_user_created_idx" ON "listings" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "listings_project_idx" ON "listings" ("project_id");
