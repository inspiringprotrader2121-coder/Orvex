ALTER TYPE "workflow_type" ADD VALUE IF NOT EXISTS 'mockup_generation';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mockup_generations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "workflow_id" uuid NOT NULL,
  "product_name" text NOT NULL,
  "description" text NOT NULL,
  "color" varchar(80) NOT NULL,
  "style" varchar(120) NOT NULL,
  "hero_prompt" text NOT NULL,
  "summary" text NOT NULL,
  "images" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "mockup_generations"
    ADD CONSTRAINT "mockup_generations_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "mockup_generations"
    ADD CONSTRAINT "mockup_generations_workflow_id_workflows_id_fk"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mockup_generations_workflow_idx"
  ON "mockup_generations" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mockup_generations_user_created_idx"
  ON "mockup_generations" USING btree ("user_id", "created_at");
