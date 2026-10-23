from datetime import date, datetime, timedelta, timezone
from typing import Annotated

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ...settings import env
from .models import WeatherForecast, WeatherSlot

FORECAST_API = "https://api.openweathermap.org/data/2.5/forecast"
SOURCE = "OpenWeather 5 Day / 3 Hour Forecast"
SOURCE_URL = "https://openweathermap.org/api/forecast5"
KST = timezone(timedelta(hours=9))
# 기획안의 초기 정책: 강수확률 60% 이상이면 실내 대안을 권한다 (예보 정확도를 뜻하지 않음)
RAIN_THRESHOLD = 60


class OwmWeather(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: str


class OwmMain(BaseModel):
    model_config = ConfigDict(extra="ignore")

    temp: float


class OwmItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dt: int
    main: OwmMain
    weather: Annotated[list[OwmWeather], Field(min_length=1)]
    pop: Annotated[float, Field(ge=0, le=1)]


class OwmPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    list: Annotated[list[OwmItem], Field(max_length=60)]


def request_forecast(latitude: float, longitude: float) -> dict:
    key = env("OPENWEATHER_API_KEY")
    if not key:
        raise HTTPException(503, "날씨 API 키(OPENWEATHER_API_KEY)가 아직 없어요.")
    try:
        response = httpx.get(
            FORECAST_API,
            params={"lat": latitude, "lon": longitude, "appid": key, "units": "metric", "lang": "kr"},
            timeout=10.0,
            follow_redirects=False,
        )
    except httpx.TimeoutException:
        raise HTTPException(504, "날씨 예보 응답이 늦어요. 잠시 후 다시 시도해 주세요.") from None
    except httpx.RequestError:
        raise HTTPException(503, "날씨 서버에 연결하지 못했어요. 네트워크를 확인해 주세요.") from None

    if response.status_code == 401:
        raise HTTPException(503, "날씨 API 키가 올바르지 않거나 아직 활성화되지 않았어요.")
    if response.status_code == 429:
        raise HTTPException(429, "날씨 API 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.")
    if response.status_code != 200:
        raise HTTPException(502, "날씨를 불러오지 못했어요.")
    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(502, "날씨 API 응답 형식이 올바르지 않아요.") from None
    if not isinstance(payload, dict):
        raise HTTPException(502, "날씨 API 응답 형식이 올바르지 않아요.")
    return payload


def get_forecast(latitude: float, longitude: float, day: date) -> WeatherForecast:
    payload = request_forecast(latitude, longitude)
    try:
        items = OwmPayload.model_validate(payload).list
    except ValidationError:
        raise HTTPException(502, "날씨 예보 데이터 형식이 올바르지 않아요.") from None

    slots = []
    for item in items:
        at = datetime.fromtimestamp(item.dt, tz=KST)
        if at.date() != day:
            continue
        probability = round(item.pop * 100)
        slots.append(WeatherSlot(
            time=at.isoformat(timespec="minutes"),
            temperature=round(item.main.temp, 1),
            rain_probability=probability,
            condition=item.weather[0].description,
            rain_expected=probability >= RAIN_THRESHOLD,
        ))
    return WeatherForecast(
        date=day.isoformat(),
        status="ok" if slots else "out_of_range",
        slots=slots,
        rain_threshold=RAIN_THRESHOLD,
        source=SOURCE,
        source_url=SOURCE_URL,
        fetched_at=datetime.now(KST).isoformat(timespec="seconds"),
    )
