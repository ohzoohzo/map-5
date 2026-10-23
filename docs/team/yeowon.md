# 여원 — 어디 갈까? `/explore` + 언제 갈까? `/schedule` + 공통 영역

- 브랜치: `feat/yeowon-<작업명>`
- 수정 가능한 곳: `frontend/src/apps/explore/`, `apps/schedule/`, `apps/travel/`, `frontend/src/shared/`, `backend/app/routers/travel/`, 공통 파일
- 시안: `design/` 의 pinday-explore-v2.png, pinday-planner-docent-v3.png

## 할 일
- [x] `/workspace`(기존 화면)의 탐색·일정을 `/explore`, `/schedule` 로 옮기기 (`tripStore` 로 상태 통일)
- [x] 후보함 저장 `addCandidate`, 날짜 배치 `addToDay`/`moveItem`
- [ ] 공통 영역 PR 리뷰

## 메모
(진행 상황·결정 사항은 이 파일에만 적는다 — 본인 파일이라 충돌 없음)
- 2026-10-23 · 두 화면은 원티드 Montage(@montage-ui/core 4.1.3) 컴포넌트로 만든다. 팀 `tokens.ts` 는 그대로 두었다 (Montage 테마는 브랜드 색 변경 옵션이 없음).
- Montage `Button` 은 `aria-labelledby` 로 자기 글자를 이름으로 쓴다 → `aria-label` 대신 `sr-only` 숨김 글자로 이름을 보탠다. `IconButton` 은 `aria-label` 그대로 된다.
- 선택 장소는 `trip.selectedPlaceId` 로 공유한다: 언제 갈까? 오른쪽 `DocentPanel`(명근)과 `/docent` 왕복 뒤에도 같은 장소.
- 장소 사진·날씨·실제 이동 시간은 데이터가 없어 넣지 않았다 (시안과 다른 점). 사진은 TourAPI(#2) 연동 뒤.
- 카카오 지도는 등록된 도메인(localhost:8501 등)에서만 뜬다. 다른 포트로 띄우면 안내 문구만 보인다.
