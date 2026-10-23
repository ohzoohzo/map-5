from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from ..models import CatalogResponse, ErrorResponse, SearchResponse
from ..services.catalog import get_catalog as load_catalog
from ..services.kakao import search_places as find_places
from ..settings import Settings, get_settings

router = APIRouter(prefix="/api/travel", tags=["travel"])
SettingsDependency = Annotated[Settings, Depends(get_settings)]
# Kakao category group codes the explore page filters by: food, cafe, attraction, culture.
PlaceCategory = Literal["FD6", "CE7", "AT4", "CT1"]


@router.get(
    "/catalog", response_model=CatalogResponse, operation_id="get_catalog",
    responses={503: {"model": ErrorResponse}},
)
def get_catalog(
    settings: SettingsDependency,
    region: Annotated[str, Query(max_length=80)] = "",
    query: Annotated[str, Query(max_length=100)] = "",
) -> CatalogResponse:
    return load_catalog(settings.catalog_path, region.strip(), query.strip())


@router.get(
    "/search", response_model=SearchResponse, operation_id="search_places",
    responses={422: {"model": ErrorResponse}, 429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 503: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
def search_places(
    settings: SettingsDependency,
    query: Annotated[str, Query(min_length=1, max_length=100)],
    category: PlaceCategory | None = None,
) -> SearchResponse:
    normalized = query.strip()
    if not normalized:
        raise HTTPException(422, "검색할 장소나 지역을 입력해 주세요.")
    return find_places(normalized, settings, category)
