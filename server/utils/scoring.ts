export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateListingScore(scores: {
  ctaStrength: number;
  conversionScore: number;
  emotionalHookScore: number;
  keywordCoverage: number;
  seoScore: number;
}) {
  return clampScore(
    (scores.seoScore * 0.25) +
    (scores.conversionScore * 0.25) +
    (scores.keywordCoverage * 0.2) +
    (scores.emotionalHookScore * 0.15) +
    (scores.ctaStrength * 0.15),
  );
}

export function calculateOpportunityScore({
  competition,
  demand,
  trend,
}: {
  competition: number;
  demand: number;
  trend: number;
}) {
  const inverseCompetition = 100 - competition;
  return clampScore((demand * 0.5) + (inverseCompetition * 0.3) + (trend * 0.2));
}
