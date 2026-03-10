import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { SeoKeywordService } from "@server/services/seo-keyword-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { suggestionId, listingId, notes } = await request.json() as {
      suggestionId: string;
      listingId: string;
      notes?: string | null;
    };

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

    console.error("SEO keyword apply failed:", error);
    return NextResponse.json({ error: "Unable to apply SEO suggestion" }, { status: 500 });
  }
}
