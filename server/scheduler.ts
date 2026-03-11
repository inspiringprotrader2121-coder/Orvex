import "dotenv/config";

async function initializeScheduler() {
  console.log("[Scheduler] Starting Orvex background task scheduler...");

  try {
    console.log("[Scheduler] No repeatable jobs are enabled in this build.");
  } catch (error) {
    console.error("[Scheduler] Error initializing repeatable jobs:", error);
    process.exit(1);
  }
}

initializeScheduler().catch(console.error);
