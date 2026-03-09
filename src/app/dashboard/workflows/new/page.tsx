"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Rocket,
    ArrowRight,
    Sparkles,
    Store,
    Tag,
    FileType,
    Target,
    Loader2
} from "lucide-react";

export default function NewWorkflowPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        productName: "",
        description: "",
        category: "Physical Product",
        audience: "Etsy Shoppers",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/workflows/etsy", {
                method: "POST",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();
            if (res.ok && data.workflowId) {
                router.push(`/dashboard/workflows/${data.workflowId}`);
            } else {
                alert(data.error || "Generation failed to start");
            }
        } catch (err) {
            console.error(err);
            alert("System error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 animate-in slide-in-from-bottom-5 duration-700">
            <div className="text-center mb-12">
                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10 shadow-2xl">
                    <Rocket className="w-8 h-8 text-indigo-500 shadow-indigo-500/50" />
                </div>
                <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
                    Launch New <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Content Pack</span>
                </h1>
                <p className="text-gray-400 font-medium">
                    Feed our AI engine your product details and watch it generate SEO magic.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-[#141417] border border-[#1C1C1F] rounded-3xl p-10 shadow-2xl space-y-8">

                    {/* Product Name */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Store className="w-4 h-4" />
                            <label className="text-xs font-bold uppercase tracking-widest">Product Title / Name</label>
                        </div>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Personalized Minimalist Leather Wallet"
                            className="w-full bg-[#0A0A0B] border border-[#232326] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                            value={formData.productName}
                            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Category */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Tag className="w-4 h-4" />
                                <label className="text-xs font-bold uppercase tracking-widest">Category</label>
                            </div>
                            <select
                                className="w-full bg-[#0A0A0B] border border-[#232326] rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium appearance-none"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Physical Product</option>
                                <option>Digital Print</option>
                                <option>Print on Demand</option>
                                <option>Personalized Gift</option>
                            </select>
                        </div>

                        {/* Target Audience */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Target className="w-4 h-4" />
                                <label className="text-xs font-bold uppercase tracking-widest">Target Audience</label>
                            </div>
                            <input
                                type="text"
                                placeholder="e.g. Groomsmen, Minimalists"
                                className="w-full bg-[#0A0A0B] border border-[#232326] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                value={formData.audience}
                                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-400">
                            <FileType className="w-4 h-4" />
                            <label className="text-xs font-bold uppercase tracking-widest">Detailed Context / Info</label>
                        </div>
                        <textarea
                            required
                            rows={5}
                            placeholder="Tell the AI about the features, materials, and why it's special..."
                            className="w-full bg-[#0A0A0B] border border-[#232326] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Costs 10 Credits</span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-3 shadow-xl shadow-white/10 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing Data...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 text-indigo-600 shadow-indigo-600" />
                                    Engage Growth Engine
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            <p className="text-center mt-12 text-gray-600 font-medium text-xs max-w-sm mx-auto leading-relaxed">
                By engaging the engine, you agree to optimize your brand and scale your ecommerce operations effectively.
            </p>
        </div>
    );
}
