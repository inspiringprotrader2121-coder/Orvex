import { UnsupportedProviderError } from "@server/utils/errors";
import { EtsyListingScraper } from "./etsy-listing-scraper";
import { EtsySearchScraper } from "./etsy-search-scraper";
import type { ListingScraper, MarketplaceProvider, MarketplaceSearchScraper } from "./types";

const scrapers: ListingScraper[] = [new EtsyListingScraper()];
const searchScrapers: MarketplaceSearchScraper[] = [new EtsySearchScraper()];

function validateListingUrl(url: string) {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new UnsupportedProviderError("Only https listing URLs are supported");
  }

  if (parsed.username || parsed.password) {
    throw new UnsupportedProviderError("Listing URLs cannot include credentials");
  }

  if (parsed.port && parsed.port !== "443") {
    throw new UnsupportedProviderError("Listing URLs must use the default https port");
  }

  return parsed;
}

export function assertScrapableListingUrl(url: string) {
  const parsed = validateListingUrl(url);
  const scraper = scrapers.find((candidate) => candidate.canHandle(parsed));

  if (!scraper) {
    throw new UnsupportedProviderError(`No scraper configured for ${parsed.hostname}`);
  }

  return parsed.toString();
}

export async function scrapeListingByUrl(url: string) {
  const normalizedUrl = assertScrapableListingUrl(url);
  const parsed = new URL(normalizedUrl);
  const scraper = scrapers.find((candidate) => candidate.canHandle(parsed));

  if (!scraper) {
    throw new UnsupportedProviderError(`No scraper configured for ${parsed.hostname}`);
  }

  return scraper.scrape(normalizedUrl);
}

export async function searchMarketplaceListings(
  provider: MarketplaceProvider,
  keyword: string,
  options?: { limit?: number },
) {
  const scraper = searchScrapers.find((candidate) => candidate.provider === provider);

  if (!scraper) {
    throw new UnsupportedProviderError(`No search scraper configured for ${provider}`);
  }

  return scraper.search(keyword, options);
}
