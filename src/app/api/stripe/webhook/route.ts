import { NextResponse } from "next/server";
import Stripe from "stripe";
import { CreditService } from "@/lib/credits";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy_key_for_build");

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET as string
        );
    } catch (error) {
        console.error(`Webhook signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle successful payments
    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id as string;
        const metadataCredits = Number(session.metadata?.creditAmount ?? 0);
        const creditsToAdd = Number.isFinite(metadataCredits) ? metadataCredits : 0;

        if (userId && creditsToAdd > 0) {
            await CreditService.addCreditsForStripeEvent(
                userId,
                creditsToAdd,
                `Purchase: ${creditsToAdd} credits`,
                event.id,
                event.type
            );
        }
    }

    return NextResponse.json({ received: true });
}
