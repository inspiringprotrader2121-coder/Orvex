ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "analysis_key" varchar(255);
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "analysis_version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "input_label" text;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "source_type" varchar(20) DEFAULT 'listing';
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "summary" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "pricing" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "reviews" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "ranking" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "comparison_set" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD COLUMN IF NOT EXISTS "target_listing" jsonb;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ALTER COLUMN "source_url" DROP NOT NULL;
--> statement-breakpoint
UPDATE "competitor_analyses"
SET
  "analysis_key" = COALESCE(
    "analysis_key",
    CASE
      WHEN "source_url" IS NOT NULL AND "source_url" <> ''
        THEN 'listing:' || COALESCE(NULLIF(substring("source_url" from '/listing/([0-9]+)'), ''), md5("source_url"))
      ELSE 'legacy:' || "workflow_id"::text
    END
  ),
  "analysis_version" = COALESCE("analysis_version", 1),
  "input_label" = COALESCE(NULLIF("input_label", ''), NULLIF("listing_title", ''), NULLIF("source_url", ''), 'Competitor Analysis'),
  "source_type" = COALESCE(NULLIF("source_type", ''), CASE WHEN "source_url" IS NOT NULL AND "source_url" <> '' THEN 'listing' ELSE 'keyword' END),
  "summary" = CASE
    WHEN "summary" IS NOT NULL AND "summary" <> '' THEN "summary"
    WHEN "differentiation_strategy" IS NOT NULL AND "differentiation_strategy" <> '' THEN left("differentiation_strategy", 240)
    ELSE 'Legacy competitor analysis'
  END
WHERE
  "analysis_key" IS NULL
  OR "analysis_version" IS NULL
  OR "input_label" IS NULL
  OR "source_type" IS NULL
  OR "summary" = '';
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ALTER COLUMN "analysis_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ALTER COLUMN "analysis_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ALTER COLUMN "input_label" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "competitor_analyses" ALTER COLUMN "source_type" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_analyses_analysis_key_idx"
  ON "competitor_analyses" USING btree ("user_id", "analysis_key", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "competitor_analyses_analysis_version_idx"
  ON "competitor_analyses" USING btree ("user_id", "analysis_key", "analysis_version");
