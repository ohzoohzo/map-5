"""홈 · 취향 테스트 · 랜덤 뽑기 · 담당 우현. 이 폴더 안에서만 작업한다."""
from fastapi import APIRouter

from ...models import FeatureStatus

router = APIRouter(prefix="/api/taste", tags=["taste"])


@router.get("/status", response_model=FeatureStatus, operation_id="taste_status")
def taste_status() -> FeatureStatus:
    return FeatureStatus(feature="taste", ready=False, message="취향 테스트 문항과 유형을 준비 중이에요.")
