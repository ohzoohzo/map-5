"""날씨 대안 · 담당 현경. 이 폴더 안에서만 작업한다 (models.py, service.py 등 자유롭게 추가)."""
from fastapi import APIRouter

from ...models import FeatureStatus
from ...settings import env

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/status", response_model=FeatureStatus, operation_id="weather_status")
def weather_status() -> FeatureStatus:
    ready = bool(env("OPENWEATHER_API_KEY") or env("DATA_GO_KR_SERVICE_KEY"))
    return FeatureStatus(
        feature="weather", ready=ready,
        message="날씨 예보 연동 준비됨" if ready else "날씨 API 키가 아직 없어요.",
    )
