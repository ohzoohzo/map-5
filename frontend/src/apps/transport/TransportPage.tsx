import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import styled from '@emotion/styled';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Typography } from '@montage-ui/core';
import { IconArrowLeft, IconArrowRight } from '@montage-ui/icon';
import { ArrowRight, Bus, CalendarDays, Car, ExternalLink, Footprints, MapPin, Route, TrainFront } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getConfig, type Place } from '../../api/client';
import { transportRoutes } from '../../api/generated/transport/transport';
import type { TransportRoute, TransportRoutesParams } from '../../api/generated/model';
import { navigate } from '../../shared/router';
import TripBar from '../../shared/trip/TripBar';
import { useTrip } from '../../shared/trip/tripStore';
import PinDayPage from '../../shared/ui/PinDayPage';
import EmptyStateArt from '../../shared/ui/EmptyStateArt';
import RouteMap from './RouteMap';

const foreground = (name: string) => `var(--semantic-foreground-${name})`;
const surface = 'var(--semantic-background-neutral-primary)';
const canvas = 'var(--semantic-background-neutral-secondary)';
const line = 'var(--semantic-line-neutral-primary)';
const DAY_COLORS = ['#0098b2', '#f37a1f', '#8d4ced', '#e2468b', '#2f9e4f', '#3f6ce0', '#b8860b'];
const dayColor = (index: number) => DAY_COLORS[index % DAY_COLORS.length]!;
const dayStyle = (index: number): CSSProperties & { '--day-color': string } => ({
  '--day-color': dayColor(index),
});

const Page = styled.main`
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 32px 24px;
  color: ${foreground('neutral-primary')};

  @media (max-width: 720px) {
    padding: 16px 16px 24px;
  }

  .directions-button {
    width: 100%;
    margin-top: 16px;
  }
`;

// 여행 계획하기의 단계 바(LNB)와 같은 모양: PinDayPage 의 단계 바 스타일만 빌려 쓴다.
const StepBar = styled(PinDayPage)`
  & { position: sticky; top: 78px; z-index: 30; max-width: none; margin: 0 0 12px; padding: 8px 0; background: ${surface}; }
  .trip-bar-wrap { margin-bottom: 0; }
  @media (max-width: 720px) {
    & { top: 66px; }
  }
  @media (min-width: 721px) and (max-width: 874px) {
    .trip-bar-wrap .trip-counts { width: 100%; margin-left: 0; }
    .trip-bar-wrap .count-chip { flex: 1; justify-content: center; }
  }
`;

// 어디 갈까?·언제 갈까?와 같은 하단 플로팅 바: PinDayPage 의 .candidate-tray 모양을 빌려 쓴다.
const FloatingBar = styled(PinDayPage)`
  & { position: sticky; bottom: 16px; z-index: 20; max-width: none; margin: 24px 0 0; padding: 0; }
  .candidate-tray { position: static; margin-top: 0; }
  .tray-summary { max-width: none; }
  .floating-actions { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
  .floating-actions button { white-space: nowrap; }
  .tray-day { white-space: nowrap; }
  @media (max-width: 720px) {
    & { bottom: 8px; }
    .floating-actions { width: 100%; }
    .floating-actions button { flex: 1; min-width: 0; }
  }
`;

// 여행 계획하기의 .page-head 와 같은 제목·설명 간격
const Heading = styled.header`
  margin-bottom: 20px;

  h1 {
    margin: 0 0 4px;
    color: ${foreground('neutral-strong')};
    letter-spacing: -0.5px;
  }
`;

// 일정 확인 패널 맨 위의 날짜 탭. 패널이 좁아지면 'DAY 1' / '10.26 (월)' 두 줄로 나눈다.
const DayTabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  padding: 0;
  overflow-x: auto;
  background: transparent;
  border: 0;
  border-radius: 0;

  .day-button {
    display: inline-flex;
    flex: 1 0 auto;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 40px;
    padding: 8px 12px;
    border: 0;
    border-radius: 10px;
    background-color: color-mix(in srgb, var(--day-color) 10%, white);
    color: var(--day-color);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }

  .day-button svg {
    flex-shrink: 0;
  }

  .day-date {
    font-weight: 500;
  }

  .day-button[aria-pressed='true'] {
    background-color: var(--day-color);
    color: white;
  }

  @container itinerary (max-width: 460px) {
    .day-button {
      flex-direction: column;
      gap: 2px;
      padding: 8px;
    }

    .day-button svg,
    .day-separator {
      display: none;
    }

    .day-date {
      font-size: 12px;
    }
  }
`;

const DayControls = styled.div`
  .mode-button[aria-pressed='true'],
  .route-option[aria-pressed='true'] {
    border-color: var(--day-color);
    color: white;
    background-color: var(--day-color);
  }

  .directions-button {
    color: white;
    background-color: var(--day-color);
    border-color: var(--day-color);
  }

  .directions-button:hover,
  .mode-button[aria-pressed='true']:hover,
  .route-option[aria-pressed='true']:hover {
    filter: brightness(0.94);
  }
`;

const FastestRouteNotice = styled.div`
  display: grid;
  gap: 4px;
  margin: 12px 0;
  padding: 12px 14px;
  color: ${foreground('neutral-primary')};
  background: ${canvas};
  border: 1px solid ${line};
  border-radius: 8px;

  p {
    margin: 0;
  }

  .fastest-route-value {
    color: var(--day-color);
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 0.85fr) minmax(300px, 0.95fr) minmax(340px, 1.2fr);
  gap: 16px;

  @media (max-width: 1080px) {
    grid-template-columns: minmax(260px, 0.85fr) minmax(300px, 1.15fr);
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  min-width: 0;

  &.itinerary-panel {
    container: itinerary / inline-size;
  }

  /* 고정 머리글(78px)과 단계 바 아래에 패널 머리가 오도록 */
  &.segment-panel {
    scroll-margin-top: 180px;
  }

  padding: 20px;
  background: ${surface};
  border: 1px solid ${line};
  border-radius: 12px;
`;

const PanelHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  .count {
    color: ${foreground('neutral-tertiary')};
  }
`;

const Itinerary = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const PlaceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  padding: 10px 12px;
  border: 1px solid ${line};
  border-radius: 8px;

  .number {
    display: grid;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    place-items: center;
    color: ${foreground('neutral-tertiary')};
    background: ${canvas};
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
  }

  .place-name {
    min-width: 0;
    overflow-wrap: anywhere;
    font-weight: 700;
  }
`;

const SegmentRow = styled.div<{ selected: boolean }>`
  margin-left: 16px;

  .segment-button {
    justify-content: space-between;
    text-align: left;
  }

  .segment-button > span {
    flex: 1;
    min-width: 0;
  }

  .segment-button svg {
    flex-shrink: 0;
  }

  .segment-button[aria-pressed='true'] {
    border-color: var(--day-color);
    color: var(--day-color);
    background-color: color-mix(in srgb, var(--day-color) 10%, white);
  }

  .segment-label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .segment-label span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const EmptyState = styled.div`
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 26px 16px;
  color: ${foreground('neutral-tertiary')};
  background: ${canvas};
  border-radius: 8px;
  line-height: 1.7;
  text-align: center;
`;

const RouteSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: ${canvas};
  border: 1px solid ${line};
  border-radius: 8px;

  .endpoint {
    min-width: 0;
  }

  .endpoint-arrow {
    color: ${foreground('neutral-strong')};
  }

  .endpoint-label {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    color: ${foreground('neutral-tertiary')};
    font-size: 13px;
  }

  .endpoint-name {
    display: block;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  .address {
    display: block;
    margin-top: 6px;
    color: ${foreground('neutral-secondary')};
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 420px) {
    gap: 8px;
    padding: 14px 10px;
  }
`;

const ModeTabs = styled.div`
  display: flex;
  gap: 6px;
  margin: 16px 0 12px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;

  .mode-button {
    flex: 1;
    min-width: 0;
  }
`;

const MapNote = styled.p`
  margin: 10px 0 0;
  color: ${foreground('neutral-tertiary')};
  font-size: 13px;
  line-height: 1.6;
`;

const Guidance = styled.section`
  display: grid;
  gap: 14px;
  margin-top: 16px;
  min-width: 0;

  .route-options { position: relative; display: grid; grid-auto-rows: max-content; gap: 8px; overflow-y: auto; overscroll-behavior: contain; padding: 2px 6px 2px 2px; scrollbar-width: thin; }
  .route-more { margin-top: -8px; }
  .route-option { text-align: left; white-space: normal; }
  .route-option > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .route-option-copy { display: grid; gap: 3px; }
  .route-metrics { display: flex; flex-wrap: wrap; gap: 6px 14px; }
  .route-duration { color: var(--day-color); }
  .route-steps { display: grid; gap: 12px; margin: 0; padding-left: 20px; }
  .route-steps li { padding-left: 4px; min-width: 0; overflow-wrap: anywhere; }
  .step-mode { display: inline-flex; align-items: center; gap: 5px; color: ${foreground('neutral-secondary')}; }
  .step-instruction { display: block; margin: 4px 0; }
  .route-details summary { width: fit-content; color: ${foreground('neutral-primary')}; cursor: pointer; }
  .route-details .route-steps { margin-top: 12px; }
  .route-source { color: ${foreground('neutral-tertiary')}; }
`;

interface ScheduledPlace {
  place?: Place;
}

function kakaoDirectionsUrl(departure: Place, arrival: Place, mode: TravelMode) {
  const from = `${encodeURIComponent(departure.name)},${departure.latitude},${departure.longitude}`;
  const to = `${encodeURIComponent(arrival.name)},${arrival.latitude},${arrival.longitude}`;
  return `https://map.kakao.com/link/by/${mode === 'transit' ? 'traffic' : mode}/${from}/${to}`;
}

function formatDistance(meters: number) {
  return meters >= 1000
    ? `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(meters / 1000)} km`
    : `${new Intl.NumberFormat('ko-KR').format(Math.round(meters))} m`;
}

const STEP_ICONS = { walk: Footprints, bus: Bus, subway: TrainFront, car: Car };
const ROUTE_MODES = ['transit', 'car', 'walk'] as const;
type TravelMode = typeof ROUTE_MODES[number];
// 경로 후보는 한 번에 2개까지만 보이고, 나머지는 목록 안에서 스크롤해 본다.
const VISIBLE_ROUTE_OPTIONS = 2;

/** 경로 선택 목록의 높이를 앞의 2개 후보에 맞춘다 (글이 줄바꿈돼도 정확히 2개가 보이도록 실제 높이를 잰다). */
function useVisibleOptions(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const fit = () => {
      const last = list.children[Math.min(count, list.children.length) - 1] as HTMLElement | undefined;
      list.style.maxHeight = last && list.children.length > count
        ? `${last.offsetTop + last.offsetHeight + parseFloat(getComputedStyle(list).paddingBottom)}px`
        : '';
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(list);
    return () => observer.disconnect();
  });
  return ref;
}

function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year!, month! - 1, day!);
  if (!Number.isFinite(value.getTime())) return null;
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(value);
  return `${month}.${day} (${weekday})`;
}

function formatRouteDistance(meters: number) {
  return (meters / 1000).toFixed(1);
}

export default function TransportPage() {
  const { t } = useTranslation('transport');
  const days = useTrip((trip) => trip.days);
  const places = useTrip((trip) => trip.places);
  const config = useQuery({
    queryKey: ['config'],
    queryFn: ({ signal }) => getConfig(signal),
    staleTime: Infinity,
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const segmentPanel = useRef<HTMLElement>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const activeDayIndex = Math.min(selectedDayIndex, Math.max(0, days.length - 1));
  const activeDayColor = dayColor(activeDayIndex);
  const selectedDay = days[activeDayIndex];
  const itinerary: ScheduledPlace[] = selectedDay?.items.map((item) => ({
    place: places[item.placeId],
  })) ?? [];
  const selectedSegment = selectedSegmentIndex < itinerary.length - 1
    ? [itinerary[selectedSegmentIndex], itinerary[selectedSegmentIndex + 1]]
    : null;
  const segmentCount = days.reduce((total, day) => total + Math.max(day.items.length - 1, 0), 0);
  const departure = selectedSegment?.[0]?.place;
  const arrival = selectedSegment?.[1]?.place;
  const routeParams: TransportRoutesParams | null = departure && arrival ? {
    mode: travelMode,
    start_latitude: departure.latitude,
    start_longitude: departure.longitude,
    end_latitude: arrival.latitude,
    end_longitude: arrival.longitude,
  } : null;
  const routeQueries = useQueries({
    queries: ROUTE_MODES.map((mode) => {
      const params = routeParams ? { ...routeParams, mode } : null;
      return {
        queryKey: ['transport', 'routes', params] as const,
        enabled: params !== null,
        staleTime: 5 * 60_000,
        retry: false,
        queryFn: ({ signal }) => {
          if (params === null) throw new Error('Select an itinerary segment first');
          return transportRoutes(params, { signal });
        },
      };
    }),
  });
  const routes = routeQueries[ROUTE_MODES.indexOf(travelMode)]!;
  const routeSelectionKey = JSON.stringify([selectedDay?.date, selectedSegmentIndex, travelMode, routeParams]);
  const [routeChoice, setRouteChoice] = useState<{ key: string; index: number } | null>(null);
  const alternatives = routes.isSuccess && routes.data.status === 'ok' ? routes.data.routes : [];
  const routeOptions = useVisibleOptions(VISIBLE_ROUTE_OPTIONS);
  const fastestRoute = routeQueries.every((query) => query.isSuccess)
    ? routeQueries.flatMap((query, index) => query.data.status === 'ok'
      ? query.data.routes.map((route) => ({ mode: ROUTE_MODES[index]!, route }))
      : []).sort((a, b) => a.route.duration_seconds - b.route.duration_seconds)[0]
    : undefined;
  const requestedRouteIndex = routeChoice?.key === routeSelectionKey ? routeChoice.index : 0;
  const routeIndex = requestedRouteIndex >= 0 && requestedRouteIndex < alternatives.length ? requestedRouteIndex : 0;
  const activeRoute = alternatives[routeIndex];

  // 구간을 고르면 '선택한 구간' 패널로 옮겨 준다. 패널 머리가 이미 보이면(넓은 화면의 옆 칸) 움직이지 않는다.
  function revealSegmentPanel() {
    requestAnimationFrame(() => {
      const panel = segmentPanel.current;
      if (!panel) return;
      const offset = parseFloat(getComputedStyle(panel).scrollMarginTop) || 0;
      const top = panel.getBoundingClientRect().top;
      if (top >= offset && top <= window.innerHeight * 0.5) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  return (
    <Page style={dayStyle(activeDayIndex)}>
      <Heading>
        <Typography as="h1" variant="title2" weight="bold">{t('title')}</Typography>
        <Typography variant="body1" color="semantic.foreground.neutral.secondary">{t('subtitle')}</Typography>
      </Heading>
      <StepBar><TripBar page="transport" navigationMode="beforeTravel" /></StepBar>

      <Content>
        <Panel className="itinerary-panel" aria-labelledby="itinerary-heading">
          {days.length > 0 && (
            <DayTabs role="group" aria-label={t('dayTabs')}>
              {days.map((day, index) => {
                const date = formatDate(day.date) ?? t('dateUnknown');
                return (
                  <button
                    key={day.date}
                    type="button"
                    className="day-button"
                    aria-pressed={index === activeDayIndex}
                    aria-label={`DAY ${index + 1} · ${date}`}
                    style={dayStyle(index)}
                    onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                    onClick={() => {
                      setSelectedDayIndex(index);
                      setSelectedSegmentIndex(0);
                      setRouteChoice(null);
                    }}
                  >
                    <CalendarDays size={16} aria-hidden="true" />
                    <span>DAY {index + 1}</span>
                    <span className="day-separator" aria-hidden="true">·</span>
                    <span className="day-date">{date}</span>
                  </button>
                );
              })}
            </DayTabs>
          )}
          <PanelHeading>
            <Typography id="itinerary-heading" as="h2" variant="headline2" weight="bold">
              {t('itineraryTitle', { day: activeDayIndex + 1 })}
            </Typography>
            <Typography className="count" variant="caption1">{t('placeCount', { count: itinerary.length })}</Typography>
          </PanelHeading>

          {itinerary.length > 0 ? (
            <Itinerary>
              {itinerary.map((entry, index) => (
                <li key={`${selectedDay?.date}-${index}`}>
                  <PlaceRow>
                    <span className="number">{index + 1}</span>
                    <span className="place-name">{entry.place?.name ?? t('unknownPlace')}</span>
                  </PlaceRow>
                  {index < itinerary.length - 1 && (
                    <SegmentRow selected={index === selectedSegmentIndex}>
                      <Button
                        type="button"
                        className="segment-button"
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="assistive"
                        aria-pressed={index === selectedSegmentIndex}
                        onClick={() => { setSelectedSegmentIndex(index); setRouteChoice(null); revealSegmentPanel(); }}
                        trailingContent={<ArrowRight size={17} aria-hidden="true" />}
                      >
                        <span className="segment-label">
                          <Route size={17} aria-hidden="true" />
                          <span>
                            {entry.place?.name ?? t('unknownPlace')}
                            {' → '}
                            {itinerary[index + 1]?.place?.name ?? t('unknownPlace')}
                          </span>
                        </span>
                      </Button>
                    </SegmentRow>
                  )}
                </li>
              ))}
            </Itinerary>
          ) : (
            <EmptyState>{t(days.length === 0 ? 'noTrip' : 'noPlaces')}</EmptyState>
          )}
        </Panel>

        <Panel ref={segmentPanel} className="segment-panel" aria-labelledby="segment-heading">
          <DayControls>
          <PanelHeading>
            <Typography id="segment-heading" as="h2" variant="headline2" weight="bold">{t('selectedSegment')}</Typography>
            <Typography className="count" variant="caption1">
              {selectedSegment ? t('segmentNumber', { number: selectedSegmentIndex + 1 }) : ''}
            </Typography>
          </PanelHeading>

          {selectedSegment && departure && arrival ? (
            <RouteSummary>
              <div className="endpoint">
                <span className="endpoint-label"><MapPin size={14} aria-hidden="true" />{t('departure')}</span>
                <Typography className="endpoint-name" variant="body1" weight="bold">{departure?.name ?? t('unknownPlace')}</Typography>
                {departure?.address && <span className="address">{departure.address}</span>}
              </div>
              <ArrowRight className="endpoint-arrow" aria-hidden="true" />
              <div className="endpoint">
                <span className="endpoint-label"><MapPin size={14} aria-hidden="true" />{t('arrival')}</span>
                <Typography className="endpoint-name" variant="body1" weight="bold">{arrival?.name ?? t('unknownPlace')}</Typography>
                {arrival?.address && <span className="address">{arrival.address}</span>}
              </div>
            </RouteSummary>
          ) : (
            <EmptyState>
              {itinerary.length < 2 && <EmptyStateArt kind="transport" size={140} />}
              {itinerary.length < 2
                ? t('needTwoPlaces')
                : !selectedSegment
                  ? t('selectSegment')
                  : t('missingPlaceData')}
            </EmptyState>
          )}

          {selectedSegment && departure && arrival && (
            <>
              {fastestRoute && (
                <FastestRouteNotice role="status">
                  <Typography variant="body2" weight="bold">
                    {t('fastestRoutePrefix')}
                    <span className="fastest-route-value">{t('fastestRouteValue', {
                      mode: t(`mode.${fastestRoute.mode}`),
                      minutes: Math.ceil(fastestRoute.route.duration_seconds / 60),
                      distance: formatRouteDistance(fastestRoute.route.distance_m),
                    })}</span>
                    {t('fastestRouteSuffix')}
                  </Typography>
                </FastestRouteNotice>
              )}
              <ModeTabs role="group" aria-label={t('modeTabs')}>
                {([
                  ['transit', Bus],
                  ['car', Car],
                  ['walk', Footprints],
                ] as const).map(([mode, Icon]) => (
                  <Button
                    key={mode}
                    type="button"
                    className="mode-button"
                    size="small"
                    variant={travelMode === mode ? 'solid' : 'outlined'}
                    color={travelMode === mode ? 'primary' : 'assistive'}
                    aria-pressed={travelMode === mode}
                    onClick={() => { setTravelMode(mode); setRouteChoice(null); }}
                    leadingContent={<Icon size={18} aria-hidden="true" />}
                  >
                    {t(`mode.${mode}`)}
                  </Button>
                ))}
              </ModeTabs>
              <MapNote>{t(`modeNote.${travelMode}`)}</MapNote>
              <Guidance aria-label={t('guidanceLabel')}>
                {routes.isPending ? <MapNote role="status">{t('routesLoading')}</MapNote>
                  : routes.isError ? <div role="alert">
                    <Typography as="p" variant="body2">{t('routesError')}</Typography>
                    <Button size="small" variant="outlined" color="assistive" onClick={() => { void routes.refetch(); }}>{t('retryRoutes')}</Button>
                  </div>
                    : !activeRoute ? <MapNote role="status">{t('noRoutes')}</MapNote>
                      : <>
                        <RouteGuidance key={`${routeSelectionKey}-${routeIndex}`} route={activeRoute} collapsible={travelMode !== 'transit'} />
                        <Typography as="p" variant="caption1" className="route-source">{t('routeSource', { source: routes.data?.source })}</Typography>
                        <Typography as="p" variant="caption1" color="semantic.foreground.neutral.secondary">{t('routeCaveat')}</Typography>
                        {/* 경로 선택은 '카카오맵에서 이 구간 길 찾기' 바로 위에 둔다 */}
                        {alternatives.length > 1 && <div ref={routeOptions} className="route-options" role="group" aria-label={t('routeOptions')}>
                          {alternatives.map((option, index) => <Button key={index} className="route-option" fullWidth size="small"
                            variant={index === routeIndex ? 'solid' : 'outlined'} color="assistive"
                            aria-pressed={index === routeIndex} onClick={() => setRouteChoice({ key: routeSelectionKey, index })}>
                            <span className="route-option-copy">
                              <span>{t('routeOption', { number: index + 1, minutes: Math.ceil(option.duration_seconds / 60), distance: formatDistance(option.distance_m) })}</span>
                              <Typography variant="caption1">{t(`routeType.${option.type}`)}</Typography>
                            </span>
                          </Button>)}
                        </div>}
                        {alternatives.length > VISIBLE_ROUTE_OPTIONS && <Typography as="p" variant="caption1" className="route-more" color="semantic.foreground.neutral.secondary">{t('moreRoutes', { count: alternatives.length - VISIBLE_ROUTE_OPTIONS })}</Typography>}
                      </>}
              </Guidance>
              <Button
                href={kakaoDirectionsUrl(departure, arrival, travelMode)}
                as="a"
                className="directions-button"
                target="_blank"
                rel="noopener noreferrer"
                variant="solid"
                color="assistive"
                trailingContent={<ExternalLink size={17} aria-hidden="true" />}
              >
                {t('openDirections')}
              </Button>
            </>
          )}
          </DayControls>
        </Panel>

        <Panel aria-labelledby="map-heading">
          <PanelHeading>
            <Typography id="map-heading" as="h2" variant="headline2" weight="bold">{t('mapTitle')}</Typography>
          </PanelHeading>
          {selectedSegment && departure && arrival ? (
            <>
              <RouteMap
                key={routeSelectionKey}
                apiKey={config.data?.js_key}
                loadingKey={config.isLoading}
                keyError={config.isError}
                routeColor={activeDayColor}
                departureOrder={selectedSegmentIndex + 1}
                arrivalOrder={selectedSegmentIndex + 2}
                departure={departure}
                arrival={arrival}
                route={activeRoute}
                labels={{
                  mapLabel: t('mapTitle'),
                  loading: t('mapLoading'),
                  missingKey: t('mapMissingKey'),
                  missingKeyDescription: t('mapMissingKeyDescription'),
                  failed: t('mapFailed'),
                  failedDescription: t('mapFailedDescription'),
                  retry: t('retry'),
                  departure: t('departure'),
                  arrival: t('arrival'),
                  walkLine: t('walkLine'),
                  busLine: t('busLine'),
                  subwayLine: t('subwayLine'),
                  carLine: t('carLine'),
                  markersOnly: t('markersOnly'),
                }}
                onRetryKey={() => { void config.refetch(); }}
              />
              {config.isError && config.error instanceof Error && (
                <MapNote role="alert">{config.error.message}</MapNote>
              )}
            </>
          ) : (
            <EmptyState>{t('mapNeedsSegment')}</EmptyState>
          )}
        </Panel>
      </Content>

      <FloatingBar>
        <aside className="candidate-tray" aria-labelledby="transport-floating-title">
          <div className="tray-summary">
            <div className="tray-summary-copy">
              <Typography id="transport-floating-title" as="h2" variant="headline2" weight="bold">{t('floatingTitle', { count: segmentCount })}</Typography>
              <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
                {days.map((day, index) => <Fragment key={day.date}>{index > 0 && ' · '}<span className="tray-day">{t('floatingDay', { day: index + 1, count: Math.max(day.items.length - 1, 0) })}</span></Fragment>)}
              </Typography>
            </div>
          </div>
          <div className="floating-actions">
            <Button variant="outlined" color="assistive" size="large" leadingContent={<IconArrowLeft />} onClick={() => navigate('/weather')}>{t('goWeather')}</Button>
            <Button variant="solid" color="primary" size="large" trailingContent={<IconArrowRight />} onClick={() => navigate('/docent')}>{t('goDocent')}</Button>
          </div>
        </aside>
      </FloatingBar>
    </Page>
  );
}

function RouteGuidance({ route, collapsible = false }: { route: TransportRoute; collapsible?: boolean }) {
  const { t } = useTranslation('transport');
  const steps = (
    <ol className="route-steps" aria-label={t('stepsLabel')}>
      {route.steps.map((step, index) => {
        const Icon = STEP_ICONS[step.mode];
        return <li key={index}>
          <Typography className="step-mode" variant="caption1"><Icon size={15} aria-hidden="true" />{t(`stepMode.${step.mode}`)}</Typography>
          <Typography className="step-instruction" variant="body2" weight="bold">{step.instruction}</Typography>
          <Typography variant="caption1" color="semantic.foreground.neutral.secondary">{t('stepMetrics', { minutes: Math.ceil(step.duration_seconds / 60), distance: formatDistance(step.distance_m) })}</Typography>
        </li>;
      })}
    </ol>
  );
  return <>
    <div className="route-metrics">
      <Typography className="route-duration" variant="headline2" weight="bold">{t('duration', { minutes: Math.ceil(route.duration_seconds / 60) })}</Typography>
      <Typography variant="body2">{formatDistance(route.distance_m)}</Typography>
      {route.type !== 'car' && route.transfers !== null && <Typography variant="body2">{t('transfers', { count: route.transfers })}</Typography>}
      {route.type !== 'car' && route.fare_won !== null && <Typography variant="body2">{t('fare', { won: new Intl.NumberFormat('ko-KR').format(route.fare_won) })}</Typography>}
      {route.type === 'car' && typeof route.toll_won === 'number' && <Typography variant="body2">{t('toll', { won: new Intl.NumberFormat('ko-KR').format(route.toll_won) })}</Typography>}
    </div>
    {collapsible
      ? <details className="route-details"><summary>{t('routeDetails')}</summary>{steps}</details>
      : steps}
  </>;
}
