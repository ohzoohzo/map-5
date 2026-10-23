from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Place(StrictModel):
    id: Annotated[str, Field(min_length=1)]
    name: Annotated[str, Field(min_length=1)]
    address: str
    latitude: Annotated[float, Field(ge=33.0, le=39.0, allow_inf_nan=False)]
    longitude: Annotated[float, Field(ge=124.0, le=132.0, allow_inf_nan=False)]
    category: str
    description: str
    phone: str
    source: Annotated[str, Field(min_length=1)]
    source_date: str | None
    url: str

    @field_validator("source_date")
    @classmethod
    def valid_source_date(cls, value: str | None) -> str | None:
        if value is not None:
            from datetime import date

            if date.fromisoformat(value).isoformat() != value:
                raise ValueError("기준일은 YYYY-MM-DD 형식이어야 해요.")
        return value

    @field_validator("url")
    @classmethod
    def safe_url(cls, value: str) -> str:
        if value:
            parsed = urlparse(value)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("출처 링크 형식이 올바르지 않아요.")
        return value


class ConfigResponse(StrictModel):
    js_key: str
    place_search_enabled: bool


class CatalogResponse(StrictModel):
    places: Annotated[list[Place], Field(max_length=200)]
    total: Annotated[int, Field(ge=0, le=200)]
    regions: list[str]
    source: str
    source_url: str
    date_min: str | None
    date_max: str | None
    total_catalog: Annotated[int, Field(ge=0)]


class SearchResponse(StrictModel):
    places: Annotated[list[Place], Field(max_length=15)]
    total: Annotated[int, Field(ge=0, le=15)]
    source: Literal["카카오 로컬 API"]
    source_url: str
    date_min: None
    date_max: None


class HealthResponse(StrictModel):
    status: Literal["ok"]


class ErrorResponse(StrictModel):
    detail: str
