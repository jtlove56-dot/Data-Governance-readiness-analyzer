from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "karlsgate-api",
        "status": "ok",
        "environment": "local",
        "version": "0.1.0",
    }


def test_version_endpoint() -> None:
    response = client.get("/version")

    assert response.status_code == 200
    assert response.json() == {
        "service": "karlsgate-api",
        "version": "0.1.0",
    }
