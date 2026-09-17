"""Central, versioned scoring configuration.

Every weight, threshold, and applicability rule here is derived from the
approved rubric in ``docs/risk-scoring-rubric-v1.0.md``. To add or change a
rule (e.g. for a new rubric version), define a new ``RuleSet`` below and
register it in ``RULESETS`` -- the engine never needs to change.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.scoring.models import AssessmentRequest

HIGH_SENSITIVITY_TYPES = {"gov", "health", "financial"}
DIRECT_IDENTIFIER_TYPES = {"names", "emails", "phone"}

Predicate = Callable[[AssessmentRequest], bool]


@dataclass(frozen=True)
class Rule:
    """A single scoring rule: if `applies` is true, `points` are added."""

    id: str
    category: str
    label: str
    points: int
    applies: Predicate


@dataclass(frozen=True)
class Capability:
    """A recommended control, with an optional prose recommendation."""

    id: str
    label: str
    applies: Predicate
    recommendation: str | None = None


@dataclass(frozen=True)
class Limitation:
    """A caveat surfaced when a regulated data category is involved."""

    id: str
    copy: str
    applies: Predicate


@dataclass(frozen=True)
class ExtraRecommendation:
    """A conditional recommendation with no associated capability."""

    id: str
    copy: str
    applies: Predicate


@dataclass(frozen=True)
class RiskThresholds:
    low_max: int
    medium_max: int

    def level_for(self, score: int) -> str:
        if score <= self.low_max:
            return "LOW"
        if score <= self.medium_max:
            return "MEDIUM"
        return "HIGH"


@dataclass(frozen=True)
class RuleSet:
    version: str
    score_cap: int
    thresholds: RiskThresholds
    guidance_by_level: dict
    rules: tuple
    capabilities: tuple
    limitations: tuple
    base_recommendations: tuple
    extra_recommendations: tuple = ()


def _has_high_sensitivity(payload: AssessmentRequest) -> bool:
    return any(item in HIGH_SENSITIVITY_TYPES for item in payload.dataTypes)


def _has_direct_identifiers_only(payload: AssessmentRequest) -> bool:
    return not _has_high_sensitivity(payload) and any(
        item in DIRECT_IDENTIFIER_TYPES for item in payload.dataTypes
    )


def _uses_protected_matching(payload: AssessmentRequest) -> bool:
    return payload.externalAccess == "yes" and (payload.rawExchange == "yes" or payload.purpose == "matching")


RULESET_V1_0 = RuleSet(
    version="1.0",
    score_cap=100,
    thresholds=RiskThresholds(low_max=29, medium_max=59),
    guidance_by_level={
        "LOW": "Standard safeguards and an accountable owner are likely sufficient.",
        "MEDIUM": "Proceed only after the listed controls and an accountable review are in place.",
        "HIGH": "Pause implementation until privacy, security, and governance controls are approved.",
    },
    # Order matters only for readability; every applicable rule is reported.
    rules=(
        Rule("DATA_SENSITIVITY_HIGH", "data_sensitivity", "Regulated or highly sensitive information", 28, _has_high_sensitivity),
        Rule("DATA_SENSITIVITY_DIRECT", "data_sensitivity", "Direct personal identifiers", 14, _has_direct_identifiers_only),
        Rule("EXTERNAL_ACCESS", "access", "Access by another organization", 18, lambda p: p.externalAccess == "yes"),
        Rule("RAW_EXCHANGE", "access", "Raw identifier exchange", 18, lambda p: p.rawExchange == "yes"),
        Rule("DATA_MOVEMENT", "movement", "Data leaves its controlled environment", 12, lambda p: p.dataMovement == "yes"),
        Rule("COMBINED_REIDENTIFICATION", "reidentification", "Re-identification potential from data combination", 12, lambda p: p.combined == "yes"),
        Rule("SECONDARY_USE", "purpose", "Reuse beyond the stated purpose", 12, lambda p: p.secondaryUse == "yes"),
        Rule("PURPOSE_ANALYTICS", "purpose", "Intended use: Internal analytics", 2, lambda p: p.purpose == "analytics"),
        Rule("PURPOSE_RESEARCH", "purpose", "Intended use: Research", 4, lambda p: p.purpose == "research"),
        Rule("PURPOSE_MATCHING", "purpose", "Intended use: Customer or record matching", 6, lambda p: p.purpose == "matching"),
        Rule("PURPOSE_OTHER", "purpose", "Intended use: Other", 6, lambda p: p.purpose == "other"),
        Rule("PURPOSE_MARKETING", "purpose", "Intended use: Marketing or advertising", 8, lambda p: p.purpose == "marketing"),
        Rule("PURPOSE_AI", "purpose", "Intended use: AI model training or development", 10, lambda p: p.purpose == "ai"),
    ),
    # Order here is the display/priority order: protected matching, then
    # re-identification remediation, then de-identification, then the two
    # controls that always apply.
    capabilities=(
        Capability(
            "PROTECTED_MATCHING",
            "Protected matching",
            _uses_protected_matching,
            recommendation="Use protected matching instead of transferring raw identifiers.",
        ),
        Capability(
            "REID_REMEDIATION",
            "Re-identification risk remediation",
            lambda p: p.combined == "yes",
            recommendation="Measure and remediate re-identification risk before combining datasets.",
        ),
        Capability(
            "DEIDENTIFICATION",
            "De-identification",
            _has_high_sensitivity,
            recommendation="De-identify sensitive records before they leave the originating system.",
        ),
        Capability("DATA_MINIMIZATION", "Data minimization", lambda p: True),
        Capability("GOVERNANCE_EXECUTION", "Governance policy execution", lambda p: True),
    ),
    limitations=(
        Limitation(
            "HIPAA_REVIEW",
            "HIPAA applicability and required agreements need specialist review; this MVP does not determine compliance.",
            lambda p: "health" in p.dataTypes,
        ),
        Limitation(
            "PCI_REVIEW",
            "PCI DSS scope depends on the exact account data involved; this MVP does not determine compliance.",
            lambda p: "financial" in p.dataTypes,
        ),
    ),
    base_recommendations=(
        "Limit access to named roles and review permissions regularly.",
        "Collect and share only the fields required for the approved purpose.",
        "Set retention, deletion, and incident-response responsibilities before launch.",
        "Record the approved purpose, data owner, and control evidence in the governance register.",
    ),
    extra_recommendations=(
        ExtraRecommendation(
            "SECONDARY_USE_GATE",
            "Create a separate approval gate for any secondary use.",
            lambda p: p.secondaryUse == "yes",
        ),
    ),
)

RULESETS = {RULESET_V1_0.version: RULESET_V1_0}
CURRENT_RULES_VERSION = RULESET_V1_0.version


def get_ruleset(version: str | None = None) -> RuleSet:
    """Look up a ruleset by version, defaulting to the current one.

    Raises ValueError for an unsupported/unknown rules version so the API
    layer can turn it into a clear client error rather than a misleading
    score computed under the wrong rubric.
    """
    resolved = version or CURRENT_RULES_VERSION
    try:
        return RULESETS[resolved]
    except KeyError as exc:
        raise ValueError(f"Unsupported rules version: {resolved!r}") from exc
