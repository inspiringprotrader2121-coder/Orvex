import { CheckCircle2, Compass, Flame, PenTool, Search, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-50 selection:bg-purple-500/30">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
              <span className="text-xl font-bold text-white">O</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Orvex</span>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-400 lg:flex">
            <Link href="/discover" className="transition-colors hover:text-white">Discover</Link>
            <Link href="/forge" className="transition-colors hover:text-white">Forge</Link>
            <Link href="/optimize" className="transition-colors hover:text-white">Optimize</Link>
            <Link href="/launch" className="transition-colors hover:text-white">Launch</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center pb-16 pt-32">
        <section className="relative flex w-full max-w-5xl flex-col items-center px-6 py-20 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-300">Live now: AI workflows + real-market SEO signals</span>
          </div>

          <h1 className="mb-6 max-w-4xl bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-bold tracking-tighter text-transparent md:text-7xl">
            The AI Growth Operating System for Etsy & Creator Commerce
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            Discover opportunities, generate listings, launch multi-channel campaigns, and optimize storefront performance with real-time AI workflows built for digital product sellers.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform active:scale-95 hover:bg-zinc-200"
            >
              Start for Free <Zap className="h-5 w-5 text-purple-600" />
            </Link>
            <Link
              href="/discover"
              className="rounded-full border border-white/10 px-8 py-4 text-lg font-medium transition-colors hover:bg-white/5"
            >
              Explore Modules
            </Link>
          </div>
        </section>

        <section id="features" className="w-full max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Everything you need to launch</h2>
            <p className="text-zinc-400">AI workflows plus real market signals to plan, create, and scale faster.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              href="/discover"
              icon={<Compass className="h-6 w-6 text-emerald-400" />}
              title="Opportunity Radar"
              description="Analyze niche demand, competition, and trends to surface product ideas worth launching."
            />
            <FeatureCard
              href="/optimize"
              icon={<Search className="h-6 w-6 text-sky-400" />}
              title="Listing Intelligence"
              description="Audit listings, detect keyword gaps, and benchmark competitor positioning with AI analysis."
            />
            <FeatureCard
              href="/forge"
              icon={<PenTool className="h-6 w-6 text-indigo-400" />}
              title="Listing Forge"
              description="Generate Etsy-ready titles, descriptions, tags, and FAQs from core product inputs."
            />
            <FeatureCard
              href="/launch"
              icon={<Flame className="h-6 w-6 text-amber-400" />}
              title="Launch Pack Studio"
              description="Create hooks, captions, emails, FAQs, and launch plans in one workflow."
            />
            <FeatureCard
              href="/launch"
              icon={<Zap className="h-6 w-6 text-fuchsia-400" />}
              title="Multi-Channel Blitz"
              description="Generate platform-specific content for Etsy, Shopify, Amazon, TikTok, Pinterest, and Instagram."
            />
            <FeatureCard
              href="/launch"
              icon={<Flame className="h-6 w-6 text-rose-400" />}
              title="Mockup Generator"
              description="Create AI product mockups and hero images to elevate store visuals fast."
            />
            <FeatureCard
              href="/optimize/seo"
              icon={<Search className="h-6 w-6 text-emerald-300" />}
              title="SEO Keyword Intelligence"
              description="Blend AI keyword ideation with live Etsy search signals for better SEO decisions."
            />
            <FeatureCard
              href="/dashboard"
              icon={<Compass className="h-6 w-6 text-blue-300" />}
              title="Realtime Workflow Ops"
              description="Track jobs live, save outputs, and monitor performance with a unified dashboard."
            />
          </div>
        </section>

        <section className="w-full max-w-5xl border-t border-white/10 px-6 py-24">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Platform-grade foundations</h2>
            <p className="text-zinc-400">Operational reliability built in for scale, security, and growth.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Security + Access</p>
              <h3 className="mt-3 text-xl font-semibold text-white">RBAC & Admin Control Plane</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Role-based access, audit logs, and a super admin dashboard for full operational visibility.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Reliability</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Queue + Workflow Engine</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                BullMQ-backed processing with realtime updates, retries, and durable workflow tracking.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Billing</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Credits + Subscriptions</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Flexible credit packs plus subscription tiers that unlock premium AI workflows.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-6xl border-t border-white/10 px-6 py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Flexible pricing built for growth</h2>
            <p className="text-zinc-400">Use credit packs for execution, add subscriptions for premium AI access and priority queues.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Credit Packs</p>
                <h3 className="mt-3 text-2xl font-bold text-white">Pay per execution</h3>
                <p className="mt-2 text-sm text-zinc-400">Credits power workflows like launch packs, SEO, mockups, and listing generation.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Starter pack</p>
                  <div className="mt-2 text-3xl font-bold">$29</div>
                  <p className="text-sm text-zinc-400">50 AI credits</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Scale pack</p>
                  <div className="mt-2 text-3xl font-bold">$59</div>
                  <p className="text-sm text-zinc-400">120 AI credits</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {[
                  "Credits never expire",
                  "1 credit = 1 complete asset generation",
                  "Real-time workflow tracking",
                  "Instant purchase via Stripe",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-4 text-center font-semibold transition-opacity hover:opacity-90"
              >
                Start with Credits
              </Link>
            </div>

            <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Subscriptions</p>
                <h3 className="mt-3 text-2xl font-bold text-white">Unlock premium workflows</h3>
                <p className="mt-2 text-sm text-zinc-400">Subscriptions add priority access, premium workflows, and higher growth OS capability.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Starter", price: "$19/mo" },
                  { label: "Pro", price: "$49/mo" },
                  { label: "Growth", price: "$99/mo" },
                ].map((plan) => (
                  <div key={plan.label} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{plan.label}</p>
                    <div className="mt-2 text-2xl font-bold">{plan.price}</div>
                    <p className="text-xs text-zinc-500">Premium AI access</p>
                  </div>
                ))}
              </div>
              <ul className="space-y-3 text-sm text-zinc-300">
                {[
                  "Premium feature unlocks",
                  "Priority queue access",
                  "Advanced launch and optimization workflows",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="w-full rounded-xl border border-white/10 py-4 text-center font-semibold transition-colors hover:bg-white/5"
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 text-center text-zinc-500">
        <div className="container mx-auto px-6">
          <p>&copy; {new Date().getFullYear()} Orvex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link href={href} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="leading-relaxed text-zinc-400">{description}</p>
    </Link>
  );
}
