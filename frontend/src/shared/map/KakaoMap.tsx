import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Typography } from '@montage-ui/core';
import { IconLocation, IconRefresh } from '@montage-ui/icon';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../api/client';
import { TRAVEL_TEST_IDS } from '../testIds';

interface KakaoLatLng {}
interface KakaoBounds { extend(point: KakaoLatLng): void }
interface KakaoMapInstance { setBounds(bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number): void; setCenter(point: KakaoLatLng): void; panTo(point: KakaoLatLng): void; setLevel(level: number): void; getLevel(): number; relayout(): void }
interface KakaoLayer { setMap(map: KakaoMapInstance | null): void }
interface KakaoSdk {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  CustomOverlay: new (options: { position: KakaoLatLng; content: HTMLElement; map: KakaoMapInstance; yAnchor: number; zIndex: number; clickable: boolean }) => KakaoLayer;
  Polyline: new (options: { map: KakaoMapInstance; path: KakaoLatLng[]; strokeWeight: number; strokeColor: string; strokeOpacity: number; strokeStyle: string }) => KakaoLayer;
}
declare global { interface Window { kakao?: { maps: KakaoSdk } } }
let sdkPromise: Promise<KakaoSdk> | null = null;
let sdkKey = '';

function loadSdk(key: string): Promise<KakaoSdk> {
  if (sdkPromise && sdkKey === key) return sdkPromise;
  sdkKey = key;
  sdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    document.getElementById('kakao-map-sdk')?.remove();
    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error('map-timeout')); }, 15_000);
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error('map-load-failed')); };
    script.onload = () => {
      const sdk = window.kakao?.maps;
      if (!sdk) { window.clearTimeout(timeout); reject(new Error('map-unavailable')); return; }
      try { sdk.load(() => { window.clearTimeout(timeout); resolve(sdk); }); }
      catch { window.clearTimeout(timeout); reject(new Error('map-unavailable')); }
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => { sdkPromise = null; throw error; });
  return sdkPromise;
}

export type PinTone = 'saved' | 'idle' | `day${number}`;
export interface MapPin { place: Place; label: string; tone: PinTone }

interface Props {
  jsKey?: string;
  configLoading: boolean;
  pins: MapPin[];
  route?: Place[];
  routeColor?: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // Refit only when the set being shown changes, not when a pin's state changes.
  fitKey: string;
  title: string;
  toolbar?: ReactNode;
  legend?: ReactNode;
  children?: ReactNode;
}

export default function KakaoMap({ jsKey, configLoading, pins, route = [], routeColor = '#0066ff', selectedId, onSelect, fitKey, title, toolbar, legend, children }: Props) {
  const { t } = useTranslation('map');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<KakaoMapInstance | null>(null);
  const sdk = useRef<KakaoSdk | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const selectCallback = useRef(onSelect);
  selectCallback.current = onSelect;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  useEffect(() => {
    if (!jsKey || !container.current) return;
    let active = true;
    setStatus('loading');
    loadSdk(jsKey).then((loaded) => {
      if (!active || !container.current) return;
      try {
        sdk.current = loaded;
        map.current = new loaded.Map(container.current, { center: new loaded.LatLng(36.4, 127.8), level: 13 });
        setStatus('ready');
      } catch { setStatus('error'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; map.current = null; sdk.current = null; };
  }, [jsKey, attempt]);

  function fit(points: Place[]) {
    const loaded = sdk.current;
    if (!map.current || !loaded || points.length === 0) return;
    if (points.length === 1) { map.current.setCenter(new loaded.LatLng(points[0]!.latitude, points[0]!.longitude)); map.current.setLevel(5); return; }
    const bounds = new loaded.LatLngBounds();
    points.forEach((place) => bounds.extend(new loaded.LatLng(place.latitude, place.longitude)));
    map.current.setBounds(bounds, 48, 48, 48, 48);
  }

  useEffect(() => {
    if (status !== 'ready') return;
    fit(pinsRef.current.map((pin) => pin.place));
  }, [fitKey, status]);

  useEffect(() => {
    const loaded = sdk.current;
    if (status !== 'ready' || !map.current || !loaded) return;
    const layers = pins.map((pin) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `map-pin tone-${pin.tone}${pin.place.id === selectedId ? ' selected' : ''}`;
      button.textContent = pin.label;
      button.setAttribute('aria-label', pin.place.name);
      button.addEventListener('click', () => selectCallback.current(pin.place.id));
      return new loaded.CustomOverlay({ position: new loaded.LatLng(pin.place.latitude, pin.place.longitude), content: button, map: map.current!, yAnchor: 1, zIndex: pin.place.id === selectedId ? 3 : 1, clickable: true });
    });
    return () => layers.forEach((layer) => layer.setMap(null));
  }, [pins, selectedId, status]);

  useEffect(() => {
    const loaded = sdk.current;
    if (status !== 'ready' || !map.current || !loaded || route.length < 2) return;
    const line = new loaded.Polyline({ map: map.current, path: route.map((place) => new loaded.LatLng(place.latitude, place.longitude)), strokeWeight: 3, strokeColor: routeColor, strokeOpacity: 0.9, strokeStyle: 'shortdash' });
    return () => line.setMap(null);
  }, [route, routeColor, status]);

  useEffect(() => {
    const loaded = sdk.current;
    const place = pinsRef.current.find((pin) => pin.place.id === selectedId)?.place;
    if (status !== 'ready' || !map.current || !loaded || !place) return;
    map.current.panTo(new loaded.LatLng(place.latitude, place.longitude));
  }, [selectedId, status]);

  useEffect(() => {
    if (!container.current || status !== 'ready') return;
    const observer = new ResizeObserver(() => { map.current?.relayout(); });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [status]);

  const missingKey = !configLoading && !jsKey;
  return (
    <section className="map-card" aria-label={title}>
      {toolbar && <div className="map-toolbar">{toolbar}</div>}
      <div className="map-frame" data-testid={TRAVEL_TEST_IDS.MAP_FRAME} data-map-status={missingKey ? 'missing-key' : status} data-pin-count={pins.length}>
        <div className="kakao-map" ref={container} />
        {(missingKey || status !== 'ready') && <div className="map-placeholder">
          <IconLocation />
          <Typography variant="body2" weight="bold">{t(missingKey ? 'mapMissingKey' : status === 'error' ? 'mapFailed' : 'mapLoading')}</Typography>
          {(missingKey || status === 'error') && <Typography variant="caption1" color="semantic.foreground.neutral.secondary">{t(missingKey ? 'mapMissingKeyDescription' : 'mapFailedDescription', { origin: window.location.origin })}</Typography>}
          {status === 'error' && jsKey && <Button size="small" variant="outlined" color="assistive" leadingContent={<IconRefresh />} onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</Button>}
        </div>}
        {status === 'ready' && pins.length > 0 && <button type="button" className="map-fit" onClick={() => fit(pins.map((pin) => pin.place))}>{t('fitPins')}</button>}
        {children}
      </div>
      {legend && <div className="map-legend">{legend}</div>}
    </section>
  );
}
