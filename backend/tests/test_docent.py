import json
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.routers import docent
from backend.app.routers.docent import sources, writer
from backend.app.routers.docent.sources import Evidence

PARAMS = {"place_id": "kakao:1", "name": "검증 장소", "address": "부산광역시 검증구", "latitude": 35.1, "longitude": 129.0}
EVIDENCE = Evidence("tour", "검증 장소 관광정보", "한국관광공사 TourAPI", "https://www.data.go.kr/data/15101578/openapi.do", "2026-10-01", "검증용 원문")


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
    search = {"response": {"body": {"items": {"item": [
        {"contentid": "1", "title": "범어사 성보박물관", "mapx": "129.07", "mapy": "35.28"},
        {"contentid": "2", "title": "범어사(부산)", "mapx": "129.07", "mapy": "35.28"},
    ]}}}}
    detail = {"response": {"body": {"items": {"item": [{"title": "범어사(부산)", "overview": "<b>원문</b>", "modifiedtime": "20260624000000"}]}}}}
    calls = []

    def fake_get(url, params, timeout):
        calls.append(params.get("contentId"))
        return httpx.Response(200, json=search if url.endswith("searchKeyword2") else detail)

    monkeypatch.setattr(sources.httpx, "get", fake_get)
    evidence = sources.tour_overview("범어사", 35.28, 129.07)
    assert evidence is not None and evidence.text == "원문" and evidence.date == "2026-06-24"
    assert calls[-1] == "2"


def news_payload(items, sources):
    return {"output": [
        {"type": "web_search_call", "action": {"type": "search", "sources": [{"type": "url", "url": url} for url in sources]}},
        {"type": "message", "content": [{"type": "output_text", "text": json.dumps({"items": items})}]},
    ]}


def news_item(url, published_date):
    return {"title": "제목", "summary": "요약", "published_date": published_date, "source_name": "검증일보", "url": url}


def test_news_keeps_only_searched_urls_with_recent_valid_dates(monkeypatch):
    docent._news_cache.clear()
    monkeypatch.setattr(docent, "env", lambda name: "test-key")
    monkeypatch.setattr(writer, "env", lambda name: "test-key" if name == "OPENAI_API_KEY" else "")
    today = docent.datetime.now(docent.KST).date().isoformat()
    items = [
        news_item("https://news.example/a", today),           # 유지
        news_item("https://invented.example/b", today),       # 검색 출처에 없음 → 제외
        news_item("https://news.example/c", "2020-01-01"),    # 오래됨 → 제외
        news_item("https://news.example/d", "모름"),           # 날짜 형식 오류 → 제외
    ]
    post = Mock(return_value=httpx.Response(200, json=news_payload(items, ["https://news.example/a", "https://news.example/c", "https://news.example/d"])))
    monkeypatch.setattr(writer.httpx, "post", post)
    client = TestClient(app)
    params = {"place_id": "kakao:1", "name": "검증 장소"}
    data = client.get("/api/docent/news", params=params).json()
    assert [item["url"] for item in data["items"]] == ["https://news.example/a"]
    assert post.call_args.kwargs["json"]["tools"][0]["type"] == "web_search"
    client.get("/api/docent/news", params=params)
    assert post.call_count == 1  # 캐시


def test_news_without_key_does_not_search(monkeypatch):
    docent._news_cache.clear()
    monkeypatch.setattr(docent, "env", lambda name: "")
    post = Mock()
    monkeypatch.setattr(writer.httpx, "post", post)
    data = TestClient(app).get("/api/docent/news", params={"place_id": "kakao:2", "name": "검증"}).json()
    assert data["ready"] is False and data["items"] == []
    post.assert_not_called()


def test_photos_keep_only_licensed_https_images(monkeypatch):
    docent._photo_cache.clear()
    monkeypatch.setattr(sources, "env", lambda name: "key")
    search = {"response": {"body": {"items": {"item": [
        {"contentid": "2", "title": "검증 장소", "mapx": "129.0", "mapy": "35.1",
         "firstimage": "https://img.example/first.jpg", "firstimage2": "https://img.example/first_s.jpg", "cpyrhtDivCd": "Type1"},
    ]}}}}
    images = {"response": {"body": {"items": {"item": [
        {"originimgurl": "https://img.example/a.jpg", "smallimageurl": "https://img.example/a_s.jpg", "imgname": "A", "cpyrhtDivCd": "Type3"},
        {"originimgurl": "https://img.example/b.jpg", "imgname": "B", "cpyrhtDivCd": ""},           # 라이선스 불명 → 제외
        {"originimgurl": "http://img.example/c.jpg", "imgname": "C", "cpyrhtDivCd": "Type1"},       # http → 제외
        {"originimgurl": "https://img.example/first.jpg", "imgname": "dup", "cpyrhtDivCd": "Type1"},  # 중복
    ]}}}}
    monkeypatch.setattr(sources.httpx, "get", lambda url, params, timeout: httpx.Response(200, json=search if url.endswith("searchKeyword2") else images))
    data = TestClient(app).get("/api/docent/photos", params={"place_id": "p:1", "name": "검증 장소", "latitude": 35.1, "longitude": 129.0}).json()
    assert [photo["url"] for photo in data["photos"]] == ["https://img.example/first.jpg", "https://img.example/a.jpg"]
    assert data["photos"][1]["license"].startswith("공공누리 제3유형")
