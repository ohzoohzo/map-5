"""Check the project's server/browser secret boundary and ignored local inputs."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
errors = []
for path in (ROOT / "frontend/src").rglob("*"):
    if not path.is_file() or path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
        continue
    text = path.read_text()
    if "KAKAO_REST_API_KEY" in text:
        errors.append(f"REST key name crossed into browser code: {path.relative_to(ROOT)}")
    if "libraries=services" in text:
        errors.append(f"Browser-side search bypasses FastAPI: {path.relative_to(ROOT)}")
    if re.search(r"(?<![a-zA-Z0-9])[a-f0-9]{32}(?![a-zA-Z0-9])", text):
        errors.append(f"Possible embedded key literal: {path.relative_to(ROOT)}")
for name in [".env", "data/tourism_raw.csv", "another/data/example_raw.csv"]:
    result = subprocess.run(["git", "check-ignore", "-q", name], cwd=ROOT)
    if result.returncode:
        errors.append(f"Local input is not ignored: {name}")
tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
for name in filter(None, tracked):
    if Path(name).name == ".env" or "_raw." in Path(name).name:
        errors.append(f"Private/local input is tracked: {name}")
if errors:
    raise SystemExit("\n".join(errors))
print("Browser/server boundary and local input rules passed")
