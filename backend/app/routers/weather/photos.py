import re
from functools import lru_cache

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, ValidationError

from ...settings import env
from .models import WeatherPhoto

# 한국관광공사 관광사진 정보 (공공데이터포털, DATA_GO_KR_SERVICE_KEY)
GALLERY_API = "https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1"
SOURCE = "한국관광공사 관광사진"
SOURCE_URL = "https://www.data.go.kr/data/15101914/openapi.do"
# frontend/src/shared/regions.ts의 전체명·짧은명 기준. 경남/경북처럼 앞 두 글자가 같은 도를 구분한다.
PROVINCE_ALIASES = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
    "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
    "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주", "전남광주통합특별시": "전남·광주",
}


class GalleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    galTitle: str
    galWebImageUrl: str
    galPhotographer: str = ""
    galSearchKeyword: str = ""
    galPhotographyLocation: str = ""


class _Unavailable(Exception):
    """일시적 실패: 캐시에 남기지 않으려고 lru_cache 밖으로 던진다."""


def _normalize(text: str) -> str:
    return re.sub(r"\(.*?\)|\s", "", text)


def _province(address: str) -> str:
    parts = address.split()
    first = parts[0] if parts else ""
    return PROVINCE_ALIASES.get(first, first)


@lru_cache(maxsize=512)
def _gallery(keyword: str) -> tuple[GalleryItem, ...]:
    try:
        response = httpx.get(
            GALLERY_API,
            params={"serviceKey": env("DATA_GO_KR_SERVICE_KEY"), "MobileOS": "ETC", "MobileApp": "PinDay", "_type": "json", "keyword": keyword, "numOfRows": 40, "pageNo": 1},
            timeout=8.0, follow_redirects=False,
        )
        if response.status_code != 200:
            raise _Unavailable
        payload = response.json()["response"]
        if payload["header"]["resultCode"] not in {"0000", "00"}:
            raise _Unavailable
        items = payload["body"]["items"]
        raw = items.get("item", []) if isinstance(items, dict) else []
        found = tuple(GalleryItem.model_validate(item) for item in (raw if isinstance(raw, list) else []))
    except (httpx.HTTPError, ValueError, KeyError, TypeError, ValidationError):
        raise _Unavailable from None
    return tuple(item for item in found if item.galWebImageUrl.startswith("https://"))


def _names(item: GalleryItem, target: str) -> bool:
    """제목이 이름을 담거나, 사진 검색 태그에 이름이 그대로 있을 때만 그 장소 사진으로 본다."""
    key = _normalize(target)
    return key in _normalize(item.galTitle) or any(_normalize(tag) == key for tag in item.galSearchKeyword.split(","))


def _photo(item: GalleryItem, match: str, label: str) -> WeatherPhoto:
    return WeatherPhoto(url=item.galWebImageUrl, title=item.galTitle, photographer=item.galPhotographer.strip(),
                        match=match, label=label, source=SOURCE, source_url=SOURCE_URL)


def _pick(items: list[GalleryItem], seed: str) -> GalleryItem:
    """같은 지역 사진을 여러 장소가 함께 쓸 때 장소마다 다른 사진이 되도록 이름으로 고른다."""
    return items[sum(map(ord, seed)) % len(items)]


def find_photo(name: str, address: str = "") -> WeatherPhoto | None:
    """장소 사진 → 이름의 주요 단어 사진 → 구·군 사진 → 시·도 사진 순으로 한 장.
    장소 사진이 아니면 match 와 label 로 알린다. 정상 검색에 결과가 없으면 None, 검색 실패는 502."""
    name = name.strip()
    if not env("DATA_GO_KR_SERVICE_KEY") or not name:
        return None
    parts = address.split()
    province = parts[0] if parts else ""
    district = parts[1] if len(parts) > 1 and re.search(r"(구|군|시)$", parts[1]) else ""

    def in_province(item: GalleryItem) -> bool:
        return not province or _province(address) == _province(item.galPhotographyLocation)

    def in_district(item: GalleryItem) -> bool:
        return in_province(item) and district in item.galPhotographyLocation.split()[1:]

    steps = [(name, lambda item: _names(item, name) and in_province(item), "place", name)]
    main_word = max(name.split(), key=len) if " " in name else ""
    if len(main_word) >= 2:
        steps.append((main_word, lambda item: _names(item, main_word) and in_province(item), "related", main_word))
    if district:
        steps.append((district, in_district, "area", district))
    if province:
        steps.append((province, in_province, "area", province))

    unavailable = False
    for keyword, accept, match, label in steps:
        try:
            items = [item for item in _gallery(keyword) if accept(item)]
        except _Unavailable:
            unavailable = True
            continue
        if items:
            return _photo(items[0] if match == "place" else _pick(items, name), match, label)
    if unavailable:
        raise HTTPException(502, "관광사진을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
    return None
