"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  FileSpreadsheet,
  Flame,
  Loader2,
  PackagePlus,
  Radar,
  Search,
  Sparkles,
  Swords,
} from "lucide-react";

type StudioMode = "bulk" | "competitor" | "forge" | "launch" | "listing" | "opportunity";

type WorkflowSubmission =
  | {
      payload: { url: string };
      type: "listing_intelligence";
    }
  | {
      payload: { keyword?: string; url?: string };
      type: "competitor_analysis";
    }
  | {
      payload: { keyword: string };
      type: "opportunity_analysis";
    }
  | {
      payload: {
        productName: string;
        productType: string;
        targetAudience: string;
        tone: string;
      };
      type: "listing_forge";
    }
  | {
      payload: {
        audience?: string;
        category?: string;
        description: string;
        keyword?: string;
        productName: string;
      };
      type: "launch_pack_generation";
    };

const studioModes: Array<{
  cost: string;
  description: string;
  icon: typeof Search;
  mode: StudioMode;
  title: string;
}> = [
  {
    cost: "4 credits",
    description: "Score an Etsy listing, uncover SEO gaps, and generate a scorecard.",
    icon: Search,
    mode: "listing",
    title: "Listing Intelligence",
  },
  {
    cost: "4 credits",
    description: "Break down a competitor and find the positioning angles they missed.",
    icon: Swords,
    mode: "competitor",
    title: "Competitor Analyzer",
  },
  {
    cost: "6 credits",
    description: "Estimate demand, competition, and trend momentum for a niche keyword.",
    icon: Radar,
    mode: "opportunity",
    title: "Opportunity Engine",
  },
  {
    cost: "3 credits",
    description: "Generate an Etsy-ready digital product listing: SEO title, conversion description, tags, and FAQ.",
    icon: Sparkles,
    mode: "forge",
    title: "Listing Generator",
  },
  {
    cost: "10 credits",
    description: "Generate the full launch pack: SEO, hooks, captions, emails, and a launch calendar.",
    icon: Flame,
    mode: "launch",
    title: "One-Click Launch",
  },
  {
    cost: "10 credits / row",
    description: "Upload a CSV to queue one launch-pack job per product with batch tracking.",
    icon: FileSpreadsheet,
    mode: "bulk",
    title: "Bulk Generation",
  },
];

function isStudioMode(value: string | null): value is StudioMode {
  return studioModes.some((mode) => mode.mode === value);
}

export default function WorkflowStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMode, setActiveMode] = useState<StudioMode>("listing");
  const [pendingMode, setPendingMode] = useState<StudioMode | null>(null);
  const [error, setError] = useState("");

  const [listingUrl, setListingUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorKeyword, setCompetitorKeyword] = useState("");
  const [opportunityKeyword, setOpportunityKeyword] = useState("");
  const [forgeForm, setForgeForm] = useState({
    productName: "",
    productType: "Digital template",
    targetAudience: "",
    tone: "Modern",
  });
  const [launchForm, setLaunchForm] = useState({
    audience: "",
    category: "Digital Product",
    description: "",
    keyword: "",
    productName: "",
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (isStudioMode(requestedMode)) {
      setActiveMode(requestedMode);
    }
  }, [searchParams]);

  const activeCard = useMemo(
    () => studioModes.find((mode) => mode.mode === activeMode) ?? studioModes[0],
    [activeMode],
  );

  async function submitWorkflow(submission: WorkflowSubmission, mode: StudioMode) {
    setPendingMode(mode);
    setError("");

    try {
      const response = await fetch("/api/workflows", {
        body: JSON.stringify(submission),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to start workflow");
      }

      router.push(`/dashboard/workflows/${data.workflowId}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to start workflow");
    } finally {
      setPendingMode(null);
    }
  }

  async function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bulkFile) {
      setError("Please upload a CSV file with at least productName and description columns.");
      return;
    }

    setPendingMode("bulk");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", bulkFile);

      const response = await fetch("/api/bulk-generation", {
        body: formData,
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to queue bulk generation");
      }

      router.push("/dashboard/workflows");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to queue bulk generation");
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
          <Sparkles className="h-3 w-3" />
          Workflow Studio
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-white">Orchestrate your growth workflows</h1>
            <p className="text-sm font-medium leading-relaxed text-gray-400">
              Every expensive task runs through BullMQ workers. Pick a workflow, submit lightweight inputs,
              and ORVEX will stream status back to the dashboard while the worker handles the heavy lifting.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#141417] px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">Active Workflow</p>
            <p className="mt-2 text-xl font-bold text-white">{activeCard.title}</p>
            <p className="mt-1 text-xs text-gray-400">{activeCard.cost}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-5">
        {studioModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.mode === activeMode;

          return (
            <button
              key={mode.mode}
              type="button"
              onClick={() => setActiveMode(mode.mode)}
              className={`rounded-3xl border p-5 text-left transition-all ${
                isActive
                  ? "border-indigo-500/40 bg-indigo-500/10 shadow-xl shadow-indigo-500/10"
                  : "border-white/5 bg-[#141417] hover:border-white/10"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`rounded-2xl p-3 ${isActive ? "bg-indigo-500/20" : "bg-[#1C1C1F]"}`}>
                  <Icon className={`h-5 w-5 ${isActive ? "text-indigo-300" : "text-gray-400"}`} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{mode.cost}</span>
              </div>
              <h2 className="mb-2 text-sm font-bold text-white">{mode.title}</h2>
              <p className="text-xs leading-relaxed text-gray-400">{mode.description}</p>
            </button>
          );
        })}
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-8 shadow-2xl shadow-black/20">
        {activeMode === "listing" ? (
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              void submitWorkflow({
                payload: { url: listingUrl.trim() },
                type: "listing_intelligence",
              }, "listing");
            }}
          >
            <SectionHeader
              eyebrow="Listing Intelligence"
              title="Audit a live Etsy listing"
              description="Paste a public Etsy listing URL and ORVEX will scrape the listing, analyze the copy, score its conversion quality, and generate an optimized replacement."
            />
            <InputField
              label="Etsy listing URL"
              placeholder="https://www.etsy.com/listing/..."
              value={listingUrl}
              onChange={setListingUrl}
            />
            <SubmitButton pending={pendingMode === "listing"} label="Queue Listing Audit" />
          </form>
        ) : null}

        {activeMode === "competitor" ? (
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              if (!competitorUrl.trim() && !competitorKeyword.trim()) {
                setError("Enter a competitor URL or a product keyword.");
                return;
              }
              void submitWorkflow({
                payload: {
                  keyword: competitorKeyword.trim() || undefined,
                  url: competitorUrl.trim() || undefined,
                },
                type: "competitor_analysis",
              }, "competitor");
            }}
          >
            <SectionHeader
              eyebrow="Competitor Analyzer"
              title="Break down a competing product"
              description="ORVEX can inspect a competitor listing or a product keyword, compare it against live Etsy marketplace results, and surface pricing, review, ranking, and keyword positioning."
            />
            <div className="grid gap-6 md:grid-cols-2">
              <InputField
                label="Competitor URL"
                placeholder="https://www.etsy.com/listing/..."
                required={false}
                value={competitorUrl}
                onChange={setCompetitorUrl}
              />
              <InputField
                label="Product keyword"
                placeholder='e.g. "gift for mum"'
                required={false}
                value={competitorKeyword}
                onChange={setCompetitorKeyword}
              />
            </div>
            <SubmitButton pending={pendingMode === "competitor"} label="Queue Competitor Analysis" />
          </form>
        ) : null}

        {activeMode === "opportunity" ? (
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              void submitWorkflow({
                payload: { keyword: opportunityKeyword.trim() },
                type: "opportunity_analysis",
              }, "opportunity");
            }}
          >
            <SectionHeader
              eyebrow="Opportunity Engine"
              title="Discover viable product angles"
              description="Enter a niche keyword and ORVEX will estimate demand, competition, and trend strength before generating structured product ideas with opportunity scores."
            />
            <InputField
              label="Niche keyword"
              placeholder='e.g. "dog lovers"'
              value={opportunityKeyword}
              onChange={setOpportunityKeyword}
            />
            <SubmitButton pending={pendingMode === "opportunity"} label="Generate Opportunity Report" />
          </form>
        ) : null}

        {activeMode === "forge" ? (
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              void submitWorkflow({
                payload: {
                  productName: forgeForm.productName.trim(),
                  productType: forgeForm.productType.trim(),
                  targetAudience: forgeForm.targetAudience.trim(),
                  tone: forgeForm.tone.trim(),
                },
                type: "listing_forge",
              }, "forge");
            }}
          >
            <SectionHeader
              eyebrow="Forge"
              title="Generate a high-converting Etsy listing"
              description="Feed ORVEX the product basics and get an SEO title, a conversion-focused description, Etsy tags, and FAQ copy ready to paste."
            />

            <div className="grid gap-6 md:grid-cols-2">
              <InputField
                label="Product name"
                placeholder="Minimalist dog mom planner bundle"
                value={forgeForm.productName}
                onChange={(value) => setForgeForm((current) => ({ ...current, productName: value }))}
              />
              <InputField
                label="Product type"
                placeholder="Printable planner, Notion template, Canva template"
                value={forgeForm.productType}
                onChange={(value) => setForgeForm((current) => ({ ...current, productType: value }))}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <InputField
                label="Target audience"
                placeholder="Etsy shoppers, first-time dog owners, new puppy gift buyers"
                value={forgeForm.targetAudience}
                onChange={(value) => setForgeForm((current) => ({ ...current, targetAudience: value }))}
              />
              <InputField
                label="Tone"
                placeholder="Modern, playful, luxe, minimal"
                value={forgeForm.tone}
                onChange={(value) => setForgeForm((current) => ({ ...current, tone: value }))}
              />
            </div>

            <SubmitButton pending={pendingMode === "forge"} label="Generate Listing" />
          </form>
        ) : null}

        {activeMode === "launch" ? (
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              void submitWorkflow({
                payload: {
                  audience: launchForm.audience.trim() || undefined,
                  category: launchForm.category.trim() || undefined,
                  description: launchForm.description.trim(),
                  keyword: launchForm.keyword.trim() || undefined,
                  productName: launchForm.productName.trim(),
                },
                type: "launch_pack_generation",
              }, "launch");
            }}
          >
            <SectionHeader
              eyebrow="One-Click Launch"
              title="Generate the full launch pack"
              description="Feed ORVEX a product idea and the worker will return SEO titles, tags, an optimized description, FAQ, TikTok hooks, Pinterest captions, launch emails, and a 14-day rollout plan."
            />

            <div className="grid gap-6 md:grid-cols-2">
              <InputField
                label="Product name"
                placeholder="Minimalist dog mom planner bundle"
                value={launchForm.productName}
                onChange={(value) => setLaunchForm((current) => ({ ...current, productName: value }))}
              />
              <InputField
                label="Niche keyword"
                placeholder="dog mom printable"
                required={false}
                value={launchForm.keyword}
                onChange={(value) => setLaunchForm((current) => ({ ...current, keyword: value }))}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <InputField
                label="Category"
                placeholder="Digital Product"
                value={launchForm.category}
                onChange={(value) => setLaunchForm((current) => ({ ...current, category: value }))}
              />
              <InputField
                label="Audience"
                placeholder="Etsy shoppers, pet owners, new puppy gift buyers"
                required={false}
                value={launchForm.audience}
                onChange={(value) => setLaunchForm((current) => ({ ...current, audience: value }))}
              />
            </div>

            <TextareaField
              label="Product context"
              placeholder="Explain what the product is, why it matters, key features, the intended buyer, and anything the AI should highlight in launch messaging."
              value={launchForm.description}
              onChange={(value) => setLaunchForm((current) => ({ ...current, description: value }))}
            />
            <SubmitButton pending={pendingMode === "launch"} label="Queue Launch Pack" />
          </form>
        ) : null}

        {activeMode === "bulk" ? (
          <form className="space-y-8" onSubmit={handleBulkSubmit}>
            <SectionHeader
              eyebrow="Bulk Generation"
              title="Upload a CSV for batch launch packs"
              description="Each row becomes its own BullMQ job, so workers can process the queue safely with concurrency limits and retries. Required columns: productName, description. Optional: category, audience, keyword."
            />

            <label className="block rounded-3xl border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#141417]">
                <PackagePlus className="h-8 w-8 text-indigo-300" />
              </div>
              <p className="mt-4 text-lg font-bold text-white">{bulkFile ? bulkFile.name : "Select a CSV file"}</p>
              <p className="mt-2 text-sm text-gray-400">Max 50 rows per upload. Each row queues independently.</p>
              <input
                type="file"
                accept=".csv,text/csv"
                className="mt-6 block w-full text-sm text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black"
                onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <SubmitButton pending={pendingMode === "bulk"} label="Queue Batch" />
          </form>
        ) : null}
      </section>
    </div>
  );
}

function SectionHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-indigo-300">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
      <p className="max-w-3xl text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}

function InputField({
  label,
  onChange,
  placeholder,
  required = true,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block space-y-3">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-[#0A0A0B] px-5 py-4 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

function TextareaField({
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
      <textarea
        required
        rows={7}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-3xl border border-white/10 bg-[#0A0A0B] px-5 py-4 text-sm text-white outline-none transition focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      {pending ? "Queueing workflow..." : label}
    </button>
  );
}
