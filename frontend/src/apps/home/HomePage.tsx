import { useState, type MouseEvent } from 'react';
import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Backpack, CalendarDays, Check, ChevronDown, Map as MapIcon, MapPin, Plus, Search, Tag, Umbrella } from 'lucide-react';
import { navigate } from '../../shared/router';
import RandomPick from './RandomPick';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import { color, font, layout, radius } from '../../shared/design/tokens';

// 시안: design/pinday-home-v3.png
// 사진이 생기면 아래 경로만 채우면 된다 (예: '/images/home-hero.jpg'). 비어 있으면 색 배경으로 자리만 잡는다.
const HERO_IMAGE = '';
const TRAIN_IMAGE = '';

// 화면에는 짧은 이름(i18n), 저장은 카탈로그 region 과 같은 시·도 전체 이름 (TripBar 와 같은 약속)
const DESTINATIONS = [{ id: 'busan', value: '부산광역시' }] as const;
type DestinationId = (typeof DESTINATIONS)[number]['id'];
const TAGS = ['food', 'walk', 'exhibit'] as const;
type TagId = (typeof TAGS)[number];

const MOBILE = '@media (max-width: 720px)';
const TABLET = '@media (max-width: 1100px)';

/** Date → 'YYYY-MM-DD' (현지 날짜 기준) */
function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** 두 날짜 사이의 박 수 (잘못된 범위면 -1) */
function nightsBetween(start: string, end: string) {
  if (!start || !end) return -1;
  return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000);
}

/** 'YYYY-MM-DD' → 'MM.DD' (시안 표기) */
function shortDate(value: string) {
  return value ? value.slice(5).replace('-', '.') : '--.--';
}

/** 날짜 칸 아무 곳을 눌러도 달력이 열리게 (지원하지 않는 브라우저는 기본 동작) */
function openPicker(event: MouseEvent<HTMLInputElement>) {
  try { event.currentTarget.showPicker?.(); } catch { /* 일부 브라우저는 막혀 있음 */ }
}

function photoBackground(image: string, fallback: string) {
  return image ? `url(${image}) center / cover no-repeat` : fallback;
}

export default function HomePage() {
  const { t } = useTranslation('home');
  const savedStart = useTrip((trip) => trip.startDate);
  const savedEnd = useTrip((trip) => trip.endDate);
  const savedDestination = useTrip((trip) => trip.destination);

  const [destination, setDestination] = useState<DestinationId>(DESTINATIONS[0].id);
  // 저장된 여행이 있으면 그 날짜, 없으면 내일부터 2박 3일
  const [startDate, setStartDate] = useState(savedStart || addDays(1));
  const [endDate, setEndDate] = useState(savedEnd || addDays(3));
  const [tags, setTags] = useState<TagId[]>(['food']);

  const nights = nightsBetween(startDate, endDate);
  const canStart = nights >= 0;

  function changeStart(value: string) {
    setStartDate(value);
    if (value && nightsBetween(value, endDate) < 0) setEndDate(value);
  }

  function toggleTag(tag: TagId) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function startTrip() {
    if (!canStart) return;
    const value = DESTINATIONS.find((item) => item.id === destination)?.value ?? DESTINATIONS[0].value;
    tripActions.setTrip(value, startDate, endDate);
    navigate('/explore');
  }

  // 랜덤 뽑기에서 "어디 갈까?에서 보기": 아직 여행 조건이 없으면 검색창의 목적지·날짜로 시작한다
  function exploreFromRandom() {
    if (!savedDestination && canStart) startTrip();
    else navigate('/explore');
  }

  const steps = [
    { key: 'discover', Icon: Search },
    { key: 'arrange', Icon: CalendarDays },
    { key: 'check', Icon: MapIcon },
  ] as const;

  return (
    <Page>
      <Hero style={{ background: photoBackground(HERO_IMAGE, `linear-gradient(180deg, ${color.primarySoft} 0%, ${color.bg} 100%)`) }}>
        <div className="inner">
          <p className="kicker"><MapPin size={18} fill={color.primary} color={color.surface} />{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="subtitle">{t('subtitle')}</p>
        </div>
      </Hero>

      <Content>
        <SearchCard aria-label={t('search.label')} onSubmit={(event) => { event.preventDefault(); startTrip(); }}>
          <div className="field where">
            <MapPin className="field-icon" size={26} strokeWidth={1.6} />
            <label className="field-body">
              <span className="field-label">{t('search.whereLabel')}</span>
              <span className="dest-select">
                <select value={destination} onChange={(event) => setDestination(event.target.value as DestinationId)}>
                  {DESTINATIONS.map(({ id }) => <option key={id} value={id}>{t(`search.destinations.${id}`)}</option>)}
                </select>
                <ChevronDown size={20} aria-hidden />
              </span>
            </label>
          </div>

          <div className="field when">
            <CalendarDays className="field-icon" size={26} strokeWidth={1.6} />
            <div className="field-body">
              <span className="field-label" id="home-when-label">{t('search.whenLabel')}</span>
              {/* 글자는 시안처럼 '10.24 – 10.26' 으로 보여주고, 그 위에 투명한 날짜 입력칸을 겹쳐 누르면 달력이 열린다 */}
              <div className="dates" role="group" aria-labelledby="home-when-label">
                <span className="date-slot">
                  {shortDate(startDate)}
                  <input type="date" aria-label={t('search.startDate')} value={startDate} onClick={openPicker} onChange={(event) => changeStart(event.target.value)} />
                </span>
                <span aria-hidden>–</span>
                <span className="date-slot">
                  {shortDate(endDate)}
                  <input type="date" aria-label={t('search.endDate')} value={endDate} min={startDate} onClick={openPicker} onChange={(event) => setEndDate(event.target.value)} />
                </span>
                <ChevronDown size={20} aria-hidden />
              </div>
            </div>
            {canStart && (
              <span className="duration" aria-live="polite">
                {nights === 0 ? t('search.dayTrip') : t('search.duration', { nights, days: nights + 1 })}
              </span>
            )}
          </div>

          <div className="field tags">
            <Tag className="field-icon" size={24} strokeWidth={1.6} />
            <div className="field-body">
              <span className="field-label">{t('search.tagsLabel')} <small>{t('search.tagsHint')}</small></span>
              <div className="tag-list">
                {TAGS.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <button key={tag} type="button" className={selected ? 'tag on' : 'tag'} aria-pressed={selected} onClick={() => toggleTag(tag)}>
                      {selected ? <Check size={15} /> : <Plus size={15} />}{t(`search.tags.${tag}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button type="submit" className="start" disabled={!canStart}>
            {t('search.start')}<ArrowRight size={22} />
          </button>
        </SearchCard>

        <Steps aria-label={t('steps.label')}>
          {steps.map(({ key, Icon }, index) => (
            <li key={key}>
              <span className="step-icon"><Icon size={24} strokeWidth={1.7} /></span>
              <div>
                <strong>{t(`steps.${key}.title`)}</strong>
                <p>{t(`steps.${key}.body`)}</p>
              </div>
              {index < steps.length - 1 && <ArrowRight className="step-arrow" size={22} strokeWidth={1.2} aria-hidden />}
            </li>
          ))}
        </Steps>

        <Cards>
          <section className="card style-card">
            <div className="style-body">
              <h2>{t('style.title')}</h2>
              <p className="card-sub">{t('style.subtitle')}</p>
              <div className="previews">
                <div className="preview">
                  <span className="preview-icon"><Umbrella size={30} strokeWidth={1.6} /></span>
                  <div><strong>{t('style.relaxed.title')}</strong><p>{t('style.relaxed.body')}</p></div>
                </div>
                <div className="preview">
                  <span className="preview-icon"><Backpack size={30} strokeWidth={1.6} /></span>
                  <div><strong>{t('style.packed.title')}</strong><p>{t('style.packed.body')}</p></div>
                </div>
              </div>
              <button type="button" className="outline" onClick={() => navigate('/taste')}>{t('style.cta')}</button>
              <p className="skip">{t('style.skip')}</p>
            </div>
            <div className="photo" aria-hidden style={{ background: photoBackground(TRAIN_IMAGE, `linear-gradient(160deg, ${color.primarySoft} 0%, ${color.borderStrong} 100%)`) }} />
          </section>

          <RandomPick onExplore={exploreFromRandom} />
        </Cards>

        <Footer>
          <span>{t('footer.sources')}</span>
          <span>{t('footer.tip')}</span>
          <span>{t('footer.note')}</span>
        </Footer>
      </Content>
    </Page>
  );
}

const Page = styled.div`
  font-family: ${font.family};
  color: ${color.text};
  background: ${color.bg};
  padding-bottom: 32px;
  word-break: keep-all;
  p { white-space: pre-line; }
`;

const Hero = styled.section`
  .inner { max-width: ${layout.maxWidth}; margin: 0 auto; padding: 56px ${layout.gutter} 130px; }
  .kicker { display: flex; align-items: center; gap: 8px; color: ${color.navyDeep}; font-size: 17px; font-weight: 600; }
  h1 { margin-top: 14px; font-size: clamp(32px, 4.6vw, 64px); font-weight: 800; letter-spacing: -2px; line-height: 1.15; color: ${color.navy}; }
  .subtitle { margin-top: 14px; font-size: clamp(17px, 2vw, 28px); color: ${color.textSub}; letter-spacing: -0.5px; }
  ${MOBILE} {
    .inner { padding: 32px ${layout.gutter} 110px; }
    h1 { letter-spacing: -1px; }
  }
`;

const Content = styled.div`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 0 ${layout.gutter};
`;

const SearchCard = styled.form`
  position: relative;
  margin-top: -84px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(320px, 1.6fr) minmax(300px, 1.7fr) auto;
  align-items: center;
  gap: 0;
  padding: 14px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  box-shadow: 0 10px 30px ${color.navy}14;

  .field { display: flex; align-items: center; gap: 14px; min-width: 0; padding: 6px 22px; border-right: 1px solid ${color.border}; }
  .field-icon { color: ${color.navy}; }
  .field-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
  .field-label { font-size: 14px; color: ${color.textMuted}; }
  .field-label small { font-size: 13px; }

  .dest-select { position: relative; display: flex; align-items: center; color: ${color.navy}; }
  .dest-select svg { position: absolute; right: 0; pointer-events: none; }
  select { width: 100%; min-height: ${layout.minTouch}; padding: 0 28px 0 0; appearance: none; border: 0; background: transparent; color: ${color.navy}; font-size: 24px; font-weight: 700; }

  .dates { display: flex; align-items: center; gap: 10px; min-height: ${layout.minTouch}; color: ${color.navy}; font-size: 22px; font-weight: 600; }
  .date-slot { position: relative; display: inline-flex; align-items: center; min-height: ${layout.minTouch}; cursor: pointer; }
  .date-slot input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  .date-slot:focus-within { outline: 3px solid ${color.borderStrong}; outline-offset: 2px; border-radius: ${radius.sm}; }
  .duration { flex-shrink: 0; padding: 9px 16px; border-radius: ${radius.pill}; background: ${color.primarySoft}; color: ${color.navyDeep}; font-size: 15px; font-weight: 700; }

  .tag-list { display: flex; flex-wrap: wrap; gap: 10px; }
  .tag { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 18px; border: 1px solid ${color.border}; border-radius: ${radius.pill}; background: ${color.surface}; color: ${color.navy}; font-size: 15px; font-weight: 600; }
  .tag.on { border-color: ${color.primary}; background: ${color.primarySoft}; color: ${color.primary}; }

  .start { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 68px; margin-left: 14px; padding: 0 36px; border-radius: ${radius.md}; background: ${color.coral}; color: ${color.surface}; font-size: 20px; font-weight: 700; white-space: nowrap; }
  .start:disabled { opacity: 0.5; }

  ${TABLET} {
    grid-template-columns: 1fr 1fr;
    .field { padding: 12px 16px; border-right: 0; border-bottom: 1px solid ${color.border}; }
    .where { border-right: 1px solid ${color.border}; }
    .tags { grid-column: 1 / -1; }
    .start { grid-column: 1 / -1; margin: 14px 0 0; }
  }
  ${MOBILE} {
    grid-template-columns: 1fr;
    .where { border-right: 0; }
    .when { flex-wrap: wrap; row-gap: 10px; }
    .when .field-body { flex: 1 1 200px; }
    .duration { margin-left: 40px; }
    .start { min-height: 56px; font-size: 18px; }
  }
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 40px 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  li { position: relative; display: flex; align-items: flex-start; justify-content: center; gap: 22px; }
  .step-icon { display: grid; place-items: center; width: 62px; height: 62px; flex-shrink: 0; border-radius: 50%; background: ${color.primarySoft}; color: ${color.navyDeep}; }
  strong { display: block; margin-top: 6px; font-size: 19px; font-weight: 700; color: ${color.navy}; }
  p { margin-top: 10px; font-size: 15px; line-height: 1.65; color: ${color.textSub}; }
  .step-arrow { position: absolute; right: -24px; top: 22px; color: ${color.textMuted}; }

  ${TABLET} { .step-arrow { display: none; } }
  ${MOBILE} {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 28px 0;
    li { justify-content: flex-start; gap: 16px; }
    .step-icon { width: 52px; height: 52px; }
    strong { font-size: 17px; }
    p { margin-top: 6px; font-size: 14px; }
  }
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 24px;

  .card { overflow: hidden; border: 1px solid ${color.border}; border-radius: ${radius.lg}; background: ${color.surface}; }
  h2 { font-size: clamp(24px, 2.4vw, 34px); font-weight: 800; letter-spacing: -1px; color: ${color.navy}; }
  .card-sub { margin-top: 8px; font-size: 18px; color: ${color.textSub}; }
  .outline { width: 100%; min-height: 52px; border: 1.5px solid ${color.primary}; border-radius: ${radius.md}; background: ${color.surface}; color: ${color.primary}; font-size: 18px; font-weight: 700; }

  .style-card { display: grid; grid-template-columns: minmax(0, 1fr) 33%; background: linear-gradient(180deg, ${color.primarySoft} 0%, ${color.surface} 100%); }
  .style-body { padding: 34px 32px 26px; }
  .previews { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 24px 0 16px; }
  .preview { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid ${color.border}; border-radius: ${radius.md}; background: ${color.surface}; }
  .preview-icon { display: grid; place-items: center; width: 52px; height: 52px; flex-shrink: 0; border-radius: 50%; background: ${color.primarySoft}; color: ${color.primary}; }
  .preview strong { font-size: 18px; color: ${color.navy}; }
  .preview p { margin-top: 6px; font-size: 12.5px; line-height: 1.5; color: ${color.textSub}; }
  .skip { margin-top: 14px; text-align: center; font-size: 14px; color: ${color.textMuted}; }
  .photo { min-height: 100%; }

  .random-card { display: flex; flex-direction: column; justify-content: space-between; gap: 24px; padding: 40px 34px 42px; background: linear-gradient(180deg, ${color.surface} 0%, ${color.primarySoft} 100%); }
  .random-head { display: flex; justify-content: space-between; gap: 16px; }
  .illust { position: relative; flex-shrink: 0; width: 170px; height: 120px; margin-top: 20px; color: ${color.teal}; }
  .illust > svg:first-of-type { position: absolute; left: 10px; bottom: 0; width: 110px; height: 90px; }
  .illust .pin { position: absolute; left: 50px; top: -16px; }
  .illust .dice { position: absolute; right: 6px; bottom: 6px; color: ${color.navyDeep}; }

  ${TABLET} {
    grid-template-columns: 1fr;
  }
  ${MOBILE} {
    .style-card { grid-template-columns: 1fr; }
    .style-body { padding: 26px 20px 22px; }
    .previews { grid-template-columns: 1fr; }
    .photo { order: -1; min-height: 160px; }
    .random-card { padding: 26px 20px; }
    .random-head { flex-direction: column; }
    .illust { align-self: center; margin-top: 0; }
    .card-sub { font-size: 16px; }
  }
`;

const Footer = styled.footer`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 24px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid ${color.border};
  font-size: 13px;
  color: ${color.textMuted};
  ${MOBILE} { flex-direction: column; }
`;
