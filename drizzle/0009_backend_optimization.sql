ALTER TABLE "workflows"
  ADD COLUMN IF NOT EXISTS "store_connection_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "workflows"
    ADD CONSTRAINT "workflows_store_connection_id_store_connections_id_fk"
    FOREIGN KEY ("store_connection_id") REFERENCES "public"."store_connections"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_user_provider_created_idx"
  ON "workflows" USING btree ("user_id", "source_provider", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_user_store_created_idx"
  ON "workflows" USING btree ("user_id", "store_connection_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_project_created_idx"
  ON "workflows" USING btree ("project_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_analyses_user_provider_created_idx"
  ON "listing_analyses" USING btree ("user_id", "provider", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_analyses_user_provider_created_idx"
  ON "competitor_analyses" USING btree ("user_id", "provider", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "opportunities_user_keyword_created_idx"
  ON "opportunities" USING btree ("user_id", "keyword", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_user_project_created_idx"
  ON "listings" USING btree ("user_id", "project_id", "created_at");
