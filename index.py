"""Vercel 백엔드 진입점.

저장소 루트를 Vercel 프로젝트 루트로 두면 backend/ 와 data/clean.csv 가 한 번들에 들어간다.
앱 코드는 그대로이고, 여기서는 FastAPI `app` 만 노출한다. 로컬 개발은 tools/dev.py 를 쓴다.
"""
from backend.app.main import app

__all__ = ["app"]
