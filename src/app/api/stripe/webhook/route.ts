import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getRequiredServerEnv } from "@/lib/server-env";
import { StripeBillingService } from "@server/services/stripe-billing-service";

function getStripeClient() {
  return new Stripe(getRequiredServerEnv("STRIPE_SECRET_KEY"));
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getRequiredServerEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    console.error(
      `Webhook signature verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await StripeBillingService.processWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
