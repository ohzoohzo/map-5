from fastapi.testclient import TestClient

from backend.app.main import app


def test_weather_status_reports_feature():
    data = TestClient(app).get("/api/weather/status").json()
    assert data["feature"] == "weather"
    assert isinstance(data["ready"], bool)
