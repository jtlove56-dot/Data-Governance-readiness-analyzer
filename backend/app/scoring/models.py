"""Versioned request/response schemas for the risk-scoring service."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

SCHEMA_VERSION = "1.0"

DataType = Literal["names", "emails", "phone", "gov", "health", "financial"]
Purpose = Literal["matching", "ai", "analytics", "marketing", "research", "other"]
YesNo = Literal["yes", "no"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class AssessmentRequest(BaseModel):
    """Questionnaire responses for a single proposed data use case."""

    model_config = ConfigDict(extra="forbid")

    schemaVersion: Literal["1.0"] = SCHEMA_VERSION
    description: str = Field(min_length=20, max_length=1000)
    dataTypes: list[DataType] = Field(min_length=1)
    externalAccess: YesNo
    rawExchange: YesNo
    dataMovement: YesNo
    combined: YesNo
    secondaryUse: YesNo
    purpose: Purpose

    @field_validator("description")
    @classmethod
    def meaningful_description(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 20:
            raise ValueError("describe the data, who will use it, and why")
        return cleaned


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
