import re
from functools import lru_cache

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError

from ...settings import env
from .models import WeatherPhoto

# 한국관광공사 관광사진 정보 (공공데이터포털, DATA_GO_KR_SERVICE_KEY)
GALLERY_API = "https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1"
SOURCE = "한국관광공사 관광사진"
SOURCE_URL = "https://www.data.go.kr/data/15101914/openapi.do"
# 여러 시·도에 같은 이름이 있는 구 — 이 이름만으로는 지역을 확정하지 않는다
AMBIGUOUS_DISTRICTS = {"중구", "동구", "서구", "남구", "북구", "강서구"}


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
        items = response.json()["response"]["body"]["items"]
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
    장소 사진이 아니면 match 와 label 로 그 사실을 화면에 알린다. 키가 없거나 다 실패하면 None."""
    name = name.strip()
    if not env("DATA_GO_KR_SERVICE_KEY") or not name:
        return None
    parts = address.split()
    province = parts[0] if parts else ""
    district = parts[1] if len(parts) > 1 and re.search(r"(구|군|시)$", parts[1]) else ""

    def in_province(item: GalleryItem) -> bool:
        return not province or province[:2] in item.galPhotographyLocation

    def in_district(item: GalleryItem) -> bool:
        if district not in item.galPhotographyLocation:
            return False
        return district not in AMBIGUOUS_DISTRICTS or in_province(item)

    steps = [(name, lambda item: _names(item, name) and in_province(item), "place", name)]
    main_word = max(name.split(), key=len) if " " in name else ""
    if len(main_word) >= 2:
        steps.append((main_word, lambda item: _names(item, main_word) and in_province(item), "related", main_word))
    if district:
        steps.append((district, in_district, "area", district))
    if province:
        steps.append((province, in_province, "area", province))

    for keyword, accept, match, label in steps:
        try:
            items = [item for item in _gallery(keyword) if accept(item)]
        except _Unavailable:
            continue
        if items:
            return _photo(items[0] if match == "place" else _pick(items, name), match, label)
    return None
