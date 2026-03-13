import { incrementRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { env } from "@server/utils/env";
import { RateLimitExceededError } from "@server/utils/errors";

type RateLimitConfig = {
  prefix: string;
  ipLimit: number;
  userLimit: number;
  windowSeconds: number;
  actionLabel: string;
};

export class WorkflowAbuseService {
  static async assertWorkflowSubmission(request: Request, userId: string) {
    await this.enforceLimits(request, userId, {
      prefix: "workflow:submission",
      ipLimit: env.workflowSubmissionIpLimit,
      userLimit: env.workflowSubmissionUserLimit,
      windowSeconds: env.workflowSubmissionWindowSeconds,
      actionLabel: "workflow submissions",
    });
  }

  static async assertBulkGeneration(request: Request, userId: string) {
    await this.enforceLimits(request, userId, {
      prefix: "workflow:bulk",
      ipLimit: env.bulkLaunchIpLimit,
      userLimit: env.bulkLaunchUserLimit,
      windowSeconds: env.bulkLaunchWindowSeconds,
      actionLabel: "bulk uploads",
    });
  }

  static async assertCheckoutCreation(request: Request, userId: string) {
    await this.enforceLimits(request, userId, {
      prefix: "workflow:checkout",
      ipLimit: env.checkoutCreationIpLimit,
      userLimit: env.checkoutCreationUserLimit,
      windowSeconds: env.checkoutCreationWindowSeconds,
      actionLabel: "checkout sessions",
    });
  }

  static async assertSeoMarketSearch(request: Request, userId: string) {
    await this.enforceLimits(request, userId, {
      prefix: "workflow:seo-market-search",
      ipLimit: env.seoMarketSearchIpLimit,
      userLimit: env.seoMarketSearchUserLimit,
      windowSeconds: env.seoMarketSearchWindowSeconds,
      actionLabel: "SEO market searches",
    });
  }

  static async assertSocketTokenIssue(request: Request, userId: string) {
    await this.enforceLimits(request, userId, {
      prefix: "workflow:socket-token",
      ipLimit: env.socketTokenIpLimit,
      userLimit: env.socketTokenUserLimit,
      windowSeconds: env.socketTokenWindowSeconds,
      actionLabel: "socket token requests",
    });
  }

  private static async enforceLimits(request: Request, userId: string, config: RateLimitConfig) {
    const ip = getRequestIp(request);
    await this.checkLimit(`${config.prefix}:ip:${ip}`, config.ipLimit, config.windowSeconds, `${config.actionLabel} from this network`);
    await this.checkLimit(`${config.prefix}:user:${userId}`, config.userLimit, config.windowSeconds, `${config.actionLabel} for your account`);
  }

  private static async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    message: string,
  ) {
    const state = await incrementRateLimit(key, windowSeconds);
    const retryAfter = state.retryAfterSeconds || windowSeconds;

    if (state.count > limit) {
      throw new RateLimitExceededError(message, retryAfter);
    }
  }
}
