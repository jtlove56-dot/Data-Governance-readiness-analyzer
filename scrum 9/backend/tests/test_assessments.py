import json
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.assessment import AssessmentRequest
from app.main import app

client = TestClient(app)
EXAMPLE = json.loads(
    (Path(__file__).resolve().parents[2] / "shared" / "assessment-example.json")
    .read_text(encoding="utf-8")
)


def test_shared_frontend_submission_matches_backend_schema() -> None:
    assert AssessmentRequest.model_validate(EXAMPLE).model_dump() == EXAMPLE
    response = client.post("/assessments", json=EXAMPLE)
    assert response.status_code == 200
    receipt = response.json()
    assert UUID(receipt["submission_id"])
    assert receipt["status"] == "validated"
    assert receipt["stored"] is False
    assert receipt["scored"] is False


@pytest.mark.parametrize(
    "field",
    [name for name, field in AssessmentRequest.model_fields.items()
     if field.is_required()],
)
def test_missing_required_answer_is_rejected(field: str) -> None:
    payload = {key: value for key, value in EXAMPLE.items() if key != field}
    assert client.post("/assessments", json=payload).status_code == 422


@pytest.mark.parametrize("field", [
    "other_data_types", "people", "organizations", "external_access_details",
    "data_movement", "purpose", "expected_output", "secondary_use_details",
    "reidentification_details",
])
def test_blank_or_oversized_answers_are_rejected(field: str) -> None:
    for invalid in [" \n ", "x" * 2001]:
        assert client.post(
            "/assessments", json={**EXAMPLE, field: invalid}
        ).status_code == 422


@pytest.mark.parametrize("invalid_types", [[], ["unrecognized"], ["names", "names"]])
def test_invalid_data_types_are_rejected(invalid_types: list[str]) -> None:
    assert client.post(
        "/assessments", json={**EXAMPLE, "data_types": invalid_types}
    ).status_code == 422


@pytest.mark.parametrize("field", [
    "external_access", "identifiable_exchange", "secondary_use", "reidentification",
])
def test_explicit_uncertainty_is_accepted_but_invalid_choices_are_not(
    field: str,
) -> None:
    assert client.post(
        "/assessments", json={**EXAMPLE, field: "unsure"}
    ).status_code == 200
    for invalid in ["", True, "maybe"]:
        assert client.post(
            "/assessments", json={**EXAMPLE, field: invalid}
        ).status_code == 422


def test_conditional_details_are_not_required_for_no_or_unsure() -> None:
    payload = {
        **EXAMPLE, "data_types": ["unknown"], "other_data_types": "",
        "external_access": "no", "external_access_details": "",
        "secondary_use": "unsure", "secondary_use_details": "",
        "reidentification": "no", "reidentification_details": "",
    }
    assert client.post("/assessments", json=payload).status_code == 200


def test_unknown_fields_and_schema_versions_are_rejected() -> None:
    for extra in [{"schema_version": "2.0"}, {"risk_score": 0}]:
        assert client.post(
            "/assessments", json={**EXAMPLE, **extra}
        ).status_code == 422


def test_frontend_can_post_with_cors() -> None:
    response = client.options("/assessments", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "POST" in response.headers["access-control-allow-methods"]
