# 현경 — 날씨 대안 `/weather`

- 브랜치: `feat/hyeonkyeong-<작업명>`
- 수정 가능한 곳: `frontend/src/apps/weather/`, `backend/app/routers/weather/`
- 시안: `design/` 의 pinday-weather-v2.png

## 할 일
- [x] 예보 API 결정·연동 (OpenWeather 또는 기상청 단기예보, 키는 `.env`)
- [x] 야외 일정 → 실내 대안 비교 화면
- [x] 교체 → `tripActions.replaceItem` (날짜·순서 유지)

## 메모
(진행 상황·결정 사항은 이 파일에만 적는다 — 본인 파일이라 충돌 없음)

- 2026-10-23 예보 API = **OpenWeather 5 Day / 3 Hour** (기획안과 동일, 위경도 그대로 사용). 키: `.env` 의 `OPENWEATHER_API_KEY` (발급 후 활성화까지 최대 몇 시간).
- `GET /api/weather/forecast?latitude&longitude&date=YYYY-MM-DD` → 그 날짜(KST) 3시간 단위 칸. 5일 범위 밖이면 `status: out_of_range`(= '날씨 미확정'), 키 없음/실패는 503·502·504.
- 비 판단: 강수확률 60% 이상이면 `rain_expected` (기획안 초기 정책, 응답의 `rain_threshold`).
- 2026-10-23 실내 대안 = `GET /api/weather/alternatives` — 관광 데이터(clean.csv)에서 **이름에 박물관·미술관·전시관 등이 들어간 곳**을 직선 30km 안에서 가까운 순 8곳. 분류가 모두 '관광지'라 이름으로만 추정 → 화면에 '운영정보 확인 필요' 표시. 카카오 REST 키가 생기면 카카오 카테고리 검색(문화시설 CT1)으로 보강 가능.
- 화면은 `/weather?day=2&item=1` 로 특정 방문 항목을 바로 열 수 있다 (day 1부터, item 0부터) → 언제 갈까?(여원)에서 링크 걸 때 사용.
- 일정에 시각 정보가 없어서 시안의 '14:00' 대신 그날 비 예상 시간대 전체를 보여 준다.
- 2026-10-23 #17 의 공통 틀에 맞춤: `PinDayPage` + `TripBar`(상단 여행 바), DAY 탭은 언제 갈까?와 같은 색, 버튼·안내는 Montage(`Button`, `SectionMessage`, `FallbackView`, `Loading`). `TripBar` 의 `page` 가 explore/schedule 만 받아서 '일정' 칩이 강조된다 (날씨 대안은 일정의 하위 흐름이라 그대로 둠).
- 2026-10-23 화면 배치를 시안(pinday-weather-v2.png) 구조로: 머리글+예보 카드 / 원래 일정 ↔ 바꿔볼 장소(+이런 곳도 2곳, 더 보기) / 교체 후 미리보기(3칸 타임라인) / 출처. 날짜·장소 선택은 머리글 아래 드롭다운. 사진 데이터가 없어 실내·야외 아이콘 자리로 대신. 장소 주소 링크 → 명근님 `DocentPanel` 해설 (AI 호출이라 열 때만).
- 2026-10-23 장소 사진 = `GET /api/weather/photo?name=` — 한국관광공사 **관광사진 정보**(PhotoGalleryService1, `DATA_GO_KR_SERVICE_KEY`). 제목에 장소 이름이 있거나 검색 태그가 이름과 같을 때만 사용, 없으면 아이콘. 같은 키로 TourAPI(KorService2)는 "등록되지 않은 서비스키"라 도슨트 사진(`/api/docent/photos`)은 0장 — TourAPI 활용신청 필요 (명근님 공유).
- 2026-10-23 사진이 없는 장소도 이미지가 나오도록: 장소 사진(이름+시·도 일치) → 이름의 주요 단어(해리단길 카페→해리단길) → 구·군 → 시·도 순. 장소 사진이 아니면 `match`(related/area)와 `label` 로 "관련 사진"·"지역 사진"을 화면에 표시. 같은 구·군을 쓰는 장소끼리는 이름으로 다른 사진을 고름.
- 2026-10-23 머리글: 제목 3.2rem·부제 1.5rem(모바일 2rem·1.125rem), 위아래 여백 확대. 가운데 "이 장소만 교체"도 버튼으로 — 아래 "이 장소로 교체하기"와 같은 교체.
