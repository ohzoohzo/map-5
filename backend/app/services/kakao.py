import math
from typing import Annotated

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ..models import Place, SearchResponse
from ..settings import Settings, valid_key

SEARCH_API = "https://dapi.kakao.com/v2/local/search/keyword.json"
ADDRESS_API = "https://dapi.kakao.com/v2/local/search/address.json"
SEARCH_SOURCE = "카카오 로컬 API"
SEARCH_SOURCE_URL = "https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword"


class KakaoDocument(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore")

    id: Annotated[str, Field(min_length=1)]
    place_name: Annotated[str, Field(min_length=1)]
    address_name: str
    road_address_name: str
    category_group_name: str
    category_name: str
    phone: str
    place_url: str
    x: str
    y: str


class KakaoSearchPayload(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore")

    documents: list[KakaoDocument]


def request_json(url: str, params: dict[str, str | int], settings: Settings) -> dict:
    if not valid_key(settings.rest_key):
        raise HTTPException(503, "카카오 REST API 키 설정을 확인해 주세요.")
    try:
        response = httpx.get(
            url,
            params=params,
            headers={"Authorization": f"KakaoAK {settings.rest_key}"},
            timeout=10.0,
            follow_redirects=False,
        )
    except httpx.TimeoutException:
        raise HTTPException(504, "카카오 장소 검색 응답이 늦어요. 잠시 후 다시 시도해 주세요.") from None
    except httpx.RequestError:
        raise HTTPException(503, "카카오 서버에 연결하지 못했어요. 네트워크를 확인해 주세요.") from None

    if response.status_code in {401, 403}:
        raise HTTPException(503, "카카오 API 인증 또는 사용 권한 설정을 확인해 주세요.")
    if response.status_code == 429:
        raise HTTPException(429, "카카오 API 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.")
    if response.status_code >= 500:
        raise HTTPException(502, "카카오 서버에서 오류가 발생했어요. 잠시 후 다시 시도해 주세요.")
    if response.status_code != 200:
        raise HTTPException(502, "카카오 API가 요청을 처리하지 못했어요.")
    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(502, "카카오 API 응답 형식이 올바르지 않아요.") from None
    if not isinstance(payload, dict):
        raise HTTPException(502, "카카오 API 응답 형식이 올바르지 않아요.")
    return payload


def search_places(query: str, settings: Settings) -> SearchResponse:
    payload = request_json(SEARCH_API, {"query": query, "size": 15}, settings)
    try:
        documents = KakaoSearchPayload.model_validate(payload).documents
        if len(documents) > 15:
            raise ValueError("요청한 결과 수를 초과했어요.")
        places = []
        for item in documents:
            address = item.road_address_name.strip()
            if not address:
                address = item.address_name.strip()
            category = item.category_group_name.strip()
            if not category:
                category = item.category_name.strip()
            places.append(
                Place(
                    id=f"kakao:{item.id}",
                    name=item.place_name,
                    address=address,
                    latitude=float(item.y),
                    longitude=float(item.x),
                    category=category,
                    description=item.category_name,
                    phone=item.phone,
                    source=SEARCH_SOURCE,
                    source_date=None,
                    url=item.place_url,
                )
            )
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(502, "카카오 장소 데이터 형식이 올바르지 않아요.") from None
    return SearchResponse(
        places=places,
        total=len(places),
        source=SEARCH_SOURCE,
        source_url=SEARCH_SOURCE_URL,
        date_min=None,
        date_max=None,
    )


def geocode_address(address: str, settings: Settings) -> tuple[float, float] | None:
    """Return (latitude, longitude); configuration/network errors always stop the job."""
    payload = request_json(ADDRESS_API, {"query": address, "size": 1}, settings)
    documents = payload.get("documents")
    if not isinstance(documents, list):
        raise HTTPException(502, "카카오 주소 데이터 형식이 올바르지 않아요.")
    if not documents:
        return None
    item = documents[0]
    if not isinstance(item, dict) or not isinstance(item.get("x"), str) or not isinstance(item.get("y"), str):
        raise HTTPException(502, "카카오 주소 데이터 형식이 올바르지 않아요.")
    try:
        latitude, longitude = float(item["y"]), float(item["x"])
    except ValueError:
        raise HTTPException(502, "카카오 주소 좌표 형식이 올바르지 않아요.") from None
    if not (math.isfinite(latitude) and math.isfinite(longitude) and 33 <= latitude <= 39 and 124 <= longitude <= 132):
        raise HTTPException(502, "카카오 주소 좌표가 국내 범위를 벗어났어요.")
    return latitude, longitude
