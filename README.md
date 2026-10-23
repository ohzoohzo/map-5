# 📍 PinDay 핀데이

지도 기반 여행 플래너 — 장소 탐색 → 날짜별 일정 → 이동·날씨·해설 확인. React + Vite / FastAPI / 카카오 지도.
기획·시안: [design/PinDay-여정-정보구조.md](design/PinDay-여정-정보구조.md), [design/](design/)

## 시작하기
```bash
git clone https://github.com/ohzoohzo/map-5.git
cd map-5
cp .env.example .env              # 키는 팀 채팅에서 받기 (커밋 금지)
python -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt     # Windows: .venv\Scripts\pip ...
cd frontend && bun install && cd ..                        # bun 없으면: npx bun@1.3.2 install
python tools/dev.py               # 화면 http://localhost:8501 · API http://localhost:8001/docs
```
그다음 AI 에이전트(Claude Code / Codex)에게 **"나 OOO인데 뭐 하면 돼?"** 라고 물으면 된다.

## 담당
| 이름 | 화면 (URL) | 프론트 폴더 | 백엔드 폴더 | 할 일 |
|---|---|---|---|---|
| 우현 | 홈 `/`, 취향 테스트 `/taste` | `apps/home`, `apps/taste` | `routers/taste` | [docs/team/woohyun.md](docs/team/woohyun.md) |
| 명근 | AI 도슨트 `/docent` | `apps/docent` | `routers/docent` | [docs/team/myeonggeun.md](docs/team/myeonggeun.md) |
| 선이 | 어떻게 갈까? `/transport` | `apps/transport` | (필요 시 `routers/transport`) | [docs/team/seoni.md](docs/team/seoni.md) |
| 현경 | 날씨 대안 `/weather` | `apps/weather` | `routers/weather` | [docs/team/hyeonkyeong.md](docs/team/hyeonkyeong.md) |
| 여원 | 어디 갈까? `/explore`, 언제 갈까? `/schedule`, 기존 `/workspace` | `apps/explore`, `apps/schedule`, `apps/travel`, `shared/` | `routers/travel`, 공통 | [docs/team/yeowon.md](docs/team/yeowon.md) |

## 충돌 안 나게 — 최소 규칙
1. **내 폴더만 고친다.** 화면·메뉴·문구·API 라우터는 폴더만 만들면 자동 등록된다.
2. 공통 파일(`App.tsx`, `src/i18n.ts`, `src/styles.ts`, `src/shared/`, `backend/app/main.py·models.py·settings.py`, `.env.example`)은 따로 작은 PR → 여원 리뷰.
3. 브랜치 `feat/<id>-<작업>` → PR → 리뷰 1명 → merge. main 직접 push 금지.
4. 작업 전·PR 전에 `git pull origin main`. pull 로 `frontend/package.json`·`bun.lock` 이 바뀌었으면 `cd frontend && bun install`, `backend/requirements*.txt` 가 바뀌었으면 pip 재설치 후 **개발 서버 재시작** (안 하면 `Outdated Optimize Dep`·`Invalid hook call`·타입 오류가 납니다).
5. API 를 바꾸면 `python tools/gen_api.py` 실행 후 생성 파일도 커밋. 생성 파일 충돌 = 아무쪽이나 받고 다시 생성.

자세한 에이전트용 규칙: [CLAUDE.md](CLAUDE.md)
