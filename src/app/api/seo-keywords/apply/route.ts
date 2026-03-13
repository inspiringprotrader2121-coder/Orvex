import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { SeoKeywordApplyRequestSchema } from "@server/schemas/seo-keywords";
import { SeoKeywordService } from "@server/services/seo-keyword-service";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";

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

    const { suggestionId, listingId, notes } = SeoKeywordApplyRequestSchema.parse(await request.json());

    await SeoKeywordService.applyToListing({
      suggestionId,
      listingId,
      notes,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof FeatureDisabledError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid SEO apply payload",
        issues: error.issues,
      }, { status: 400 });
    }

    console.error("SEO keyword apply failed:", error);
    return NextResponse.json({ error: "Unable to apply SEO suggestion" }, { status: 500 });
  }
}
