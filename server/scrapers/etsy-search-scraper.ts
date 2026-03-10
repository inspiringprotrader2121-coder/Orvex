import { load } from "cheerio";
import { CompetitorMarketListingSchema } from "@server/schemas/competitor-analysis";
import type { MarketplaceSearchListing, MarketplaceSearchScraper } from "./types";

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseJsonBlocks(html: string) {
  const matches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const payloads: unknown[] = [];

  for (const match of matches) {
    const content = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    if (!content) {
      continue;
    }

    try {
      payloads.push(JSON.parse(content) as unknown);
    } catch {
      continue;
    }
  }

  return payloads;
}

function walkJson(node: unknown, visitor: (value: Record<string, unknown>) => void) {
  if (Array.isArray(node)) {
    for (const item of node) {
      walkJson(item, visitor);
    }
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;
  visitor(record);

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      walkJson(value, visitor);
    }
  }
}

function normalizeUrl(input: string) {
  try {
    const parsed = new URL(input);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function parsePriceAmount(value?: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRating(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(5, value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : null;
  }

  return null;
}

function parseReviewCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
}

function extractKeywords(title: string) {
  return uniqueStrings(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((value) => value.length > 2)
      .slice(0, 8),
  );
}

function buildListing(input: {
  averageRating?: number | null;
  estimatedRank: number;
  keywords?: string[];
  priceAmount?: number | null;
  priceText?: string;
  reviewCount?: number;
  shopName?: string;
  title: string;
  url: string;
}): MarketplaceSearchListing | null {
  const normalizedUrl = normalizeUrl(input.url);
  if (!normalizedUrl || !input.title.trim()) {
    return null;
  }

  return CompetitorMarketListingSchema.parse({
    averageRating: input.averageRating ?? null,
    estimatedRank: input.estimatedRank,
    keywordOverlap: 0,
    keywords: input.keywords ?? extractKeywords(input.title),
    priceAmount: input.priceAmount ?? null,
    priceText: input.priceText,
    provider: "etsy",
    reviewCount: input.reviewCount ?? 0,
    shopName: input.shopName,
    title: input.title.trim(),
    url: normalizedUrl,
  });
}

function extractJsonListings(html: string) {
  const listings: MarketplaceSearchListing[] = [];
  const seenUrls = new Set<string>();

  for (const payload of parseJsonBlocks(html)) {
    walkJson(payload, (record) => {
      if (record["@type"] === "ListItem") {
        const item = record.item;
        if (!item || typeof item !== "object") {
          return;
        }

        const product = item as Record<string, unknown>;
        const offer = product.offers as Record<string, unknown> | undefined;
        const offerPrice = offer?.price;
        const listing = buildListing({
          averageRating: parseRating((product.aggregateRating as Record<string, unknown> | undefined)?.ratingValue),
          estimatedRank: parseReviewCount(record.position) || listings.length + 1,
          keywords: extractKeywords(typeof product.name === "string" ? product.name : ""),
          priceAmount: typeof offerPrice === "number" || typeof offerPrice === "string"
            ? parsePriceAmount(offerPrice)
            : null,
          priceText: typeof offerPrice === "string"
            ? `${offerPrice}`
            : undefined,
          reviewCount: parseReviewCount((product.aggregateRating as Record<string, unknown> | undefined)?.ratingCount),
          shopName: typeof (product.brand as Record<string, unknown> | undefined)?.name === "string"
            ? (product.brand as Record<string, unknown>).name as string
            : undefined,
          title: typeof product.name === "string" ? product.name : "",
          url: typeof product.url === "string"
            ? product.url
            : typeof record.url === "string"
              ? record.url
              : "",
        });

        if (!listing || seenUrls.has(listing.url)) {
          return;
        }

        seenUrls.add(listing.url);
        listings.push(listing);
      }
    });
  }

  return listings;
}

function parseReviewMeta(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const ratingMatch = normalized.match(/([0-5](?:\.[0-9])?)/);
  const reviewMatch = normalized.match(/([0-9,]+)\s+reviews?/i);

  return {
    averageRating: ratingMatch ? parseRating(ratingMatch[1]) : null,
    reviewCount: reviewMatch ? parseReviewCount(reviewMatch[1]) : 0,
  };
}

function extractDomListings(html: string) {
  const $ = load(html);
  const listings: MarketplaceSearchListing[] = [];
  const seenUrls = new Set<string>();
  let rank = 1;

  $("a[href*='/listing/']").each((_, element) => {
    const href = $(element).attr("href");
    const normalizedUrl = href ? normalizeUrl(href) : "";
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      return;
    }

    const card = $(element).closest("li, div");
    const title = $(element).attr("title")
      || card.find("h3, h2").first().text().trim()
      || $(element).text().trim();

    if (!title) {
      return;
    }

    const priceText = card.find("[data-price-converted]").first().text().trim()
      || card.find(".currency-value").first().text().trim()
      || card.find("[class*='price']").first().text().trim();
    const reviewMeta = parseReviewMeta(
      card.find("[aria-label*='reviews']").attr("aria-label")
        || card.find("[aria-label*='out of 5 stars']").attr("aria-label")
        || "",
    );

    const listing = buildListing({
      averageRating: reviewMeta.averageRating,
      estimatedRank: rank,
      priceAmount: parsePriceAmount(priceText),
      priceText: priceText || undefined,
      reviewCount: reviewMeta.reviewCount,
      shopName: card.find("[class*='shop-name']").first().text().trim() || undefined,
      title,
      url: normalizedUrl,
    });

    if (!listing) {
      return;
    }

    seenUrls.add(listing.url);
    listings.push(listing);
    rank += 1;
  });

  return listings;
}

export class EtsySearchScraper implements MarketplaceSearchScraper {
  provider = "etsy" as const;

  async search(keyword: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 6;
    const response = await fetch(`https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`, {
      cache: "no-store",
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to search Etsy listings (${response.status})`);
    }

    const html = await response.text();
    const mergedResults = [...extractJsonListings(html), ...extractDomListings(html)];
    const deduped: MarketplaceSearchListing[] = [];
    const seenUrls = new Set<string>();

    for (const listing of mergedResults) {
      if (seenUrls.has(listing.url)) {
        continue;
      }

      seenUrls.add(listing.url);
      deduped.push({
        ...listing,
        estimatedRank: deduped.length + 1,
      });
    }

    return deduped.slice(0, limit);
  }
}
