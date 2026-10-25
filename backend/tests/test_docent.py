import json
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.routers import docent
from backend.app.routers.docent import news, sources, writer
from backend.app.routers.docent.sources import Evidence

PARAMS = {"place_id": "kakao:1", "name": "검증 장소", "address": "부산광역시 검증구", "latitude": 35.1, "longitude": 129.0}
EVIDENCE = Evidence("tour", "검증 장소 관광정보", "한국관광공사 TourAPI", "https://www.data.go.kr/data/15101578/openapi.do", "2026-10-01", "검증용 원문")


def tour_payload(*items: dict) -> dict:
    return {"response": {"header": {"resultCode": "0000"}, "body": {"items": {"item": list(items)} if items else ""}}}


@pytest.fixture(autouse=True)
def isolate(monkeypatch):
    docent._cache.clear()
    monkeypatch.setattr(docent, "nearby_heritage", lambda *_: [])
    monkeypatch.setattr(docent, "tour_overview", lambda *_: EVIDENCE)


def test_docent_status_reports_feature():
    data = TestClient(app).get("/api/docent/status").json()
    assert data["feature"] == "docent"
    assert isinstance(data["ready"], bool)


def test_story_without_openai_key_returns_references_only(monkeypatch):
    monkeypatch.setattr(docent, "env", lambda name: "")
    data = TestClient(app).get("/api/docent/story", params=PARAMS).json()
    assert data["ready"] is False and data["sections"] == []
    assert data["references"][0]["source"] == "한국관광공사 TourAPI"


def test_story_without_evidence_does_not_call_openai(monkeypatch):
    monkeypatch.setattr(docent, "tour_overview", lambda *_: None)
    post = Mock()
    monkeypatch.setattr(writer.httpx, "post", post)
    data = TestClient(app).get("/api/docent/story", params=PARAMS).json()
    assert data["ready"] is False and data["references"] == []
    post.assert_not_called()


def test_story_keeps_only_valid_reference_indexes_and_caches(monkeypatch):
    monkeypatch.setattr(docent, "env", lambda name: "test-key" if name == "OPENAI_API_KEY" else "")
    monkeypatch.setattr(writer, "env", lambda name: "test-key" if name == "OPENAI_API_KEY" else "")
    story = {"summary": "요약", "sections": [{"key": "history", "body": "본문", "reference_indexes": [1, 1, 9]}]}
    output = {"output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(story)}]}]}
    post = Mock(return_value=httpx.Response(200, json=output))
    monkeypatch.setattr(writer.httpx, "post", post)
    client = TestClient(app)
    data = client.get("/api/docent/story", params=PARAMS).json()
    assert data["ready"] is True
    assert data["sections"][0]["reference_indexes"] == [1]
    assert data["sections"][0]["title"] == "역사와 문화"
    client.get("/api/docent/story", params=PARAMS)
    assert post.call_count == 1


def test_openai_errors_are_sanitized(monkeypatch):
    monkeypatch.setattr(docent, "env", lambda name: "secret-key")
    monkeypatch.setattr(writer, "env", lambda name: "secret-key")
    monkeypatch.setattr(writer.httpx, "post", Mock(return_value=httpx.Response(500, text="secret-key leaked")))
    response = TestClient(app).get("/api/docent/story", params=PARAMS)
    assert response.status_code == 502
    assert "secret-key" not in response.text


def test_tour_title_match_prefers_exact_name_nearby(monkeypatch):
    monkeypatch.setattr(sources, "env", lambda name: "key")
    search = tour_payload(
        {"contentid": "1", "title": "범어사 성보박물관", "mapx": "129.07", "mapy": "35.28"},
        {"contentid": "2", "title": "범어사(부산)", "mapx": "129.07", "mapy": "35.28"},
    )
    detail = tour_payload({"title": "범어사(부산)", "overview": "<b>원문</b>", "modifiedtime": "20260624000000"})
    calls = []

    def fake_get(url, params, timeout):
        calls.append(params.get("contentId"))
        return httpx.Response(200, json=search if url.endswith("searchKeyword2") else detail)

    monkeypatch.setattr(sources.httpx, "get", fake_get)
    evidence = sources.tour_overview("범어사", 35.28, 129.07)
    assert evidence is not None and evidence.text == "원문" and evidence.date == "2026-06-24"
    assert calls[-1] == "2"


def rss(*entries):
    items = "".join(
        f"<item><title>{title} - {source}</title><link>{link}</link><pubDate>{date}</pubDate><source url=\"https://x\">{source}</source></item>"
        for title, link, date, source in entries
    )
    return f"<rss><channel>{items}</channel></rss>"


def test_news_uses_trusted_sites_and_keeps_recent_titled_items(monkeypatch):
    docent._news_cache.clear()
    from email.utils import format_datetime
    now = docent.datetime.now(docent.KST)
    recent = format_datetime(now - docent.timedelta(days=1))
    older = format_datetime(now - docent.timedelta(days=3))
    old = format_datetime(now - docent.timedelta(days=400))
    body = rss(
        ("검증 장소 축제 개최", "https://news.google.com/a", older, "국제신문"),
        ("검증 장소 새 전시", "https://news.google.com/b", recent, "부산일보"),
        ("다른 동네 소식", "https://news.google.com/c", recent, "부산일보"),        # 제목에 장소명 없음 → 제외
        ("검증 장소 옛 기사", "https://news.google.com/d", old, "KNN"),            # 오래됨 → 제외
        ("검증장소 소식 하나 더", "https://news.google.com/e", older, "부산시청"),
        ("검증 장소 네번째", "https://news.google.com/f", older, "국제신문"),         # 3건 초과 → 제외
    )
    calls = []

    def fake_get(url, params, timeout, follow_redirects):
        calls.append(params["q"])
        return httpx.Response(200, text=body, request=httpx.Request("GET", url))

    monkeypatch.setattr(news.httpx, "get", fake_get)
    client = TestClient(app)
    data = client.get("/api/docent/news", params={"place_id": "kakao:1", "name": "검증 장소"}).json()
    assert len(data["items"]) == 3
    assert data["items"][0]["title"] == "검증 장소 새 전시" and data["items"][0]["source_name"] == "부산일보"
    assert all("다른" not in item["title"] and "옛" not in item["title"] for item in data["items"])
    assert "site:busan.go.kr" in calls[0] and "site:kookje.co.kr" in calls[0]
    client.get("/api/docent/news", params={"place_id": "kakao:1", "name": "검증 장소"})
    assert len(calls) == 1  # 캐시


@pytest.mark.parametrize("failure_kind,status", [
    ("network", 503),
    ("timeout", 504),
    ("http", 502),
    ("xml", 502),
    ("unexpected_xml", 502),
])
def test_news_failure_can_be_retried_without_caching(monkeypatch, failure_kind, status):
    docent._news_cache.clear()
    from email.utils import format_datetime
    request = httpx.Request("GET", news.RSS_URL)
    failures = {
        "network": httpx.ConnectError("upstream-secret", request=request),
        "timeout": httpx.ReadTimeout("upstream-secret", request=request),
        "http": httpx.Response(503, text="upstream-secret", request=request),
        "xml": httpx.Response(200, text="<rss>upstream-secret", request=request),
        "unexpected_xml": httpx.Response(200, text="<html>upstream-secret</html>", request=request),
    }
    body = rss(("검증 장소 새 전시", "https://news.google.com/recovered", format_datetime(docent.datetime.now(docent.KST)), "부산일보"))
    get = Mock(side_effect=[failures[failure_kind], httpx.Response(200, text=body, request=request)])
    monkeypatch.setattr(news.httpx, "get", get)
    client = TestClient(app)
    params = {"place_id": "kakao:2", "name": "검증 장소"}

    failed = client.get("/api/docent/news", params=params)
    assert failed.status_code == status
    assert set(failed.json()) == {"detail"}
    assert "upstream-secret" not in failed.text
    assert params["place_id"] not in docent._news_cache

    recovered = client.get("/api/docent/news", params=params)
    assert recovered.status_code == 200
    assert recovered.json()["items"][0]["title"] == "검증 장소 새 전시"
    client.get("/api/docent/news", params=params)
    assert get.call_count == 2


def test_news_successful_empty_result_is_cached(monkeypatch):
    docent._news_cache.clear()
    get = Mock(return_value=httpx.Response(200, text=rss(), request=httpx.Request("GET", news.RSS_URL)))
    monkeypatch.setattr(news.httpx, "get", get)
    client = TestClient(app)
    params = {"place_id": "kakao:empty", "name": "검증 장소"}
    response = client.get("/api/docent/news", params=params)
    assert response.status_code == 200
    assert response.json()["ready"] is True and response.json()["items"] == []
    client.get("/api/docent/news", params=params)
    assert get.call_count == 1


def test_photos_keep_only_licensed_https_images(monkeypatch):
    docent._photo_cache.clear()
    monkeypatch.setattr(sources, "env", lambda name: "key")
    search = tour_payload(
        {"contentid": "2", "title": "검증 장소", "mapx": "129.0", "mapy": "35.1",
         "firstimage": "https://img.example/first.jpg", "firstimage2": "https://img.example/first_s.jpg", "cpyrhtDivCd": "Type1"},
    )
    images = tour_payload(
        {"originimgurl": "https://img.example/a.jpg", "smallimageurl": "https://img.example/a_s.jpg", "imgname": "A", "cpyrhtDivCd": "Type3"},
        {"originimgurl": "https://img.example/b.jpg", "imgname": "B", "cpyrhtDivCd": ""},           # 라이선스 불명 → 제외
        {"originimgurl": "http://img.example/c.jpg", "imgname": "C", "cpyrhtDivCd": "Type1"},       # http → 제외
        {"originimgurl": "https://img.example/first.jpg", "imgname": "dup", "cpyrhtDivCd": "Type1"},  # 중복
    )
    monkeypatch.setattr(sources.httpx, "get", lambda url, params, timeout: httpx.Response(200, json=search if url.endswith("searchKeyword2") else images))
    data = TestClient(app).get("/api/docent/photos", params={"place_id": "p:1", "name": "검증 장소", "latitude": 35.1, "longitude": 129.0}).json()
    assert [photo["url"] for photo in data["photos"]] == ["https://img.example/first.jpg", "https://img.example/a.jpg"]
    assert data["photos"][1]["license"].startswith("공공누리 제3유형")


PHOTO_PARAMS = {"place_id": "photo:retry", "name": "검증 장소", "latitude": 35.1, "longitude": 129.0}
TOUR_PLACE = {"contentid": "2", "title": "검증 장소", "mapx": "129.0", "mapy": "35.1"}
TOUR_IMAGE = {"originimgurl": "https://img.example/recovered.jpg", "imgname": "복구 사진", "cpyrhtDivCd": "Type1"}


@pytest.mark.parametrize("failure", [
    httpx.ConnectError("secret-key"),
    httpx.ReadTimeout("secret-key"),
    httpx.Response(500, json=tour_payload()),
    httpx.Response(200, text="secret-key invalid json"),
    httpx.Response(200, json={"response": {"header": {"resultCode": "22", "resultMsg": "secret-key"}, "body": {"items": ""}}}),
    httpx.Response(200, json={"response": {"header": {"resultCode": "0000"}, "body": {"items": "unexpected schema"}}}),
])
def test_photo_upstream_failure_is_not_successfully_cached_and_can_recover(monkeypatch, failure):
    docent._photo_cache.clear()
    monkeypatch.setattr(sources, "env", lambda name: "secret-key")
    upstream = Mock(side_effect=failure) if isinstance(failure, Exception) else Mock(return_value=failure)
    monkeypatch.setattr(sources.httpx, "get", upstream)
    client = TestClient(app)

    response = client.get("/api/docent/photos", params=PHOTO_PARAMS)

    assert response.status_code == 502
    assert "secret-key" not in response.text
    assert PHOTO_PARAMS["place_id"] not in docent._photo_cache
    monkeypatch.setattr(sources.httpx, "get", Mock(side_effect=[
        httpx.Response(200, json=tour_payload(TOUR_PLACE)),
        httpx.Response(200, json=tour_payload(TOUR_IMAGE)),
    ]))
    recovered = client.get("/api/docent/photos", params=PHOTO_PARAMS)
    assert recovered.status_code == 200
    assert [photo["url"] for photo in recovered.json()["photos"]] == [TOUR_IMAGE["originimgurl"]]


def test_photo_successful_empty_result_remains_success(monkeypatch):
    docent._photo_cache.clear()
    monkeypatch.setattr(sources, "env", lambda name: "key")
    monkeypatch.setattr(sources.httpx, "get", Mock(return_value=httpx.Response(200, json=tour_payload())))

    response = TestClient(app).get("/api/docent/photos", params=PHOTO_PARAMS)

    assert response.status_code == 200 and response.json()["photos"] == []


def test_photo_without_key_still_skips_upstream(monkeypatch):
    docent._photo_cache.clear()
    monkeypatch.setattr(sources, "env", lambda name: "")
    upstream = Mock()
    monkeypatch.setattr(sources.httpx, "get", upstream)

    response = TestClient(app).get("/api/docent/photos", params=PHOTO_PARAMS)

    assert response.status_code == 200 and response.json()["photos"] == []
    upstream.assert_not_called()


@pytest.mark.parametrize("representative,expected", [
    ({"firstimage": "https://img.example/representative.jpg", "cpyrhtDivCd": "Type1"}, 200),
    ({"firstimage": "http://img.example/representative.jpg", "cpyrhtDivCd": "Type1"}, 502),
    ({"firstimage": "https://img.example/representative.jpg", "cpyrhtDivCd": ""}, 502),
])
def test_photo_detail_failure_uses_only_a_valid_representative(monkeypatch, representative, expected):
    docent._photo_cache.clear()
    monkeypatch.setattr(sources, "env", lambda name: "key")
    monkeypatch.setattr(sources.httpx, "get", Mock(side_effect=[
        httpx.Response(200, json=tour_payload({**TOUR_PLACE, **representative})),
        httpx.ConnectError("secret-key"),
    ]))

    response = TestClient(app).get("/api/docent/photos", params=PHOTO_PARAMS)

    assert response.status_code == expected
    assert "secret-key" not in response.text
    if expected == 200:
        assert [photo["url"] for photo in response.json()["photos"]] == [representative["firstimage"]]
    else:
        assert PHOTO_PARAMS["place_id"] not in docent._photo_cache


def test_story_can_keep_other_evidence_when_tour_search_fails(monkeypatch):
    catalog = Evidence("catalog", "카탈로그 소개", "관광지 표준 데이터", "https://example.com/catalog", None, "검증용 카탈로그 원문")
    monkeypatch.setattr(docent, "catalog_evidence", lambda *_: catalog)
    monkeypatch.setattr(docent, "tour_overview", sources.tour_overview)
    monkeypatch.setattr(sources, "env", lambda name: "key")
    monkeypatch.setattr(docent, "env", lambda name: "key")
    monkeypatch.setattr(sources.httpx, "get", Mock(side_effect=httpx.ConnectError("secret-key")))
    write = Mock(return_value={"summary": "카탈로그 기반 요약", "sections": []})
    monkeypatch.setattr(docent, "write_story", write)

    response = TestClient(app).get("/api/docent/story", params=PARAMS)

    assert response.status_code == 200
    assert response.json()["ready"] is True
    assert [reference["kind"] for reference in response.json()["references"]] == ["catalog"]
    assert write.call_args.args[2] == [catalog]


def test_tour_overview_detail_failure_remains_optional(monkeypatch):
    monkeypatch.setattr(sources, "env", lambda name: "key")
    monkeypatch.setattr(sources.httpx, "get", Mock(side_effect=[
        httpx.Response(200, json=tour_payload(TOUR_PLACE)),
        httpx.Response(200, text="secret-key invalid json"),
    ]))

    assert sources.tour_overview("검증 장소", 35.1, 129.0) is None
