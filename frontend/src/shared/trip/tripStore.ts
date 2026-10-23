/**
 * 여행 공통 상태 (모든 화면이 같은 여행을 본다) — 소유: 여원. 액션 추가·변경은 여원 리뷰.
 *
 *   홈            setTrip, setTaste
 *   어디 갈까?     addCandidate, removeCandidate
 *   언제 갈까?     addToDay, removeFromDay, moveItem
 *   어떻게 갈까?   읽기 전용 (days[n].items 의 연속된 두 항목 = 한 구간)
 *   날씨 대안      replaceItem (그 항목의 장소만 교체, 날짜·순서·메모 유지)
 *   AI 도슨트      selectPlace / 읽기 (selectedPlaceId)
 *
 * 화면에서는 useTrip(selector) 로 읽고, tripActions.xxx() 로 바꾼다.
 */
import { useSyncExternalStore } from 'react';
import type { Place } from '../../api/client';

export interface VisitItem { placeId: string; memo: string; visited: boolean }
export interface TripDay { date: string; items: VisitItem[] }
export interface Trip {
  version: 1;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  taste: string | null;               // 취향 테스트 결과 유형 id
  places: Record<string, Place>;      // 장소 id → 장소 (후보·일정·해설이 같은 id 참조)
  candidateIds: string[];             // 후보함 (일정에 넣어도 빠지지 않음)
  days: TripDay[];
  selectedPlaceId: string | null;
}

const STORAGE_KEY = 'pinday.trip.v1';

function makeDays(startDate: string, endDate: string, previous: TripDay[] = []): TripDay[] {
  const days: TripDay[] = [];
  const end = new Date(`${endDate}T00:00:00`);
  for (let day = new Date(`${startDate}T00:00:00`); day <= end && days.length < 14; day.setDate(day.getDate() + 1)) {
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    days.push({ date, items: previous.find((d) => d.date === date)?.items ?? [] });
  }
  return days;
}

function emptyTrip(): Trip {
  return { version: 1, destination: '', startDate: '', endDate: '', taste: null, places: {}, candidateIds: [], days: [], selectedPlaceId: null };
}

function load(): Trip {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Trip | null;
    return parsed?.version === 1 ? parsed : emptyTrip();
  } catch {
    return emptyTrip();
  }
}

let trip: Trip = typeof window === 'undefined' ? emptyTrip() : load();
const listeners = new Set<() => void>();

function update(next: (current: Trip) => Trip) {
  trip = next(trip);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trip)); } catch { /* 저장 실패해도 화면은 계속 동작 */ }
  listeners.forEach((listener) => listener());
}

function mapDay(current: Trip, dayIndex: number, fn: (items: VisitItem[]) => VisitItem[]): Trip {
  return { ...current, days: current.days.map((day, index) => (index === dayIndex ? { ...day, items: fn(day.items) } : day)) };
}

export const tripActions = {
  setTrip(destination: string, startDate: string, endDate: string) {
    update((current) => ({ ...current, destination, startDate, endDate, days: makeDays(startDate, endDate, current.days) }));
  },
  setTaste(taste: string | null) { update((current) => ({ ...current, taste })); },
  addCandidate(place: Place) {
    update((current) => ({
      ...current,
      places: { ...current.places, [place.id]: place },
      candidateIds: current.candidateIds.includes(place.id) ? current.candidateIds : [...current.candidateIds, place.id],
    }));
  },
  removeCandidate(placeId: string) {
    update((current) => ({ ...current, candidateIds: current.candidateIds.filter((id) => id !== placeId) }));
  },
  addToDay(dayIndex: number, placeId: string) {
    update((current) => mapDay(current, dayIndex, (items) => (items.some((item) => item.placeId === placeId) ? items : [...items, { placeId, memo: '', visited: false }])));
  },
  removeFromDay(dayIndex: number, itemIndex: number) {
    update((current) => mapDay(current, dayIndex, (items) => items.filter((_, index) => index !== itemIndex)));
  },
  moveItem(dayIndex: number, from: number, to: number) {
    update((current) => mapDay(current, dayIndex, (items) => {
      if (to < 0 || to >= items.length) return items;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    }));
  },
  replaceItem(dayIndex: number, itemIndex: number, place: Place) {
    update((current) => ({
      ...mapDay(current, dayIndex, (items) => items.map((item, index) => (index === itemIndex ? { ...item, placeId: place.id } : item))),
      places: { ...current.places, [place.id]: place },
    }));
  },
  selectPlace(placeId: string | null) { update((current) => ({ ...current, selectedPlaceId: placeId })); },
  reset() { update(emptyTrip); },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 예: const days = useTrip((t) => t.days) — 원시값이나 trip 안의 기존 객체를 고를 것 (새 배열을 만들어 반환하지 않기) */
export function useTrip<T>(selector: (trip: Trip) => T): T {
  return useSyncExternalStore(subscribe, () => selector(trip));
}

export const scheduledCount = (t: Trip) => t.days.reduce((total, day) => total + day.items.length, 0);
