import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Heart, Info, MapPin, RotateCcw } from 'lucide-react';
import { getCatalog, type Place } from '../../api/client';
import { districtOf } from '../../shared/regions';
import { Link, navigate } from '../../shared/router';
import PinDayPage from '../../shared/ui/PinDayPage';
import TripBar from '../../shared/trip/TripBar';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import { color } from '../../shared/design/tokens';
import { isTasteType, OPTION_ICONS, QUESTIONS, scoreTaste, TASTE_TYPES, TYPE_ICONS, TYPE_IMAGES, TYPE_PLACES, type TasteType } from './data';
import { TasteLayout } from './styles';

// 시안: design/pinday-taste-v2.png (결과 화면). 문항 화면은 같은 스타일로 한 문항씩.
const REGION = '부산광역시';

export default function TastePage() {
  const { t } = useTranslation('taste');
  const savedTaste = useTrip((trip) => trip.taste);
  const [answers, setAnswers] = useState<TasteType[]>([]);
  // 이미 테스트를 했다면 결과부터 보여준다
  const [result, setResult] = useState<TasteType | null>(isTasteType(savedTaste) ? savedTaste : null);

  function answer(type: TasteType) {
    const next = [...answers, type];
    setAnswers(next);
    if (next.length === QUESTIONS.length) {
      const found = scoreTaste(next);
      tripActions.setTaste(found);
      setResult(found);
    }
  }

  function retry() {
    setAnswers([]);
    setResult(null);
  }

  const done = result !== null;

  return (
    <PinDayPage>
      <TripBar page="explore" />
      <TasteLayout>
        <header className="ts-head">
          <div>
            <nav className="ts-crumb" aria-label={t('breadcrumbTaste')}>
              <Link href="/">{t('breadcrumbHome')}</Link><span aria-hidden>/</span><span aria-current="page">{t('breadcrumbTaste')}</span>
            </nav>
            <h1>{t('title')}</h1>
            <p className="ts-sub">{t('subtitle')}</p>
          </div>
          <Progress count={done ? QUESTIONS.length : answers.length} current={done ? QUESTIONS.length : answers.length + 1} done={done} />
        </header>

        {result
          ? <Result type={result} onRetry={retry} />
          : <Question index={answers.length} onAnswer={answer} onPrev={() => setAnswers(answers.slice(0, -1))} />}

        <footer className="ts-footer">
          <span>{t('footer.sources')}</span>
          <span>{t('footer.note')}</span>
        </footer>
      </TasteLayout>
    </PinDayPage>
  );
}

function Progress({ count, current, done }: { count: number; current: number; done: boolean }) {
  const { t } = useTranslation('taste');
  return (
    <div className="ts-progress" aria-label={t('progressLabel')}>
      <ol>
        {QUESTIONS.map((id, index) => (
          <li key={id} className={index < count ? 'is-done' : index === count ? 'is-now' : ''}>
            {index < count ? <Check size={16} strokeWidth={3} /> : null}
          </li>
        ))}
      </ol>
      <p>
        <strong>{t('progress', { current, total: QUESTIONS.length })}</strong>
        {done && <span>{t('progressDone')}</span>}
      </p>
    </div>
  );
}

function Question({ index, onAnswer, onPrev }: { index: number; onAnswer: (type: TasteType) => void; onPrev: () => void }) {
  const { t } = useTranslation('taste');
  const id = QUESTIONS[index]!;
  return (
    <section className="ts-card ts-question" aria-labelledby="ts-question-title">
      <p className="ts-qnum">{t('question.number', { number: index + 1 })}</p>
      <h2 id="ts-question-title">{t(`questions.${id}.title`)}</h2>
      <div className="ts-options">
        {TASTE_TYPES.map((type) => {
          const Icon = OPTION_ICONS[type];
          return (
            <button key={type} type="button" className="ts-option" onClick={() => onAnswer(type)}>
              <span className="ts-icon"><Icon size={24} strokeWidth={1.7} /></span>
              {t(`questions.${id}.${type}`)}
            </button>
          );
        })}
      </div>
      <div className="ts-qnav">
        <button type="button" className="ts-prev" onClick={onPrev} disabled={index === 0}><ArrowLeft size={18} />{t('question.prev')}</button>
        <Link href="/explore" className="ts-skip">{t('question.skip')}<ArrowRight size={18} /></Link>
      </div>
    </section>
  );
}

function Result({ type, onRetry }: { type: TasteType; onRetry: () => void }) {
  const { t } = useTranslation('taste');
  const keywords = t(`types.${type}.keywords`, { returnObjects: true }) as unknown as string[];
  const traits = t(`types.${type}.traits`, { returnObjects: true }) as unknown as { title: string; body: string }[];
  const icons = TYPE_ICONS[type];
  const image = TYPE_IMAGES[type];

  return (
    <>
      <div className="ts-result-grid">
        <section className="ts-card ts-hero">
          <div
            className="ts-illust"
            aria-hidden
            style={{ background: image ? `url(${image}) center / cover no-repeat` : `linear-gradient(160deg, ${color.primarySoft} 0%, ${color.borderStrong} 100%)` }}
          />
          <div className="ts-hero-body">
            <p className="ts-eyebrow">{t('result.eyebrow')}</p>
            <h2>{t(`types.${type}.name`)}</h2>
            <p className="ts-summary">{t(`types.${type}.summary`)}</p>
            <ul className="ts-keywords">
              {keywords.map((keyword, index) => {
                const Icon = icons[index]!;
                return <li key={keyword}><Icon size={18} strokeWidth={1.8} />{keyword}</li>;
              })}
            </ul>
          </div>
        </section>

        <section className="ts-card ts-traits" aria-labelledby="ts-traits-title">
          <h3 id="ts-traits-title">{t('result.traitsTitle')}</h3>
          <ul>
            {traits.map((trait, index) => {
              const Icon = icons[index]!;
              return (
                <li key={trait.title}>
                  <span className="ts-icon"><Icon size={22} strokeWidth={1.7} /></span>
                  <div><strong>{trait.title}</strong><p>{trait.body}</p></div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="ts-card ts-places" aria-labelledby="ts-places-title">
        <div className="ts-places-main">
          <h3 id="ts-places-title"><MapPin size={20} fill={color.primary} color={color.surface} />{t('result.placesTitle')}<small>{t('result.placesSub')}</small></h3>
          <RecommendedPlaces type={type} />
        </div>
        <div className="ts-actions">
          <button type="button" className="ts-cta" onClick={() => { tripActions.setTaste(type); navigate('/explore'); }}>
            {t('result.cta')}<ArrowRight size={20} />
          </button>
          <p className="ts-hint">{t('result.ctaHint')}</p>
          <div className="ts-sub-actions">
            <button type="button" className="ts-outline" onClick={onRetry}><RotateCcw size={17} />{t('result.retry')}</button>
          </div>
          <p className="ts-note"><Info size={16} />{t('result.note')}</p>
        </div>
      </section>
    </>
  );
}

function RecommendedPlaces({ type }: { type: TasteType }) {
  const { t } = useTranslation('taste');
  // 어디 갈까?의 '부산 전체' 목록과 같은 queryKey 라 한 번만 받는다
  const catalog = useQuery({
    queryKey: ['travel', 'catalog', REGION, ''],
    queryFn: ({ signal }) => getCatalog(REGION, '', signal),
    staleTime: Infinity,
  });

  if (catalog.isLoading) return <p className="ts-status">{t('result.placesLoading')}</p>;
  if (catalog.isError) return <p className="ts-status" role="alert">{t('result.placesError')}</p>;

  const places = TYPE_PLACES[type]
    .map((name) => catalog.data?.places.find((place) => place.name === name))
    .filter((place): place is Place => place !== undefined);

  return (
    <ul className="ts-place-list">
      {places.map((place) => <PlaceCard key={place.id} place={place} />)}
    </ul>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const { t } = useTranslation('taste');
  const saved = useTrip((trip) => trip.candidateIds.includes(place.id));
  const district = districtOf(place);

  return (
    <li className="ts-place">
      <span className="ts-place-photo" aria-hidden />
      <div className="ts-place-body">
        <strong>{place.name}</strong>
        <p>{place.description}</p>
        <span className="ts-tags">
          <span>{place.category}</span>
          {district && <span>{district}</span>}
        </span>
      </div>
      <button
        type="button"
        className={saved ? 'ts-heart is-on' : 'ts-heart'}
        aria-pressed={saved}
        aria-label={t(saved ? 'result.removeCandidate' : 'result.saveCandidate', { name: place.name })}
        onClick={() => (saved ? tripActions.removeCandidate(place.id) : tripActions.addCandidate(place))}
      >
        <Heart size={22} fill={saved ? color.coral : 'none'} />
      </button>
    </li>
  );
}
