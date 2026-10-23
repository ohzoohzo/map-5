import { useState } from 'react';
import styled from '@emotion/styled';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bus, CalendarDays, Car, Footprints, MapPin, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getConfig, type Place } from '../../api/client';
import { color, font, layout, radius } from '../../shared/design/tokens';
import { useTrip } from '../../shared/trip/tripStore';
import RouteMap from './RouteMap';

const Page = styled.main`
  max-width: ${layout.maxWidth};
  margin: 0 auto;
  padding: 36px ${layout.gutter};
  color: ${color.text};
  font-family: ${font.family};
`;

const Heading = styled.header`
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: clamp(26px, 3vw, 38px);
    letter-spacing: -1px;
  }

  p {
    margin: 8px 0 0;
    color: ${color.textSub};
    font-size: 17px;
  }
`;

const DayTabs = styled.div`
  display: flex;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 18px;
  padding: 4px;
  overflow-x: auto;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.pill};

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 150px;
    min-height: ${layout.minTouch};
    padding: 8px 18px;
    color: ${color.textSub};
    background: transparent;
    border: 0;
    border-radius: ${radius.pill};
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    white-space: nowrap;
  }

  button[aria-pressed='true'] {
    color: ${color.surface};
    background: ${color.primary};
  }

  @media (max-width: 640px) {
    width: 100%;

    button {
      min-width: 130px;
      flex: 1;
      padding: 8px 12px;
    }
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
  padding: 20px;
  background: ${color.surface};
  border: 1px solid ${color.border};
  border-radius: ${radius.lg};
  box-shadow: 0 4px 16px ${color.primarySoft};
`;

const PanelHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 19px;
  }

  span {
    color: ${color.textMuted};
    font-size: 14px;
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
  border: 1px solid ${color.border};
  border-radius: ${radius.md};

  .number {
    display: grid;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    place-items: center;
    color: ${color.surface};
    background: ${color.primary};
    border-radius: ${radius.pill};
    font-weight: 700;
  }

  .place-name {
    min-width: 0;
    overflow-wrap: anywhere;
    font-weight: 700;
  }
`;

const SegmentRow = styled.div<{ selected: boolean }>`
  margin-left: 16px;

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: ${layout.minTouch};
    padding: 8px 12px;
    color: ${({ selected }) => selected ? color.primary : color.textSub};
    background: ${({ selected }) => selected ? color.primarySoft : color.bg};
    border: 1px solid ${({ selected }) => selected ? color.borderStrong : color.border};
    border-radius: ${radius.md};
    cursor: pointer;
    font: inherit;
    text-align: left;
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
  padding: 26px 16px;
  color: ${color.textMuted};
  background: ${color.bg};
  border-radius: ${radius.md};
  line-height: 1.7;
  text-align: center;
`;

const RouteSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: ${color.bg};
  border: 1px solid ${color.border};
  border-radius: ${radius.md};

  .endpoint {
    min-width: 0;
  }

  .endpoint-label {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    color: ${color.textMuted};
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
    color: ${color.textSub};
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
  padding: 4px;
  background: ${color.bg};
  border: 1px solid ${color.border};
  border-radius: ${radius.pill};

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 0;
    min-height: ${layout.minTouch};
    flex: 1;
    padding: 8px;
    color: ${color.textSub};
    background: transparent;
    border: 0;
    border-radius: ${radius.pill};
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }

  button[aria-pressed='true'] {
    color: ${color.surface};
    background: ${color.primary};
  }
`;

const MapNote = styled.p`
  margin: 10px 0 0;
  color: ${color.textMuted};
  font-size: 13px;
  line-height: 1.6;
`;

interface ScheduledPlace {
  place?: Place;
}

type TravelMode = 'transit' | 'car' | 'walk';

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year!, month! - 1, day!);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(value);
  return `${month}.${day} (${weekday})`;
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
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const activeDayIndex = Math.min(selectedDayIndex, Math.max(0, days.length - 1));
  const selectedDay = days[activeDayIndex];
  const itinerary: ScheduledPlace[] = selectedDay?.items.map((item) => ({
    place: places[item.placeId],
  })) ?? [];
  const selectedSegment = selectedSegmentIndex < itinerary.length - 1
    ? [itinerary[selectedSegmentIndex], itinerary[selectedSegmentIndex + 1]]
    : null;
  const departure = selectedSegment?.[0]?.place;
  const arrival = selectedSegment?.[1]?.place;

  return (
    <Page>
      <Heading>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </Heading>

      {days.length > 0 && (
        <DayTabs role="group" aria-label={t('dayTabs')}>
          {days.map((day, index) => (
            <button
              key={day.date}
              type="button"
              aria-pressed={index === activeDayIndex}
              onClick={() => {
                setSelectedDayIndex(index);
                setSelectedSegmentIndex(0);
              }}
            >
              <CalendarDays size={16} aria-hidden="true" />
              {' '}DAY {index + 1} · {formatDate(day.date)}
            </button>
          ))}
        </DayTabs>
      )}

      <Content>
        <Panel aria-labelledby="itinerary-heading">
          <PanelHeading>
            <h2 id="itinerary-heading">{t('itineraryTitle', { day: activeDayIndex + 1 })}</h2>
            <span>{t('placeCount', { count: itinerary.length })}</span>
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
                      <button
                        type="button"
                        aria-pressed={index === selectedSegmentIndex}
                        onClick={() => setSelectedSegmentIndex(index)}
                      >
                        <span className="segment-label">
                          <Route size={17} aria-hidden="true" />
                          <span>
                            {entry.place?.name ?? t('unknownPlace')}
                            {' → '}
                            {itinerary[index + 1]?.place?.name ?? t('unknownPlace')}
                          </span>
                        </span>
                        <ArrowRight size={17} aria-hidden="true" />
                      </button>
                    </SegmentRow>
                  )}
                </li>
              ))}
            </Itinerary>
          ) : (
            <EmptyState>{t(days.length === 0 ? 'noTrip' : 'noPlaces')}</EmptyState>
          )}
        </Panel>

        <Panel aria-labelledby="segment-heading">
          <PanelHeading>
            <h2 id="segment-heading">{t('selectedSegment')}</h2>
            <span>{selectedSegment ? t('segmentNumber', { number: selectedSegmentIndex + 1 }) : ''}</span>
          </PanelHeading>

          {selectedSegment && departure && arrival ? (
            <RouteSummary>
              <div className="endpoint">
                <span className="endpoint-label"><MapPin size={14} aria-hidden="true" />{t('departure')}</span>
                <span className="endpoint-name">{departure?.name ?? t('unknownPlace')}</span>
                {departure?.address && <span className="address">{departure.address}</span>}
              </div>
              <ArrowRight color={color.primary} aria-hidden="true" />
              <div className="endpoint">
                <span className="endpoint-label"><MapPin size={14} aria-hidden="true" />{t('arrival')}</span>
                <span className="endpoint-name">{arrival?.name ?? t('unknownPlace')}</span>
                {arrival?.address && <span className="address">{arrival.address}</span>}
              </div>
            </RouteSummary>
          ) : (
            <EmptyState>
              {itinerary.length < 2
                ? t('needTwoPlaces')
                : !selectedSegment
                  ? t('selectSegment')
                  : t('missingPlaceData')}
            </EmptyState>
          )}

          {selectedSegment && departure && arrival && (
            <>
              <ModeTabs role="group" aria-label={t('modeTabs')}>
                {([
                  ['transit', Bus],
                  ['car', Car],
                  ['walk', Footprints],
                ] as const).map(([mode, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={travelMode === mode}
                    onClick={() => setTravelMode(mode)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {t(`mode.${mode}`)}
                  </button>
                ))}
              </ModeTabs>
              <MapNote>{t(`modeNote.${travelMode}`)}</MapNote>
            </>
          )}
        </Panel>

        <Panel aria-labelledby="map-heading">
          <PanelHeading>
            <h2 id="map-heading">{t('mapTitle')}</h2>
          </PanelHeading>
          {selectedSegment && departure && arrival ? (
            <>
              <RouteMap
                apiKey={config.data?.js_key}
                loadingKey={config.isLoading}
                keyError={config.isError}
                departure={departure}
                arrival={arrival}
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
                  examplePath: t('examplePath'),
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
    </Page>
  );
}
