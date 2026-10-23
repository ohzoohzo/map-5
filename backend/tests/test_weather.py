import csv
from datetime import datetime
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.routers.weather import service
from backend.app.services.catalog import CLEAN_COLUMNS
from backend.app.settings import Settings, get_settings

KEY = "w" * 32
BUSAN = {"latitude": 35.1587, "longitude": 129.1604}


def owm_item(kst: str, pop: float, temp: float = 18.0, description: str = "실 비") -> dict:
    return {
        "dt": int(datetime.fromisoformat(kst).timestamp()),
        "main": {"temp": temp},
        "weather": [{"description": description}],
        "pop": pop,
    }


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(service, "env", lambda name: KEY)
    return TestClient(app)


def test_weather_status_reports_feature():
    data = TestClient(app).get("/api/weather/status").json()
    assert data["feature"] == "weather"
    assert isinstance(data["ready"], bool)


def test_forecast_keeps_only_the_requested_kst_day(client, monkeypatch):
    upstream = Mock(return_value=httpx.Response(200, json={"list": [
        owm_item("2026-10-24T21:00+09:00", 0.1),
        owm_item("2026-10-25T00:00+09:00", 0.2, description="맑음"),  # UTC 로는 24일이지만 KST 25일
        owm_item("2026-10-25T15:00+09:00", 0.7, temp=17.46),
        owm_item("2026-10-26T00:00+09:00", 0.9),
    ]}))
    monkeypatch.setattr(service.httpx, "get", upstream)

    data = client.get("/api/weather/forecast", params={**BUSAN, "date": "2026-10-25"}).json()

    assert data["status"] == "ok"
    assert [slot["time"] for slot in data["slots"]] == ["2026-10-25T00:00+09:00", "2026-10-25T15:00+09:00"]
    assert data["slots"][1] == {
        "time": "2026-10-25T15:00+09:00", "temperature": 17.5, "rain_probability": 70,
        "condition": "실 비", "rain_expected": True,
    }
    assert data["slots"][0]["rain_expected"] is False
    assert upstream.call_args.kwargs["params"]["appid"] == KEY


def test_date_outside_forecast_range_is_not_guessed(client, monkeypatch):
    monkeypatch.setattr(service.httpx, "get", Mock(return_value=httpx.Response(200, json={"list": [owm_item("2026-10-24T12:00+09:00", 0.9)]})))

    data = client.get("/api/weather/forecast", params={**BUSAN, "date": "2026-11-30"}).json()

    assert data["status"] == "out_of_range"
    assert data["slots"] == []


def test_missing_key_is_reported_without_calling_upstream(monkeypatch):
    monkeypatch.setattr(service, "env", lambda name: "")
    upstream = Mock()
    monkeypatch.setattr(service.httpx, "get", upstream)

    response = TestClient(app).get("/api/weather/forecast", params={**BUSAN, "date": "2026-10-25"})

    assert response.status_code == 503
    upstream.assert_not_called()


@pytest.mark.parametrize("upstream_status,expected", [(401, 503), (429, 429), (500, 502)])
def test_upstream_errors_never_echo_key(client, monkeypatch, upstream_status, expected):
    monkeypatch.setattr(service.httpx, "get", Mock(return_value=httpx.Response(upstream_status, text="secret " + KEY)))

    response = client.get("/api/weather/forecast", params={**BUSAN, "date": "2026-10-25"})

    assert response.status_code == expected
    assert KEY not in response.text


@pytest.mark.parametrize("error,expected", [(httpx.ReadTimeout("secret " + KEY), 504), (httpx.ConnectError("secret " + KEY), 503)])
def test_network_errors_are_sanitized(client, monkeypatch, error, expected):
    monkeypatch.setattr(service.httpx, "get", Mock(side_effect=error))

    response = client.get("/api/weather/forecast", params={**BUSAN, "date": "2026-10-25"})

    assert response.status_code == expected
    assert KEY not in response.text


@pytest.mark.parametrize("payload", [{"list": [{"dt": 1}]}, {"list": [owm_item("2026-10-25T12:00+09:00", 1.5)]}, ["not", "a", "dict"]])
def test_invalid_upstream_schema_is_rejected(client, monkeypatch, payload):
    monkeypatch.setattr(service.httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))

    assert client.get("/api/weather/forecast", params={**BUSAN, "date": "2026-10-25"}).status_code == 502


@pytest.mark.parametrize("params", [{"latitude": 50, "longitude": 129, "date": "2026-10-25"}, {**BUSAN, "date": "10/25"}])
def test_invalid_query_is_rejected(client, params):
    assert client.get("/api/weather/forecast", params=params).status_code == 422


def catalog_row(place_id: str, name: str, latitude: float, longitude: float) -> dict:
    return {
        "id": place_id, "name": name, "address": "부산광역시", "latitude": latitude, "longitude": longitude,
        "category": "관광지", "description": "", "phone": "", "source": "전국관광지정보표준데이터",
        "source_date": "", "url": "", "region": "부산광역시 해운대구",
    }


@pytest.fixture
def catalog_client(tmp_path):
    path = tmp_path / "clean.csv"
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=CLEAN_COLUMNS)
        writer.writeheader()
        writer.writerows([
            catalog_row("far", "먼 미술관", 35.60, 129.16),         # 약 49km → 반경 밖
            catalog_row("beach", "다른 해수욕장", 35.16, 129.17),   # 가깝지만 실내 단어 없음
            catalog_row("museum", "가까운 박물관", 35.17, 129.16),
            catalog_row("science", "더 가까운 과학관", 35.16, 129.161),
        ])
    app.dependency_overrides[get_settings] = lambda: Settings(rest_key="", js_key="", catalog_path=path)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_alternatives_are_nearby_indoor_named_places_sorted_by_distance(catalog_client):
    data = catalog_client.get("/api/weather/alternatives", params={**BUSAN, "name": "해운대해수욕장"}).json()

    assert data["origin_indoor_hint"] is None
    assert [item["place"]["id"] for item in data["alternatives"]] == ["science", "museum"]
    assert [item["indoor_hint"] for item in data["alternatives"]] == ["과학관", "박물관"]
    assert data["alternatives"][0]["distance_km"] < data["alternatives"][1]["distance_km"] <= data["radius_km"]


def test_alternatives_report_when_origin_already_looks_indoor(catalog_client):
    data = catalog_client.get("/api/weather/alternatives", params={**BUSAN, "name": "부산시립미술관"}).json()

    assert data["origin_indoor_hint"] == "미술관"


def test_alternatives_without_catalog_is_unavailable(tmp_path):
    app.dependency_overrides[get_settings] = lambda: Settings(rest_key="", js_key="", catalog_path=tmp_path / "missing.csv")
    try:
        assert TestClient(app).get("/api/weather/alternatives", params=BUSAN).status_code == 503
    finally:
        app.dependency_overrides.clear()


def gallery(*items: dict) -> httpx.Response:
    return httpx.Response(200, json={"response": {"header": {"resultCode": "0000"}, "body": {"items": {"item": list(items)} if items else ""}}})


def gallery_item(title: str, url: str = "https://tong.visitkorea.or.kr/a.jpg", tags: str = "") -> dict:
    return {"galTitle": title, "galWebImageUrl": url, "galPhotographer": "한국관광공사", "galSearchKeyword": tags}


@pytest.fixture
def photo_client(monkeypatch):
    from backend.app.routers.weather import photos
    photos._lookup.cache_clear()
    monkeypatch.setattr(photos, "env", lambda name: KEY)
    yield TestClient(app), photos
    photos._lookup.cache_clear()


def test_photo_matches_title_or_exact_tag_only(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(
        gallery_item("부산불꽃축제", "https://x/fireworks.jpg", "부산불꽃축제, 광안리해수욕장"),
        gallery_item("광안리 야경", "https://x/night.jpg", "광안리"),
    )))
    photo = client.get("/api/weather/photo", params={"name": "광안리해수욕장"}).json()["photo"]
    assert photo["url"] == "https://x/fireworks.jpg"

    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(gallery_item("다른 해수욕장", "https://x/other.jpg", "해수욕장"))))
    assert client.get("/api/weather/photo", params={"name": "송정해수욕장"}).json()["photo"] is None


def test_photo_rejects_non_https_and_hides_key(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(gallery_item("해운대해수욕장", "http://x/a.jpg"))))
    response = client.get("/api/weather/photo", params={"name": "해운대해수욕장"})
    assert response.json()["photo"] is None
    assert KEY not in response.text


def test_photo_failures_are_not_cached(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(side_effect=httpx.ConnectError("down")))
    assert client.get("/api/weather/photo", params={"name": "해운대해수욕장"}).json()["photo"] is None
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(gallery_item("해운대해수욕장"))))
    assert client.get("/api/weather/photo", params={"name": "해운대해수욕장"}).json()["photo"]["title"] == "해운대해수욕장"


def test_photo_without_key_skips_upstream(monkeypatch):
    from backend.app.routers.weather import photos
    monkeypatch.setattr(photos, "env", lambda name: "")
    upstream = Mock()
    monkeypatch.setattr(photos.httpx, "get", upstream)
    assert TestClient(app).get("/api/weather/photo", params={"name": "해운대해수욕장"}).json() == {"photo": None}
    upstream.assert_not_called()
