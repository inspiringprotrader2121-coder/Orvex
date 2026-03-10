"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { MultiChannelLaunchPackResult } from "@/lib/workflows";

type ChannelKey = keyof MultiChannelLaunchPackResult["channels"];

const channelLabels: Record<ChannelKey, string> = {
  amazon: "Amazon",
  etsy: "Etsy",
  instagram: "Instagram",
  pinterest: "Pinterest",
  shopify: "Shopify",
  tiktok: "TikTok",
};

export function MultiChannelLaunchTabs({
  artifact,
  className = "",
}: {
  artifact: MultiChannelLaunchPackResult;
  className?: string;
}) {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>("etsy");
  const channel = artifact.channels[activeChannel];
  const hashtagsText = channel.hashtags.join(" ");

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(channelLabels) as ChannelKey[]).map((channelKey) => {
          const active = channelKey === activeChannel;

          return (
            <button
              key={channelKey}
              type="button"
              onClick={() => setActiveChannel(channelKey)}
              className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                active
                  ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                  : "border-white/10 bg-[#0A0A0B] text-gray-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {channelLabels[channelKey]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <CopyCard label={`${channelLabels[activeChannel]} Title`} text={channel.title} />
          <CopyCard label={`${channelLabels[activeChannel]} Description`} multiline text={channel.description} />
        </div>

        <div className="space-y-6">
          <CopyCard label={`${channelLabels[activeChannel]} Caption`} multiline text={channel.caption} />
          <CopyCard label={`${channelLabels[activeChannel]} Hashtags`} text={hashtagsText} />
          <div className="rounded-3xl border border-white/5 bg-[#141417] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">Summary</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{artifact.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyCard({
  label,
  multiline = false,
  text,
}: {
  label: string;
  multiline?: boolean;
  text: string;
}) {
  return (
    <div className="relative rounded-3xl border border-white/5 bg-[#141417] p-5">
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(text)}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0B] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300"
      >
        <Copy className="h-3 w-3" />
        Copy
      </button>
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">{label}</p>
      {multiline ? (
        <pre className="mt-4 whitespace-pre-wrap pr-16 font-sans text-sm leading-relaxed text-gray-300">{text}</pre>
      ) : (
        <p className="mt-4 pr-16 text-sm leading-relaxed text-gray-300">{text}</p>
      )}
    </div>
  );
}
