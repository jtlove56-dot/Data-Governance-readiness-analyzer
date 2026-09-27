"""Versioned request/response schemas for the risk-scoring service."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION = "1.0"

DataType = Literal["names", "emails", "phone", "gov", "health", "financial"]
Purpose = Literal["matching", "ai", "analytics", "marketing", "research", "other"]
YesNo = Literal["yes", "no"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class AssessmentRequest(BaseModel):
    """Questionnaire responses for a single proposed data use case."""

    model_config = ConfigDict(extra="forbid")

    schemaVersion: Literal["1.0"] = SCHEMA_VERSION
    # Not used by the rubric. The frontend no longer sends it (SCRUM-16);
    # accepted only so older clients keep working, then discarded.
    description: Optional[str] = Field(default=None, max_length=1000, exclude=True)
    dataTypes: list[DataType] = Field(min_length=1)
    externalAccess: YesNo
    rawExchange: YesNo
    dataMovement: YesNo
    combined: YesNo
    secondaryUse: YesNo
    purpose: Purpose


class RiskFactor(BaseModel):
    """A single rule that fired and contributed to the score."""

    ruleId: str
    category: str
    label: str
    points: int


class AssessmentResponse(BaseModel):
    """Deterministic scoring output with full attribution."""

    schemaVersion: str
    rulesVersion: str
    score: int = Field(ge=0, le=100)
    level: RiskLevel
    guidance: str
    factors: list[RiskFactor]
    recommendations: list[str]
    capabilities: list[str]
    limitations: list[str]
    assessedAt: str
