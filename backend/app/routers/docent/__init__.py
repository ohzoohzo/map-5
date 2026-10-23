"""AI 도슨트 · 담당 명근. 이 폴더 안에서만 작업한다 (models.py, service.py 등 자유롭게 추가)."""
from fastapi import APIRouter

from ...models import FeatureStatus
from ...settings import env

router = APIRouter(prefix="/api/docent", tags=["docent"])


@router.get("/status", response_model=FeatureStatus, operation_id="docent_status")
def docent_status() -> FeatureStatus:
    ready = bool(env("OPENAI_API_KEY"))
    return FeatureStatus(
        feature="docent", ready=ready,
        message="도슨트 해설 생성 준비됨" if ready else "OpenAI API 키가 아직 없어요.",
    )
