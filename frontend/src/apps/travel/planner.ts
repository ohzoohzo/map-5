import { useEffect, useState } from 'react';
import type { Place } from '../../api/client';

const STORAGE_KEY = 'ohzoohzo.travel.plan.v1';
export interface Plan { version: 1; days: Place[][]; activeDay: number }
const emptyPlan = (): Plan => ({ version: 1, days: [[], [], []], activeDay: 0 });

function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  const stringFields = ['id', 'name', 'address', 'category', 'description', 'phone', 'source', 'url'];
  return stringFields.every((key) => typeof p[key] === 'string')
    && typeof p.id === 'string' && p.id.length > 0
    && typeof p.name === 'string' && p.name.length > 0
    && typeof p.latitude === 'number' && Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90
    && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180
    && (p.source_date === null || typeof p.source_date === 'string');
}

function isPlan(value: unknown): value is Plan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Record<string, unknown>;
  if (plan.version !== 1 || !Array.isArray(plan.days) || plan.days.length < 1 || plan.days.length > 7) return false;
  if (!Number.isInteger(plan.activeDay) || typeof plan.activeDay !== 'number' || plan.activeDay < 0 || plan.activeDay >= plan.days.length) return false;
  return plan.days.every((day: unknown) => Array.isArray(day) && day.length <= 200 && day.every(isPlace)
    && new Set(day.map((place: Place) => place.id)).size === day.length);
}

function readPlan(): { plan: Plan; issue: 'storageError' | 'storageInvalid' | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { plan: emptyPlan(), issue: null };
    const parsed: unknown = JSON.parse(raw);
    return isPlan(parsed) ? { plan: parsed, issue: null } : { plan: emptyPlan(), issue: 'storageInvalid' };
  } catch {
    return { plan: emptyPlan(), issue: 'storageError' };
  }
}

export function usePlanner() {
  const [initial] = useState(readPlan);
  const [plan, setPlan] = useState(initial.plan);
  const [storageIssue, setStorageIssue] = useState(initial.issue);
  const [persistenceEnabled, setPersistenceEnabled] = useState(initial.issue === null);
  useEffect(() => {
    if (!persistenceEnabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setStorageIssue(null);
    } catch {
      setStorageIssue('storageError');
      setPersistenceEnabled(false);
    }
  }, [plan, persistenceEnabled]);

  function retryStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setStorageIssue(null);
      setPersistenceEnabled(true);
    } catch { setStorageIssue('storageError'); }
  }
  function setActiveDay(activeDay: number) { setPlan((current) => ({ ...current, activeDay })); }
  function setDayCount(count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 7) return;
    setPlan((current) => ({
      ...current,
      days: Array.from({ length: count }, (_, index) => current.days[index] ?? []),
      activeDay: Math.min(current.activeDay, count - 1),
    }));
  }
  function addPlace(place: Place): 'added' | 'duplicate' | 'limit' {
    const currentDay = plan.days[plan.activeDay]!;
    if (currentDay.some((entry) => entry.id === place.id)) return 'duplicate';
    if (currentDay.length >= 200) return 'limit';
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, index) => index === current.activeDay && !day.some((entry) => entry.id === place.id) ? [...day, place] : day),
    }));
    return 'added';
  }
  function removePlace(id: string) {
    setPlan((current) => ({ ...current, days: current.days.map((day, index) => index === current.activeDay ? day.filter((place) => place.id !== id) : day) }));
  }
  function movePlace(id: string, offset: -1 | 1) {
    setPlan((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) => {
        if (dayIndex !== current.activeDay) return day;
        const index = day.findIndex((place) => place.id === id);
        const targetIndex = index + offset;
        if (index < 0 || targetIndex < 0 || targetIndex >= day.length) return day;
        const updated = [...day];
        [updated[index], updated[targetIndex]] = [updated[targetIndex]!, updated[index]!];
        return updated;
      }),
    }));
  }
  return { plan, storageIssue, retryStorage, setActiveDay, setDayCount, addPlace, removePlace, movePlace };
}

export function straightLineDistance(places: Place[]): number {
  let total = 0;
  const radians = (value: number) => value * Math.PI / 180;
  for (let index = 1; index < places.length; index += 1) {
    const previous = places[index - 1]!;
    const current = places[index]!;
    const latitudeDelta = radians(current.latitude - previous.latitude);
    const longitudeDelta = radians(current.longitude - previous.longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(previous.latitude)) * Math.cos(radians(current.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    total += 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  }
  return total;
}
