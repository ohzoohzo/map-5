import { useSyncExternalStore } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { Place } from '../../api/client';
import type { TripDay } from '../../shared/trip/tripStore';
import { weatherAlternatives, weatherForecast } from '../../api/generated/weather/weather';
import { searchPlaces } from '../../api/generated/travel/travel';
import type { WeatherAlternative, WeatherSlot } from '../../api/generated/model';

// 생성 함수는 4xx/5xx 에서 ApiError 를 던진다 (#26). 장소가 정해지기 전엔 요청하지 않도록 enabled 로 막는다.
// 예보·대안 요청은 화면 여러 곳(예보 카드, 변경 추천 일정, 플로팅 바)이 같은 캐시를 나눠 쓴다.
const forecastQuery = (place: Place | undefined, date: string | undefined) => ({
  queryKey: ['weather', 'forecast', place?.latitude, place?.longitude, date] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => weatherForecast({ latitude: place!.latitude, longitude: place!.longitude, date: date! }, { signal }),
  enabled: place !== undefined && Boolean(date),
  staleTime: 10 * 60_000,
});
const alternativesQuery = (place: Place | undefined, enabled = true) => ({
  queryKey: ['weather', 'alternatives', place?.id] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => weatherAlternatives({ latitude: place!.latitude, longitude: place!.longitude, name: place!.name }, { signal }),
  enabled: enabled && place !== undefined,
  staleTime: Infinity,
});

export function useForecast(place: Place | undefined, date: string | undefined) {
  return useQuery(forecastQuery(place, date));
}

/**
 * 변경 추천: 비가 예상되고, 이름으로 실내 시설이라고 볼 수 없는(야외일 수 있는) 장소만 추천한다.
 * 운영일 정보는 관광 데이터에 없어 아직 판단하지 않는다. 추천이 아니어도 사용자는 직접 바꿀 수 있다.
 */
export type ChangeAdvice = 'recommend' | 'optional' | 'pending' | 'unknown';

// 서버의 실내 판단은 관광지 이름 속 시설 단어(박물관 등)만 본다. 식당·카페·쇼핑몰은 대부분 실내라
// 카카오 장소 분류('음식점', '카페', '쇼핑,유통 > 쇼핑몰' 등)와 이름으로 먼저 걸러 낸다.
// 카카오는 카페를 '음식점 > 카페'로 분류하므로 카페를 식당보다 먼저 본다
const LIKELY_INDOOR: [RegExp, string][] = [
  [/카페|커피|디저트/, '카페'],
  [/음식점|식당|레스토랑|맛집|베이커리|제과/, '식당'],
  [/온천(?!천)|건강랜드|찜질|스파|사우나|목욕탕|대중탕/, '온천·스파'],
  // '몰운대'·'스마트팜'처럼 이름 중간에 든 몰·마트는 빼고, 단어 끝의 몰·마트만 본다
  [/쇼핑|백화점|아울렛|몰(?=\s|$)|마트(?=\s|$)|면세점/, '쇼핑'],
];
/** 실내일 가능성이 큰 장소면 그 근거(식당·카페·쇼핑), 아니면 null */
export function likelyIndoor(place: Place): string | null {
  const text = [place.category, place.description, place.name].join(' ');
  return LIKELY_INDOOR.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
type ForecastResult = ReturnType<typeof useForecast>;
type AlternativesResult = ReturnType<typeof useAlternatives>;
const isRainy = (forecast: Pick<ForecastResult, 'data'>) => forecast.data?.status === 'ok' && summarizeRain(forecast.data.slots).rainy;

function adviceOf(place: Place, date: string, forecast: Pick<ForecastResult, 'data' | 'isError' | 'isPending'>, alternatives: Pick<AlternativesResult, 'data' | 'isError'>): ChangeAdvice {
  if (likelyIndoor(place)) return 'optional';
  if (!date || forecast.isError || forecast.data?.status === 'out_of_range') return 'unknown';
  if (forecast.isPending) return 'pending';
  if (!isRainy(forecast)) return 'optional';
  if (alternatives.isError) return 'recommend'; // 실내 여부를 모르면 비 소식만으로 추천한다
  if (!alternatives.data) return 'pending';
  return alternatives.data.origin_indoor_hint ? 'optional' : 'recommend';
}

export function useChangeAdvice(place: Place, date: string): ChangeAdvice {
  const forecast = useForecast(place, date);
  const alternatives = useQuery(alternativesQuery(place, isRainy(forecast) && !likelyIndoor(place)));
  return adviceOf(place, date, forecast, alternatives);
}

/** 날짜가 정해진 일정 장소 중 변경 추천(비 예보 + 야외일 수 있음)인 일정 수를 센다. */
export function useRecommendedCount(days: TripDay[], places: Record<string, Place>) {
  const targets = days.flatMap((day) => (day.date ? day.items : [])
    .map((item) => ({ date: day.date, place: places[item.placeId] }))
    .filter((target): target is { date: string; place: Place } => target.place !== undefined));
  const forecasts = useQueries({ queries: targets.map(({ place, date }) => forecastQuery(place, date)) });
  const alternatives = useQueries({ queries: targets.map(({ place }, index) => alternativesQuery(place, isRainy(forecasts[index]!) && !likelyIndoor(place))) });
  return { count: targets.filter((target, index) => adviceOf(target.place, target.date, forecasts[index]!, alternatives[index]!) === 'recommend').length };
}

/** 날씨 화면에서 바꾼 일정. 날짜(없으면 DAY 번호)와 새 장소로 기억하고, 그 장소가 아직 그날 일정에 있을 때만 '변경한 일정'으로 센다. */
type Replacement = { day: string; placeId: string; from?: string; fromId?: string };
const REPLACED_KEY = 'pinday.weather.replaced.v1';
const replacedListeners = new Set<() => void>();
let replacedCache: Replacement[] | null = null;

function readReplaced(): Replacement[] {
  if (replacedCache) return replacedCache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REPLACED_KEY) ?? '[]');
    replacedCache = Array.isArray(parsed) ? parsed.filter((entry): entry is Replacement => typeof entry?.day === 'string' && typeof entry?.placeId === 'string'
      && (entry.from === undefined || typeof entry.from === 'string') && (entry.fromId === undefined || typeof entry.fromId === 'string')) : [];
  } catch { replacedCache = []; }
  return replacedCache;
}

const dayKey = (day: TripDay, index: number) => day.date || `day-${index + 1}`;

function saveReplaced(next: Replacement[]) {
  replacedCache = next;
  try { localStorage.setItem(REPLACED_KEY, JSON.stringify(next)); } catch { /* 저장이 막혀도 이번 방문 동안은 센다 */ }
  replacedListeners.forEach((listener) => listener());
}

export function recordReplacement(day: TripDay, dayIndex: number, placeId: string, from: Place) {
  const entry = { day: dayKey(day, dayIndex), placeId, from: from.name, fromId: from.id };
  saveReplaced([...readReplaced().filter((each) => each.day !== entry.day || each.placeId !== placeId), entry]);
}

/** 되돌리기: 그 기록만 지운다. 두 번 바꾼 일정이면 앞선 기록(원래 → 첫 교체)이 다시 보인다. */
export function forgetReplacement(day: TripDay, dayIndex: number, placeId: string) {
  saveReplaced(readReplaced().filter((each) => each.day !== dayKey(day, dayIndex) || each.placeId !== placeId));
}

export function useReplacedDays(days: TripDay[]) {
  const replaced = useSyncExternalStore((listener) => { replacedListeners.add(listener); return () => replacedListeners.delete(listener); }, readReplaced, readReplaced);
  const entryFor = (dayIndex: number, placeId: string) => {
    const day = days[dayIndex];
    return day ? replaced.find((entry) => entry.day === dayKey(day, dayIndex) && entry.placeId === placeId) : undefined;
  };
  const perDay = days.map((day, index) => day.items.filter((item) => entryFor(index, item.placeId)).length);
  return { count: perDay.reduce((total, each) => total + each, 0), perDay, entryFor };
}

export function useAlternatives(place: Place | undefined) {
  return useQuery(alternativesQuery(place));
}

/** 바꿔볼 장소 하나. indoor: 서버가 찾은 근처 실내 관광지, saved: 후보함에 담은 같은 종류, nearby: 근처에서 찾은 같은 종류 */
export type SwapOption = WeatherAlternative & { origin: 'indoor' | 'saved' | 'nearby' };

// 카페·식당은 박물관 같은 실내 관광지 대신 같은 종류로 바꿔 준다 (카카오 분류 코드)
const SAME_KIND: Record<string, { query: string; category: 'CE7' | 'FD6' }> = {
  카페: { query: '카페', category: 'CE7' },
  식당: { query: '맛집', category: 'FD6' },
};
const NEARBY_KM = 3;
const MAX_OPTIONS = 8;

function distanceKm(a: Place, b: Place) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

const byDistance = (a: SwapOption, b: SwapOption) => a.distance_km - b.distance_km;

/**
 * 카페·식당이면 같은 종류로 바꿀 곳을 고른다: 후보함에 담은 같은 종류가 있으면 그곳들, 없으면 근처를 검색한다.
 * 카페·식당이 아니면 kind 가 null 이고, 화면은 기존 실내 대안을 쓴다.
 */
export function useSameKindOptions(place: Place | undefined, candidates: Place[]) {
  const kind = place ? likelyIndoor(place) : null;
  const spec = kind ? SAME_KIND[kind] : undefined;
  const saved: SwapOption[] = spec && place
    ? candidates.filter((each) => each.id !== place.id && likelyIndoor(each) === kind)
      .map((each) => ({ place: each, distance_km: distanceKm(place, each), indoor_hint: kind!, origin: 'saved' as const })).sort(byDistance)
    : [];
  const nearby = useQuery({
    queryKey: ['weather', 'same-kind', place?.id, spec?.category] as const,
    enabled: spec !== undefined && place !== undefined && saved.length === 0,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      // '부산 해운대구 카페'처럼 원래 장소의 시·구로 검색하고 가까운 순으로 고른다
      const area = place!.address.split(/\s+/).slice(0, 2).join(' ');
      const result = await searchPlaces({ query: `${area} ${spec!.query}`.trim(), category: spec!.category }, { signal });
      const options = result.places.filter((each) => each.id !== place!.id && each.name !== place!.name)
        .map((each) => ({ place: each, distance_km: distanceKm(place!, each), indoor_hint: kind!, origin: 'nearby' as const })).sort(byDistance);
      const close = options.filter((option) => option.distance_km <= NEARBY_KM);
      return (close.length ? close : options).slice(0, MAX_OPTIONS);
    },
  });
  return { kind: spec ? kind : null, saved, nearby };
}

const hourOf = (slot: WeatherSlot) => Number(slot.time.slice(11, 13));

export type RainSummary =
  | { rainy: true; start: number; end: number; max: number }
  | { rainy: false; max: number; minTemp: number; maxTemp: number };

/** 3시간 칸 중 비 예상 칸의 처음~끝(+3시간)을 한 구간으로 요약한다. */
export function summarizeRain(slots: WeatherSlot[]): RainSummary {
  const rainy = slots.filter((slot) => slot.rain_expected);
  const max = Math.max(0, ...slots.map((slot) => slot.rain_probability));
  if (rainy.length === 0) {
    const temps = slots.map((slot) => slot.temperature);
    return { rainy: false, max, minTemp: Math.round(Math.min(...temps)), maxTemp: Math.round(Math.max(...temps)) };
  }
  return { rainy: true, start: hourOf(rainy[0]!), end: Math.min(24, hourOf(rainy[rainy.length - 1]!) + 3), max };
}

/** 비 구간을 시안처럼 '오전/오후/저녁/종일'로 부른다. 애매하면 빈 문자열 */
export function rainPeriod(start: number, end: number): string {
  if (start <= 3 && end >= 21) return '종일';
  if (start >= 18) return '저녁';
  if (start >= 12) return '오후';
  if (end <= 12) return '오전';
  return '';
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-10-25' → '10.25 일요일' (예보 카드 머리글) */
export function formatDayLong(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const day = new Date(`${date}T00:00:00`);
  return `${day.getMonth() + 1}.${day.getDate()} ${WEEKDAYS[day.getDay()]}요일`;
}

/** '2026-10-25' → '10.25 (일)'. 날짜가 아직 없는 DAY(이전 일정에서 옮겨 온 경우)는 빈 문자열 */
export function formatDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const day = new Date(`${date}T00:00:00`);
  return `${day.getMonth() + 1}.${day.getDate()} (${WEEKDAYS[day.getDay()]})`;
}

/** '2026-10-23T16:46:04+09:00' → '16:46' */
export const formatClock = (time: string) => time.slice(11, 16);
