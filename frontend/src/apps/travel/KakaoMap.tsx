import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Map, MapPin, Navigation, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../api/client';
import { TRAVEL_TEST_IDS } from '../../shared/testIds';

interface KakaoLatLng {}
interface KakaoBounds { extend(point: KakaoLatLng): void }
interface KakaoMapInstance { setBounds(bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number): void; setCenter(point: KakaoLatLng): void; setLevel(level: number): void; relayout(): void }
interface KakaoMarker { setMap(map: KakaoMapInstance | null): void }
interface KakaoPolyline { setMap(map: KakaoMapInstance | null): void }
interface KakaoSdk {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  Marker: new (options: { position: KakaoLatLng; map: KakaoMapInstance; title: string }) => KakaoMarker;
  Polyline: new (options: { map: KakaoMapInstance; path: KakaoLatLng[]; strokeWeight: number; strokeColor: string; strokeOpacity: number; strokeStyle: string }) => KakaoPolyline;
  event: { addListener(target: KakaoMarker, event: 'click', callback: () => void): void; removeListener(target: KakaoMarker, event: 'click', callback: () => void): void };
}
declare global { interface Window { kakao?: { maps: KakaoSdk } } }
let sdkPromise: Promise<KakaoSdk> | null = null;
let sdkKey = '';

function loadSdk(key: string): Promise<KakaoSdk> {
  if (sdkPromise && sdkKey === key) return sdkPromise;
  sdkKey = key;
  sdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const previousScript = document.getElementById('kakao-map-sdk');
    previousScript?.remove();
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

interface Props {
  jsKey?: string;
  configLoading: boolean;
  places: Place[];
  selectedPlace: Place | null;
  onSelect: (place: Place | null) => void;
  onAdd: (place: Place) => void;
  dayPlaces: Place[];
  day: number;
  addedIds: Set<string>;
}

export default function KakaoMap({ jsKey, configLoading, places, selectedPlace, onSelect, onAdd, dayPlaces, day, addedIds }: Props) {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<KakaoMapInstance | null>(null);
  const sdk = useRef<KakaoSdk | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [renderedMarkerCount, setRenderedMarkerCount] = useState(0);
  const selectionCallback = useRef(onSelect);
  selectionCallback.current = onSelect;

  useEffect(() => {
    if (!jsKey || !container.current) return;
    let active = true;
    setStatus('loading');
    loadSdk(jsKey).then((loadedSdk) => {
      if (!active || !container.current) return;
      try {
        sdk.current = loadedSdk;
        map.current = new loadedSdk.Map(container.current, { center: new loadedSdk.LatLng(36.4, 127.8), level: 13 });
        setStatus('ready');
      } catch { setStatus('error'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; map.current = null; sdk.current = null; };
  }, [jsKey, attempt]);

  function fitPoints(points: Place[]) {
    if (!map.current || !sdk.current || points.length === 0) return;
    const bounds = new sdk.current.LatLngBounds();
    points.forEach((place) => bounds.extend(new sdk.current!.LatLng(place.latitude, place.longitude)));
    if (points.length === 1) { map.current.setCenter(new sdk.current.LatLng(points[0]!.latitude, points[0]!.longitude)); map.current.setLevel(5); }
    else map.current.setBounds(bounds, 40, 40, 40, 40);
  }

  useEffect(() => {
    if (status !== 'ready' || !map.current || !sdk.current) return;
    const loadedSdk = sdk.current;
    const markers = places.map((place) => {
      const marker = new loadedSdk.Marker({ position: new loadedSdk.LatLng(place.latitude, place.longitude), map: map.current!, title: place.name });
      const click = () => selectionCallback.current(place);
      loadedSdk.event.addListener(marker, 'click', click);
      return { marker, click };
    });
    setRenderedMarkerCount(markers.length);
    fitPoints(places);
    return () => markers.forEach(({ marker, click }) => { loadedSdk.event.removeListener(marker, 'click', click); marker.setMap(null); });
  }, [places, status]);

  useEffect(() => {
    if (status !== 'ready' || !map.current || !sdk.current || !selectedPlace) return;
    map.current.setCenter(new sdk.current.LatLng(selectedPlace.latitude, selectedPlace.longitude));
    map.current.setLevel(5);
  }, [selectedPlace, status]);

  useEffect(() => {
    if (status !== 'ready' || !map.current || !sdk.current || dayPlaces.length < 2) return;
    const polyline = new sdk.current.Polyline({
      map: map.current,
      path: dayPlaces.map((place) => new sdk.current!.LatLng(place.latitude, place.longitude)),
      strokeWeight: 3,
      strokeColor: '#ed8f56',
      strokeOpacity: 0.9,
      strokeStyle: 'shortdash',
    });
    return () => polyline.setMap(null);
  }, [dayPlaces, status]);

  useEffect(() => {
    if (!container.current || status !== 'ready') return;
    const observer = new ResizeObserver(() => { map.current?.relayout(); });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [status]);

  const mapMissing = !configLoading && !jsKey;
  const added = selectedPlace ? addedIds.has(selectedPlace.id) : false;
  const safePlaceUrl = selectedPlace && /^https?:\/\//i.test(selectedPlace.url) ? selectedPlace.url : null;

  return (
    <section className="map-section panel" aria-labelledby="map-title">
      <div className="panel-heading map-heading">
        <div><h2 id="map-title"><Map size={18} />{t('mapTitle')}</h2><p>{t('mapSubtitle')}</p></div>
        <button className="icon-button fit-button" onClick={() => fitPoints(places)} aria-label={t('fitResults')} title={t('fitResults')} disabled={status !== 'ready' || !places.length}><LocateFixed size={18} /></button>
      </div>
      <div className="map-frame" data-testid={TRAVEL_TEST_IDS.MAP_FRAME} data-place-count={places.length} data-map-status={status} data-marker-count={status === 'ready' ? renderedMarkerCount : 0}>
        <div className="kakao-map" ref={container} aria-label={t('mapTitle')} />
        {(mapMissing || status !== 'ready') && <div className="map-placeholder">
          <div className="map-placeholder-icon"><MapPin size={33} strokeWidth={1.5} /></div>
          <strong>{t(mapMissing ? 'mapMissingKey' : status === 'error' ? 'mapFailed' : 'mapLoading')}</strong>
          {(mapMissing || status === 'error') && <p>{t(mapMissing ? 'mapMissingKeyDescription' : 'mapFailedDescription')}</p>}
          {status === 'error' && jsKey && <button className="button secondary" onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={15} />{t('retry')}</button>}
        </div>}
        {status === 'ready' && <>
          <span className="map-result-chip"><span className="status-dot" />{t('mapResultChip', { count: places.length })}</span>
          {dayPlaces.length > 0 && <button className="route-chip" onClick={() => fitPoints(dayPlaces)} aria-label={t('fitPlan')}><Navigation size={14} />{t('routeLegend', { day })}</button>}
        </>}
        {selectedPlace && <article className="place-detail">
          <button className="icon-button detail-close" aria-label={t('closeDetails')} onClick={() => onSelect(null)}><X size={15} /></button>
          <span className="mini-label">{t('selectedPlace')}</span>
          <h3>{selectedPlace.name}</h3>
          <p className="detail-address">{selectedPlace.address || t('noAddress')}</p>
          {selectedPlace.description && <p className="detail-description">{selectedPlace.description}</p>}
          <div className="detail-meta">{selectedPlace.category && <span>{selectedPlace.category}</span>}<span>{selectedPlace.source_date || t('dateUnknown')}</span></div>
          <div className="detail-actions">
            <button className="button primary compact" disabled={added} onClick={() => onAdd(selectedPlace)}>{t(added ? 'alreadyAdded' : 'addPlace')}</button>
            {safePlaceUrl && <a href={safePlaceUrl} target="_blank" rel="noopener noreferrer">{t('openPlaceUrl')} ↗</a>}
          </div>
        </article>}
      </div>
      <div className="map-help"><span>{t('mapSupport')}</span><span>{t('mapDomain', { origin: window.location.origin })}</span></div>
    </section>
  );
}
