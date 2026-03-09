import { auth } from "@/auth";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { db } from "@/lib/db";
import { creditTransactions, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Coins, CreditCard, History, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { CreditAccountService } from "@server/services/credit-service";

export default async function CreditsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [user, availableCredits] = await Promise.all([
    db
    .select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]),
    CreditAccountService.getBalance(userId),
  ]);

  const transactions = await db.query.creditTransactions.findMany({
    where: eq(creditTransactions.userId, userId),
    orderBy: [desc(creditTransactions.createdAt)],
    limit: 10,
  });

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
          <Sparkles className="h-3 w-3" />
          Billing
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">Credits & Billing</h1>
        <p className="max-w-2xl text-sm font-medium leading-relaxed text-gray-400">
          Top up your account and review recent credit movements for {user?.email ?? "your workspace"}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417] p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/10 p-3">
              <Coins className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Available Credits</h2>
              <p className="text-sm text-gray-500">Ready for new workflow generations</p>
            </div>
          </div>
          <div className="text-6xl font-black tracking-tight text-white">{availableCredits}</div>
        </section>

        <section className="rounded-3xl border border-[#1C1C1F] bg-gradient-to-br from-indigo-600/20 to-purple-600/20 p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Growth Pack</h2>
              <p className="text-sm text-gray-300">50 credits for $29</p>
            </div>
          </div>
          <p className="mb-8 text-sm leading-relaxed text-gray-200">
            Credits are added instantly after a successful Stripe webhook and protected against duplicate replays.
          </p>
          <CheckoutButton />
        </section>
      </div>

      <section className="rounded-3xl border border-[#1C1C1F] bg-[#141417]/50 p-8">
        <div className="mb-6 flex items-center gap-2">
          <History className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
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
    </div>
  );
}
