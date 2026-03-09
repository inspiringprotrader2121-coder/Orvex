function getNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  aiModel: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
  authLoginEmailLimit: getNumber(process.env.AUTH_LOGIN_EMAIL_LIMIT, 12),
  authLoginIdentityLimit: getNumber(process.env.AUTH_LOGIN_IDENTITY_LIMIT, 6),
  authLoginIpLimit: getNumber(process.env.AUTH_LOGIN_IP_LIMIT, 30),
  authLoginWindowSeconds: getNumber(process.env.AUTH_LOGIN_WINDOW_SECONDS, 900),
  authRegisterEmailLimit: getNumber(process.env.AUTH_REGISTER_EMAIL_LIMIT, 3),
  authRegisterIpLimit: getNumber(process.env.AUTH_REGISTER_IP_LIMIT, 6),
  authRegisterWindowSeconds: getNumber(process.env.AUTH_REGISTER_WINDOW_SECONDS, 3600),
  workflowSubmissionIpLimit: getNumber(process.env.WORKFLOW_SUBMISSION_IP_LIMIT, 30),
  workflowSubmissionUserLimit: getNumber(process.env.WORKFLOW_SUBMISSION_USER_LIMIT, 45),
  workflowSubmissionWindowSeconds: getNumber(process.env.WORKFLOW_SUBMISSION_WINDOW_SECONDS, 60),
  bulkLaunchCreditCost: getNumber(process.env.BULK_LAUNCH_CREDIT_COST, 10),
  bulkLaunchMaxRows: getNumber(process.env.BULK_LAUNCH_MAX_ROWS, 50),
  bulkLaunchIpLimit: getNumber(process.env.BULK_LAUNCH_IP_LIMIT, 6),
  bulkLaunchUserLimit: getNumber(process.env.BULK_LAUNCH_USER_LIMIT, 12),
  bulkLaunchWindowSeconds: getNumber(process.env.BULK_LAUNCH_WINDOW_SECONDS, 300),
  competitorCreditCost: getNumber(process.env.COMPETITOR_ANALYSIS_CREDIT_COST, 4),
  launchPackCreditCost: getNumber(process.env.LAUNCH_PACK_CREDIT_COST, 10),
  listingAnalysisCreditCost: getNumber(process.env.LISTING_ANALYSIS_CREDIT_COST, 4),
  listingForgeCreditCost: getNumber(process.env.LISTING_FORGE_CREDIT_COST, 3),
  opportunityCreditCost: getNumber(process.env.OPPORTUNITY_CREDIT_COST, 6),
  checkoutCreationIpLimit: getNumber(process.env.CHECKOUT_CREATION_IP_LIMIT, 8),
  checkoutCreationUserLimit: getNumber(process.env.CHECKOUT_CREATION_USER_LIMIT, 12),
  checkoutCreationWindowSeconds: getNumber(process.env.CHECKOUT_CREATION_WINDOW_SECONDS, 60),
  submissionLookbackMinutes: getNumber(process.env.SUBMISSION_LOOKBACK_MINUTES, 10),
  submissionMaxPerWindow: getNumber(process.env.SUBMISSION_MAX_PER_WINDOW, 25),
  workerConcurrency: getNumber(process.env.WORKER_CONCURRENCY, 5),
  workerGlobalRateLimitDurationMs: getNumber(process.env.WORKER_GLOBAL_RATE_LIMIT_DURATION_MS, 60_000),
  workerGlobalRateLimitMax: getNumber(process.env.WORKER_GLOBAL_RATE_LIMIT_MAX, 60),
};
