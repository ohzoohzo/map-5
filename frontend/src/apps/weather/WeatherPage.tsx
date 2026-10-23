import { useState, type CSSProperties } from 'react';
import { Button, FallbackView, FallbackViewText, Loading, SectionMessage, TextButton, Typography } from '@montage-ui/core';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowRight, BookOpen, Building2, CalendarDays, CloudRain, CloudSun, Info, Landmark, MapPin, Trees } from 'lucide-react';
import { ApiError, type Place } from '../../api/client';
import { navigate, useSearchParam } from '../../shared/router';
import TripBar from '../../shared/trip/TripBar';
import { tripActions, useTrip, type TripDay } from '../../shared/trip/tripStore';
import PinDayPage from '../../shared/ui/PinDayPage';
import DocentPanel from '../docent/DocentPanel';
import { WeatherSection } from './WeatherPage.styles';
import { formatClock, formatDay, formatHour, summarizeRain, useAlternatives, useForecast } from './weather';

// 언제 갈까?(SchedulePage)와 같은 DAY 색 — 같은 DAY 를 두 화면에서 같은 색으로 본다
const DAY_COLORS = ['#0098b2', '#f37a1f', '#8d4ced', '#e2468b', '#2f9e4f', '#3f6ce0', '#b8860b'];
const dayColor = (index: number) => DAY_COLORS[index % DAY_COLORS.length]!;

// 시안: design/pinday-weather-v2.png
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

  return (
    <PinDayPage>
      <TripBar page="schedule" />
      <WeatherSection>
        <header className="w-head">
          <Typography as="h1" variant="title2" weight="bold">{t('title')}</Typography>
          <Typography variant="body1" color="semantic.foreground.neutral.secondary">{t('subtitle')}</Typography>
        </header>

        {firstFilled < 0 || !day ? (
          <div className="w-card">
            <FallbackView padding="compact">
              <FallbackViewText title={t('emptyTitle')} description={t('emptyDescription')} />
              <Button size="small" variant="solid" leadingContent={<CalendarDays />} onClick={() => navigate('/schedule')}>{t('goSchedule')}</Button>
            </FallbackView>
          </div>
        ) : <>
          {notice && (
            <div role="status">
              <SectionMessage variant="positive" description={notice.text}
                trailingButton={<TextButton size="small" onClick={() => navigate(`/schedule?day=${notice.day}`)}>{t('viewSchedule')}</TextButton>} />
            </div>
          )}

          <section className="w-card w-picker" aria-labelledby="weather-pick-title">
            <Typography id="weather-pick-title" as="h2" variant="headline2" weight="bold">{t('pickTitle')}</Typography>
            <div className="day-tabs" role="tablist" aria-label={t('pickTitle')}>
              {days.map((each, index) => (
                <button key={index} type="button" role="tab" aria-selected={index === dayIndex}
                  className={index === dayIndex ? 'day-tab active' : 'day-tab'} style={{ '--day-color': dayColor(index) } as CSSProperties}
                  onClick={() => select(index, 0)}>
                  <strong>DAY {index + 1}</strong><span>{formatDay(each.date) || t('placesInDay', { count: each.items.length })}</span>
                </button>
              ))}
            </div>
            {day.items.length === 0
              ? <Typography as="p" variant="label2" color="semantic.foreground.neutral.tertiary">{t('dayEmpty')}</Typography>
              : (
                <div className="w-stops">
                  {day.items.map((item, index) => (
                    <button key={`${item.placeId}-${index}`} type="button" aria-pressed={index === itemIndex}
                      className={index === itemIndex ? 'chip active' : 'chip'} onClick={() => select(dayIndex, index)}>
                      <span className="w-stop-number" style={{ background: dayColor(dayIndex) }}>{index + 1}</span>{places[item.placeId]?.name ?? item.placeId}
                    </button>
                  ))}
                </div>
              )}
          </section>

          {place && <Compare key={`${dayIndex}-${itemIndex}-${place.id}`} day={day} dayIndex={dayIndex} itemIndex={itemIndex} place={place} places={places}
            onReplaced={(text) => setNotice({ text, day: dayIndex + 1 })} />}
        </>}
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
  // 해설은 AI 호출(수 초·과금)이라 사용자가 열 때만 DocentPanel 을 그린다
  const [docentFor, setDocentFor] = useState<string | null>(null);

  const inDay = new Set(day.items.map((item) => item.placeId));
  const options = (alternatives.data?.alternatives ?? []).filter((option) => !inDay.has(option.place.id));
  const chosen = options.find((option) => option.place.id === chosenId) ?? options[0];
  const label = { day: dayIndex + 1, order: itemIndex + 1 };
  const previous = places[day.items[itemIndex - 1]?.placeId ?? ''];
  const next = places[day.items[itemIndex + 1]?.placeId ?? ''];

  function replace() {
    if (!chosen) return;
    // 알림을 먼저 올린다: 교체 후 이 컴포넌트는 key(place.id)가 바뀌어 새로 그려진다
    onReplaced(t('replacedNotice', { day: dayIndex + 1, from: place.name, to: chosen.place.name }));
    tripActions.replaceItem(dayIndex, itemIndex, chosen.place);
  }

  return (
    <>
      <ForecastBanner place={place} date={day.date} dayNumber={dayIndex + 1} />

      <div className="w-compare">
        <article className="w-card w-place" aria-label={t('original')}>
          <div className="w-card-top"><span className="w-tag">{t('original')}</span><span className="w-meta">{t('dayLabel', label)}</span></div>
          <Typography as="h2" variant="title3" weight="bold">{place.name}</Typography>
          {alternatives.data && (
            <span className={alternatives.data.origin_indoor_hint ? 'w-badge indoor' : 'w-badge'}>
              {alternatives.data.origin_indoor_hint ? <Building2 /> : <Trees />}
              {alternatives.data.origin_indoor_hint ? t('indoor', { hint: alternatives.data.origin_indoor_hint }) : t('maybeOutdoor')}
            </span>
          )}
          {place.description && <p className="w-description">{place.description}</p>}
          <p className="w-address"><MapPin />{place.address || t('noAddress')}</p>
        </article>

        <div className="w-swap" aria-hidden="true"><span>{t('replaceOnly')}</span><ArrowRight /></div>

        <div className="w-alt-column">
          {alternatives.isPending && <div className="w-card w-state" role="status"><Loading /><span className="sr-only">{t('alternativesLoading')}</span></div>}
          {alternatives.isError && <SectionMessage variant="negative" description={`${t('alternativesError')} · ${errorText(alternatives.error, t)}`} />}
          {alternatives.data && !chosen && <p className="w-card w-state w-meta">{t('alternativesEmpty', { km: alternatives.data.radius_km })}</p>}
          {chosen && (
            <article className="w-card w-place chosen" aria-label={t('alternative')}>
              <div className="w-card-top"><span className="w-tag accent">{t('alternative')}</span><span className="w-meta">{t('dayLabel', label)}</span></div>
              <Typography as="h2" variant="title3" weight="bold">{chosen.place.name}</Typography>
              <span className="w-badge indoor"><Building2 />{t('indoorCandidate')}</span>
              {chosen.place.description && <p className="w-description">{chosen.place.description}</p>}
              <p className="w-address"><MapPin />{chosen.place.address || t('noAddress')} · {t('distance', { km: chosen.distance_km })}</p>
              <TextButton size="small" color="primary" leadingContent={<BookOpen />} aria-expanded={docentFor === chosen.place.id}
                onClick={() => setDocentFor(docentFor === chosen.place.id ? null : chosen.place.id)}>
                {t(docentFor === chosen.place.id ? 'docentClose' : 'docentOpen')}
              </TextButton>
            </article>
          )}
          {options.length > 1 && (
            <section aria-labelledby="weather-more-title">
              <Typography id="weather-more-title" as="h3" variant="headline2" weight="bold">{t('moreTitle')}</Typography>
              <ul className="w-more-list">
                {options.filter((option) => option !== chosen).slice(0, 4).map((option) => (
                  <li key={option.place.id}>
                    <button type="button" className="w-more-item" onClick={() => setChosenId(option.place.id)} aria-label={t('chooseAlternative', { name: option.place.name })}>
                      <Landmark />
                      <span><strong>{option.place.name}</strong><small>{t('distance', { km: option.distance_km })}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {alternatives.data && <p className="w-footnote">{t('alternativesNote', { source: alternatives.data.source })}</p>}
        </div>
      </div>

      {chosen && docentFor === chosen.place.id && (
        <section className="w-card w-docent" aria-label={t('docentTitle', { name: chosen.place.name })}>
          <DocentPanel place={chosen.place} />
        </section>
      )}

      {chosen && (
        <section className="w-card w-preview" aria-label={t('previewTitle')}>
          <div className="w-preview-head">
            <CalendarDays />
            <div>
              <Typography as="h2" variant="headline1" weight="bold">{t('previewTitle')}</Typography>
              <Typography variant="label2" color="semantic.foreground.neutral.secondary">{t('previewDetail', label)}</Typography>
            </div>
          </div>
          <ol className="w-timeline">
            {previous && <li className="w-timeline-stop"><small>{t('before')}</small><strong>{previous.name}</strong></li>}
            <li className="w-timeline-stop replaced"><small>{t('replaced')}</small><strong>{chosen.place.name}</strong></li>
            {next && <li className="w-timeline-stop"><small>{t('after')}</small><strong>{next.name}</strong></li>}
          </ol>
          <div className="w-actions">
            <p className="w-info"><Info />{t('previewNote')}</p>
            <Button variant="outlined" color="assistive" onClick={() => navigate(`/schedule?day=${dayIndex + 1}`)}>{t('keep')}</Button>
            <Button variant="solid" color="primary" trailingContent={<ArrowRight />} onClick={replace}>{t('replace')}</Button>
          </div>
        </section>
      )}
    </>
  );
}

function ForecastBanner({ place, date, dayNumber }: { place: Place; date: string; dayNumber: number }) {
  const { t } = useTranslation('weather');
  const forecast = useForecast(place, date);
  const heading = <span className="w-forecast-day">{formatDay(date) ? t('dayTab', { day: dayNumber, date: formatDay(date) }) : t('dayOnly', { day: dayNumber })}</span>;

  if (!formatDay(date)) {
    return <section className="w-card w-forecast" aria-label={t('forecastNoDate')}>{heading}<div><strong>{t('forecastNoDate')}</strong><p>{t('forecastNoDateDetail')}</p></div></section>;
  }
  if (forecast.isPending) {
    return <section className="w-card w-forecast" role="status">{heading}<Loading /><span className="sr-only">{t('forecastLoading')}</span></section>;
  }
  if (forecast.isError) {
    return (
      <section className="w-card w-forecast" role="alert">
        {heading}
        <div><strong>{t('forecastError')}</strong><p>{errorText(forecast.error, t)}</p></div>
        <Button size="small" variant="outlined" color="assistive" onClick={() => forecast.refetch()}>{t('forecastRetry')}</Button>
      </section>
    );
  }
  const data = forecast.data;
  if (data.status === 'out_of_range') {
    return <section className="w-card w-forecast" aria-label={t('forecastUnknown')}>{heading}<div><strong>{t('forecastUnknown')}</strong><p>{t('forecastUnknownDetail')}</p></div></section>;
  }
  const rain = summarizeRain(data.slots);
  return (
    <section className={rain.rainy ? 'w-card w-forecast rainy' : 'w-card w-forecast'} aria-label={rain.rainy ? t('rainTitle') : t('clearTitle')}>
      {heading}
      <div className="w-forecast-main">
        {rain.rainy ? <CloudRain className="w-weather-icon" /> : <CloudSun className="w-weather-icon" />}
        <div>
          <strong>{rain.rainy ? t('rainTitle') : t('clearTitle')}</strong>
          <p>{rain.rainy ? t('rainDetail', rain) : t('clearDetail', { max: rain.max, min: rain.minTemp, maxTemp: rain.maxTemp })}</p>
        </div>
      </div>
      <p className="w-advice">{rain.rainy ? t('rainAdvice') : t('clearAdvice')}</p>
      <ol className="w-hours" aria-label={t('hoursTitle')}>
        {data.slots.map((slot) => (
          <li key={slot.time} className={slot.rain_expected ? 'rain' : undefined} title={slot.condition}>
            <span>{t('hour', { hour: formatHour(slot.time) })}</span>
            {slot.rain_expected ? <CloudRain /> : <CloudSun />}
            <strong>{Math.round(slot.temperature)}°</strong>
            <small>{t('hourRain', { value: slot.rain_probability })}</small>
          </li>
        ))}
      </ol>
      <p className="w-footnote">{t('forecastSource', { time: formatClock(data.fetched_at), threshold: data.rain_threshold })}</p>
    </section>
  );
}

const errorText = (error: Error, t: TFunction<'weather'>) => (error instanceof ApiError ? error.message : t('networkError'));
