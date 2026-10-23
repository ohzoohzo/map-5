# 명근 — AI 도슨트 `/docent`

- 브랜치: `feat/myeonggeun-<작업명>`
- 수정 가능한 곳: `frontend/src/apps/docent/`, `backend/app/routers/docent/`
- 시안: `design/` 의 pinday-docent-v2.png, pinday-planner-docent-v3.png

## 할 일
- [x] 선택 장소(`useTrip(t => t.selectedPlaceId)`) 기반 해설 화면 (장소 목록 + 탭 골격)
- [ ] 백엔드: TourAPI·국가유산청 근거 + OpenAI 해설 (`OPENAI_API_KEY`)
- [ ] 최근 소식 탭: 출처·발행일 표시
- [x] 언제 갈까? 패널에서 쓸 수 있게 `DocentPanel` 컴포넌트로 분리 (export 만, 배치는 여원)

## 메모
- 2026-10-23 화면 골격: 부산 공공 여행지 목록 → `tripActions.selectPlace`, `DocentPanel({ place })` 에서
  공공데이터 소개·근거 원문·후보함 저장. AI 해설·최근 소식은 "연동 전"으로 표시 (가짜 문장 없음).
- 여원님 사용법: `import DocentPanel from '../docent/DocentPanel'` 후 `<DocentPanel place={place} />`.
- 주의: 전역 `styles.ts` 에 `.intro`, `.panel`, `.button` 등이 있어 같은 클래스명은 피할 것.
- 다음: `.env` 에 `OPENAI_API_KEY`, `DATA_GO_KR_SERVICE_KEY` 받으면 백엔드 해설 API.
