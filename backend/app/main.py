import importlib
import pkgutil
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import routers
from .models import ConfigResponse, ErrorResponse, HealthResponse
from .settings import Settings, get_settings, valid_key


def register_routers(app: FastAPI, package=routers) -> None:
    """Discover modules deterministically; each mini-app exposes exactly one router."""
    for module in sorted(pkgutil.iter_modules(package.__path__), key=lambda item: item.name):
        if module.name.startswith("_"):
            continue
        imported = importlib.import_module(f"{package.__name__}.{module.name}")
        router = getattr(imported, "router", None)
        if not isinstance(router, APIRouter):
            raise RuntimeError(f"라우터 모듈 {module.name}에는 APIRouter router가 필요해요.")
        app.include_router(router)


app = FastAPI(
    title="5조 여행 설계 API", version="0.1.0",
    responses={422: {"model": ErrorResponse}},
)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
    # Pydantic's default detail can contain user input; expose a stable safe shape.
    return JSONResponse(status_code=422, content={"detail": "요청 값이 올바르지 않아요. 검색어나 지역을 확인해 주세요."})


@app.get("/api/health", response_model=HealthResponse, operation_id="health")
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/config", response_model=ConfigResponse, operation_id="get_config")
def get_config(settings: Annotated[Settings, Depends(get_settings)]) -> ConfigResponse:
    return ConfigResponse(
        js_key=settings.js_key if valid_key(settings.js_key) else "",
        place_search_enabled=valid_key(settings.rest_key),
    )


register_routers(app)
