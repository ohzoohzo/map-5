from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
from threading import Barrier
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.settings import Settings, get_settings


REST_KEY = "c" * 32
PARAMS = {
    "mode": "walk", "start_latitude": 35.1587, "start_longitude": 129.1604,
    "end_latitude": 35.1633, "end_longitude": 129.1635,
}


def provider_step(mode="WALKING", instruction="횡단보도를 건너 직진", distance=120, duration=95):
    return {
        "properties": {"type": mode, "guidance": instruction, "distance": distance, "time": duration},
        "path": {"points": [[129.1604, 35.1587], [129.1611, 35.1592], [129.1635, 35.1633]]},
    }


def walk_payload():
    return {"status": "OK", "route": {
        "properties": {"totalDistance": 730, "totalTime": 570},
        "legs": [{"steps": [provider_step()]}],
    }}


def transit_payload():
    return {"status": "OK", "routes": [
        {"properties": {"type": "BUS", "totalDistance": 1800, "totalTime": 780, "transfers": 0, "fare": {"value": 1550}},
         "steps": [provider_step("BUS", "100번 버스로 이동", 1400, 400)]},
        {"properties": {"type": "SUBWAY", "totalDistance": 2400, "totalTime": 500},
         "steps": [provider_step("SUBWAY", "2호선 장산행 승차", 2100, 420)]},
        {"properties": {"type": "BUS_AND_SUBWAY", "totalDistance": 2100, "totalTime": 900, "transfers": 1, "fare": {"min": 1550, "max": 2000}},
         "steps": [provider_step(), provider_step("BUS", "100번 승차"), provider_step("SUBWAY", "2호선 환승")]},
    ]}


def car_payload():
    return {"routes": [{
        "result_code": 0, "result_msg": "길찾기 성공",
        "summary": {"distance": 5100, "duration": 700, "fare": {"taxi": 12900, "toll": 1200}},
        "sections": [{"roads": [
            {"name": "해운대로", "distance": 3100, "duration": 500,
             "vertexes": [129.1604, 35.1587, 129.1611, 35.1592, 129.1620, 35.1600]},
            {"name": "", "distance": 2000, "duration": 200,
             "vertexes": [129.1630, 35.1620, 129.1635, 35.1633]},
        ]}],
    }]}


@pytest.fixture
def client():
    service = sys.modules.get("backend.app.routers.transport.service")
    if service is not None:
        service._cache.clear()
    app.dependency_overrides[get_settings] = lambda: Settings(rest_key=REST_KEY, js_key="", catalog_path=Path("unused.csv"))
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        if service is not None:
            service._cache.clear()


def test_walk_route_keeps_provider_summary_and_converts_lon_lat_geometry(client, monkeypatch):
    upstream = Mock(return_value=httpx.Response(200, json=walk_payload()))
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params=PARAMS)

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "walk" and data["status"] == "ok"
    route = data["routes"][0]
    assert (route["type"], route["distance_m"], route["duration_seconds"]) == ("walk", 730, 570)
    assert route["transfers"] is None and route["fare_won"] is None
    assert route["steps"][0] == {
        "mode": "walk", "instruction": "횡단보도를 건너 직진", "distance_m": 120, "duration_seconds": 95,
        "path": [{"latitude": 35.1587, "longitude": 129.1604}, {"latitude": 35.1592, "longitude": 129.1611}, {"latitude": 35.1633, "longitude": 129.1635}],
    }
    assert data["source"] == "카카오맵"
    assert data["source_url"] == "https://developers.kakao.com/docs/ko/kakaomap/rest-api#routing"
    assert REST_KEY not in response.text
    args = upstream.call_args
    assert args.args[0] == "https://dapi.kakao.com/v2/routing/walk"
    assert args.kwargs["headers"] == {"Authorization": f"KakaoAK {REST_KEY}"}
    assert args.kwargs["params"] == {
        "start_x": 129.1604, "start_y": 35.1587, "end_x": 129.1635, "end_y": 35.1633,
        "input_coord": "WGS84", "output_coord": "WGS84",
    }


def test_walk_flattens_all_provider_legs_in_order(client, monkeypatch):
    payload = walk_payload()
    payload["route"]["legs"].append({"steps": [provider_step(instruction="도착지까지 도보 이동")]})
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))

    data = client.get("/api/transport/routes", params=PARAMS).json()

    assert [step["instruction"] for step in data["routes"][0]["steps"]] == ["횡단보도를 건너 직진", "도착지까지 도보 이동"]


def test_transit_keeps_all_alternatives_order_and_only_provider_steps(client, monkeypatch):
    upstream = Mock(return_value=httpx.Response(200, json=transit_payload()))
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params={**PARAMS, "mode": "transit"})

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "transit" and data["status"] == "ok"
    routes = data["routes"]
    assert [route["type"] for route in routes] == ["bus", "subway", "mixed"]
    assert [route["duration_seconds"] for route in routes] == [780, 500, 900]
    assert [(route["fare_won"], route["transfers"]) for route in routes] == [(1550, 0), (None, None), (None, 1)]
    assert [step["mode"] for step in routes[0]["steps"]] == ["bus"]  # 접근 도보를 임의로 덧붙이지 않는다.
    assert [step["mode"] for step in routes[2]["steps"]] == ["walk", "bus", "subway"]
    assert routes[0]["distance_m"] == 1800
    assert routes[0]["steps"][0]["instruction"] == "100번 버스로 이동"
    assert upstream.call_args.args[0] == "https://dapi.kakao.com/v2/routing/publictraffic"


def test_car_uses_recommended_mobility_route_all_roads_and_toll_not_taxi_fare(client, monkeypatch):
    payload = car_payload()
    payload["routes"][0]["sections"].append({"roads": [
        {"name": "마지막 도로", "distance": 150, "duration": 60, "vertexes": [129.1635, 35.1633, 129.1640, 35.1640]},
    ]})
    upstream = Mock(return_value=httpx.Response(200, json=payload))
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params={**PARAMS, "mode": "car"})

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "car" and data["status"] == "ok"
    assert data["source"] == "카카오모빌리티"
    assert data["source_url"] == "https://developers.kakaomobility.com/guide/navi-api/directions"
    assert len(data["routes"]) == 1
    route = data["routes"][0]
    assert (route["type"], route["distance_m"], route["duration_seconds"], route["toll_won"]) == ("car", 5100, 700, 1200)
    assert route["fare_won"] is None and route["transfers"] is None
    assert [step["mode"] for step in route["steps"]] == ["car", "car", "car"]
    assert [step["distance_m"] for step in route["steps"]] == [3100, 2000, 150]
    assert [step["duration_seconds"] for step in route["steps"]] == [500, 200, 60]
    assert "해운대로" in route["steps"][0]["instruction"]
    assert route["steps"][0]["path"] == [
        {"longitude": 129.1604, "latitude": 35.1587},
        {"longitude": 129.1611, "latitude": 35.1592},
        {"longitude": 129.1620, "latitude": 35.1600},
    ]
    # 서로 떨어진 도로의 좌표를 이어 붙여 제공되지 않은 직선을 만들지 않는다.
    assert route["steps"][1]["path"][0] == {"longitude": 129.1630, "latitude": 35.1620}
    assert all(step["instruction"] for step in route["steps"])
    assert upstream.call_args.args[0] == "https://apis-navi.kakaomobility.com/v1/directions"
    assert upstream.call_args.kwargs["headers"] == {"Authorization": f"KakaoAK {REST_KEY}"}
    assert upstream.call_args.kwargs["params"] == {
        "origin": "129.1604,35.1587", "destination": "129.1635,35.1633",
        "priority": "RECOMMEND", "alternatives": "false", "summary": "false",
    }


@pytest.mark.parametrize("fare", [None, {"taxi": 9000}])
def test_missing_car_toll_is_unknown_and_never_uses_taxi_quote(client, monkeypatch, fare):
    payload = car_payload()
    payload["routes"][0]["summary"]["fare"] = fare
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))

    response = client.get("/api/transport/routes", params={**PARAMS, "mode": "car"})

    assert response.status_code == 200
    assert response.json()["routes"][0]["toll_won"] is None
    assert response.json()["routes"][0]["fare_won"] is None


@pytest.mark.parametrize("code", [1, 101, 102, 103, 104, 105, 106, 107])
def test_documented_car_no_route_codes_are_success_and_not_cached(client, monkeypatch, code):
    upstream = Mock(return_value=httpx.Response(200, json={"routes": [{"result_code": code, "result_msg": REST_KEY}]}))
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params={**PARAMS, "mode": "car"})

    assert response.status_code == 200
    assert response.json()["status"] == "no_route" and response.json()["routes"] == []
    assert response.json()["source"] == "카카오모빌리티"
    assert REST_KEY not in response.text
    client.get("/api/transport/routes", params={**PARAMS, "mode": "car"})
    assert upstream.call_count == 2


@pytest.mark.parametrize("code", [-1, 201, 204, 999, "0", True])
def test_unknown_or_invalid_car_result_code_is_an_error(client, monkeypatch, code):
    payload = car_payload()
    payload["routes"][0]["result_code"] = code
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))

    assert client.get("/api/transport/routes", params={**PARAMS, "mode": "car"}).status_code == 502


@pytest.mark.parametrize("vertices", [[], [129.0, 35.0], [129.0, 35.0, 129.1], [129.0, 35.0, 129.1, 35.1, 129.2],
                                          [35.0, 129.0, 35.1, 129.1], [129.0, float("nan"), 129.1, 35.1],
                                          [129.0, 35.0, 129.1, float("inf")], [129.0, 35.0, "129.1", 35.1]])
def test_car_invalid_road_geometry_is_an_error_not_a_straight_line(client, monkeypatch, vertices):
    payload = car_payload()
    payload["routes"][0]["sections"][0]["roads"][1]["vertexes"] = vertices
    upstream_response = Mock(status_code=200)
    upstream_response.json.return_value = payload
    monkeypatch.setattr(httpx, "get", Mock(return_value=upstream_response))

    assert client.get("/api/transport/routes", params={**PARAMS, "mode": "car"}).status_code == 502


@pytest.mark.parametrize("sections", [None, [], [{"roads": []}], [{"distance": 200}]])
def test_car_success_without_road_geometry_is_an_error(client, monkeypatch, sections):
    payload = car_payload()
    payload["routes"][0]["sections"] = sections
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))

    assert client.get("/api/transport/routes", params={**PARAMS, "mode": "car"}).status_code == 502


def test_car_failure_can_recover_and_success_uses_existing_five_minute_cache(client, monkeypatch):
    from backend.app.routers.transport import service

    clock = [1000.0]
    monkeypatch.setattr(service, "monotonic", lambda: clock[0])
    upstream = Mock(side_effect=[httpx.ReadTimeout(REST_KEY), httpx.Response(200, json=car_payload()), httpx.Response(200, json=car_payload())])
    monkeypatch.setattr(httpx, "get", upstream)
    params = {**PARAMS, "mode": "car"}

    failed = client.get("/api/transport/routes", params=params)
    assert failed.status_code == 504 and REST_KEY not in failed.text
    assert client.get("/api/transport/routes", params=params).json()["status"] == "ok"
    clock[0] += 299
    assert client.get("/api/transport/routes", params=params).status_code == 200
    assert upstream.call_count == 2
    clock[0] += 2
    assert client.get("/api/transport/routes", params=params).status_code == 200
    assert upstream.call_count == 3


@pytest.mark.parametrize("status,expected", [(401, 503), (403, 503), (429, 429), (500, 502)])
def test_car_provider_http_errors_are_sanitized(client, monkeypatch, status, expected):
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(status, text=REST_KEY)))

    response = client.get("/api/transport/routes", params={**PARAMS, "mode": "car"})

    assert response.status_code == expected
    assert REST_KEY not in response.text


@pytest.mark.parametrize("mode,status", [
    ("transit", "NO_RESULTS"), ("transit", "STARTNODES_NULL"), ("transit", "ENDNODES_NULL"), ("transit", "EQUAL_POINTS"),
    ("walk", "ROUTE_RESULT_NOT_FOUND"), ("walk", "SAME_POINT"), ("walk", "START_LINK_NOT_FOUND"),
    ("walk", "END_LINK_NOT_FOUND"), ("walk", "TOO_FAR_AWAY"), ("walk", "TOO_MANY_SEARCH_LINK"),
])
def test_explicit_no_route_is_success_but_is_not_cached(client, monkeypatch, mode, status):
    upstream = Mock(return_value=httpx.Response(200, json={"status": status}))
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params={**PARAMS, "mode": mode})

    assert response.status_code == 200
    assert response.json()["status"] == "no_route" and response.json()["routes"] == []
    client.get("/api/transport/routes", params={**PARAMS, "mode": mode})
    assert upstream.call_count == 2


def test_missing_key_is_unavailable_without_upstream_call(client, monkeypatch):
    app.dependency_overrides[get_settings] = lambda: Settings(rest_key="", js_key="", catalog_path=Path("unused.csv"))
    upstream = Mock()
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params=PARAMS)

    assert response.status_code == 503
    upstream.assert_not_called()


@pytest.mark.parametrize("failure,expected", [
    (httpx.Response(401, text=REST_KEY), 503), (httpx.Response(403, text=REST_KEY), 503),
    (httpx.Response(429, text=REST_KEY), 429), (httpx.Response(500, text=REST_KEY), 502),
    (httpx.Response(400, text=REST_KEY), 502), (httpx.Response(302, text=REST_KEY), 502),
    (httpx.ReadTimeout(REST_KEY), 504), (httpx.ConnectError(REST_KEY), 503),
    (httpx.Response(200, text=REST_KEY), 502),
])
def test_upstream_failure_is_sanitized_and_can_recover(client, monkeypatch, failure, expected):
    upstream = Mock(side_effect=failure) if isinstance(failure, Exception) else Mock(return_value=failure)
    monkeypatch.setattr(httpx, "get", upstream)

    response = client.get("/api/transport/routes", params=PARAMS)

    assert response.status_code == expected
    assert REST_KEY not in response.text
    recovered = Mock(return_value=httpx.Response(200, json=walk_payload()))
    monkeypatch.setattr(httpx, "get", recovered)
    assert client.get("/api/transport/routes", params=PARAMS).json()["status"] == "ok"
    assert recovered.call_count == 1


@pytest.mark.parametrize("payload", [
    [], {}, {"status": "INVALID_REQUEST"}, {"status": "UNRECOGNIZED"}, {"status": "OK"},
    {"status": "OK", "route": None},
    {"status": "OK", "route": {"properties": {"totalDistance": -1, "totalTime": 10}, "legs": []}},
])
def test_bad_walk_response_is_an_error_not_an_empty_success(client, monkeypatch, payload):
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(200, json=payload)))

    assert client.get("/api/transport/routes", params=PARAMS).status_code == 502


@pytest.mark.parametrize("bad_steps", [
    [],
    [{"properties": {"guidance": "경로", "distance": 10, "time": 20}, "path": {"points": []}}],
    [{"properties": {"guidance": "경로", "distance": 10, "time": 20}, "path": {"points": [[129.0, 35.0]]}}],
    [{"properties": {"guidance": "경로", "distance": 10, "time": 20}, "path": {"points": [[35.0, 129.0], [35.1, 129.1]]}}],
    [{"properties": {"guidance": "경로", "distance": 10, "time": 20}, "path": {"points": [[129.0, float("nan")], [129.1, 35.1]]}}],
    [{"properties": {"guidance": "경로", "distance": 10, "time": 20}, "path": {"points": [[129.0, 35.0, 0], [129.1, 35.1]]}}],
])
def test_bad_geometry_or_missing_steps_is_never_replaced_by_a_straight_line(client, monkeypatch, bad_steps):
    payload = walk_payload()
    payload["route"]["legs"][0]["steps"] = bad_steps
    # JSON 표준에 없는 NaN은 공급자 파서 경계를 그대로 검증하기 위해 직접 반환한다.
    response = Mock(status_code=200)
    response.json.return_value = payload
    monkeypatch.setattr(httpx, "get", Mock(return_value=response))

    assert client.get("/api/transport/routes", params=PARAMS).status_code == 502


@pytest.mark.parametrize("update", [
    {"routes": []}, {"routes": [{"properties": {"type": "BUS", "totalDistance": 1, "totalTime": 2}, "steps": []}]},
    {"status": "INVALID_REQUEST"}, {"status": "UNRECOGNIZED"},
])
def test_bad_transit_response_is_an_error(client, monkeypatch, update):
    monkeypatch.setattr(httpx, "get", Mock(return_value=httpx.Response(200, json={**transit_payload(), **update})))

    assert client.get("/api/transport/routes", params={**PARAMS, "mode": "transit"}).status_code == 502


def test_routes_are_cached_for_five_minutes_and_exact_mode_coordinates(client, monkeypatch):
    from backend.app.routers.transport import service

    clock = [1000.0]
    monkeypatch.setattr(service, "monotonic", lambda: clock[0])
    upstream = Mock(side_effect=lambda url, **kwargs: httpx.Response(200, json=walk_payload() if url.endswith("walk") else transit_payload()))
    monkeypatch.setattr(httpx, "get", upstream)
    assert client.get("/api/transport/routes", params=PARAMS).status_code == 200
    clock[0] += 299
    assert client.get("/api/transport/routes", params=PARAMS).status_code == 200
    assert upstream.call_count == 1
    assert client.get("/api/transport/routes", params={**PARAMS, "mode": "transit"}).status_code == 200
    assert client.get("/api/transport/routes", params={**PARAMS, "end_latitude": 35.1633000001}).status_code == 200
    assert upstream.call_count == 3
    clock[0] += 2
    assert client.get("/api/transport/routes", params=PARAMS).status_code == 200
    assert upstream.call_count == 4


def test_route_cache_is_limited_to_128_entries(client, monkeypatch):
    from backend.app.routers.transport import service

    upstream = Mock(return_value=httpx.Response(200, json=walk_payload()))
    monkeypatch.setattr(httpx, "get", upstream)
    for index in range(129):
        assert client.get("/api/transport/routes", params={**PARAMS, "end_latitude": 35.1633 + index / 100000}).status_code == 200
    assert len(service._cache) == 128
    client.get("/api/transport/routes", params=PARAMS)
    assert upstream.call_count == 130


def test_different_segments_can_load_while_another_provider_call_is_pending(client, monkeypatch):
    from backend.app.routers.transport import service

    started = Barrier(2)

    def upstream(*args, **kwargs):
        started.wait(timeout=2)
        return httpx.Response(200, json=walk_payload())

    monkeypatch.setattr(httpx, "get", upstream)
    settings = Settings(rest_key=REST_KEY, js_key="", catalog_path=Path("unused.csv"))
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(service.get_routes, "walk", 35.1587, 129.1604, end, 129.1635, settings)
                   for end in (35.1633, 35.1634)]
        assert all(future.result(timeout=3).status == "ok" for future in futures)
    assert len(service._cache) == 2


@pytest.mark.parametrize("field,value", [
    ("mode", "bike"), ("start_latitude", 32.9), ("start_latitude", 39.1),
    ("end_latitude", "nan"), ("end_latitude", "inf"), ("start_longitude", 123.9),
    ("end_longitude", 132.1), ("end_longitude", "invalid"),
])
def test_invalid_request_is_rejected_before_provider_call(client, monkeypatch, field, value):
    upstream = Mock()
    monkeypatch.setattr(httpx, "get", upstream)

    assert client.get("/api/transport/routes", params={**PARAMS, field: value}).status_code == 422
    upstream.assert_not_called()


def test_missing_coordinate_is_rejected(client, monkeypatch):
    upstream = Mock()
    monkeypatch.setattr(httpx, "get", upstream)
    params = deepcopy(PARAMS)
    del params["end_latitude"]

    assert client.get("/api/transport/routes", params=params).status_code == 422
    upstream.assert_not_called()
