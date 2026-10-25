import styled from '@emotion/styled';
import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, FallbackView, FallbackViewText, IconButton, SegmentedControl, SegmentedControlItem, Typography } from '@montage-ui/core';
import { IconArrowDown, IconArrowUp, IconClose, IconPlus, IconSearch } from '@montage-ui/icon';
import { useTranslation } from 'react-i18next';
import { getConfig, type Place } from '../../api/client';
import KakaoMap, { type MapPin } from '../../shared/map/KakaoMap';
import { districtOf, formatDay, inDistrict } from '../../shared/regions';
import { navigate, useSearchParam } from '../../shared/router';
import { TRAVEL_TEST_IDS } from '../../shared/testIds';
import TripBar from '../../shared/trip/TripBar';
import { scheduledDayOf, tripActions, unscheduledIds, useTrip } from '../../shared/trip/tripStore';
import PinDayPage from '../../shared/ui/PinDayPage';
import EmptyStateArt from '../../shared/ui/EmptyStateArt';
import PlacePhoto from '../../shared/media/PlacePhoto';
import { color } from '../../shared/design/tokens';
import DocentPanel from '../docent/DocentPanel';

// 하루마다 한 색: DAY 탭, 방문 번호, 지도 핀이 같은 색을 쓴다.
const DAY_COLORS = ['#0098b2', '#f37a1f', '#8d4ced', '#e2468b', '#2f9e4f', '#3f6ce0', '#b8860b'];
const dayColor = (index: number) => DAY_COLORS[index % DAY_COLORS.length]!;
const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

const ScheduleLayout = styled(PinDayPage)`
  .trip-bar-wrap { position: sticky; top: 78px; z-index: 30; padding: 8px 0; margin-bottom: 12px; background: ${color.surface}; }
  .trip-bar-wrap .count-chip.active { background: #0066ff; border-color: #0066ff; color: ${color.surface}; font-weight: 700; }
  .trip-bar-wrap .count-chip.active strong { color: ${color.surface}; }
  .photo-frame img { object-fit: cover; }
  .planner-map .map-popup [data-variant='popup'] .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
  @media (max-width: 1100px) {
    .planner-grid { display: flex; flex-direction: column; gap: 16px; }
    .planner-map { order: -1; position: static; width: 100%; }
    .map-frame { height: 300px; min-height: 300px; }
    .map-legend { display: none; }
    .schedule-panel, .docent-side { width: 100%; }
  }
  @media (max-width: 720px) {
    .trip-bar-wrap { top: 66px; }
    .planner-map .map-popup [data-variant='popup'] .photo-frame { height: 72px; }
    .planner-map .map-popup [data-variant='popup'] .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
  }
`;

/** 장소를 순서대로 이은 직선거리(km). 실제 이동 거리가 아니다. */
export function straightLineDistance(places: Place[]): number {
  let total = 0;
  const radians = (value: number) => value * Math.PI / 180;
  for (let index = 1; index < places.length; index += 1) {
    const a = places[index - 1]!;
    const b = places[index]!;
    const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
      + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
    total += 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }
  return total;
}

// 시안: design/pinday-planner-docent-v3.png
export default function SchedulePage() {
  const { t } = useTranslation('schedule');
  const trip = useTrip((current) => current);
  const dayParam = Number(useSearchParam('day'));
  const [activeDay, setActiveDay] = useState(Number.isInteger(dayParam) && dayParam >= 1 ? dayParam - 1 : 0);
  const [mapMode, setMapMode] = useState('day');
  const [district, setDistrict] = useState('');
  // 선택 장소는 trip.selectedPlaceId 로 공유한다: 오른쪽 도슨트 해설과 /docent 왕복 뒤에도 같은 장소가 열린다.
  const selectedId = useTrip((current) => current.selectedPlaceId);
  const setSelectedId = tripActions.selectPlace;
  const config = useQuery({ queryKey: ['config'], queryFn: ({ signal }) => getConfig(signal), staleTime: Infinity });
  const day = Math.min(activeDay, Math.max(trip.days.length - 1, 0));
  const visits = useMemo(() => (trip.days[day]?.items ?? []).map((item) => trip.places[item.placeId]!), [trip.days, trip.places, day]);
  const unscheduled = useMemo(() => unscheduledIds(trip).map((id) => trip.places[id]!), [trip]);
  const candidates = useMemo(() => trip.candidateIds.map((id) => trip.places[id]!), [trip.candidateIds, trip.places]);
  const distance = straightLineDistance(visits);
  const districts = useMemo(() => [...new Set(candidates.map(districtOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')), [candidates]);
  const dayLabel = (index: number) => trip.days[index]?.date ? formatDay(trip.days[index]!.date) : t('dayN', { day: index + 1 });

  const pins = useMemo<MapPin[]>(() => {
    if (mapMode === 'day') return visits.map((place, index) => ({ place, label: String(index + 1), tone: `day${day % DAY_COLORS.length}` }));
    return candidates.filter((place) => !district || inDistrict(place, district)).map((place) => {
      const scheduled = scheduledDayOf(trip, place.id);
      return { place, label: scheduled === null ? '·' : `D${scheduled + 1}`, tone: scheduled === null ? 'idle' : `day${scheduled % DAY_COLORS.length}` };
    });
  }, [mapMode, visits, day, candidates, trip, district]);
  const selected = selectedId ? trip.places[selectedId] ?? null : null;
  const selectedDay = selected ? scheduledDayOf(trip, selected.id) : null;

  function selectDay(index: number) {
    setActiveDay(index);
    setSelectedId(null);
  }
  function unschedule(placeId: string) {
    const from = scheduledDayOf(trip, placeId);
    if (from !== null) tripActions.removeFromDay(from, trip.days[from]!.items.findIndex((item) => item.placeId === placeId));
  }
  function moveToActiveDay(placeId: string) {
    unschedule(placeId);
    tripActions.addToDay(day, placeId);
  }

  return (
    <ScheduleLayout>
      {trip.destination !== '' && <header className="page-head">
        <div>
          <Typography as="h1" variant="title2" weight="bold">{t('plannerTitle')}</Typography>
          <Typography variant="body1" color="semantic.foreground.neutral.secondary">{t('plannerSubtitle')}</Typography>
        </div>
      </header>}
      <TripBar page="schedule" showStepLabels />
      {trip.destination !== '' && <>
        <div className="planner-grid">
          <section className="schedule-panel" aria-labelledby="schedule-title">
            <Typography id="schedule-title" as="h2" variant="headline1" weight="bold">{t('mySchedule')}</Typography>
            <div className="day-tabs" role="tablist" aria-label={t('mySchedule')}>
              {trip.days.map((tripDay, index) => <button key={index} type="button" role="tab" id={`day-tab-${index}`} aria-selected={day === index} aria-controls="day-panel"
                className={day === index ? 'day-tab active' : 'day-tab'} style={{ '--day-color': dayColor(index) } as CSSProperties} onClick={() => selectDay(index)}>
                <strong>DAY {index + 1}</strong><span>{tripDay.date ? dayLabel(index) : t('placesInDay', { count: tripDay.items.length })}</span>
              </button>)}
            </div>

            <div id="day-panel" role="tabpanel" aria-labelledby={`day-tab-${day}`} className="day-panel">
              <div className="day-panel-head">
                <Typography variant="headline2" weight="bold">{dayLabel(day)}</Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">{t('visitOrder')} · {t('straightDistance')} <span data-testid={TRAVEL_TEST_IDS.STRAIGHT_DISTANCE}>{number.format(distance)}</span>km</Typography>
              </div>
              <ol className="visit-list" data-testid={TRAVEL_TEST_IDS.ITINERARY_LIST}>
                {visits.map((place, index) => <li key={place.id} className={place.id === selectedId ? 'visit selected' : 'visit'}>
                  <span className="visit-number" style={{ background: dayColor(day) }}>{index + 1}</span>
                  <button type="button" className="visit-name" onClick={() => setSelectedId(place.id)}><PlacePhoto place={place} variant="thumbnail"><span className="visit-copy"><strong>{place.name}</strong><span>{[place.category, districtOf(place)].filter(Boolean).join(' · ')}</span></span></PlacePhoto></button>
                  <span className="visit-actions">
                    <IconButton size="small" disabled={index === 0} onClick={() => tripActions.moveItem(day, index, index - 1)} aria-label={t('moveUp', { name: place.name })}><IconArrowUp /></IconButton>
                    <IconButton size="small" disabled={index === visits.length - 1} onClick={() => tripActions.moveItem(day, index, index + 1)} aria-label={t('moveDown', { name: place.name })}><IconArrowDown /></IconButton>
                    <IconButton size="small" onClick={() => tripActions.removeFromDay(day, index)} aria-label={t('unschedule', { name: place.name })}><IconClose /></IconButton>
                  </span>
                </li>)}
              </ol>
              {!visits.length && <div className="day-empty">
                <EmptyStateArt kind="itinerary" size={140} />
                <Typography as="p" variant="label2" color="semantic.foreground.neutral.tertiary">{t(unscheduled.length ? 'dayEmpty' : 'dayEmptyNoCandidates')}</Typography>
              </div>}
            </div>

            <section className="unscheduled" aria-labelledby="unscheduled-title">
              <Typography id="unscheduled-title" as="h3" variant="headline2" weight="bold">{t('candidateBox')} <span className="muted">· {t('unscheduledCount', { count: unscheduled.length })}</span></Typography>
              {candidates.length === 0
                ? <FallbackView padding="compact"><FallbackViewText title={t('noCandidates')} description={t('noCandidatesDetail')} /><Button size="small" variant="solid" leadingContent={<IconSearch />} onClick={() => navigate('/explore')}>{t('goExplore')}</Button></FallbackView>
                : <ul className="unscheduled-list" data-testid={TRAVEL_TEST_IDS.UNSCHEDULED_LIST}>
                  {unscheduled.map((place) => <li key={place.id}>
                    <button type="button" className="visit-name" onClick={() => setSelectedId(place.id)}><PlacePhoto place={place} variant="thumbnail"><span className="visit-copy"><strong>{place.name}</strong><span>{[place.category, districtOf(place)].filter(Boolean).join(' · ')}</span></span></PlacePhoto></button>
                    <Button size="small" variant="outlined" color="primary" leadingContent={<IconPlus />} onClick={() => tripActions.addToDay(day, place.id)}><span className="sr-only">{place.name} DAY {day + 1}에 추가 · </span>{t('scheduleHere')}</Button>
                  </li>)}
                  {!unscheduled.length && <li className="all-placed">{t('allPlaced')}</li>}
                </ul>}
            </section>
          </section>

          <div className="planner-map">
            <KakaoMap jsKey={config.data?.js_key} configLoading={config.isLoading} pins={pins} route={mapMode === 'day' ? visits : []} routeColor={dayColor(day)} selectedId={selectedId} onSelect={setSelectedId}
              fitKey={`${mapMode}-${day}-${district}-${pins.length}`} title={t('plannerMapTitle')}
              toolbar={<>
                <SegmentedControl value={mapMode} onValueChange={(value) => { setMapMode(value); setSelectedId(null); }} size="small" name="schedule-map">
                  <SegmentedControlItem value="day">{t('mapByDay')}</SegmentedControlItem>
                  <SegmentedControlItem value="district">{t('mapByDistrict')}</SegmentedControlItem>
                </SegmentedControl>
                {mapMode === 'district' && <div className="district-chips" role="group" aria-label={t('districtLabel')}>
                  {['', ...districts].map((name) => <button key={name || 'all'} type="button" aria-pressed={district === name} className={district === name ? 'chip active' : 'chip'} onClick={() => setDistrict(name)}>{name || t('allDistricts')}</button>)}
                </div>}
              </>}
              legend={mapMode === 'day' ? t('legendRoute') : <>{trip.days.map((_, index) => <span key={index} className="legend-day"><span className="legend-dot" style={{ background: dayColor(index) }} />DAY {index + 1}</span>)}<span className="legend-day"><span className="legend-dot" />{t('legendUnscheduled')}</span></>}>
              {selected && <article className="map-popup" aria-label={selected.name}>
                <button type="button" className="popup-close" onClick={() => setSelectedId(null)} aria-label={t('closeDetails')}><IconClose /></button>
                <PlacePhoto place={selected} variant="popup" />
                <Typography as="h3" variant="headline2" weight="bold">{selected.name}</Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">{selectedDay === null ? t('notScheduled') : `DAY ${selectedDay + 1} · ${dayLabel(selectedDay)}`}</Typography>
                <Typography variant="label2" color="semantic.foreground.neutral.secondary" className="popup-text">{selected.address || t('noAddress')}</Typography>
                <div className="popup-actions">
                  {selectedDay === day
                    ? <Button size="small" variant="outlined" color="assistive" onClick={() => unschedule(selected.id)}>{t('unscheduleShort')}</Button>
                    : <Button size="small" variant="solid" color="primary" leadingContent={<IconPlus />} onClick={() => moveToActiveDay(selected.id)}>{t(selectedDay === null ? 'scheduleOnDay' : 'moveToDay', { day: day + 1 })}</Button>}
                </div>
              </article>}
            </KakaoMap>
            {mapMode === 'day' && visits.length > 0 && !config.data?.js_key && !config.isLoading && <ol className="route-fallback" aria-label={t('visitOrder')}>{visits.map((place, index) => <li key={place.id}><span style={{ background: dayColor(day) }}>{index + 1}</span>{place.name}</li>)}</ol>}
          </div>

          <aside className="docent-side"><DocentPanel place={selected} /></aside>
        </div>
      </>}
    </ScheduleLayout>
  );
}
