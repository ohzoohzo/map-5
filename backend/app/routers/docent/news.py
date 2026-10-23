"""최근 소식: 부산시·부산관광공사·지역 언론으로 한정한 Google 뉴스 RSS (키 불필요, 1초 내외).

AI 웹 검색(20~40초)을 대신한다. 기사 제목·출처·발행일을 원문 그대로 쓰므로 지어낸 내용이 없다.
제목에 장소명이 들어간 기사만 남겨 무관한 기사를 거른다.
"""
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

import httpx

RSS_URL = "https://news.google.com/rss/search"
SOURCE_URL = "https://news.google.com/"
# 믿을 만한 부산 출처: 부산시(구·군 포함 하위 도메인), 부산관광포털, 부산관광공사, 부산일보, 국제신문, KNN
TRUSTED_SITES = ["busan.go.kr", "visitbusan.net", "bto.or.kr", "busan.com", "kookje.co.kr", "knn.co.kr"]
MAX_ITEMS = 3
RECENT_DAYS = 183  # 약 6개월


def _normalize(text: str) -> str:
    return re.sub(r"\(.*?\)|\s", "", text)


def search_news(place_name: str, now: datetime) -> list[dict]:
    query = f'"{place_name}" (' + " OR ".join(f"site:{site}" for site in TRUSTED_SITES) + ")"
    try:
        response = httpx.get(RSS_URL, params={"q": query, "hl": "ko", "gl": "KR", "ceid": "KR:ko"}, timeout=8.0, follow_redirects=True)
        response.raise_for_status()
        entries = ET.fromstring(response.content).findall("./channel/item")
    except (httpx.HTTPError, ET.ParseError):
        return []

    target = _normalize(place_name)
    oldest = now - timedelta(days=RECENT_DAYS)
    items, seen = [], set()
    for entry in entries:
        source = (entry.findtext("source") or "").strip()
        title = (entry.findtext("title") or "").strip()
        if source and title.endswith(f" - {source}"):
            title = title[: -len(f" - {source}")].strip()
        title = re.split(r"\s[:|]\s", title)[0].strip()  # 사이트 메뉴 꼬리 제거 ("… | 축제·행사", "… : 부산소식")
        key = re.sub(r"[^0-9A-Za-z가-힣]", "", title)[:30]  # 같은 기사 중복 판별
        link = (entry.findtext("link") or "").strip()
        try:
            published = parsedate_to_datetime(entry.findtext("pubDate") or "").astimezone(now.tzinfo)
        except (TypeError, ValueError):
            continue
        if target not in _normalize(title) or not link.startswith("https://") or key in seen:
            continue
        if not oldest <= published <= now + timedelta(days=1):
            continue
        seen.add(key)
        items.append({"title": title, "summary": "", "published_date": published.date().isoformat(), "source_name": source or "언론사", "url": link})
    return sorted(items, key=lambda item: item["published_date"], reverse=True)[:MAX_ITEMS]
