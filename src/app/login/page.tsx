"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { LogIn, Mail, Lock, ArrowRight, Rocket } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            setError(getErrorMessage(error, "Authentication service unavailable"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#0A0A0B] selection:bg-indigo-500/30">
            <div className="absolute top-12 left-12 flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Rocket className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">Orvex</span>
            </div>

            <div className="w-full max-w-[420px] bg-[#141417] border border-[#1C1C1F] rounded-[32px] p-10 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Visual accents */}
                <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]"></div>

                <div className="relative z-10">
                    <div className="mb-10 text-center">
                        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Welcome back</h1>
                        <p className="text-sm text-gray-400 font-medium">Continue your growth journey</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4 text-xs font-bold text-rose-400 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0A0A0B] border border-[#232326] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password</label>
                                <a href="#" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">Forgot?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-600" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0A0A0B] border border-[#232326] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-gray-200 rounded-2xl py-4 text-sm font-extrabold flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-white/5"
                        >
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
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
                        <Link href="/register" className="text-white hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5 ml-1">
                            Create Account <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
