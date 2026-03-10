import type { z } from "zod";
import type { ProviderSchema } from "@server/schemas/common";
import type { ScrapedListingSnapshotSchema } from "@server/schemas/listing-intelligence";
import type { CompetitorMarketListingSchema } from "@server/schemas/competitor-analysis";

export type MarketplaceProvider = z.infer<typeof ProviderSchema>;
export type ScrapedListingSnapshot = z.infer<typeof ScrapedListingSnapshotSchema>;
export type MarketplaceSearchListing = z.infer<typeof CompetitorMarketListingSchema>;

export interface ListingScraper {
  provider: MarketplaceProvider;
  canHandle(url: URL): boolean;
  scrape(url: string): Promise<ScrapedListingSnapshot>;
}

export interface MarketplaceSearchScraper {
  provider: MarketplaceProvider;
  search(keyword: string, options?: { limit?: number }): Promise<MarketplaceSearchListing[]>;
}
