import styled from '@emotion/styled';
import { color } from '../../shared/design/tokens';
import PinDayPage from '../../shared/ui/PinDayPage';

const fg = (name: string) => `var(--semantic-foreground-${name})`;
const line = 'var(--semantic-line-neutral-primary, #e1e2e4)';
const brand = 'var(--semantic-foreground-brand-primary, #0066ff)';
const surface = 'var(--semantic-background-neutral-primary, #fff)';
const canvas = 'var(--semantic-background-neutral-secondary, #f7f7f8)';
const teal = color.teal;
const tealSoft = `color-mix(in srgb, ${teal} 6%, white)`;
const columns = 'minmax(0, 1fr) 56px minmax(0, 1.1fr)';

export const WeatherPageLayout = styled(PinDayPage)`
  & { max-width: 1520px; }
  position: relative;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 50%;
    width: 100vw;
    transform: translateX(-50%);
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(135deg, color-mix(in srgb, ${color.primarySoft} 48%, white), ${surface} 62%, color-mix(in srgb, ${color.primarySoft} 35%, white));
  }
`;

export const WeatherSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  .w-card { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; padding: 16px 20px; min-width: 0; }
  .w-meta { font-size: 13px; line-height: 1.45; color: ${fg('neutral-tertiary')}; }
  .w-state { min-height: 160px; display: grid; place-items: center; text-align: center; }

  .w-hero { display: grid; grid-template-columns: ${columns}; gap: 12px 16px; align-items: center; }
  .w-hero-copy { grid-column: 1 / 3; display: grid; gap: 8px; min-width: 0; }
  .w-hero-copy h1 { margin: 0; font-size: clamp(34px, 3.4vw, 54px); font-weight: 800; line-height: 1.2; letter-spacing: -1.5px; word-break: keep-all; color: ${color.navy}; }
  .w-hero-copy .w-subtitle { margin: 0; font-size: clamp(18px, 1.8vw, 26px); line-height: 1.45; letter-spacing: -0.4px; word-break: keep-all; color: ${color.textSub}; }
  .w-pickers { grid-column: 1 / 3; grid-row: 2; display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.2fr); gap: 16px; max-width: 670px; min-width: 0; }
  .w-pickers .field { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .w-pickers .field > span { flex-shrink: 0; font-size: 13px; color: ${color.textSub}; }
  .w-pickers .field > div { min-width: 0; }
  .w-forecast { grid-column: 3; grid-row: 1 / 3; display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; gap: 8px 20px; min-height: 128px; }
  .w-forecast.has-advice { grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); }
  .w-forecast.rainy { background: color-mix(in srgb, ${color.primarySoft} 50%, white); border-color: ${color.borderStrong}; }
  .w-forecast-left { display: grid; gap: 8px; min-width: 0; }
  .w-forecast-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; font-size: 14px; font-weight: 600; color: ${color.navy}; }
  .w-source-badge { padding: 2px 8px; border-radius: 999px; background: ${surface}; color: ${brand}; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .w-forecast-main { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .w-forecast-main > div { min-width: 0; }
  .w-forecast-main strong { display: block; font-size: 23px; font-weight: 800; line-height: 1.3; word-break: keep-all; color: ${color.navy}; }
  .w-forecast-main p { margin: 4px 0 0; font-size: 14px; line-height: 1.45; color: ${color.textSub}; overflow-wrap: anywhere; }
  .w-weather-icon { width: 48px; height: 48px; color: ${brand}; flex-shrink: 0; }
  .w-weather-icon.muted { color: ${fg('neutral-tertiary')}; }
  .w-advice { margin: 0; padding-left: 20px; border-left: 1px solid ${color.borderStrong}; font-size: 15px; line-height: 1.6; word-break: keep-all; color: ${color.textSub}; }
  .w-forecast-time { grid-column: 1 / -1; margin: 0; font-size: 11px; line-height: 1.4; color: ${fg('neutral-tertiary')}; }

  .w-compare { display: grid; grid-template-columns: ${columns}; gap: 16px; align-items: stretch; }
  .w-place { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 20px; padding: 14px 14px 14px 20px; }
  .w-place.original { min-height: 420px; }
  .w-place.chosen { background: ${tealSoft}; border-color: color-mix(in srgb, ${teal} 35%, white); }
  .w-place-copy { display: flex; flex-direction: column; gap: 12px; min-width: 0; padding: 2px 0; }
  .w-place.chosen .w-place-copy { gap: 8px; }
  .w-place-copy h2 { margin: 2px 0 0; font-size: 27px; font-weight: 800; line-height: 1.25; letter-spacing: -.7px; word-break: keep-all; overflow-wrap: anywhere; color: ${color.navy}; }
  .w-card-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .w-tag { padding: 6px 12px; border-radius: 8px; font-size: 15px; font-weight: 700; line-height: 1.4; color: ${surface}; background: ${color.textMuted}; }
  .w-tag.accent { background: ${teal}; }
  .w-badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: ${canvas}; color: ${color.textSub}; font-size: 13px; line-height: 1.4; font-weight: 600; }
  .w-badge svg { width: 16px; height: 16px; }
  .w-badge.indoor { background: ${color.primarySoft}; color: ${color.primary}; }
  .w-badge.small { padding: 2px 8px; font-size: 11px; }
  .w-badge.small svg { width: 12px; height: 12px; }
  .w-description { margin: 2px 0 0; font-size: 15px; line-height: 1.65; color: ${color.textSub}; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .w-place.chosen .w-description { -webkit-line-clamp: 2; }
  .w-place-link { max-width: 100%; min-width: 0; align-self: flex-start; margin-top: auto; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 4px 0; font-size: 14px; line-height: 1.45; color: ${color.textSub}; text-align: left; overflow-wrap: anywhere; }
  .w-place.original .w-place-link { margin-top: 4px; }
  .w-place-link > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-place-link svg { width: 16px; height: 16px; flex-shrink: 0; }
  .w-place-link:hover { color: ${brand}; }
  .w-place-footer { display: flex; align-items: center; gap: 8px; margin-top: auto; min-width: 0; }
  .w-place-footer .w-place-link { min-height: 28px; flex: 1; min-width: 0; }
  .w-place-footer .w-meta { font-size: 12px; flex-shrink: 0; }

  .w-visual { display: grid; place-items: center; border-radius: 12px; color: ${surface}; min-height: 220px; min-width: 0; }
  .w-visual.large { min-height: 390px; }
  .w-visual.small { min-height: 0; width: 100%; height: 100%; border-radius: 10px; }
  .w-visual svg { width: 56px; height: 56px; }
  .w-visual.small svg { width: 26px; height: 26px; }
  .w-visual.outdoor { background: linear-gradient(160deg, ${color.primarySoft}, ${color.primary}); }
  .w-visual.indoor { background: linear-gradient(150deg, ${color.primarySoft}, ${teal}); }
  .w-visual.neutral { background: linear-gradient(150deg, ${color.borderStrong}, ${color.textMuted}); }
  .w-photo-state { display: grid; justify-items: center; gap: 8px; padding: 8px; font-size: 12px; line-height: 1.4; text-align: center; }
  .w-visual.small .w-photo-state { width: 100%; min-width: 0; gap: 4px; padding: 4px; font-size: 10px; }
  .w-visual.small .w-photo-state > span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%; }
  .w-visual.small .w-photo-state svg { width: 20px; height: 20px; }
  .w-visual.photo { margin: 0; overflow: hidden; background: ${canvas}; grid-template-rows: minmax(0, 1fr); justify-items: stretch; }
  .w-photo-frame { position: relative; align-self: stretch; min-height: 160px; width: 100%; }
  .w-visual.photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .w-visual.photo[data-photo-fit='cover'] img { object-fit: cover; }
  .w-visual.photo.small { height: auto; }
  .w-visual.photo.small .w-photo-frame { min-height: 64px; }

  .w-swap { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; border-radius: 16px; text-align: center; word-break: keep-all; font-size: 13px; line-height: 1.4; font-weight: 700; color: ${color.navy}; transition: background .15s; }
  .w-swap svg { width: 52px; height: 52px; padding: 14px; border-radius: 50%; background: ${color.primarySoft}; color: ${brand}; transition: background .15s, color .15s; }
  .w-swap:not(:disabled):hover { background: ${canvas}; }
  .w-swap:not(:disabled):hover svg { background: ${brand}; color: ${surface}; }
  .w-swap:disabled { opacity: .4; }

  .w-alt-column { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .w-more { display: grid; gap: 8px; justify-items: start; }
  .w-more-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; }
  .w-more-head > button { flex-shrink: 0; }
  .w-more h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; line-height: 1.5; color: ${color.navy}; }
  .w-dot { width: 10px; height: 10px; border-radius: 50%; background: ${brand}; box-shadow: 0 0 0 3px ${color.primarySoft}; }
  .w-more-list { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .w-more-list > li { min-width: 0; }
  .w-more-item { width: 100%; height: 100%; display: grid; grid-template-columns: minmax(80px, .8fr) minmax(0, 1.2fr) 16px; align-items: stretch; gap: 10px; padding: 8px; text-align: left; background: ${surface}; border: 1px solid ${line}; border-radius: 12px; transition: border-color .15s; }
  .w-more-item:hover { border-color: ${teal}; }
  .w-more-item .w-visual { min-height: 104px; }
  .w-more-copy { display: grid; align-content: center; gap: 4px; min-width: 0; }
  .w-more-copy strong { font-size: 14px; line-height: 1.4; font-weight: 700; color: ${color.navy}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-more-copy .w-badge { justify-self: start; }
  .w-more-description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 12px; line-height: 1.5; color: ${color.textSub}; }
  .w-more-copy small { display: flex; align-items: center; gap: 4px; font-size: 12px; line-height: 1.4; color: ${color.textMuted}; }
  .w-more-copy small svg { width: 13px; height: 13px; }
  .w-chevron { align-self: center; width: 16px; height: 16px; color: ${color.textMuted}; }

  .w-docent { padding: 0; overflow: hidden; }
  .w-docent-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px 0; }
  .w-docent-head h2 { margin: 0; }

  .w-preview { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 14px 20px; align-items: center; }
  .w-preview-label { display: flex; gap: 12px; align-items: flex-start; padding-right: 20px; border-right: 1px solid ${line}; }
  .w-preview-label h2 { margin: 0 0 4px; font-size: 20px; line-height: 1.4; font-weight: 800; color: ${color.navy}; }
  .w-preview-label p, .w-preview-label span { line-height: 1.55; }
  .w-preview-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: ${color.primarySoft}; color: ${color.navy}; flex-shrink: 0; }
  .w-preview-icon svg { width: 25px; height: 25px; }
  .w-timeline { list-style: none; margin: 0; padding: 0; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 32px; }
  .w-stop { position: relative; display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 12px; align-items: center; padding: 8px; border-radius: 12px; background: ${canvas}; min-height: 80px; min-width: 0; }
  .w-stop .w-visual { height: 64px; }
  .w-stop .w-visual.photo { height: auto; }
  .w-stop + .w-stop::before { content: '→'; position: absolute; left: -26px; top: 50%; transform: translateY(-50%); font-size: 22px; color: ${brand}; }
  .w-stop.replaced { background: ${tealSoft}; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${teal} 40%, white); }
  .w-stop-copy { display: grid; gap: 6px; min-width: 0; }
  .w-stop-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .w-stop-order { font-size: 15px; font-weight: 600; color: ${color.navy}; }
  .w-stop-badge { padding: 2px 7px; border-radius: 999px; background: ${surface}; border: 1px solid ${line}; font-size: 11px; line-height: 1.4; color: ${color.textMuted}; }
  .w-stop-badge.replaced { background: ${teal}; border-color: ${teal}; color: ${surface}; font-weight: 700; }
  .w-stop-copy strong { font-size: 16px; line-height: 1.4; color: ${color.navy}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .w-info { flex: 1 1 360px; margin: 0; display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 14px; border-radius: 10px; background: ${color.primarySoft}; font-size: 13px; line-height: 1.5; color: ${color.textSub}; }
  .w-info svg { width: 18px; height: 18px; flex-shrink: 0; color: ${brand}; }
  .w-actions > button { min-width: 180px; }
  .w-actions > .w-replace-action { background: ${color.coral}; border-color: ${color.coral}; color: ${color.navy}; font-weight: 700; }
  .w-actions > .w-replace-action:hover { background: color-mix(in srgb, ${color.coral} 88%, ${color.navy}); border-color: transparent; }
  .w-actions > .w-replace-action:active { background: color-mix(in srgb, ${color.coral} 80%, ${color.navy}); }
  .w-footer { display: flex; justify-content: space-between; gap: 8px 24px; flex-wrap: wrap; font-size: 12px; line-height: 1.5; color: ${color.textMuted}; }

  @media (min-width: 1101px) and (max-width: 1280px) {
    .w-hero, .w-compare { grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1.1fr); gap: 12px; }
    .w-hero { row-gap: 12px; }
    .w-hero-copy h1 { font-size: 36px; letter-spacing: -1.1px; }
    .w-hero-copy .w-subtitle { font-size: 20px; }
    .w-pickers { gap: 10px; }
    .w-pickers .field { gap: 6px; }
    .w-pickers .field > span { font-size: 12px; }
    .w-forecast, .w-forecast.has-advice { grid-template-columns: 1fr; padding: 14px 16px; gap: 6px; }
    .w-forecast-left { gap: 6px; }
    .w-forecast-main strong { font-size: 20px; }
    .w-weather-icon { width: 38px; height: 38px; }
    .w-advice { padding: 0; border-left: 0; font-size: 13px; }
    .w-place { gap: 12px; padding: 12px; }
    .w-place-copy h2 { font-size: 23px; }
    .w-place-copy { gap: 10px; }
    .w-place .w-card-top { gap: 6px; }
    .w-tag { font-size: 13px; padding: 5px 8px; }
    .w-badge { font-size: 12px; padding: 5px 8px; }
    .w-description { font-size: 14px; }
    .w-place-link { font-size: 12px; }
    .w-place-footer { display: grid; gap: 0; }
    .w-more-item { grid-template-columns: 70px minmax(0, 1fr) 12px; gap: 6px; padding: 6px; }
    .w-more-item .w-visual { min-height: 112px; }
    .w-more-copy strong { font-size: 13px; }
    .w-more-copy small { font-size: 11px; }
    .w-more-description { font-size: 11px; }
    .w-more-copy .w-badge.small { font-size: 10px; padding: 2px 5px; }
    .w-chevron { width: 12px; }
    .w-swap { font-size: 12px; }
    .w-swap svg { width: 44px; height: 44px; padding: 12px; }
    .w-preview { grid-template-columns: 220px minmax(0, 1fr); gap: 12px 16px; }
    .w-preview-label { gap: 8px; padding-right: 14px; }
    .w-preview-label h2 { font-size: 18px; }
    .w-preview-icon { width: 36px; height: 36px; }
    .w-timeline { gap: 22px; }
    .w-stop { grid-template-columns: 60px minmax(0, 1fr); gap: 8px; padding: 6px; }
    .w-stop + .w-stop::before { left: -19px; font-size: 18px; }
    .w-stop-copy strong { font-size: 14px; }
    .w-stop-order { font-size: 13px; }
    .w-stop-badge { padding: 2px 5px; font-size: 10px; }
  }
  @media (max-width: 1100px) {
    .w-hero { grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .w-hero-copy, .w-pickers, .w-forecast { grid-column: 1; grid-row: auto; }
    .w-pickers { max-width: none; }
    .w-forecast.has-advice { grid-template-columns: minmax(0, 1fr) minmax(0, .8fr); }
    .w-compare { grid-template-columns: minmax(0, 1fr); }
    .w-place.original { min-height: 320px; }
    .w-visual.large { min-height: 290px; }
    .w-place.chosen { min-height: 240px; }
    .w-swap { flex-direction: row; justify-content: center; gap: 12px; }
    .w-swap svg { transform: rotate(90deg); }
    .w-more-item { grid-template-columns: 112px minmax(0, 1fr) 16px; }
    .w-preview { grid-template-columns: minmax(0, 1fr); }
    .w-preview-label { border-right: 0; padding-right: 0; }
  }
  @media (max-width: 720px) {
    gap: 16px;
    .w-card { padding: 16px; }
    .w-hero-copy h1 { font-size: 32px; line-height: 1.25; letter-spacing: -1px; }
    .w-hero-copy .w-subtitle { font-size: 18px; }
    .w-pickers { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .w-pickers .field > span { width: 82px; }
    .w-forecast, .w-forecast.has-advice { grid-template-columns: minmax(0, 1fr); }
    .w-forecast-head { gap: 6px; font-size: 13px; }
    .w-forecast-main strong { font-size: 22px; }
    .w-advice { padding: 10px 0 0; border-left: 0; border-top: 1px solid ${color.borderStrong}; font-size: 14px; }
    .w-place { grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .w-place.original, .w-place.chosen { min-height: 0; }
    .w-place-copy { gap: 10px; }
    .w-place-copy h2 { font-size: 26px; }
    .w-place-link { min-height: 44px; }
    .w-visual, .w-visual.large { min-height: 220px; }
    .w-place.original > .w-visual { min-height: 280px; }
    .w-place-footer { display: grid; gap: 2px; }
    .w-place-footer .w-place-link { min-height: 36px; }
    .w-more-list { grid-template-columns: minmax(0, 1fr); }
    .w-more-item { grid-template-columns: 100px minmax(0, 1fr) 16px; }
    .w-more-item .w-visual { min-height: 104px; }
    .w-timeline { grid-auto-flow: row; gap: 28px; }
    .w-stop { grid-template-columns: 80px minmax(0, 1fr); }
    .w-stop + .w-stop::before { content: '↓'; left: 50%; top: -25px; transform: translateX(-50%); }
    .w-actions { gap: 10px; }
    .w-info { flex-basis: 100%; align-items: flex-start; }
    .w-actions > button { flex: 1 1 auto; min-width: 0; }
    .w-footer { gap: 6px; }
  }
`;
