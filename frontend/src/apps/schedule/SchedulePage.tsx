import styled from '@emotion/styled';
import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, FallbackView, FallbackViewText, IconButton, SectionMessage, SegmentedControl, SegmentedControlItem, Typography } from '@montage-ui/core';
import { IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp, IconClose, IconPlus, IconSearch } from '@montage-ui/icon';
import { ArrowDownUp, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getConfig, type Place } from '../../api/client';
import KakaoMap, { type MapPin } from '../../shared/map/KakaoMap';
import { districtOf, formatDay, inDistrict } from '../../shared/regions';
import { navigate, useSearchParam } from '../../shared/router';
import { TRAVEL_TEST_IDS } from '../../shared/testIds';
import TripBar from '../../shared/trip/TripBar';
import { scheduledCount, scheduledDayOf, tripActions, unscheduledIds, useTrip } from '../../shared/trip/tripStore';
import PinDayPage from '../../shared/ui/PinDayPage';
import EmptyStateArt from '../../shared/ui/EmptyStateArt';
import PlacePhoto from '../../shared/media/PlacePhoto';
import { color } from '../../shared/design/tokens';
import DocentPanel from '../docent/DocentPanel';
import { useReplacedDays } from '../weather/weather';

// 하루마다 한 색: DAY 탭, 방문 번호, 지도 핀이 같은 색을 쓴다.
const DAY_COLORS = ['#0098b2', '#f37a1f', '#8d4ced', '#e2468b', '#2f9e4f', '#3f6ce0', '#b8860b'];
const dayColor = (index: number) => DAY_COLORS[index % DAY_COLORS.length]!;
const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

const ScheduleLayout = styled(PinDayPage)`
  .trip-bar-wrap { position: sticky; top: 78px; z-index: 30; padding: 8px 0; margin-bottom: 12px; background: ${color.surface}; }
  .photo-frame img { object-fit: cover; }
  .planner-map .map-popup [data-variant='popup'] .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
  .planner-map .map-frame { height: clamp(200px, calc(100dvh - 480px), 560px); min-height: 0; }
  .planner-grid { grid-template-columns: minmax(320px, 1fr) minmax(400px, 1.2fr) minmax(300px, 1fr); }
  @media (min-width: 1281px) {
    .planner-grid { grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.2fr) minmax(340px, 1fr); }
  }
  @media (max-width: 1280px) and (min-width: 1101px) {
    .planner-grid { grid-template-columns: minmax(300px, 1fr) minmax(380px, 1.2fr) minmax(280px, 1fr); }
    .planner-grid > .docent-side { grid-column: auto; }
  }
  .schedule-map-heading { margin: 0; }
  .popup-day-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
  .popup-day-action { min-height: 36px; border: 1px solid var(--day-color); border-radius: 8px; padding: 6px 8px; color: var(--day-color); font-size: 12px; font-weight: 700; }
  .popup-day-action:hover:not(:disabled), .popup-day-action[aria-pressed='true'] { background: var(--day-color); color: ${color.surface}; }
  .popup-day-action:disabled { cursor: default; opacity: .78; }
  .map-popup { max-height: calc(100% - 32px); overflow-y: auto; }
  /* 날씨 변경 알림: 주의 아이콘을 글자 줄 가운데에 맞추고, '동선 체크 완료'는 바뀐 DAY 색 버튼 */
  .weather-change-notice svg[aria-label='cautionary'] { display: block; margin-top: 4px; }
  .weather-change-notice .route-checked { background: var(--notice-day-color); border-color: var(--notice-day-color); color: #fff; white-space: nowrap; }
  .weather-change-notice .route-checked:hover { background: color-mix(in srgb, var(--notice-day-color) 88%, black); }
  .day-tools { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; margin-top: -6px; }
  .day-tool { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--semantic-line-neutral-primary, #e1e2e4);
    background: var(--semantic-background-neutral-primary, #fff); font-size: 13px; font-weight: 500; color: var(--semantic-foreground-neutral-strong); transition: background .15s; }
  .day-tool svg { width: 14px; height: 14px; }
  .day-tool:hover:not(:disabled) { background: var(--semantic-background-neutral-secondary, #f7f7f8); }
  .day-tool:disabled { cursor: default; opacity: .4; }
  .day-tabs.neutral .day-tab { background: var(--semantic-background-neutral-secondary, #f7f7f8); color: var(--semantic-foreground-neutral-secondary); }
  .day-tabs.neutral .day-tab:hover { background: var(--semantic-fill-neutral-primary, #eeeef0); }
  .unscheduled-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
  /* 지역 이야기(DocentPanel): 탭 선택은 검정, '지금 보고 있는 곳'은 그 장소가 놓인 DAY 색(미배치는 회색) */
  .docent-side .tabs button[aria-selected='true'] { color: var(--semantic-foreground-neutral-strong); border-bottom-color: var(--semantic-foreground-neutral-strong); }
  .schedule-tray .tray-summary { max-width: none; }
  .schedule-tray-actions { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
  .schedule-tray-actions button { white-space: nowrap; }
  @media (min-width: 721px) and (max-width: 874px) {
    .trip-bar-wrap .trip-counts { width: 100%; margin-left: 0; }
    .trip-bar-wrap .count-chip { flex: 1; justify-content: center; }
  }
  @media (max-width: 1100px) {
    .planner-grid { display: flex; flex-direction: column; gap: 16px; }
    .planner-map { position: static; width: 100%; }
    .planner-map { order: 0; }
    .schedule-panel { order: 1; }
    .docent-side { order: 2; }
    .planner-map .map-frame { height: 300px; min-height: 300px; }
    .map-legend { display: none; }
    .schedule-panel, .docent-side { width: 100%; }
  }
  @media (max-width: 720px) {
    .trip-bar-wrap { top: 66px; }
    .schedule-tray-actions { width: 100%; } .schedule-tray-actions button { flex: 1; min-width: 0; }
    .planner-map .map-popup [data-variant='popup'] .photo-frame { height: 72px; }
    .planner-map .map-popup [data-variant='popup'] .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
  }
  @media (max-height: 900px) {
    .planner-map .map-popup [data-variant='popup'] .photo-frame { height: 56px; }
  }
  @media (max-height: 700px) {
    .planner-map .map-popup [data-variant='popup'] .photo-frame { height: 36px; }
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
// 날씨 변경 알림에서 '동선 체크 완료'를 누른 때의 변경 목록
const ROUTE_CHECKED_KEY = 'pinday.schedule.routeChecked.v1';
function readRouteChecked() {
  try { return localStorage.getItem(ROUTE_CHECKED_KEY) ?? ''; } catch { return ''; }
}

export default function SchedulePage() {
  const { t } = useTranslation('schedule');
  const trip = useTrip((current) => current);
  const dayParam = Number(useSearchParam('day'));
  const [activeDay, setActiveDay] = useState(Number.isInteger(dayParam) && dayParam >= 1 ? dayParam - 1 : 0);
  const [mapMode, setMapMode] = useState<'district' | 'day'>('district');
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
  // 지도별 확인에서는 아직 날짜를 고르지 않은 상태: DAY 탭·방문 번호를 회색으로 둔다.
  const dayChosen = mapMode === 'day';
  const dayLabel = (index: number) => trip.days[index]?.date ? formatDay(trip.days[index]!.date) : t('dayN', { day: index + 1 });

  const pins = useMemo<MapPin[]>(() => {
    if (mapMode === 'day') return visits.map((place, index) => ({ place, label: String(index + 1), tone: `day${day % DAY_COLORS.length}` }));
    return candidates.filter((place) => !district || inDistrict(place, district)).map((place) => {
      const scheduled = scheduledDayOf(trip, place.id);
      return { place, label: scheduled === null ? '·' : `D${scheduled + 1}`, tone: scheduled === null ? 'idle' : `day${scheduled % DAY_COLORS.length}` };
    });
  }, [mapMode, visits, day, candidates, trip, district]);
  const selected = selectedId ? trip.places[selectedId] ?? null : null;
  // 3. 날씨 체크에서 바꾼 일정이 남아 있으면 나의 일정 위에 동선 재확인 알림을 띄운다
  const weatherChanges = useReplacedDays(trip.days);
  // 'DAY 2 2번, 3번 · DAY 3 1번'
  const changedWhere = trip.days.map((tripDay, dayIndex) => {
    const orders = tripDay.items.flatMap((item, index) => (weatherChanges.entryFor(dayIndex, item.placeId) ? [t('weatherChangedOrder', { order: index + 1 })] : []));
    // 'DAY 2 2번'이 중간에서 줄바꿈되지 않도록 붙인다
    return orders.length ? t('weatherChangedDay', { day: dayIndex + 1, orders: orders.join(', ') }).replace(/ /g, String.fromCharCode(160)) : '';
  }).filter(Boolean).join(' · ');
  // '동선 체크 완료'를 누르면 그때의 변경 목록을 기억해 숨긴다. 날씨 체크에서 또 바꾸면 다시 띄운다.
  const firstChangedDay = trip.days.findIndex((tripDay, dayIndex) => tripDay.items.some((item) => weatherChanges.entryFor(dayIndex, item.placeId)));
  const changeKey = trip.days.flatMap((tripDay, dayIndex) => tripDay.items.filter((item) => weatherChanges.entryFor(dayIndex, item.placeId)).map((item) => `${dayIndex}:${item.placeId}`)).join(',');
  const [checkedKey, setCheckedKey] = useState(readRouteChecked);
  function completeRouteCheck() {
    setCheckedKey(changeKey);
    try { localStorage.setItem(ROUTE_CHECKED_KEY, changeKey); } catch { /* 저장이 막혀도 이번 방문 동안은 숨긴다 */ }
  }
  const selectedDay = selected ? scheduledDayOf(trip, selected.id) : null;

  function selectOnMap(placeId: string | null, source: 'district' | 'day') {
    setMapMode(source);
    setSelectedId(placeId);
  }
  function selectDay(index: number) {
    setActiveDay(index);
    selectOnMap(null, 'day');
  }
  function unschedule(placeId: string) {
    const from = scheduledDayOf(trip, placeId);
    if (from !== null) tripActions.removeFromDay(from, trip.days[from]!.items.findIndex((item) => item.placeId === placeId));
  }
  function addToDay(placeId: string, targetDay: number) {
    if (scheduledDayOf(trip, placeId) === targetDay) return;
    unschedule(placeId);
    tripActions.addToDay(targetDay, placeId);
  }
  function reverseDay(dayIndex: number) {
    const count = trip.days[dayIndex]?.items.length ?? 0;
    for (let index = 0; index < count - 1; index += 1) tripActions.moveItem(dayIndex, count - 1, index);
  }
  function clearDay(dayIndex: number) {
    for (let index = (trip.days[dayIndex]?.items.length ?? 0) - 1; index >= 0; index -= 1) tripActions.removeFromDay(dayIndex, index);
    setSelectedId(null);
  }
  function renderMapPopup() {
    if (!selected) return null;
    return <article className="map-popup" aria-label={selected.name}>
      <button type="button" className="popup-close" onClick={() => setSelectedId(null)} aria-label={t('closeDetails')}><IconClose /></button>
      <PlacePhoto place={selected} variant="popup" />
      <Typography as="h3" variant="headline2" weight="bold">{selected.name}</Typography>
      <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">{selectedDay === null ? t('notScheduled') : `DAY ${selectedDay + 1} · ${dayLabel(selectedDay)}`}</Typography>
      <Typography variant="label2" color="semantic.foreground.neutral.secondary" className="popup-text">{selected.address || t('noAddress')}</Typography>
      <div className="popup-actions">
        {selectedDay !== null && <Button size="small" variant="outlined" color="assistive" onClick={() => unschedule(selected.id)}>{t('unscheduleShort')}</Button>}
      </div>
      <div className="popup-day-actions">
        {trip.days.map((_, index) => <button key={index} type="button" className="popup-day-action" style={{ '--day-color': dayColor(index) } as CSSProperties}
          aria-pressed={selectedDay === index} disabled={selectedDay === index} onClick={() => addToDay(selected.id, index)}>
          {t('scheduleOnDay', { day: index + 1 })}
        </button>)}
      </div>
    </article>;
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
          <div className="planner-map">
            <KakaoMap jsKey={config.data?.js_key} configLoading={config.isLoading} pins={pins} route={mapMode === 'day' ? visits : []}
              routeColor={dayColor(day)} selectedId={selectedId} onSelect={setSelectedId}
              fitKey={`${mapMode}-${day}-${district}-${pins.length}`} title={t('plannerMapTitle')}
              toolbar={<>
                <SegmentedControl value={mapMode} onValueChange={(value) => {
                  if (value === 'district' || value === 'day') {
                    setMapMode(value);
                    setSelectedId(null);
                  }
                }} size="small" name="schedule-map">
                  <SegmentedControlItem value="district">{t('mapByDistrict')}</SegmentedControlItem>
                  <SegmentedControlItem value="day">{t('mapByDay')}</SegmentedControlItem>
                </SegmentedControl>
                {mapMode === 'district' && <div className="district-chips" role="group" aria-label={t('districtLabel')}>
                  {['', ...districts].map((name) => <button key={name || 'all'} type="button" aria-pressed={district === name} className={district === name ? 'chip active' : 'chip'} onClick={() => setDistrict(name)}>{name || t('allDistricts')}</button>)}
                </div>}
              </>}
              legend={mapMode === 'day' ? t('legendRoute') : <>{trip.days.map((_, index) => <span key={index} className="legend-day"><span className="legend-dot" style={{ background: dayColor(index) }} />DAY {index + 1}</span>)}<span className="legend-day"><span className="legend-dot" />{t('legendUnscheduled')}</span></>}>
              {renderMapPopup()}
            </KakaoMap>
            {mapMode === 'day' && visits.length > 0 && !config.data?.js_key && !config.isLoading && <ol className="route-fallback" aria-label={t('visitOrder')}>{visits.map((place, index) => <li key={place.id}><span style={{ background: dayColor(day) }}>{index + 1}</span>{place.name}</li>)}</ol>}
          </div>

          <section className="schedule-panel" aria-labelledby="schedule-title">
            <Typography id="schedule-title" as="h2" variant="headline1" weight="bold">{t('mySchedule')}</Typography>
            {changeKey !== '' && changeKey !== checkedKey && <div className="weather-change-notice" role="status" style={{ '--notice-day-color': dayColor(Math.max(firstChangedDay, 0)) } as CSSProperties}>
              <SectionMessage variant="cautionary" description={t('weatherChanged', { where: changedWhere })}
                trailingButton={<Button className="route-checked" size="small" variant="solid" onClick={completeRouteCheck}>{t('routeChecked')}</Button>} />
            </div>}
            <div className={dayChosen ? 'day-tabs' : 'day-tabs neutral'} role="tablist" aria-label={t('mySchedule')}>
              {trip.days.map((tripDay, index) => <button key={index} type="button" role="tab" id={`day-tab-${index}`} aria-selected={day === index} aria-controls="day-panel"
                className={dayChosen && day === index ? 'day-tab active' : 'day-tab'} style={{ '--day-color': dayColor(index) } as CSSProperties} onClick={() => selectDay(index)}>
                <strong>DAY {index + 1}</strong><span>{tripDay.date ? dayLabel(index) : t('placesInDay', { count: tripDay.items.length })}</span>
              </button>)}
            </div>
            <div className="day-tools" role="group" aria-label={t('dayTools', { day: day + 1 })}>
              <button type="button" className="day-tool" disabled={visits.length < 2} onClick={() => reverseDay(day)}><ArrowDownUp aria-hidden="true" />{t('reverseDay')}</button>
              <button type="button" className="day-tool" disabled={!visits.length} onClick={() => clearDay(day)}><Trash2 aria-hidden="true" />{t('clearDay')}</button>
            </div>

            <div id="day-panel" role="tabpanel" aria-labelledby={`day-tab-${day}`} className="day-panel">
              <div className="day-panel-head">
                <Typography variant="headline2" weight="bold">{dayLabel(day)}</Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">{t('visitOrder')} · {t('straightDistance')} <span data-testid={TRAVEL_TEST_IDS.STRAIGHT_DISTANCE}>{number.format(distance)}</span>km</Typography>
              </div>
              <ol className="visit-list" data-testid={TRAVEL_TEST_IDS.ITINERARY_LIST}>
                {visits.map((place, index) => <li key={place.id} className={place.id === selectedId ? 'visit selected' : 'visit'}>
                  <span className="visit-number" style={{ background: dayChosen ? dayColor(day) : 'var(--semantic-foreground-neutral-assistive, #aeb0b6)' }}>{index + 1}</span>
                  <button type="button" className="visit-name" onClick={() => selectOnMap(place.id, 'day')}><PlacePhoto place={place} variant="thumbnail"><span className="visit-copy"><strong>{place.name}</strong><span>{[place.category, districtOf(place)].filter(Boolean).join(' · ')}</span></span></PlacePhoto></button>
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
                    <button type="button" className="visit-name" onClick={() => selectOnMap(place.id, 'district')}><PlacePhoto place={place} variant="thumbnail"><span className="visit-copy"><strong>{place.name}</strong><span>{[place.category, districtOf(place)].filter(Boolean).join(' · ')}</span></span></PlacePhoto></button>
                    <span className="unscheduled-actions">
                      <Button size="small" variant="outlined" color="assistive" leadingContent={<IconPlus />} onClick={() => tripActions.addToDay(day, place.id)}><span className="sr-only">{place.name} DAY {day + 1}에 추가 · </span>{t('scheduleHere')}</Button>
                      <IconButton size="small" onClick={() => { if (selectedId === place.id) setSelectedId(null); tripActions.removeCandidate(place.id); }} aria-label={t('removeCandidate', { name: place.name })}><IconClose /></IconButton>
                    </span>
                  </li>)}
                  {!unscheduled.length && <li className="all-placed">{t('allPlaced')}</li>}
                </ul>}
            </section>
          </section>

          <aside className="docent-side">
            <DocentPanel place={selected} />
          </aside>
        </div>
      </>}

      <aside className="candidate-tray schedule-tray" aria-labelledby="schedule-tray-title">
        <div className="tray-summary">
          <div className="tray-summary-copy">
            <Typography id="schedule-tray-title" as="h2" variant="headline2" weight="bold">{t('trayTitle', { count: scheduledCount(trip) })}</Typography>
            <Typography variant="caption1" color="semantic.foreground.neutral.secondary">{!candidates.length ? t('trayEmpty') : unscheduled.length ? t('trayUnscheduled', { total: candidates.length, count: unscheduled.length }) : t('allPlaced')}</Typography>
          </div>
        </div>
        <div className="schedule-tray-actions">
          <Button variant="outlined" color="assistive" size="large" leadingContent={<IconArrowLeft />} onClick={() => navigate('/explore')}>{t('backToExplore')}</Button>
          <Button variant="solid" color="primary" size="large" trailingContent={<IconArrowRight />} disabled={!scheduledCount(trip)} onClick={() => navigate('/weather')}>{t('goBeforeTravel')}</Button>
        </div>
      </aside>
    </ScheduleLayout>
  );
}
