import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { Button, Typography } from '@montage-ui/core';
import { MapPin, RefreshCw } from 'lucide-react';
import type { Place } from '../../api/client';
import type { TransportRoute, TransportStep } from '../../api/generated/model';
import { color } from '../../shared/design/tokens';

const foreground = (name: string) => `var(--semantic-foreground-${name})`;
const surface = 'var(--semantic-background-neutral-primary)';
const canvas = 'var(--semantic-background-neutral-secondary)';
const line = 'var(--semantic-line-neutral-primary)';
const brand = 'var(--semantic-foreground-brand-primary)';
const STEP_COLORS: Record<TransportStep['mode'], string> = { walk: color.textMuted, bus: color.primary, subway: color.teal, car: color.navyDeep };

interface KakaoLatLng {}
interface KakaoBounds { extend(point: KakaoLatLng): void }
interface KakaoMapInstance {
  setBounds(bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number): void;
  setCenter(point: KakaoLatLng): void;
  setLevel(level: number): void;
  relayout(): void;
}
interface KakaoMarker { setMap(map: KakaoMapInstance | null): void }
interface KakaoPolyline { setMap(map: KakaoMapInstance | null): void }
interface KakaoLoader {
  load(callback: () => void): void;
}
interface KakaoSdk extends KakaoLoader {
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  Marker: new (options: { position: KakaoLatLng; map: KakaoMapInstance; title: string }) => KakaoMarker;
  Polyline: new (options: {
    map: KakaoMapInstance;
    path: KakaoLatLng[];
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeStyle: string;
  }) => KakaoPolyline;
}

const MapFrame = styled.div`
  position: relative;
  height: clamp(300px, 42vw, 520px);
  overflow: hidden;
  background: ${canvas};
  border: 1px solid ${line};
  border-radius: 12px;

  .map-canvas {
    width: 100%;
    height: 100%;
    isolation: isolate;
  }

  .map-status {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 10px;
    padding: 24px;
    color: ${foreground('neutral-secondary')};
    background: ${canvas};
    text-align: center;
  }

  .map-status p {
    max-width: 420px;
    margin: 0;
    line-height: 1.6;
  }

  .map-retry {
    margin-top: 8px;
  }

  .map-legend {
    position: absolute;
    right: 12px;
    bottom: 36px;
    left: 12px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    color: ${foreground('neutral-primary')};
    background: ${surface};
    border: 1px solid ${line};
    border-radius: 8px;
    font-size: 13px;
    pointer-events: none;
  }

  .map-legend span {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .map-legend .line {
    width: 24px;
    flex: 0 0 24px;
    border-top: 3px dashed ${brand};
  }
`;

let sdkPromise: Promise<KakaoSdk> | null = null;

function isKakaoLoader(value: unknown): value is KakaoLoader {
  if (typeof value !== 'object' || value === null) return false;
  return 'load' in value && typeof value.load === 'function';
}

function isKakaoSdk(value: unknown): value is KakaoSdk {
  return isKakaoLoader(value)
    && 'LatLng' in value
    && typeof value.LatLng === 'function'
    && 'LatLngBounds' in value
    && typeof value.LatLngBounds === 'function'
    && 'Map' in value
    && typeof value.Map === 'function'
    && 'Marker' in value
    && typeof value.Marker === 'function'
    && 'Polyline' in value
    && typeof value.Polyline === 'function';
}

function getKakaoMaps(): unknown {
  const kakao: unknown = Reflect.get(window, 'kakao');
  if (typeof kakao !== 'object' || kakao === null || !('maps' in kakao)) return undefined;
  return kakao.maps;
}

function getKakaoSdk(): KakaoSdk | undefined {
  const maps = getKakaoMaps();
  return isKakaoSdk(maps) ? maps : undefined;
}

function loadSdk(key: string): Promise<KakaoSdk> {
  const availableSdk = getKakaoSdk();
  if (availableSdk) return Promise.resolve(availableSdk);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'transport-kakao-map-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    const fail = (error: Error) => {
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      script.remove();
      reject(error);
    };
    const timeout = window.setTimeout(() => fail(new Error('map-timeout')), 15_000);

    script.onerror = () => fail(new Error('map-load-failed'));
    script.onload = () => {
      // autoload=false exposes maps.load before the map constructors exist.
      const loader = getKakaoMaps();
      if (!isKakaoLoader(loader)) {
        fail(new Error('map-unavailable'));
        return;
      }
      try {
        loader.load(() => {
          const sdk = getKakaoSdk();
          if (!sdk) {
            fail(new Error('map-unavailable'));
            return;
          }
          window.clearTimeout(timeout);
          script.onload = null;
          script.onerror = null;
          resolve(sdk);
        });
      } catch {
        fail(new Error('map-unavailable'));
      }
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    sdkPromise = null;
    throw error;
  });

  return sdkPromise;
}

interface Props {
  apiKey?: string;
  loadingKey: boolean;
  keyError: boolean;
  departure: Place;
  arrival: Place;
  route?: TransportRoute;
  labels: {
    mapLabel: string;
    loading: string;
    missingKey: string;
    missingKeyDescription: string;
    failed: string;
    failedDescription: string;
    retry: string;
    departure: string;
    arrival: string;
    walkLine: string;
    busLine: string;
    subwayLine: string;
    carLine: string;
    markersOnly: string;
  };
  onRetryKey: () => void;
}

type MapStatus = 'loading' | 'ready' | 'error';

export default function RouteMap({
  apiKey,
  loadingKey,
  keyError,
  departure,
  arrival,
  route,
  labels,
  onRetryKey,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<KakaoMapInstance | null>(null);
  const sdk = useRef<KakaoSdk | null>(null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loadingKey || keyError) return;
    if (!apiKey) {
      setStatus('error');
      return;
    }
    if (!container.current) return;

    let active = true;
    setStatus('loading');
    loadSdk(apiKey).then((loadedSdk) => {
      if (!active || !container.current) return;
      try {
        sdk.current = loadedSdk;
        map.current = new loadedSdk.Map(container.current, {
          center: new loadedSdk.LatLng(departure.latitude, departure.longitude),
          level: 7,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }).catch(() => {
      if (active) setStatus('error');
    });

    return () => {
      active = false;
      map.current = null;
      sdk.current = null;
    };
  }, [apiKey, attempt, departure.latitude, departure.longitude, keyError, loadingKey]);

  useLayoutEffect(() => {
    if (status !== 'ready' || !map.current || !sdk.current) return;
    const loadedSdk = sdk.current;
    const origin = new loadedSdk.LatLng(departure.latitude, departure.longitude);
    const destination = new loadedSdk.LatLng(arrival.latitude, arrival.longitude);
    const bounds = new loadedSdk.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    const paths = route?.steps.map((step) => ({
      mode: step.mode,
      points: step.path.map((point) => new loadedSdk.LatLng(point.latitude, point.longitude)),
    })) ?? [];
    paths.forEach((path) => path.points.forEach((point) => bounds.extend(point)));
    map.current.setBounds(bounds, 64, 48, 128, 48);

    const markers = [
      new loadedSdk.Marker({ position: origin, map: map.current, title: departure.name }),
      new loadedSdk.Marker({ position: destination, map: map.current, title: arrival.name }),
    ];
    const lines = paths.filter((path) => path.points.length >= 2).map((path) => new loadedSdk.Polyline({
      map: map.current!,
      path: path.points,
      strokeWeight: 4,
      strokeColor: STEP_COLORS[path.mode],
      strokeOpacity: 0.9,
      strokeStyle: path.mode === 'walk' ? 'shortdash' : 'solid',
    }));

    return () => {
      markers.forEach((marker) => marker.setMap(null));
      lines.forEach((line) => line.setMap(null));
    };
  }, [arrival.latitude, arrival.longitude, arrival.name, departure.latitude, departure.longitude, departure.name, route, status]);

  useEffect(() => {
    if (!container.current || status !== 'ready') return;
    const observer = new ResizeObserver(() => map.current?.relayout());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [status]);

  const missingKey = !loadingKey && !keyError && !apiKey;
  const message = loadingKey
    ? labels.loading
    : keyError
      ? labels.failed
      : missingKey
        ? labels.missingKey
        : status === 'error'
          ? labels.failed
          : status === 'loading'
            ? labels.loading
            : null;

  return (
    <MapFrame>
      <div ref={container} className="map-canvas" role="img" aria-label={labels.mapLabel} />
      {message && (
        <div className="map-status" role={status === 'error' || keyError ? 'alert' : 'status'}>
          <MapPin size={32} aria-hidden="true" />
          <Typography variant="body1" weight="bold">{message}</Typography>
          {(missingKey || keyError || status === 'error') && (
            <Typography as="p" variant="caption1">
              {missingKey ? labels.missingKeyDescription : labels.failedDescription}
            </Typography>
          )}
          {(keyError || (status === 'error' && !missingKey)) && (
            <Button
              type="button"
              className="map-retry"
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => {
                if (keyError) onRetryKey();
                else setAttempt((value) => value + 1);
              }}
              leadingContent={<RefreshCw size={15} aria-hidden="true" />}
            >
              {labels.retry}
            </Button>
          )}
        </div>
      )}
      {status === 'ready' && (
        <div className="map-legend">
          <Typography className="map-legend-item" variant="caption1">
            <MapPin size={15} aria-hidden="true" />{departure.name} → {arrival.name}
          </Typography>
          {route ? (['walk', 'bus', 'subway', 'car'] as const).filter((mode) => route.steps.some((step) => step.mode === mode && step.path.length >= 2)).map((mode) => (
            <Typography key={mode} className="map-legend-item" variant="caption1">
              <i className="line" style={{ borderTopColor: STEP_COLORS[mode], borderTopStyle: mode === 'walk' ? 'dashed' : 'solid' }} />
              {labels[`${mode}Line`]}
            </Typography>
          )) : <Typography variant="caption1">{labels.markersOnly}</Typography>}
        </div>
      )}
    </MapFrame>
  );
}
