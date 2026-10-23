import { useState } from 'react';
import { Button, FallbackView, FallbackViewText, Loading, Option, SectionMessage, Select, TextButton, Typography } from '@montage-ui/core';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowRight, Building2, CalendarDays, ChevronRight, CloudRain, CloudSun, Info, Landmark, MapPin, Trees } from 'lucide-react';
import { ApiError, type Place } from '../../api/client';
import type { WeatherAlternative } from '../../api/generated/model';
import { districtOf } from '../../shared/regions';
import { navigate, useSearchParam } from '../../shared/router';
import TripBar from '../../shared/trip/TripBar';
import { tripActions, useTrip, type TripDay } from '../../shared/trip/tripStore';
import PinDayPage from '../../shared/ui/PinDayPage';
import DocentPanel from '../docent/DocentPanel';
import { WeatherSection } from './WeatherPage.styles';
import { formatClock, formatDay, formatDayLong, rainPeriod, summarizeRain, useAlternatives, useForecast, usePlacePhoto } from './weather';

// 시안: design/pinday-weather-v2.png — 머리글+예보 / 원래 일정 ↔ 바꿔볼 장소(+이런 곳도) / 교체 후 미리보기 / 출처
// 선택 상태는 URL 로 받는다 → 다른 화면에서 /weather?day=2&item=1 로 바로 열 수 있다 (day 는 1부터, item 은 0부터)
export default function WeatherPage() {
  const { t } = useTranslation('weather');
  const days = useTrip((trip) => trip.days);
  const places = useTrip((trip) => trip.places);
  const dayParam = Number(useSearchParam('day'));
  const itemParam = Number(useSearchParam('item') ?? 0);
  const [notice, setNotice] = useState<{ text: string; day: number } | null>(null);

  const firstFilled = days.findIndex((day) => day.items.length > 0);
  const dayIndex = Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= days.length ? dayParam - 1 : Math.max(firstFilled, 0);
  const day = days[dayIndex];
  const itemIndex = day && Number.isInteger(itemParam) && itemParam >= 0 && itemParam < day.items.length ? itemParam : 0;
  const place = places[day?.items[itemIndex]?.placeId ?? ''];

  function select(nextDay: number, nextItem: number) {
    setNotice(null);
    navigate(`/weather?day=${nextDay + 1}&item=${nextItem}`);
  }

  const empty = firstFilled < 0 || !day;
  const heading = (
    <div className="w-hero-copy">
      <Typography as="h1" variant="title1" weight="bold">{t('title')}</Typography>
      <Typography variant="headline2" color="semantic.foreground.neutral.secondary">{t('subtitle')}</Typography>
      {!empty && (
        <div className="w-pickers">
          <label className="field"><span>{t('pickDay')}</span>
            <Select value={String(dayIndex)} onChange={(value) => select(Number(value), 0)} aria-label={t('pickDay')} width="100%">
              {days.map((each, index) => <Option key={index} value={String(index)}>{dayLabel(t, index, each)}</Option>)}
            </Select>
          </label>
          <label className="field"><span>{t('pickPlace')}</span>
            <Select value={String(itemIndex)} onChange={(value) => select(dayIndex, Number(value))} aria-label={t('pickPlace')} width="100%" disabled={day.items.length === 0}
              placeholder={t('dayEmpty')}>
              {day.items.map((item, index) => <Option key={`${item.placeId}-${index}`} value={String(index)}>{`${index + 1}. ${places[item.placeId]?.name ?? item.placeId}`}</Option>)}
            </Select>
          </label>
        </div>
      )}
    </div>
  );

  return (
    <PinDayPage>
      <TripBar page="schedule" />
      <WeatherSection>
        {notice && (
          <div role="status">
            <SectionMessage variant="positive" description={notice.text}
              trailingButton={<TextButton size="small" onClick={() => navigate(`/schedule?day=${notice.day}`)}>{t('viewSchedule')}</TextButton>} />
          </div>
        )}

        {empty ? <>
          <div className="w-hero">{heading}</div>
          <div className="w-card">
            <FallbackView padding="compact">
              <FallbackViewText title={t('emptyTitle')} description={t('emptyDescription')} />
              <Button size="small" variant="solid" leadingContent={<CalendarDays />} onClick={() => navigate('/schedule')}>{t('goSchedule')}</Button>
            </FallbackView>
          </div>
        </> : <>
          <div className="w-hero">
            {heading}
            {place && <ForecastCard place={place} date={day.date} dayNumber={dayIndex + 1} />}
          </div>
          {place
            ? <Compare key={`${dayIndex}-${itemIndex}-${place.id}`} day={day} dayIndex={dayIndex} itemIndex={itemIndex} place={place} places={places}
              onReplaced={(text) => setNotice({ text, day: dayIndex + 1 })} />
            : <div className="w-card w-state w-meta">{t('dayEmpty')}</div>}
        </>}

        <footer className="w-footer">
          <span>{t('footerSources')}</span>
          <span>{t('footerCaveat')}</span>
        </footer>
      </WeatherSection>
    </PinDayPage>
  );
}

interface CompareProps {
  day: TripDay; dayIndex: number; itemIndex: number; place: Place; places: Record<string, Place>;
  onReplaced: (notice: string) => void;
}

function Compare({ day, dayIndex, itemIndex, place, places, onReplaced }: CompareProps) {
  const { t } = useTranslation('weather');
  const alternatives = useAlternatives(place);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // 해설은 AI 호출(수 초·과금)이라 사용자가 장소 링크를 눌렀을 때만 DocentPanel 을 그린다
  const [docentPlace, setDocentPlace] = useState<Place | null>(null);

  const inDay = new Set(day.items.map((item) => item.placeId));
  const options = (alternatives.data?.alternatives ?? []).filter((option) => !inDay.has(option.place.id));
  const chosen = options.find((option) => option.place.id === chosenId) ?? options[0];
  const others = options.filter((option) => option !== chosen);
  const visibleOthers = showAll ? others : others.slice(0, 2);
  const label = { day: dayIndex + 1, order: itemIndex + 1 };
  const previous = places[day.items[itemIndex - 1]?.placeId ?? ''];
  const next = places[day.items[itemIndex + 1]?.placeId ?? ''];
  const originIndoor = alternatives.data?.origin_indoor_hint ?? null;

  function replace() {
    if (!chosen) return;
    // 알림을 먼저 올린다: 교체 후 이 컴포넌트는 key(place.id)가 바뀌어 새로 그려진다
    onReplaced(t('replacedNotice', { day: dayIndex + 1, from: place.name, to: chosen.place.name }));
    tripActions.replaceItem(dayIndex, itemIndex, chosen.place);
  }

  const placeLink = (target: Place) => (
    <button type="button" className="w-place-link" aria-expanded={docentPlace?.id === target.id}
      onClick={() => setDocentPlace(docentPlace?.id === target.id ? null : target)} aria-label={t('docentOpen', { name: target.name })}>
      <MapPin />{target.address || t('noAddress')}<ChevronRight />
    </button>
  );

  return (
    <>
      <div className="w-compare">
        <article className="w-card w-place" aria-label={t('original')}>
          <div className="w-place-copy">
            <div className="w-card-top"><span className="w-tag">{t('original')}</span><span className="w-meta">{t('dayLabel', label)}</span></div>
            <Typography as="h2" variant="title3" weight="bold">{place.name}</Typography>
            {alternatives.data && (
              <span className={originIndoor ? 'w-badge indoor' : 'w-badge'}>
                {originIndoor ? <Building2 /> : <Trees />}{originIndoor ? t('indoor', { hint: originIndoor }) : t('maybeOutdoor')}
              </span>
            )}
            {place.description && <p className="w-description">{place.description}</p>}
            {placeLink(place)}
          </div>
          <PlaceVisual name={place.name} kind={originIndoor ? 'indoor' : 'outdoor'} large />
        </article>

        <div className="w-swap" aria-hidden="true"><span>{t('replaceOnly')}</span><ArrowRight /></div>

        <div className="w-alt-column">
          {alternatives.isPending && <div className="w-card w-state" role="status"><Loading /><span className="sr-only">{t('alternativesLoading')}</span></div>}
          {alternatives.isError && <SectionMessage variant="negative" description={`${t('alternativesError')} · ${errorText(alternatives.error, t)}`} />}
          {alternatives.data && !chosen && <p className="w-card w-state w-meta">{t('alternativesEmpty', { km: alternatives.data.radius_km })}</p>}
          {chosen && (
            <article className="w-card w-place chosen" aria-label={t('alternative')}>
              <div className="w-place-copy">
                <div className="w-card-top"><span className="w-tag accent">{t('alternative')}</span><span className="w-meta">{t('dayLabel', label)}</span></div>
                <Typography as="h2" variant="title3" weight="bold">{chosen.place.name}</Typography>
                <span className="w-badge indoor"><Building2 />{t('indoorCandidate')}</span>
                {chosen.place.description && <p className="w-description">{chosen.place.description}</p>}
                <span className="w-meta">{t('distance', { km: chosen.distance_km })}</span>
                {placeLink(chosen.place)}
              </div>
              <PlaceVisual name={chosen.place.name} kind="indoor" />
            </article>
          )}
          {others.length > 0 && (
            <section className="w-more" aria-labelledby="weather-more-title">
              <Typography id="weather-more-title" as="h3" variant="headline2" weight="bold"><span className="w-dot" aria-hidden="true" />{t('moreTitle')}</Typography>
              <ul className="w-more-list">
                {visibleOthers.map((option) => <MoreCard key={option.place.id} option={option} onChoose={() => setChosenId(option.place.id)} />)}
              </ul>
              {others.length > 2 && (
                <TextButton size="small" color="assistive" onClick={() => setShowAll(!showAll)}>{t(showAll ? 'showFewer' : 'showMore', { count: others.length - 2 })}</TextButton>
              )}
            </section>
          )}
        </div>
      </div>

      {docentPlace && (
        <section className="w-card w-docent" aria-label={t('docentTitle', { name: docentPlace.name })}>
          <div className="w-docent-head">
            <Typography as="h2" variant="headline2" weight="bold">{t('docentTitle', { name: docentPlace.name })}</Typography>
            <TextButton size="small" color="assistive" onClick={() => setDocentPlace(null)}>{t('docentClose')}</TextButton>
          </div>
          <DocentPanel place={docentPlace} />
        </section>
      )}

      {chosen && (
        <section className="w-card w-preview" aria-label={t('previewTitle')}>
          <div className="w-preview-label">
            <span className="w-preview-icon"><CalendarDays /></span>
            <div>
              <Typography as="h2" variant="headline1" weight="bold">{t('previewTitle')}</Typography>
              <Typography variant="label2" color="semantic.foreground.neutral.secondary">{t('previewDetail', label)}</Typography>
            </div>
          </div>
          <ol className="w-timeline">
            {previous && <TimelineStop place={previous} order={itemIndex} badge={t('before')} />}
            <TimelineStop place={chosen.place} order={itemIndex + 1} badge={t('replaced')} replaced />
            {next && <TimelineStop place={next} order={itemIndex + 2} badge={t('after')} />}
          </ol>
          <div className="w-actions">
            <p className="w-info"><Info />{t('previewNote', label)}</p>
            <Button variant="outlined" color="primary" onClick={() => navigate(`/schedule?day=${dayIndex + 1}`)}>{t('keep')}</Button>
            <Button variant="solid" color="primary" trailingContent={<ArrowRight />} onClick={replace}>{t('replace')}</Button>
          </div>
        </section>
      )}
    </>
  );
}

/** 장소 사진: 한국관광공사 관광사진에서 이름이 맞는 사진. 없거나 못 불러오면 실내·야외 아이콘(모르면 neutral)으로 대신한다 */
type VisualKind = 'indoor' | 'outdoor' | 'neutral';
const VISUAL_ICON = { indoor: Landmark, outdoor: Trees, neutral: MapPin };
function PlaceVisual({ name, kind, large = false, small = false }: { name: string; kind: VisualKind; large?: boolean; small?: boolean }) {
  const { t } = useTranslation('weather');
  const photo = usePlacePhoto(name).data?.photo;
  const [broken, setBroken] = useState<string | null>(null);
  const Icon = VISUAL_ICON[kind];
  const className = `w-visual ${kind}${large ? ' large' : ''}${small ? ' small' : ''}`;
  if (!photo || broken === photo.url) return <div className={className} aria-hidden="true"><Icon /></div>;
  const credit = t('photoCredit', { photographer: photo.photographer || photo.source });
  return (
    <figure className={`${className} photo`}>
      <img src={photo.url} alt={t('photoAlt', { name: photo.title })} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(photo.url)} title={credit} />
      {!small && <figcaption>{credit}</figcaption>}
    </figure>
  );
}

function MoreCard({ option, onChoose }: { option: WeatherAlternative; onChoose: () => void }) {
  const { t } = useTranslation('weather');
  return (
    <li>
      <button type="button" className="w-more-item" onClick={onChoose} aria-label={t('chooseAlternative', { name: option.place.name })}>
        <PlaceVisual name={option.place.name} kind="indoor" small />
        <span className="w-more-copy">
          <strong>{option.place.name}</strong>
          <span className="w-badge indoor small"><Building2 />{t('indoorShort')}</span>
          <small><MapPin />{[districtOf(option.place), t('distance', { km: option.distance_km })].filter(Boolean).join(' · ')}</small>
        </span>
        <ChevronRight className="w-chevron" />
      </button>
    </li>
  );
}

function TimelineStop({ place, order, badge, replaced = false }: { place: Place; order: number; badge: string; replaced?: boolean }) {
  const { t } = useTranslation('weather');
  return (
    <li className={replaced ? 'w-stop replaced' : 'w-stop'}>
      <PlaceVisual name={place.name} kind={replaced ? 'indoor' : 'neutral'} small />
      <span className="w-stop-copy">
        <span className="w-stop-top"><span className="w-stop-order">{t('order', { order })}</span><span className={replaced ? 'w-stop-badge replaced' : 'w-stop-badge'}>{badge}</span></span>
        <strong>{place.name}</strong>
      </span>
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
    <section className={rainy ? 'w-card w-forecast rainy' : 'w-card w-forecast'} aria-label={label}>
      <div className="w-forecast-left">{head}{body}</div>
      {advice && <p className="w-advice">{advice}</p>}
      {forecast.data?.status === 'ok' && <p className="w-forecast-time">{t('forecastSource', { time: formatClock(forecast.data.fetched_at), threshold: forecast.data.rain_threshold })}</p>}
    </section>
  );
}

const dayLabel = (t: TFunction<'weather'>, index: number, day: TripDay) => (formatDay(day.date)
  ? t('dayTab', { day: index + 1, date: formatDay(day.date) })
  : t('dayWithCount', { day: index + 1, count: day.items.length }));

const errorText = (error: Error, t: TFunction<'weather'>) => (error instanceof ApiError ? error.message : t('networkError'));
