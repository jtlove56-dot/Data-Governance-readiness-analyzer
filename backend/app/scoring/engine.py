"""Deterministic scoring engine.

`score_assessment` is a pure function: for a given `AssessmentRequest` and
`RuleSet`, it always returns the same score, level, and attributed factors.
The only non-deterministic input (the current time) is injected via
`assessed_at` so callers -- including tests -- can pin it.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.scoring.models import SCHEMA_VERSION, AssessmentRequest, AssessmentResponse, RiskFactor
from app.scoring.rules import RuleSet, get_ruleset


def _unique(items):
    return list(dict.fromkeys(items))


def score_assessment(
    request: AssessmentRequest,
    ruleset: RuleSet | None = None,
    assessed_at: str | None = None,
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

    applicable_capabilities = [cap for cap in ruleset.capabilities if cap.applies(request)]
    capabilities = _unique(cap.label for cap in applicable_capabilities)

    recommendations = [cap.recommendation for cap in applicable_capabilities if cap.recommendation]
    recommendations.extend(ruleset.base_recommendations)
    recommendations.extend(
        extra.copy for extra in ruleset.extra_recommendations if extra.applies(request)
    )

    limitations = [lim.copy for lim in ruleset.limitations if lim.applies(request)]

    return AssessmentResponse(
        schemaVersion=SCHEMA_VERSION,
        rulesVersion=ruleset.version,
        score=score,
        level=level,
        guidance=guidance,
        factors=factors,
        recommendations=_unique(recommendations),
        capabilities=capabilities,
        limitations=limitations,
        assessedAt=assessed_at or datetime.now(timezone.utc).isoformat(),
    )
