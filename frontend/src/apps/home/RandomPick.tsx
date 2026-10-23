import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, MapPin, RotateCcw } from 'lucide-react';
import { getCatalog, type Place } from '../../api/client';
import { districtOf, provincesOf, resolveProvince, shortProvince } from '../../shared/regions';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import { color, radius } from '../../shared/design/tokens';

const MAX_DRAWS = 3;
const ROLL_MS = 1500;

/** 슬롯머신처럼 처음엔 빠르게, 점점 느리게 바뀌는 간격들 (합계 약 ROLL_MS) */
function rollDelays() {
  const delays: number[] = [];
  let delay = 45;
  let total = 0;
  while (total + delay < ROLL_MS) {
    delays.push(delay);
    total += delay;
    delay *= 1.16;
  }
  return delays;
}

const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]!;

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Phase = 'idle' | 'loading' | 'rolling' | 'done';

/** 홈의 "아직 어디 갈지 모르겠다면" 카드: 현재 여행 지역의 관광지 하나를 뽑는다. */
export default function RandomPick({ destination, onExplore }: { destination: string; onExplore: () => void }) {
  const { t } = useTranslation('home');
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [slotName, setSlotName] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);
  const [used, setUsed] = useState(0);
  const [error, setError] = useState(false);
  const timers = useRef<number[]>([]);
  const mounted = useRef(true);
  const saved = useTrip((trip) => (picked ? trip.candidateIds.includes(picked.id) : false));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const remaining = MAX_DRAWS - used;
  const busy = phase === 'loading' || phase === 'rolling';

  async function draw() {
    if (busy || remaining <= 0) return;
    setError(false);
    setPhase('loading');
    let places: Place[];
    try {
      // 어디 갈까?와 같은 지역·queryKey 를 쓴다. 예전에 저장한 짧은 목적지도 목록으로 확인한다.
      const catalogFor = (region: string) => queryClient.fetchQuery({
        queryKey: ['travel', 'catalog', region, ''],
        queryFn: ({ signal }) => getCatalog(region, '', signal),
        staleTime: Infinity,
      });
      let catalog = await catalogFor(destination);
      const province = resolveProvince(destination, provincesOf(catalog.regions));
      if (!province) throw new Error('여행 지역을 확인하지 못했어요.');
      if (province !== destination) catalog = await catalogFor(province);
      places = catalog.places;
    } catch {
      places = [];
    }
    if (!mounted.current) return;
    if (!places.length) {
      setError(true);
      setPhase(picked ? 'done' : 'idle');
      return;
    }

    // 같은 장소가 연속으로 나오지 않게 직전 결과는 빼고 뽑는다
    const pool = places.length > 1 && picked ? places.filter((place) => place.id !== picked.id) : places;
    const next = pickOne(pool);
    setUsed((count) => count + 1);

    if (prefersReducedMotion()) {
      setPicked(next);
      setPhase('done');
      return;
    }

    setPhase('rolling');
    let elapsed = 0;
    let shown = '';
    timers.current = rollDelays().map((delay) => {
      elapsed += delay;
      return window.setTimeout(() => {
        const candidates = places.filter((place) => place.name !== shown);
        shown = pickOne(candidates.length ? candidates : places).name;
        setSlotName(shown);
      }, elapsed);
    });
    timers.current.push(window.setTimeout(() => setSlotName(next.name), elapsed + 140));
    timers.current.push(window.setTimeout(() => { setPicked(next); setPhase('done'); }, elapsed + 520));
  }

  function toggleCandidate() {
    if (!picked) return;
    if (saved) tripActions.removeCandidate(picked.id);
    else tripActions.addCandidate(picked);
  }

  const district = picked ? districtOf(picked) : '';

  return (
    <Card className="card random-card" aria-labelledby="random-title">
      <div className="random-head">
        <div>
          <h2 id="random-title">{t('random.title')}</h2>
          <p className="card-sub">{t('random.subtitle', { place: shortProvince(destination) })}</p>
        </div>
        <span className={busy ? 'illust is-rolling' : 'illust'} aria-hidden>
          <img className="random-asset" src="/images/pinday/travel-random.png" alt="" width={148} height={148} loading="lazy" decoding="async" />
        </span>
      </div>

      {phase === 'rolling' && (
        <div className="slot">
          <span className="sr-only" role="status">{t('random.rolling')}</span>
          <p className="slot-label" aria-hidden>{t('random.rolling')}</p>
          <p key={slotName} className="slot-name" aria-hidden>{slotName}</p>
        </div>
      )}

      {phase === 'done' && picked && (
        <div className="result" role="status">
          <span className="badge" aria-hidden>{t('random.badge')}</span>
          <p className="result-label">{t('random.resultLabel')}</p>
          <h3>{picked.name}</h3>
          {district && <p className="district"><MapPin size={15} />{district}</p>}
          {picked.description && <p className="desc">{picked.description}</p>}
          <button type="button" className={saved ? 'save is-on' : 'save'} aria-pressed={saved} onClick={toggleCandidate}>
            <Heart size={18} fill={saved ? color.coral : 'none'} />{t(saved ? 'random.saved' : 'random.save')}
          </button>
        </div>
      )}

      {error && <p className="error" role="alert">{t('random.error')}</p>}

      {phase === 'idle' || phase === 'loading' ? (
        <button type="button" className="outline" onClick={draw} disabled={busy}>
          {phase === 'loading' ? t('random.loading') : t('random.cta')}
        </button>
      ) : (
        <div className="actions">
          <div className="chances" aria-label={t('random.chancesLabel', { count: remaining })}>
            <span aria-hidden>{t('random.chances')}</span>
            <span className="dots" aria-hidden>
              {Array.from({ length: MAX_DRAWS }, (_, index) => <i key={index} className={index < remaining ? 'on' : ''} />)}
            </span>
          </div>
          {remaining <= 0 && phase === 'done' && <p className="finished">{t('random.finished')}</p>}
          <div className="action-row">
            <button type="button" className="outline" onClick={draw} disabled={busy || remaining <= 0}>
              <RotateCcw size={17} />{t('random.again')}
            </button>
            <button type="button" className="outline" onClick={onExplore} disabled={busy}>
              {t('random.explore')}<ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

const roll = keyframes`
  0% { transform: translateY(0) rotate(0deg); }
  30% { transform: translateY(-10px) rotate(120deg); }
  60% { transform: translateY(0) rotate(240deg); }
  100% { transform: translateY(0) rotate(360deg); }
`;

const pop = keyframes`
  0% { opacity: 0; transform: scale(0.85) translateY(8px); }
  60% { opacity: 1; transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
`;

const tick = keyframes`
  from { opacity: 0.35; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
`;

// .card · h2 · .card-sub · .outline · .illust 기본 모양은 HomePage 의 Cards 스타일을 그대로 쓴다
const Card = styled.section`
  .random-head > .illust { width: 148px; height: 148px; }
  .random-asset { display: block; width: 148px; height: 148px; max-width: 100%; object-fit: contain; }
  .illust.is-rolling .random-asset { animation: ${roll} 0.45s linear infinite; }

  .slot { display: grid; place-items: center; gap: 6px; min-height: 132px; padding: 18px; border: 2px dashed ${color.borderStrong}; border-radius: ${radius.lg}; background: ${color.surface}; text-align: center; overflow: hidden; }
  .slot-label { font-size: 14px; font-weight: 600; color: ${color.teal}; }
  .slot-name { font-size: clamp(22px, 2.4vw, 30px); font-weight: 800; letter-spacing: -0.8px; color: ${color.navy}; animation: ${tick} 0.08s ease-out; }

  .result { position: relative; padding: 20px 20px 18px; border: 1px solid ${color.border}; border-radius: ${radius.lg}; background: ${color.surface}; box-shadow: 0 10px 26px ${color.navy}14; animation: ${pop} 0.45s ease-out both; }
  .badge { position: absolute; top: -14px; right: 18px; padding: 4px 12px; border-radius: ${radius.pill}; background: ${color.coral}; color: ${color.surface}; font-size: 14px; font-weight: 800; transform: rotate(6deg); }
  .result-label { font-size: 14px; font-weight: 600; color: ${color.teal}; }
  .result h3 { margin-top: 4px; font-size: clamp(22px, 2.2vw, 28px); font-weight: 800; letter-spacing: -0.8px; color: ${color.navy}; }
  .district { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 14px; font-weight: 600; color: ${color.textSub}; }
  .desc { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; margin-top: 10px; font-size: 14px; line-height: 1.6; color: ${color.textSub}; }
  .save { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-top: 12px; padding: 0 16px; border: 1px solid ${color.border}; border-radius: ${radius.pill}; background: ${color.surface}; color: ${color.navy}; font-size: 15px; font-weight: 700; }
  .save.is-on { border-color: ${color.coral}; color: ${color.coral}; }

  .error { font-size: 14px; color: ${color.coral}; }

  .actions { display: grid; gap: 10px; }
  .chances { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: ${color.textSub}; }
  .dots { display: inline-flex; gap: 6px; }
  .dots i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid ${color.primary}; }
  .dots i.on { background: ${color.primary}; }
  .finished { padding: 10px 14px; border-radius: ${radius.md}; background: ${color.primarySoft}; color: ${color.navyDeep}; font-size: 15px; font-weight: 700; text-align: center; }
  .action-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .action-row .outline { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 16px; }
  .outline:disabled { border-color: ${color.borderStrong}; color: ${color.textMuted}; cursor: not-allowed; }

  @media (max-width: 720px) {
    .action-row { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .illust.is-rolling .random-asset, .slot-name, .result { animation: none; }
  }
`;
