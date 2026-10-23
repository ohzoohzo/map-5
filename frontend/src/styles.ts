import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const globalStyles = css`
  :root { font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Segoe UI', sans-serif; color: #253d50; background: #f5f8fc; font-synthesis: none; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
  * { box-sizing: border-box; }
  body { margin: 0; min-width: 320px; }
  button, input, select { font: inherit; } button, select { cursor: pointer; } button { color: inherit; border: 0; background: transparent; } button:disabled { cursor: default; } a { color: inherit; text-decoration: none; } svg { flex-shrink: 0; vertical-align: middle; } p, h1, h2, h3 { margin: 0; }
  button, a, input, select { -webkit-tap-highlight-color: transparent; }
  button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #86b7e3; outline-offset: 3px; }
  button:not(:disabled):active { transform: translateY(1px); }
  ::selection { background: #dceeff; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  .skip-link { position: fixed; z-index: 200; left: 20px; top: -100px; background: #214564; color: white; padding: 15px; border-radius: 8px; } .skip-link:focus { top: 12px; }
  @media(prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
`;

export const Shell = styled.div`
  /* 전역 Shell 은 머리글만 꾸민다. 모든 규칙을 .site-header 아래로 한정해 기능 화면 클래스와 겹치지 않게 한다 (#13). */
  .site-header { height: 78px; border-bottom: 1px solid #e6edf4; background: #fff; }
  .site-header .header-inner { max-width: 1600px; height: 100%; padding: 0 42px; margin: auto; display: flex; align-items: center; gap: 58px; }
  .site-header .brand { display: inline-flex; align-items: center; gap: 11px; color: #254e70; font-size: 23px; font-weight: 820; letter-spacing: -1.3px; }
  .site-header .brand-mark { display: grid; place-items: center; height: 38px; width: 38px; border-radius: 13px 13px 13px 4px; color: #fff; background: #325f81; } .site-header .brand-dot { color: #eb9767; }
  .site-header .main-nav { align-self: stretch; display: flex; align-items: stretch; gap: 25px; overflow-x: auto; scrollbar-width: none; }
  .site-header .main-nav .nav-item { white-space: nowrap; }
  .site-header .nav-item { display: flex; align-items: center; gap: 8px; padding: 0 2px; font-size: 13px; font-weight: 650; border-bottom: 2px solid transparent; color: #82909b; } .site-header .nav-item.active { color: #2a597c; border-bottom-color: #2a597c; }
  .site-header .header-note { margin-left: auto; display: flex; align-items: center; gap: 9px; color: #8d9aa6; font-size: 11px; }
  .site-header .brand { text-decoration: none; }
  main { min-width: 0; }
  @media (max-width: 1250px) { .site-header .header-inner { padding: 0 26px; } }
  @media (max-width: 760px) {
    .site-header { height: 66px; } .site-header .header-inner { padding: 0 20px; gap: 28px; } .site-header .brand { font-size: 21px; gap: 8px; } .site-header .brand-mark { width: 33px; height: 33px; border-radius: 11px 11px 11px 3px; } .site-header .brand-mark svg { width: 20px; } .site-header .main-nav { margin-left: auto; } .site-header .nav-item { font-size: 11px; gap: 5px; } .site-header .header-note { display: none; }
  }
`;
