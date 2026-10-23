import json
from pathlib import Path

from backend.app.main import app


def main() -> None:
    destination = Path(__file__).resolve().parents[1] / "contracts" / "openapi.json"
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(destination)


if __name__ == "__main__":
    main()
