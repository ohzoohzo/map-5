from typing import Annotated, Literal

from pydantic import Field

from ...models import StrictModel

TransportMode = Literal["transit", "walk", "car"]
TransportNonnegativeInt = Annotated[int, Field(ge=0)]
TRANSPORT_SOURCE_URL = "https://developers.kakao.com/docs/ko/kakaomap/rest-api#routing"
TRANSPORT_CAR_SOURCE_URL = "https://developers.kakaomobility.com/guide/navi-api/directions"


class TransportPoint(StrictModel):
    latitude: Annotated[float, Field(ge=33.0, le=39.0, allow_inf_nan=False)]
    longitude: Annotated[float, Field(ge=124.0, le=132.0, allow_inf_nan=False)]


class TransportStep(StrictModel):
    mode: Literal["walk", "bus", "subway", "car"]
    instruction: Annotated[str, Field(min_length=1)]
    distance_m: TransportNonnegativeInt
    duration_seconds: TransportNonnegativeInt
    path: Annotated[list[TransportPoint], Field(min_length=2)]


class TransportRoute(StrictModel):
    type: Literal["walk", "bus", "subway", "mixed", "car"]
    distance_m: TransportNonnegativeInt
    duration_seconds: TransportNonnegativeInt
    transfers: TransportNonnegativeInt | None
    fare_won: TransportNonnegativeInt | None
    toll_won: TransportNonnegativeInt | None = None
    steps: Annotated[list[TransportStep], Field(min_length=1)]


class TransportRoutesResponse(StrictModel):
    mode: TransportMode
    status: Literal["ok", "no_route"]
    routes: list[TransportRoute]
    source: Literal["카카오맵", "카카오모빌리티"]
    source_url: str
