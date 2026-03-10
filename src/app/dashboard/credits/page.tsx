import { auth } from "@/auth";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { LiveCreditValue } from "@/components/billing/live-credit-value";
import { LiveSubscriptionBadge } from "@/components/billing/live-subscription-badge";
import { db } from "@/lib/db";
import { billingRecords, creditTransactions, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Coins, CreditCard, History, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { CreditAccountService } from "@server/services/credit-service";
import { StripeBillingService } from "@server/services/stripe-billing-service";

function currency(amountCents: number, currencyCode = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currencyCode.toUpperCase(),
    style: "currency",
  }).format(amountCents / 100);
}

export default async function CreditsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [user, availableCredits, transactions, payments] = await Promise.all([
    db
      .select({
        email: users.email,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionTier: users.subscriptionTier,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    CreditAccountService.getBalance(userId),
    db.query.creditTransactions.findMany({
      where: eq(creditTransactions.userId, userId),
      orderBy: [desc(creditTransactions.createdAt)],
      limit: 8,
    }),
    db.query.billingRecords.findMany({
      where: eq(billingRecords.userId, userId),
      orderBy: [desc(billingRecords.createdAt)],
      limit: 8,
    }),
  ]);

  const creditPacks = StripeBillingService.listCreditPacks();
  const subscriptionPlans = StripeBillingService.listSubscriptionPlans();

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
          <Sparkles className="h-3 w-3" />
          Billing
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-white">Credits & Subscription</h1>
            <p className="max-w-3xl text-sm font-medium leading-relaxed text-gray-400">
              Top up credits, unlock premium AI tiers, and monitor payment state for {user?.email ?? "your workspace"}.
            </p>
          </div>
          <LiveSubscriptionBadge
            initialStatus={user?.subscriptionStatus ?? "inactive"}
            initialTier={user?.subscriptionTier ?? "free"}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417] p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/10 p-3">
              <Coins className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Available Credits</h2>
              <p className="text-sm text-gray-500">Live balance pushed over the socket bridge</p>
            </div>
          </div>
          <div className="text-6xl font-black tracking-tight text-white">
            <LiveCreditValue initialCredits={availableCredits} />
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-gray-400">
            Every AI workflow deducts credits atomically when it is queued. Successful Stripe credit purchases push updated balances back to the dashboard in real time.
          </p>
        </section>

        <section className="rounded-3xl border border-[#1C1C1F] bg-gradient-to-br from-emerald-600/15 via-cyan-600/10 to-transparent p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Premium Access</h2>
              <p className="text-sm text-gray-300">Subscription tiers unlock gated AI modules</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-200">
            Active or trialing subscriptions unlock premium features through the existing RBAC and feature-toggle layer. Past-due or canceled subscriptions automatically fall back to the free tier.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-gray-200">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">Starter: premium Discover and Forge workflows</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">Pro: advanced Launch and Optimize flows</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">Growth: highest-priority access to the full Growth OS</div>
          </div>
        </section>
      </div>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Buy Credit Packs</h2>
            <p className="text-sm text-gray-400">One-time purchases for usage-based workflows.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {creditPacks.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-white/5 bg-[#141417] p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">Credits</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{currency(plan.amountCents)}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{plan.credits} credits</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.description}</p>
              <div className="mt-6">
                <CheckoutButton
                  label={`Buy ${plan.credits} Credits`}
                  payload={{ mode: "credits", planId: plan.id }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Monthly Plans</h2>
            <p className="text-sm text-gray-400">Subscription tiers unlock premium AI features and queue priority.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-white/5 bg-[#141417] p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">{plan.tier}</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{currency(plan.amountCents)}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">per month</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.description}</p>
              <div className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-white/5 bg-[#0A0A0B] px-4 py-3 text-sm text-slate-300">
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <CheckoutButton
                  className="bg-cyan-300 text-black hover:bg-cyan-200"
                  label={`Choose ${plan.tier}`}
                  payload={{ mode: "subscription", planId: plan.id }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417]/50 p-8">
          <div className="mb-6 flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-bold text-white">Recent Credit Activity</h2>
          </div>
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0A0A0B] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{transaction.reason}</p>
                    <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-black ${transaction.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {transaction.amount >= 0 ? `+${transaction.amount}` : transaction.amount}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No credit transactions yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417]/50 p-8">
          <div className="mb-6 flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            <h2 className="text-xl font-bold text-white">Recent Billing Events</h2>
          </div>
          <div className="space-y-3">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-white/5 bg-[#0A0A0B] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{payment.description || payment.type}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{payment.status.replace("_", " ")}</p>
                    </div>
                    <span className="text-sm font-black text-white">{currency(payment.amountCents, payment.currency)}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{new Date(payment.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No billing events yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
