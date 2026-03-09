import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { getRequiredServerEnv } from "@/lib/server-env";
import { RateLimitExceededError } from "@server/utils/errors";
import { WorkflowAbuseService } from "@server/services/workflow-abuse-service";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";

function getStripeClient() {
    return new Stripe(getRequiredServerEnv("STRIPE_SECRET_KEY"));
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof InvalidOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Origin validation failed:", error);
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
    await WorkflowAbuseService.assertCheckoutCreation(request, userId);

    const stripe = getStripeClient();
        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            metadata: {
                creditAmount: "50",
                plan: "growth-pack",
            },
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Orvex Growth Pack (50 Generations)",
                            description: "Full SEO content and launch sequence for 50 products",
                        },
                        unit_amount: 2900,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://useorvex.com'}/dashboard?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://useorvex.com'}/dashboard?canceled=true`,
            client_reference_id: userId,
        });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);

    if (error instanceof RateLimitExceededError) {
      const rateLimitHeaders = error.retryAfterSeconds
        ? { "Retry-After": `${error.retryAfterSeconds}` }
        : undefined;

      return NextResponse.json({ error: error.message }, {
        status: 429,
        headers: rateLimitHeaders,
      });
    }

    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
