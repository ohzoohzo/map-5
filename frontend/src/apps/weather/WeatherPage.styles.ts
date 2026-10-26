import styled from '@emotion/styled';
import { color } from '../../shared/design/tokens';
import PinDayPage from '../../shared/ui/PinDayPage';

const fg = (name: string) => `var(--semantic-foreground-${name})`;
const line = 'var(--semantic-line-neutral-primary, #e1e2e4)';
const brand = 'var(--semantic-foreground-brand-primary, #0066ff)';
const surface = 'var(--semantic-background-neutral-primary, #fff)';
const canvas = 'var(--semantic-background-neutral-secondary, #f7f7f8)';
const teal = color.teal;
const columns = 'minmax(0, 1fr) 56px minmax(0, 1.1fr)';

export const WeatherPageLayout = styled(PinDayPage)`
  /* 가로 폭은 PinDayPage 기본값(1440px)으로 1·2·4단계 화면과 맞춘다 */
  /* 여행 계획하기와 같은 단계 바 아래 간격 */
  /* 여행 계획하기·어떻게 갈까?처럼 단계 바를 머리글 아래에 고정 */
  .trip-bar-wrap { position: sticky; top: 78px; z-index: 30; padding: 8px 0; margin-bottom: 12px; background: ${surface}; }
  @media (max-width: 720px) {
    .trip-bar-wrap { top: 66px; }
  }
  /* 어디 갈까?·언제 갈까?·어떻게 갈까?와 같은 하단 플로팅 바 (.candidate-tray 는 PinDayPage 공통 모양) */
  .weather-tray .tray-summary { max-width: none; }
  .weather-tray-actions { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
  .weather-tray-actions button { white-space: nowrap; }
  .weather-tray .tray-day { white-space: nowrap; }
  @media (max-width: 720px) {
    .weather-tray-actions { width: 100%; }
    .weather-tray-actions button { flex: 1; min-width: 0; }
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

  /* 어떻게 갈까?와 같은 3단 패널: 변경 추천 일정 / 변경할 장소 / 변경할 장소 지도 */
  .w-planner { display: grid; grid-template-columns: minmax(260px, .85fr) minmax(300px, .95fr) minmax(340px, 1.2fr); gap: 16px; align-items: start; }
  .w-panel { min-width: 0; padding: 20px; background: ${surface}; border: 1px solid ${line}; border-radius: 12px; }
  .w-panel.plan { container: weather-plan / inline-size; }
  .w-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .w-panel-head h2 { margin: 0; }
  .w-panel-count { color: ${fg('neutral-tertiary')}; font-size: 12px; }
  .w-day-tabs { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; }
  .w-day-tab { display: inline-flex; flex: 1 0 auto; align-items: center; justify-content: center; gap: 4px; min-height: 40px; padding: 8px 12px; border-radius: 10px;
    background: color-mix(in srgb, var(--day-color) 10%, white); color: var(--day-color); font-size: 14px; font-weight: 700; white-space: nowrap; }
  .w-day-tab svg { width: 16px; height: 16px; flex-shrink: 0; }
  .w-day-tab .w-day-date { font-weight: 500; }
  .w-day-tab[aria-pressed='true'] { background: var(--day-color); color: #fff; }
  @container weather-plan (max-width: 460px) {
    .w-day-tab { flex-direction: column; gap: 2px; padding: 8px; }
    .w-day-tab svg, .w-day-tab .w-day-separator { display: none; }
    .w-day-tab .w-day-date { font-size: 12px; }
  }
  .w-plan-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .w-plan-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 62px; padding: 10px 12px; border: 1px solid ${line}; border-radius: 8px; background: ${surface}; text-align: left; }
  .w-plan-row:hover { background: ${canvas}; }
  .w-plan-row[aria-pressed='true'] { border-color: ${fg('neutral-strong')}; box-shadow: inset 0 0 0 1px ${fg('neutral-strong')}; }
  .w-plan-number { display: grid; place-items: center; flex: 0 0 32px; width: 32px; height: 32px; border-radius: 999px; background: ${canvas}; color: ${fg('neutral-tertiary')}; font-size: 14px; font-weight: 600; }
  .w-plan-name { flex: 1; min-width: 0; overflow-wrap: anywhere; font-weight: 700; color: ${fg('neutral-strong')}; }
  .w-plan-row .w-badge { flex-shrink: 0; align-self: center; }
  /* 고정 머리글(78px)과 단계 바 아래에 패널 머리가 오도록 */
  #weather-swap-panel { scroll-margin-top: 176px; }
  .w-change-log { width: calc(100% - 16px); font-family: inherit; text-align: left; display: flex; align-items: center; gap: 8px; min-height: 34px; margin: 8px 0 0 16px; padding: 6px 12px; border: 1px solid var(--day-color); border-radius: 8px;
    background: color-mix(in srgb, var(--day-color) 10%, white); color: var(--day-color); font-size: 13px; font-weight: 700; }
  .w-change-log svg { width: 16px; height: 16px; flex-shrink: 0; }
  button.w-change-log { cursor: pointer; transition: background .15s; }
  button.w-change-log:hover { background: color-mix(in srgb, var(--day-color) 18%, white); }
  .w-change-log .w-undo { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0; font-size: 12px; overflow: visible; }
  .w-change-log .w-undo svg { width: 14px; height: 14px; }
  .w-change-log > span:not(.w-undo) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-plan-row .w-badge.recommend { background: ${color.primarySoft}; color: ${color.primary}; }
  .w-advice-note { margin: 0; padding: 10px 12px; border-radius: 8px; background: ${canvas}; color: ${fg('neutral-secondary')}; font-size: 13px; line-height: 1.55; word-break: keep-all; }
  .w-advice-note.recommend { background: ${color.primarySoft}; color: ${color.primary}; font-weight: 600; }
  /* 두 장소 위치만 보면 되므로 지도는 작게, 핀에는 번호 대신 장소 이름 */
  .w-panel.map .map-frame { height: 220px; min-height: 0; }
  .w-panel.map .map-pin { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 700; }
  .w-panel.map .legend-dot { margin-left: 0; margin-right: 4px; vertical-align: -1px; }
  .w-panel.map .legend-dot.alternative { background: var(--day-color); }
  @media (max-width: 1080px) {
    .w-planner { grid-template-columns: minmax(260px, .85fr) minmax(300px, 1.15fr); }
    .w-panel.map { grid-column: 1 / -1; }
  }
  @media (max-width: 760px) {
    .w-planner { grid-template-columns: minmax(0, 1fr); }
    .w-panel { padding: 16px; }
  }

  .w-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px 16px; align-items: center; }
  .w-forecast { grid-column: 1 / -1; grid-row: 1; display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; gap: 8px 20px; min-height: 128px; }
  .w-forecast.has-advice { grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); }
  .w-forecast.rainy { background: color-mix(in srgb, ${color.primarySoft} 50%, white); border-color: ${color.borderStrong}; }
  .w-forecast-left { display: grid; gap: 8px; min-width: 0; }
  .w-forecast-head { display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 4px 8px; font-size: 14px; font-weight: 600; color: ${color.navy}; }
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
  /* 바꿔볼 장소는 배경 없이 DAY 색 테두리로만 구분한다 */
  .w-place.chosen { background: ${surface}; border-color: var(--day-color, ${teal}); }
  .w-place-copy { display: flex; flex-direction: column; gap: 12px; min-width: 0; padding: 2px 0; }
  .w-place.chosen .w-place-copy { gap: 8px; }
  .w-place-copy h2 { margin: 2px 0 0; font-size: 27px; font-weight: 800; line-height: 1.25; letter-spacing: -.7px; word-break: keep-all; overflow-wrap: anywhere; color: ${color.navy}; }
  .w-card-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .w-tag { padding: 6px 12px; border-radius: 8px; font-size: 15px; font-weight: 700; line-height: 1.4; color: ${surface}; background: ${color.textMuted}; }
  .w-tag.accent { background: var(--day-color, ${teal}); }
  .w-badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: ${canvas}; color: ${color.textSub}; font-size: 13px; line-height: 1.4; font-weight: 600; }
  .w-badge svg { width: 16px; height: 16px; }
  .w-badge.indoor { background: ${canvas}; color: ${fg('neutral-secondary')}; }
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
  .w-visual.indoor { background: linear-gradient(150deg, color-mix(in srgb, var(--day-color, ${teal}) 15%, white), var(--day-color, ${teal})); }
  .w-visual.neutral { background: linear-gradient(150deg, ${color.borderStrong}, ${color.textMuted}); }
  .w-photo-state { display: grid; justify-items: center; gap: 8px; padding: 8px; font-size: 12px; line-height: 1.4; text-align: center; }
  .w-visual.small .w-photo-state { width: 100%; min-width: 0; gap: 4px; padding: 4px; font-size: 10px; }
  .w-visual.small .w-photo-state > span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%; }
  .w-visual.small .w-photo-state svg { width: 20px; height: 20px; }
  .w-visual.photo { margin: 0; overflow: hidden; background: ${canvas}; grid-template-rows: minmax(0, 1fr); justify-items: stretch; }
  .w-photo-frame { position: relative; align-self: stretch; min-height: 160px; width: 100%; }
  .w-visual.photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .w-visual.photo.small { height: auto; }
  .w-visual.photo.small .w-photo-frame { min-height: 64px; }

  .w-swap { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; border-radius: 16px; text-align: center; word-break: keep-all; font-size: 13px; line-height: 1.4; font-weight: 700; color: ${color.navy}; transition: background .15s; }
  .w-swap svg { width: 52px; height: 52px; padding: 14px; border-radius: 50%; background: color-mix(in srgb, var(--day-color, ${teal}) 12%, white); color: var(--day-color, ${teal}); transition: background .15s, color .15s; }
  .w-swap:not(:disabled):hover { background: ${canvas}; }
  .w-swap:not(:disabled):hover svg { background: var(--day-color, ${teal}); color: ${surface}; }
  .w-swap:disabled { opacity: .4; }

  .w-alt-column { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .w-more { display: grid; gap: 8px; justify-items: start; }
  .w-more-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; }
  .w-more-head > button { flex-shrink: 0; }
  .w-more h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; line-height: 1.5; color: ${color.navy}; }
  .w-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--day-color, ${brand}); box-shadow: 0 0 0 3px color-mix(in srgb, var(--day-color, ${brand}) 15%, white); }
  .w-more-list { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .w-more-list > li { min-width: 0; }
  .w-more-item { width: 100%; height: 100%; display: grid; grid-template-columns: minmax(80px, .8fr) minmax(0, 1.2fr) 16px; align-items: stretch; gap: 10px; padding: 8px; text-align: left; background: ${surface}; border: 1px solid ${line}; border-radius: 12px; transition: border-color .15s; }
  .w-more-item:hover { border-color: var(--day-color, ${teal}); }
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

  .w-footer { display: flex; justify-content: space-between; gap: 8px 24px; flex-wrap: wrap; font-size: 12px; line-height: 1.5; color: ${color.textMuted}; }

  @media (min-width: 1101px) and (max-width: 1280px) {
    .w-compare { grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1.1fr); gap: 12px; }
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
  }
  @media (max-width: 1100px) {
    .w-hero { grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .w-forecast.has-advice { grid-template-columns: minmax(0, 1fr) minmax(0, .8fr); }
    .w-compare { grid-template-columns: minmax(0, 1fr); }
    .w-place.original { min-height: 320px; }
    .w-visual.large { min-height: 290px; }
    .w-place.chosen { min-height: 240px; }
    .w-swap { flex-direction: row; justify-content: center; gap: 12px; }
    .w-swap svg { transform: rotate(90deg); }
    .w-more-item { grid-template-columns: 112px minmax(0, 1fr) 16px; }
  }
  @media (max-width: 720px) {
    gap: 16px;
    .w-card { padding: 16px; }
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
    .w-footer { gap: 6px; }
  }

  /* '변경할 장소' 패널 안의 원래 일정 · 바꿔볼 장소 · 이런 곳도 있어요: 좁은 패널에 맞춰 한 열로 쌓는다 */
  .w-panel.swap .w-compare { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .w-panel.swap .w-place, .w-panel.swap .w-place.original, .w-panel.swap .w-place.chosen { grid-template-columns: minmax(0, 1fr); gap: 12px; min-height: 0; padding: 14px; }
  .w-panel.swap .w-place-copy { gap: 8px; }
  .w-panel.swap .w-place-copy h2 { font-size: 22px; }
  .w-panel.swap .w-description { font-size: 14px; -webkit-line-clamp: 3; }
  .w-panel.swap .w-visual, .w-panel.swap .w-visual.large, .w-panel.swap .w-place.original > .w-visual { min-height: 160px; }
  .w-panel.swap .w-swap { flex-direction: row; justify-content: center; gap: 10px; padding: 0; }
  .w-panel.swap .w-swap svg { width: 40px; height: 40px; padding: 10px; transform: rotate(90deg); }
  .w-panel.swap .w-more-list { grid-template-columns: minmax(0, 1fr); }
  .w-panel.swap .w-more-item { grid-template-columns: 96px minmax(0, 1fr) 16px; }
  .w-panel.swap .w-more-item:not(:has(> .w-visual)) { grid-template-columns: minmax(0, 1fr) 16px; }
  .w-panel.swap .w-more-item .w-visual { min-height: 96px; }
`;
