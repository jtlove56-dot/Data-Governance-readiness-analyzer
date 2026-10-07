import pytest
from pydantic import ValidationError

from app.scoring import AssessmentRequest, score_assessment
from app.scoring.rules import RULESET_V1_0, RiskThresholds


def sample_payload(**overrides):
    payload = {
        "dataTypes": ["emails"],
        "externalAccess": "yes",
        "rawExchange": "no",
        "dataMovement": "no",
        "combined": "no",
        "secondaryUse": "no",
        "purpose": "matching",
    }
    payload.update(overrides)
    return AssessmentRequest(**payload)


# --- Threshold boundaries (pure function, exhaustive over the mapping) -----


@pytest.mark.parametrize(
    "score,expected_level",
    [(0, "LOW"), (29, "LOW"), (30, "MEDIUM"), (59, "MEDIUM"), (60, "HIGH"), (100, "HIGH")],
)
def test_threshold_boundaries(score, expected_level):
    assert RiskThresholds(low_max=29, medium_max=59).level_for(score) == expected_level


# --- Representative Low / Medium / High cases ------------------------------


def test_low_risk_internal_analytics_with_only_email_addresses():
    request = sample_payload(
        dataTypes=["emails"],
        externalAccess="no",
        rawExchange="no",
        dataMovement="no",
        combined="no",
        secondaryUse="no",
        purpose="analytics",
    )
    result = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    assert result.score == 16  # direct identifiers (14) + analytics (2)
    assert result.level == "LOW"
    assert {f.ruleId for f in result.factors} == {"DATA_SENSITIVITY_DIRECT", "PURPOSE_ANALYTICS"}


def test_medium_risk_partner_matching_use_case():
    request = sample_payload()
    result = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    assert result.score == 38
    assert result.level == "MEDIUM"
    assert "Protected matching" in result.capabilities


def test_high_risk_regulated_data_caps_at_100():
    request = sample_payload(
        dataTypes=["health", "financial"],
        rawExchange="yes",
        dataMovement="yes",
        combined="yes",
        secondaryUse="yes",
        purpose="ai",
    )
    result = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    assert result.score == 100
    assert result.level == "HIGH"
    assert len(result.limitations) == 2


def test_high_risk_boundary_exactly_at_threshold():
    # 28 (regulated data) + 2 (analytics) + 18 (external access) + 12 (data movement) = 60
    request = sample_payload(
        dataTypes=["gov"],
        externalAccess="yes",
        rawExchange="no",
        dataMovement="yes",
        combined="no",
        secondaryUse="no",
        purpose="analytics",
    )
    result = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    assert result.score == 60
    assert result.level == "HIGH"


# --- Attribution -------------------------------------------------------------


def test_data_sensitivity_rules_are_mutually_exclusive():
    request = sample_payload(dataTypes=["names", "health"])
    result = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    rule_ids = {f.ruleId for f in result.factors}
    assert "DATA_SENSITIVITY_HIGH" in rule_ids
    assert "DATA_SENSITIVITY_DIRECT" not in rule_ids


def test_every_factor_carries_a_stable_rule_id_and_points_sum_to_score():
    request = sample_payload()
    result = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    assert all(factor.ruleId for factor in result.factors)
    assert sum(factor.points for factor in result.factors) == result.score


@pytest.mark.parametrize(
    "expected_rule_id,overrides",
    [
        ("DATA_SENSITIVITY_HIGH", {"dataTypes": ["health"], "externalAccess": "no", "purpose": "analytics"}),
        ("DATA_SENSITIVITY_DIRECT", {"dataTypes": ["emails"], "externalAccess": "no", "purpose": "analytics"}),
        ("EXTERNAL_ACCESS", {"externalAccess": "yes", "purpose": "analytics"}),
        ("RAW_EXCHANGE", {"externalAccess": "no", "rawExchange": "yes", "purpose": "analytics"}),
        ("DATA_MOVEMENT", {"externalAccess": "no", "dataMovement": "yes", "purpose": "analytics"}),
        ("COMBINED_REIDENTIFICATION", {"externalAccess": "no", "combined": "yes", "purpose": "analytics"}),
        ("SECONDARY_USE", {"externalAccess": "no", "secondaryUse": "yes", "purpose": "analytics"}),
        ("PURPOSE_ANALYTICS", {"externalAccess": "no", "purpose": "analytics"}),
        ("PURPOSE_RESEARCH", {"externalAccess": "no", "purpose": "research"}),
        ("PURPOSE_MATCHING", {"externalAccess": "no", "purpose": "matching"}),
        ("PURPOSE_OTHER", {"externalAccess": "no", "purpose": "other"}),
        ("PURPOSE_MARKETING", {"externalAccess": "no", "purpose": "marketing"}),
        ("PURPOSE_AI", {"externalAccess": "no", "purpose": "ai"}),
    ],
)
def test_every_supported_factor_is_exercised_and_maps_to_a_safeguard(expected_rule_id, overrides):
    result = score_assessment(sample_payload(**overrides), assessed_at="2026-01-01T00:00:00+00:00")

    assert expected_rule_id in {factor.ruleId for factor in result.factors}
    assert any(expected_rule_id in detail.riskFactorIds for detail in result.recommendationDetails)


def test_recommendations_are_prioritized_explained_and_traceable():
    result = score_assessment(
        sample_payload(
            dataTypes=["health"],
            rawExchange="yes",
            dataMovement="yes",
            combined="yes",
            secondaryUse="yes",
            purpose="ai",
        ),
        assessed_at="2026-01-01T00:00:00+00:00",
    )

    assert [detail.priority for detail in result.recommendationDetails] == list(
        range(1, len(result.recommendationDetails) + 1)
    )
    assert all(detail.rationale and detail.riskFactorIds for detail in result.recommendationDetails)
    assert {detail.id for detail in result.recommendationDetails} >= {
        "PROTECTED_MATCHING",
        "REIDENTIFICATION_REVIEW",
        "DEIDENTIFY_SENSITIVE_DATA",
        "SECONDARY_USE_GATE",
    }


def test_privacy_enhancing_capabilities_are_conditional_while_general_safeguards_remain():
    low_result = score_assessment(
        sample_payload(
            externalAccess="no",
            rawExchange="no",
            dataMovement="no",
            combined="no",
            secondaryUse="no",
            purpose="analytics",
        ),
        assessed_at="2026-01-01T00:00:00+00:00",
    )

    assert low_result.capabilities == ["Data minimization", "Governance policy execution"]
    assert {detail.id for detail in low_result.recommendationDetails} == {
        "ROLE_BASED_ACCESS",
        "FIELD_MINIMIZATION",
        "RETENTION_AND_RESPONSE",
        "GOVERNANCE_RECORD",
    }


# --- Reproducibility ----------------------------------------------------------


def test_identical_input_produces_identical_output_for_same_rules_version():
    request = sample_payload()
    first = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    second = score_assessment(request, assessed_at="2026-01-01T00:00:00+00:00")
    assert first == second


def test_response_reports_current_rules_version():
    result = score_assessment(sample_payload(), assessed_at="2026-01-01T00:00:00+00:00")
    assert result.rulesVersion == RULESET_V1_0.version
    assert result.schemaVersion == "2.0"


# --- Input validation ----------------------------------------------------------


def test_rejects_empty_data_types():
    with pytest.raises(ValidationError):
        AssessmentRequest(
            dataTypes=[],
            externalAccess="no",
            rawExchange="no",
            dataMovement="no",
            combined="no",
            secondaryUse="no",
            purpose="analytics",
        )


def test_rejects_duplicate_data_types():
    with pytest.raises(ValidationError):
        sample_payload(dataTypes=["emails", "emails"])


def test_rejects_unknown_purpose():
    with pytest.raises(ValidationError):
        sample_payload(purpose="not-a-real-purpose")


def test_rejects_unsupported_extra_fields():
    with pytest.raises(ValidationError):
        sample_payload(unexpectedField="value")
