from typing import Annotated, Literal

from pydantic import Field

from ...models import StrictModel

TransportMode = Literal["transit", "walk"]
TransportNonnegativeInt = Annotated[int, Field(ge=0)]
TRANSPORT_SOURCE_URL = "https://developers.kakao.com/docs/ko/kakaomap/rest-api#routing"


class TransportPoint(StrictModel):
    latitude: Annotated[float, Field(ge=33.0, le=39.0, allow_inf_nan=False)]
    longitude: Annotated[float, Field(ge=124.0, le=132.0, allow_inf_nan=False)]


class TransportStep(StrictModel):
    mode: Literal["walk", "bus", "subway"]
    instruction: Annotated[str, Field(min_length=1)]
    distance_m: TransportNonnegativeInt
    duration_seconds: TransportNonnegativeInt
    path: Annotated[list[TransportPoint], Field(min_length=2)]


class TransportRoute(StrictModel):
    type: Literal["walk", "bus", "subway", "mixed"]
    distance_m: TransportNonnegativeInt
    duration_seconds: TransportNonnegativeInt
    transfers: TransportNonnegativeInt | None
    fare_won: TransportNonnegativeInt | None
    steps: Annotated[list[TransportStep], Field(min_length=1)]


class TransportRoutesResponse(StrictModel):
    mode: TransportMode
    status: Literal["ok", "no_route"]
    routes: list[TransportRoute]
    source: Literal["카카오맵"]
    source_url: str
