"use client";

import { useState, useTransition } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusPill } from "./admin-ui";
import { useAdminResource } from "./use-admin-resource";
import { getErrorMessage } from "@/lib/errors";

type ModerationData = {
  items: Array<{
    createdAt: string;
    id: string;
    status: "approved" | "flagged" | "pending" | "rejected";
    summary: string | null;
    title: string;
    type: string;
  }>;
  lowListings: Array<{
    conversionScore: number;
    email: string;
    id: string;
    keywordCoverage: number;
    listingScore: number;
    listingTitle: string;
    seoScore: number;
    sourceUrl: string;
  }>;
  topListings: Array<{
    conversionScore: number;
    email: string;
    id: string;
    keywordCoverage: number;
    listingScore: number;
    listingTitle: string;
    optimizedDescription: string;
    optimizedTitle: string;
    suggestedTags: string[];
    seoScore: number;
    sourceUrl: string;
  }>;
  templates: Array<{
    category: string;
    downloadsCount: number;
    id: string;
    name: string;
    popularityScore: number;
    status: "approved" | "flagged" | "pending" | "rejected";
    usageCount: number;
  }>;
};

async function patchModeration(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/moderation", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error((await response.json().catch(() => ({ error: "Moderation request failed" }))).error ?? "Moderation request failed");
  }
}

export function AdminModerationClient({
  initialData,
}: {
  initialData: ModerationData;
}) {
  const { data, error, refresh } = useAdminResource(initialData, {
    endpoint: "/api/admin/moderation",
    eventNames: ["admin.data.changed"],
    pollMs: 60_000,
  });
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleItemAction = (itemId: string, status: "approved" | "flagged" | "rejected") => {
    startTransition(() => {
      void (async () => {
        try {
          await patchModeration({
            itemId,
            mode: "item",
            notes: "Reviewed in super admin dashboard",
            status,
          });
          await refresh();
        } catch (moderationError) {
          setActionError(getErrorMessage(moderationError, "Moderation update failed"));
        }
      })();
    });
  };

  const handleTemplateAction = (templateId: string, status: "approved" | "flagged" | "rejected") => {
    startTransition(() => {
      void (async () => {
        try {
          await patchModeration({
            mode: "template",
            status,
            templateId,
          });
          await refresh();
        } catch (moderationError) {
          setActionError(getErrorMessage(moderationError, "Template update failed"));
        }
      })();
    });
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Moderation and Oversight"
        subtitle="Review AI-generated assets, community templates, and low-performing listing analyses before they spread across the product."
        title="Moderation"
      />

      {error || actionError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error || actionError}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminSection title="AI Content Moderation Queue">
          <div className="space-y-3">
            {data.items.length > 0 ? data.items.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.summary}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{item.type}</p>
                  </div>
                  <StatusPill tone={item.status === "approved" ? "success" : item.status === "pending" ? "warning" : "critical"}>{item.status}</StatusPill>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleItemAction(item.id, "approved")} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Approve</button>
                  <button type="button" onClick={() => handleItemAction(item.id, "flagged")} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Flag</button>
                  <button type="button" onClick={() => handleItemAction(item.id, "rejected")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Reject</button>
                </div>
              </div>
            )) : <AdminEmptyState text="No moderation items yet. New listing and launch outputs will land here automatically." />}
          </div>
        </AdminSection>

        <AdminSection title="Community Template Oversight">
          <div className="space-y-3">
            {data.templates.length > 0 ? data.templates.map((template) => (
              <div key={template.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{template.category} • Popularity {template.popularityScore} • {template.downloadsCount} downloads • {template.usageCount} uses</p>
                  </div>
                  <StatusPill tone={template.status === "approved" ? "success" : template.status === "pending" ? "warning" : "critical"}>{template.status}</StatusPill>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleTemplateAction(template.id, "approved")} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Approve</button>
                  <button type="button" onClick={() => handleTemplateAction(template.id, "flagged")} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Flag</button>
                  <button type="button" onClick={() => handleTemplateAction(template.id, "rejected")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Reject</button>
                </div>
              </div>
            )) : <AdminEmptyState text="No shared templates have been submitted yet." />}
          </div>
        </AdminSection>
      </div>

      <AdminSection
        action={(
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/export?dataset=listings&format=csv" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">CSV</a>
            <a href="/api/admin/export?dataset=listings&format=json" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">JSON</a>
            <a href="/api/admin/export?dataset=listings&format=pdf" className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">PDF</a>
          </div>
        )}
        title="Low-Performing Listing Optimization Scores (All Users)"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {data.lowListings.length > 0 ? data.lowListings.map((listing) => (
            <div key={listing.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{listing.listingTitle}</p>
                  <p className="mt-1 text-sm text-slate-400">{listing.email}</p>
                </div>
                <StatusPill tone={listing.listingScore <= 40 ? "critical" : "warning"}>{listing.listingScore}</StatusPill>
              </div>
              <p className="mt-3 text-sm text-slate-400">SEO {listing.seoScore} • Conversion {listing.conversionScore} • Coverage {listing.keywordCoverage}</p>
              <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                View source
              </a>
            </div>
          )) : <AdminEmptyState text="Low-performing listings will surface here once optimization analyses are available." />}
        </div>
      </AdminSection>

      <AdminSection
        action={(
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/export?dataset=listing_templates&format=csv" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">CSV</a>
            <a href="/api/admin/export?dataset=listing_templates&format=json" className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">JSON</a>
            <a href="/api/admin/export?dataset=listing_templates&format=pdf" className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">PDF</a>
          </div>
        )}
        title="Top-Performing Listing Templates"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {data.topListings.length > 0 ? data.topListings.map((listing) => (
            <div key={listing.id} className="rounded-3xl border border-white/6 bg-[#0b1220] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{listing.listingTitle}</p>
                  <p className="mt-1 text-sm text-slate-400">{listing.email}</p>
                </div>
                <StatusPill tone="success">{listing.listingScore}</StatusPill>
              </div>
              <p className="mt-3 text-sm text-slate-400">SEO {listing.seoScore} • Conversion {listing.conversionScore} • Coverage {listing.keywordCoverage}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p><span className="text-slate-500">Optimized title:</span> {listing.optimizedTitle}</p>
                <p className="line-clamp-3"><span className="text-slate-500">Optimized description:</span> {listing.optimizedDescription}</p>
                <p className="text-xs text-slate-500">Tags: {listing.suggestedTags.join(", ")}</p>
              </div>
              <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                View source
              </a>
            </div>
          )) : <AdminEmptyState text="High-performing listing templates will appear once optimization analyses are available." />}
        </div>
      </AdminSection>

      {isPending ? <div className="text-sm text-slate-400">Applying moderation decision…</div> : null}
    </div>
  );
}
