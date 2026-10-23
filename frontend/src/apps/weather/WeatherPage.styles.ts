import styled from '@emotion/styled';

// 공통 PinDayPage(어디 갈까?·언제 갈까?)와 같은 Montage 의미 토큰을 쓴다. 클래스는 전역 스타일과 겹치지 않게 w- 접두어.
const fg = (name: string) => `var(--semantic-foreground-${name})`;
const line = 'var(--semantic-line-neutral-primary, #e1e2e4)';
const brand = 'var(--semantic-foreground-brand-primary, #0066ff)';
const brandSoft = '#eaf2fe';
const surface = 'var(--semantic-background-neutral-primary, #fff)';
const canvas = 'var(--semantic-background-neutral-secondary, #f7f7f8)';
const teal = '#0098b2';

export const WeatherSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .w-head { display: grid; gap: 4px; }
  .w-head h1 { margin: 0; letter-spacing: -0.5px; color: ${fg('neutral-strong')}; }
  .w-card { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; padding: 20px 24px; }
  .w-meta { font-size: 13px; color: ${fg('neutral-tertiary')}; }
  .w-footnote { margin: 0; font-size: 12px; line-height: 1.6; color: ${fg('neutral-tertiary')}; }

  .w-picker { display: grid; gap: 14px; }
  .w-picker h2 { margin: 0; }
  .w-picker .day-tabs { grid-template-columns: repeat(auto-fill, minmax(120px, 160px)); }
  .w-stops { display: flex; flex-wrap: wrap; gap: 8px; }
  .w-stops .chip { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px 0 6px; font-size: 14px; }
  .w-stop-number { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 800; }

  .w-forecast { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 32px; }
  .w-forecast > :first-of-type { grid-column: 1 / -1; }
  .w-forecast-day { font-size: 14px; font-weight: 700; color: ${fg('neutral-secondary')}; }
  .w-forecast strong { font-size: 20px; font-weight: 800; color: ${fg('neutral-strong')}; }
  .w-forecast p { margin: 4px 0 0; font-size: 15px; color: ${fg('neutral-secondary')}; }
  .w-forecast.rainy { background: ${brandSoft}; border-color: transparent; }
  .w-forecast-main { display: flex; align-items: center; gap: 14px; }
  .w-weather-icon { width: 44px; height: 44px; color: ${brand}; }
  .w-forecast .w-advice { margin: 0; max-width: 380px; line-height: 1.6; }
  .w-forecast .w-footnote { grid-column: 1 / -1; margin: 0; font-size: 12px; color: ${fg('neutral-tertiary')}; }

  .w-compare { display: grid; grid-template-columns: minmax(0, 1fr) 76px minmax(0, 1fr); gap: 16px; align-items: start; }
  .w-place { display: flex; flex-direction: column; gap: 12px; min-height: 260px; }
  .w-place h2 { margin: 0; color: ${fg('neutral-strong')}; }
  .w-place.chosen { border-color: ${teal}; box-shadow: 0 0 0 1px ${teal}; }
  .w-card-top { display: flex; align-items: center; gap: 10px; }
  .w-tag { padding: 5px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; color: #fff; background: ${fg('neutral-tertiary')}; }
  .w-tag.accent { background: ${teal}; }
  .w-badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: ${canvas}; color: ${fg('neutral-secondary')}; font-size: 13px; font-weight: 600; }
  .w-badge svg { width: 15px; height: 15px; }
  .w-badge.indoor { background: color-mix(in srgb, ${teal} 10%, white); color: ${teal}; }
  .w-description { margin: 0; font-size: 14px; line-height: 1.7; color: ${fg('neutral-secondary')}; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .w-address { margin: auto 0 0; display: flex; align-items: center; gap: 6px; font-size: 13px; color: ${fg('neutral-tertiary')}; }
  .w-address svg { width: 15px; height: 15px; flex-shrink: 0; }

  .w-swap { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; word-break: keep-all; font-size: 13px; font-weight: 700; color: ${fg('neutral-secondary')}; }
  .w-swap svg { width: 48px; height: 48px; padding: 13px; border-radius: 50%; background: ${brandSoft}; color: ${brand}; }

  .w-alt-column { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .w-alt-column h3 { margin: 0; }
  .w-state { min-height: 140px; display: grid; place-items: center; text-align: center; }
  .w-more-list { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .w-more-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; text-align: left; background: ${surface}; border: 1px solid ${line}; border-radius: 14px; color: ${teal}; transition: border-color .15s, background .15s; }
  .w-more-item:hover { border-color: ${teal}; background: ${canvas}; }
  .w-more-item > svg { width: 20px; height: 20px; }
  .w-more-item span { display: grid; gap: 2px; min-width: 0; }
  .w-more-item strong { color: ${fg('neutral-strong')}; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-more-item small { color: ${fg('neutral-tertiary')}; font-size: 12px; }

  .w-preview { display: grid; gap: 16px; }
  .w-preview-head { display: flex; gap: 12px; align-items: flex-start; }
  .w-preview-head > svg { width: 24px; height: 24px; color: ${brand}; margin-top: 2px; }
  .w-preview-head h2 { margin: 0 0 2px; }
  .w-timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px; }
  .w-timeline-stop { flex: 1 1 200px; display: grid; gap: 4px; padding: 14px 16px; border-radius: 12px; background: ${canvas}; }
  .w-timeline-stop small { font-size: 12px; color: ${fg('neutral-tertiary')}; }
  .w-timeline-stop strong { font-size: 16px; color: ${fg('neutral-strong')}; }
  .w-timeline-stop.replaced { background: color-mix(in srgb, ${teal} 8%, white); box-shadow: inset 0 0 0 1px ${teal}; }
  .w-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  .w-info { flex: 1 1 320px; margin: 0; display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 12px; background: ${canvas}; font-size: 14px; color: ${fg('neutral-secondary')}; }
  .w-info svg { width: 16px; height: 16px; flex-shrink: 0; }

  @media (max-width: 900px) {
    .w-compare { grid-template-columns: 1fr; }
    .w-swap { flex-direction: row; justify-content: center; }
    .w-swap svg { transform: rotate(90deg); }
    .w-forecast { grid-template-columns: 1fr; }
    .w-more-list { grid-template-columns: 1fr; }
    .w-actions > button { flex: 1 1 auto; }
  }
  @media (max-width: 720px) {
    .w-card { padding: 16px; }
    .w-picker .day-tabs { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
  }
`;
