import type { Place } from '../api/client';

// Catalog regions are "<시·도> <시·군·구>"; the trip destination is the 시·도.
const SHORT_PROVINCE: Record<string, string> = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주',
  대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원도: '강원',
  강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전북특별자치도: '전북',
  전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주', 전남광주통합특별시: '전남·광주',
};

export const shortProvince = (province: string) => SHORT_PROVINCE[province] ?? province;

export function provincesOf(regions: string[]): string[] {
  return [...new Set(regions.map((region) => region.split(' ')[0]!))].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function districtsOf(regions: string[], province: string): string[] {
  const prefix = `${province} `;
  return [...new Set(regions.filter((region) => region.startsWith(prefix)).map((region) => region.slice(prefix.length)))]
    .sort((a, b) => a.localeCompare(b, 'ko'));
}

// Kakao writes "부산 중구 …", the catalog "부산광역시 중구 …": the district follows the first word either way.
export function districtOf(place: Place): string {
  return place.address.split(/\s+/)[1] ?? '';
}

export function inDistrict(place: Place, district: string): boolean {
  const rest = place.address.split(/\s+/).slice(1).join(' ');
  return rest === district || rest.startsWith(`${district} `);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function parse(iso: string): Date { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y!, m! - 1, d!)); }

export function addDays(iso: string, days: number): string {
  const date = parse(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDay(iso: string): string {
  const date = parse(iso);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()} (${WEEKDAYS[date.getUTCDay()]})`;
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const tripLengthLabel = (dayCount: number) => dayCount === 1 ? '당일' : `${dayCount - 1}박 ${dayCount}일`;
