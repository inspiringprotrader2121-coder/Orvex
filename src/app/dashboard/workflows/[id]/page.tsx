"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Copy,
    Download,
    CheckCircle2,
    Rocket,
    Sparkles,
    Zap,
    Clock,
    ExternalLink,
    Mail,
    Search,
    Hash
} from 'lucide-react';
import { useSocket } from '@/components/providers/socket-provider';

export default function WorkflowResultsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { socket } = useSocket();

    const [workflow, setWorkflow] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchWorkflow = async () => {
        try {
            const res = await fetch(`/api/workflows/${id}`);
            if (!res.ok) throw new Error("Failed to load results");
            const data = await res.json();
            setWorkflow(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflow();
    }, [id]);

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data: any) => {
            if (data.workflowId === id) {
                console.log("[Socket] Update for this workflow received:", data.status);
                fetchWorkflow(); // Re-fetch the full data when status changes
            }
        };

        socket.on("workflow.updated", handleUpdate);
        return () => {
            socket.off("workflow.updated", handleUpdate);
        };
    }, [socket, id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-1000">
                <div className="relative">
                    <div className="h-24 w-24 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="mt-8 text-2xl font-black text-white tracking-tight">Accessing Neural Layer</h2>
                <p className="mt-2 text-gray-500 font-medium tracking-wide uppercase text-[10px]">Retrieving AI Generated Growth Assets</p>
            </div>
        );
    }

    if (error || !workflow) {
        return (
            <div className="p-12 text-center bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                <h2 className="text-xl font-bold text-rose-400 mb-2">Sync Error</h2>
                <p className="text-gray-400 mb-6">{error || "Could not locate this generation session."}</p>
                <Link href="/dashboard" className="text-white underline font-bold uppercase text-xs tracking-widest">Return to Dashboard</Link>
            </div>
        );
    }

    const isProcessing = workflow.status === 'pending' || workflow.status === 'processing';
    const data = workflow.resultData;

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-1000">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest">
                        <ArrowLeft className="w-3 h-3" /> Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2 flex items-center gap-4">
                        {workflow.inputData?.productName || "Listing Optimization"}
                        <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ring-1 ${isProcessing ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20 animate-pulse' : 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20'}`}>
                            {workflow.status}
                        </span>
                    </h1>
                    <p className="text-gray-400 font-medium">Generated via Orvex AI Engine v1.1</p>
                </div>

                {!isProcessing && (
                    <div className="flex items-center gap-3">
                        <button className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-white/5 hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export All
                        </button>
                    </div>
                )}
            </header>

            {isProcessing ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-[#141417] border border-[#1C1C1F] p-10 rounded-3xl flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
                            <Zap className="w-10 h-10 text-indigo-400 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Generating Impact...</h3>
                            <p className="text-gray-400 text-sm max-w-sm mx-auto">
                                Our engine is building your SEO titles, keywords, and marketing assets.
                                This takes about 30-45 seconds.
                            </p>
                        </div>
                        <div className="w-full max-w-xs h-1.5 bg-[#1C1C1F] rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 animate-progress origin-left"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Core Listing Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <ResultSection title="Optimized Product Titles" icon={<Rocket className="w-4 h-4" />}>
                            <div className="space-y-4">
                                {data.seoTitles?.map((title: string, i: number) => (
                                    <CopyBox key={i} text={title} />
                                ))}
                            </div>
                        </ResultSection>

                        <ResultSection title="High-Intent Description" icon={<Search className="w-4 h-4" />}>
                            <div className="bg-[#1C1C1F]/50 border border-white/5 rounded-2xl p-6 relative group">
                                <pre className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap font-sans">
                                    {data.description}
                                </pre>
                                <CopyButton text={data.description} />
                            </div>
                        </ResultSection>

                        <ResultSection title="3-Phase Email Sequence" icon={<Mail className="w-4 h-4" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.emailSequence?.map((email: any, i: number) => (
                                    <div key={i} className="bg-[#1C1C1F] border border-white/5 p-5 rounded-2xl">
                                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">{email.subject}</h4>
                                        <p className="text-[11px] text-gray-400 line-clamp-3 mb-4">{email.body}</p>
                                        <CopyButton text={`${email.subject}\n\n${email.body}`} block />
                                    </div>
                                ))}
                            </div>
                        </ResultSection>
                    </div>

                    {/* Right Column: Tags & Hooks */}
                    <div className="space-y-8">
                        <ResultSection title="Keyword Tags" icon={<Hash className="w-4 h-4" />}>
                            <div className="flex flex-wrap gap-2">
                                {data.keywordTags?.map((tag: string, i: number) => (
                                    <span key={i} className="bg-[#1C1C1F] border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-4">
                                <CopyButton text={data.keywordTags?.join(", ")} block label="Copy All Tags" />
                            </div>
                        </ResultSection>

                        <ResultSection title="Marketing Hooks" icon={<Zap className="w-4 h-4" />}>
                            <div className="space-y-3">
                                {data.marketingHooks?.map((hook: string, i: number) => (
                                    <div key={i} className="text-xs text-gray-300 italic border-l-2 border-indigo-500/30 pl-4 py-1">
                                        "{hook}"
                                    </div>
                                ))}
                            </div>
                        </ResultSection>
                    </div>
                </div>
            )}
        </div>
    );
}

function ResultSection({ title, children, icon }: any) {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 px-1">
                <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">{icon}</div>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">{title}</h2>
            </div>
            {children}
        </div>
    )
}

function CopyBox({ text }: { text: string }) {
    return (
        <div className="flex items-center justify-between bg-[#1C1C1F] border border-white/5 p-4 rounded-2xl group hover:border-[#232326] transition-all">
            <span className="text-sm text-gray-300 font-medium truncate pr-4">{text}</span>
            <button onClick={() => navigator.clipboard.writeText(text)} className="p-2 bg-[#0A0A0B] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
            </button>
        </div>
    )
}

function CopyButton({ text, block, label }: { text: string, block?: boolean, label?: string }) {
    return (
        <button
            onClick={() => navigator.clipboard.writeText(text)}
            className={`${block ? 'w-full' : 'absolute top-4 right-4'} bg-[#0A0A0B] border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-500 hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-widest`}
        >
            <Copy className="w-3 h-3" /> {label || 'Copy'}
        </button>
    )
}
