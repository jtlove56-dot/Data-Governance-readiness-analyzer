"""Rule-based privacy risk-scoring service.

Public surface for the rest of the app:
- `AssessmentRequest` / `AssessmentResponse` / `RiskFactor`: versioned schemas.
- `score_assessment`: the deterministic scoring engine.
- `get_ruleset` / `CURRENT_RULES_VERSION`: central rule configuration.
"""

from app.scoring.engine import score_assessment
from app.scoring.models import (
    SCHEMA_VERSION,
    AssessmentRequest,
    AssessmentResponse,
    RiskFactor,
)
from app.scoring.rules import CURRENT_RULES_VERSION, get_ruleset

__all__ = [
    "CURRENT_RULES_VERSION",
    "SCHEMA_VERSION",
    "AssessmentRequest",
    "AssessmentResponse",
    "RiskFactor",
    "get_ruleset",
    "score_assessment",
]
