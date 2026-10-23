from fastapi.testclient import TestClient

from backend.app.main import app


def test_docent_status_reports_feature():
    data = TestClient(app).get("/api/docent/status").json()
    assert data["feature"] == "docent"
    assert isinstance(data["ready"], bool)
