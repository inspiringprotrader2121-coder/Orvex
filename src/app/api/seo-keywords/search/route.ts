import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { SeoKeywordMarketService } from "@server/services/seo-keyword-market-service";
import { FeatureAccessService, FeatureDisabledError } from "@server/services/feature-access-service";

function errorResponse(error: unknown) {
  if (error instanceof FeatureDisabledError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  console.error("SEO keyword market search error:", error);
  return NextResponse.json({ error: "Unable to fetch keyword market data" }, { status: 500 });
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

    const payload = await request.json();
    const response = await SeoKeywordMarketService.searchMarketplace(payload);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorResponse(error);
  }
}
