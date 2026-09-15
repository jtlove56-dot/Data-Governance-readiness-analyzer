from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator

DataType = Literal["names", "emails", "phone", "gov", "health", "financial"]
Purpose = Literal["matching", "ai", "analytics", "marketing", "research", "other"]
YesNo = Literal["yes", "no"]

PURPOSE_LABELS: dict[str, str] = {
    "matching": "Customer or record matching",
    "ai": "AI model training or development",
    "analytics": "Internal analytics",
    "marketing": "Marketing or advertising",
    "research": "Research",
    "other": "Other",
}
PURPOSE_POINTS = {"analytics": 2, "research": 4, "matching": 6, "other": 6, "marketing": 8, "ai": 10}


class AssessmentInput(BaseModel):
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
    label: str
    points: int


class AssessmentResult(BaseModel):
    score: int
    level: Literal["LOW", "MEDIUM", "HIGH"]
    guidance: str
    factors: list[RiskFactor]
    recommendations: list[str]
    capabilities: list[str]
    limitations: list[str]
    assessedAt: str


def unique(items: list[str]) -> list[str]:
    return list(dict.fromkeys(items))


def assess(payload: AssessmentInput) -> AssessmentResult:
    factors: list[RiskFactor] = []
    high_sensitivity = any(item in {"gov", "health", "financial"} for item in payload.dataTypes)
    direct_identifiers = any(item in {"names", "emails", "phone"} for item in payload.dataTypes)

    if high_sensitivity:
        factors.append(RiskFactor(label="Regulated or highly sensitive information", points=28))
    elif direct_identifiers:
        factors.append(RiskFactor(label="Direct personal identifiers", points=14))
    if payload.externalAccess == "yes":
        factors.append(RiskFactor(label="Access by another organization", points=18))
    if payload.rawExchange == "yes":
        factors.append(RiskFactor(label="Raw identifier exchange", points=18))
    if payload.dataMovement == "yes":
        factors.append(RiskFactor(label="Data leaves its controlled environment", points=12))
    if payload.combined == "yes":
        factors.append(RiskFactor(label="Re-identification potential from data combination", points=12))
    if payload.secondaryUse == "yes":
        factors.append(RiskFactor(label="Reuse beyond the stated purpose", points=12))
    factors.append(
        RiskFactor(label=f"Intended use: {PURPOSE_LABELS[payload.purpose]}", points=PURPOSE_POINTS[payload.purpose])
    )

    score = min(100, sum(factor.points for factor in factors))
    if score < 30:
        level = "LOW"
        guidance = "Standard safeguards and an accountable owner are likely sufficient."
    elif score < 60:
        level = "MEDIUM"
        guidance = "Proceed only after the listed controls and an accountable review are in place."
    else:
        level = "HIGH"
        guidance = "Pause implementation until privacy, security, and governance controls are approved."

    recommendations = [
        "Limit access to named roles and review permissions regularly.",
        "Collect and share only the fields required for the approved purpose.",
        "Set retention, deletion, and incident-response responsibilities before launch.",
        "Record the approved purpose, data owner, and control evidence in the governance register.",
    ]
    capabilities = ["Data minimization", "Governance policy execution"]

    if high_sensitivity:
        recommendations.insert(0, "De-identify sensitive records before they leave the originating system.")
        capabilities.insert(0, "De-identification")
    if payload.combined == "yes":
        recommendations.insert(0, "Measure and remediate re-identification risk before combining datasets.")
        capabilities.insert(0, "Re-identification risk remediation")
    if payload.externalAccess == "yes" and (payload.rawExchange == "yes" or payload.purpose == "matching"):
        recommendations.insert(0, "Use protected matching instead of transferring raw identifiers.")
        capabilities.insert(0, "Protected matching")
    if payload.secondaryUse == "yes":
        recommendations.append("Create a separate approval gate for any secondary use.")

    limitations = []
    if "health" in payload.dataTypes:
        limitations.append(
            "HIPAA applicability and required agreements need specialist review; this MVP does not determine compliance."
        )
    if "financial" in payload.dataTypes:
        limitations.append("PCI DSS scope depends on the exact account data involved; this MVP does not determine compliance.")

    return AssessmentResult(
        score=score,
        level=level,
        guidance=guidance,
        factors=factors,
        recommendations=unique(recommendations),
        capabilities=unique(capabilities),
        limitations=limitations,
        assessedAt=datetime.now(timezone.utc).isoformat(),
    )
