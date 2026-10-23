import { useQuery } from '@tanstack/react-query';
import type { Place } from '../../api/client';
import { weatherAlternatives, weatherForecast } from '../../api/generated/weather/weather';
import type { WeatherSlot } from '../../api/generated/model';

// 생성 함수는 4xx/5xx 에서 ApiError 를 던진다 (#26). 장소가 정해지기 전엔 요청하지 않도록 enabled 로 막는다.
export function useForecast(place: Place | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['weather', 'forecast', place?.latitude, place?.longitude, date],
    queryFn: ({ signal }) => weatherForecast({ latitude: place!.latitude, longitude: place!.longitude, date: date! }, { signal }),
    enabled: place !== undefined && Boolean(date),
    staleTime: 10 * 60_000,
  });
}

export function useAlternatives(place: Place | undefined) {
  return useQuery({
    queryKey: ['weather', 'alternatives', place?.id],
    queryFn: ({ signal }) => weatherAlternatives({ latitude: place!.latitude, longitude: place!.longitude, name: place!.name }, { signal }),
    enabled: place !== undefined,
    staleTime: Infinity,
  });
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
