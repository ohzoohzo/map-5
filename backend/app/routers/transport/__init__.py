from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ...models import ErrorResponse
from ...settings import Settings, get_settings
from .models import TransportMode, TransportRoutesResponse
from .service import get_routes

router = APIRouter(prefix="/api/transport", tags=["transport"])


@router.get(
    "/routes", response_model=TransportRoutesResponse, operation_id="transport_routes",
    responses={429: {"model": ErrorResponse}, 502: {"model": ErrorResponse}, 503: {"model": ErrorResponse}, 504: {"model": ErrorResponse}},
)
def transport_routes(
    settings: Annotated[Settings, Depends(get_settings)],
    mode: TransportMode,
    start_latitude: Annotated[float, Query(ge=33.0, le=39.0, allow_inf_nan=False)],
    start_longitude: Annotated[float, Query(ge=124.0, le=132.0, allow_inf_nan=False)],
    end_latitude: Annotated[float, Query(ge=33.0, le=39.0, allow_inf_nan=False)],
    end_longitude: Annotated[float, Query(ge=124.0, le=132.0, allow_inf_nan=False)],
) -> TransportRoutesResponse:
    """카카오맵 도보·대중교통 및 카카오모빌리티 자동차 경로의 실제 경로 좌표를 반환한다."""
    return get_routes(mode, start_latitude, start_longitude, end_latitude, end_longitude, settings)
