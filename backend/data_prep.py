"""Clean the official tourism CSV without inventing places or coordinates."""

import argparse
import hashlib
import json
import math
import sys
import time
from collections import Counter
from datetime import date
from pathlib import Path

import pandas as pd
from fastapi import HTTPException
from pydantic import ValidationError

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.models import Place
from backend.app.services.catalog import CATALOG_SOURCE, CATALOG_SOURCE_URL, CLEAN_COLUMNS
from backend.app.services.kakao import geocode_address
from backend.app.settings import PROJECT_ROOT, get_settings

REQUIRED_COLUMNS = (
    "관광지명", "관광지구분", "소재지도로명주소", "소재지지번주소", "위도", "경도",
    "관광지소개", "관리기관전화번호", "데이터기준일자", "제공기관코드",
)


def read_raw(path: Path) -> tuple[pd.DataFrame, str]:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            frame = pd.read_csv(path, encoding=encoding, dtype=str, keep_default_na=False)
        except UnicodeDecodeError:
            continue
        missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
        if missing:
            raise ValueError("필수 관광 데이터 열이 없어요: " + ", ".join(missing))
        if frame.empty:
            raise ValueError("관광 원본 데이터에 행이 없어요.")
        return frame, encoding
    raise ValueError("CSV를 UTF-8 또는 CP949로 읽지 못했어요.")


def coordinates_valid(latitude: float, longitude: float) -> bool:
    return math.isfinite(latitude) and math.isfinite(longitude) and 33 <= latitude <= 39 and 124 <= longitude <= 132


def clean_tourism(frame: pd.DataFrame, geocode: bool = False, max_geocode: int = 30) -> tuple[pd.DataFrame, dict]:
    if not 0 <= max_geocode <= 30:
        raise ValueError("주소 보완은 최대 30건까지 가능해요.")
    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError("필수 관광 데이터 열이 없어요: " + ", ".join(missing))
    frame = frame.fillna("").astype(str).copy()
    for column in frame.columns:
        frame[column] = frame[column].str.strip()
    latitudes = pd.to_numeric(frame["위도"], errors="coerce")
    longitudes = pd.to_numeric(frame["경도"], errors="coerce")
    missing_counts = {column: int(frame[column].eq("").sum()) for column in REQUIRED_COLUMNS}
    drop_counts = Counter()
    records = []
    seen_ids = set()
    geocode_attempts = 0
    geocode_resolved = 0

    for index, row in frame.iterrows():
        name = row["관광지명"]
        if not name:
            drop_counts["missing_name"] += 1
            continue
        address = row["소재지도로명주소"]
        if not address:
            address = row["소재지지번주소"]
        if not address:
            drop_counts["missing_address"] += 1
            continue
        address_tokens = address.split()
        if len(address_tokens) < 2:
            drop_counts["invalid_region"] += 1
            continue
        region = " ".join(address_tokens[:2])
        source_date = row["데이터기준일자"]
        if source_date:
            try:
                if date.fromisoformat(source_date).isoformat() != source_date:
                    raise ValueError("date format")
            except ValueError:
                drop_counts["invalid_source_date"] += 1
                continue
        else:
            source_date = None

        latitude, longitude = float(latitudes.loc[index]), float(longitudes.loc[index])
        if not coordinates_valid(latitude, longitude) and geocode and geocode_attempts < max_geocode:
            if geocode_attempts:
                time.sleep(0.1)
            geocode_attempts += 1
            resolved = geocode_address(address, get_settings())
            if resolved is not None:
                latitude, longitude = resolved
                geocode_resolved += 1
        if not coordinates_valid(latitude, longitude):
            drop_counts["invalid_coordinates"] += 1
            continue
        identity = json.dumps(
            [row["제공기관코드"], name, address, latitude, longitude], ensure_ascii=False,
            separators=(",", ":"),
        )
        place_id = "tourism:" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20]
        try:
            place = Place(
                id=place_id,
                name=name,
                address=address,
                latitude=latitude,
                longitude=longitude,
                category=row["관광지구분"],
                description=row["관광지소개"],
                phone=row["관리기관전화번호"],
                source=CATALOG_SOURCE,
                source_date=source_date,
                url=CATALOG_SOURCE_URL,
            )
        except ValidationError:
            drop_counts["invalid_schema"] += 1
            continue
        if place_id in seen_ids:
            drop_counts["duplicate_place"] += 1
            continue
        seen_ids.add(place_id)
        records.append({**place.model_dump(), "region": region})

    cleaned = pd.DataFrame.from_records(records, columns=CLEAN_COLUMNS)
    if not cleaned.empty:
        cleaned = cleaned.sort_values(["region", "name", "id"], kind="stable").reset_index(drop=True)
    dates = cleaned["source_date"].dropna().tolist()
    report = {
        "source": CATALOG_SOURCE,
        "source_url": CATALOG_SOURCE_URL,
        "input_rows": len(frame),
        "output_rows": len(cleaned),
        "dropped_rows": len(frame) - len(cleaned),
        "dropped_by_reason": dict(sorted(drop_counts.items())),
        "missing_by_column": missing_counts,
        "geocode_attempts": geocode_attempts,
        "geocode_resolved": geocode_resolved,
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "regions": int(cleaned["region"].nunique()),
    }
    return cleaned, report


def prepare(input_path: Path, output_path: Path, geocode: bool = False, max_geocode: int = 30) -> dict:
    frame, encoding = read_raw(input_path)
    cleaned, report = clean_tourism(frame, geocode, max_geocode)
    if cleaned.empty:
        raise ValueError("표시할 수 있는 관광지가 없어서 정제 파일을 저장하지 않았어요.")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    try:
        cleaned.to_csv(temporary, encoding="utf-8-sig", index=False)
        temporary.replace(output_path)
    finally:
        temporary.unlink(missing_ok=True)
    return {**report, "input_encoding": encoding, "output_encoding": "utf-8-sig"}


def main() -> int:
    parser = argparse.ArgumentParser(description="공식 전국관광지 CSV를 여행 지도 데이터로 정제해요.")
    parser.add_argument("--input", type=Path, default=PROJECT_ROOT / "data/tourism_raw.csv")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "data/clean.csv")
    parser.add_argument("--geocode", action="store_true", help="좌표가 없는 주소를 카카오 API로 최대 30건 보완")
    parser.add_argument("--max-geocode", type=int, default=30)
    args = parser.parse_args()
    try:
        report = prepare(args.input, args.output, args.geocode, args.max_geocode)
    except HTTPException as error:
        print(f"데이터 정제를 멈췄어요: {error.detail}", file=sys.stderr)
        return 1
    except (OSError, ValueError, pd.errors.ParserError):
        print("데이터 정제를 완료하지 못했어요. 파일 경로·필수 열·인코딩·좌표를 확인해 주세요.", file=sys.stderr)
        return 1
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
