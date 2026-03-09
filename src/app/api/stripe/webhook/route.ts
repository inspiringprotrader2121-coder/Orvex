import { NextResponse } from "next/server";
import Stripe from "stripe";
import { CreditService } from "@/lib/credits";
import { getRequiredServerEnv } from "@/lib/server-env";

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

  // Handle successful payments
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode !== "payment" || session.payment_status !== "paid") {
      console.warn("Ignoring Stripe checkout session that was not paid:", session.id);
    } else if (!session.client_reference_id) {
      console.warn("Stripe checkout session is missing client_reference_id:", session.id);
    } else {
      const metadataCredits = Number(session.metadata?.creditAmount ?? 0);
      const creditsToAdd = Number.isFinite(metadataCredits) ? metadataCredits : 0;

      if (creditsToAdd <= 0) {
        console.warn("Stripe checkout session has no creditAmount metadata:", session.id);
      } else {
        await CreditService.addCreditsForStripeEvent(
          session.client_reference_id,
          creditsToAdd,
          `Purchase: ${creditsToAdd} credits`,
          event.id,
          event.type,
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
