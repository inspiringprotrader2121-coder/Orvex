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
            <span className="text-xs font-medium text-zinc-300">Orvex 2.0 is now live</span>
          </div>

          <h1 className="mb-6 max-w-4xl bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-bold tracking-tighter text-transparent md:text-7xl">
            The AI Growth Operating System for Digital Creators
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            Automate your product launches, optimize listings, and scale your digital storefront with powerful AI workflows designed specifically for creators.
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
            <p className="text-zinc-400">Stop doing manual keyword research. Let Orvex handle the heavy lifting.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              href="/discover"
              icon={<Compass className="h-6 w-6 text-emerald-400" />}
              title="Discover Opportunities"
              description="Analyze niche demand, competition, and trends to surface product ideas worth launching."
            />
            <FeatureCard
              href="/forge"
              icon={<PenTool className="h-6 w-6 text-indigo-400" />}
              title="Forge Listing Copy"
              description="Generate Etsy-ready titles, descriptions, tags, and FAQs from a few core product inputs."
            />
            <FeatureCard
              href="/optimize"
              icon={<Search className="h-6 w-6 text-sky-400" />}
              title="Optimize Listings"
              description="Score listings, detect keyword gaps, and benchmark competitor positioning with AI analysis."
            />
            <FeatureCard
              href="/launch"
              icon={<Flame className="h-6 w-6 text-amber-400" />}
              title="Launch Campaigns"
              description="Create multi-channel launch assets, including hooks, captions, emails, and rollout plans."
            />
          </div>
        </section>

        <section className="w-full max-w-4xl border-t border-white/10 px-6 py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Simple, transparent pricing</h2>
            <p className="text-zinc-400">Pay only for what you use. No monthly subscriptions required.</p>
          </div>

          <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <div className="mb-2 text-5xl font-bold">$10</div>
            <div className="mb-8 text-zinc-400">for 100 AI credits</div>

            <ul className="mb-8 w-full space-y-4">
              {[
                "1 credit = 1 complete asset generation",
                "Access to all AI workflows",
                "Priority support",
                "Credits never expire",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-4 text-center font-semibold transition-opacity hover:opacity-90"
            >
              Get Started Now
            </Link>
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
