import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ScorecardService } from "@server/services/scorecard-service";

export const runtime = "nodejs";
export const size = {
  height: 630,
  width: 1200,
};
export const contentType = "image/png";

function scoreTile(label: string, value: number, accent: string) {
  return h(
    "div",
    {
      style: {
        alignItems: "flex-start",
        background: "#12131a",
        border: `1px solid ${accent}`,
        borderRadius: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 180,
        padding: "24px 28px",
      },
    },
    h("span", {
      children: label,
      style: { color: "#8f96ab", fontSize: 18, textTransform: "uppercase" },
    }),
    h("span", {
      children: String(value),
      style: { color: "#ffffff", fontSize: 48, fontWeight: 700 },
    }),
  );
}

function bulletRow(key: string, value: string) {
  return h("span", {
    children: `- ${value}`,
    key,
    style: { color: "#d6d9e5", display: "flex", fontSize: 22 },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const analysis = await ScorecardService.getListingScorecard(id, userId);

  if (!analysis) {
    return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
  }

  return new ImageResponse(
    h(
      "div",
      {
        style: {
          background: "linear-gradient(135deg, #09090b 0%, #12131a 55%, #1b1e31 100%)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          height: "100%",
          padding: 48,
          width: "100%",
        },
      },
      h("div", {
        children: "Orvex Listing Scorecard",
        style: {
          color: "#8f96ab",
          display: "flex",
          fontSize: 20,
          letterSpacing: 3,
          marginBottom: 18,
          textTransform: "uppercase",
        },
      }),
      h(
        "div",
        {
          style: {
            alignItems: "center",
            display: "flex",
            gap: 24,
            justifyContent: "space-between",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 780,
            },
          },
          h("div", {
            children: analysis.listingTitle,
            style: {
              color: "#eef2ff",
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.05,
            },
          }),
          h("div", {
            children: analysis.sourceUrl,
            style: { color: "#8f96ab", display: "flex", fontSize: 22 },
          }),
        ),
        h(
          "div",
          {
            style: {
              alignItems: "center",
              background: "linear-gradient(180deg, #6366f1 0%, #22c55e 120%)",
              borderRadius: 999,
              display: "flex",
              height: 180,
              justifyContent: "center",
              minWidth: 180,
            },
          },
          h(
            "div",
            {
              style: {
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              },
            },
            h("span", {
              children: "Listing Score",
              style: {
                color: "#dbeafe",
                fontSize: 18,
                letterSpacing: 2,
                textTransform: "uppercase",
              },
            }),
            h("span", {
              children: String(analysis.listingScore),
              style: { fontSize: 72, fontWeight: 800 },
            }),
          ),
        ),
      ),
      h(
        "div",
        {
          style: { display: "flex", gap: 18, marginTop: 40 },
        },
        scoreTile("SEO", analysis.seoScore, "#3b82f6"),
        scoreTile("Conversion", analysis.conversionScore, "#22c55e"),
        scoreTile("Coverage", analysis.keywordCoverage, "#eab308"),
        scoreTile("Hook", analysis.emotionalHookScore, "#f97316"),
        scoreTile("CTA", analysis.ctaStrength, "#a855f7"),
      ),
      h(
        "div",
        {
          style: { display: "flex", gap: 24, marginTop: 36 },
        },
        h(
          "div",
          {
            style: {
              background: "#12131a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: 14,
              padding: 28,
            },
          },
          h("span", {
            children: "Strengths",
            style: { color: "#4ade80", fontSize: 20, fontWeight: 700 },
          }),
          ...analysis.strengths.slice(0, 4).map((item, index) => bulletRow(`strength-${index}`, item)),
        ),
        h(
          "div",
          {
            style: {
              background: "#12131a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: 14,
              padding: 28,
            },
          },
          h("span", {
            children: "Keyword Gaps",
            style: { color: "#f87171", fontSize: 20, fontWeight: 700 },
          }),
          ...analysis.keywordGaps.slice(0, 4).map((item, index) => bulletRow(`gap-${index}`, item)),
        ),
      ),
    ),
    size,
  );
}
