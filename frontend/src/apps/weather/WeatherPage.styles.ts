import styled from '@emotion/styled';
import { color, font, layout, radius } from '../../shared/design/tokens';

// 색·간격은 shared/design/tokens 값만 쓴다
export const Page = styled.div`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 32px ${layout.gutter} 48px;
  color: ${color.text};
  font-family: ${font.family};
  display: flex;
  flex-direction: column;
  gap: 18px;

  .w-page-head h1 { font-size: clamp(26px, 3.2vw, 44px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.25; color: ${color.navy}; }
  .w-page-head p { margin-top: 6px; font-size: clamp(16px, 1.6vw, 22px); color: ${color.textSub}; }

  .w-card { background: ${color.surface}; border: 1px solid ${color.border}; border-radius: ${radius.lg}; padding: 20px; }
  .w-muted { color: ${color.textMuted}; font-size: 14px; }
  .w-footnote { color: ${color.textMuted}; font-size: 12px; line-height: 1.6; }
  .w-error { color: ${color.coral}; }

  .w-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: ${layout.minTouch}; padding: 0 22px; border-radius: ${radius.md}; border: 1px solid ${color.primary}; color: ${color.primary}; background: ${color.surface}; font-weight: 700; font-size: 15px; white-space: nowrap; }
  .w-button.w-primary { background: ${color.primary}; color: ${color.surface}; }
  .w-button.w-cta { background: ${color.coral}; border-color: ${color.coral}; color: ${color.surface}; }

  .w-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 48px 20px; color: ${color.textSub}; }
  .w-empty strong { font-size: 18px; color: ${color.navy}; }
  .w-empty p { max-width: 460px; line-height: 1.7; font-size: 14px; }

  .w-notice { padding: 14px 18px; border-radius: ${radius.md}; background: ${color.primarySoft}; color: ${color.navyDeep}; font-weight: 600; font-size: 14px; }
  .w-notice a { margin-left: 8px; text-decoration: underline; }

  .w-picker h2 { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
  .w-day-tabs, .w-stop-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .w-stop-chips { margin-top: 12px; }
  .w-day-tab, .w-chip { min-height: ${layout.minTouch}; padding: 0 16px; border-radius: ${radius.pill}; border: 1px solid ${color.border}; font-size: 14px; font-weight: 600; color: ${color.textSub}; background: ${color.surface}; display: inline-flex; align-items: center; gap: 8px; }
  .w-day-tab.w-active { background: ${color.primary}; border-color: ${color.primary}; color: ${color.surface}; }
  .w-chip.w-active { background: ${color.primarySoft}; border-color: ${color.primary}; color: ${color.primary}; }
  .w-chip-order { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: ${color.bg}; font-size: 12px; }

  .w-forecast { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px 24px; }
  .w-forecast > .w-muted:first-of-type { grid-column: 1 / -1; font-weight: 600; }
  .w-forecast strong { font-size: 22px; font-weight: 800; color: ${color.navy}; }
  .w-forecast.w-rainy { background: ${color.primarySoft}; border-color: ${color.borderStrong}; }
  .w-forecast-main { display: flex; align-items: center; gap: 14px; color: ${color.primary}; }
  .w-forecast-main p { color: ${color.textSub}; font-size: 15px; margin-top: 4px; }
  .w-advice { color: ${color.textSub}; font-size: 15px; line-height: 1.6; max-width: 360px; }
  .w-forecast .w-footnote { grid-column: 1 / -1; }

  .w-compare { display: grid; grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr); gap: 16px; align-items: start; }
  .w-place-card { display: flex; flex-direction: column; gap: 12px; min-height: 260px; }
  .w-place-card.w-chosen { border-color: ${color.teal}; }
  .w-place-card h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.8px; color: ${color.navy}; }
  .w-card-top { display: flex; align-items: center; gap: 12px; }
  .w-tag { padding: 6px 12px; border-radius: ${radius.sm}; font-size: 14px; font-weight: 700; color: ${color.surface}; background: ${color.textMuted}; }
  .w-tag.w-teal { background: ${color.teal}; }
  .w-badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: ${radius.pill}; background: ${color.bg}; color: ${color.textSub}; font-size: 13px; font-weight: 600; }
  .w-badge.w-teal { background: ${color.primarySoft}; color: ${color.teal}; }
  .w-description { color: ${color.textSub}; font-size: 14px; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .w-address { display: flex; align-items: center; gap: 6px; color: ${color.textSub}; font-size: 13px; margin-top: auto; }

  .w-swap { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; word-break: keep-all; font-size: 13px; font-weight: 700; color: ${color.navy}; }
  .w-swap svg { width: 48px; height: 48px; padding: 13px; border-radius: 50%; background: ${color.primarySoft}; color: ${color.primary}; }

  .w-alt-column { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .w-state { min-height: 120px; display: grid; place-items: center; text-align: center; }
  .w-more-title { font-size: 15px; font-weight: 700; color: ${color.navy}; }
  .w-more-list { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .w-more-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px; text-align: left; color: ${color.teal}; }
  .w-more-item:hover { border-color: ${color.teal}; }
  .w-more-item span { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .w-more-item strong { color: ${color.navy}; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-more-item small { color: ${color.textMuted}; font-size: 12px; }

  .w-preview { display: flex; flex-direction: column; gap: 16px; }
  .w-preview-head { display: flex; gap: 12px; color: ${color.primary}; }
  .w-preview-head h2 { font-size: 18px; font-weight: 800; color: ${color.navy}; }
  .w-timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px; }
  .w-stop { flex: 1 1 200px; display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border-radius: ${radius.md}; background: ${color.bg}; }
  .w-stop small { color: ${color.textMuted}; font-size: 12px; }
  .w-stop strong { font-size: 16px; color: ${color.navy}; }
  .w-stop.w-replaced { background: ${color.primarySoft}; border: 1px solid ${color.teal}; }
  .w-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  .w-info { flex: 1 1 320px; display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: ${radius.md}; background: ${color.primarySoft}; color: ${color.textSub}; font-size: 14px; }

  @media (max-width: 900px) {
    .w-compare { grid-template-columns: 1fr; }
    .w-swap { flex-direction: row; }
    .w-swap svg { transform: rotate(90deg); }
    .w-forecast { grid-template-columns: 1fr; }
    .w-more-list { grid-template-columns: 1fr; }
    .w-actions .w-button { flex: 1 1 auto; }
  }
`;
