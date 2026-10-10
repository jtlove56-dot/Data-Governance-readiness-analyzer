import catalog from "./mappings/v1.1.json";

export type SafeguardRecommendation = {
  id: string;
  text: string;
  factorIds: string[];
};

export type KarlsgateRecommendation = SafeguardRecommendation & {
  label: string;
  conditionId: string;
};

export type RecommendationResult = {
  mappingVersion: string;
  mappingApprovalStatus: "pending" | "approved";
  generalSafeguards: SafeguardRecommendation[];
  karlsgateRecommendations: KarlsgateRecommendation[];
};

// The generated catalog uses the exact capability wording recorded in SCRUM-6.
export const CAPABILITY_COPY: Record<string, string> = Object.fromEntries(
  catalog.karlsgate.map((entry) => [entry.label, entry.text]),
);

export function mapRecommendations(factorIds: string[], rulesVersion: string): RecommendationResult {
  if (!catalog.rulesVersions.includes(rulesVersion)) throw new Error("Unsupported scoring rules for this mapping");
  const active = [...new Set(factorIds)];
  const factorSafeguards: Record<string, string[]> = catalog.factorSafeguards;
  if (active.some((factor) => !Object.hasOwn(factorSafeguards, factor))) {
    throw new Error("Risk factor has no supported safeguard mapping");
  }

  const generalSafeguards = catalog.safeguards.flatMap((entry) => {
    const related = active.filter((factor) => factorSafeguards[factor].includes(entry.id));
    return related.length || catalog.baselineSafeguardIds.includes(entry.id)
      ? [{ id: entry.id, text: entry.text, factorIds: related }] : [];
  });
  const karlsgateRecommendations = catalog.karlsgate.flatMap((entry) => {
    const matched = entry.anyOfAllFactors.filter((clause) => clause.every((factor) => active.includes(factor)));
    if (!matched.length) return [];
    return [{
      id: entry.id,
      label: entry.label,
      text: entry.text,
      conditionId: entry.conditionId,
      factorIds: active.filter((factor) => matched.some((clause) => clause.includes(factor))),
    }];
  });
  if (catalog.approvalStatus !== "pending" && catalog.approvalStatus !== "approved") {
    throw new Error("Unknown mapping approval status");
  }
  return {
    mappingVersion: catalog.version,
    mappingApprovalStatus: catalog.approvalStatus,
    generalSafeguards,
    karlsgateRecommendations,
  };
}

export function recommendationReason(
  item: SafeguardRecommendation,
  factors: { ruleId: string; label: string }[],
): string {
  const labels = factors.filter((factor) => item.factorIds.includes(factor.ruleId)).map((factor) => factor.label);
  return labels.length ? `Relevant to: ${labels.join("; ")}.` : "Baseline control for every assessment.";
}
