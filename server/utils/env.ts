function getNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  aiModel: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
  bulkLaunchCreditCost: getNumber(process.env.BULK_LAUNCH_CREDIT_COST, 10),
  bulkLaunchMaxRows: getNumber(process.env.BULK_LAUNCH_MAX_ROWS, 50),
  competitorCreditCost: getNumber(process.env.COMPETITOR_ANALYSIS_CREDIT_COST, 4),
  launchPackCreditCost: getNumber(process.env.LAUNCH_PACK_CREDIT_COST, 10),
  listingAnalysisCreditCost: getNumber(process.env.LISTING_ANALYSIS_CREDIT_COST, 4),
  opportunityCreditCost: getNumber(process.env.OPPORTUNITY_CREDIT_COST, 6),
  submissionLookbackMinutes: getNumber(process.env.SUBMISSION_LOOKBACK_MINUTES, 10),
  submissionMaxPerWindow: getNumber(process.env.SUBMISSION_MAX_PER_WINDOW, 25),
  workerConcurrency: getNumber(process.env.WORKER_CONCURRENCY, 5),
  workerGlobalRateLimitDurationMs: getNumber(process.env.WORKER_GLOBAL_RATE_LIMIT_DURATION_MS, 60_000),
  workerGlobalRateLimitMax: getNumber(process.env.WORKER_GLOBAL_RATE_LIMIT_MAX, 60),
};
