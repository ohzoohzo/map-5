import { beforeEach, describe, expect, it } from 'vitest';
import type { Place } from '../../api/client';
import { emptyTrip, getTrip, isTrip, makeDays, migrateLegacyPlan, scheduledDayOf, tripActions, unscheduledIds } from './tripStore';

const place = (id: string): Place => ({
  id, name: `장소 ${id}`, address: '부산광역시 중구 중앙대로 1', latitude: 35.1, longitude: 129.03,
  category: '관광지', description: '', phone: '', source: '검증', source_date: null, url: '',
});

describe('tripStore', () => {
  beforeEach(() => tripActions.reset());

  it('keeps the candidate box and the schedule separate', () => {
    tripActions.setTrip('부산광역시', '2026-10-24', '2026-10-26');
    ['a', 'b', 'c'].forEach((id) => tripActions.addCandidate(place(id)));
    tripActions.addToDay(0, 'a');
    tripActions.addToDay(0, 'b');
    tripActions.addToDay(0, 'a');
    expect(getTrip().days[0]!.items.map((item) => item.placeId)).toEqual(['a', 'b']);
    expect(unscheduledIds(getTrip())).toEqual(['c']);
    tripActions.removeCandidate('a');
    expect(scheduledDayOf(getTrip(), 'a')).toBe(0);
    expect(getTrip().candidateIds).toEqual(['b', 'c']);
  });

  it('ignores unknown places and days, and out-of-range moves', () => {
    tripActions.setTrip('부산광역시', '2026-10-24', '2026-10-24');
    tripActions.addToDay(0, 'ghost');
    tripActions.addCandidate(place('a'));
    tripActions.addToDay(4, 'a');
    expect(getTrip().days[0]!.items).toEqual([]);
    tripActions.addToDay(0, 'a');
    const before = getTrip();
    tripActions.moveItem(0, 0, 3);
    expect(getTrip().days).toEqual(before.days);
  });

  it('keeps DAY order when the dates move and returns cut days to the box', () => {
    tripActions.setTrip('부산광역시', '2026-10-24', '2026-10-26');
    tripActions.addCandidate(place('a'));
    tripActions.addCandidate(place('b'));
    tripActions.addToDay(1, 'a');
    tripActions.addToDay(2, 'b');
    tripActions.setTrip('부산광역시', '2026-11-01', '2026-11-02');
    expect(getTrip().days.map((day) => day.date)).toEqual(['2026-11-01', '2026-11-02']);
    expect(getTrip().days[1]!.items.map((item) => item.placeId)).toEqual(['a']);
    expect(unscheduledIds(getTrip())).toEqual(['b']);
  });

  it('builds at most 14 days and validates stored shapes', () => {
    expect(makeDays('2026-10-01', '2026-12-01')).toHaveLength(14);
    expect(isTrip(emptyTrip())).toBe(true);
    expect(isTrip({ ...emptyTrip(), candidateIds: ['ghost'] })).toBe(false);
    const migrated = migrateLegacyPlan({ version: 1, activeDay: 0, days: [[place('a')], [place('b'), place('a')]] });
    expect(migrated && isTrip(migrated)).toBe(true);
    expect(migrated?.candidateIds).toEqual(['a', 'b']);
    expect(migrated?.days.map((day) => day.items.map((item) => item.placeId))).toEqual([['a'], ['b', 'a']]);
  });
});
