"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, RadioTower } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { ChannelId } from "@server/schemas/multi-channel-launch-pack";
import type { MultiChannelLaunchPackResult } from "@/lib/workflows";
import { MultiChannelLaunchTabs } from "./multi-channel-launch-tabs";

const channelOptions: Array<{ id: ChannelId; label: string }> = [
  { id: "amazon", label: "Amazon" },
  { id: "etsy", label: "Etsy" },
  { id: "instagram", label: "Instagram" },
  { id: "pinterest", label: "Pinterest" },
  { id: "shopify", label: "Shopify" },
  { id: "tiktok", label: "TikTok" },
];

export function MultiChannelLaunchStudio({
  latestArtifact,
  latestWorkflowId,
}: {
  latestArtifact: MultiChannelLaunchPackResult | null;
  latestWorkflowId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    productType: "Digital template",
    targetAudience: "",
  });
  const [channels, setChannels] = useState<ChannelId[]>([
    "amazon",
    "etsy",
    "instagram",
    "pinterest",
    "shopify",
    "tiktok",
  ]);

  const toggleChannel = (channel: ChannelId) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      if (channels.length === 0) {
        throw new Error("Please select at least one channel to generate content for.");
      }

      const response = await fetch("/api/launchpack-multi", {
        body: JSON.stringify({
          productName: form.productName.trim(),
          productType: form.productType.trim(),
          targetAudience: form.targetAudience.trim(),
          channelsToGenerate: channels,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = await response.json() as { error?: string; workflowId?: string };
      if (!response.ok || !data.workflowId) {
        throw new Error(data.error || "Unable to queue multi-channel launch pack");
      }

      router.push(`/dashboard/workflows/${data.workflowId}`);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Unable to queue multi-channel launch pack"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-8 shadow-2xl shadow-black/20">
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
            <RadioTower className="h-3 w-3" />
            Multi-Channel Launch Pack
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">Generate launch copy across every channel</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-400">
            This route stays lightweight, pushes work into BullMQ, and streams results back as the worker completes each channel.
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
              placeholder="Minimalist Dog Mom Planner Bundle"
              value={form.productName}
              onChange={(value) => setForm((current) => ({ ...current, productName: value }))}
            />
            <InputField
              label="Product type"
              placeholder="Digital template, planner, printable, toolkit"
              value={form.productType}
              onChange={(value) => setForm((current) => ({ ...current, productType: value }))}
            />
          </div>

          <InputField
            label="Target audience"
            placeholder="Busy Etsy shoppers, new pet owners, digital creators, side-hustle founders"
            value={form.targetAudience}
            onChange={(value) => setForm((current) => ({ ...current, targetAudience: value }))}
          />

          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Channels to Generate</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {channelOptions.map((channel) => (
                <label
                  key={channel.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-[#0A0A0B] p-4 transition-all ${
                    channels.includes(channel.id)
                      ? "border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-white transition-all ${
                      channels.includes(channel.id)
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-gray-600 bg-transparent"
                    }`}
                  >
                    {channels.includes(channel.id) && (
                      <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
                        <path
                          d="M3 8L6 11L11 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${channels.includes(channel.id) ? "text-indigo-100" : "text-gray-400"}`}>
                    {channel.label}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={channels.includes(channel.id)}
                    onChange={() => toggleChannel(channel.id)}
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {pending ? "Queueing workflow..." : "Generate Multi-Channel Pack"}
          </button>
        </form>
      </section>

      {latestArtifact ? (
        <section className="rounded-[2rem] border border-white/5 bg-[#141417] p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">Latest Artifact</p>
              <h3 className="mt-2 text-2xl font-black text-white">{latestArtifact.productName}</h3>
              <p className="mt-2 text-sm text-gray-400">
                {latestArtifact.productType} for {latestArtifact.targetAudience}
              </p>
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
          <MultiChannelLaunchTabs artifact={latestArtifact} />
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
