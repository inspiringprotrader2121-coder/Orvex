CREATE TABLE IF NOT EXISTS "admin_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(64) NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "admin_roles"
    ADD CONSTRAINT "admin_roles_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_roles_key_idx"
  ON "admin_roles" USING btree ("key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_roles_system_idx"
  ON "admin_roles" USING btree ("is_system");
--> statement-breakpoint
INSERT INTO "admin_roles" ("key", "name", "description", "permissions", "is_system")
VALUES
  (
    'super_admin',
    'Super Admin',
    'Full system access to Orvex administration.',
    '["*"]'::jsonb,
    true
  ),
  (
    'admin',
    'Admin',
    'Operational admin access with user and workflow controls.',
    '[
      "admin.access",
      "admin.overview.read",
      "admin.usage.read",
      "admin.users.read",
      "admin.users.write",
      "admin.roles.read",
      "admin.operations.read",
      "admin.operations.write",
      "admin.finance.read",
      "admin.moderation.read",
      "admin.moderation.write",
      "admin.audit.read",
      "admin.alerts.read",
      "admin.export",
      "admin.integrations.read",
      "admin.integrations.write",
      "admin.system.read",
      "admin.features.manage"
    ]'::jsonb,
    true
  ),
  (
    'moderator',
    'Moderator',
    'Moderation-focused access for content and reviews.',
    '[
      "admin.access",
      "admin.overview.read",
      "admin.users.read",
      "admin.moderation.read",
      "admin.moderation.write",
      "admin.audit.read"
    ]'::jsonb,
    true
  ),
  (
    'user',
    'User',
    'Default role with no admin permissions.',
    '[]'::jsonb,
    true
  )
ON CONFLICT ("key") DO NOTHING;
