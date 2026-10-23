from typing import Literal

from ...models import StrictModel


class DocentReference(StrictModel):
    """해설의 근거 원문. 번호(index)로 섹션과 연결된다."""
    index: int
    kind: Literal["catalog", "tour", "heritage"]
    label: str
    source: str
    url: str
    date: str | None


class DocentSection(StrictModel):
    key: Literal["history", "feature", "tip"]
    title: str
    body: str
    reference_indexes: list[int]


class DocentPhoto(StrictModel):
    url: str
    thumbnail_url: str
    title: str
    license: str              # 공공누리 유형 (출처표시 필수)


class DocentPhotos(StrictModel):
    place_id: str
    photos: list[DocentPhoto]
    source: str
    source_url: str


class DocentNewsItem(StrictModel):
    title: str
    summary: str
    published_date: str        # YYYY-MM-DD (확인된 것만 반환)
    source_name: str
    url: str


class DocentNews(StrictModel):
    place_id: str
    ready: bool
    message: str
    items: list[DocentNewsItem]
    model: str | None
    searched_at: str | None    # ISO 8601 (KST)


class DocentStory(StrictModel):
    place_id: str
    ready: bool               # False 면 AI 해설 없이 근거 자료만 반환
    message: str
    summary: str
    sections: list[DocentSection]
    references: list[DocentReference]
    model: str | None
    generated_at: str | None  # ISO 8601 (KST)
