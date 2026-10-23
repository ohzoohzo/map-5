"""최근 소식: OpenAI 웹 검색. 실제 검색 출처 목록에 있는 URL·확인된 발행일의 기사만 남긴다."""
import json
from datetime import date, datetime, timedelta

from fastapi import HTTPException

from .writer import call_responses, model_name, output_text

MAX_ITEMS = 5
RECENT_DAYS = 183  # 약 6개월

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["items"],
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "summary", "published_date", "source_name", "url"],
                "properties": {
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "published_date": {"type": "string"},
                    "source_name": {"type": "string"},
                    "url": {"type": "string"},
                },
            },
        },
    },
}


def search_sources(payload: dict) -> set[str]:
    return {
        source.get("url")
        for item in payload.get("output", []) if item.get("type") == "web_search_call"
        for source in ((item.get("action") or {}).get("sources") or [])
        if isinstance(source, dict) and source.get("url")
    }


def valid_date(value: str, today: date) -> bool:
    try:
        published = date.fromisoformat(value)
    except ValueError:
        return False
    return today - timedelta(days=RECENT_DAYS) <= published <= today


def search_news(place_name: str, address: str, now: datetime) -> list[dict]:
    today = now.date()
    body = {
        "model": model_name(),
        "reasoning": {"effort": "low"},
        "tools": [{"type": "web_search", "user_location": {"type": "approximate", "country": "KR"}}],
        "include": ["web_search_call.action.sources"],
        "input": (
            f"오늘은 {today.isoformat()}이다. 아래 장소와 직접 관련된 한국어 뉴스·공식 소식을 웹에서 검색해 최근 3개월을 우선으로, 최대 6개월({RECENT_DAYS}일) 이내 것만 "
            f"최대 {MAX_ITEMS}건 정리해라.\n장소: {place_name}\n주소: {address}\n"
            "규칙: 실제로 검색해서 열어 본 기사만, 발행일(YYYY-MM-DD)을 확인한 것만 넣는다. 같은 사건의 중복 기사는 하나만. "
            "summary 는 기사 내용 한두 문장 요약(추측 금지). 관련 기사가 없으면 빈 배열."
        ),
        "text": {"format": {"type": "json_schema", "name": "docent_news", "strict": True, "schema": SCHEMA}},
    }
    payload = call_responses(body, timeout=120.0)
    try:
        items = json.loads(output_text(payload)).get("items", [])
    except (ValueError, AttributeError):
        raise HTTPException(502, "최근 소식 응답 형식이 올바르지 않아요.") from None
    sources = search_sources(payload)
    kept, seen = [], set()
    for item in items:
        url = item.get("url", "")
        if not url.startswith(("http://", "https://")) or url not in sources or url in seen:
            continue
        if not valid_date(item.get("published_date", ""), today):
            continue
        seen.add(url)
        kept.append(item)
    return sorted(kept, key=lambda item: item["published_date"], reverse=True)[:MAX_ITEMS]
