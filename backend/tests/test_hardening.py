import pytest
from fastapi.testclient import TestClient
from helpers import sample_payload

from app.auth import require_session
from app.config import Settings
from app.main import create_app

PROJECT = "https://example.supabase.co"
DOC_PATHS = ["/docs", "/redoc", "/openapi.json"]


@pytest.mark.parametrize("environment", ["staging", "production", "", "Development-ish"])
@pytest.mark.parametrize("path", DOC_PATHS)
def test_api_docs_are_hidden_outside_local_development(environment, path):
    client = TestClient(create_app(Settings(supabase_url=PROJECT, environment=environment)))
    assert client.get(path).status_code == 404


@pytest.mark.parametrize("environment", ["local", "development", "Development"])
@pytest.mark.parametrize("path", DOC_PATHS)
def test_api_docs_are_served_in_local_development(environment, path):
    client = TestClient(create_app(Settings(supabase_url=PROJECT, environment=environment)))
    assert client.get(path).status_code == 200


def test_hosted_defaults_apply_when_app_env_is_unset(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    assert not Settings.from_env().docs_enabled


def test_assessment_rate_limit_reads_environment(monkeypatch):
    monkeypatch.setenv("ASSESSMENT_RATE_PER_USER", "7")
    assert Settings.from_env().assessment_rate_per_user == 7


def signed_in_client(per_user):
    app = create_app(Settings(supabase_url=PROJECT, assessment_rate_per_user=per_user))
    user = {"sub": "first-user"}
    app.dependency_overrides[require_session] = lambda: user
    return TestClient(app), user


def test_each_account_is_limited_on_scoring():
    client, user = signed_in_client(per_user=2)
    statuses = [client.post("/assessments", json=sample_payload()).status_code for _ in range(3)]
    assert statuses == [200, 200, 429]

    limited = client.post("/assessments", json=sample_payload())
    assert limited.json()["error"] == "rate_limited"
    assert "Too many requests" in limited.json()["message"]
    assert limited.headers["retry-after"] == "60"
    assert limited.headers["cache-control"] == "no-store"

    user["sub"] = "second-user"
    assert client.post("/assessments", json=sample_payload()).status_code == 200


def test_demo_rate_limit_sends_retry_after():
    client = TestClient(create_app(Settings(supabase_url=PROJECT, demo_rate_per_client=1)))
    assert client.post("/demo/assessments", json=sample_payload()).status_code == 200
    limited = client.post("/demo/assessments", json=sample_payload())
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == "60"


def test_unauthenticated_scoring_is_rejected_before_counting():
    client = TestClient(create_app(Settings(supabase_url=PROJECT, assessment_rate_per_user=1)))
    statuses = {client.post("/assessments", json=sample_payload()).status_code for _ in range(3)}
    assert statuses == {401}
