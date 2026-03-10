import { auth } from "@/auth";
import { SeoKeywordService } from "@server/services/seo-keyword-service";
import { SeoKeywordsPanel } from "@/components/optimize/seo-keywords-panel";

export default async function SeoKeywordPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const suggestions = await SeoKeywordService.listForUser(userId, 10);

  const normalized = suggestions.map((item) => ({
    autoApplied: item.autoApplied,
    cacheHit: item.cacheHit,
    createdAt: item.createdAt.toISOString(),
    id: item.id,
    keywords: item.keywords as Array<{ keyword: string; trendScore: number; competitionScore: number }>,
    optimizedDescription: item.optimizedDescription,
    optimizedMetaDescription: item.optimizedMetaDescription,
    optimizedTitle: item.optimizedTitle,
    tags: item.tags,
  }));

  return <SeoKeywordsPanel initialSuggestions={normalized} />;
}
