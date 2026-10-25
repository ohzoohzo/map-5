import styled from '@emotion/styled';
import { color, font, radius } from '../../shared/design/tokens';

const MOBILE = '@media (max-width: 720px)';
const TABLET = '@media (max-width: 1100px)';

// 클래스 이름은 공용 PinDayPage 스타일(.field, .chip …)과 겹치지 않도록 ts- 로 시작한다.
export const TasteLayout = styled.div`
  font-family: ${font.family};
  color: ${color.text};
  word-break: keep-all;
  p { white-space: pre-line; }

  .ts-card { border: 1px solid ${color.border}; border-radius: ${radius.lg}; background: ${color.surface}; }
  .ts-icon { display: grid; place-items: center; flex-shrink: 0; width: 52px; height: 52px; border-radius: 50%; background: ${color.primarySoft}; color: ${color.teal}; }

  /* 머리 영역 */
  .ts-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .ts-crumb { display: flex; gap: 10px; font-size: 15px; color: ${color.textSub}; }
  .ts-crumb a:hover { color: ${color.primary}; }
  h1 { margin-top: 12px; font-size: clamp(28px, 3.4vw, 46px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.2; color: ${color.navy}; }
  .ts-sub { margin-top: 10px; font-size: clamp(16px, 1.6vw, 21px); color: ${color.textSub}; }

  .ts-progress { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
  .ts-progress ol { list-style: none; display: flex; align-items: center; margin: 0; padding: 0; }
  .ts-progress li { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${color.borderStrong}; background: ${color.surface}; color: ${color.surface}; }
  .ts-progress li + li { margin-left: 34px; position: relative; }
  .ts-progress li + li::before { content: ''; position: absolute; right: 100%; width: 38px; height: 2px; background: ${color.borderStrong}; }
  .ts-progress li.is-done { border-color: ${color.primary}; background: ${color.primary}; }
  .ts-progress li.is-done + li::before, .ts-progress li.is-done + li.is-done::before { background: ${color.primary}; }
  .ts-progress li.is-now { border-color: ${color.primary}; }
  .ts-progress p { display: flex; flex-direction: column; font-size: 18px; color: ${color.navy}; white-space: nowrap; }
  .ts-progress strong { font-weight: 700; }
  .ts-progress span { font-weight: 700; }

  /* 문항 */
  .ts-question { padding: 40px; }
  .ts-qnum { font-size: 16px; font-weight: 800; color: ${color.primary}; }
  .ts-question h2 { margin-top: 8px; font-size: clamp(22px, 2.4vw, 32px); font-weight: 800; letter-spacing: -0.8px; color: ${color.navy}; }
  .ts-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
  .ts-option { display: flex; align-items: center; gap: 16px; min-height: 84px; padding: 14px 20px; border: 1px solid ${color.border}; border-radius: ${radius.lg}; background: ${color.surface}; color: ${color.navy}; font-size: 18px; font-weight: 600; text-align: left; transition: border-color .15s, background .15s; }
  .ts-option:hover { border-color: ${color.primary}; background: ${color.primarySoft}; }
  .ts-qnav { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 28px; }
  .ts-prev, .ts-skip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-size: 16px; font-weight: 600; color: ${color.textSub}; }
  .ts-prev:disabled { visibility: hidden; }
  .ts-skip:hover, .ts-prev:hover { color: ${color.primary}; }

  /* 결과 */
  .ts-result-grid { display: grid; grid-template-columns: minmax(0, 1.95fr) minmax(0, 1fr); gap: 20px; }
  .ts-hero { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); align-items: center; gap: 28px; padding: 14px; background: linear-gradient(180deg, ${color.primarySoft} 0%, ${color.surface} 100%); }
  .ts-illust { align-self: stretch; min-height: 280px; border-radius: ${radius.md}; }
  .ts-hero-body { padding: 18px 18px 18px 0; }
  .ts-eyebrow { font-size: 19px; font-weight: 700; color: ${color.primary}; }
  .ts-hero h2 { margin-top: 10px; font-size: clamp(32px, 3.8vw, 56px); font-weight: 800; letter-spacing: -2px; line-height: 1.15; color: ${color.navy}; }
  .ts-summary { margin-top: 14px; font-size: clamp(16px, 1.5vw, 21px); color: ${color.textSub}; }
  .ts-keywords { list-style: none; display: flex; flex-wrap: wrap; gap: 10px; margin: 24px 0 0; padding: 0; }
  .ts-keywords li { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 18px; border: 1px solid ${color.border}; border-radius: ${radius.pill}; background: ${color.surface}; color: ${color.navy}; font-size: 16px; font-weight: 600; }
  .ts-keywords svg { color: ${color.teal}; }

  .ts-traits { padding: 22px 20px; background: linear-gradient(180deg, ${color.surface} 0%, ${color.primarySoft} 100%); }
  .ts-traits h3 { font-size: 19px; font-weight: 800; color: ${color.navy}; }
  .ts-traits ul { list-style: none; display: grid; gap: 10px; margin: 14px 0 0; padding: 0; }
  .ts-traits li { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border-radius: ${radius.md}; background: ${color.surface}; }
  .ts-traits strong { font-size: 16px; font-weight: 700; color: ${color.navy}; }
  .ts-traits p { margin-top: 4px; font-size: 14px; line-height: 1.5; color: ${color.textSub}; }

  .ts-places { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 400px); gap: 20px; margin-top: 20px; padding: 18px 16px 18px 24px; }
  .ts-places h3 { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 19px; font-weight: 800; color: ${color.navy}; }
  .ts-places h3 small { font-size: 14px; font-weight: 500; color: ${color.textSub}; }
  .ts-status { margin-top: 16px; font-size: 15px; color: ${color.textMuted}; }
  .ts-place-list { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 14px 0 0; padding: 0; }
  .ts-place { position: relative; display: flex; gap: 16px; padding: 8px; border: 1px solid ${color.border}; border-radius: ${radius.md}; }
  .ts-place-photo { flex-shrink: 0; width: 34%; min-height: 118px; border-radius: ${radius.sm}; background: linear-gradient(160deg, ${color.primarySoft} 0%, ${color.borderStrong} 100%); }
  .ts-place-body { display: flex; flex-direction: column; min-width: 0; padding: 8px 36px 6px 0; }
  .ts-place-body strong { font-size: 17px; font-weight: 700; color: ${color.navy}; }
  .ts-place-body p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; margin-top: 6px; font-size: 14px; line-height: 1.5; color: ${color.textSub}; }
  .ts-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 10px; }
  .ts-tags span { padding: 4px 10px; border-radius: ${radius.pill}; background: ${color.bg}; font-size: 13px; color: ${color.textSub}; }
  .ts-heart { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: ${color.navy}; }
  .ts-heart.is-on { color: ${color.coral}; }

  .ts-actions { display: flex; flex-direction: column; justify-content: center; gap: 10px; }
  .ts-cta { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; border-radius: ${radius.md}; background: ${color.coral}; color: ${color.surface}; font-size: 20px; font-weight: 700; }
  .ts-hint { text-align: center; font-size: 14px; color: ${color.textSub}; }
  .ts-sub-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
  .ts-outline { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; border: 1px solid ${color.borderStrong}; border-radius: ${radius.md}; background: ${color.surface}; color: ${color.navyDeep}; font-size: 15px; font-weight: 700; }
  .ts-outline:hover { border-color: ${color.primary}; }
  .ts-note { display: flex; align-items: center; gap: 6px; font-size: 14px; color: ${color.textSub}; }

  .ts-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-top: 24px; padding-top: 16px; border-top: 1px solid ${color.border}; font-size: 13px; color: ${color.textMuted}; }

  ${TABLET} {
    .ts-head { flex-direction: column; align-items: flex-start; }
    .ts-result-grid { grid-template-columns: 1fr; }
    .ts-places { grid-template-columns: 1fr; padding: 18px; }
  }
  ${MOBILE} {
    .ts-progress { gap: 14px; }
    .ts-progress li + li { margin-left: 18px; }
    .ts-progress li + li::before { width: 22px; }
    .ts-progress p { font-size: 15px; }
    .ts-question { padding: 24px 18px; }
    .ts-options { grid-template-columns: 1fr; gap: 10px; margin-top: 20px; }
    .ts-option { min-height: 68px; font-size: 16px; }
    .ts-hero { grid-template-columns: 1fr; gap: 8px; }
    .ts-illust { min-height: 170px; }
    .ts-hero-body { padding: 8px 6px 14px; }
    .ts-hero h2 { letter-spacing: -1px; }
    .ts-place-list { grid-template-columns: 1fr; }
    .ts-cta { font-size: 18px; }
    .ts-footer { flex-direction: column; }
  }
`;
