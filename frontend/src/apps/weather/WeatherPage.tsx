import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowRight, CalendarDays, CloudRain, CloudSun, Building2, Info, Landmark, MapPin, Trees } from 'lucide-react';
import { ApiError, type Place } from '../../api/client';
import { Link, navigate, useSearchParam } from '../../shared/router';
import { tripActions, useTrip, type TripDay } from '../../shared/trip/tripStore';
import { Page } from './WeatherPage.styles';
import { formatClock, formatDay, summarizeRain, useAlternatives, useForecast } from './weather';

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
  if (firstFilled < 0) {
    return (
      <Page>
        <Header />
        <section className="w-empty w-card">
          <CalendarDays size={28} />
          <strong>{t('emptyTitle')}</strong>
          <p>{t('emptyDescription')}</p>
          <Link className="w-button w-primary" href="/schedule">{t('goSchedule')}</Link>
        </section>
      </Page>
    );
  }

  const dayIndex = Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= days.length ? dayParam - 1 : firstFilled;
  const day = days[dayIndex]!;
  const itemIndex = Number.isInteger(itemParam) && itemParam >= 0 && itemParam < day.items.length ? itemParam : 0;
  const place = places[day.items[itemIndex]?.placeId ?? ''];

  return (
    <Page>
      <Header />
      {notice && (
        <p className="w-notice" role="status">
          {notice.text} <Link href={`/schedule?day=${notice.day}`}>{t('viewSchedule')}</Link>
        </p>
      )}
      <section className="w-card w-picker" aria-label={t('pickTitle')}>
        <h2>{t('pickTitle')}</h2>
        <div className="w-day-tabs" role="tablist">
          {days.map((each, index) => (
            <button
              key={each.date} role="tab" aria-selected={index === dayIndex}
              className={index === dayIndex ? 'w-day-tab w-active' : 'w-day-tab'}
              onClick={() => { setNotice(null); navigate(`/weather?day=${index + 1}&item=0`); }}
            >
              {t('dayTab', { day: index + 1, date: formatDay(each.date) })}
            </button>
          ))}
        </div>
        {day.items.length === 0 ? <p className="w-muted">{t('dayEmpty')}</p> : (
          <div className="w-stop-chips">
            {day.items.map((item, index) => (
              <button
                key={`${item.placeId}-${index}`} aria-pressed={index === itemIndex}
                className={index === itemIndex ? 'w-chip w-active' : 'w-chip'}
                onClick={() => { setNotice(null); navigate(`/weather?day=${dayIndex + 1}&item=${index}`); }}
              >
                <span className="w-chip-order">{index + 1}</span>{places[item.placeId]?.name ?? item.placeId}
              </button>
            ))}
          </div>
        )}
      </section>
      {place && <Compare key={`${dayIndex}-${itemIndex}-${place.id}`} day={day} dayIndex={dayIndex} itemIndex={itemIndex} place={place} places={places} onReplaced={(text) => setNotice({ text, day: dayIndex + 1 })} />}
    </Page>
  );
}

function Header() {
  const { t } = useTranslation('weather');
  return (
    <header className="w-page-head">
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </header>
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
        <article className="w-card w-place-card" aria-label={t('original')}>
          <div className="w-card-top"><span className="w-tag w-gray">{t('original')}</span><span className="w-muted">{t('dayLabel', label)}</span></div>
          <h2>{place.name}</h2>
          {alternatives.data && (
            <span className={alternatives.data.origin_indoor_hint ? 'w-badge w-teal' : 'w-badge'}>
              {alternatives.data.origin_indoor_hint ? <Building2 size={14} /> : <Trees size={14} />}
              {alternatives.data.origin_indoor_hint ? t('indoor', { hint: alternatives.data.origin_indoor_hint }) : t('maybeOutdoor')}
            </span>
          )}
          {place.description && <p className="w-description">{place.description}</p>}
          <p className="w-address"><MapPin size={14} />{place.address || t('noAddress')}</p>
        </article>

        <div className="w-swap" aria-hidden="true"><span>{t('replaceOnly')}</span><ArrowRight size={20} /></div>

        <div className="w-alt-column">
          {alternatives.isPending && <p className="w-card w-muted w-state">{t('alternativesLoading')}</p>}
          {alternatives.isError && <p className="w-card w-state w-error">{t('alternativesError')} · {errorText(alternatives.error, t)}</p>}
          {alternatives.data && !chosen && <p className="w-card w-muted w-state">{t('alternativesEmpty', { km: alternatives.data.radius_km })}</p>}
          {chosen && (
            <article className="w-card w-place-card w-chosen" aria-label={t('alternative')}>
              <div className="w-card-top"><span className="w-tag w-teal">{t('alternative')}</span><span className="w-muted">{t('dayLabel', label)}</span></div>
              <h2>{chosen.place.name}</h2>
              <span className="w-badge w-teal"><Building2 size={14} />{t('indoorCandidate')}</span>
              {chosen.place.description && <p className="w-description">{chosen.place.description}</p>}
              <p className="w-address"><MapPin size={14} />{chosen.place.address || t('noAddress')} · {t('distance', { km: chosen.distance_km })}</p>
            </article>
          )}
          {options.length > 1 && (
            <section aria-label={t('moreTitle')}>
              <h3 className="w-more-title">{t('moreTitle')}</h3>
              <ul className="w-more-list">
                {options.filter((option) => option !== chosen).slice(0, 4).map((option) => (
                  <li key={option.place.id}>
                    <button className="w-card w-more-item" onClick={() => setChosenId(option.place.id)} aria-label={t('chooseAlternative', { name: option.place.name })}>
                      <Landmark size={18} />
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

      {chosen && (
        <section className="w-card w-preview" aria-label={t('previewTitle')}>
          <div className="w-preview-head">
            <CalendarDays size={22} />
            <div><h2>{t('previewTitle')}</h2><p className="w-muted">{t('previewDetail', label)}</p></div>
          </div>
          <ol className="w-timeline">
            {previous && <li className="w-stop"><small>{t('before')}</small><strong>{previous.name}</strong></li>}
            <li className="w-stop w-replaced"><small>{t('replaced')}</small><strong>{chosen.place.name}</strong></li>
            {next && <li className="w-stop"><small>{t('after')}</small><strong>{next.name}</strong></li>}
          </ol>
          <div className="w-actions">
            <p className="w-info"><Info size={16} />{t('previewNote')}</p>
            <button className="w-button" onClick={() => navigate(`/schedule?day=${dayIndex + 1}`)}>{t('keep')}</button>
            <button className="w-button w-cta" onClick={replace}>{t('replace')}<ArrowRight size={18} /></button>
          </div>
        </section>
      )}
    </>
  );
}

function ForecastBanner({ place, date, dayNumber }: { place: Place; date: string; dayNumber: number }) {
  const { t } = useTranslation('weather');
  const forecast = useForecast(place, date);
  const heading = <span className="w-muted">{t('dayTab', { day: dayNumber, date: formatDay(date) })}</span>;

  if (forecast.isPending) return <section className="w-card w-forecast" aria-live="polite">{heading}<p className="w-muted">{t('forecastLoading')}</p></section>;
  if (forecast.isError) {
    return (
      <section className="w-card w-forecast w-error" role="alert">
        {heading}
        <div><strong>{t('forecastError')}</strong><p className="w-muted">{errorText(forecast.error, t)}</p></div>
        <button className="w-button" onClick={() => forecast.refetch()}>{t('forecastRetry')}</button>
      </section>
    );
  }
  const data = forecast.data;
  if (data.status === 'out_of_range') {
    return <section className="w-card w-forecast" aria-label={t('forecastUnknown')}>{heading}<div><strong>{t('forecastUnknown')}</strong><p className="w-muted">{t('forecastUnknownDetail')}</p></div></section>;
  }
  const rain = summarizeRain(data.slots);
  return (
    <section className={rain.rainy ? 'w-card w-forecast w-rainy' : 'w-card w-forecast'} aria-label={rain.rainy ? t('rainTitle') : t('clearTitle')}>
      {heading}
      <div className="w-forecast-main">
        {rain.rainy ? <CloudRain size={40} /> : <CloudSun size={40} />}
        <div>
          <strong>{rain.rainy ? t('rainTitle') : t('clearTitle')}</strong>
          <p>{rain.rainy ? t('rainDetail', rain) : t('clearDetail', { max: rain.max, min: rain.minTemp, maxTemp: rain.maxTemp })}</p>
        </div>
      </div>
      <p className="w-advice">{rain.rainy ? t('rainAdvice') : t('clearAdvice')}</p>
      <p className="w-footnote">{t('forecastSource', { time: formatClock(data.fetched_at), threshold: data.rain_threshold })}</p>
    </section>
  );
}

const errorText = (error: Error, t: TFunction<'weather'>) => (error instanceof ApiError ? error.message : t('networkError'));
