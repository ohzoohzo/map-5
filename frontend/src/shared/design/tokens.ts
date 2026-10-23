/**
 * PinDay 디자인 토큰 — 레포의 design/index.html 팔레트와 design/*.png 시안 기준.
 * 기능 화면은 색·간격을 직접 쓰지 말고 이 값을 import 해서 쓴다. 값 변경은 공통 PR 로.
 */
export const color = {
  navy: '#142b49',        // 본문 진한 글자
  navyDeep: '#1a416d',
  primary: '#1557a7',     // 주요 버튼·선택 탭
  primarySoft: '#e7f1ff', // 선택 배경·배지
  coral: '#f27c4a',       // 핵심 CTA (내 여행 시작하기, 이 장소로 교체하기)
  teal: '#217b88',        // 보조 강조 (실내 후보, 단계 라벨)
  text: '#142b49',
  textSub: '#52677e',
  textMuted: '#61718a',
  border: '#dfe7f0',
  borderStrong: '#c9d9ea',
  bg: '#f4f7fb',
  surface: '#ffffff',
} as const;

export const radius = { sm: '6px', md: '9px', lg: '12px', pill: '999px' } as const;

export const font = {
  family: 'Pretendard, -apple-system, BlinkMacSystemFont, "Noto Sans KR", sans-serif',
} as const;

/** 시안과 같은 최대 폭/여백 */
export const layout = { maxWidth: '1440px', gutter: '20px', minTouch: '44px' } as const;
