import { expect, test } from './support';

const places = {
  harbor: {
    id: 'harbor',
    name: '부산항',
    address: '부산광역시 중구',
    latitude: 35.1028,
    longitude: 129.0403,
    category: '관광지',
    description: '',
    phone: '',
    source: 'test',
    source_date: null,
    url: '',
  },
  market: {
    id: 'market',
    name: '국제시장',
    address: '부산광역시 중구 신창동',
    latitude: 35.1014,
    longitude: 129.0287,
    category: '시장',
    description: '',
    phone: '',
    source: 'test',
    source_date: null,
    url: '',
  },
  village: {
    id: 'village',
    name: '감천문화마을',
    address: '부산광역시 사하구',
    latitude: 35.0975,
    longitude: 129.0106,
    category: '관광지',
    description: '',
    phone: '',
    source: 'test',
    source_date: null,
    url: '',
  },
};

const trip = {
  version: 1,
  destination: '부산',
  startDate: '2026-10-24',
  endDate: '2026-10-25',
  taste: null,
  places,
  candidateIds: [],
  days: [
    {
      date: '2026-10-24',
      items: [
        { placeId: 'harbor', memo: '', visited: false },
        { placeId: 'market', memo: '', visited: false },
        { placeId: 'village', memo: '', visited: false },
      ],
    },
    {
      date: '2026-10-25',
      items: [
        { placeId: 'village', memo: '', visited: false },
        { placeId: 'harbor', memo: '', visited: false },
      ],
    },
  ],
  selectedPlaceId: null,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((savedTrip) => {
    localStorage.setItem('pinday.trip.v1', JSON.stringify(savedTrip));
  }, trip);
  await page.route('**/api/config', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ js_key: '', place_search_enabled: false }),
  }));
});

test('selecting a segment updates the Kakao directions link and transport mode', async ({ page }) => {
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: /DAY 1/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /국제시장 → 감천문화마을/ }).click();
  await expect(page.getByText('국제시장', { exact: true }).first()).toBeVisible();

  const directions = page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' });
  await expect(directions).toHaveAttribute(
    'href',
    'https://map.kakao.com/link/from/%EA%B5%AD%EC%A0%9C%EC%8B%9C%EC%9E%A5,35.1014,129.0287/to/%EA%B0%90%EC%B2%9C%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84,35.0975,129.0106',
  );
  await expect(directions).toHaveAttribute('target', '_blank');
  await expect(directions).toHaveAttribute('rel', 'noopener noreferrer');

  const walking = page.getByRole('button', { name: '도보' });
  await walking.click();
  await expect(walking).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('도보를 선택했어요.', { exact: false })).toBeVisible();
  await expect(page.getByText('지도를 사용할 수 없어요.', { exact: true })).toBeVisible();
});

test('changing the day resets the segment to the first consecutive pair', async ({ page }) => {
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /국제시장 → 감천문화마을/ }).click();

  await page.getByRole('button', { name: /DAY 2/ }).click();

  await expect(page.getByRole('button', { name: /DAY 2/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute(
      'href',
      'https://map.kakao.com/link/from/%EA%B0%90%EC%B2%9C%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84,35.0975,129.0106/to/%EB%B6%80%EC%82%B0%ED%95%AD,35.1028,129.0403',
    );
});
