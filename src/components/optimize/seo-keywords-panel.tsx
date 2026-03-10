"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

type SeoKeywordSuggestion = {
  id: string;
  cacheHit: boolean;
  tags: string[];
  keywords: Array<{ keyword: string; trendScore: number; competitionScore: number }>;
  optimizedTitle: string;
  optimizedDescription: string;
  optimizedMetaDescription: string;
  createdAt: string;
  autoApplied: boolean;
};

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}

export function SeoKeywordsPanel({
  initialSuggestions,
}: {
  initialSuggestions: SeoKeywordSuggestion[];
}) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [status, setStatus] = useState("");
  const [inputText, setInputText] = useState("");
  const [source, setSource] = useState<"niche" | "listing">("niche");
  const [, startTransition] = useTransition();

  const refresh = async () => {
    try {
      setStatus("Refreshing suggestions…");
      const response = await fetch("/api/seo-keywords");
      const data = await response.json();
      setSuggestions(data.suggestions);
      setStatus("Updated suggestions.");
    } catch {
      setStatus("Unable to refresh suggestions.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputText.trim()) {
      setStatus("Enter some text to analyze.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          setStatus("Queueing SEO analysis…");
          await postJson("/api/seo-keywords", { inputText, source });
          await refresh();
          setInputText("");
          setStatus("Analysis requested—tracking new results in a moment.");
        } catch {
          setStatus("Failed to start SEO analysis.");
        }
      })();
    });
  };

  const handleAutoApply = (suggestion: SeoKeywordSuggestion) => {
    startTransition(() => {
      void (async () => {
        const listingId = window.prompt("Enter listing ID for auto-apply");
        if (!listingId) {
          setStatus("Listing ID required for auto-apply.");
          return;
        }

        try {
          await postJson("/api/seo-keywords/apply", {
            suggestionId: suggestion.id,
            listingId,
            notes: "Applied from SEO panel",
          });
          setStatus("Auto-apply triggered successfully.");
          await refresh();
        } catch {
          setStatus("Auto-apply failed.");
        }
      })();
    });
  };

  const latest = suggestions[0];

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-white/5 bg-[#0a0f1c] p-6">
        <div className="flex flex-wrap gap-3">
          <label className="flex-1">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Niche or listing text</span>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-[#070c16] px-4 py-3 text-sm text-white"
              placeholder="Describe what you are selling or paste your current listing copy"
            />
          </label>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Source</label>
            <select value={source} onChange={(event) => setSource(event.target.value as "niche" | "listing")} className="rounded-2xl border border-white/10 bg-[#070c16] px-4 py-3 text-sm text-white">
              <option value="niche">Niche</option>
              <option value="listing">Listing</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
            Generate keywords
          </button>
          <button type="button" onClick={refresh} className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-300">
            Refresh list
          </button>
          {status ? <span className="text-xs text-slate-400">{status}</span> : null}
        </div>
      </form>

      {latest ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{latest.cacheHit ? "Cached" : "Fresh"}</p>
                <h2 className="text-2xl font-black text-white">{latest.optimizedTitle}</h2>
                <p className="text-sm text-slate-400">{latest.optimizedMetaDescription}</p>
              </div>
              <button type="button" onClick={() => handleAutoApply(latest)} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                Auto-apply to listing
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-300">{latest.optimizedDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {latest.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-[#0a0f1c] px-3 py-1 text-[11px] font-semibold text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#141417] p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Keywords</p>
              <span className="text-xs text-slate-400">{latest.keywords.length} keywords</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-white/5 bg-[#0a0f1c]">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Keyword</th>
                    <th className="px-4 py-3">Trend</th>
                    <th className="px-4 py-3">Competition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {latest.keywords.map((keyword) => (
                    <tr key={keyword.keyword}>
                      <td className="px-4 py-3 text-white">{keyword.keyword}</td>
                      <td className="px-4 py-3 text-slate-300">{keyword.trendScore}</td>
                      <td className="px-4 py-3 text-slate-300">{keyword.competitionScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#0a0f1c] p-6 text-sm text-slate-400">
          Run an SEO request to see keyword suggestions here.
        </div>
      )}
    </div>
  );
}
