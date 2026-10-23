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


class DocentStory(StrictModel):
    place_id: str
    ready: bool               # False 면 AI 해설 없이 근거 자료만 반환
    message: str
    summary: str
    sections: list[DocentSection]
    references: list[DocentReference]
    model: str | None
    generated_at: str | None  # ISO 8601 (KST)
