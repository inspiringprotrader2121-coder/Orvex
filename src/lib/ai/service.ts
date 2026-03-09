import { LaunchPackService } from "@server/services/launch-pack-service";
import type { LaunchPack } from "./schema";

export class AIService {
  static async generateLaunchPack(productInfo: {
    name: string;
    baseDescription: string;
    targetAudience: string;
    category: string;
  }): Promise<LaunchPack> {
    return LaunchPackService.process({
      audience: productInfo.targetAudience,
      category: productInfo.category,
      description: productInfo.baseDescription,
      productName: productInfo.name,
      userId: "system",
      workflowId: crypto.randomUUID(),
    });
  }
}
