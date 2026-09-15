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


def test_assessment_returns_transparent_score():
    response = client.post("/assessments", json=sample_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 38
    assert body["level"] == "MEDIUM"
    assert "Protected matching" in body["capabilities"]


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


def test_invalid_input_has_clear_api_validation():
    response = client.post("/assessments", json=sample_payload(description="Too short", dataTypes=[]))
    assert response.status_code == 422

