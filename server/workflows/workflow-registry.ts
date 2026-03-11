export type RegisteredWorkflowType =
  | "listing_intelligence"
  | "competitor_analysis"
  | "opportunity_analysis"
  | "listing_forge"
  | "launch_pack_generation"
  | "multi_channel_launch_pack"
  | "multi_channel_child"
  | "mockup_generation"
  | "seo_keyword_analysis"
  | "etsy_listing_launch_pack";

type WorkflowQueueName = "mockups" | "workflows";

type WorkflowDefinition = {
  attempts: number;
  backoffDelayMs: number;
  featureKey: string;
  priority: number;
  queueName: WorkflowQueueName;
};

// Lower numbers are processed first by BullMQ. "Social Blitz" is represented by
// the multi-channel launch workflow because it generates the highest-urgency
// social storefront content bundle.
const workflowRegistry: Record<RegisteredWorkflowType, WorkflowDefinition> = {
  competitor_analysis: {
    attempts: 4,
    backoffDelayMs: 6_000,
    featureKey: "competitor_analysis",
    priority: 4,
    queueName: "workflows",
  },
  etsy_listing_launch_pack: {
    attempts: 5,
    backoffDelayMs: 4_000,
    featureKey: "launch_pack_generation",
    priority: 2,
    queueName: "workflows",
  },
  launch_pack_generation: {
    attempts: 5,
    backoffDelayMs: 4_000,
    featureKey: "launch_pack_generation",
    priority: 2,
    queueName: "workflows",
  },
  listing_forge: {
    attempts: 4,
    backoffDelayMs: 3_500,
    featureKey: "listing_generator",
    priority: 3,
    queueName: "workflows",
  },
  listing_intelligence: {
    attempts: 4,
    backoffDelayMs: 5_000,
    featureKey: "listing_intelligence",
    priority: 3,
    queueName: "workflows",
  },
  mockup_generation: {
    attempts: 3,
    backoffDelayMs: 10_000,
    featureKey: "mockup_generation",
    priority: 2,
    queueName: "mockups",
  },
  multi_channel_child: {
    attempts: 5,
    backoffDelayMs: 3_000,
    featureKey: "multi_channel_launch_pack",
    priority: 1,
    queueName: "workflows",
  },
  multi_channel_launch_pack: {
    attempts: 5,
    backoffDelayMs: 3_000,
    featureKey: "multi_channel_launch_pack",
    priority: 1,
    queueName: "workflows",
  },
  opportunity_analysis: {
    attempts: 4,
    backoffDelayMs: 4_500,
    featureKey: "opportunity_analysis",
    priority: 5,
    queueName: "workflows",
  },
  seo_keyword_analysis: {
    attempts: 4,
    backoffDelayMs: 3_500,
    featureKey: "seo_keyword_analysis",
    priority: 3,
    queueName: "workflows",
  },
};

export function getWorkflowDefinition(type: RegisteredWorkflowType) {
  return workflowRegistry[type];
}

export function getWorkflowFeatureKey(type: RegisteredWorkflowType) {
  return workflowRegistry[type].featureKey;
}
