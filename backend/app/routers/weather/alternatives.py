import math
import re
from pathlib import Path

from ...services.catalog import CATALOG_SOURCE, CATALOG_SOURCE_URL, read_catalog
from .models import WeatherAlternative, WeatherAlternatives

# 관광 데이터의 분류는 대부분 '관광지'라서 실내 여부를 알 수 없다 → 이름 속 시설 단어로만 추정하고, 화면에서 '확인 필요'로 표시한다
INDOOR_WORDS = re.compile(
    "미술관|박물관|전시관|기념관|과학관|체험관|문학관|문화관|자료관|홍보관|역사관|천문대|아쿠아리움|수족관|"
    "도서관|공연장|영화관|극장|갤러리|카페|백화점|쇼핑|실내"
)
RADIUS_KM = 30.0
LIMIT = 8


def indoor_hint(name: str) -> str | None:
    match = INDOOR_WORDS.search(name)
    return match.group(0) if match else None


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 좌표의 직선(대권) 거리."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(a))


def find_alternatives(catalog_path: Path, latitude: float, longitude: float, name: str) -> WeatherAlternatives:
    found = []
    for entry in read_catalog(catalog_path):
        place = entry.place
        hint = indoor_hint(place.name)
        if hint is None:
            continue
        distance = distance_km(latitude, longitude, place.latitude, place.longitude)
        if distance <= RADIUS_KM:
            found.append(WeatherAlternative(place=place, distance_km=round(distance, 1), indoor_hint=hint))
    found.sort(key=lambda item: item.distance_km)
    return WeatherAlternatives(
        origin_indoor_hint=indoor_hint(name),
        alternatives=found[:LIMIT],
        radius_km=RADIUS_KM,
        source=CATALOG_SOURCE,
        source_url=CATALOG_SOURCE_URL,
    )
