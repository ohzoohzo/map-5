import styled from '@emotion/styled';

// 공통 PinDayPage(어디 갈까?·언제 갈까?)와 같은 Montage 의미 토큰을 쓴다. 클래스는 전역 스타일과 겹치지 않게 w- 접두어.
// 배치는 시안 pinday-weather-v2.png: 머리글·예보 / 비교(원래 | 화살표 | 바꿔볼 장소+이런 곳도) / 교체 후 미리보기 / 출처
const fg = (name: string) => `var(--semantic-foreground-${name})`;
const line = 'var(--semantic-line-neutral-primary, #e1e2e4)';
const brand = 'var(--semantic-foreground-brand-primary, #0066ff)';
const brandSoft = '#eaf2fe';
const surface = 'var(--semantic-background-neutral-primary, #fff)';
const canvas = 'var(--semantic-background-neutral-secondary, #f7f7f8)';
const teal = '#0098b2';
const tealSoft = 'color-mix(in srgb, #0098b2 9%, white)';
// 시안의 세 칸(원래 일정 | 이 장소만 교체 | 바꿔볼 장소)과 머리글·예보가 같은 세로선에 맞도록 한 격자를 쓴다
const columns = 'minmax(0, 1fr) 72px minmax(0, 1fr)';

export const WeatherSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .w-card { background: ${surface}; border: 1px solid ${line}; border-radius: 16px; padding: 20px 24px; }
  .w-meta { font-size: 13px; color: ${fg('neutral-tertiary')}; }
  .w-state { min-height: 160px; display: grid; place-items: center; text-align: center; }

  /* 1. 머리글 + 예보 */
  .w-hero { display: grid; grid-template-columns: ${columns}; gap: 16px; align-items: stretch; }
  .w-hero-copy { display: grid; align-content: center; gap: 6px; }
  .w-hero-copy h1 { margin: 0; letter-spacing: -1px; word-break: keep-all; color: ${fg('neutral-strong')}; }
  .w-pickers { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 12px; max-width: 560px; margin-top: 14px; }
  .w-forecast { grid-column: 3; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 24px; }
  .w-forecast.rainy { background: ${brandSoft}; border-color: transparent; }
  .w-forecast-left { display: grid; gap: 10px; min-width: 0; }
  .w-forecast-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 15px; font-weight: 600; color: ${fg('neutral-secondary')}; }
  .w-source-badge { padding: 3px 10px; border-radius: 999px; background: ${surface}; color: ${brand}; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .w-forecast-main { display: flex; align-items: center; gap: 16px; }
  .w-forecast-main strong { display: block; font-size: 22px; font-weight: 800; color: ${fg('neutral-strong')}; }
  .w-forecast-main p { margin: 4px 0 0; font-size: 15px; color: ${fg('neutral-secondary')}; }
  .w-weather-icon { width: 48px; height: 48px; color: ${brand}; flex-shrink: 0; } .w-weather-icon.muted { color: ${fg('neutral-tertiary')}; }
  .w-advice { margin: 0; max-width: 260px; padding-left: 24px; border-left: 1px solid ${line}; font-size: 15px; line-height: 1.6; color: ${fg('neutral-secondary')}; }
  .w-forecast-time { grid-column: 1 / -1; margin: 0; font-size: 12px; color: ${fg('neutral-tertiary')}; }

  /* 2. 비교: 원래 일정 | 이 장소만 교체 | 바꿔볼 장소 + 이런 곳도 있어요 */
  .w-compare { display: grid; grid-template-columns: ${columns}; gap: 16px; align-items: start; }
  .w-place { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; padding: 16px 16px 16px 24px; }
  .w-place.chosen { background: ${tealSoft}; border-color: ${teal}; }
  .w-place-copy { display: flex; flex-direction: column; gap: 12px; min-width: 0; padding-top: 8px; }
  .w-place-copy h2 { margin: 0; color: ${fg('neutral-strong')}; }
  .w-card-top { display: flex; align-items: center; gap: 12px; }
  .w-tag { padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #fff; background: ${fg('neutral-tertiary')}; }
  .w-tag.accent { background: ${teal}; }
  .w-badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; background: ${canvas}; color: ${fg('neutral-secondary')}; font-size: 14px; font-weight: 600; }
  .w-badge svg { width: 16px; height: 16px; }
  .w-badge.indoor { background: ${brandSoft}; color: ${brand}; }
  .w-badge.small { padding: 2px 8px; font-size: 11px; } .w-badge.small svg { width: 12px; height: 12px; }
  .w-description { margin: 0; font-size: 15px; line-height: 1.7; color: ${fg('neutral-secondary')}; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .w-place-link { align-self: flex-start; margin-top: auto; display: inline-flex; align-items: center; gap: 6px; padding: 4px 0; font-size: 14px; color: ${fg('neutral-secondary')}; text-align: left; }
  .w-place-link svg { width: 16px; height: 16px; flex-shrink: 0; }
  .w-place-link:hover { color: ${brand}; }

  .w-visual { display: grid; place-items: center; border-radius: 12px; color: #ffffffd9; min-height: 220px; }
  .w-visual.large { min-height: 380px; }
  .w-visual.small { min-height: 0; width: 100%; height: 100%; border-radius: 10px; }
  .w-visual svg { width: 56px; height: 56px; } .w-visual.small svg { width: 26px; height: 26px; }
  .w-visual.outdoor { background: linear-gradient(160deg, #8fd0f5 0%, #3d8bfd 55%, #e8d5a8 100%); }
  .w-visual.indoor { background: linear-gradient(150deg, #7fd3dc 0%, ${teal} 100%); }
  .w-visual.neutral { background: linear-gradient(150deg, #c9d3df 0%, #8a97a8 100%); }

  .w-swap { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; word-break: keep-all; font-size: 14px; font-weight: 700; color: ${fg('neutral-strong')}; }
  .w-swap svg { width: 52px; height: 52px; padding: 14px; border-radius: 50%; background: ${brandSoft}; color: ${brand}; }

  .w-alt-column { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .w-more { display: grid; gap: 10px; justify-items: start; }
  .w-more h3 { margin: 0; display: flex; align-items: center; gap: 8px; }
  .w-dot { width: 10px; height: 10px; border-radius: 50%; background: ${brand}; box-shadow: 0 0 0 3px ${brandSoft}; }
  .w-more-list { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .w-more-item { width: 100%; height: 100%; display: grid; grid-template-columns: 112px minmax(0, 1fr) 20px; align-items: stretch; gap: 14px; padding: 10px; text-align: left; background: ${surface}; border: 1px solid ${line}; border-radius: 14px; transition: border-color .15s; }
  .w-more-item:hover { border-color: ${teal}; }
  .w-more-item .w-visual { min-height: 96px; }
  .w-more-copy { display: grid; align-content: center; gap: 6px; min-width: 0; }
  .w-more-copy strong { font-size: 15px; color: ${fg('neutral-strong')}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-more-copy .w-badge { justify-self: start; }
  .w-more-copy small { display: flex; align-items: center; gap: 4px; font-size: 12px; color: ${fg('neutral-tertiary')}; }
  .w-more-copy small svg { width: 13px; height: 13px; }
  .w-chevron { align-self: center; width: 20px; height: 20px; color: ${fg('neutral-tertiary')}; }

  .w-docent { padding: 0; overflow: hidden; }
  .w-docent-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px 0; }
  .w-docent-head h2 { margin: 0; }

  /* 3. 교체 후 미리보기 */
  .w-preview { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px 24px; align-items: center; }
  .w-preview-label { display: flex; gap: 14px; align-items: flex-start; padding-right: 24px; border-right: 1px solid ${line}; }
  .w-preview-label h2 { margin: 0 0 4px; }
  .w-preview-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: ${canvas}; color: ${fg('neutral-secondary')}; flex-shrink: 0; }
  .w-preview-icon svg { width: 22px; height: 22px; }
  .w-timeline { list-style: none; margin: 0; padding: 0; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 44px; }
  .w-stop { position: relative; display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 14px; align-items: center; padding: 8px; border-radius: 12px; background: ${canvas}; min-height: 80px; }
  .w-stop .w-visual { height: 64px; }
  .w-stop + .w-stop::before { content: '→'; position: absolute; left: -32px; top: 50%; transform: translateY(-50%); font-size: 20px; color: ${brand}; }
  .w-stop.replaced { background: ${tealSoft}; box-shadow: inset 0 0 0 1px ${teal}; }
  .w-stop-copy { display: grid; gap: 6px; min-width: 0; }
  .w-stop-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .w-stop-order { font-size: 15px; font-weight: 600; color: ${fg('neutral-strong')}; }
  .w-stop-badge { padding: 2px 8px; border-radius: 999px; background: ${surface}; border: 1px solid ${line}; font-size: 11px; color: ${fg('neutral-tertiary')}; }
  .w-stop-badge.replaced { background: ${teal}; border-color: ${teal}; color: #fff; font-weight: 700; }
  .w-stop-copy strong { font-size: 16px; color: ${fg('neutral-strong')}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .w-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  .w-info { flex: 1 1 360px; margin: 0; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: ${brandSoft}; font-size: 14px; color: ${fg('neutral-secondary')}; }
  .w-info svg { width: 18px; height: 18px; flex-shrink: 0; color: ${brand}; }
  .w-actions > button { min-width: 180px; }

  /* 4. 출처 */
  .w-footer { display: flex; justify-content: space-between; gap: 8px 24px; flex-wrap: wrap; font-size: 12px; color: ${fg('neutral-tertiary')}; }

  @media (max-width: 1280px) {
    .w-place { grid-template-columns: 1fr; }
    .w-visual, .w-visual.large { min-height: 180px; order: -1; }
    .w-more-list { grid-template-columns: 1fr; }
  }
  @media (max-width: 1100px) {
    .w-hero, .w-compare { grid-template-columns: 1fr; }
    .w-forecast { grid-column: auto; }
    .w-swap { flex-direction: row; justify-content: center; }
    .w-swap svg { transform: rotate(90deg); }
    .w-preview { grid-template-columns: 1fr; }
    .w-preview-label { border-right: 0; padding-right: 0; }
  }
  @media (max-width: 720px) {
    .w-card { padding: 16px; }
    .w-place { padding: 16px; }
    .w-pickers { grid-template-columns: 1fr; }
    .w-forecast { grid-template-columns: 1fr; }
    .w-advice { padding: 12px 0 0; border-left: 0; border-top: 1px solid ${line}; max-width: none; }
    .w-timeline { grid-auto-flow: row; gap: 28px; }
    .w-stop + .w-stop::before { content: '↓'; left: 50%; top: -24px; transform: translateX(-50%); }
    .w-more-item { grid-template-columns: 88px minmax(0, 1fr) 20px; }
    .w-actions > button { flex: 1 1 auto; min-width: 0; }
  }
`;
