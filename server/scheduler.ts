import "dotenv/config";
import { StoreTokenRefreshService } from "@server/services/store-token-refresh-service";

async function initializeScheduler() {
  console.log("[Scheduler] Starting Orvex background task scheduler...");

  try {
    // Initialize standard repeatable jobs
    await StoreTokenRefreshService.scheduleRefreshJob();
    
    // Add future repeatable jobs here (e.g. Analytics aggregation)
    
    console.log("[Scheduler] All repeatable jobs initialized successfully.");
  } catch (error) {
    console.error("[Scheduler] Error initializing repeatable jobs:", error);
    process.exit(1);
  }
}

initializeScheduler().catch(console.error);
