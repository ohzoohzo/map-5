import csv
import importlib
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pandas as pd
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from backend import data_prep
from backend.app.main import app, register_routers
from backend.app.models import Place
from backend.app.services import catalog, kakao
from backend.app.settings import Settings, get_settings

REST_KEY = "a" * 32
JS_KEY = "b" * 32


@pytest.fixture
def settings(tmp_path):
    return Settings(rest_key=REST_KEY, js_key=JS_KEY, catalog_path=tmp_path / "clean.csv")


@pytest.fixture
def client(settings):
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def raw_row(**updates):
    # Isolated transformation fixture, never served as application content.
    row = {
        "관광지명": "정제 검증용 장소", "관광지구분": "관광지",
        "소재지도로명주소": "서울특별시 종로구 검증로 1", "소재지지번주소": "",
        "위도": "37.57", "경도": "126.98", "관광지소개": "정제 검증",
        "관리기관전화번호": "", "데이터기준일자": "2026-10-01", "제공기관코드": "TEST",
    }
    return {**row, **updates}


def place(index=0, region="서울특별시 종로구", name="정제 검증", source_date="2026-10-01"):
    return {
        "id": f"test:{index}", "name": name, "address": region + " 검증로 1",
        "latitude": 37.57, "longitude": 126.98, "category": "관광지",
        "description": "", "phone": "", "source": catalog.CATALOG_SOURCE,
        "source_date": source_date, "url": catalog.CATALOG_SOURCE_URL, "region": region,
    }


def write_catalog(path, rows):
    pd.DataFrame(rows, columns=catalog.CLEAN_COLUMNS).to_csv(path, encoding="utf-8-sig", index=False)


def kakao_document(**updates):
    return {
        "id": "123", "place_name": "응답 검증", "address_name": "서울 종로구 검증동",
        "road_address_name": "서울 종로구 검증로 1", "category_group_name": "문화시설",
        "category_name": "문화,예술 > 검증", "phone": "", "place_url": "https://place.map.kakao.com/123",
        "x": "126.98", "y": "37.57", **updates,
    }


def test_prepare_cp949_preserves_valid_data_and_reports_drops(tmp_path):
    raw = tmp_path / "raw.csv"
    output = tmp_path / "clean.csv"
    rows = [
        raw_row(),
        raw_row(관광지명="지번 주소 검증", 소재지도로명주소="", 소재지지번주소="부산광역시 중구 검증동 1", 데이터기준일자=""),
        raw_row(관광지명=""),
        raw_row(관광지명="좌표 범위 오류", 위도="0"),
        raw_row(관광지명="날짜 오류", 데이터기준일자="2026-99-99"),
    ]
    pd.DataFrame(rows).to_csv(raw, encoding="cp949", index=False)
    report = data_prep.prepare(raw, output)
    assert report["input_encoding"] == "cp949"
    assert report["input_rows"] == 5 and report["output_rows"] == 2
    assert report["dropped_by_reason"] == {"invalid_coordinates": 1, "invalid_source_date": 1, "missing_name": 1}
    assert report["missing_by_column"]["데이터기준일자"] == 1
    assert output.read_bytes().startswith(b"\xef\xbb\xbf")
    result = catalog.read_catalog(output)
    assert len(result) == 2
    assert {entry.region for entry in result} == {"서울특별시 종로구", "부산광역시 중구"}
    assert all(entry.place.source == catalog.CATALOG_SOURCE for entry in result)


def test_prepare_accepts_utf8_and_rejects_missing_columns_without_overwriting(tmp_path):
    raw = tmp_path / "raw.csv"
    output = tmp_path / "clean.csv"
    pd.DataFrame([raw_row()]).to_csv(raw, encoding="utf-8-sig", index=False)
    assert data_prep.prepare(raw, output)["input_encoding"] == "utf-8-sig"
    previous = output.read_bytes()
    raw.write_text("다른열\n내용\n", encoding="utf-8")
    with pytest.raises(ValueError, match="필수 관광 데이터 열"):
        data_prep.prepare(raw, output)
    assert output.read_bytes() == previous


def test_duplicate_identity_and_invalid_numbers_are_reported():
    rows = [raw_row(), raw_row(), raw_row(관광지명="숫자 아님", 위도="NaN"), raw_row(관광지명="무한대", 경도="inf")]
    cleaned, report = data_prep.clean_tourism(pd.DataFrame(rows))
    assert len(cleaned) == 1
    assert report["dropped_by_reason"] == {"duplicate_place": 1, "invalid_coordinates": 2}
    assert report["geocode_attempts"] == 0


def test_geocode_is_bounded_and_spaced(monkeypatch, settings):
    monkeypatch.setattr(data_prep, "get_settings", lambda: settings)
    geocode = Mock(return_value=(37.5, 127.0))
    sleep = Mock()
    monkeypatch.setattr(data_prep, "geocode_address", geocode)
    monkeypatch.setattr(data_prep.time, "sleep", sleep)
    rows = [raw_row(관광지명=f"주소 검증 {i}", 위도="") for i in range(32)]
    cleaned, report = data_prep.clean_tourism(pd.DataFrame(rows), geocode=True)
    assert len(cleaned) == 30
    assert geocode.call_count == 30
    assert sleep.call_count == 29
    sleep.assert_called_with(0.1)
    assert report["geocode_attempts"] == report["geocode_resolved"] == 30
    assert report["dropped_by_reason"] == {"invalid_coordinates": 2}
    with pytest.raises(ValueError, match="최대 30건"):
        data_prep.clean_tourism(pd.DataFrame(rows), max_geocode=31)


def test_geocode_failure_stops_immediately_without_overwriting(tmp_path, monkeypatch, settings):
    raw, output = tmp_path / "raw.csv", tmp_path / "clean.csv"
    pd.DataFrame([raw_row(위도=""), raw_row(관광지명="다음 행", 위도="")]).to_csv(raw, index=False)
    output.write_text("keep existing", encoding="utf-8")
    monkeypatch.setattr(data_prep, "get_settings", lambda: settings)
    geocode = Mock(side_effect=HTTPException(503, "네트워크를 확인해 주세요."))
    monkeypatch.setattr(data_prep, "geocode_address", geocode)
    with pytest.raises(HTTPException):
        data_prep.prepare(raw, output, geocode=True)
    assert geocode.call_count == 1
    assert output.read_text() == "keep existing"


def test_catalog_filters_use_and_and_regions_come_from_full_catalog(client, settings):
    write_catalog(settings.catalog_path, [
        place(1, "서울특별시 종로구", "궁궐 검증", "2026-10-02"),
        place(2, "부산광역시 중구", "궁궐 검증", "2026-10-03"),
        place(3, "서울특별시 종로구", "다른 장소", "2026-10-04"),
    ])
    response = client.get("/api/travel/catalog", params={"region": "서울특별시 종로구", "query": "궁궐"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == len(data["places"]) == 1
    assert data["places"][0]["id"] == "test:1"
    assert data["total_catalog"] == 3
    assert data["regions"] == ["부산광역시 중구", "서울특별시 종로구"]
    assert data["date_min"] == data["date_max"] == "2026-10-02"
    assert client.get("/api/travel/catalog", params={"region": "종로구"}).json()["total"] == 0


def test_catalog_limit_is_the_actual_shared_result_count(client, settings):
    write_catalog(settings.catalog_path, [place(i) for i in range(205)])
    data = client.get("/api/travel/catalog").json()
    assert data["total"] == len(data["places"]) == 200
    assert data["total_catalog"] == 205


@pytest.mark.parametrize("kind", ["missing", "wrong_columns", "invalid_coordinate", "duplicate", "invalid_date"])
def test_catalog_invalid_files_are_sanitized(client, settings, kind):
    if kind == "wrong_columns":
        settings.catalog_path.write_text("other\nvalue", encoding="utf-8")
    elif kind == "invalid_coordinate":
        write_catalog(settings.catalog_path, [{**place(), "latitude": "not a number"}])
    elif kind == "duplicate":
        write_catalog(settings.catalog_path, [place(), place()])
    elif kind == "invalid_date":
        write_catalog(settings.catalog_path, [place(source_date="bad date")])
    response = client.get("/api/travel/catalog")
    assert response.status_code == 503
    assert set(response.json()) == {"detail"}
    assert str(settings.catalog_path) not in response.text


def test_config_exposes_only_browser_key_and_capability(client):
    response = client.get("/api/config")
    assert response.json() == {"js_key": JS_KEY, "place_search_enabled": True}
    assert REST_KEY not in response.text
    assert client.get("/api/health").json() == {"status": "ok"}


def test_search_maps_xy_and_does_not_expose_rest_secret(client, monkeypatch):
    upstream = Mock(return_value=httpx.Response(200, json={"documents": [kakao_document()]}))
    monkeypatch.setattr(kakao.httpx, "get", upstream)
    response = client.get("/api/travel/search", params={"query": "  종로 관광  "})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == len(data["places"]) == 1
    assert data["places"][0]["latitude"] == 37.57
    assert data["places"][0]["longitude"] == 126.98
    assert data["places"][0]["source_date"] is None
    assert REST_KEY not in response.text
    assert upstream.call_args.kwargs["timeout"] == 10.0
    assert upstream.call_args.kwargs["params"] == {"query": "종로 관광", "size": 15}
    assert upstream.call_args.kwargs["headers"] == {"Authorization": "KakaoAK " + REST_KEY}


@pytest.mark.parametrize("upstream_status,expected", [(401, 503), (403, 503), (429, 429), (500, 502), (400, 502)])
def test_upstream_status_errors_never_echo_body(client, monkeypatch, upstream_status, expected):
    monkeypatch.setattr(kakao.httpx, "get", Mock(return_value=httpx.Response(upstream_status, text="secret " + REST_KEY)))
    response = client.get("/api/travel/search", params={"query": "종로"})
    assert response.status_code == expected
    assert set(response.json()) == {"detail"}
    assert REST_KEY not in response.text and "secret" not in response.text


@pytest.mark.parametrize("error,expected", [(httpx.ReadTimeout("secret " + REST_KEY), 504), (httpx.ConnectError("secret " + REST_KEY), 503)])
def test_upstream_network_errors_are_sanitized(client, monkeypatch, error, expected):
    monkeypatch.setattr(kakao.httpx, "get", Mock(side_effect=error))
    response = client.get("/api/travel/search", params={"query": "종로"})
    assert response.status_code == expected
    assert REST_KEY not in response.text


@pytest.mark.parametrize("payload", [[], {}, {"documents": "bad"}, {"documents": [{}]}, {"documents": [kakao_document(x="0")]}, {"documents": [kakao_document(y="NaN")]}, {"documents": [kakao_document(place_url="javascript:alert(1)")]}])
def test_invalid_upstream_schema_is_rejected(client, monkeypatch, payload):
    monkeypatch.setattr(kakao.httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))
    response = client.get("/api/travel/search", params={"query": "종로"})
    assert response.status_code == 502
    assert set(response.json()) == {"detail"}


def test_invalid_json_empty_search_and_bad_key(client, monkeypatch, settings):
    upstream = Mock(return_value=httpx.Response(200, text="not json " + REST_KEY))
    monkeypatch.setattr(kakao.httpx, "get", upstream)
    assert client.get("/api/travel/search", params={"query": "종로"}).status_code == 502
    for params in ({}, {"query": ""}, {"query": "   "}, {"query": "x" * 101}):
        response = client.get("/api/travel/search", params=params)
        assert response.status_code == 422
        assert isinstance(response.json()["detail"], str)
    app.dependency_overrides[get_settings] = lambda: Settings(rest_key="", js_key="", catalog_path=settings.catalog_path)
    upstream.reset_mock()
    response = client.get("/api/travel/search", params={"query": "종로"})
    assert response.status_code == 503 and upstream.call_count == 0
    assert client.get("/api/config").json() == {"js_key": "", "place_search_enabled": False}


def test_router_discovery_registers_new_mini_app(tmp_path, monkeypatch):
    package_path = tmp_path / "test_discovered_routers"
    package_path.mkdir()
    (package_path / "__init__.py").write_text("", encoding="utf-8")
    (package_path / "example.py").write_text(
        'from fastapi import APIRouter\nrouter=APIRouter()\n@router.get("/discovered")\ndef check():\n    return {"found": True}\n',
        encoding="utf-8",
    )
    monkeypatch.syspath_prepend(str(tmp_path))
    package = importlib.import_module("test_discovered_routers")
    discovered = FastAPI()
    register_routers(discovered, package)
    assert TestClient(discovered).get("/discovered").json() == {"found": True}


def test_openapi_operation_ids_match_contract():
    schema = app.openapi()
    expected = {
        "/api/config": "get_config", "/api/health": "health",
        "/api/travel/catalog": "get_catalog", "/api/travel/search": "search_places",
    }
    assert {path: schema["paths"][path]["get"]["operationId"] for path in expected} == expected
    assert set(schema["components"]["schemas"]["Place"]["required"]) == set(Place.model_fields)
