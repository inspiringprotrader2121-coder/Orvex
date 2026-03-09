import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { getRequiredServerEnv } from "@/lib/server-env";

function getStripeClient() {
    return new Stripe(getRequiredServerEnv("STRIPE_SECRET_KEY"));
}

export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
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
        return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
    }
}
