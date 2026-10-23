"""Run the local API and React app, and stop only the child processes we start."""
from pathlib import Path
import json
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
children = []

def missing_frontend_packages() -> list[str]:
    """package.json 에 있는데 node_modules 에 없는 패키지 (main 을 pull 한 뒤 설치를 빠뜨린 경우, #20)."""
    manifest = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
    names = {**manifest.get("dependencies", {}), **manifest.get("devDependencies", {})}
    return sorted(name for name in names if not (ROOT / "frontend/node_modules" / name / "package.json").exists())

def stop(*_):
    for child in children:
        if child.poll() is None:
            child.terminate()
    for child in children:
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
    raise SystemExit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    python = ROOT / (".venv/Scripts/python.exe" if sys.platform == "win32" else ".venv/bin/python")
    vite = ROOT / "frontend/node_modules/vite/bin/vite.js"
    if not python.exists() or not vite.exists():
        sys.exit("먼저 .venv와 frontend 의존성을 설치해 주세요. GitHub Issue #1 실행 안내를 참고하세요.")
    missing = missing_frontend_packages()
    if missing:
        sys.exit(f"frontend 의존성이 바뀌었어요 (설치 안 됨: {', '.join(missing[:5])}{' …' if len(missing) > 5 else ''}).\n"
                 "cd frontend && bun install   (bun 없으면: npx bun@1.3.2 install) 후 다시 실행해 주세요.")
    children.append(subprocess.Popen([str(python), "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", "8001"], cwd=ROOT))
    children.append(subprocess.Popen(["node", str(vite), "--host", "127.0.0.1", "--port", "8501", "--strictPort"], cwd=ROOT / "frontend"))
    print("여행 설계 화면: http://localhost:8501 · API 문서: http://localhost:8001/docs", flush=True)
    try:
        while True:
            for child in children:
                if child.poll() is not None:
                    print("서버가 종료되어 함께 실행한 프로세스를 정리합니다.", flush=True)
                    stop()
            time.sleep(0.5)
    finally:
        stop()
