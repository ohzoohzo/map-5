from collections import OrderedDict
from threading import Lock
from time import monotonic
from typing import Annotated, Literal

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ...settings import Settings, valid_key
from .models import TRANSPORT_SOURCE_URL, TransportMode, TransportNonnegativeInt, TransportPoint, TransportRoute, TransportRoutesResponse, TransportStep

ROUTING_API = "https://dapi.kakao.com/v2/routing"
CACHE_TTL_SECONDS = 300
CACHE_MAX_SIZE = 128
_cache: OrderedDict[tuple[TransportMode, float, float, float, float], tuple[float, TransportRoutesResponse]] = OrderedDict()
_cache_lock = Lock()
NO_ROUTE_STATUSES = {
    "transit": {"NO_RESULTS", "STARTNODES_NULL", "ENDNODES_NULL", "EQUAL_POINTS"},
    "walk": {"SAME_POINT", "START_LINK_NOT_FOUND", "END_LINK_NOT_FOUND", "TOO_MANY_SEARCH_LINK", "TOO_FAR_AWAY", "ROUTE_RESULT_NOT_FOUND"},
}
STEP_MODES = {"WALKING": "walk", "BUS": "bus", "SUBWAY": "subway"}
ROUTE_TYPES = {"BUS": "bus", "SUBWAY": "subway", "BUS_AND_SUBWAY": "mixed"}


class _ProviderModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore", allow_inf_nan=False)


class _Path(_ProviderModel):
    points: Annotated[list[Annotated[list[float], Field(min_length=2, max_length=2)]], Field(min_length=2)]


class _StepProperties(_ProviderModel):
    guidance: Annotated[str, Field(min_length=1)]
    distance: TransportNonnegativeInt
    time: TransportNonnegativeInt


class _Step(_ProviderModel):
    properties: _StepProperties
    path: _Path


class _TransitStepProperties(_StepProperties):
    type: Literal["WALKING", "BUS", "SUBWAY"]


class _TransitStep(_Step):
    properties: _TransitStepProperties


class _Summary(_ProviderModel):
    totalDistance: TransportNonnegativeInt
    totalTime: TransportNonnegativeInt


class _WalkLeg(_ProviderModel):
    steps: Annotated[list[_Step], Field(min_length=1)]


class _WalkRoute(_ProviderModel):
    properties: _Summary
    legs: Annotated[list[_WalkLeg], Field(min_length=1)]


class _WalkPayload(_ProviderModel):
    route: _WalkRoute


class _Fare(_ProviderModel):
    value: TransportNonnegativeInt | None = None


class _TransitSummary(_Summary):
    type: Literal["BUS", "SUBWAY", "BUS_AND_SUBWAY"]
    transfers: TransportNonnegativeInt | None = None
    fare: _Fare | None = None


class _TransitRoute(_ProviderModel):
    properties: _TransitSummary
    steps: Annotated[list[_TransitStep], Field(min_length=1)]


class _TransitPayload(_ProviderModel):
    routes: Annotated[list[_TransitRoute], Field(min_length=1)]


def _step(item: _Step, mode: str) -> TransportStep:
    return TransportStep(
        mode=mode, instruction=item.properties.guidance,
        distance_m=item.properties.distance, duration_seconds=item.properties.time,
        path=[TransportPoint(longitude=point[0], latitude=point[1]) for point in item.path.points],
    )


def _parse_routes(mode: TransportMode, payload: dict) -> TransportRoutesResponse:
    status = payload.get("status")
    if not isinstance(status, str):
        raise HTTPException(502, "카카오 경로 데이터 형식이 올바르지 않아요.")
    if status in NO_ROUTE_STATUSES[mode]:
        return TransportRoutesResponse(mode=mode, status="no_route", routes=[], source="카카오맵", source_url=TRANSPORT_SOURCE_URL)
    if status != "OK":
        raise HTTPException(502, "카카오 경로 조회가 요청을 처리하지 못했어요.")
    try:
        if mode == "walk":
            route = _WalkPayload.model_validate(payload).route
            routes = [TransportRoute(
                type="walk", distance_m=route.properties.totalDistance, duration_seconds=route.properties.totalTime,
                transfers=None, fare_won=None,
                steps=[_step(step, "walk") for leg in route.legs for step in leg.steps],
            )]
        else:
            routes = [TransportRoute(
                type=ROUTE_TYPES[route.properties.type],
                distance_m=route.properties.totalDistance, duration_seconds=route.properties.totalTime,
                transfers=route.properties.transfers,
                fare_won=route.properties.fare.value if route.properties.fare is not None else None,
                steps=[_step(step, STEP_MODES[step.properties.type]) for step in route.steps],
            ) for route in _TransitPayload.model_validate(payload).routes]
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(502, "카카오 경로 데이터 형식이 올바르지 않아요.") from None
    return TransportRoutesResponse(mode=mode, status="ok", routes=routes, source="카카오맵", source_url=TRANSPORT_SOURCE_URL)


def _request_routes(mode: TransportMode, params: dict[str, float | str], settings: Settings) -> dict:
    endpoint = "walk" if mode == "walk" else "publictraffic"
    try:
        response = httpx.get(
            f"{ROUTING_API}/{endpoint}", params=params,
            headers={"Authorization": f"KakaoAK {settings.rest_key}"},
            timeout=10.0, follow_redirects=False,
        )
    except httpx.TimeoutException:
        raise HTTPException(504, "카카오 경로 조회 응답이 늦어요. 잠시 후 다시 시도해 주세요.") from None
    except httpx.RequestError:
        raise HTTPException(503, "카카오 경로 서버에 연결하지 못했어요. 네트워크를 확인해 주세요.") from None
    if response.status_code in {401, 403}:
        raise HTTPException(503, "카카오 API 인증 또는 경로 조회 권한 설정을 확인해 주세요.")
    if response.status_code == 429:
        raise HTTPException(429, "카카오 경로 API 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.")
    if response.status_code != 200:
        raise HTTPException(502, "카카오 경로 서버가 요청을 처리하지 못했어요.")
    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(502, "카카오 경로 API 응답 형식이 올바르지 않아요.") from None
    if not isinstance(payload, dict):
        raise HTTPException(502, "카카오 경로 API 응답 형식이 올바르지 않아요.")
    return payload


def get_routes(mode: TransportMode, start_latitude: float, start_longitude: float,
               end_latitude: float, end_longitude: float, settings: Settings) -> TransportRoutesResponse:
    if not valid_key(settings.rest_key):
        raise HTTPException(503, "카카오 REST API 키 설정을 확인해 주세요.")
    cache_key = (mode, start_latitude, start_longitude, end_latitude, end_longitude)
    with _cache_lock:
        cached = _cache.get(cache_key)
        if cached is not None:
            if monotonic() < cached[0]:
                _cache.move_to_end(cache_key)
                return cached[1]
            del _cache[cache_key]
    # 외부 통신은 잠금 밖에서 실행해 서로 다른 구간 조회를 직렬화하지 않는다.
    result = _parse_routes(mode, _request_routes(mode, {
        "start_x": start_longitude, "start_y": start_latitude,
        "end_x": end_longitude, "end_y": end_latitude,
        "input_coord": "WGS84", "output_coord": "WGS84",
    }, settings))
    if result.status == "ok":
        with _cache_lock:
            _cache[cache_key] = (monotonic() + CACHE_TTL_SECONDS, result)
            _cache.move_to_end(cache_key)
            while len(_cache) > CACHE_MAX_SIZE:
                _cache.popitem(last=False)
    return result
