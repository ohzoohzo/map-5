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


class GalleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    galTitle: str
    galWebImageUrl: str
    galPhotographer: str = ""
    galSearchKeyword: str = ""


def _normalize(text: str) -> str:
    return re.sub(r"\(.*?\)|\s", "", text)


def _matches(item: GalleryItem, name: str) -> bool:
    """제목이 장소 이름을 담거나, 사진 검색 태그에 장소 이름이 그대로 있을 때만 그 장소 사진으로 본다."""
    target = _normalize(name)
    if target in _normalize(item.galTitle):
        return True
    return any(_normalize(tag) == target for tag in item.galSearchKeyword.split(","))


class _Unavailable(Exception):
    """일시적 실패: 캐시에 남기지 않으려고 lru_cache 밖으로 던진다."""


def find_photo(name: str) -> WeatherPhoto | None:
    """장소 이름으로 사진 한 장. 키가 없거나 실패·불일치면 None (화면은 아이콘으로 대신한다)."""
    if not env("DATA_GO_KR_SERVICE_KEY") or not name.strip():
        return None
    try:
        return _lookup(name.strip())
    except _Unavailable:
        return None


@lru_cache(maxsize=512)
def _lookup(name: str) -> WeatherPhoto | None:
    try:
        response = httpx.get(
            GALLERY_API,
            params={"serviceKey": env("DATA_GO_KR_SERVICE_KEY"), "MobileOS": "ETC", "MobileApp": "PinDay", "_type": "json", "keyword": name, "numOfRows": 20, "pageNo": 1},
            timeout=8.0, follow_redirects=False,
        )
        if response.status_code != 200:
            raise _Unavailable
        items = response.json()["response"]["body"]["items"]
        raw = items.get("item", []) if isinstance(items, dict) else []
        candidates = [GalleryItem.model_validate(item) for item in (raw if isinstance(raw, list) else [])]
    except (httpx.HTTPError, ValueError, KeyError, TypeError, ValidationError):
        raise _Unavailable from None
    for item in candidates:
        if item.galWebImageUrl.startswith("https://") and _matches(item, name):
            return WeatherPhoto(url=item.galWebImageUrl, title=item.galTitle, photographer=item.galPhotographer.strip(), source=SOURCE, source_url=SOURCE_URL)
    return None
