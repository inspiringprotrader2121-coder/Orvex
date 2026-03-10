import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  CompetitorKeywordMetric,
  CompetitorMarketListing,
  CompetitorPricing,
  CompetitorRanking,
  CompetitorReviews,
  CompetitorSourceType,
  CompetitorTargetListing,
} from "@server/schemas/competitor-analysis";
import type { MockupImage } from "@server/schemas/mockup-generation";
import type { MultiChannelLaunchPackChannels } from "@server/schemas/multi-channel-launch-pack";

export const workflowStatusEnum = pgEnum("workflow_status", [
  "pending",
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const workflowTypeEnum = pgEnum("workflow_type", [
  "listing_intelligence",
  "competitor_analysis",
  "opportunity_analysis",
  "listing_forge",
  "launch_pack_generation",
  "multi_channel_launch_pack",
  "mockup_generation",
  "seo_keyword_analysis",
  "bulk_launch_generation",
  "etsy_listing_launch_pack",
]);

export const providerEnum = pgEnum("provider", [
  "etsy",
  "shopify",
  "amazon",
  "gumroad",
  "internal",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "admin",
  "moderator",
  "user",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "starter",
  "pro",
  "growth",
  "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const storePlatformEnum = pgEnum("store_platform", [
  "etsy",
  "shopify",
  "amazon",
  "gumroad",
]);

export const storeConnectionStatusEnum = pgEnum("store_connection_status", [
  "connected",
  "syncing",
  "error",
  "disconnected",
]);

export const billingRecordTypeEnum = pgEnum("billing_record_type", [
  "subscription",
  "credits",
  "refund",
  "adjustment",
]);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

export const moderationItemTypeEnum = pgEnum("moderation_item_type", [
  "ai_template",
  "community_template",
  "listing_export",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "open",
  "acknowledged",
  "resolved",
]);


export const workerNodeRoleEnum = pgEnum("worker_node_role", [
  "web",
  "worker",
  "socket",
]);

export const workerNodeStatusEnum = pgEnum("worker_node_status", [
  "healthy",
  "degraded",
  "offline",
]);

export const featureToggleScopeEnum = pgEnum("feature_toggle_scope", [
  "global",
  "tier",
  "user",
]);

export const featureToggleStateEnum = pgEnum("feature_toggle_state", [
  "enabled",
  "disabled",
  "beta",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("inactive").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  // Kept as a denormalized mirror of credits.creditsAvailable for lightweight UI queries.
  credits: integer("credits").default(0).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  roleStatusIdx: index("users_role_status_idx").on(table.role, table.status),
  subscriptionIdx: index("users_subscription_idx").on(table.subscriptionTier, table.subscriptionStatus),
  lastLoginIdx: index("users_last_login_idx").on(table.lastLoginAt),
}));

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("projects_user_created_idx").on(table.userId, table.createdAt),
}));

export const workflowBatches = pgTable("workflow_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: batchStatusEnum("status").default("pending").notNull(),
  totalJobs: integer("total_jobs").default(0).notNull(),
  completedJobs: integer("completed_jobs").default(0).notNull(),
  failedJobs: integer("failed_jobs").default(0).notNull(),
  fileName: text("file_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("workflow_batches_user_created_idx").on(table.userId, table.createdAt),
}));

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").references(() => workflowBatches.id, { onDelete: "set null" }),
  storeConnectionId: uuid("store_connection_id").references(() => storeConnections.id, { onDelete: "set null" }),
  type: workflowTypeEnum("type").notNull(),
  status: workflowStatusEnum("status").default("pending").notNull(),
  sourceProvider: providerEnum("source_provider").default("internal").notNull(),
  sourceUrl: text("source_url"),
  inputData: jsonb("input_data").notNull(),
  resultData: jsonb("result_data"),
  progress: integer("progress").default(0).notNull(),
  creditsSpent: integer("credits_spent").default(0).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("workflows_user_created_idx").on(table.userId, table.createdAt),
  userStatusIdx: index("workflows_user_status_idx").on(table.userId, table.status),
  userProviderCreatedIdx: index("workflows_user_provider_created_idx").on(table.userId, table.sourceProvider, table.createdAt),
  userStoreCreatedIdx: index("workflows_user_store_created_idx").on(table.userId, table.storeConnectionId, table.createdAt),
  typeStatusIdx: index("workflows_type_status_idx").on(table.type, table.status),
  projectCreatedIdx: index("workflows_project_created_idx").on(table.projectId, table.createdAt),
  batchIdx: index("workflows_batch_idx").on(table.batchId),
}));

export const credits = pgTable("credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
  creditsAvailable: integer("credits_available").default(0).notNull(),
  creditsUsed: integer("credits_used").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex("credits_user_id_idx").on(table.userId),
}));

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("credit_transactions_user_created_idx").on(table.userId, table.createdAt),
}));

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).unique().notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  eventIdx: uniqueIndex("stripe_webhook_events_event_idx").on(table.stripeEventId),
}));

export const storeConnections = pgTable("store_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  platform: storePlatformEnum("platform").notNull(),
  status: storeConnectionStatusEnum("status").default("connected").notNull(),
  storeName: text("store_name").notNull(),
  externalAccountId: varchar("external_account_id", { length: 255 }),
  apiStatus: varchar("api_status", { length: 100 }).default("healthy").notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  productsCount: integer("products_count").default(0).notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  platformStatusIdx: index("store_connections_platform_status_idx").on(table.platform, table.status),
  userPlatformIdx: index("store_connections_user_platform_idx").on(table.userId, table.platform),
}));

export const billingRecords = pgTable("billing_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: billingRecordTypeEnum("type").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  creditsAmount: integer("credits_amount").default(0).notNull(),
  provider: varchar("provider", { length: 50 }).default("stripe").notNull(),
  reference: varchar("reference", { length: 255 }),
  description: text("description"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  typeCreatedIdx: index("billing_records_type_created_idx").on(table.type, table.createdAt),
  userCreatedIdx: index("billing_records_user_created_idx").on(table.userId, table.createdAt),
}));

export const aiUsageEvents = pgTable("ai_usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  feature: varchar("feature", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  promptTokens: integer("prompt_tokens").default(0).notNull(),
  completionTokens: integer("completion_tokens").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  costUsdMicros: integer("cost_usd_micros").default(0).notNull(),
  cacheHit: boolean("cache_hit").default(false).notNull(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  featureCreatedIdx: index("ai_usage_events_feature_created_idx").on(table.feature, table.createdAt),
  userCreatedIdx: index("ai_usage_events_user_created_idx").on(table.userId, table.createdAt),
  workflowIdx: index("ai_usage_events_workflow_idx").on(table.workflowId),
}));

export const contentModerationItems = pgTable("content_moderation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  type: moderationItemTypeEnum("type").notNull(),
  status: moderationStatusEnum("status").default("pending").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  payload: jsonb("payload").default(sql`'{}'::jsonb`).notNull(),
  moderatedByUserId: uuid("moderated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  moderationNotes: text("moderation_notes"),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusCreatedIdx: index("content_moderation_items_status_created_idx").on(table.status, table.createdAt),
  typeStatusIdx: index("content_moderation_items_type_status_idx").on(table.type, table.status),
  userCreatedIdx: index("content_moderation_items_user_created_idx").on(table.userId, table.createdAt),
}));

export const communityTemplates = pgTable("community_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  status: moderationStatusEnum("status").default("pending").notNull(),
  popularityScore: integer("popularity_score").default(0).notNull(),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  payload: jsonb("payload").default(sql`'{}'::jsonb`).notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryStatusIdx: index("community_templates_category_status_idx").on(table.category, table.status),
  popularityIdx: index("community_templates_popularity_idx").on(table.popularityScore, table.downloadsCount),
  userCreatedIdx: index("community_templates_user_created_idx").on(table.userId, table.createdAt),
}));

export const featureToggles = pgTable("feature_toggles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 120 }).notNull(),
  scope: featureToggleScopeEnum("scope").default("global").notNull(),
  state: featureToggleStateEnum("state").default("enabled").notNull(),
  description: text("description"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  subscriptionTier: subscriptionTierEnum("subscription_tier"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  keyScopeIdx: uniqueIndex("feature_toggles_key_scope_idx").on(table.key, table.scope, table.userId, table.subscriptionTier),
  userIdx: index("feature_toggles_user_idx").on(table.userId),
}));

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 150 }).notNull(),
  entityType: varchar("entity_type", { length: 120 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  result: varchar("result", { length: 50 }).default("success").notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  actionCreatedIdx: index("admin_audit_logs_action_created_idx").on(table.action, table.createdAt),
  actorCreatedIdx: index("admin_audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
}));

export const adminAlerts = pgTable("admin_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: varchar("source", { length: 120 }).notNull(),
  severity: alertSeverityEnum("severity").default("warning").notNull(),
  status: alertStatusEnum("status").default("open").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  thresholdValue: integer("threshold_value"),
  observedValue: integer("observed_value"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  acknowledgedByUserId: uuid("acknowledged_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  severityStatusIdx: index("admin_alerts_severity_status_idx").on(table.severity, table.status),
  sourceCreatedIdx: index("admin_alerts_source_created_idx").on(table.source, table.createdAt),
}));

export const adminQueueMetrics = pgTable("admin_queue_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  queueDepth: integer("queue_depth").default(0).notNull(),
  waiting: integer("waiting").default(0).notNull(),
  active: integer("active").default(0).notNull(),
  delayed: integer("delayed").default(0).notNull(),
  failed: integer("failed").default(0).notNull(),
  completed: integer("completed").default(0).notNull(),
  workerCount: integer("worker_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdIdx: index("admin_queue_metrics_created_idx").on(table.createdAt),
}));

export const workerNodes = pgTable("worker_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeName: varchar("node_name", { length: 120 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  role: workerNodeRoleEnum("role").notNull(),
  status: workerNodeStatusEnum("status").default("healthy").notNull(),
  pm2ProcessName: varchar("pm2_process_name", { length: 120 }).notNull(),
  queueNames: jsonb("queue_names").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  cpuPercent: integer("cpu_percent").default(0).notNull(),
  memoryMb: integer("memory_mb").default(0).notNull(),
  backlogCount: integer("backlog_count").default(0).notNull(),
  uptimeSeconds: integer("uptime_seconds").default(0).notNull(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  hostRoleIdx: uniqueIndex("worker_nodes_host_role_idx").on(table.host, table.role, table.pm2ProcessName),
  statusHeartbeatIdx: index("worker_nodes_status_heartbeat_idx").on(table.status, table.lastHeartbeatAt),
}));

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 120 }).unique().notNull(),
  value: jsonb("value").default(sql`'{}'::jsonb`).notNull(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  keyIdx: uniqueIndex("admin_settings_key_idx").on(table.key),
}));

export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 64 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  keyIdx: uniqueIndex("admin_roles_key_idx").on(table.key),
  systemIdx: index("admin_roles_system_idx").on(table.isSystem),
}));

export const listingAnalyses = pgTable("listing_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  provider: providerEnum("provider").default("etsy").notNull(),
  sourceUrl: text("source_url").notNull(),
  listingTitle: text("listing_title").notNull(),
  listingDescription: text("listing_description").default("").notNull(),
  listingTags: jsonb("listing_tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  rawListingData: jsonb("raw_listing_data").default(sql`'{}'::jsonb`).notNull(),
  listingScore: integer("listing_score").notNull(),
  seoScore: integer("seo_score").notNull(),
  conversionScore: integer("conversion_score").notNull(),
  keywordCoverage: integer("keyword_coverage").notNull(),
  emotionalHookScore: integer("emotional_hook_score").notNull(),
  ctaStrength: integer("cta_strength").notNull(),
  strengths: jsonb("strengths").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  keywordGaps: jsonb("keyword_gaps").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  optimizedTitle: text("optimized_title").notNull(),
  optimizedDescription: text("optimized_description").notNull(),
  suggestedTags: jsonb("suggested_tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: uniqueIndex("listing_analyses_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("listing_analyses_user_created_idx").on(table.userId, table.createdAt),
  userProviderCreatedIdx: index("listing_analyses_user_provider_created_idx").on(table.userId, table.provider, table.createdAt),
  sourceIdx: index("listing_analyses_source_idx").on(table.sourceUrl),
}));

export const competitorAnalyses = pgTable("competitor_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  analysisKey: varchar("analysis_key", { length: 255 }).notNull(),
  analysisVersion: integer("analysis_version").default(1).notNull(),
  inputLabel: text("input_label").notNull(),
  provider: providerEnum("provider").default("etsy").notNull(),
  sourceType: varchar("source_type", { length: 20 }).$type<CompetitorSourceType>().default("listing").notNull(),
  sourceUrl: text("source_url"),
  listingTitle: text("listing_title").notNull(),
  listingDescription: text("listing_description").default("").notNull(),
  listingTags: jsonb("listing_tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  summary: text("summary").default("").notNull(),
  pricing: jsonb("pricing").$type<CompetitorPricing>().default(sql`'{}'::jsonb`).notNull(),
  reviews: jsonb("reviews").$type<CompetitorReviews>().default(sql`'{}'::jsonb`).notNull(),
  ranking: jsonb("ranking").$type<CompetitorRanking>().default(sql`'{}'::jsonb`).notNull(),
  keywords: jsonb("keywords").$type<CompetitorKeywordMetric[]>().default(sql`'[]'::jsonb`).notNull(),
  comparisonSet: jsonb("comparison_set").$type<CompetitorMarketListing[]>().default(sql`'[]'::jsonb`).notNull(),
  targetListing: jsonb("target_listing").$type<CompetitorTargetListing | null>(),
  strengths: jsonb("strengths").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  keywordOpportunities: jsonb("keyword_opportunities").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  differentiationStrategy: text("differentiation_strategy").notNull(),
  rawListingData: jsonb("raw_listing_data").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  analysisVersionIdx: uniqueIndex("competitor_analyses_analysis_version_idx").on(table.userId, table.analysisKey, table.analysisVersion),
  analysisKeyIdx: index("competitor_analyses_analysis_key_idx").on(table.userId, table.analysisKey, table.createdAt),
  workflowIdx: uniqueIndex("competitor_analyses_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("competitor_analyses_user_created_idx").on(table.userId, table.createdAt),
  userProviderCreatedIdx: index("competitor_analyses_user_provider_created_idx").on(table.userId, table.provider, table.createdAt),
}));

export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  keyword: text("keyword").notNull(),
  demandScore: integer("demand_score").notNull(),
  competitionScore: integer("competition_score").notNull(),
  trendScore: integer("trend_score").notNull(),
  opportunityScore: integer("opportunity_score").notNull(),
  productIdeas: jsonb("product_ideas").default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: uniqueIndex("opportunities_workflow_idx").on(table.workflowId),
  keywordIdx: index("opportunities_keyword_idx").on(table.keyword),
  userCreatedIdx: index("opportunities_user_created_idx").on(table.userId, table.createdAt),
  userKeywordCreatedIdx: index("opportunities_user_keyword_created_idx").on(table.userId, table.keyword, table.createdAt),
}));

export const launchPacks = pgTable("launch_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  ideaName: text("idea_name").notNull(),
  nicheKeyword: text("niche_keyword"),
  seoTitles: jsonb("seo_titles").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  keywordTags: jsonb("keyword_tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  optimizedDescription: text("optimized_description").notNull(),
  faq: jsonb("faq").default(sql`'[]'::jsonb`).notNull(),
  tikTokHooks: jsonb("tiktok_hooks").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  pinterestCaptions: jsonb("pinterest_captions").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  emailLaunchSequence: jsonb("email_launch_sequence").default(sql`'[]'::jsonb`).notNull(),
  launchCalendar: jsonb("launch_calendar").default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: uniqueIndex("launch_packs_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("launch_packs_user_created_idx").on(table.userId, table.createdAt),
}));

export const multiChannelLaunchPacks = pgTable("multi_channel_launch_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  cacheKey: varchar("cache_key", { length: 64 }).notNull(),
  cacheHit: boolean("cache_hit").default(false).notNull(),
  productName: text("product_name").notNull(),
  productType: text("product_type").notNull(),
  summary: text("summary").notNull(),
  targetAudience: text("target_audience").notNull(),
  channels: jsonb("channels").$type<MultiChannelLaunchPackChannels>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  cacheIdx: index("multi_channel_launch_packs_cache_idx").on(table.cacheKey, table.createdAt),
  workflowIdx: uniqueIndex("multi_channel_launch_packs_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("multi_channel_launch_packs_user_created_idx").on(table.userId, table.createdAt),
}));

export const mockupGenerations = pgTable("mockup_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  productName: text("product_name").notNull(),
  description: text("description").notNull(),
  color: varchar("color", { length: 80 }).notNull(),
  style: varchar("style", { length: 120 }).notNull(),
  heroPrompt: text("hero_prompt").notNull(),
  summary: text("summary").notNull(),
  images: jsonb("images").$type<MockupImage[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: uniqueIndex("mockup_generations_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("mockup_generations_user_created_idx").on(table.userId, table.createdAt),
}));

export const seoKeywordSuggestions = pgTable("seo_keyword_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  inputText: text("input_text").notNull(),
  source: text("source").notNull(),
  cacheKey: varchar("cache_key", { length: 64 }).notNull(),
  cacheHit: boolean("cache_hit").default(false).notNull(),
  optimizedTitle: text("optimized_title").notNull(),
  optimizedDescription: text("optimized_description").notNull(),
  optimizedMetaDescription: text("optimized_meta_description").notNull(),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  keywords: jsonb("keywords").default(sql`'[]'::jsonb`).notNull(),
  autoApplied: boolean("auto_applied").default(false).notNull(),
  appliedListingId: uuid("applied_listing_id"),
  autoApplyNotes: text("auto_apply_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  cacheIdx: index("seo_keyword_suggestions_cache_idx").on(table.cacheKey, table.createdAt),
  userCreatedIdx: index("seo_keyword_suggestions_user_created_idx").on(table.userId, table.createdAt),
  workflowIdx: uniqueIndex("seo_keyword_suggestions_workflow_idx").on(table.workflowId),
}));

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  productName: text("product_name").notNull(),
  targetAudience: text("target_audience").notNull(),
  productType: text("product_type").notNull(),
  tone: text("tone").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  faq: jsonb("faq").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: uniqueIndex("listings_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("listings_user_created_idx").on(table.userId, table.createdAt),
  projectIdx: index("listings_project_idx").on(table.projectId),
  userProjectCreatedIdx: index("listings_user_project_created_idx").on(table.userId, table.projectId, table.createdAt),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  creditAccount: one(credits, { fields: [users.id], references: [credits.userId] }),
  projects: many(projects),
  storeConnections: many(storeConnections),
  workflows: many(workflows),
  workflowBatches: many(workflowBatches),
  listingAnalyses: many(listingAnalyses),
  competitorAnalyses: many(competitorAnalyses),
  opportunities: many(opportunities),
  launchPacks: many(launchPacks),
  multiChannelLaunchPacks: many(multiChannelLaunchPacks),
  mockupGenerations: many(mockupGenerations),
  seoKeywordSuggestions: many(seoKeywordSuggestions),
  listings: many(listings),
  creditTransactions: many(creditTransactions),
}));

export const creditsRelations = relations(credits, ({ one }) => ({
  user: one(users, { fields: [credits.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  workflows: many(workflows),
}));

export const workflowBatchesRelations = relations(workflowBatches, ({ one, many }) => ({
  user: one(users, { fields: [workflowBatches.userId], references: [users.id] }),
  workflows: many(workflows),
}));

export const storeConnectionsRelations = relations(storeConnections, ({ many, one }) => ({
  user: one(users, { fields: [storeConnections.userId], references: [users.id] }),
  workflows: many(workflows),
}));

export const workflowsRelations = relations(workflows, ({ one }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  project: one(projects, { fields: [workflows.projectId], references: [projects.id] }),
  batch: one(workflowBatches, { fields: [workflows.batchId], references: [workflowBatches.id] }),
  storeConnection: one(storeConnections, { fields: [workflows.storeConnectionId], references: [storeConnections.id] }),
}));
