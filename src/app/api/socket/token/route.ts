import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { signSocketToken } from "@/lib/auth";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { RateLimitExceededError } from "@server/utils/errors";

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await WorkflowAbuseService.assertSocketTokenIssue(request, userId);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      const headers = error.retryAfterSeconds ? { "Retry-After": `${error.retryAfterSeconds}` } : undefined;
      return NextResponse.json({ error: error.message }, {
        headers,
        status: 429,
      });
    }

    return NextResponse.json({ error: "Unable to create socket token" }, { status: 500 });
  }

  return NextResponse.json({
    token: signSocketToken(userId, session.user.role ?? "user"),
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
