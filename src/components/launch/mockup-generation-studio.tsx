"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImageIcon, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { MockupGallery } from "./mockup-gallery";

type MockupArtifact = {
  color: string;
  description: string;
  heroPrompt: string;
  images: Array<{
    channel: "etsy" | "instagram" | "shopify";
    fileName: string;
    prompt: string;
    ratioLabel: string;
    size: string;
    url: string;
  }>;
  productName: string;
  style: string;
  summary: string;
};

export function MockupGenerationStudio({
  latestArtifact,
  latestWorkflowId,
}: {
  latestArtifact: MockupArtifact | null;
  latestWorkflowId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    color: "",
    description: "",
    productName: "",
    style: "",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/mockup-generator", {
        body: JSON.stringify({
          color: form.color.trim(),
          description: form.description.trim(),
          productName: form.productName.trim(),
          style: form.style.trim(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = await response.json() as { error?: string; workflowId?: string };
      if (!response.ok || !data.workflowId) {
        throw new Error(data.error || "Unable to queue mockup generation");
      }

      router.push(`/dashboard/workflows/${data.workflowId}`);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to queue mockup generation"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-8 shadow-2xl shadow-black/20">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
            <ImageIcon className="h-3 w-3" />
            Mockup Generator
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">Generate launch-ready product mockups</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-400">
            The web route only queues the request. The dedicated mockup worker lane handles image generation, file persistence, and database writes so heavy image jobs do not slow down text workflows.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <InputField
              label="Product name"
              placeholder="Minimalist Mum Planner"
              value={form.productName}
              onChange={(value) => setForm((current) => ({ ...current, productName: value }))}
            />
            <InputField
              label="Primary color"
              placeholder="Warm beige, sage green, blush pink"
              value={form.color}
              onChange={(value) => setForm((current) => ({ ...current, color: value }))}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <InputField
              label="Style"
              placeholder="Minimalist, luxe, playful, editorial"
              value={form.style}
              onChange={(value) => setForm((current) => ({ ...current, style: value }))}
            />
            <div className="rounded-2xl border border-white/5 bg-[#0A0A0B] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Ratios included</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <span>Etsy: 1:1 product tile</span>
                <span>Shopify: 3:2 storefront hero</span>
                <span>Instagram: 4:5 social post</span>
              </div>
            </div>
          </div>

          <label className="block space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Product description</span>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe the product, who it is for, how it should feel, and what the mockups should highlight."
              className="w-full rounded-3xl border border-white/10 bg-[#0A0A0B] px-5 py-4 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {pending ? "Queueing mockup job..." : "Generate Mockups"}
          </button>
        </form>
      </section>

      {latestArtifact ? (
        <section className="space-y-6 rounded-[2rem] border border-white/5 bg-[#141417] p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Latest Artifact</p>
              <h3 className="mt-2 text-2xl font-black text-white">{latestArtifact.productName}</h3>
              <p className="mt-2 text-sm text-gray-400">{latestArtifact.summary}</p>
            </div>
            {latestWorkflowId ? (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/workflows/${latestWorkflowId}`)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0A0A0B] px-5 py-3 text-sm font-bold text-white transition hover:border-white/20"
              >
                Open Live Result
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <MockupGallery images={latestArtifact.images} title={latestArtifact.productName} />
        </section>
      ) : null}
    </div>
  );
}

function InputField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block space-y-3">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{label}</span>
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-5 py-4 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}
