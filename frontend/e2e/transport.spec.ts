import { expect, test } from './support';
import type { Page } from '@playwright/test';

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
  endDate: '2026-10-30',
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
    ...Array.from({ length: 5 }, (_, index) => ({ date: `2026-10-${26 + index}`, items: [] })),
  ],
  selectedPlaceId: null,
};

async function seedTrip(page: Page, savedTrip = trip) {
  await page.addInitScript((savedTrip) => {
    localStorage.setItem('pinday.trip.v1', JSON.stringify(savedTrip));
  }, savedTrip);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ js_key: '', place_search_enabled: false }),
  }));
});

test('selecting a segment updates the Kakao directions link and transport mode', async ({ page }) => {
  await seedTrip(page);
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
  await seedTrip(page);
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

test('long segment names stay selectable without horizontal overflow on mobile', async ({ page }) => {
  const departureName = '국립부산과학관 어린이과학관';
  const arrivalName = '국립일제강제동원역사관';
  await page.setViewportSize({ width: 390, height: 844 });
  await seedTrip(page, {
    ...trip,
    places: {
      ...places,
      market: { ...places.market, name: departureName },
      village: { ...places.village, name: arrivalName },
    },
  });
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  const segment = page.getByRole('button', { name: `${departureName} → ${arrivalName}`, exact: true });
  await expect(segment).toHaveAttribute('aria-pressed', 'false');
  await segment.click();
  await expect(segment).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' })).toHaveAttribute(
    'href',
    `https://map.kakao.com/link/from/${encodeURIComponent(departureName)},35.1014,129.0287/to/${encodeURIComponent(arrivalName)},35.0975,129.0106`,
  );
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
});

test.describe('mobile date navigation', () => {
  test.use({ hasTouch: true });

  test('mobile dates keep their icons and labels inside each button and all days stay reachable', async ({ page }, testInfo) => {
    await seedTrip(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/transport', { waitUntil: 'domcontentloaded' });
    const strip = page.getByRole('group', { name: '여행 날짜' });
    const days = strip.getByRole('button');
    await expect(days).toHaveCount(7);
    await page.evaluate(() => document.fonts.ready);

    // 문서 전체 폭만 확인하면 버튼 안에서 날짜가 이웃 아이콘과 겹치는 문제를 놓친다.
    const contentsFit = await days.evaluateAll((buttons) => buttons.every((button) => {
      const bounds = button.getBoundingClientRect();
      const icon = button.querySelector('svg')!.getBoundingClientRect();
      const label = document.getElementById(button.getAttribute('aria-labelledby')!)!;
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = range.getBoundingClientRect();
      return icon.left >= bounds.left && icon.right <= text.left
        && text.right <= bounds.right && text.top >= bounds.top && text.bottom <= bounds.bottom;
    }));
    expect(contentsFit, '각 날짜의 아이콘과 글자는 자기 버튼 안에 서로 겹치지 않고 표시돼야 한다').toBe(true);
    expect(await strip.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await days.first().focus();
    for (let index = 1; index < 7; index += 1) await page.keyboard.press('Tab');
    await expect(days.last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(days.last()).toHaveAttribute('aria-pressed', 'true');
    const lastVisible = await days.last().evaluate((button) => {
      const bounds = button.getBoundingClientRect();
      const stripBounds = button.parentElement!.getBoundingClientRect();
      return bounds.left >= stripBounds.left && bounds.right <= stripBounds.right;
    });
    expect(lastVisible, '키보드로 이동한 마지막 날짜는 스트립 안으로 스크롤돼야 한다').toBe(true);

    await strip.evaluate((element) => { element.scrollLeft = 0; });
    await days.first().tap();
    await expect(days.first()).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('transport-mobile-dates.png') });
  });
});
