import styled from '@emotion/styled';

// 어디 갈까?·언제 갈까? 화면 공통 레이아웃. 색은 원티드 Montage 의미 토큰(@montage-ui/core/global.css)을 따른다.
const fg = (name: string) => `var(--semantic-foreground-${name})`;
const line = 'var(--semantic-line-neutral-primary, #e1e2e4)';
const brand = 'var(--semantic-foreground-brand-primary, #0066ff)';
const surface = 'var(--semantic-background-neutral-primary, #fff)';
const canvas = 'var(--semantic-background-neutral-secondary, #f7f7f8)';

const PinDayPage = styled.div`
  & { max-width: 1440px; margin: auto; padding: 20px 32px 24px; }
  .trip-bar-wrap { display: grid; gap: 12px; margin-bottom: 24px; }
  .trip-bar { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; background: ${surface}; border: 1px solid ${line}; border-radius: 16px; padding: 12px 16px 12px 24px; }
  .trip-fact { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: ${fg('neutral-strong')}; }
  .trip-fact svg { width: 20px; height: 20px; color: ${fg('neutral-secondary')}; }
  .trip-counts { margin-left: auto; display: flex; gap: 8px; }
  .count-chip { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px; border-radius: 999px; font-size: 14px; color: ${fg('neutral-secondary')}; border: 1px solid ${line}; transition: background .15s; }
  .count-chip svg { width: 18px; height: 18px; } .count-chip strong { color: ${fg('neutral-strong')}; font-size: 15px; }
  .count-chip:hover { background: ${canvas}; } .count-chip.active { background: #eaf2fe; border-color: transparent; color: ${brand}; } .count-chip.active strong { color: ${brand}; }
  .conditions-form { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; padding: 20px 24px; display: grid; gap: 16px; }
  .conditions-form h2 { margin: 0; }
  .conditions-fields { display: grid; grid-template-columns: minmax(180px, 1.2fr) minmax(160px, 1fr) minmax(140px, .8fr) auto; gap: 12px; align-items: end; }
  .field { display: grid; gap: 6px; font-size: 13px; font-weight: 600; color: ${fg('neutral-secondary')}; }
  .field small { color: ${fg('neutral-tertiary')}; font-weight: 400; margin-left: 4px; }

  .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
  .page-head h1 { margin: 0 0 4px; color: ${fg('neutral-strong')}; letter-spacing: -0.5px; }
  .page-head-actions { display: flex; gap: 12px; align-items: center; flex: 1; max-width: 720px; justify-content: flex-end; }
  .search-form { display: flex; gap: 8px; flex: 1; min-width: 0; }

  .explore-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
  .filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; margin-bottom: 16px; }
  .kind-tabs { display: flex; gap: 4px; border-bottom: 1px solid ${line}; }
  .kind-tab { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px; font-size: 15px; font-weight: 600; color: ${fg('neutral-tertiary')}; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .kind-tab.active { color: ${fg('neutral-strong')}; border-bottom-color: ${fg('neutral-strong')}; }
  .district-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid ${line}; background: ${surface}; font-size: 13px; font-weight: 500; color: ${fg('neutral-secondary')}; transition: background .15s, color .15s; }
  .chip:hover { background: ${canvas}; } .chip.active { background: #eaf2fe; border-color: #b3d1fd; color: ${brand}; font-weight: 700; }
  .query-chip { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 8px 0 14px; border-radius: 999px; background: #eaf2fe; color: ${brand}; font-weight: 700; font-size: 14px; }
  .query-chip button { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; } .query-chip svg { width: 16px; height: 16px; }
  .mobile-view-toggle { display: none; margin-bottom: 12px; }
  .result-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
  .result-line strong { color: ${fg('neutral-strong')}; }
  .loading-box { display: grid; place-items: center; min-height: 240px; }
  .place-grid { list-style: none; margin: 0; padding: 0 4px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; max-height: calc(100dvh - 330px); min-height: 420px; overflow: auto; align-content: start; }
  .place-card { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: border-color .15s, box-shadow .15s; }
  .place-card.selected { border-color: ${brand}; box-shadow: 0 0 0 1px ${brand}; }
  .place-card > button:last-child { margin: 0 16px 16px; }
  .place-card-main { display: flex; flex-direction: column; align-items: stretch; text-align: left; flex: 1; width: 100%; }
  .place-visual { position: relative; width: 100%; height: 96px; display: grid; place-items: center; color: #fff; }
  .kind-attraction .place-visual { background: linear-gradient(135deg, #3d8bfd, #0066ff); } .kind-food .place-visual { background: linear-gradient(135deg, #ff9f5a, #f2662f); }
  .kind-cafe .place-visual { background: linear-gradient(135deg, #b08a6e, #7a5a43); } .kind-shopping .place-visual { background: linear-gradient(135deg, #b178f5, #8d4ced); }
  .place-index { position: absolute; left: 12px; top: 12px; min-width: 26px; height: 26px; border-radius: 13px; background: #ffffffe6; color: ${fg('neutral-strong')}; font-size: 13px; font-weight: 700; display: grid; place-items: center; padding: 0 6px; }
  .saved-flag { position: absolute; right: 12px; top: 12px; background: #fff; color: ${brand}; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
  .place-copy { padding: 14px 16px 12px; display: grid; gap: 4px; width: 100%; text-align: left; }
  .place-copy strong { font-size: 17px; color: ${fg('neutral-strong')}; letter-spacing: -0.3px; }
  .place-copy span { font-size: 13px; color: ${fg('neutral-tertiary')}; }

  .map-card { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; overflow: hidden; }
  .map-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; border-bottom: 1px solid ${line}; }
  .map-frame { position: relative; height: calc(100dvh - 290px); min-height: 460px; background: #eef2f6; }
  .kakao-map { position: absolute; inset: 0; }
  .map-placeholder { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8px; text-align: center; padding: 24px; color: ${fg('neutral-secondary')}; }
  .map-placeholder > svg { width: 32px; height: 32px; color: ${fg('neutral-tertiary')}; }
  .map-fit { position: absolute; right: 12px; bottom: 12px; z-index: 5; height: 34px; padding: 0 14px; border-radius: 999px; background: ${surface}; border: 1px solid ${line}; font-size: 13px; font-weight: 600; box-shadow: 0 2px 6px #0000001a; }
  .map-legend { display: flex; align-items: center; gap: 6px 14px; flex-wrap: wrap; padding: 10px 16px; font-size: 12px; color: ${fg('neutral-tertiary')}; border-top: 1px solid ${line}; }
  .legend-day { display: inline-flex; align-items: center; gap: 6px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; background: #9aa1aa; margin-left: 4px; } .legend-dot.saved { background: ${brand}; }
  .map-pin { min-width: 30px; height: 30px; padding: 0 8px; border-radius: 15px 15px 15px 2px; border: 2px solid #fff; color: #fff; font-size: 13px; font-weight: 800; background: #8a929c; box-shadow: 0 2px 6px #00000040; transition: transform .12s; }
  .map-pin:hover, .map-pin.selected { transform: scale(1.15); } .map-pin.tone-saved { background: #0066ff; }
  .map-pin.tone-day0 { background: #0098b2; } .map-pin.tone-day1 { background: #f37a1f; } .map-pin.tone-day2 { background: #8d4ced; } .map-pin.tone-day3 { background: #e2468b; }
  .map-pin.tone-day4 { background: #2f9e4f; } .map-pin.tone-day5 { background: #3f6ce0; } .map-pin.tone-day6 { background: #b8860b; }
  .map-popup { position: absolute; left: 16px; top: 16px; z-index: 6; width: min(320px, calc(100% - 32px)); background: ${surface}; border-radius: 16px; padding: 18px; box-shadow: 0 8px 24px #0000002e; display: grid; gap: 6px; }
  .map-popup h3 { margin: 0; padding-right: 28px; }
  .popup-close { position: absolute; right: 12px; top: 12px; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; } .popup-close:hover { background: ${canvas}; } .popup-close svg { width: 18px; height: 18px; }
  .popup-text { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .popup-actions { display: flex; align-items: center; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
  .popup-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: ${fg('neutral-secondary')}; } .popup-link svg { width: 14px; height: 14px; }

  .candidate-tray { position: sticky; bottom: 16px; z-index: 20; margin-top: 24px; background: ${surface}; border: 1px solid ${line}; border-radius: 20px; box-shadow: 0 8px 28px #0000001f; padding: 14px 14px 14px 24px; display: flex; align-items: center; gap: 20px; }
  .tray-summary { display: grid; gap: 2px; min-width: 200px; max-width: 240px; } .tray-summary h2 { margin: 0; }
  .tray-list { list-style: none; margin: 0; padding: 0 0 2px; display: flex; gap: 8px; overflow-x: auto; flex: 1; min-width: 0; }
  .tray-item { display: flex; align-items: center; gap: 4px; border: 1px solid ${line}; border-radius: 12px; padding: 8px 6px 8px 12px; flex-shrink: 0; }
  .tray-name { display: grid; text-align: left; } .tray-name strong { font-size: 14px; color: ${fg('neutral-strong')}; } .tray-name span { font-size: 12px; color: ${fg('neutral-tertiary')}; }
  .tray-remove { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; color: ${fg('neutral-tertiary')}; } .tray-remove:hover { background: ${canvas}; } .tray-remove svg { width: 16px; height: 16px; }
  .tray-cta { flex-shrink: 0; }

  .planner-grid { display: grid; grid-template-columns: 400px minmax(0, 1fr); gap: 24px; align-items: start; }
  @media (min-width: 1281px) { .planner-grid { grid-template-columns: 360px minmax(0, 1fr) 340px; } }
  @media (max-width: 1280px) and (min-width: 1101px) { .docent-side { grid-column: 1 / -1; } }
  .schedule-panel { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; padding: 20px; display: grid; gap: 16px; }
  .schedule-panel h2, .unscheduled h3 { margin: 0; }
  .day-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 6px; }
  .day-tab { --day-color: #0098b2; display: grid; gap: 2px; padding: 10px 8px; border-radius: 12px; text-align: center; background: color-mix(in srgb, var(--day-color) 10%, white); color: var(--day-color); transition: background .15s; }
  .day-tab strong { font-size: 15px; } .day-tab span { font-size: 12px; }
  .day-tab.active { background: var(--day-color); color: #fff; }
  .day-panel { border: 1px solid ${line}; border-radius: 14px; padding: 14px 14px 6px; }
  .day-panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .visit-list, .unscheduled-list { list-style: none; margin: 0; padding: 0; }
  .visit { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid ${line}; }
  .visit:first-of-type { border-top: 0; } .visit.selected .visit-name strong { color: ${brand}; }
  .visit-number { width: 26px; height: 26px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 800; }
  .visit-name { display: grid; gap: 2px; text-align: left; min-width: 0; }
  .visit-name strong { font-size: 15px; color: ${fg('neutral-strong')}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .visit-name span { font-size: 12px; color: ${fg('neutral-tertiary')}; }
  .visit-actions { display: flex; gap: 2px; }
  .day-empty { padding: 16px 0 14px; margin: 0; }
  .unscheduled { display: grid; gap: 10px; } .muted { color: ${fg('neutral-tertiary')}; font-weight: 500; }
  .unscheduled-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid ${line}; }
  .unscheduled-list li:first-of-type { border-top: 0; }
  .all-placed { font-size: 13px; color: ${fg('neutral-tertiary')}; }
  .route-fallback { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .route-fallback li { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; background: ${surface}; border: 1px solid ${line}; border-radius: 999px; padding: 4px 12px 4px 4px; }
  .route-fallback span { width: 22px; height: 22px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 800; }

  @media (max-width: 1100px) {
    .explore-grid { grid-template-columns: 1fr; }
    .planner-grid { grid-template-columns: 1fr; }
    .mobile-view-toggle { display: block; }
    .explore-list .list-body:not(.mobile-active), .explore-map:not(.mobile-active) { display: none; }
    .place-grid { max-height: none; min-height: 0; overflow: visible; }
    .map-frame { height: 60dvh; min-height: 360px; }
  }
  @media (max-width: 720px) {
    & { padding: 16px 16px 24px; }
    .trip-bar { padding: 12px 16px; gap: 10px 16px; } .trip-fact { font-size: 15px; } .trip-counts { margin-left: 0; width: 100%; } .count-chip { flex: 1; justify-content: center; }
    .conditions-fields { grid-template-columns: 1fr; }
    .page-head-actions { flex-direction: column; align-items: stretch; max-width: none; width: 100%; }
    .kind-tabs { width: 100%; overflow-x: auto; } .kind-tab { flex-shrink: 0; }
    .place-grid { grid-template-columns: 1fr; }
    .candidate-tray { flex-wrap: wrap; padding: 14px 16px; gap: 10px; border-radius: 16px; bottom: 8px; }
    .tray-summary { min-width: 0; max-width: none; width: 100%; } .tray-list { flex-basis: 100%; } .tray-cta { width: 100%; }
    .schedule-panel { padding: 16px; }
  }
`;

export default PinDayPage;
