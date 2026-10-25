import { describe, expect, it } from 'vitest';
import { scoreTaste } from './data';

describe('scoreTaste', () => {
  it('마지막 답보다 가장 많이 고른 유형을 우선한다', () => {
    expect(scoreTaste(['culture', 'culture', 'active', 'culture', 'sea-healing'])).toBe('culture');
  });

  it('동점인 유형 중 더 뒤 문항에서 고른 유형을 선택한다', () => {
    expect(scoreTaste(['slow-alley', 'sea-healing', 'slow-alley', 'sea-healing', 'active'])).toBe('sea-healing');
  });
});
