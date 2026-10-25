"""OpenAI Responses API 로 근거 기반 해설 생성 (httpx 직접 호출, 추가 의존성 없음)."""
import json

import httpx
from fastapi import HTTPException

from ...settings import env
from .sources import Evidence

OPENAI_URL = "https://api.openai.com/v1/responses"
DEFAULT_MODEL = "gpt-5-mini"

SYSTEM_PROMPT = """너는 부산 여행지 해설사(도슨트)다. 한국어로, 친근하지만 과장 없이 쓴다.
규칙:
- 반드시 주어진 근거 자료(번호가 붙은 원문)에 있는 사실만 쓴다. 자료에 없는 연도·수치·인물·전설을 만들지 않는다.
- 섹션: history(역사와 문화), feature(동네의 특징), tip(방문 전 알아두기). 각 2~3문장.
- 어떤 섹션에 쓸 근거가 없으면 body 를 "근거 자료에 관련 내용이 없어요." 로 두고 reference_indexes 는 빈 배열.
- reference_indexes 에는 그 섹션 문장의 근거가 된 자료 번호만 넣는다.
- summary 는 장소를 한두 문장으로 소개한다 (근거 자료 범위 안에서)."""

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "sections"],
    "properties": {
        "summary": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["key", "body", "reference_indexes"],
                "properties": {
                    "key": {"type": "string", "enum": ["history", "feature", "tip"]},
                    "body": {"type": "string"},
                    "reference_indexes": {"type": "array", "items": {"type": "integer"}},
                },
            },
        },
    },
}


def model_name() -> str:
    return env("OPENAI_MODEL") or DEFAULT_MODEL


def write_story(place_name: str, address: str, evidences: list[Evidence]) -> dict:
    material = "\n\n".join(f"[{index}] {item.label} ({item.source})\n{item.text}" for index, item in enumerate(evidences, start=1))
    body = {
        "model": model_name(),
        "reasoning": {"effort": "low"},
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"장소: {place_name}\n주소: {address}\n\n근거 자료:\n{material}"},
        ],
        "text": {"format": {"type": "json_schema", "name": "docent_story", "strict": True, "schema": SCHEMA}},
    }
    try:
        return json.loads(output_text(call_responses(body)))
    except ValueError:
        raise HTTPException(502, "해설 응답 형식이 올바르지 않아요.") from None


def call_responses(body: dict, timeout: float = 90.0) -> dict:
    """Responses API 호출. 오류는 키·원문 없이 안전한 메시지로 바꾼다."""
    key = env("OPENAI_API_KEY")
    if not key:
        raise HTTPException(503, "OpenAI API 키 설정을 확인해 주세요.")
    try:
        response = httpx.post(OPENAI_URL, json=body, headers={"Authorization": f"Bearer {key}"}, timeout=timeout)
    except httpx.TimeoutException:
        raise HTTPException(504, "해설 생성 응답이 늦어요. 잠시 후 다시 시도해 주세요.") from None
    except httpx.RequestError:
        raise HTTPException(503, "해설 서버에 연결하지 못했어요.") from None
    if response.status_code in {401, 403}:
        raise HTTPException(503, "OpenAI API 인증 설정을 확인해 주세요.")
    if response.status_code == 429:
        raise HTTPException(429, "해설 생성 한도에 도달했어요. 잠시 후 다시 시도해 주세요.")
    if response.status_code != 200:
        raise HTTPException(502, "해설을 만들지 못했어요.")
    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(502, "해설 응답 형식이 올바르지 않아요.") from None
    if not isinstance(payload, dict):
        raise HTTPException(502, "해설 응답 형식이 올바르지 않아요.")
    return payload


def output_text(payload: dict) -> str:
    try:
        return next(
            part["text"]
            for item in payload.get("output", []) if item.get("type") == "message"
            for part in item.get("content", []) if part.get("type") == "output_text"
        )
    except (StopIteration, KeyError, TypeError, AttributeError):
        raise HTTPException(502, "해설 응답 형식이 올바르지 않아요.") from None
