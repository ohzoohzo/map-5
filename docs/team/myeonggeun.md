# 명근 — AI 도슨트 `/docent`

- 브랜치: `feat/myeonggeun-<작업명>`
- 수정 가능한 곳: `frontend/src/apps/docent/`, `backend/app/routers/docent/`
- 시안: `design/` 의 pinday-docent-v2.png, pinday-planner-docent-v3.png

## 할 일
- [x] 선택 장소(`useTrip(t => t.selectedPlaceId)`) 기반 해설 화면 (장소 목록 + 탭 골격)
- [x] 백엔드: TourAPI·국가유산청 근거 + OpenAI 해설 (`OPENAI_API_KEY`)
- [ ] 최근 소식 탭: 출처·발행일 표시
- [x] 언제 갈까? 패널에서 쓸 수 있게 `DocentPanel` 컴포넌트로 분리 (export 만, 배치는 여원)

## 메모
- 2026-10-23 화면 골격: 부산 공공 여행지 목록 → `tripActions.selectPlace`, `DocentPanel({ place })` 에서
  공공데이터 소개·근거 원문·후보함 저장. AI 해설·최근 소식은 "연동 전"으로 표시 (가짜 문장 없음).
- 여원님 사용법: `import DocentPanel from '../docent/DocentPanel'` 후 `<DocentPanel place={place} />`.
- 주의: 전역 `styles.ts` 에 `.intro`, `.panel`, `.button` 등이 있어 같은 클래스명은 피할 것.
- 2026-10-23 해설 API `GET /api/docent/story` (routers/docent/: sources.py 근거 수집, writer.py OpenAI):
  근거 = 공공 카탈로그 소개 + TourAPI 개요(이름 일치·3km 이내) + 반경 1km 국가유산 최대 3건.
  `gpt-5-mini`(env `OPENAI_MODEL` 로 변경 가능), JSON 스키마 출력, 섹션별 근거 번호, 근거 없으면 생성 안 함.
  장소별 결과는 서버 메모리 캐시 (재시작 시 초기화). 응답 약 8초.
- 프론트: 생성 fetch 는 오류 응답을 throw 하지 않아 `getDocentStoryUrl` + 공용 `request()` 사용.
- 다음: 최근 소식 탭 (OpenAI web_search, 출처·발행일).
