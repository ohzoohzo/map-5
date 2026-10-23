import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
KEY_PATTERN = re.compile(r"[0-9a-fA-F]{32}")


@dataclass(frozen=True)
class Settings:
    rest_key: str
    js_key: str
    catalog_path: Path


def valid_key(value: str) -> bool:
    return KEY_PATTERN.fullmatch(value) is not None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Only this project file is loaded; inherited shell keys cannot shadow it.
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    return Settings(
        rest_key=os.getenv("KAKAO_REST_API_KEY", "").strip(),
        js_key=os.getenv("KAKAO_JS_KEY", "").strip(),
        catalog_path=PROJECT_ROOT / "data" / "clean.csv",
    )
