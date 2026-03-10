export type DashboardChannel = "all" | "discover" | "forge" | "optimize" | "launch";
export type DashboardStore = "all" | "amazon" | "etsy" | "gumroad" | "internal" | "shopify";
export type DashboardDateRange = "7d" | "30d" | "90d" | "all";

export type DashboardFilters = {
  channel: DashboardChannel;
  dateRange: DashboardDateRange;
  product: string;
  store: DashboardStore;
};

export type DashboardJobItem = {
  createdAt: string;
  creditsSpent: number;
  id: string;
  productName: string;
  progress: number;
  status: "completed" | "failed" | "pending" | "processing" | "queued";
  store: DashboardStore;
  typeLabel: string;
  workflowType: string;
};

export type DashboardHistoryOutput = {
  canRollback: boolean;
  channel: Exclude<DashboardChannel, "all">;
  createdAt: string;
  id: string;
  isRollback: boolean;
  score: number | null;
  status: "completed" | "failed" | "pending" | "processing" | "queued";
  store: DashboardStore;
  summary: string;
  typeLabel: string;
  workflowType: string;
};

export type DashboardProductHistoryItem = {
  lastUpdated: string;
  outputs: DashboardHistoryOutput[];
  productName: string;
  totalOutputs: number;
};

export type DashboardTrendPoint = {
  completed: number;
  date: string;
  label: string;
  pending: number;
};

export type DashboardScoreTrendPoint = {
  date: string;
  label: string;
  score: number;
};

export type DashboardOptimizationSnapshot = {
  averageConversionScore: number;
  averageListingScore: number;
  averageSeoScore: number;
  latestScores: Array<{
    createdAt: string;
    listingScore: number;
    productName: string;
    seoScore: number;
    workflowId: string;
  }>;
};

export type DashboardCommunityItem = {
  category: string;
  createdAt: string;
  downloadsCount: number;
  id: string;
  name: string;
  popularityScore: number;
  status: "approved" | "flagged" | "pending" | "rejected";
  usageCount: number;
};

export type DashboardCommunitySummary = {
  approvedTemplates: number;
  recentItems: DashboardCommunityItem[];
  totalDownloads: number;
  totalTemplates: number;
  totalUsage: number;
};

export type MarketplaceTrendItem = {
  competitionScore: number;
  demandScore: number;
  keyword: string;
  opportunityScore: number;
  trendScore: number;
};

export type MarketplaceSuccessSignal = {
  conversionScore: number;
  keywordCoverage: number;
  listingScore: number;
  listingTitle: string;
  seoScore: number;
  sourceUrl: string;
};

export type MarketplaceSuggestion = {
  detail: string;
  priority: "high" | "medium" | "low";
  title: string;
};

export type MarketplaceTrendSummary = {
  niches: MarketplaceTrendItem[];
  successSignals: MarketplaceSuccessSignal[];
  suggestions: MarketplaceSuggestion[];
};

export type DashboardOverviewData = {
  community: DashboardCommunitySummary;
  filterOptions: {
    channels: Array<{ label: string; value: DashboardChannel }>;
    dateRanges: Array<{ label: string; value: DashboardDateRange }>;
    stores: Array<{ label: string; value: DashboardStore }>;
  };
  filters: DashboardFilters;
  jobs: {
    completed: number;
    failed: number;
    pending: number;
    recentActive: DashboardJobItem[];
  };
  marketplaceTrends: MarketplaceTrendSummary;
  optimization: DashboardOptimizationSnapshot;
  productHistory: DashboardProductHistoryItem[];
  trends: {
    optimization: DashboardScoreTrendPoint[];
    templates: DashboardScoreTrendPoint[];
    workflows: DashboardTrendPoint[];
  };
};
