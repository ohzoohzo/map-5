import csv
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError

from ..models import CatalogResponse, Place

CATALOG_SOURCE = "전국관광지정보표준데이터"
CATALOG_SOURCE_URL = "https://www.data.go.kr/data/15021141/standard.do"
CLEAN_COLUMNS = list(Place.model_fields) + ["region"]


@dataclass(frozen=True)
class CatalogEntry:
    place: Place
    region: str


def read_catalog(path: Path) -> list[CatalogEntry]:
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if reader.fieldnames != CLEAN_COLUMNS:
                raise ValueError("정제 데이터 열이 일치하지 않아요.")
            entries = []
            seen_ids = set()
            for row in reader:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("열 개수가 일치하지 않아요.")
                region = row.pop("region")
                if not region:
                    raise ValueError("지역이 비어 있어요.")
                row["latitude"] = float(row["latitude"])
                row["longitude"] = float(row["longitude"])
                if row["source_date"] == "":
                    row["source_date"] = None
                place = Place.model_validate(row)
                if place.id in seen_ids:
                    raise ValueError("중복 식별자가 있어요.")
                seen_ids.add(place.id)
                entries.append(CatalogEntry(place=place, region=region))
        return entries
    except FileNotFoundError:
        raise HTTPException(503, "관광 데이터가 아직 준비되지 않았어요. 데이터 정제 작업을 먼저 실행해 주세요.") from None
    except (OSError, UnicodeError, ValueError, TypeError, csv.Error, ValidationError):
        raise HTTPException(503, "관광 데이터 형식이 올바르지 않아요. 정제 데이터를 확인해 주세요.") from None


def get_catalog(path: Path, region: str, query: str) -> CatalogResponse:
    entries = read_catalog(path)
    regions = sorted({entry.region for entry in entries})
    normalized_query = query.casefold().strip()
    selected = []
    for entry in entries:
        # A whole province ("부산광역시") or one district ("부산광역시 중구"), never a partial name.
        if region and entry.region != region and not entry.region.startswith(region + " "):
            continue
        place = entry.place
        searchable = " ".join([place.name, place.address, place.category, place.description]).casefold()
        if normalized_query and normalized_query not in searchable:
            continue
        selected.append(place)
        if len(selected) == 200:
            break
    dates = [place.source_date for place in selected if place.source_date is not None]
    return CatalogResponse(
        places=selected,
        total=len(selected),
        regions=regions,
        source=CATALOG_SOURCE,
        source_url=CATALOG_SOURCE_URL,
        date_min=min(dates) if dates else None,
        date_max=max(dates) if dates else None,
        total_catalog=len(entries),
    )
