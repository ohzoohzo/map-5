# CLAUDE.md — PinDay 팀 작업 규칙

## "나 OOO인데 뭐 하면 돼?" 라고 하면
1. 아래 표에서 이름을 찾고 `docs/team/<id>.md` 를 읽는다 (담당 화면·폴더·할 일).
2. `git checkout main && git pull` 후 `feat/<id>-<작업명>` 브랜치를 만든다 (이미 본인 브랜치면 이어서, main 을 merge).
3. 담당 시안(`design/*.png`)을 보고, 할 일 중 다음 항목을 제안한 뒤 바로 진행한다.

| 이름 | id | 담당 |
|---|---|---|
| 우현 | woohyun | 홈 + 취향 테스트 |
| 명근 | myeonggeun | AI 도슨트 |
| 선이 | seoni | 어떻게 갈까? |
| 현경 | hyeonkyeong | 날씨 대안 |
| 여원 | yeowon | 어디 갈까? + 언제 갈까? + 공통 영역 |

## 충돌 방지 규칙 (꼭 지킬 것)
- **내 폴더만 수정한다.** 프론트 `frontend/src/apps/<내 기능>/`, 백엔드 `backend/app/routers/<내 기능>/`, 테스트 `backend/tests/test_<내 기능>.py`, `frontend/e2e/<내 기능>.spec.ts`.
- 화면 등록은 `apps/<기능>/app.config.tsx`, 문구는 `apps/<기능>/i18n.ts` 로 자동 등록된다 → `App.tsx`, `src/i18n.ts` 는 건드리지 않는다.
- **공통 영역**(`App.tsx`, `src/i18n.ts`, `src/styles.ts`, `src/shared/**`, `backend/app/main.py|models.py|settings.py`, `.env.example`)은 수정 전 사용자에게 확인받고, 기능 PR 과 분리한 작은 PR 로 올린다 (리뷰: 여원).
- 백엔드 모델 이름은 기능 접두어를 붙인다 (`WeatherForecast`). 새 키는 `settings.env("이름")` 으로 읽는다.
- 여행 상태(후보·일정·선택 장소)는 `shared/trip/tripStore.ts` 의 `useTrip` / `tripActions` 만 사용한다.
- 디자인은 `shared/design/tokens.ts` 값과 `design/` 시안을 따른다. 색을 직접 쓰지 않는다.
- 스타일은 기능 폴더의 styled 컴포넌트(예: `apps/<기능>/styles.ts`) 안에만 둔다. `src/styles.ts` 는 헤더 전용 전역이라 클래스를 추가하지 않는다 (#13).
- API 를 바꿨으면 `python tools/gen_api.py` 로 생성 파일(`contracts/`, `frontend/src/api/generated/`)을 다시 만들어 함께 커밋한다. **생성 파일에서 충돌이 나면 손으로 고치지 말고 아무쪽이나 받은 뒤 다시 생성**한다.

## 커밋·PR
- 커밋: `feat(weather): 예보 카드` 형식. push·PR 은 사용자가 원할 때만.
- PR 전(CI 없음 — 직접 확인): `python -m pytest backend/tests -q`, `cd frontend && bun run build`, 화면을 바꿨으면 `cd frontend && node node_modules/@playwright/test/cli.js test`.
- main 에 직접 push 하지 않는다. 작업 시작 전·PR 전 `git pull origin main` 으로 최신화. pull 뒤 의존성 파일(`frontend/package.json`·`bun.lock`·`backend/requirements*.txt`)이 바뀌었으면 다시 설치하고 개발 서버를 재시작한다 (#20).
