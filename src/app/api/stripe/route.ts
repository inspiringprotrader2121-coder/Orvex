import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";
import { getErrorMessage } from "@/lib/errors";
import { StripeBillingService } from "@server/services/stripe-billing-service";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { StripeCheckoutRequestSchema } from "@server/schemas/billing";
import { RateLimitExceededError } from "@server/utils/errors";

function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: "Invalid billing request",
      issues: error.issues,
    }, { status: 400 });
  }

  if (error instanceof RateLimitExceededError) {
    const headers = error.retryAfterSeconds ? { "Retry-After": `${error.retryAfterSeconds}` } : undefined;
    return NextResponse.json({ error: error.message }, {
      headers,
      status: 429,
    });
  }

  console.error("Stripe billing route failed:", getErrorMessage(error));
  return NextResponse.json({ error: "Unable to process billing request" }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const current = await StripeBillingService.getBillingState(userId);

    return NextResponse.json({
      creditPacks: StripeBillingService.listCreditPacks(),
      current,
      subscriptionPlans: StripeBillingService.listSubscriptionPlans(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
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
    await WorkflowAbuseService.assertCheckoutCreation(request, userId);
    const body = await request.json().catch(() => ({}));
    const checkoutRequest = StripeCheckoutRequestSchema.parse(body.mode ? body : {
      mode: "credits",
      planId: "credits_50",
    });
    const state = await StripeBillingService.getBillingState(userId);
    const checkoutSession = await StripeBillingService.createCheckoutSession({
      email: state.email,
      request: checkoutRequest,
      stripeCustomerId: state.stripeCustomerId,
      userId,
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
