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
 * 후보함(candidateIds)과 일정(days)은 따로 저장한다: 일정에 넣어도 후보에서 빠지지 않고,
 * 후보에서 빼도 일정은 그대로다. "미배치"는 저장하지 않고 unscheduledIds 로 계산한다.
 */
import { useSyncExternalStore } from 'react';
import type { Place } from '../../api/client';

export interface VisitItem { placeId: string; memo: string; visited: boolean }
export interface TripDay { date: string; items: VisitItem[] }
export interface Trip {
  version: 1;
  destination: string;                // 시·도. 전체 이름('부산광역시') 권장, 짧은 이름('부산')도 resolveProvince 로 풀린다
  startDate: string; // YYYY-MM-DD
  endDate: string;
  taste: string | null;               // 취향 테스트 결과 유형 id
  places: Record<string, Place>;      // 장소 id → 장소 (후보·일정·해설이 같은 id 참조)
  candidateIds: string[];             // 후보함 (일정에 넣어도 빠지지 않음)
  days: TripDay[];
  selectedPlaceId: string | null;
}
export type StorageIssue = 'storageError' | 'storageInvalid';

const STORAGE_KEY = 'pinday.trip.v1';
// 이전 /workspace 화면이 저장하던 일차별 장소 목록. 처음 한 번 후보·일정으로 옮긴다.
const LEGACY_PLAN_KEY = 'ohzoohzo.travel.plan.v1';
export const MAX_DAYS = 14;

const isoDate = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

/** 날짜를 바꿔도 DAY 1·DAY 2… 의 방문 목록은 순서대로 이어진다. 줄어든 날의 장소는 후보함에 남는다. */
export function makeDays(startDate: string, endDate: string, previous: TripDay[] = []): TripDay[] {
  const days: TripDay[] = [];
  const end = new Date(`${endDate}T00:00:00`);
  for (let day = new Date(`${startDate}T00:00:00`); day <= end && days.length < MAX_DAYS; day.setDate(day.getDate() + 1)) {
    days.push({ date: isoDate(day), items: previous[days.length]?.items ?? [] });
  }
  return days;
}

export function emptyTrip(): Trip {
  return { version: 1, destination: '', startDate: '', endDate: '', taste: null, places: {}, candidateIds: [], days: [], selectedPlaceId: null };
}

function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return ['id', 'name', 'address', 'category', 'description', 'phone', 'source', 'url'].every((key) => typeof p[key] === 'string')
    && (p.id as string).length > 0 && (p.name as string).length > 0
    && typeof p.latitude === 'number' && Number.isFinite(p.latitude)
    && typeof p.longitude === 'number' && Number.isFinite(p.longitude)
    && (p.source_date === null || typeof p.source_date === 'string');
}

/** 저장된 값이 깨졌으면(직접 수정·이전 버전) 화면이 엉뚱한 id 를 읽지 않도록 거부한다. */
export function isTrip(value: unknown): value is Trip {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  if (t.version !== 1 || typeof t.destination !== 'string' || typeof t.startDate !== 'string' || typeof t.endDate !== 'string') return false;
  if (!(t.taste === null || typeof t.taste === 'string') || !(t.selectedPlaceId === null || typeof t.selectedPlaceId === 'string')) return false;
  if (typeof t.places !== 'object' || t.places === null || !Object.entries(t.places).every(([id, place]) => isPlace(place) && place.id === id)) return false;
  const known = (id: unknown) => typeof id === 'string' && id in (t.places as object);
  if (!Array.isArray(t.candidateIds) || !t.candidateIds.every(known) || new Set(t.candidateIds).size !== t.candidateIds.length) return false;
  return Array.isArray(t.days) && t.days.length <= MAX_DAYS && t.days.every((day: unknown) => {
    const d = day as TripDay | null;
    return typeof d === 'object' && d !== null && typeof d.date === 'string' && Array.isArray(d.items)
      && d.items.every((item) => typeof item === 'object' && item !== null && known(item.placeId) && typeof item.memo === 'string' && typeof item.visited === 'boolean');
  });
}

export function migrateLegacyPlan(value: unknown): Trip | null {
  const legacy = value as { version?: unknown; days?: unknown } | null;
  if (legacy?.version !== 1 || !Array.isArray(legacy.days) || !legacy.days.every((day) => Array.isArray(day) && day.every(isPlace))) return null;
  const trip = emptyTrip();
  for (const day of legacy.days as Place[][]) {
    for (const place of day) {
      trip.places[place.id] = place;
      if (!trip.candidateIds.includes(place.id)) trip.candidateIds.push(place.id);
    }
  }
  // 날짜가 없던 일정이라 DAY 순서만 보존하고, 여행 조건을 정하면 그 날짜에 붙는다.
  trip.days = (legacy.days as Place[][]).slice(0, MAX_DAYS).map((day) => ({ date: '', items: day.map((place) => ({ placeId: place.id, memo: '', visited: false })) }));
  return trip.candidateIds.length ? trip : null;
}

function load(): { trip: Trip; issue: StorageIssue | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return isTrip(parsed) ? { trip: parsed, issue: null } : { trip: emptyTrip(), issue: 'storageInvalid' };
    }
    const legacy = localStorage.getItem(LEGACY_PLAN_KEY);
    return { trip: (legacy && migrateLegacyPlan(JSON.parse(legacy))) || emptyTrip(), issue: null };
  } catch {
    return { trip: emptyTrip(), issue: 'storageError' };
  }
}

const initial = typeof window === 'undefined' ? { trip: emptyTrip(), issue: null } : load();
let trip: Trip = initial.trip;
let storageIssue: StorageIssue | null = initial.issue;
const listeners = new Set<() => void>();

function persist() {
  // 읽지 못한 저장값은 사용자가 "다시 저장"을 고르기 전까지 덮어쓰지 않는다.
  if (storageIssue === 'storageInvalid') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trip)); storageIssue = null; }
  catch { storageIssue = 'storageError'; }
}

function update(next: (current: Trip) => Trip) {
  const changed = next(trip);
  if (changed === trip) return;
  trip = changed;
  persist();
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
    update((current) => (current.days[dayIndex] && placeId in current.places
      ? mapDay(current, dayIndex, (items) => (items.some((item) => item.placeId === placeId) ? items : [...items, { placeId, memo: '', visited: false }]))
      : current));
  },
  removeFromDay(dayIndex: number, itemIndex: number) {
    update((current) => mapDay(current, dayIndex, (items) => items.filter((_, index) => index !== itemIndex)));
  },
  moveItem(dayIndex: number, from: number, to: number) {
    update((current) => mapDay(current, dayIndex, (items) => {
      if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
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
  /** 저장 실패·읽기 실패 뒤 사용자가 고른 경우에만: 지금 화면의 여행으로 저장값을 덮어쓴다. */
  retryStorage() {
    storageIssue = null;
    persist();
    listeners.forEach((listener) => listener());
  },
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

export const useTripStorageIssue = () => useSyncExternalStore(subscribe, () => storageIssue);
export const getTrip = () => trip;

export const scheduledCount = (t: Trip) => t.days.reduce((total, day) => total + day.items.length, 0);
/** 후보함 중 어느 날짜에도 없는 장소 (화면에서 useMemo 로 감싸 쓴다) */
export const unscheduledIds = (t: Trip) => {
  const scheduled = new Set(t.days.flatMap((day) => day.items.map((item) => item.placeId)));
  return t.candidateIds.filter((id) => !scheduled.has(id));
};
export const scheduledDayOf = (t: Trip, placeId: string) => {
  const index = t.days.findIndex((day) => day.items.some((item) => item.placeId === placeId));
  return index < 0 ? null : index;
};
