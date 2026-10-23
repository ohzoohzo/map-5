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


def gallery_item(title: str, url: str = "https://tong.visitkorea.or.kr/a.jpg", tags: str = "", location: str = "부산광역시 해운대구") -> dict:
    return {"galTitle": title, "galWebImageUrl": url, "galPhotographer": "한국관광공사", "galSearchKeyword": tags, "galPhotographyLocation": location}


def by_keyword(responses: dict[str, httpx.Response]) -> Mock:
    """검색어별로 다른 응답을 돌려주는 가짜 관광사진 API"""
    return Mock(side_effect=lambda url, params, **kwargs: responses.get(params["keyword"], gallery()))


@pytest.fixture
def photo_client(monkeypatch):
    from backend.app.routers.weather import photos
    photos._gallery.cache_clear()
    monkeypatch.setattr(photos, "env", lambda name: KEY)
    yield TestClient(app), photos
    photos._gallery.cache_clear()


def photo_of(client, name: str, address: str = ""):
    return client.get("/api/weather/photo", params={"name": name, "address": address}).json()["photo"]


def test_place_photo_needs_matching_name_and_province(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", by_keyword({"해양자연사박물관": gallery(
        gallery_item("땅끝해양자연사박물관", "https://x/haenam.jpg", location="전라남도 해남군"),
        gallery_item("부산해양자연사박물관", "https://x/busan.jpg", location="부산광역시 동래구"),
    ), "광안리해수욕장": gallery(
        gallery_item("부산불꽃축제", "https://x/fireworks.jpg", "부산불꽃축제, 광안리해수욕장", "부산광역시 수영구"),
    )}))
    photo = photo_of(client, "해양자연사박물관", "부산광역시 동래구 우장춘로 175")
    assert (photo["url"], photo["match"]) == ("https://x/busan.jpg", "place")
    assert photo_of(client, "광안리해수욕장", "부산광역시 수영구 광안동")["url"] == "https://x/fireworks.jpg"


def test_without_place_photo_falls_back_to_main_word_then_district_then_province(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", by_keyword({
        "해리단길": gallery(gallery_item("해리단길", "https://x/haeri.jpg", location="부산광역시 해운대구 우동")),
        "기장군": gallery(gallery_item("해동용궁사", "https://x/gijang.jpg", location="부산광역시 기장군 기장읍")),
        "부산광역시": gallery(gallery_item("더베이 101", "https://x/busan.jpg", location="부산광역시 해운대구")),
        "중구": gallery(gallery_item("동성로", "https://x/daegu.jpg", location="대구광역시 중구")),
    }))
    related = photo_of(client, "해리단길 카페", "부산광역시 해운대구 우동")
    assert (related["match"], related["label"], related["url"]) == ("related", "해리단길", "https://x/haeri.jpg")
    area = photo_of(client, "국립수산과학관", "부산광역시 기장군 기장읍 기장해안로 216")
    assert (area["match"], area["label"], area["url"]) == ("area", "기장군", "https://x/gijang.jpg")
    # '중구'는 여러 도시에 있어 다른 시·도 사진은 쓰지 않고 시·도 사진으로 간다
    city = photo_of(client, "어느 기념관", "부산광역시 중구 대청로")
    assert (city["match"], city["label"], city["url"]) == ("area", "부산광역시", "https://x/busan.jpg")


def test_photo_rejects_non_https_and_hides_key(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(gallery_item("해운대해수욕장", "http://x/a.jpg"))))
    response = client.get("/api/weather/photo", params={"name": "해운대해수욕장"})
    assert response.json()["photo"] is None
    assert KEY not in response.text


def test_photo_failures_are_not_cached(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(side_effect=httpx.ConnectError("down")))
    response = client.get("/api/weather/photo", params={"name": "해운대해수욕장"})
    assert response.status_code == 502
    assert KEY not in response.text
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(gallery_item("해운대해수욕장"))))
    assert photo_of(client, "해운대해수욕장")["title"] == "해운대해수욕장"


def test_photo_successful_empty_search_is_still_no_photo(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery()))

    response = client.get("/api/weather/photo", params={"name": "사진 없는 장소", "address": "부산광역시 중구"})

    assert response.status_code == 200
    assert response.json() == {"photo": None}


def test_photo_provider_error_payload_is_not_cached_as_empty(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=httpx.Response(200, json={
        "response": {"header": {"resultCode": "22", "resultMsg": "secret " + KEY}, "body": {"items": ""}},
    })))

    response = client.get("/api/weather/photo", params={"name": "해운대해수욕장"})

    assert response.status_code == 502
    assert KEY not in response.text
    monkeypatch.setattr(photos.httpx, "get", Mock(return_value=gallery(gallery_item("해운대해수욕장"))))
    assert photo_of(client, "해운대해수욕장")["title"] == "해운대해수욕장"


def test_photo_can_use_a_later_area_result_after_an_upstream_failure(photo_client, monkeypatch):
    client, photos = photo_client

    def search(url, params, **kwargs):
        if params["keyword"] == "국립수산과학관":
            raise httpx.ReadTimeout("secret " + KEY)
        return gallery(gallery_item("해동용궁사", location="부산광역시 기장군"))

    monkeypatch.setattr(photos.httpx, "get", Mock(side_effect=search))

    response = client.get("/api/weather/photo", params={"name": "국립수산과학관", "address": "부산광역시 기장군"})

    assert response.status_code == 200
    assert (response.json()["photo"]["match"], response.json()["photo"]["label"]) == ("area", "기장군")


def test_photo_rejects_another_province_with_the_same_county(photo_client, monkeypatch):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", by_keyword({
        "고성군": gallery(gallery_item("고성 통일전망대", location="강원특별자치도 고성군")),
        "경상남도": gallery(gallery_item("당항포관광지", "https://x/gyeongnam.jpg", location="경남 고성군")),
    }))

    photo = photo_of(client, "고성박물관", "경상남도 고성군 고성읍")

    assert (photo["label"], photo["url"]) == ("경상남도", "https://x/gyeongnam.jpg")


@pytest.mark.parametrize("address,wrong_location,right_location", [
    ("경상남도 창원시", "경상북도 경주시", "경남 창원시"),
    ("충청남도 공주시", "충청북도 청주시", "충남 공주시"),
    ("전라남도 목포시", "전라북도 전주시", "전남 목포시"),
    ("경북 경주시", "경상남도 창원시", "경상북도 경주시"),
    ("강원특별자치도 고성군", "경남 고성군", "강원도 고성군"),
    ("전북특별자치도 전주시", "전남 목포시", "전라북도 전주시"),
    ("부산광역시 해운대구", "충청북도 청주시 부산길", "부산 해운대구"),
])
def test_photo_matches_full_province_and_its_established_short_name(photo_client, monkeypatch, address, wrong_location, right_location):
    client, photos = photo_client
    monkeypatch.setattr(photos.httpx, "get", by_keyword({"관광박물관": gallery(
        gallery_item("관광박물관", "https://x/wrong.jpg", location=wrong_location),
        gallery_item("관광박물관", "https://x/right.jpg", location=right_location),
    )}))

    assert photo_of(client, "관광박물관", address)["url"] == "https://x/right.jpg"


def test_photo_without_key_skips_upstream(monkeypatch):
    from backend.app.routers.weather import photos
    monkeypatch.setattr(photos, "env", lambda name: "")
    upstream = Mock()
    monkeypatch.setattr(photos.httpx, "get", upstream)
    assert TestClient(app).get("/api/weather/photo", params={"name": "해운대해수욕장"}).json() == {"photo": None}
    upstream.assert_not_called()
