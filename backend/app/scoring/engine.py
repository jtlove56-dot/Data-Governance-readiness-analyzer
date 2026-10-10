"""Deterministic scoring engine.

`score_assessment` is a pure function: for a given `AssessmentRequest` and
`RuleSet`, it always returns the same score, level, and attributed factors.
The only non-deterministic input (the current time) is injected via
`assessed_at` so callers -- including tests -- can pin it.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.scoring.models import SCHEMA_VERSION, AssessmentRequest, AssessmentResponse, RiskFactor
from app.scoring.recommendations import CURRENT_MAPPING_VERSION, map_recommendations
from app.scoring.rules import RuleSet, get_ruleset


def score_assessment(
    request: AssessmentRequest,
    ruleset: RuleSet | None = None,
    assessed_at: str | None = None,
    mapping_version: str = CURRENT_MAPPING_VERSION,
) -> AssessmentResponse:
    ruleset = ruleset or get_ruleset()

    factors = [
        RiskFactor(ruleId=rule.id, category=rule.category, label=rule.label, points=rule.points)
        for rule in ruleset.rules
        if rule.applies(request)
    ]

    raw_score = sum(factor.points for factor in factors)
    score = min(ruleset.score_cap, raw_score)
    level = ruleset.thresholds.level_for(score)
    guidance = ruleset.guidance_by_level[level]

    mapped = map_recommendations([factor.ruleId for factor in factors], ruleset.version, mapping_version)

    limitations = [lim.copy for lim in ruleset.limitations if lim.applies(request)]

    return AssessmentResponse(
        schemaVersion=SCHEMA_VERSION,
        rulesVersion=ruleset.version,
        score=score,
        level=level,
        guidance=guidance,
        factors=factors,
        **mapped.model_dump(),
        recommendations=[item.text for item in mapped.generalSafeguards],
        capabilities=[item.label for item in mapped.karlsgateRecommendations],
        limitations=limitations,
        assessedAt=assessed_at or datetime.now(timezone.utc).isoformat(),
    )
