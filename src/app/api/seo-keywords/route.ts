import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { WorkflowService } from "@server/services/workflow-service";
import { SeoKeywordRequestSchema } from "@server/schemas/seo-keywords";
import { SeoKeywordService } from "@server/services/seo-keyword-service";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";
import { env } from "@/lib/env";

function errorResponse(error: unknown) {
  if (error instanceof FeatureDisabledError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  console.error("SEO Keywords API error:", error);
  return NextResponse.json({ error: "Unable to process SEO keywords" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suggestions = await SeoKeywordService.listForUser(userId);
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await FeatureAccessService.assertEnabled("seo_keyword_analysis", {
      subscriptionTier: session.user.subscriptionTier,
      userId,
    });

    const payload = SeoKeywordRequestSchema.parse(await request.json());
    const workflowId = await WorkflowService.startWorkflow(userId, {
      creditsCost: env.seoKeywordCreditCost,
      inputData: payload,
      job: {
        payload: {
          inputText: payload.inputText,
          source: payload.source,
        },
        type: "seo_keyword_analysis",
        userId,
      },
      sourceProvider: "internal",
    });

    return NextResponse.json({ workflowId, creditsCost: env.seoKeywordCreditCost });
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorResponse(error);
  }
}
