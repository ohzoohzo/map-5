import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, FallbackView, FallbackViewText, Loading, SectionMessage, TextButton, Typography } from '@montage-ui/core';
import { IconArrowLeft, IconArrowRight } from '@montage-ui/icon';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowRight, Bookmark, Building2, CalendarDays, ChevronRight, CloudRain, CloudSun, Coffee, History, Landmark, MapPin, Trees, Undo2, UtensilsCrossed } from 'lucide-react';
import { ApiError, getConfig, type Place } from '../../api/client';
import KakaoMap, { type MapPin as KakaoPin } from '../../shared/map/KakaoMap';
import { usePlacePhotos } from '../../shared/media/usePlacePhotos';
import { districtOf } from '../../shared/regions';
import { navigate, useSearchParam } from '../../shared/router';
import TripBar from '../../shared/trip/TripBar';
import { tripActions, useTrip, type TripDay } from '../../shared/trip/tripStore';
import EmptyStateArt from '../../shared/ui/EmptyStateArt';
import DocentPanel from '../docent/DocentPanel';
import { WeatherPageLayout, WeatherSection } from './WeatherPage.styles';
import { forgetReplacement, formatClock, formatDay, formatDayLong, likelyIndoor, rainPeriod, recordReplacement, summarizeRain, useAlternatives, useChangeAdvice, useForecast, useRecommendedCount, useReplacedDays, useSameKindOptions, type SwapOption } from './weather';

// 시안: design/pinday-weather-v2.png — 머리글+예보 / 원래 일정 ↔ 바꿔볼 장소(+이런 곳도) / 출처
// 선택 상태는 URL 로 받는다 → 다른 화면에서 /weather?day=2&item=1 로 바로 열 수 있다 (day 는 1부터, item 은 0부터)
export default function WeatherPage() {
  const { t } = useTranslation('weather');
  const days = useTrip((trip) => trip.days);
  const places = useTrip((trip) => trip.places);
  const dayParam = Number(useSearchParam('day'));
  const itemParam = Number(useSearchParam('item') ?? 0);
  const [notice, setNotice] = useState<{ text: string; day: number } | null>(null);
  // 바꿔볼 장소는 위 '변경할 장소' 패널과 아래 비교 화면이 함께 쓴다. 다른 장소를 고르면 기본 추천으로 돌아간다.
  const [choice, setChoice] = useState<{ key: string; id: string } | null>(null);

  const recommended = useRecommendedCount(days, places);
  const replaced = useReplacedDays(days);
  const firstFilled = days.findIndex((day) => day.items.length > 0);
  const dayIndex = Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= days.length ? dayParam - 1 : Math.max(firstFilled, 0);
  const day = days[dayIndex];
  const itemIndex = day && Number.isInteger(itemParam) && itemParam >= 0 && itemParam < day.items.length ? itemParam : 0;
  const place = places[day?.items[itemIndex]?.placeId ?? ''];
  const compareKey = `${dayIndex}-${itemIndex}-${place?.id ?? ''}`;
  const chosenId = choice?.key === compareKey ? choice.id : null;

  function select(nextDay: number, nextItem: number) {
    setNotice(null);
    navigate(`/weather?day=${nextDay + 1}&item=${nextItem}`);
  }

  const empty = firstFilled < 0 || !day;

  return (
    <WeatherPageLayout>
      {/* 여행 계획하기·어떻게 갈까?와 같은 머리말: 제목과 설명을 맨 위에 둔다 */}
      <header className="page-head">
        <div>
          <Typography as="h1" variant="title2" weight="bold">{t('title')}</Typography>
          <Typography variant="body1" color="semantic.foreground.neutral.secondary">{t('subtitle')}</Typography>
        </div>
      </header>
      <TripBar page="weather" navigationMode="beforeTravel" />
      <WeatherSection style={dayStyle(dayIndex)}>
        {notice && (
          <div role="status">
            <SectionMessage variant="positive" description={notice.text}
              trailingButton={<TextButton size="small" onClick={() => navigate(`/schedule?day=${notice.day}`)}>{t('viewSchedule')}</TextButton>} />
          </div>
        )}

        {empty ? <>
          <div className="w-card">
            <FallbackView padding="compact">
              <EmptyStateArt kind="weather" size={140} />
              <FallbackViewText title={t('emptyTitle')} description={t('emptyDescription')} />
              <Button size="small" variant="solid" leadingContent={<CalendarDays />} onClick={() => navigate('/schedule')}>{t('goSchedule')}</Button>
            </FallbackView>
          </div>
        </> : <>
          {/* LNB 아래에는 날씨 소식 카드만 둔다 */}
          {place && <div className="w-hero"><ForecastCard place={place} date={day.date} dayNumber={dayIndex + 1} /></div>}
          {/* 원래 일정·바꿔볼 장소·이런 곳도 있어요는 '변경할 장소' 패널 안에, 해설은 그 아래에 둔다 */}
          {place
            ? <Compare key={compareKey} days={days} day={day} dayIndex={dayIndex} itemIndex={itemIndex} place={place} places={places} chosenId={chosenId}
              onSelect={select} onChoose={(id) => setChoice({ key: compareKey, id })} onReplaced={(text) => setNotice({ text, day: dayIndex + 1 })} />
            : <Planner days={days} places={places} dayIndex={dayIndex} itemIndex={itemIndex} place={place} chosenId={chosenId} onSelect={select} />}
        </>}

        <footer className="w-footer">
          <span>{t('footerSources')}</span>
          <span>{t('footerCaveat')}</span>
        </footer>
      </WeatherSection>

      <aside className="candidate-tray weather-tray" aria-labelledby="weather-tray-title">
        <div className="tray-summary">
          <div className="tray-summary-copy">
            <Typography id="weather-tray-title" as="h2" variant="headline2" weight="bold">{t('trayTitle', { count: recommended.count, changed: replaced.count })}</Typography>
            <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
              {replaced.perDay.map((count, index) => <Fragment key={index}>{index > 0 && ' · '}<span className="tray-day">{t(count ? 'trayDayChanged' : 'trayDayUnchanged', { day: index + 1 })}</span></Fragment>)}
            </Typography>
          </div>
        </div>
        <div className="weather-tray-actions">
          <Button variant="outlined" color="assistive" size="large" leadingContent={<IconArrowLeft />} onClick={() => navigate('/schedule')}>{t('backToPrevious')}</Button>
          <Button variant="solid" color="primary" size="large" trailingContent={<IconArrowRight />} onClick={() => navigate('/transport')}>{t('goTransport')}</Button>
        </div>
      </aside>
    </WeatherPageLayout>
  );
}

// 날씨 체크용 일정 색 (언제 갈까?·어떻게 갈까?와 같은 팔레트)
const DAY_COLORS = ['#0098b2', '#f37a1f', '#8d4ced', '#e2468b', '#2f9e4f', '#3f6ce0', '#b8860b'];
const dayStyle = (index: number) => ({ '--day-color': DAY_COLORS[index % DAY_COLORS.length] }) as CSSProperties;

/**
 * 바꿔볼 장소: 사용자가 고른 곳, 없으면 첫 추천. 같은 날 일정에 이미 있는 곳은 뺀다.
 * 카페·식당은 후보함에 담은 같은 종류 → 없으면 근처 같은 종류, 그 밖의 장소는 근처 실내 관광지에서 고른다.
 */
function useSwapOptions(day: TripDay | undefined, place: Place | undefined, chosenId: string | null) {
  const candidateIds = useTrip((trip) => trip.candidateIds);
  const tripPlaces = useTrip((trip) => trip.places);
  const sameKind = useSameKindOptions(place, candidateIds.flatMap((id) => (tripPlaces[id] ? [tripPlaces[id]] : [])));
  // 카페·식당이면 실내 관광지 대안은 쓰지 않는다 (원래 일정 카드의 실내 표시는 likelyIndoor 로 충분하다)
  const alternatives = useAlternatives(sameKind.kind ? undefined : place);
  const usesSaved = sameKind.saved.length > 0;
  const status = sameKind.kind
    ? usesSaved ? { isPending: false, isError: false, error: null } : sameKind.nearby
    : alternatives;
  const all: SwapOption[] = sameKind.kind
    ? usesSaved ? sameKind.saved : sameKind.nearby.data ?? []
    : (alternatives.data?.alternatives ?? []).map((option) => ({ ...option, origin: 'indoor' as const }));
  const inDay = new Set(day?.items.map((item) => item.placeId) ?? []);
  const options = all.filter((option) => !inDay.has(option.place.id));
  const chosen = options.find((option) => option.place.id === chosenId) ?? options[0];
  return { alternatives, status, kind: sameKind.kind, options, chosen };
}

/** 바꿔볼 장소 태그: 실내 후보 / 후보함에 담은 카페 / 근처 카페 */
function OptionBadge({ option, short = false }: { option: SwapOption; short?: boolean }) {
  const { t } = useTranslation('weather');
  const Icon = option.origin === 'saved' ? Bookmark : option.origin === 'indoor' ? Building2 : option.indoor_hint === '카페' ? Coffee : UtensilsCrossed;
  const text = option.origin === 'indoor' ? t(short ? 'indoorShort' : 'indoorCandidate')
    : t(option.origin === 'saved' ? 'savedKind' : short ? 'nearbyKindShort' : 'nearbyKind', { kind: option.indoor_hint });
  return <span className={short ? 'w-badge indoor small' : 'w-badge indoor'}><Icon />{text}</span>;
}

interface PlannerProps {
  days: TripDay[]; places: Record<string, Place>; dayIndex: number; itemIndex: number; place: Place | undefined; chosenId: string | null;
  onSelect: (day: number, item: number) => void;
  swapContent?: ReactNode;
}

// 어떻게 갈까?의 '일정 확인 / 선택한 구간 / 선택 구간 지도'와 같은 3단 구성. 내용은 날씨 체크에 맞게 채워 나간다.
function Planner({ days, places, dayIndex, itemIndex, place, chosenId, onSelect, swapContent }: PlannerProps) {
  const { t } = useTranslation('weather');
  const day = days[dayIndex];
  const items = day?.items ?? [];
  const { chosen } = useSwapOptions(day, place, chosenId);
  const replaced = useReplacedDays(days);
  const config = useQuery({ queryKey: ['config'], queryFn: ({ signal }) => getConfig(signal), staleTime: Infinity });
  const pins: KakaoPin[] = [
    ...(place ? [{ place, label: place.name, tone: 'idle' as const }] : []),
    ...(chosen ? [{ place: chosen.place, label: chosen.place.name, tone: `day${dayIndex % DAY_COLORS.length}` as const }] : []),
  ];

  return (
    <div className="w-planner">
      <section className="w-panel plan" aria-labelledby="weather-plan-title">
        <div className="w-day-tabs" role="group" aria-label={t('dayTabs')}>
          {days.map((each, index) => {
            const date = formatDay(each.date);
            return (
              <button key={index} type="button" className="w-day-tab" style={dayStyle(index)} aria-pressed={index === dayIndex}
                aria-label={date ? t('dayTab', { day: index + 1, date }) : t('dayWithCount', { day: index + 1, count: each.items.length })}
                onClick={() => onSelect(index, 0)}>
                <CalendarDays aria-hidden="true" />
                <span>DAY {index + 1}</span>
                {date && <><span className="w-day-separator" aria-hidden="true">·</span><span className="w-day-date">{date}</span></>}
              </button>
            );
          })}
        </div>
        <div className="w-panel-head">
          <Typography id="weather-plan-title" as="h2" variant="headline2" weight="bold">{t('planTitle')}</Typography>
          <span className="w-panel-count">{t('placeCount', { count: items.length })}</span>
        </div>
        {items.length ? (
          <ol className="w-plan-list">
            {items.map((item, index) => {
              const target = places[item.placeId];
              return (
                <li key={`${item.placeId}-${index}`}>
                  <button type="button" className="w-plan-row" aria-pressed={index === itemIndex} onClick={() => { onSelect(dayIndex, index); revealSwapPanel(); }}>
                    <span className="w-plan-number">{index + 1}</span>
                    <span className="w-plan-name">{target?.name ?? item.placeId}</span>
                    {target && <AdviceBadge place={target} date={day!.date} />}
                  </button>
                  {/* 어떻게 갈까?의 구간 표시와 같은 모양으로 변경 이력을 남기고, 누르면 원래 장소로 되돌린다 */}
                  {(() => {
                    const log = replaced.entryFor(dayIndex, item.placeId);
                    if (!log?.from || !target) return null;
                    // 원래 장소 id 를 남기기 전의 기록은 이름으로 찾는다
                    const origin = places[log.fromId ?? ''] ?? Object.values(places).find((each) => each.name === log.from);
                    const text = t('changeLog', { from: log.from, to: target.name, particle: particleRo(target.name) });
                    if (!origin) return <p className="w-change-log"><History aria-hidden="true" /><span>{text}</span></p>;
                    return (
                      <button type="button" className="w-change-log" aria-label={t('undoReplace', { from: target.name, to: origin.name })}
                        onClick={() => { tripActions.replaceItem(dayIndex, index, origin); forgetReplacement(day!, dayIndex, item.placeId); onSelect(dayIndex, index); }}>
                        <History aria-hidden="true" /><span>{text}</span><span className="w-undo"><Undo2 aria-hidden="true" />{t('undo')}</span>
                      </button>
                    );
                  })()}
                </li>
              );
            })}
          </ol>
        ) : <p className="w-card w-state w-meta">{t('dayEmpty')}</p>}
      </section>

      <section id="weather-swap-panel" className="w-panel swap" aria-labelledby="weather-swap-title">
        <div className="w-panel-head">
          <Typography id="weather-swap-title" as="h2" variant="headline2" weight="bold">{t('swapTitle')}</Typography>
          <span className="w-panel-count">{place ? t('placeOrder', { order: itemIndex + 1 }) : ''}</span>
        </div>
        {swapContent ?? <p className="w-card w-state w-meta">{t('dayEmpty')}</p>}
      </section>

      <section className="w-panel map" aria-labelledby="weather-map-title">
        <div className="w-panel-head">
          <Typography id="weather-map-title" as="h2" variant="headline2" weight="bold">{t('swapMapTitle')}</Typography>
        </div>
        <KakaoMap jsKey={config.data?.js_key} configLoading={config.isLoading} pins={pins} selectedId={null} onSelect={() => undefined}
          fitKey={pins.map((pin) => pin.place.id).join('-')} title={t('swapMapTitle')}
          legend={<><span><span className="legend-dot original" />{t('mapOriginal')}</span><span><span className="legend-dot alternative" />{t('mapAlternative')}</span></>} />
      </section>
    </div>
  );
}

/** 변경 추천일 때만 표시한다. 추천이 아닌 장소도 눌러서 직접 바꿀 수 있다. */
function AdviceBadge({ place, date }: { place: Place; date: string }) {
  const { t } = useTranslation('weather');
  return useChangeAdvice(place, date) === 'recommend'
    ? <span className="w-badge small recommend"><CloudRain aria-hidden="true" />{t('planRecommend')}</span>
    : null;
}

interface CompareProps {
  days: TripDay[]; day: TripDay; dayIndex: number; itemIndex: number; place: Place; places: Record<string, Place>; chosenId: string | null;
  onSelect: (day: number, item: number) => void;
  onChoose: (id: string) => void;
  onReplaced: (notice: string) => void;
}

function Compare({ days, day, dayIndex, itemIndex, place, places, chosenId, onSelect, onChoose, onReplaced }: CompareProps) {
  const { t } = useTranslation('weather');
  const { alternatives, status, kind, options, chosen } = useSwapOptions(day, place, chosenId);
  const [showAll, setShowAll] = useState(false);
  // 해설은 AI 호출(수 초·과금)이라 사용자가 장소 링크를 눌렀을 때만 DocentPanel 을 그린다
  const [docentPlace, setDocentPlace] = useState<Place | null>(null);

  const others = options.filter((option) => option !== chosen);
  const visibleOthers = showAll ? others : others.slice(0, 2);
  const label = { day: dayIndex + 1, order: itemIndex + 1 };
  const originIndoor = likelyIndoor(place) ?? alternatives.data?.origin_indoor_hint ?? null;

  function replace() {
    if (!chosen) return;
    // 알림을 먼저 올린다: 교체 후 이 컴포넌트는 key(place.id)가 바뀌어 새로 그려진다
    onReplaced(t('replacedNotice', { day: dayIndex + 1, from: place.name, to: chosen.place.name }));
    recordReplacement(day, dayIndex, chosen.place.id, place);
    tripActions.replaceItem(dayIndex, itemIndex, chosen.place);
  }

  const placeLink = (target: Place) => (
    <button type="button" className="w-place-link" title={target.address || t('noAddress')} aria-expanded={docentPlace?.id === target.id}
      onClick={() => setDocentPlace(docentPlace?.id === target.id ? null : target)} aria-label={t('docentOpen', { name: target.name })}>
      <MapPin /><span>{target.address || t('noAddress')}</span><ChevronRight />
    </button>
  );

  const advice = useChangeAdvice(place, day.date);
  const cards = (
      <div className="w-compare">
        {advice !== 'pending' && <p className={advice === 'recommend' ? 'w-advice-note recommend' : 'w-advice-note'}>{t(`adviceNote_${advice}`)}</p>}
        <article className="w-card w-place original" aria-label={t('original')}>
          <div className="w-place-copy">
            <div className="w-card-top"><span className="w-tag">{t('original')}</span><span className="w-meta">{t('dayLabel', label)}</span></div>
            <Typography as="h2" variant="title3" weight="bold">{place.name}</Typography>
            {(alternatives.data || originIndoor) && (
              <span className={originIndoor ? 'w-badge indoor' : 'w-badge'}>
                {originIndoor ? <Building2 /> : <Trees />}{originIndoor ? t('indoor', { hint: originIndoor }) : t('maybeOutdoor')}
              </span>
            )}
            {place.description && <p className="w-description">{place.description}</p>}
            {placeLink(place)}
          </div>
          <PlaceVisual place={place} kind={originIndoor ? 'indoor' : 'outdoor'} large />
        </article>

        {/* 시안 가운데 '이 장소만 교체' — 아래 '이 장소로 교체하기'와 같은 동작 */}
        <button type="button" className="w-swap" onClick={replace} disabled={!chosen}
          aria-label={chosen ? t('replaceOnlyNamed', { from: place.name, to: chosen.place.name }) : t('replaceOnly')}>
          <span>{t('replaceOnly')}</span><ArrowRight />
        </button>

        <div className="w-alt-column">
          {status.isPending && <div className="w-card w-state" role="status"><Loading /><span className="sr-only">{t('alternativesLoading')}</span></div>}
          {status.isError && status.error && <SectionMessage variant="negative" description={`${t('alternativesError')} · ${errorText(status.error, t)}`} />}
          {!status.isPending && !status.isError && !chosen && <p className="w-card w-state w-meta">
            {kind ? t('sameKindEmpty', { kind }) : t('alternativesEmpty', { km: alternatives.data?.radius_km ?? '' })}</p>}
          {chosen && (
            <article className="w-card w-place chosen" aria-label={t('alternative')}>
              <div className="w-place-copy">
                <div className="w-card-top"><span className="w-tag accent">{t('alternative')}</span><span className="w-meta">{t('dayLabel', label)}</span></div>
                <Typography as="h2" variant="title3" weight="bold">{chosen.place.name}</Typography>
                <OptionBadge option={chosen} />
                {chosen.place.description && <p className="w-description">{chosen.place.description}</p>}
                <div className="w-place-footer">
                  {placeLink(chosen.place)}
                  <span className="w-meta">{t('distance', { km: chosen.distance_km })}</span>
                </div>
              </div>
              <PlaceVisual place={chosen.place} kind="indoor" />
            </article>
          )}
          {others.length > 0 && (
            <section className="w-more" aria-labelledby="weather-more-title">
              <div className="w-more-head">
                <Typography id="weather-more-title" as="h3" variant="headline2" weight="bold"><span className="w-dot" aria-hidden="true" />{t('moreTitle')}</Typography>
                {others.length > 2 && (
                  <TextButton size="small" color="assistive" onClick={() => setShowAll(!showAll)}>{t(showAll ? 'showFewer' : 'showMore', { count: others.length - 2 })}</TextButton>
                )}
              </div>
              <ul className="w-more-list">
                {visibleOthers.map((option) => <MoreCard key={option.place.id} option={option} onChoose={() => onChoose(option.place.id)} />)}
              </ul>
            </section>
          )}
        </div>
      </div>
  );

  return (
    <>
      <Planner days={days} places={places} dayIndex={dayIndex} itemIndex={itemIndex} place={place} chosenId={chosenId} onSelect={onSelect} swapContent={cards} />

      {docentPlace && (
        <section className="w-card w-docent" aria-label={t('docentTitle', { name: docentPlace.name })}>
          <div className="w-docent-head">
            <Typography as="h2" variant="headline2" weight="bold">{t('docentTitle', { name: docentPlace.name })}</Typography>
            <TextButton size="small" color="assistive" onClick={() => setDocentPlace(null)}>{t('docentClose')}</TextButton>
          </div>
          <DocentPanel place={docentPlace} />
        </section>
      )}
    </>
  );
}

/** 공통 TourAPI 사진을 표시하고 사진별 이용조건은 푸터 출처 페이지로 연결한다. 사진이 없거나 못 불러오면 영역을 그리지 않는다. */
type VisualKind = 'indoor' | 'outdoor' | 'neutral';
const VISUAL_ICON = { indoor: Landmark, outdoor: Trees, neutral: MapPin };
function PlaceVisual({ place, kind, large = false, small = false }: { place: Place; kind: VisualKind; large?: boolean; small?: boolean }) {
  const { t } = useTranslation('weather');
  const photos = usePlacePhotos(place);
  const photo = photos.data?.photos[0];
  const [broken, setBroken] = useState<string | null>(null);
  const Icon = VISUAL_ICON[kind];
  const className = `w-visual ${kind}${large ? ' large' : ''}${small ? ' small' : ''}`;
  if (photo && broken === photo.url) return null;
  if (!photo) {
    if (!photos.isPending) return null;
    return <div className={className} role="status" aria-label={t('photoLabel', { name: place.name })}><span className="w-photo-state"><Icon aria-hidden="true" /><span>{t('photoLoading')}</span></span></div>;
  }
  return (
    <figure className={`${className} photo`}>
      <span className="w-photo-frame"><img src={photo.url} alt={t('photoAlt', { name: place.name, title: photo.title })} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(photo.url)} title={photo.title} /></span>
    </figure>
  );
}

function MoreCard({ option, onChoose }: { option: SwapOption; onChoose: () => void }) {
  const { t } = useTranslation('weather');
  return (
    <li>
      <button type="button" className="w-more-item" onClick={onChoose} aria-label={t('chooseAlternative', { name: option.place.name })}>
        <PlaceVisual place={option.place} kind="indoor" small />
        <span className="w-more-copy">
          <strong>{option.place.name}</strong>
          <OptionBadge option={option} short />
          {option.place.description && <span className="w-more-description">{option.place.description}</span>}
          <small><MapPin />{[districtOf(option.place), t('distance', { km: option.distance_km })].filter(Boolean).join(' · ')}</small>
        </span>
        <ChevronRight className="w-chevron" />
      </button>
    </li>
  );
}

function ForecastCard({ place, date, dayNumber }: { place: Place; date: string; dayNumber: number }) {
  const { t } = useTranslation('weather');
  const forecast = useForecast(place, date);
  const long = formatDayLong(date);
  const head = (
    <div className="w-forecast-head">
      <span>{long ? t('dayTab', { day: dayNumber, date: long }) : t('dayOnly', { day: dayNumber })}</span>
      <span className="w-source-badge">{t('forecastBadge')}</span>
    </div>
  );

  let body;
  let advice: string | null = null;
  let label = t('forecastLoading');
  let rainy = false;
  if (!long) {
    label = t('forecastNoDate');
    body = <div className="w-forecast-main"><CalendarDays className="w-weather-icon" /><div><strong>{label}</strong><p>{t('forecastNoDateDetail')}</p></div></div>;
  } else if (forecast.isPending) {
    body = <div className="w-forecast-main" role="status"><Loading /><span className="sr-only">{label}</span></div>;
  } else if (forecast.isError) {
    label = t('forecastError');
    body = (
      <div className="w-forecast-main" role="alert">
        <CloudSun className="w-weather-icon muted" />
        <div><strong>{label}</strong><p>{errorText(forecast.error, t)}</p></div>
        <Button size="small" variant="outlined" color="assistive" onClick={() => forecast.refetch()}>{t('forecastRetry')}</Button>
      </div>
    );
  } else if (forecast.data.status === 'out_of_range') {
    label = t('forecastUnknown');
    body = <div className="w-forecast-main"><CloudSun className="w-weather-icon muted" /><div><strong>{label}</strong><p>{t('forecastUnknownDetail')}</p></div></div>;
  } else {
    const rain = summarizeRain(forecast.data.slots);
    rainy = rain.rainy;
    label = rain.rainy ? t('rainTitle', { period: rainPeriod(rain.start, rain.end) }).trim() : t('clearTitle');
    advice = rain.rainy ? t('rainAdvice') : t('clearAdvice');
    body = (
      <div className="w-forecast-main">
        {rain.rainy ? <CloudRain className="w-weather-icon" /> : <CloudSun className="w-weather-icon" />}
        <div>
          <strong>{label}</strong>
          <p>{rain.rainy ? t('rainDetail', rain) : t('clearDetail', { max: rain.max, min: rain.minTemp, maxTemp: rain.maxTemp })}</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`w-card w-forecast${rainy ? ' rainy' : ''}${advice ? ' has-advice' : ''}`} aria-label={label}>
      <div className="w-forecast-left">{head}{body}</div>
      {advice && <p className="w-advice">{advice}</p>}
      {forecast.data?.status === 'ok' && <p className="w-forecast-time">{t('forecastSource', { time: formatClock(forecast.data.fetched_at), threshold: forecast.data.rain_threshold })}</p>}
    </section>
  );
}

/** '변경할 장소' 패널이 화면에 보이지 않으면 그 머리까지 스크롤한다 (어떻게 갈까?의 구간 선택과 같은 동작) */
function revealSwapPanel() {
  requestAnimationFrame(() => {
    const panel = document.getElementById('weather-swap-panel');
    if (!panel) return;
    const offset = parseFloat(getComputedStyle(panel).scrollMarginTop) || 0;
    const top = panel.getBoundingClientRect().top;
    if (top >= offset && top <= window.innerHeight * 0.5) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
}

/** 받침에 따라 '로'/'으로' (ㄹ 받침은 '로') */
function particleRo(word: string) {
  const code = word.trim().charCodeAt(word.trim().length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '(으)로';
  const final = code % 28;
  return final === 0 || final === 8 ? '로' : '으로';
}

const errorText = (error: Error, t: TFunction<'weather'>) => (error instanceof ApiError ? error.message : t('networkError'));
