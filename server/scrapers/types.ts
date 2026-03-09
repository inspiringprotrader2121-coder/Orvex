import type { z } from "zod";
import type { ProviderSchema } from "@server/schemas/common";
import type { ScrapedListingSnapshotSchema } from "@server/schemas/listing-intelligence";

export type MarketplaceProvider = z.infer<typeof ProviderSchema>;
export type ScrapedListingSnapshot = z.infer<typeof ScrapedListingSnapshotSchema>;

export interface ListingScraper {
  provider: MarketplaceProvider;
  canHandle(url: URL): boolean;
  scrape(url: string): Promise<ScrapedListingSnapshot>;
}
