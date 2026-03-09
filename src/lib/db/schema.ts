import { relations, sql } from "drizzle-orm";
import {
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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  // Kept as a denormalized mirror of credits.creditsAvailable for lightweight UI queries.
  credits: integer("credits").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
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
  typeStatusIdx: index("workflows_type_status_idx").on(table.type, table.status),
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
  sourceIdx: index("listing_analyses_source_idx").on(table.sourceUrl),
}));

export const competitorAnalyses = pgTable("competitor_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).unique().notNull(),
  provider: providerEnum("provider").default("etsy").notNull(),
  sourceUrl: text("source_url").notNull(),
  listingTitle: text("listing_title").notNull(),
  listingDescription: text("listing_description").default("").notNull(),
  listingTags: jsonb("listing_tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  strengths: jsonb("strengths").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  keywordOpportunities: jsonb("keyword_opportunities").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  differentiationStrategy: text("differentiation_strategy").notNull(),
  rawListingData: jsonb("raw_listing_data").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: uniqueIndex("competitor_analyses_workflow_idx").on(table.workflowId),
  userCreatedIdx: index("competitor_analyses_user_created_idx").on(table.userId, table.createdAt),
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
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  creditAccount: one(credits, { fields: [users.id], references: [credits.userId] }),
  projects: many(projects),
  workflows: many(workflows),
  workflowBatches: many(workflowBatches),
  listingAnalyses: many(listingAnalyses),
  competitorAnalyses: many(competitorAnalyses),
  opportunities: many(opportunities),
  launchPacks: many(launchPacks),
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

export const workflowsRelations = relations(workflows, ({ one }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  project: one(projects, { fields: [workflows.projectId], references: [projects.id] }),
  batch: one(workflowBatches, { fields: [workflows.batchId], references: [workflowBatches.id] }),
}));
