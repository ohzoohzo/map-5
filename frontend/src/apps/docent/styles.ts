import styled from '@emotion/styled';
import { color, layout, radius } from '../../shared/design/tokens';

export const Page = styled.div`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 32px ${layout.gutter} 40px;
  color: ${color.text};
  .page-title h1 { font-size: clamp(24px, 3vw, 36px); letter-spacing: -1px; }
  .page-title p { margin-top: 6px; color: ${color.textSub}; font-size: 16px; }
  .layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 20px; margin-top: 24px; align-items: start; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
`;

export const Card = styled.section`
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  padding: 20px;
`;

export const Picker = styled(Card)`
  .back { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid ${color.border}; border-radius: ${radius.md}; font-size: 13px; color: ${color.textSub}; }
  h2 { margin-top: 16px; font-size: 16px; }
  .search { display: flex; align-items: center; gap: 8px; height: ${layout.minTouch}; margin-top: 10px; padding: 0 12px; border: 1px solid ${color.border}; border-radius: ${radius.md}; color: ${color.textMuted}; }
  .search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: ${color.text}; }
  ul { list-style: none; margin: 12px 0 0; padding: 0; max-height: 520px; overflow-y: auto; }
  li button { width: 100%; text-align: left; padding: 10px 8px; border-radius: ${radius.md}; display: flex; gap: 10px; align-items: flex-start; }
  li button:hover { background: ${color.bg}; }
  li button[aria-pressed='true'] { background: ${color.primarySoft}; }
  li strong { display: block; font-size: 14px; color: ${color.text}; }
  li small { display: block; margin-top: 2px; font-size: 12px; color: ${color.textMuted}; }
  li svg { margin-top: 3px; color: ${color.primary}; }
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
  .slide-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: 11px; color: ${color.textMuted}; }
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
  .tabs button[aria-selected='true'] { color: ${color.primary}; border-bottom-color: ${color.primary}; }
  .label { display: inline-block; margin-top: 20px; padding: 3px 9px; border-radius: ${radius.sm}; background: ${color.primarySoft}; color: ${color.primary}; font-size: 12px; }
  h2 { margin-top: 8px; font-size: 24px; letter-spacing: -0.6px; }
  .address { margin-top: 4px; font-size: 13px; color: ${color.textMuted}; }
  .public-intro { margin-top: 18px; }
  .public-intro h3, .refs h3 { font-size: 15px; display: flex; align-items: center; gap: 6px; }
  .public-intro p { margin-top: 8px; line-height: 1.8; color: ${color.textSub}; white-space: pre-line; }
  .sections { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
  @media (max-width: 700px) { .sections { grid-template-columns: 1fr; } }
  .section { padding: 14px; border: 1px solid ${color.border}; border-radius: ${radius.md}; }
  .section strong { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .section p { margin-top: 4px; font-size: 12px; color: ${color.textMuted}; }
  .pending { margin-top: 8px; font-size: 12px; color: ${color.teal}; }
  .loading { margin-top: 18px; font-size: 14px; color: ${color.teal}; }
  .error { margin-top: 18px; display: flex; align-items: center; gap: 12px; color: ${color.coral}; font-size: 14px; }
  .summary { margin-top: 16px; font-size: 16px; line-height: 1.8; color: ${color.text}; }
  .section-body { margin-top: 8px !important; font-size: 13px !important; line-height: 1.7; color: ${color.textSub} !important; }
  .ref-chips { display: flex; gap: 4px; margin-top: 8px !important; }
  .ref-chips span { padding: 1px 6px; border-radius: ${radius.sm}; background: ${color.primarySoft}; color: ${color.primary}; font-size: 11px; }
  .news-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .news-list a { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border: 1px solid ${color.border}; border-radius: ${radius.md}; }
  .news-list a:hover { border-color: ${color.borderStrong}; background: ${color.bg}; }
  .news-list strong { display: flex; align-items: center; gap: 4px; font-size: 15px; color: ${color.navyDeep}; }
  .news-meta { font-size: 12px; color: ${color.teal}; }
  .news-summary { font-size: 13px; line-height: 1.7; color: ${color.textSub}; }
  .ai-note { margin-top: 12px; font-size: 12px; color: ${color.textMuted}; }
  .refs { margin-top: 22px; }
  .refs p { margin-top: 4px; font-size: 12px; color: ${color.textMuted}; }
  .ref-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; padding: 12px 14px; border: 1px solid ${color.border}; border-radius: ${radius.md}; color: ${color.primary}; font-size: 14px; }
  .ref-row small { color: ${color.textMuted}; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
  .button { min-height: ${layout.minTouch}; padding: 0 16px; border-radius: ${radius.md}; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
  .button.outline { border: 1px solid ${color.borderStrong}; color: ${color.navyDeep}; }
  .button.primary { background: ${color.coral}; color: ${color.surface}; }
  .button:disabled { opacity: 0.6; }
  .news { margin-top: 20px; padding: 18px; border-radius: ${radius.md}; background: ${color.bg}; color: ${color.textSub}; font-size: 14px; line-height: 1.7; }
  .status { margin-top: 10px; font-size: 12px; color: ${color.textMuted}; }
  .empty { padding: 40px 10px; text-align: center; color: ${color.textMuted}; }
`;
