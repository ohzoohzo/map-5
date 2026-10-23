from typing import Annotated, Literal

from pydantic import Field

from ...models import Place, StrictModel


class WeatherSlot(StrictModel):
    """3시간 단위 예보 한 칸. time 은 API 가 실제 반환한 시각을 한국 시간으로 바꾼 값."""
    time: str  # YYYY-MM-DDTHH:MM+09:00
    temperature: float
    rain_probability: Annotated[int, Field(ge=0, le=100)]
    condition: str
    rain_expected: bool


class WeatherForecast(StrictModel):
    date: str
    # out_of_range: 그 날짜의 예보가 아직(또는 더 이상) 없음 → 화면에서 '날씨 미확정'
    status: Literal["ok", "out_of_range"]
    slots: list[WeatherSlot]
    rain_threshold: Annotated[int, Field(ge=0, le=100)]
    source: Literal["OpenWeather 5 Day / 3 Hour Forecast"]
    source_url: str
    fetched_at: str


class WeatherAlternative(StrictModel):
    place: Place
    distance_km: Annotated[float, Field(ge=0)]  # 좌표 직선거리 (실제 이동거리 아님)
    indoor_hint: str  # 실내로 판단한 근거가 된 이름 속 단어 (예: '미술관')


class WeatherAlternatives(StrictModel):
    # 원래 장소 이름으로 본 실내 여부 근거. None = 이름만으로는 실내라고 볼 수 없음
    origin_indoor_hint: str | None
    alternatives: Annotated[list[WeatherAlternative], Field(max_length=8)]
    radius_km: float
    source: str
    source_url: str
