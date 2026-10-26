import styled from '@emotion/styled';
import { color, layout, radius } from '../../shared/design/tokens';

// 여행 계획하기·이동 전 확인하기와 같은 파랑 강조색 (Montage 브랜드 색)
const brand = 'var(--semantic-foreground-brand-primary, #0066ff)';
const brandSoft = `color-mix(in srgb, ${brand} 8%, white)`;
// 탭·북마크·주석·출처 글씨는 강조색 대신 검정, '지금 보고 있는 곳' 태그는 회색
const ink = `var(--semantic-foreground-neutral-strong, ${color.text})`;
const grayBg = `var(--semantic-background-neutral-secondary, ${color.bg})`;
const grayText = `var(--semantic-foreground-neutral-secondary, ${color.textSub})`;
// 링크 카드: 평소엔 1. 어디 갈까? 단계 버튼의 비강조, 호버하면 강조 모양 (shared/ui/PinDayPage .count-chip 과 같은 값)
const line = `var(--semantic-line-neutral-primary, ${color.border})`;
const linkHover = `background: #eaf2fe; border-color: #b3d1fd; color: ${brand};`;

export const Page = styled.div`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 20px 32px 24px;
  color: ${color.text};
  @media (max-width: 720px) { padding: 16px 16px 24px; }
  /* 여행 계획하기·이동 전 확인하기의 .page-head 와 같은 제목·설명 간격 */
  .page-head { margin-bottom: 20px; }
  .page-head h1 { margin: 0 0 4px; letter-spacing: -0.5px; }
  .layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 20px; align-items: start; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
`;

export const Card = styled.section`
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  padding: 20px;
`;

export const Picker = styled(Card)`
  h2 { margin-top: 16px; font-size: 16px; }
  .search { display: flex; align-items: center; gap: 8px; height: ${layout.minTouch}; margin-top: 10px; padding: 0 12px; border: 1px solid ${color.border}; border-radius: ${radius.md}; color: ${color.textMuted}; }
  .search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: ${color.text}; }
  ul { list-style: none; margin: 12px 0 0; padding: 0; max-height: 520px; overflow-y: auto; }
  li button { width: 100%; text-align: left; padding: 10px 8px; border-radius: ${radius.md}; display: flex; gap: 10px; align-items: flex-start; }
  li button:hover { background: ${color.bg}; }
  li button[aria-pressed='true'] { background: ${brandSoft}; }
  li strong { display: block; font-size: 14px; color: ${color.text}; }
  li small { display: block; margin-top: 2px; font-size: 12px; color: ${color.textMuted}; }
  li .bookmark { display: inline-flex; flex-shrink: 0; margin-top: 3px; color: ${ink}; }
  li .bookmark svg { width: 16px; height: 16px; }
  li .bookmark.saved { color: ${ink}; }
  .state { margin-top: 16px; font-size: 13px; color: ${color.textMuted}; }
`;

export const Slides = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  align-items: center;
  &:has(> .hero-text:only-child) { grid-template-columns: 1fr; }
  .slide-box { min-width: 0; }
  .slide-frame { position: relative; width: 100%; aspect-ratio: 3 / 2; border-radius: ${radius.md}; overflow: hidden; background: ${color.navy}; }
  .slide-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.8s ease; }
  .slide-frame img.active { opacity: 1; }
  .slide-caption { position: absolute; left: 10px; right: 10px; bottom: 10px; margin: 0; padding: 6px 12px; border-radius: ${radius.pill}; background: ${color.navy}bf; color: ${color.surface}; font-size: 12px; text-align: center; }
  .slide-meta { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; font-size: 11px; color: ${color.textMuted}; }
  .hero-text { font-size: 17px; line-height: 1.7; font-weight: 600; letter-spacing: -0.4px; color: ${color.navy}; word-break: keep-all; }
  .hero-text.muted, .hero-text .muted { font-size: 16px; font-weight: 500; color: ${color.textSub}; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
  @container docent-panel (min-width: 680px) {
    grid-template-columns: 420px minmax(0, 1fr);
    .hero-text { font-size: 20px; }
  }
`;

export const Panel = styled(Card)`
  min-width: 0;
  container: docent-panel / inline-size;
  .tabs { display: flex; gap: 24px; border-bottom: 1px solid ${color.border}; }
  .tabs button { display: flex; align-items: center; gap: 6px; padding: 10px 2px; font-weight: 600; color: ${color.textMuted}; border-bottom: 2px solid transparent; }
  .tabs button[aria-selected='true'] { color: ${ink}; border-bottom-color: ${ink}; }
  .label { display: inline-block; margin-top: 20px; padding: 3px 9px; border-radius: ${radius.sm}; background: ${grayBg}; color: ${grayText}; font-size: 12px; }
  h2 { margin-top: 8px; font-size: 24px; letter-spacing: -0.6px; }
  .address { margin-top: 4px; font-size: 13px; color: ${color.textMuted}; }
  .public-intro { margin-top: 18px; }
  .public-intro h3, .refs h3 { font-size: 15px; display: flex; align-items: center; gap: 6px; }
  .public-intro p { margin-top: 8px; line-height: 1.8; color: ${color.textSub}; white-space: pre-line; }
  /* 해설 카드는 한 번에 하나씩: 아래 < · · · > 로 넘긴다 */
  .section-carousel { margin-top: 20px; }
  .section { min-height: 148px; padding: 16px 18px; border: 1px solid ${line}; border-radius: ${radius.md}; }
  .section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .section strong { display: flex; align-items: center; gap: 6px; font-size: 15px; }
  .section-count { font-size: 12px; color: ${grayText}; }
  .carousel-controls { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 10px; }
  .carousel-arrow { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid ${line}; border-radius: 999px; background: ${color.surface}; color: ${ink}; transition: background .15s; }
  .carousel-arrow:hover { background: ${grayBg}; }
  .carousel-dots { display: flex; gap: 6px; }
  .carousel-dot { width: 8px; height: 8px; padding: 0; border-radius: 999px; background: ${line}; transition: width .2s, background .2s; }
  .carousel-dot[aria-current='true'] { width: 20px; background: ${ink}; }
  @media (prefers-reduced-motion: reduce) { .carousel-dot { transition: none; } }
  .section p { margin-top: 4px; font-size: 12px; color: ${color.textMuted}; }
  .pending { margin-top: 8px; font-size: 12px; color: ${ink}; }
  .loading { margin-top: 18px; font-size: 14px; color: ${ink}; }
  .error { margin-top: 18px; display: flex; align-items: center; gap: 12px; color: ${color.coral}; font-size: 14px; }
  .summary { margin-top: 16px; font-size: 16px; line-height: 1.8; color: ${color.text}; }
  .section-body { margin-top: 8px !important; font-size: 14px !important; line-height: 1.75; color: ${color.textSub} !important; }
  .ref-chips { display: flex; gap: 4px; margin-top: 8px !important; }
  .ref-chips span { padding: 1px 6px; border-radius: ${radius.sm}; background: ${grayBg}; color: ${ink}; font-size: 11px; }
  .news-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .news-list a { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border: 1px solid ${line}; border-radius: ${radius.md}; background: ${color.surface}; transition: background .15s, border-color .15s; }
  .news-list a:hover { ${linkHover} }
  .news-list a:hover strong, .news-list a:hover .news-meta, .news-list a:hover .news-summary { color: ${brand}; }
  .news-list strong { display: flex; align-items: center; gap: 4px; font-size: 15px; color: ${color.navyDeep}; }
  .news-meta { font-size: 12px; color: ${ink}; }
  .news-summary { font-size: 13px; line-height: 1.7; color: ${color.textSub}; }
  .ai-note { margin-top: 12px; font-size: 12px; color: ${ink}; }
  /* 근거 자료는 접어 두고 필요할 때 펼친다 */
  .refs { margin-top: 18px; border-top: 1px solid ${line}; }
  .refs summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 2px; list-style: none; cursor: pointer; font-size: 14px; font-weight: 600; color: ${ink}; }
  .refs summary::-webkit-details-marker { display: none; }
  .refs summary svg { flex-shrink: 0; width: 18px; height: 18px; transition: transform .2s; }
  .refs[open] summary svg { transform: rotate(180deg); }
  .refs p { margin-top: 0; font-size: 12px; color: ${ink}; }
  .ref-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; padding: 12px 14px; border: 1px solid ${line}; border-radius: ${radius.md}; background: ${color.surface}; color: ${ink}; font-size: 14px; transition: background .15s, border-color .15s; }
  .ref-row small { color: ${ink}; }
  .ref-row:hover { ${linkHover} }
  .ref-row:hover small { color: ${brand}; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
  .button { min-height: ${layout.minTouch}; padding: 0 16px; border-radius: ${radius.md}; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
  .button.outline { border: 1px solid ${color.borderStrong}; color: ${color.navyDeep}; }
  .button.primary { background: ${brand}; color: ${color.surface}; }
  .button:disabled { opacity: 0.6; }
  .news { margin-top: 20px; padding: 18px; border-radius: ${radius.md}; background: ${grayBg}; color: ${ink}; font-size: 14px; line-height: 1.7; }
  .status { margin-top: 10px; font-size: 12px; color: ${color.textMuted}; }
  .empty { display: grid; justify-items: center; gap: 12px; padding: 24px 10px; text-align: center; color: ${color.textMuted}; }
`;
