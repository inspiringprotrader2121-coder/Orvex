import { NextResponse } from "next/server";
import Stripe from "stripe";
import { CreditService } from "@/lib/credits";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "dummy_key_for_build") as string, {
    apiVersion: "2023-10-16" as any,
});

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
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle successful payments
    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id as string;

        // Hardcoded plan logic for now
        let creditsToAdd = 0;
        if (session.amount_total === 2900) creditsToAdd = 50;
        if (session.amount_total === 5900) creditsToAdd = 200;

        if (userId && creditsToAdd > 0) {
            await CreditService.addCredits(userId, creditsToAdd, `Purchase: ${session.amount_total! / 100} credits`);
        }
    }

    return NextResponse.json({ received: true });
}
