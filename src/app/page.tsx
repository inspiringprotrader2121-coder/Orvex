import Link from "next/link";
import { CheckCircle2, Zap, BarChart3, Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 font-sans selection:bg-purple-500/30">
      {/* Navigation */}
      <header className="fixed top-0 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="font-bold text-white text-xl">O</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Orvex</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-32 pb-16">
        {/* Hero Section */}
        <section className="w-full max-w-5xl px-6 py-20 text-center flex flex-col items-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-medium text-zinc-300">Orvex 2.0 is now live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent max-w-4xl">
            The AI Growth Operating System for Digital Creators
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">
            Automate your product launches, optimize listings, and scale your digital storefront with powerful AI workflows designed specifically for creators.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              href="/register" 
              className="px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-zinc-200 transition-transform active:scale-95 flex items-center gap-2"
            >
              Start for Free <Zap className="w-5 h-5 text-purple-600" />
            </Link>
            <a 
              href="#features" 
              className="px-8 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors font-medium text-lg"
            >
              See how it works
            </a>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full max-w-6xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to launch</h2>
            <p className="text-zinc-400">Stop doing manual keyword research. Let Orvex handle the heavy lifting.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Rocket className="w-6 h-6 text-blue-400" />}
              title="Instant Listings"
              description="Generate highly converting titles, tags, and descriptions for Etsy, Shopify, and more in seconds."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
              title="SEO Optimization"
              description="Built-in keyword research ensures your products rank on the first page of search results."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              title="Marketing Hooks"
              description="Automatically generate viral TikTok, Reels, and YouTube Shorts scripts for your products."
            />
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full max-w-4xl px-6 py-24 border-t border-white/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-zinc-400">Pay only for what you use. No monthly subscriptions required.</p>
          </div>
          
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm mx-auto max-w-xl flex flex-col items-center">
            <div className="text-5xl font-bold mb-2">$10</div>
            <div className="text-zinc-400 mb-8">for 100 AI credits</div>
            
            <ul className="space-y-4 mb-8 w-full">
              {[
                "1 credit = 1 complete asset generation",
                "Access to all AI workflows",
                "Priority support",
                "Credits never expire"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
            
            <Link 
              href="/register" 
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-semibold text-center hover:opacity-90 transition-opacity"
            >
              Get Started Now
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-zinc-500">
        <div className="container mx-auto px-6">
          <p>© {new Date().getFullYear()} Orvex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex flex-col gap-4">
      <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
