from fastapi.testclient import TestClient

from backend.app.main import app


def test_taste_status_reports_feature():
    data = TestClient(app).get("/api/taste/status").json()
    assert data["feature"] == "taste"
