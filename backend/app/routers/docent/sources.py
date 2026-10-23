"""해설 근거 수집: 공공 관광지 카탈로그 · 한국관광공사 TourAPI · 국가유산청. 실패한 출처는 건너뛴다."""
import math
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from functools import lru_cache

import httpx

from ...settings import env

TOUR_API = "https://apis.data.go.kr/B551011/KorService2"
TOUR_SOURCE_URL = "https://www.data.go.kr/data/15101578/openapi.do"
HERITAGE_LIST = "https://www.khs.go.kr/cha/SearchKindOpenapiList.do"
HERITAGE_DETAIL = "https://www.khs.go.kr/cha/SearchKindOpenapiDt.do"
HERITAGE_PAGE = "https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno={}"
BUSAN_SIDO_CODE = "21"
HERITAGE_RADIUS_KM = 1.0
MAX_TEXT = 1500


@dataclass(frozen=True)
class Evidence:
    kind: str     # catalog | tour | heritage
    label: str
    source: str
    url: str
    date: str | None
    text: str


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()[:MAX_TEXT]


def _normalize_title(title: str) -> str:
    return re.sub(r"\(.*?\)|\s", "", title)


def _tour_params() -> dict | None:
    key = env("DATA_GO_KR_SERVICE_KEY")
    return {"serviceKey": key, "MobileOS": "ETC", "MobileApp": "PinDay", "_type": "json"} if key else None


def _items(payload: dict) -> list[dict]:
    items = payload["response"]["body"]["items"] or {}
    items = items.get("item", []) if isinstance(items, dict) else []
    return items if isinstance(items, list) else []


def find_tour_item(name: str, latitude: float, longitude: float) -> dict | None:
    """TourAPI 에서 같은 장소 찾기: 이름이 포함된 항목 중 정확히 같은 이름 우선, 그다음 가까운 순 (3km 이내)."""
    base = _tour_params()
    if base is None:
        return None
    try:
        found = httpx.get(f"{TOUR_API}/searchKeyword2", params={**base, "keyword": name, "numOfRows": 20, "pageNo": 1}, timeout=10.0).json()
        items = _items(found)
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None
    target = _normalize_title(name)

    def score(item: dict) -> tuple[int, float]:
        exact = 0 if _normalize_title(item.get("title", "")) == target else 1
        try:
            gap = distance_km(latitude, longitude, float(item["mapy"]), float(item["mapx"]))
        except (KeyError, ValueError):
            gap = 999.0
        return exact, gap

    candidates = [item for item in items if target in _normalize_title(item.get("title", ""))]
    if not candidates:
        return None
    best = min(candidates, key=score)
    return best if score(best)[1] <= 3.0 else None


def tour_overview(name: str, latitude: float, longitude: float) -> Evidence | None:
    best = find_tour_item(name, latitude, longitude)
    if best is None:
        return None
    try:
        detail = httpx.get(f"{TOUR_API}/detailCommon2", params={**_tour_params(), "contentId": best["contentid"]}, timeout=10.0).json()
        info = _items(detail)[0]
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        return None
    overview = clean(info.get("overview", ""))
    if not overview:
        return None
    modified = info.get("modifiedtime", "")
    date = f"{modified[:4]}-{modified[4:6]}-{modified[6:8]}" if len(modified) >= 8 else None
    return Evidence("tour", f"{info.get('title', name)} 관광정보", "한국관광공사 TourAPI", TOUR_SOURCE_URL, date, overview)


LICENSES = {"Type1": "공공누리 제1유형(출처표시)", "Type3": "공공누리 제3유형(출처표시·변경금지)"}
MAX_PHOTOS = 8


def tour_photos(name: str, latitude: float, longitude: float) -> list[dict]:
    """장소 사진 (TourAPI 대표 이미지 + detailImage2). 공공누리 유형이 확인된 사진만."""
    best = find_tour_item(name, latitude, longitude)
    if best is None:
        return []
    photos: list[dict] = []
    if best.get("firstimage") and best.get("cpyrhtDivCd") in LICENSES:
        photos.append({"url": best["firstimage"], "thumbnail_url": best.get("firstimage2") or best["firstimage"],
                       "title": best.get("title", name), "license": LICENSES[best["cpyrhtDivCd"]]})
    try:
        images = _items(httpx.get(f"{TOUR_API}/detailImage2", params={**_tour_params(), "contentId": best["contentid"], "imageYN": "Y", "numOfRows": 20}, timeout=10.0).json())
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        images = []
    for image in images:
        url = image.get("originimgurl", "")
        if url.startswith("https://") and image.get("cpyrhtDivCd") in LICENSES:
            photos.append({"url": url, "thumbnail_url": image.get("smallimageurl") or url,
                           "title": image.get("imgname") or best.get("title", name), "license": LICENSES[image["cpyrhtDivCd"]]})
    unique = {photo["url"]: photo for photo in photos if photo["url"].startswith("https://")}
    return list(unique.values())[:MAX_PHOTOS]


@lru_cache(maxsize=4)
def _heritage_list(sido_code: str) -> tuple[dict, ...]:
    response = httpx.get(HERITAGE_LIST, params={"ccbaCtcd": sido_code, "pageUnit": 2000}, timeout=20.0)
    response.raise_for_status()
    root = ET.fromstring(response.content)
    items = []
    for item in root.iter("item"):
        try:
            lat, lng = float(item.findtext("latitude") or 0), float(item.findtext("longitude") or 0)
        except ValueError:
            continue
        if lat and lng:
            items.append({
                "name": item.findtext("ccbaMnm1") or "", "kind": item.findtext("ccmaName") or "",
                "kdcd": item.findtext("ccbaKdcd"), "asno": item.findtext("ccbaAsno"),
                "ctcd": item.findtext("ccbaCtcd"), "cpno": item.findtext("ccbaCpno"), "lat": lat, "lng": lng,
            })
    return tuple(items)


def nearby_heritage(latitude: float, longitude: float, limit: int = 3) -> list[Evidence]:
    try:
        items = _heritage_list(BUSAN_SIDO_CODE)
    except (httpx.HTTPError, ET.ParseError):
        return []
    near = sorted(
        (item for item in items if distance_km(latitude, longitude, item["lat"], item["lng"]) <= HERITAGE_RADIUS_KM),
        key=lambda item: distance_km(latitude, longitude, item["lat"], item["lng"]),
    )[:limit]
    evidences = []
    for item in near:
        try:
            detail = ET.fromstring(httpx.get(HERITAGE_DETAIL, params={"ccbaKdcd": item["kdcd"], "ccbaAsno": item["asno"], "ccbaCtcd": item["ctcd"]}, timeout=10.0).content)
            content = clean(detail.findtext(".//content") or "")
        except (httpx.HTTPError, ET.ParseError):
            continue
        if content:
            label = f"{item['name']} ({item['kind']})" if item["kind"] else item["name"]
            evidences.append(Evidence("heritage", label, "국가유산청", HERITAGE_PAGE.format(item["cpno"]), None, content))
    return evidences
