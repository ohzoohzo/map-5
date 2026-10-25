import styled from '@emotion/styled';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, FallbackView, FallbackViewText, Loading, TextField, Typography } from '@montage-ui/core';
import { IconArrowRight, IconBookmark, IconBookmarkFill, IconClose, IconExternalLink, IconSearch } from '@montage-ui/icon';
import { Coffee, Dices, Landmark, ShoppingBag, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError, getCatalog, getConfig, searchPlaces, type Place, type SearchPlacesCategory } from '../../api/client';
import { color } from '../../shared/design/tokens';
import KakaoMap, { type MapPin } from '../../shared/map/KakaoMap';
import { districtOf, districtsOf, provincesOf, resolveProvince, shortProvince } from '../../shared/regions';
import { navigate } from '../../shared/router';
import PinDayPage from '../../shared/ui/PinDayPage';
import EmptyStateArt from '../../shared/ui/EmptyStateArt';
import PlacePhoto from '../../shared/media/PlacePhoto';
import { TRAVEL_TEST_IDS } from '../../shared/testIds';
import TripBar, { regionsQuery } from '../../shared/trip/TripBar';
import { tripActions, unscheduledIds, useTrip } from '../../shared/trip/tripStore';
import type { DocentPhotos } from '../../api/generated/model';

type Kind = 'attraction' | 'food' | 'cafe' | 'shopping';
// 관광지 comes from the public catalog; the rest from Kakao Local, narrowed by group code where one exists.
const KINDS: Record<Kind, { icon: LucideIcon; keyword: string; category: SearchPlacesCategory | null }> = {
  attraction: { icon: Landmark, keyword: '', category: null },
  food: { icon: UtensilsCrossed, keyword: '맛집', category: 'FD6' },
  cafe: { icon: Coffee, keyword: '카페', category: 'CE7' },
  shopping: { icon: ShoppingBag, keyword: '쇼핑', category: null },
};
const EMPTY: Place[] = [];

const ExploreLayout = styled(PinDayPage)`
  .trip-bar-wrap { position: sticky; top: 0; z-index: 30; padding: 8px 0; margin-bottom: 12px; background: ${color.surface}; }
  .photo-frame img { object-fit: cover; }
  .explore-grid .place-card { position: relative; }
  .explore-grid .place-visual:has(> [data-photo-missing='true']) { display: none; }
  .explore-grid .place-card:has(.place-visual > [data-photo-missing='true']) .place-copy { padding-top: 48px; }
  .explore-map .map-popup [data-variant='popup'] .photo-frame { height: 72px; }
  .explore-map .map-popup [data-variant='popup'] .photo-frame img { width: auto; max-width: 100%; height: 72px; object-fit: contain; }
  .explore-actions { width: 100%; max-width: none; display: grid; grid-template-columns: minmax(0, 1fr) max-content; align-items: center; gap: 8px; }
  .explore-actions .search-form { width: 100%; min-width: 0; align-items: center; gap: 8px; }
  .explore-actions .search-form > :first-child { flex: 1 1 0; min-width: 0; }
  .explore-actions .search-form > :last-child,
  .explore-actions > button { flex-shrink: 0; white-space: nowrap; }

  .explore-grid > .filter-row { grid-column: 1; grid-row: 1; }
  .explore-grid > .explore-actions { grid-column: 1; grid-row: 2; }
  .explore-grid > .explore-list { grid-column: 1; grid-row: 3; }
  .explore-grid > .explore-map { grid-column: 2; grid-row: 1 / span 3; }

  @media (max-width: 1100px) {
    .explore-grid { display: flex; flex-direction: column; gap: 0; }
    .filter-row { order: 0; width: 100%; background: ${color.surface}; margin: 0; padding: 0; overflow: visible; }
    .explore-actions { order: 1; width: 100%; margin-top: 12px; }
    .explore-map { order: 2; position: static; width: 100%; margin-top: 12px; }
    .map-frame { height: 350px; min-height: 350px; }
    .map-legend { display: none; }
    .explore-list { order: 3; margin-top: 12px; }
    .place-grid { max-height: none; min-height: 0; overflow: visible; }
  }

  @media (max-width: 720px) {
    .kind-tabs { width: auto; flex-wrap: wrap; overflow: visible; }
    .kind-tab { flex-shrink: 1; padding: 0 8px; }
    .explore-grid .place-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
`;

// 시안: design/pinday-explore-v2.png
export default function ExplorePage() {
  const { t } = useTranslation('explore');
  const trip = useTrip((current) => current);
  const queryClient = useQueryClient();
  const photoFetchCount = useIsFetching({ queryKey: ['docent', 'photos'] });
  const candidates = useMemo(() => trip.candidateIds.map((id) => trip.places[id]!), [trip.candidateIds, trip.places]);
  const [kind, setKind] = useState<Kind>('attraction');
  const [district, setDistrict] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const config = useQuery({ queryKey: ['config'], queryFn: ({ signal }) => getConfig(signal), staleTime: Infinity });
  const regions = useQuery(regionsQuery);
  const province = resolveProvince(trip.destination, provincesOf(regions.data?.regions ?? []));
  const short = shortProvince(province);
  const districts = districtsOf(regions.data?.regions ?? [], province);
  const area = [short, district].filter(Boolean).join(' ');
  const usesKakao = query !== '' || kind !== 'attraction';
  const searchText = query ? `${area} ${query}` : `${area} ${KINDS[kind].keyword}`;
  const searchCategory = query ? null : KINDS[kind].category;
  const kakaoReady = config.data?.place_search_enabled === true;
  const catalog = useQuery({
    queryKey: ['travel', 'catalog', district ? `${province} ${district}` : province, ''],
    queryFn: ({ signal }) => getCatalog(district ? `${province} ${district}` : province, '', signal),
    enabled: province !== '' && !usesKakao,
  });
  const search = useQuery({
    queryKey: ['travel', 'search', searchText, searchCategory],
    queryFn: ({ signal }) => searchPlaces(searchText, searchCategory, signal),
    enabled: province !== '' && usesKakao && kakaoReady,
  });
  const result = usesKakao ? search : catalog;
  const places = result.data?.places ?? EMPTY;
  const prioritizedPlaces = useMemo(() => [...places].sort((first, second) => {
    const rank = (place: Place) => {
      const state = queryClient.getQueryState<DocentPhotos>(['docent', 'photos', place.id]);
      if (state?.status === 'success') return state.data?.photos.length ? 0 : 2;
      if (state?.status === 'error') return 2;
      return 1;
    };
    return rank(first) - rank(second);
  }), [places, photoFetchCount, queryClient]);
  const savedIds = useMemo(() => new Set(trip.candidateIds), [trip.candidateIds]);
  const selected = places.find((place) => place.id === selectedId) ?? (selectedId ? trip.places[selectedId] ?? null : null);
  const pins = useMemo<MapPin[]>(() => prioritizedPlaces.map((place, index) => ({ place, label: String(index + 1), tone: savedIds.has(place.id) ? 'saved' : 'idle' })), [prioritizedPlaces, savedIds]);
  const unscheduled = unscheduledIds(trip).length;
  const searchBlocked = usesKakao && config.data?.place_search_enabled === false;
  const loading = !searchBlocked && result.isLoading && result.fetchStatus !== 'idle';

  function toggleSave(place: Place) {
    if (savedIds.has(place.id)) tripActions.removeCandidate(place.id);
    else tripActions.addCandidate(place);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setQuery(queryInput.trim()); setSelectedId(null); }
  function clearSearch() { setQuery(''); setQueryInput(''); setSelectedId(null); }
  function pickRandom() {
    const pool = places.filter((place) => !savedIds.has(place.id));
    const choices = pool.length ? pool : places;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (!pick) return;
    setSelectedId(pick.id);
    document.getElementById(`place-${pick.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  const errorMessage = result.error instanceof ApiError ? result.error.message : t('networkError');
  const regionErrorMessage = regions.error instanceof ApiError ? regions.error.message : t('networkError');

  return (
    <ExploreLayout>
      {province !== '' && <header className="page-head">
        <div>
          <Typography as="h1" variant="title2" weight="bold">{t('exploreTitle')}</Typography>
          <Typography variant="body1" color="semantic.foreground.neutral.secondary">{t('exploreSubtitle')}</Typography>
        </div>
      </header>}
      <TripBar page="explore" showStepLabels />
      {regions.isPending ? <div className="loading-box" role="status"><Loading /><span className="sr-only">{t('loading')}</span></div>
        : regions.isError ? <Fallback title={t('regionsLoadError')} description={regionErrorMessage} action={<Button size="small" variant="outlined" onClick={() => { void regions.refetch(); }}>{t('retry')}</Button>} />
        : null}
      {province !== '' && <>
        <div className="explore-grid">
          <div className="filter-row">
            {query ? <span className="query-chip">{t('searchResultFor', { query })}<button type="button" onClick={clearSearch} aria-label={t('clearSearch')}><IconClose /></button></span>
              : <div className="kind-tabs" role="tablist" aria-label={t('kindLabel')}>
                {(Object.keys(KINDS) as Kind[]).map((key) => {
                  const Icon = KINDS[key].icon;
                  return <button key={key} type="button" role="tab" aria-selected={kind === key} className={kind === key ? 'kind-tab active' : 'kind-tab'} onClick={() => { setKind(key); setSelectedId(null); }}><Icon size={16} />{t(`kind_${key}`)}</button>;
                })}
              </div>}
            <div className="district-chips" role="group" aria-label={t('districtLabel')}>
              {['', ...districts].map((name) => <button key={name || 'all'} type="button" aria-pressed={district === name} className={district === name ? 'chip active' : 'chip'} onClick={() => { setDistrict(name); setSelectedId(null); }}>{name || t('allDistricts', { place: short })}</button>)}
            </div>
          </div>
          <div className="page-head-actions explore-actions">
            <form className="search-form" onSubmit={submitSearch} role="search">
              <TextField type="search" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder={t('searchPlaceholder', { place: short })} aria-label={t('searchLabel')} leadingContent={<IconSearch />} width="100%" />
              <Button type="submit" variant="solid" color="primary" disabled={!queryInput.trim()}>{t('searchButton')}</Button>
            </form>
            <Button variant="outlined" color="primary" leadingContent={<Dices size={18} />} onClick={pickRandom} disabled={!places.length}>{t('randomPick')}</Button>
          </div>
          <div className="explore-map mobile-active">
            <KakaoMap jsKey={config.data?.js_key} configLoading={config.isLoading} pins={pins} selectedId={selectedId} onSelect={setSelectedId} fitKey={`${result.dataUpdatedAt}-${searchText}-${district}`} title={t('exploreMapTitle')}
              legend={<><span className="legend-dot saved" />{t('legendSaved')}<span className="legend-dot idle" />{t('legendIdle')}</>}>
              {selected && <article className="map-popup" aria-label={selected.name}>
                <button type="button" className="popup-close" onClick={() => setSelectedId(null)} aria-label={t('closeDetails')}><IconClose /></button>
                <PlacePhoto place={selected} variant="popup" />
                <Typography as="h3" variant="headline2" weight="bold">{selected.name}</Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">{[selected.category, districtOf(selected)].filter(Boolean).join(' · ')}</Typography>
                <Typography variant="label2" color="semantic.foreground.neutral.secondary" className="popup-text">{selected.description || selected.address || t('noAddress')}</Typography>
                <div className="popup-actions">
                  <Button size="small" variant={savedIds.has(selected.id) ? 'outlined' : 'solid'} color="primary" leadingContent={savedIds.has(selected.id) ? <IconBookmarkFill /> : <IconBookmark />} onClick={() => toggleSave(selected)} aria-pressed={savedIds.has(selected.id)}>{t(savedIds.has(selected.id) ? 'saved' : 'save')}</Button>
                  {/^https?:\/\//.test(selected.url) && <a className="popup-link" href={selected.url} target="_blank" rel="noopener noreferrer">{t(selected.id.startsWith('kakao:') ? 'openKakao' : 'openSource')}<IconExternalLink /></a>}
                </div>
              </article>}
            </KakaoMap>
          </div>
          <section className="explore-list" aria-label={t('placeListLabel')}>
            <div className="list-body mobile-active">
              <div className="result-line">
                <Typography variant="label1" color="semantic.foreground.neutral.secondary">{t('resultCount')} <strong data-testid={TRAVEL_TEST_IDS.RESULT_COUNT}>{loading ? '—' : places.length}</strong>{t('placeUnit')}</Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">{t(usesKakao ? 'sourceKakao' : 'sourceCatalog')}</Typography>
              </div>
              {searchBlocked ? <Fallback title={t('searchDisabled')} description={t('searchDisabledDetail')} />
                : loading ? <div className="loading-box" role="status"><Loading /><span className="sr-only">{t('loading')}</span></div>
                : result.isError ? <Fallback title={t('loadError')} description={errorMessage} action={<Button size="small" variant="outlined" onClick={() => { void result.refetch(); }}>{t('retry')}</Button>} />
                : !places.length ? <Fallback title={t('emptyResults')} description={t('emptyResultsDetail')} action={district || query ? <Button size="small" variant="outlined" onClick={() => { setDistrict(''); clearSearch(); }}>{t('resetFilters')}</Button> : undefined} />
                : <ul className="place-grid" data-testid={TRAVEL_TEST_IDS.PLACE_GRID}>
                  {prioritizedPlaces.map((place, index) => <PlaceCard key={place.id} place={place} index={index} saved={savedIds.has(place.id)} selected={place.id === selectedId} kind={usesKakao ? kindOf(place, kind, query) : 'attraction'} onSelect={() => setSelectedId(place.id)} onToggle={() => toggleSave(place)} />)}
                </ul>}
            </div>
          </section>
        </div>
      </>}

      <aside className="candidate-tray" aria-labelledby="tray-title" data-testid={TRAVEL_TEST_IDS.CANDIDATE_TRAY}>
        <div className="tray-summary">
          {!candidates.length && <EmptyStateArt kind="candidates" size={64} />}
          <div className="tray-summary-copy">
            <Typography id="tray-title" as="h2" variant="headline2" weight="bold">{t('trayTitle', { count: candidates.length })}</Typography>
            <Typography variant="caption1" color="semantic.foreground.neutral.secondary">{candidates.length ? t('trayUnscheduled', { total: candidates.length, count: unscheduled }) : t('trayEmpty')}</Typography>
          </div>
        </div>
        <ul className="tray-list">
          {candidates.map((place) => <li key={place.id} className="tray-item">
            <button type="button" className="tray-name" onClick={() => setSelectedId(place.id)}><PlacePhoto place={place} variant="thumbnail"><span className="tray-copy"><strong>{place.name}</strong><span>{[place.category, districtOf(place)].filter(Boolean).join(' · ')}</span></span></PlacePhoto></button>
            <button type="button" className="tray-remove" onClick={() => tripActions.removeCandidate(place.id)} aria-label={t('removeCandidate', { name: place.name })}><IconClose /></button>
          </li>)}
        </ul>
        <Button className="tray-cta" variant="solid" color="primary" size="large" trailingContent={<IconArrowRight />} disabled={!candidates.length} onClick={() => navigate('/schedule')}>{t('goPlanner')}</Button>
      </aside>
    </ExploreLayout>
  );
}

function kindOf(place: Place, kind: Kind, query: string): Kind {
  if (!query) return kind;
  if (place.category.includes('음식')) return 'food';
  if (place.category.includes('카페')) return 'cafe';
  return 'attraction';
}

function PlaceCard({ place, index, saved, selected, kind, onSelect, onToggle }: { place: Place; index: number; saved: boolean; selected: boolean; kind: Kind; onSelect: () => void; onToggle: () => void }) {
  const { t } = useTranslation('explore');
  return (
    <li id={`place-${place.id}`} className={`place-card kind-${kind}${selected ? ' selected' : ''}`}>
      <button type="button" className="place-card-main" onClick={onSelect} aria-label={t('showOnMap', { name: place.name })}>
        <span className="place-visual"><PlacePhoto place={place} variant="card" /></span>
        <span className="place-index">{index + 1}</span>
        {saved && <span className="saved-flag">{t('savedFlag')}</span>}
        <span className="place-copy"><strong>{place.name}</strong><span>{[place.category || t(`kind_${kind}`), districtOf(place)].filter(Boolean).join(' · ')}</span></span>
      </button>
      <Button size="small" variant={saved ? 'outlined' : 'solid'} color="primary" leadingContent={saved ? <IconBookmarkFill /> : <IconBookmark />} onClick={onToggle} aria-pressed={saved}>{/* Montage Button 은 aria-labelledby 로 자기 글자를 이름으로 쓴다: 장소 이름은 숨김 글자로 넣는다 */}<span className="sr-only">{place.name} </span>{t(saved ? 'saved' : 'save')}</Button>
    </li>
  );
}

function Fallback({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <FallbackView padding="compact"><FallbackViewText title={title} description={description} />{action}</FallbackView>;
}
