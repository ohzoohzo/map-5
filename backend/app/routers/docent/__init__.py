"""AI 도슨트 · 담당 명근. 이 폴더 안에서만 작업한다 (models.py, service.py 등 자유롭게 추가)."""
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ...models import ErrorResponse, FeatureStatus
from ...services.catalog import read_catalog
from ...settings import Settings, env, get_settings
from .models import DocentNews, DocentNewsItem, DocentPhoto, DocentPhotos, DocentReference, DocentSection, DocentStory
from .news import search_news
from .sources import TOUR_SOURCE_URL, Evidence, clean, nearby_heritage, tour_overview, tour_photos
from .writer import model_name, write_story

router = APIRouter(prefix="/api/docent", tags=["docent"])

SECTION_TITLES = {"history": "역사와 문화", "feature": "동네의 특징", "tip": "방문 전 알아두기"}
KST = timezone(timedelta(hours=9))
_cache: dict[str, DocentStory] = {}  # 같은 장소 반복 과금 방지 (서버 재시작 시 초기화)
_news_cache: dict[str, tuple[datetime, DocentNews]] = {}
NEWS_TTL = timedelta(hours=6)
_photo_cache: dict[str, DocentPhotos] = {}


@router.get("/status", response_model=FeatureStatus, operation_id="docent_status")
def docent_status() -> FeatureStatus:
    ready = bool(env("OPENAI_API_KEY"))
    return FeatureStatus(
        feature="docent", ready=ready,
        message="도슨트 해설 생성 준비됨" if ready else "OpenAI API 키가 아직 없어요.",
    )


def catalog_evidence(place_id: str, settings: Settings) -> Evidence | None:
    if not place_id.startswith("tourism:"):
        return None
    try:
        entry = next((entry for entry in read_catalog(settings.catalog_path) if entry.place.id == place_id), None)
    except Exception:  # 카탈로그 문제는 해설 전체를 막지 않는다
        return None
    if entry is None or not clean(entry.place.description):
        return None
    place = entry.place
    return Evidence("catalog", f"{place.name} 공공데이터 소개", place.source, place.url, place.source_date, clean(place.description))


@router.get(
    "/story", response_model=DocentStory, operation_id="docent_story",
    responses={429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 503: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
def docent_story(
    settings: Annotated[Settings, Depends(get_settings)],
    place_id: Annotated[str, Query(min_length=1, max_length=120)],
    name: Annotated[str, Query(min_length=1, max_length=100)],
    latitude: Annotated[float, Query(ge=33.0, le=39.0)],
    longitude: Annotated[float, Query(ge=124.0, le=132.0)],
    address: Annotated[str, Query(max_length=200)] = "",
) -> DocentStory:
    if place_id in _cache:
        return _cache[place_id]

    evidences = [item for item in (catalog_evidence(place_id, settings), tour_overview(name, latitude, longitude)) if item]
    evidences += nearby_heritage(latitude, longitude)
    references = [
        DocentReference(index=index, kind=item.kind, label=item.label, source=item.source, url=item.url, date=item.date)
        for index, item in enumerate(evidences, start=1)
    ]

    if not evidences:
        return DocentStory(place_id=place_id, ready=False, message="이 장소의 근거 자료를 찾지 못해서 해설을 만들지 않았어요.",
                           summary="", sections=[], references=[], model=None, generated_at=None)
    if not env("OPENAI_API_KEY"):
        return DocentStory(place_id=place_id, ready=False, message="AI 해설 연동 전이에요. 근거 자료는 아래에서 확인할 수 있어요.",
                           summary="", sections=[], references=references, model=None, generated_at=None)

    written = write_story(name, address, evidences)
    valid_indexes = {reference.index for reference in references}
    sections = [
        DocentSection(
            key=section["key"], title=SECTION_TITLES[section["key"]], body=section["body"],
            reference_indexes=sorted({index for index in section["reference_indexes"] if index in valid_indexes}),
        )
        for section in written.get("sections", []) if section.get("key") in SECTION_TITLES
    ]
    story = DocentStory(
        place_id=place_id, ready=True, message="근거 자료를 바탕으로 AI가 정리한 해설이에요. 원문으로 확인해 주세요.",
        summary=written.get("summary", ""), sections=sections, references=references,
        model=model_name(), generated_at=datetime.now(KST).isoformat(timespec="seconds"),
    )
    _cache[place_id] = story
    return story


@router.get(
    "/news", response_model=DocentNews, operation_id="docent_news",
    responses={429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 503: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
def docent_news(
    place_id: Annotated[str, Query(min_length=1, max_length=120)],
    name: Annotated[str, Query(min_length=1, max_length=100)],
    address: Annotated[str, Query(max_length=200)] = "",
) -> DocentNews:
    now = datetime.now(KST)
    cached = _news_cache.get(place_id)
    if cached and now - cached[0] < NEWS_TTL:
        return cached[1]
    if not env("OPENAI_API_KEY"):
        return DocentNews(place_id=place_id, ready=False, message="웹 검색 연동 전이에요.", items=[], model=None, searched_at=None)

    items = [DocentNewsItem(**item) for item in search_news(name, address, now)]
    news = DocentNews(
        place_id=place_id, ready=True,
        message="AI가 웹 검색으로 찾은 기사 요약이에요. 원문 링크로 확인해 주세요." if items else "최근 관련 소식을 찾지 못했어요.",
        items=items, model=model_name(), searched_at=now.isoformat(timespec="seconds"),
    )
    if items:  # 못 찾은 결과는 캐시하지 않아 다시 시도할 수 있게
        _news_cache[place_id] = (now, news)
    return news


@router.get("/photos", response_model=DocentPhotos, operation_id="docent_photos")
def docent_photos(
    place_id: Annotated[str, Query(min_length=1, max_length=120)],
    name: Annotated[str, Query(min_length=1, max_length=100)],
    latitude: Annotated[float, Query(ge=33.0, le=39.0)],
    longitude: Annotated[float, Query(ge=124.0, le=132.0)],
) -> DocentPhotos:
    """한국관광공사 사진 (최근 소식 검색을 기다리는 동안 보여준다). 실패하면 빈 목록."""
    if place_id in _photo_cache:
        return _photo_cache[place_id]
    result = DocentPhotos(
        place_id=place_id, photos=[DocentPhoto(**photo) for photo in tour_photos(name, latitude, longitude)],
        source="한국관광공사 TourAPI", source_url=TOUR_SOURCE_URL,
    )
    if result.photos:
        _photo_cache[place_id] = result
    return result
