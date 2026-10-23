import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronDown, Compass, Database, Footprints, Map, MapPin, Plus, Route, Search, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import { getCatalog, getConfig, searchPlaces, ApiError, type Place } from '../../api/client';
import { TRAVEL_TEST_IDS } from '../../shared/testIds';
import KakaoMap from './KakaoMap';
import { straightLineDistance, usePlanner } from './planner';

const EMPTY_PLACES: Place[] = [];
const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

export default function TravelWorkspace() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'catalog' | 'search'>('catalog');
  const [region, setRegion] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [feedback, setFeedback] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'discover' | 'map' | 'plan'>('discover');
  const [pendingDays, setPendingDays] = useState<number | null>(null);
  const planner = usePlanner();
  const { plan } = planner;
  const config = useQuery({ queryKey: ['config'], queryFn: ({ signal }) => getConfig(signal), staleTime: Infinity });
  const catalog = useQuery({ queryKey: ['travel', 'catalog', region, query], queryFn: ({ signal }) => getCatalog(region, query, signal), enabled: mode === 'catalog' });
  const search = useQuery({ queryKey: ['travel', 'search', query], queryFn: ({ signal }) => searchPlaces(query, signal), enabled: mode === 'search' && query.length > 0 && config.data?.place_search_enabled === true });
  const result = mode === 'catalog' ? catalog : search;
  const data = mode === 'search' && !query ? undefined : result.data;
  const places = data?.places ?? EMPTY_PLACES;
  const dayPlaces = plan.days[plan.activeDay]!;
  const addedIds = new Set(dayPlaces.map((place) => place.id));
  const selectedCount = plan.days.reduce((total, day) => total + day.length, 0);
  const distance = straightLineDistance(dayPlaces);
  const isLoading = (mode === 'catalog' || query.length > 0) && result.isLoading;
  const searchUnavailable = mode === 'search' && config.data?.place_search_enabled === false;

  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setQuery(queryInput.trim()); setSelectedPlace(null); }
  function changeMode(value: 'catalog' | 'search') { setMode(value); setQuery(''); setQueryInput(''); setSelectedPlace(null); }
  function resetFilters() { setRegion(''); setQuery(''); setQueryInput(''); setSelectedPlace(null); }
  function addPlace(place: Place) {
    const outcome = planner.addPlace(place);
    setFeedback(outcome === 'added' ? t('addedFeedback', { name: place.name, day: plan.activeDay + 1 }) : t(outcome === 'duplicate' ? 'duplicateFeedback' : 'dailyLimit'));
  }
  function changeDayCount(count: number) {
    if (count < plan.days.length && plan.days.slice(count).some((day) => day.length > 0)) { setPendingDays(count); return; }
    planner.setDayCount(count);
  }
  function selectPlace(place: Place) { setSelectedPlace(place); setMobilePanel('map'); }
  function safeError(error: Error | null) { return error instanceof ApiError ? error.message : t('networkError'); }
  const sourceDate = data?.date_min && data.date_max ? data.date_min === data.date_max ? data.date_min : `${data.date_min} – ${data.date_max}` : t('dateUnknown');
  const sourceUrl = data && /^https?:\/\//i.test(data.source_url) ? data.source_url : null;

  return (
    <div className="workspace-page">
      <div className="intro">
        <div>
          <p className="eyebrow"><span />{t('eyebrow')}</p>
          <h1>{t('title')} <span>{t('titleAccent')}</span></h1>
          <p className="intro-description">{t('subtitle')}</p>
        </div>
        <div className="intro-stamp" aria-hidden="true"><Compass size={42} strokeWidth={1} /><span>LET’S GO<br />SOMEWHERE</span></div>
      </div>

      <div className="metrics" aria-live="polite" aria-atomic="false">
        <div className="metric"><span className="metric-icon blue"><MapPin size={21} /></span><div><span className="metric-label">{t('resultsMetric')}</span><strong><span data-testid={TRAVEL_TEST_IDS.RESULT_COUNT}>{isLoading ? '—' : number.format(places.length)}</span><small>{t('resultsUnit')}</small></strong></div><span className="metric-detail"><Database size={13} />{t(mode === 'catalog' ? 'catalogMode' : 'searchMode')}</span></div>
        <div className="metric"><span className="metric-icon orange"><CheckCheck size={21} /></span><div><span className="metric-label">{t('planMetric')}</span><strong><span data-testid={TRAVEL_TEST_IDS.SELECTED_PLACE_COUNT}>{number.format(selectedCount)}</span><small>{t('planUnit')}</small></strong></div><span className="metric-detail">{t('dayCount', { count: plan.days.length })} <span className="tiny-dot" /> {t('appTitle')}</span></div>
        <div className="metric"><span className="metric-icon green"><Route size={21} /></span><div><span className="metric-label">{t('distanceMetric')}</span><strong><span data-testid={TRAVEL_TEST_IDS.STRAIGHT_DISTANCE}>{number.format(distance)}</span><small>{t('distanceUnit')}</small></strong></div><span className="metric-detail distance-detail" title={t('distanceHint')}>{t('day', { day: plan.activeDay + 1 })} · {t('routeDescription')}</span></div>
      </div>

      {planner.storageIssue && <div className="notice warning" role="alert"><TriangleAlert size={18} /><p>{t(planner.storageIssue)}</p><button className="text-button" onClick={planner.retryStorage}>{t('storageRetry')}</button></div>}
      {config.isError && <div className="notice warning" role="alert"><TriangleAlert size={18} /><p>{t('configError')} {safeError(config.error)}</p><button className="text-button" onClick={() => { void config.refetch(); }}>{t('retry')}</button></div>}

      <div className="feedback" role="status" aria-live="polite">{feedback && <><Check size={16} /><span>{feedback}</span><button aria-label={t('closeDetails')} onClick={() => setFeedback('')}><X size={14} /></button></>}</div>
      <div className="mobile-tabs" role="tablist" aria-label={t('appTitle')}>
        {(['discover', 'map', 'plan'] as const).map((panel) => {
          const Icon = panel === 'discover' ? Compass : panel === 'map' ? Map : CalendarDays;
          return <button key={panel} role="tab" aria-selected={mobilePanel === panel} aria-controls={`panel-${panel}`} id={`tab-${panel}`} onClick={() => setMobilePanel(panel)} className={mobilePanel === panel ? 'active' : ''}><Icon size={17} />{t(panel === 'discover' ? 'mobileDiscover' : panel === 'map' ? 'mobileMap' : 'mobilePlan')}{panel === 'plan' && selectedCount > 0 && <span className="tab-count">{selectedCount}</span>}</button>;
        })}
      </div>

      <div className="workspace-grid">
        <section className={`discover-panel panel mobile-panel ${mobilePanel === 'discover' ? 'mobile-active' : ''}`} id="panel-discover" aria-labelledby="discover-title">
          <div className="panel-heading"><span className="section-kicker">EXPLORE</span><h2 id="discover-title">{t('discover')}</h2><p>{t('discoverSubtitle')}</p></div>
          <div className="discover-controls">
            <div className="mode-switch" aria-label={t('queryLabel')}>
              <button className={mode === 'catalog' ? 'active' : ''} onClick={() => changeMode('catalog')} aria-pressed={mode === 'catalog'}><MapPin size={14} />{t('catalogMode')}</button>
              <button className={mode === 'search' ? 'active' : ''} onClick={() => changeMode('search')} aria-pressed={mode === 'search'}><Search size={14} />{t('searchMode')}</button>
            </div>
            {mode === 'catalog' && <label className="field-label" htmlFor="travel-region">{t('regionLabel')}<span className="select-wrap"><MapPin size={15} /><select id="travel-region" value={region} onChange={(event) => { setRegion(event.target.value); setSelectedPlace(null); }}><option value="">{t('allRegions')}</option>{catalog.data?.regions.map((name) => <option value={name} key={name}>{name}</option>)}</select><ChevronDown size={15} /></span></label>}
            <form className="search-form" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="travel-query">{t('queryLabel')}</label>
              <Search className="search-input-icon" size={17} />
              <input id="travel-query" type="search" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder={t(mode === 'catalog' ? 'searchPlaceholder' : 'livePlaceholder')} disabled={searchUnavailable} autoComplete="off" />
              <button type="submit" aria-label={t('searchButton')} disabled={searchUnavailable}><ArrowUpRight size={19} /></button>
            </form>
          </div>
          <div className="results-heading"><span>{t('resultCount', { count: places.length })}</span><span className="results-heading-rule" /></div>
          <div className="results-scroll" aria-busy={isLoading}>
            {isLoading ? <div className="loading-state" role="status"><span className="loading-ring" /><p>{t('loading')}</p></div>
              : result.isError ? <div className="empty-state error-state" role="alert"><TriangleAlert size={27} /><strong>{t('catalogError')}</strong><p>{safeError(result.error)}</p><button className="button secondary" onClick={() => { void result.refetch(); }}>{t('retry')}</button></div>
              : searchUnavailable ? <div className="empty-state"><Search size={28} /><strong>{t('searchDisabled')}</strong><p>{t('searchDisabledDetail')}</p></div>
              : mode === 'search' && !query ? <div className="empty-state"><Search size={28} /><strong>{t('searchReady')}</strong><p>{t('searchReadyDescription')}</p></div>
              : !places.length ? <div className="empty-state"><MapPin size={28} /><strong>{t('emptyResults')}</strong><p>{t('emptyResultsDescription')}</p><button className="text-button" onClick={resetFilters}>{t('resetFilters')}</button></div>
              : <ul className="place-cards">{places.map((place, index) => {
                const added = addedIds.has(place.id);
                return <li key={place.id} className={`place-card ${selectedPlace?.id === place.id ? 'selected' : ''}`}>
                  <button className="place-card-main" onClick={() => selectPlace(place)} aria-label={t('showOnMap', { name: place.name })}><span className="place-number">{String(index + 1).padStart(2, '0')}</span><span className="place-card-copy"><span className="place-category">{place.category || t('catalogMode')}</span><strong>{place.name}</strong><span className="place-address">{place.address || t('noAddress')}</span></span></button>
                  <button className={`add-button ${added ? 'added' : ''}`} aria-label={t(added ? 'alreadyAdded' : 'addPlaceNamed', { name: place.name })} disabled={added} onClick={() => addPlace(place)} title={t(added ? 'alreadyAdded' : 'addPlace')}>{added ? <Check size={17} /> : <Plus size={18} />}</button>
                </li>;
              })}</ul>}
          </div>
          <div className="discover-footnote"><Database size={13} /><span>{t(mode === 'catalog' ? 'catalogNote' : 'searchNote')}</span></div>
        </section>

        <div className={`center-column mobile-panel ${mobilePanel === 'map' ? 'mobile-active' : ''}`} id="panel-map">
          <KakaoMap jsKey={config.data?.js_key} configLoading={config.isLoading} places={places} selectedPlace={selectedPlace} onSelect={setSelectedPlace} onAdd={addPlace} dayPlaces={dayPlaces} day={plan.activeDay + 1} addedIds={addedIds} />
          <section className="table-panel panel" aria-labelledby="table-title">
            <div className="table-heading"><h2 id="table-title">{t('placesTable')}</h2><span>{t('resultCount', { count: places.length })}</span></div>
            <div className="table-scroll"><table data-testid={TRAVEL_TEST_IDS.PLACES_TABLE}><thead><tr><th>{t('tableName')}</th><th>{t('tableAddress')}</th><th>{t('tableDate')}</th><th><span className="sr-only">{t('tableAction')}</span></th></tr></thead><tbody>{places.map((place) => <tr key={place.id}><td><button onClick={() => setSelectedPlace(place)} className="table-place">{place.name}</button></td><td>{place.address || t('noAddress')}</td><td>{place.source_date || '—'}</td><td><button className="table-add" aria-label={t(addedIds.has(place.id) ? 'alreadyAdded' : 'addPlaceNamed', { name: place.name })} disabled={addedIds.has(place.id)} onClick={() => addPlace(place)}>{addedIds.has(place.id) ? <Check size={15} /> : <Plus size={16} />}</button></td></tr>)}</tbody></table>{!places.length && <p className="table-empty">{t('tableEmpty')}</p>}</div>
          </section>
        </div>

        <aside className={`plan-panel panel mobile-panel ${mobilePanel === 'plan' ? 'mobile-active' : ''}`} id="panel-plan" aria-labelledby="plan-title">
          <div className="panel-heading plan-heading"><span className="section-kicker">MY ITINERARY</span><h2 id="plan-title">{t('myTrip')}<span className="plan-sparkle"><Sparkles size={18} /></span></h2><p>{t('myTripSubtitle')}</p></div>
          <div className="plan-controls"><label htmlFor="trip-days"><CalendarDays size={15} />{t('tripDays')}</label><span className="day-select-wrap"><select id="trip-days" value={plan.days.length} onChange={(event) => changeDayCount(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((count) => <option key={count} value={count}>{t('dayCount', { count })}</option>)}</select><ChevronDown size={14} /></span></div>
          {pendingDays !== null && <div className="day-confirm" role="alert"><strong>{t('removeDaysTitle')}</strong><p>{t('removeDaysDescription', { count: pendingDays + 1 })}</p><div><button className="button secondary compact" onClick={() => setPendingDays(null)}>{t('cancel')}</button><button className="button primary compact" onClick={() => { planner.setDayCount(pendingDays); setPendingDays(null); }}>{t('removeDaysConfirm')}</button></div></div>}
          <div className="day-tabs" role="tablist" aria-label={t('tripDays')}>{plan.days.map((placesForDay, index) => <button role="tab" key={index} id={`day-tab-${index}`} aria-selected={plan.activeDay === index} aria-controls="day-itinerary" onClick={() => planner.setActiveDay(index)} className={plan.activeDay === index ? 'active' : ''}>{t('day', { day: index + 1 })}{placesForDay.length > 0 && <span>{placesForDay.length}</span>}</button>)}</div>
          <div className="day-itinerary" id="day-itinerary" role="tabpanel" aria-labelledby={`day-tab-${plan.activeDay}`}>
            <div className="day-caption"><span>{t('selectedDayCount', { count: dayPlaces.length })}</span><span className="small-dots">···</span></div>
            <ol className="itinerary-list" data-testid={TRAVEL_TEST_IDS.ITINERARY_LIST}>{dayPlaces.map((place, index) => <li key={place.id}>
              <span className="itinerary-number">{index + 1}</span><div className="itinerary-content"><button className="itinerary-place" onClick={() => selectPlace(place)}>{place.name}</button><p>{place.address || t('noAddress')}</p><div className="itinerary-actions"><button className="icon-button" disabled={index === 0} aria-label={t('moveUp', { name: place.name })} onClick={() => planner.movePlace(place.id, -1)}><ArrowUp size={14} /></button><button className="icon-button" disabled={index === dayPlaces.length - 1} aria-label={t('moveDown', { name: place.name })} onClick={() => planner.movePlace(place.id, 1)}><ArrowDown size={14} /></button><button className="icon-button remove-button" aria-label={t('removePlace', { name: place.name })} onClick={() => planner.removePlace(place.id)}><Trash2 size={14} /></button></div></div>
            </li>)}</ol>
            {!dayPlaces.length && <div className="empty-plan"><div className="empty-plan-illustration"><span className="empty-orbit orbit-one" /><span className="empty-orbit orbit-two" /><span className="empty-orbit orbit-three" /><MapPin size={42} strokeWidth={1.35} /><span className="empty-plus">+</span></div><span className="empty-plan-eyebrow">DAY {String(plan.activeDay + 1).padStart(2, '0')}</span><h3>{t('emptyPlanTitle')}</h3><p className="desktop-empty-description">{t('emptyPlanDescription')}</p><p className="mobile-empty-description">{t('emptyPlanMobile')}</p><span className="empty-plan-bottom"><Footprints size={14} />{t('emptyPlanBadge')}</span></div>}
          </div>
          <div className="plan-summary"><div><span><Route size={15} />{t('planDistance')}</span><strong>{number.format(distance)}<small>km</small></strong></div><p>{t('planDistanceHint')}</p></div>
          <div className="plan-bottom"><Check size={13} /><span>{t('localBadge')}</span></div>
        </aside>
      </div>
      <footer className="workspace-footer"><div className="source-line"><Database size={13} /><span>{t('source')} {data ? sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{data.source} <ArrowUpRight size={12} /></a> : data.source : t(result.isLoading ? 'sourceLoading' : 'sourceUnavailable')}</span>{data && <><span className="source-divider" /><span>{t('sourceDate', { date: sourceDate })}</span></>}</div><p>{t('footerNote')}</p></footer>
    </div>
  );
}
