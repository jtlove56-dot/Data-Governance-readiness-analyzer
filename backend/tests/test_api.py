from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def sample_payload(**overrides):
    payload = {
        "description": "Match customer email addresses with a partner for campaign measurement.",
        "dataTypes": ["emails"],
        "externalAccess": "yes",
        "rawExchange": "no",
        "dataMovement": "no",
        "combined": "no",
        "secondaryUse": "no",
        "purpose": "matching",
    }
    payload.update(overrides)
    return payload


def test_health_and_version():
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/version").json()["version"] == "0.1.0"


def test_assessment_returns_transparent_score_with_attribution():
    response = client.post("/assessments", json=sample_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 38
    assert body["level"] == "MEDIUM"
    assert body["schemaVersion"] == "1.0"
    assert body["rulesVersion"] == "1.0"
    assert "Protected matching" in body["capabilities"]
    assert {factor["ruleId"] for factor in body["factors"]} == {
        "DATA_SENSITIVITY_DIRECT",
        "EXTERNAL_ACCESS",
        "PURPOSE_MATCHING",
    }


def test_high_risk_regulated_use_includes_limitations():
    response = client.post(
        "/assessments",
        json=sample_payload(
            dataTypes=["health", "financial"],
            rawExchange="yes",
            dataMovement="yes",
            combined="yes",
            secondaryUse="yes",
            purpose="ai",
        ),
    )
    body = response.json()
    assert body["score"] == 100
    assert body["level"] == "HIGH"
    assert len(body["limitations"]) == 2


def test_invalid_input_returns_clear_client_error_without_echoing_input():
    response = client.post("/assessments", json=sample_payload(description="Too short", dataTypes=[]))
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "invalid_input"
    assert "requestId" in body
    assert "description" in body["fields"]
    assert "dataTypes" in body["fields"]
    # The invalid free-text value must never be echoed back to the client.
    assert "Too short" not in response.text


def test_unsupported_purpose_is_rejected():
    response = client.post("/assessments", json=sample_payload(purpose="unsupported-value"))
    assert response.status_code == 422


def test_unsupported_extra_field_is_rejected():
    response = client.post("/assessments", json=sample_payload(unexpectedField="value"))
    assert response.status_code == 422
