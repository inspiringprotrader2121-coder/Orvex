"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Lock, LogIn, Mail, Rocket } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "rate_limited") {
          setError("Too many login attempts. Please wait a few minutes and try again.");
        } else if (result.error === "CredentialsSignin") {
          setError("Invalid email or password");
        } else {
          setError("Login is temporarily unavailable. Please try again shortly.");
        }
        return;
      }

      if (!result?.ok) {
        setError("Login is temporarily unavailable. Please try again shortly.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Authentication service unavailable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0B] p-4 selection:bg-indigo-500/30">
      <div className="absolute left-12 top-12 flex cursor-pointer items-center gap-3 group" onClick={() => router.push("/")}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110">
          <Rocket className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-black tracking-tight text-white">Orvex</span>
      </div>

      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[32px] border border-[#1C1C1F] bg-[#141417] p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative z-10">
          <div className="mb-10 text-center">
            <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white">Welcome back</h1>
            <p className="text-sm font-medium text-gray-400">Continue your growth journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-center text-xs font-bold uppercase tracking-widest text-rose-400">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#232326] bg-[#0A0A0B] py-3.5 pl-12 pr-4 text-sm font-medium text-white placeholder-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Password</label>
                <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 transition-colors hover:text-indigo-300">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#232326] bg-[#0A0A0B] py-3.5 pl-12 pr-4 text-sm font-medium text-white placeholder-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="********"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-extrabold text-black shadow-xl shadow-white/5 transition-all active:scale-[0.98] hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Access Terminal
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
            New to orvex?{" "}
            <Link href="/register" className="ml-1 inline-flex items-center gap-1.5 text-white transition-colors hover:text-indigo-400">
              Create Account <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
