import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import {
  billingRecords,
  creditTransactions,
  credits,
  stripeWebhookEvents,
  users,
} from "@/lib/db/schema";
import { getRequiredServerEnv } from "@/lib/server-env";
import { notifyCreditsUpdate, notifySubscriptionUpdate } from "@/lib/socket-internal";
import type { CreditPackId, StripeCheckoutRequest, SubscriptionPlanId } from "@server/schemas/billing";
import { AdminAlertService } from "./admin/admin-alert-service";

type SubscriptionTier = "free" | "starter" | "pro" | "growth" | "enterprise";
type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PaymentFailureAlert = {
  amountCents: number;
  attemptCount: number;
  currency: string;
  invoiceId: string;
  nextPaymentAttempt: number | null;
  userEmail: string | null;
  userId: string;
};

type CreditPack = {
  amountCents: number;
  credits: number;
  description: string;
  id: CreditPackId;
  name: string;
  priceId?: string;
};

type SubscriptionPlan = {
  amountCents: number;
  description: string;
  features: string[];
  id: SubscriptionPlanId;
  name: string;
  priceId?: string;
  tier: Exclude<SubscriptionTier, "free" | "enterprise">;
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim()
  || process.env.APP_URL?.trim()
  || "http://localhost:3000";

const CREDIT_PACKS: CreditPack[] = [
  {
    amountCents: 2900,
    credits: 50,
    description: "Best for occasional launches and single-product testing.",
    id: "credits_50",
    name: "Starter Credit Pack",
    priceId: process.env.STRIPE_CREDIT_PACK_50_PRICE_ID?.trim() || undefined,
  },
  {
    amountCents: 5900,
    credits: 120,
    description: "For teams running multiple listing, launch, and mockup workflows each week.",
    id: "credits_120",
    name: "Scale Credit Pack",
    priceId: process.env.STRIPE_CREDIT_PACK_120_PRICE_ID?.trim() || undefined,
  },
];

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    amountCents: 1900,
    description: "Unlock premium Discover and Forge workflows for solo sellers.",
    features: [
      "Premium feature access",
      "Priority queue access",
      "Marketplace workflow unlocks",
    ],
    id: "starter_monthly",
    name: "Starter Monthly",
    priceId: process.env.STRIPE_SUB_STARTER_PRICE_ID?.trim() || undefined,
    tier: "starter",
  },
  {
    amountCents: 4900,
    description: "Adds premium Launch and Optimize tooling for growing stores.",
    features: [
      "Everything in Starter",
      "Advanced launch workflows",
      "Priority support",
    ],
    id: "pro_monthly",
    name: "Pro Monthly",
    priceId: process.env.STRIPE_SUB_PRO_PRICE_ID?.trim() || undefined,
    tier: "pro",
  },
  {
    amountCents: 9900,
    description: "Full ORVEX Growth OS access for operators managing multiple products.",
    features: [
      "Everything in Pro",
      "Highest queue priority",
      "Growth OS premium feature unlocks",
    ],
    id: "growth_monthly",
    name: "Growth Monthly",
    priceId: process.env.STRIPE_SUB_GROWTH_PRICE_ID?.trim() || undefined,
    tier: "growth",
  },
];

function getStripeClient() {
  return new Stripe(getRequiredServerEnv("STRIPE_SECRET_KEY"));
}

function buildAbsoluteUrl(path: string) {
  return new URL(path, APP_URL).toString();
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
      return "inactive";
    default:
      return "inactive";
  }
}

function resolveTierFromPlanId(planId?: string | null): SubscriptionTier {
  const match = SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
  return match?.tier ?? "free";
}

function resolveTierFromSubscription(subscription: Stripe.Subscription): SubscriptionTier {
  const metadataTier = subscription.metadata?.tier;
  if (metadataTier === "starter" || metadataTier === "pro" || metadataTier === "growth") {
    return metadataTier;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const matched = SUBSCRIPTION_PLANS.find((plan) => plan.priceId && plan.priceId === priceId);
  return matched?.tier ?? "free";
}

function normalizeUserTier(tier: SubscriptionTier, status: SubscriptionStatus): SubscriptionTier {
  if (status === "active" || status === "trialing") {
    return tier;
  }

  return "free";
}

async function emitCurrentCredits(userId: string) {
  const account = await db.query.credits.findFirst({
    columns: { creditsAvailable: true },
    where: eq(credits.userId, userId),
  });

  notifyCreditsUpdate(userId, account?.creditsAvailable ?? 0);
}

async function ensureCreditAccount(tx: DbTransaction, userId: string) {
  const user = await tx.query.users.findFirst({
    columns: { credits: true },
    where: eq(users.id, userId),
  });

  await tx.insert(credits).values({
    creditsAvailable: user?.credits ?? 0,
    creditsUsed: 0,
    updatedAt: new Date(),
    userId,
  }).onConflictDoNothing({ target: credits.userId });
}

async function addCreditsWithinTransaction(input: {
  amount: number;
  metadata: Record<string, unknown>;
  reason: string;
  tx: DbTransaction;
  userId: string;
}) {
  await ensureCreditAccount(input.tx, input.userId);

  await input.tx.update(credits)
    .set({
      creditsAvailable: sql`${credits.creditsAvailable} + ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(credits.userId, input.userId));

  await input.tx.update(users)
    .set({
      credits: sql`${users.credits} + ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId));

  await input.tx.insert(creditTransactions).values({
    amount: Math.abs(input.amount),
    metadata: input.metadata,
    reason: input.reason,
    userId: input.userId,
    workflowId: null,
  });
}

export class StripeBillingService {
  static listCreditPacks() {
    return CREDIT_PACKS;
  }

  static listSubscriptionPlans() {
    return SUBSCRIPTION_PLANS;
  }

  static async getBillingState(userId: string) {
    const [user, account] = await Promise.all([
      db.query.users.findFirst({
        columns: {
          email: true,
          stripeCustomerId: true,
          subscriptionStatus: true,
          subscriptionTier: true,
        },
        where: eq(users.id, userId),
      }),
      db.query.credits.findFirst({
        columns: {
          creditsAvailable: true,
        },
        where: eq(credits.userId, userId),
      }),
    ]);

    return {
      creditsAvailable: account?.creditsAvailable ?? 0,
      email: user?.email ?? null,
      stripeCustomerId: user?.stripeCustomerId ?? null,
      subscriptionStatus: user?.subscriptionStatus ?? "inactive",
      subscriptionTier: user?.subscriptionTier ?? "free",
    };
  }

  static async createCheckoutSession(input: {
    email?: string | null;
    request: StripeCheckoutRequest;
    stripeCustomerId?: string | null;
    userId: string;
  }) {
    const stripe = getStripeClient();
    const successPath = input.request.successPath ?? "/dashboard/credits?billing=success";
    const cancelPath = input.request.cancelPath ?? "/dashboard/credits?billing=canceled";
    const customer = input.stripeCustomerId ?? undefined;
    const customerEmail = customer ? undefined : input.email ?? undefined;

    if (input.request.mode === "credits") {
      const plan = CREDIT_PACKS.find((item) => item.id === input.request.planId);
      if (!plan) {
        throw new Error(`Unknown credit plan: ${input.request.planId}`);
      }

      return stripe.checkout.sessions.create({
        allow_promotion_codes: true,
        cancel_url: buildAbsoluteUrl(cancelPath),
        client_reference_id: input.userId,
        customer,
        customer_email: customerEmail,
        line_items: [
          plan.priceId
            ? { price: plan.priceId, quantity: 1 }
            : {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: `${plan.name} (${plan.credits} credits)`,
                    description: plan.description,
                  },
                  unit_amount: plan.amountCents,
                },
                quantity: 1,
              },
        ],
        metadata: {
          creditAmount: `${plan.credits}`,
          mode: "credits",
          planId: plan.id,
          userId: input.userId,
        },
        mode: "payment",
        payment_method_types: ["card"],
        success_url: buildAbsoluteUrl(successPath),
      });
    }

    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === input.request.planId);
    if (!plan) {
      throw new Error(`Unknown subscription plan: ${input.request.planId}`);
    }

    return stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: buildAbsoluteUrl(cancelPath),
      client_reference_id: input.userId,
      customer,
      customer_email: customerEmail,
      line_items: [
        plan.priceId
          ? { price: plan.priceId, quantity: 1 }
          : {
              price_data: {
                currency: "usd",
                product_data: {
                  name: plan.name,
                  description: plan.description,
                },
                recurring: { interval: "month" },
                unit_amount: plan.amountCents,
              },
              quantity: 1,
            },
      ],
      metadata: {
        mode: "subscription",
        planId: plan.id,
        tier: plan.tier,
        userId: input.userId,
      },
      mode: "subscription",
      subscription_data: {
        metadata: {
          planId: plan.id,
          tier: plan.tier,
          userId: input.userId,
        },
      },
      success_url: buildAbsoluteUrl(successPath),
    });
  }

  static async processWebhookEvent(event: Stripe.Event) {
    let creditsUserToNotify: string | null = null;
    let subscriptionUpdate: { status: SubscriptionStatus; tier: SubscriptionTier; userId: string } | null = null;
    const sideEffects: {
      paymentFailureAlert: PaymentFailureAlert | null;
    } = {
      paymentFailureAlert: null,
    };

    await db.transaction(async (tx) => {
      const [recorded] = await tx.insert(stripeWebhookEvents).values({
        eventType: event.type,
        stripeEventId: event.id,
      }).onConflictDoNothing({ target: stripeWebhookEvents.stripeEventId }).returning({ id: stripeWebhookEvents.id });

      if (!recorded) {
        return;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const userId = session.client_reference_id || session.metadata?.userId || null;

        if (!userId) {
          return;
        }

        if (customerId) {
          await tx.update(users).set({
            stripeCustomerId: customerId,
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
        }

        if (session.mode === "payment" && session.payment_status === "paid") {
          const creditsToAdd = Number(session.metadata?.creditAmount ?? 0);
          if (Number.isFinite(creditsToAdd) && creditsToAdd > 0) {
            await addCreditsWithinTransaction({
              amount: creditsToAdd,
              metadata: {
                stripeEventId: event.id,
                stripeSessionId: session.id,
              },
              reason: `Purchase: ${creditsToAdd} credits`,
              tx,
              userId,
            });

            await tx.insert(billingRecords).values({
              amountCents: Number(session.amount_total ?? 0),
              creditsAmount: creditsToAdd,
              currency: session.currency || "usd",
              description: "Stripe credit purchase",
              metadata: {
                planId: session.metadata?.planId ?? null,
                stripeEventId: event.id,
                stripeSessionId: session.id,
              },
              provider: "stripe",
              reference: session.id,
              status: "active",
              type: "credits",
              updatedAt: new Date(),
              userId,
            });

            creditsUserToNotify = userId;
          }
        }

        if (session.mode === "subscription") {
          const tier = resolveTierFromPlanId(session.metadata?.planId ?? null);
          const status: SubscriptionStatus =
            session.payment_status === "paid" || session.payment_status === "no_payment_required"
              ? "active"
              : "inactive";
          const normalizedTier = normalizeUserTier(tier, status);

          await tx.update(users).set({
            stripeCustomerId: customerId ?? null,
            subscriptionStatus: status,
            subscriptionTier: normalizedTier,
            updatedAt: new Date(),
          }).where(eq(users.id, userId));

          await tx.insert(billingRecords).values({
            amountCents: Number(session.amount_total ?? 0),
            creditsAmount: 0,
            currency: session.currency || "usd",
            description: `${tier} subscription checkout`,
            metadata: {
              planId: session.metadata?.planId ?? null,
              stripeEventId: event.id,
              stripeSessionId: session.id,
            },
            provider: "stripe",
            reference: session.subscription && typeof session.subscription === "string" ? session.subscription : session.id,
            status,
            type: "subscription",
            updatedAt: new Date(),
            userId,
          });

          subscriptionUpdate = {
            status,
            tier: normalizedTier,
            userId,
          };
        }
      }

      if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

        if (!customerId) {
          return;
        }

        const user = await tx.query.users.findFirst({
          columns: { id: true },
          where: eq(users.stripeCustomerId, customerId),
        });

        if (!user) {
          return;
        }

        const rawStatus = event.type === "customer.subscription.deleted"
          ? "canceled"
          : mapStripeSubscriptionStatus(subscription.status);
        const tier = event.type === "customer.subscription.deleted"
          ? "free"
          : resolveTierFromSubscription(subscription);
        const normalizedTier = normalizeUserTier(tier, rawStatus);
        const amountCents = Number(subscription.items.data[0]?.price?.unit_amount ?? 0);
        const currency = subscription.items.data[0]?.price?.currency ?? "usd";

        await tx.update(users).set({
          stripeCustomerId: customerId,
          subscriptionStatus: rawStatus,
          subscriptionTier: normalizedTier,
          updatedAt: new Date(),
        }).where(eq(users.id, user.id));

        await tx.insert(billingRecords).values({
          amountCents,
          creditsAmount: 0,
          currency,
          description: `Subscription ${event.type.replace("customer.subscription.", "")}`,
          metadata: {
            planId: subscription.metadata?.planId ?? null,
            stripeEventId: event.id,
            stripeSubscriptionId: subscription.id,
          },
          provider: "stripe",
          reference: subscription.id,
          status: rawStatus,
          type: "subscription",
          updatedAt: new Date(),
          userId: user.id,
        });

        subscriptionUpdate = {
          status: rawStatus,
          tier: normalizedTier,
          userId: user.id,
        };
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (!customerId) {
          return;
        }

        const user = await tx.query.users.findFirst({
          columns: {
            id: true,
            email: true,
          },
          where: eq(users.stripeCustomerId, customerId),
        });

        if (!user) {
          return;
        }

        await tx.update(users).set({
          subscriptionStatus: "past_due",
          subscriptionTier: "free",
          updatedAt: new Date(),
        }).where(eq(users.id, user.id));

        await tx.insert(billingRecords).values({
          amountCents: Number(invoice.amount_due ?? invoice.total ?? 0),
          creditsAmount: 0,
          currency: invoice.currency ?? "usd",
          description: "Subscription payment failed",
          metadata: {
            attemptCount: invoice.attempt_count ?? 0,
            nextPaymentAttempt: invoice.next_payment_attempt ?? null,
            stripeEventId: event.id,
            stripeInvoiceId: invoice.id,
          },
          provider: "stripe",
          reference: invoice.id,
          status: "past_due",
          type: "subscription",
          updatedAt: new Date(),
          userId: user.id,
        });

        subscriptionUpdate = {
          status: "past_due",
          tier: "free",
          userId: user.id,
        };

        sideEffects.paymentFailureAlert = {
          amountCents: Number(invoice.amount_due ?? invoice.total ?? 0),
          attemptCount: invoice.attempt_count ?? 0,
          currency: invoice.currency ?? "usd",
          invoiceId: invoice.id,
          nextPaymentAttempt: invoice.next_payment_attempt ?? null,
          userEmail: user.email ?? null,
          userId: user.id,
        };
      }

      if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (!customerId) {
          return;
        }

        const user = await tx.query.users.findFirst({
          columns: {
            id: true,
            subscriptionTier: true,
          },
          where: eq(users.stripeCustomerId, customerId),
        });

        if (!user) {
          return;
        }

        const invoiceLinePriceId = (invoice.lines.data[0] as { price?: { id?: string } } | undefined)?.price?.id;
        const tierFromPriceId = SUBSCRIPTION_PLANS.find((plan) => plan.priceId && plan.priceId === invoiceLinePriceId)?.tier;
        const tier = user.subscriptionTier === "free"
          ? (tierFromPriceId ?? "free")
          : user.subscriptionTier;
        const normalizedTier = normalizeUserTier(tier, "active");

        await tx.update(users).set({
          subscriptionStatus: "active",
          subscriptionTier: normalizedTier,
          updatedAt: new Date(),
        }).where(eq(users.id, user.id));

        await tx.insert(billingRecords).values({
          amountCents: Number(invoice.amount_paid ?? invoice.total ?? 0),
          creditsAmount: 0,
          currency: invoice.currency ?? "usd",
          description: "Subscription payment succeeded",
          metadata: {
            stripeEventId: event.id,
            stripeInvoiceId: invoice.id,
          },
          provider: "stripe",
          reference: invoice.id,
          status: "active",
          type: "subscription",
          updatedAt: new Date(),
          userId: user.id,
        });

        subscriptionUpdate = {
          status: "active",
          tier: normalizedTier,
          userId: user.id,
        };
      }
    });

    if (creditsUserToNotify) {
      await emitCurrentCredits(creditsUserToNotify);
    }

    const nextSubscriptionUpdate = subscriptionUpdate as {
      status: SubscriptionStatus;
      tier: SubscriptionTier;
      userId: string;
    } | null;

    if (nextSubscriptionUpdate) {
      notifySubscriptionUpdate(
        nextSubscriptionUpdate.userId,
        nextSubscriptionUpdate.tier,
        nextSubscriptionUpdate.status,
      );
    }

    const paymentFailureAlert = sideEffects.paymentFailureAlert;
    if (paymentFailureAlert) {
      const thresholds = await AdminAlertService.getAlertThresholds();
      const { rows } = await pool.query(`
        select count(*)::int as count
        from billing_records
        where description = 'Subscription payment failed'
          and created_at >= now() - interval '24 hours'
      `);
      const failureCount = Number(rows?.[0]?.count ?? 0);

      if (failureCount >= thresholds.paymentFailureThreshold) {
        await AdminAlertService.ensureAlert({
          message: `Subscription payment failed for ${paymentFailureAlert.userEmail ?? "unknown user"} (${paymentFailureAlert.userId}). Amount ${paymentFailureAlert.amountCents} ${paymentFailureAlert.currency}.`,
          metadata: {
            attemptCount: paymentFailureAlert.attemptCount,
            invoiceId: paymentFailureAlert.invoiceId,
            nextPaymentAttempt: paymentFailureAlert.nextPaymentAttempt,
            userEmail: paymentFailureAlert.userEmail,
            userId: paymentFailureAlert.userId,
          },
          observedValue: failureCount,
          severity: "critical",
          source: "stripe",
          thresholdValue: thresholds.paymentFailureThreshold,
          title: "Payment failure threshold exceeded",
        });
      }
    }
  }
}
