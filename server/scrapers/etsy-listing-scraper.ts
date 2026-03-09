import { load } from "cheerio";
import { ScrapedListingSnapshotSchema } from "@server/schemas/listing-intelligence";
import type { ListingScraper } from "./types";

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

function flattenJsonPayloads(payloads: unknown[]): Record<string, unknown>[] {
  const flattened: Record<string, unknown>[] = [];

  for (const payload of payloads) {
    if (Array.isArray(payload)) {
      flattened.push(...flattenJsonPayloads(payload));
      continue;
    }

    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      flattened.push(record);

      if (Array.isArray(record["@graph"])) {
        flattened.push(...flattenJsonPayloads(record["@graph"]));
      }
    }
  }

  return flattened;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractTagsFromHtml(html: string) {
  const tagMatches = Array.from(html.matchAll(/"tags"\s*:\s*\[(.*?)\]/g));
  const tags: string[] = [];

  for (const match of tagMatches) {
    const values = match[1]?.match(/"([^"]+)"/g) ?? [];
    for (const value of values) {
      tags.push(value.replaceAll("\"", ""));
    }
  }

  return uniqueStrings(tags);
}

export class EtsyListingScraper implements ListingScraper {
  provider = "etsy" as const;

  canHandle(url: URL) {
    return url.hostname.includes("etsy.com");
  }

  async scrape(url: string) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape Etsy listing (${response.status})`);
    }

    const html = await response.text();
    const $ = load(html);
    const payloads = flattenJsonPayloads(parseJsonBlocks(html));
    const productPayload = payloads.find((payload) => payload["@type"] === "Product") ?? {};
    const offerPayload = payloads.find((payload) => payload["@type"] === "Offer") ?? {};

    const title =
      (typeof productPayload.name === "string" ? productPayload.name : undefined) ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().replace(/\s*\|\s*Etsy.*$/i, "").trim();

    const description =
      (typeof productPayload.description === "string" ? productPayload.description : undefined) ||
      $('meta[name="description"]').attr("content") ||
      $("#description-text").text().trim() ||
      $('[data-id="description-text"]').text().trim();

    const tags = uniqueStrings([
      ...extractTagsFromHtml(html),
      ...($('meta[name="keywords"]').attr("content")?.split(",") ?? []),
    ]);

    const images = uniqueStrings([
      ...(Array.isArray(productPayload.image) ? productPayload.image.filter((value): value is string => typeof value === "string") : []),
      ...$('meta[property="og:image"]').map((_, element) => $(element).attr("content") || "").get(),
    ]);

    const snapshot = ScrapedListingSnapshotSchema.parse({
      currency: typeof offerPayload.priceCurrency === "string" ? offerPayload.priceCurrency : undefined,
      description,
      images,
      priceText: $('[data-buy-box-region="price"]').text().trim() || undefined,
      provider: this.provider,
      sellerName: $('[data-selector="shop-owner"]').text().trim() || undefined,
      tags,
      title,
      url,
    });

    return snapshot;
  }
}
