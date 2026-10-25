import { describe, expect, it } from 'vitest';
import { resolveProvince } from './regions';

const provinces = ['강원도', '강원특별자치도', '부산광역시', '서울특별시'];

describe('resolveProvince', () => {
  it('accepts the full name or the short name the home page saves', () => {
    expect(resolveProvince('부산광역시', provinces)).toBe('부산광역시');
    expect(resolveProvince('부산', provinces)).toBe('부산광역시');
    expect(resolveProvince(' 서울 ', provinces)).toBe('서울특별시');
  });

  it('refuses ambiguous or unknown names instead of guessing', () => {
    expect(resolveProvince('강원', provinces)).toBe('');
    expect(resolveProvince('제주', provinces)).toBe('');
    expect(resolveProvince('', provinces)).toBe('');
  });
});
