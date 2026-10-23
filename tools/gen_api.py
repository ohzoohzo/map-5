"""백엔드 코드 → contracts/openapi.json → frontend/src/api/generated 를 다시 만든다.

API(라우터·모델)를 바꿨거나, 생성 파일에서 머지 충돌이 났을 때 실행한다.
    python tools/gen_api.py
"""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
python = ROOT / (".venv/Scripts/python.exe" if sys.platform == "win32" else ".venv/bin/python")
orval = ROOT / "frontend/node_modules/orval/dist/bin/orval.mjs"
if not python.exists() or not orval.exists():
    sys.exit("먼저 .venv 와 frontend 의존성을 설치해 주세요. (README '처음 실행')")

subprocess.run([str(python), "-m", "backend.export_openapi"], cwd=ROOT, check=True)
subprocess.run(["node", str(orval), "--config", "orval.config.ts"], cwd=ROOT / "frontend", check=True)
print("API 계약과 프론트 클라이언트를 다시 생성했어요. 생성된 파일도 함께 커밋하세요.")
