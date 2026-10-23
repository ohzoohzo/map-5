"""날씨 대안 · 담당 현경. 이 폴더 안에서만 작업한다 (models.py, service.py 등 자유롭게 추가)."""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ...models import ErrorResponse, FeatureStatus
from ...settings import Settings, env, get_settings
from .alternatives import find_alternatives
from .models import WeatherAlternatives, WeatherForecast, WeatherPhotoResponse
from .photos import find_photo
from .service import get_forecast

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/status", response_model=FeatureStatus, operation_id="weather_status")
def weather_status() -> FeatureStatus:
    ready = bool(env("OPENWEATHER_API_KEY"))
    return FeatureStatus(
        feature="weather", ready=ready,
        message="날씨 예보 연동 준비됨" if ready else "날씨 API 키가 아직 없어요.",
    )


@router.get(
    "/forecast", response_model=WeatherForecast, operation_id="weather_forecast",
    responses={429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 503: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
def weather_forecast(
    latitude: Annotated[float, Query(ge=33.0, le=39.0)],
    longitude: Annotated[float, Query(ge=124.0, le=132.0)],
    day: Annotated[date, Query(alias="date")],
) -> WeatherForecast:
    """장소 좌표의 그 날짜(한국 시간) 3시간 단위 예보. 5일 범위 밖이면 status=out_of_range."""
    return get_forecast(latitude, longitude, day)


@router.get(
    "/alternatives", response_model=WeatherAlternatives, operation_id="weather_alternatives",
    responses={503: {"model": ErrorResponse}},
)
def weather_alternatives(
    settings: Annotated[Settings, Depends(get_settings)],
    latitude: Annotated[float, Query(ge=33.0, le=39.0)],
    longitude: Annotated[float, Query(ge=124.0, le=132.0)],
    name: Annotated[str, Query(max_length=100)] = "",
) -> WeatherAlternatives:
    """원래 장소 근처(직선 30km)에서 이름으로 실내로 보이는 관광지를 가까운 순으로."""
    return find_alternatives(settings.catalog_path, latitude, longitude, name)


@router.get("/photo", response_model=WeatherPhotoResponse, operation_id="weather_photo")
def weather_photo(name: Annotated[str, Query(min_length=1, max_length=100)]) -> WeatherPhotoResponse:
    """장소 이름과 맞는 한국관광공사 관광사진 한 장. 없으면 photo=null."""
    return WeatherPhotoResponse(photo=find_photo(name.strip()))
