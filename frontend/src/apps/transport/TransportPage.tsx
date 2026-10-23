import { useState } from 'react';
import styled from '@emotion/styled';
import { useQuery } from '@tanstack/react-query';
import { Button, Typography } from '@montage-ui/core';
import { ArrowRight, Bus, CalendarDays, Car, ExternalLink, Footprints, MapPin, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getConfig, type Place } from '../../api/client';
import { useTrip } from '../../shared/trip/tripStore';
import RouteMap from './RouteMap';

const foreground = (name: string) => `var(--semantic-foreground-${name})`;
const surface = 'var(--semantic-background-neutral-primary)';
const canvas = 'var(--semantic-background-neutral-secondary)';
const line = 'var(--semantic-line-neutral-primary)';
const brand = 'var(--semantic-foreground-brand-primary)';

const Page = styled.main`
  max-width: 1440px;
  margin: 0 auto;
  padding: 36px 20px;
  color: ${foreground('neutral-primary')};

  .directions-button {
    width: 100%;
    margin-top: 16px;
  }
`;

const Heading = styled.header`
  margin-bottom: 24px;

  p {
    margin: 8px 0 0;
    color: ${foreground('neutral-secondary')};
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
  background: ${surface};
  border: 1px solid ${line};
  border-radius: 999px;

  .day-button {
    min-width: 150px;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    width: 100%;

    .day-button {
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
    color: ${surface};
    background: ${brand};
    border-radius: 999px;
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
  padding: 4px;
  background: ${canvas};
  border: 1px solid ${line};
  border-radius: 999px;

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

interface ScheduledPlace {
  place?: Place;
}

type TravelMode = 'transit' | 'car' | 'walk';

function kakaoDirectionsUrl(departure: Place, arrival: Place) {
  const from = `${encodeURIComponent(departure.name)},${departure.latitude},${departure.longitude}`;
  const to = `${encodeURIComponent(arrival.name)},${arrival.latitude},${arrival.longitude}`;
  return `https://map.kakao.com/link/from/${from}/to/${to}`;
}

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
        <Typography as="h1" variant="title2" weight="bold">{t('title')}</Typography>
        <Typography as="p" variant="body1" color="semantic.foreground.neutral.secondary">{t('subtitle')}</Typography>
      </Heading>

      {days.length > 0 && (
        <DayTabs role="group" aria-label={t('dayTabs')}>
          {days.map((day, index) => (
            <Button
              key={day.date}
              type="button"
              className="day-button"
              size="medium"
              variant={index === activeDayIndex ? 'solid' : 'outlined'}
              color={index === activeDayIndex ? 'primary' : 'assistive'}
              aria-pressed={index === activeDayIndex}
              onClick={() => {
                setSelectedDayIndex(index);
                setSelectedSegmentIndex(0);
              }}
              leadingContent={<CalendarDays size={16} aria-hidden="true" />}
            >
              DAY {index + 1} · {formatDate(day.date)}
            </Button>
          ))}
        </DayTabs>
      )}

      <Content>
        <Panel aria-labelledby="itinerary-heading">
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
                        color={index === selectedSegmentIndex ? 'primary' : 'assistive'}
                        aria-pressed={index === selectedSegmentIndex}
                        onClick={() => setSelectedSegmentIndex(index)}
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

        <Panel aria-labelledby="segment-heading">
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
              <ArrowRight color="var(--semantic-foreground-brand-primary)" aria-hidden="true" />
              <div className="endpoint">
                <span className="endpoint-label"><MapPin size={14} aria-hidden="true" />{t('arrival')}</span>
                <Typography className="endpoint-name" variant="body1" weight="bold">{arrival?.name ?? t('unknownPlace')}</Typography>
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
                  <Button
                    key={mode}
                    type="button"
                    className="mode-button"
                    size="small"
                    variant={travelMode === mode ? 'solid' : 'outlined'}
                    color={travelMode === mode ? 'primary' : 'assistive'}
                    aria-pressed={travelMode === mode}
                    onClick={() => setTravelMode(mode)}
                    leadingContent={<Icon size={18} aria-hidden="true" />}
                  >
                    {t(`mode.${mode}`)}
                  </Button>
                ))}
              </ModeTabs>
              <MapNote>{t(`modeNote.${travelMode}`)}</MapNote>
              <Button
                href={kakaoDirectionsUrl(departure, arrival)}
                as="a"
                className="directions-button"
                target="_blank"
                rel="noopener noreferrer"
                variant="solid"
                color="primary"
                trailingContent={<ExternalLink size={17} aria-hidden="true" />}
              >
                {t('openDirections')}
              </Button>
            </>
          )}
        </Panel>

        <Panel aria-labelledby="map-heading">
          <PanelHeading>
            <Typography id="map-heading" as="h2" variant="headline2" weight="bold">{t('mapTitle')}</Typography>
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
