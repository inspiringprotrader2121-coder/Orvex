import { UnsupportedProviderError } from "@server/utils/errors";
import { EtsyListingScraper } from "./etsy-listing-scraper";
import type { ListingScraper } from "./types";

const scrapers: ListingScraper[] = [new EtsyListingScraper()];

export async function scrapeListingByUrl(url: string) {
  const parsed = new URL(url);
  const scraper = scrapers.find((candidate) => candidate.canHandle(parsed));

  if (!scraper) {
    throw new UnsupportedProviderError(`No scraper configured for ${parsed.hostname}`);
  }

  return scraper.scrape(url);
}
