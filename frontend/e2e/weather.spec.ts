import type { Locator, Page } from '@playwright/test';
import type { Place } from '../src/api/client';
import type { DocentPhotos, WeatherAlternatives, WeatherForecast } from '../src/api/generated/model';
import type { Trip } from '../src/shared/trip/tripStore';
import { expect, noHorizontalOverflow, test } from './support';

// 여행 상태는 다른 화면(언제 갈까?)이 만들어 주므로 여기서는 저장소에 직접 넣는다. 장소 좌표는 실제 부산 위치.
const place = (id: string, name: string, latitude: number, longitude: number): Place => ({
  id, name, address: '부산광역시 해운대구', latitude, longitude, category: '관광지', description: '',
  phone: '', source: 'e2e 고정 일정', source_date: null, url: '',
});
const cafe = place('e2e:cafe', '해리단길 카페', 35.1636, 129.1590);
const beach = place('e2e:beach', '해운대해수욕장', 35.1587, 129.1604);
const night = place('e2e:night', '광안리해수욕장', 35.1532, 129.1186);
const trip: Trip = {
  version: 1, destination: '부산', startDate: '2026-10-24', endDate: '2026-10-25', taste: null,
  places: { [cafe.id]: cafe, [beach.id]: beach, [night.id]: night },
  candidateIds: [cafe.id, beach.id, night.id],
  days: [
    { date: '2026-10-24', items: [] },
    { date: '2026-10-25', items: [{ placeId: cafe.id, memo: '', visited: false }, { placeId: beach.id, memo: '노을 보기', visited: false }, { placeId: night.id, memo: '', visited: false }] },
  ],
  selectedPlaceId: null,
};

const slot = (time: string, probability: number) => ({
  time: `2026-10-25T${time}+09:00`, temperature: 18, rain_probability: probability, condition: '비', rain_expected: probability >= 60,
});
const forecast = (status: WeatherForecast['status'], slots: WeatherForecast['slots']): WeatherForecast => ({
  date: '2026-10-25', status, slots, rain_threshold: 60,
  source: 'OpenWeather 5 Day / 3 Hour Forecast', source_url: 'https://openweathermap.org/api/forecast5', fetched_at: '2026-10-23T16:46:00+09:00',
});

const PHOTO_ORIGIN = 'https://pinday-weather-photo.example';
const PHOTO_SOURCE = '한국관광공사 TourAPI';
const PHOTO_LICENSE = '공공누리 제3유형 (출처표시 + 변경금지)';
type PhotoState = 'ready' | 'empty' | 'unavailable' | 'broken';
type PhotoSetup = { states?: ReadonlyMap<string, PhotoState>; defaultState?: PhotoState; license?: string };
const photoUrl = (id: string) => `${PHOTO_ORIGIN}/${encodeURIComponent(id)}.svg`;
const photoSourceUrl = (id: string) => `https://gallery.visitkorea.or.kr/fixture/${encodeURIComponent(id)}`;

async function installPhotos(page: Page, setup: PhotoSetup) {
  const requests = new Map<string, URL[]>();
  const successfulResponses = new Map<string, number>();
  page.on('response', (response) => {
    const url = new URL(response.url());
    const id = url.searchParams.get('place_id');
    if (url.pathname === '/api/docent/photos' && id && response.status() === 200) {
      successfulResponses.set(id, (successfulResponses.get(id) ?? 0) + 1);
    }
  });
  const stateOf = (id: string) => setup.states?.get(id) ?? setup.defaultState ?? 'empty';
  const legacyRequests: string[] = [];
  await page.route('**/api/weather/photo?**', (route) => {
    legacyRequests.push(route.request().url());
    return route.fulfill({ status: 503, json: { detail: '이전 사진 API를 호출하면 안 됩니다.' } });
  });
  await page.route(`${PHOTO_ORIGIN}/**`, (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.slice(1, -4));
    if (stateOf(id) === 'broken') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Image unavailable' });
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="#d2ebf2"/></svg>',
    });
  });
  await page.route('**/api/docent/photos?**', (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('place_id')!;
    requests.set(id, [...(requests.get(id) ?? []), url]);
    if (stateOf(id) === 'unavailable') return route.fulfill({ status: 503, json: { detail: '사진 서비스를 일시적으로 이용할 수 없습니다.' } });
    const body: DocentPhotos = {
      place_id: id,
      photos: stateOf(id) === 'empty' ? [] : [{ url: photoUrl(id), thumbnail_url: photoUrl(id), title: `${url.searchParams.get('name')} 원본`, license: setup.license ?? PHOTO_LICENSE }],
      source: PHOTO_SOURCE,
      source_url: photoSourceUrl(id),
    };
    return route.fulfill({ json: body });
  });
  return { requests, successfulResponses, legacyRequests };
}

async function expectPhoto(scope: Locator, target: Place) {
  await scope.scrollIntoViewIfNeeded();
  const image = scope.getByRole('img', { name: `${target.name} 사진 (${target.name} 원본)`, exact: true });
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', photoUrl(target.id));
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  await expect(image, '날씨 화면 사진은 영역을 빈틈없이 채운다').toHaveCSS('object-fit', 'cover');
  await expect(scope.locator('figcaption')).toHaveCount(0);
  await expect(scope.getByText(PHOTO_LICENSE, { exact: true })).toHaveCount(0);
  return image;
}

async function openWeather(page: Page, response: { status: number; body: unknown }, seeded: Trip | null = trip, photos: PhotoSetup = {}) {
  // 외부 예보·관광사진만 고정하고 대안 장소는 실제 로컬 관광 데이터를 쓴다.
  await page.route('**/api/weather/forecast?**', (route) => route.fulfill({ status: response.status, json: response.body }));
  const photoRequests = await installPhotos(page, photos);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    if (value) localStorage.setItem('pinday.trip.v1', JSON.stringify(value));
    else localStorage.removeItem('pinday.trip.v1');
  }, seeded);
  // 여러 장소가 대안을 요청하므로 열려 있는 장소(DAY 2의 2번째)의 응답을 기다린다
  const selected = seeded ? seeded.places[seeded.days[1]?.items[1]?.placeId ?? '']?.name : undefined;
  const alternatives = page.waitForResponse((each) => {
    const url = new URL(each.url());
    return url.pathname === '/api/weather/alternatives' && url.searchParams.get('name') === selected;
  });
  alternatives.catch(() => undefined); // 일정이 없는 경우엔 대안 요청이 없다
  await page.goto('/weather?day=2&item=1', { waitUntil: 'domcontentloaded' });
  return { alternatives, ...photoRequests };
}

test('rain on a scheduled outdoor stop can be swapped for a nearby indoor place without touching the rest of the day', async ({ page }, testInfo) => {
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('12:00', 30), slot('15:00', 70)]) });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  expect(alternatives.alternatives.length, 'The real catalog must have indoor places near Haeundae').toBeGreaterThan(1);
  const [first, second] = alternatives.alternatives;

  await expect(page.getByRole('region', { name: '오후 비 예보' })).toContainText('15 – 18시 · 강수확률 70%');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  const plan = page.getByRole('region', { name: '변경 추천 일정' });
  await expect(page.getByRole('group', { name: '여행 날짜' }).getByRole('button', { name: 'DAY 2 · 10.25 (일)' })).toHaveAttribute('aria-pressed', 'true');
  await expect(plan.locator('.w-plan-row[aria-pressed="true"]')).toContainText(`2${beach.name}`);
  const swap = page.getByRole('region', { name: '변경할 장소', exact: true });
  await expect(swap).toContainText(beach.name);
  await expect(swap).toContainText(first!.place.name);
  const original = page.getByRole('article', { name: '원래 일정' });
  await expect(original.getByRole('heading')).toHaveText(beach.name);
  await expect(original).toContainText('야외일 수 있어요');
  const chosen = page.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosen.getByRole('heading')).toHaveText(first!.place.name);
  await page.screenshot({ path: testInfo.outputPath('weather-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: `${second!.place.name}을(를) 바꿀 장소로 보기` }).click();
  await expect(chosen.getByRole('heading')).toHaveText(second!.place.name);
  await expect(swap, '아래에서 고른 후보가 위 변경할 장소에도 보인다').toContainText(second!.place.name);
  await expect(page.getByRole('region', { name: '교체 후 미리보기' }), '교체 후 미리보기는 두지 않는다').toHaveCount(0);

  await page.getByRole('button', { name: `${beach.name}을(를) ${second!.place.name}(으)로 교체` }).click();
  await expect(page.getByRole('status').filter({ hasText: '바꿨어요' })).toContainText(`DAY 2의 ${beach.name}을(를) ${second!.place.name}(으)로 바꿨어요.`);
  const saved: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
  expect(saved.days[1]!.items).toEqual([
    { placeId: cafe.id, memo: '', visited: false },
    { placeId: second!.place.id, memo: '노을 보기', visited: false },
    { placeId: night.id, memo: '', visited: false },
  ]);
  expect(saved.places[second!.place.id]?.name).toBe(second!.place.name);
  await expect(plan.locator('.w-plan-row[aria-pressed="true"]')).toContainText(`2${second!.place.name}`);
  const tray = page.locator('.weather-tray');
  await expect(tray.getByRole('heading')).toHaveText(/변경한 일정 1개$/);
  await expect(tray).toContainText('DAY 1 (변경 없음) · DAY 2 (변경 있음)');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.weather-tray'), '바꾼 일정은 새로고침 뒤에도 센다').toContainText('DAY 2 (변경 있음)');
});

test('a day beyond the forecast window is shown as undecided instead of a guessed forecast', async ({ page }) => {
  await openWeather(page, { status: 200, body: forecast('out_of_range', []) });
  await expect(page.getByRole('region', { name: '날씨 미확정' })).toContainText('약 5일 이내');
});

test('a forecast failure explains the problem and keeps the comparison usable', async ({ page }) => {
  await openWeather(page, { status: 503, body: { detail: '날씨 API 키(OPENWEATHER_API_KEY)가 아직 없어요.' } });
  await expect(page.getByRole('alert')).toContainText('날씨를 불러오지 못했어요');
  await expect(page.getByRole('alert')).toContainText('OPENWEATHER_API_KEY');
  await expect(page.getByRole('article', { name: '바꿔볼 장소' })).toBeVisible();
});

test('without a dated schedule the page points to where stops are added', async ({ page }) => {
  await openWeather(page, { status: 200, body: forecast('ok', []) }, null);
  await expect(page.getByText('아직 날짜별 일정이 없어요')).toBeVisible();
  await page.getByRole('button', { name: '언제 갈까?로 가기' }).click();
  await expect(page).toHaveURL(/\/schedule$/);
});

test('a day carried over without a date asks for travel dates instead of requesting a forecast', async ({ page }) => {
  let forecastCalls = 0;
  page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/weather/forecast') forecastCalls += 1; });
  const undated: Trip = { ...trip, startDate: '', endDate: '', days: trip.days.map((day) => ({ ...day, date: '' })) };
  await openWeather(page, { status: 200, body: forecast('ok', []) }, undated);
  await expect(page.getByRole('group', { name: '여행 날짜' }).getByRole('button', { name: 'DAY 2 · 장소 3곳' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: '여행 날짜가 아직 없어요' })).toBeVisible();
  await expect(page.getByRole('article', { name: '바꿔볼 장소' })).toBeVisible();
  expect(forecastCalls).toBe(0);
});

test('the chosen alternative can be explained by the AI docent only when asked', async ({ page }) => {
  const docentCalls: string[] = [];
  await page.route('**/api/docent/story?**', (route) => {
    docentCalls.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 503, json: { detail: '해설 테스트용 응답' } });
  });
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  const name = alternatives.alternatives[0]!.place.name;
  await expect(page.getByRole('article', { name: '바꿔볼 장소' }).getByRole('heading')).toHaveText(name);
  expect(docentCalls, 'AI 해설은 사용자가 열기 전엔 호출하지 않는다').toEqual([]);

  await page.getByRole('button', { name: `${name} 해설 보기` }).click();
  await expect(page.getByRole('region', { name: `${name} 해설` })).toBeVisible();
  await expect.poll(() => docentCalls.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: '해설 닫기' }).click();
  await expect(page.getByRole('region', { name: `${name} 해설` })).toHaveCount(0);
});

test('another stop of the day can be picked from the 변경 추천 일정 list', async ({ page }) => {
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  await page.getByRole('region', { name: '변경 추천 일정' }).locator('.w-plan-row').filter({ hasText: night.name }).click();
  await expect(page).toHaveURL(/\/weather\?day=2&item=2$/);
  await expect(page.getByRole('article', { name: '원래 일정' }).getByRole('heading')).toHaveText(night.name);
});

test('날씨 비교·대안은 같은 TourAPI 사진 계약과 출처를 공유한다', async ({ page }) => {
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, trip, { defaultState: 'ready' });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  const first = alternatives.alternatives[0]!.place;
  const original = page.getByRole('article', { name: '원래 일정' });
  await expectPhoto(original, beach);
  const chosen = page.getByRole('article', { name: '바꿔볼 장소' });
  await expectPhoto(chosen, first);
  for (const target of [beach, first]) {
    const requests = loaded.requests.get(target.id)!;
    // StrictMode가 마운트 중 취소한 요청은 재사용 가능한 성공 응답이 아니다.
    expect(loaded.successfulResponses.get(target.id), '같은 장소의 성공 사진 응답은 한 번만 받는다').toBe(1);
    for (const request of requests) expect(Object.fromEntries(request.searchParams)).toEqual({
      place_id: target.id, name: target.name, latitude: String(target.latitude), longitude: String(target.longitude),
    });
  }
  expect(loaded.legacyRequests, '날씨 페이지도 공용 TourAPI 사진을 사용해야 한다').toEqual([]);
});

test('390px 날씨 사진은 비율을 유지하고 이용조건은 푸터 출처 페이지에서 확인한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, trip, { defaultState: 'ready' });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  const first = alternatives.alternatives[0]!.place;
  await expectPhoto(page.getByRole('article', { name: '원래 일정' }), beach);
  await expectPhoto(page.getByRole('article', { name: '바꿔볼 장소' }), first);
  await noHorizontalOverflow(page);
  const before = await page.evaluate(() => localStorage.getItem('pinday.trip.v1'));
  await page.getByRole('contentinfo').getByRole('link', { name: '데이터·사진 출처', exact: true }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await expect(page.getByText(PHOTO_LICENSE, { exact: true }).first()).toBeVisible();
  await expect(page.locator(`a[href="${photoUrl(first.id)}"]`)).toBeVisible();
  await expect(page.locator(`a[href="${photoSourceUrl(first.id)}"]`)).toHaveAttribute('target', '_blank');
  expect(await page.evaluate(() => localStorage.getItem('pinday.trip.v1'))).toBe(before);
  expect(loaded.successfulResponses.get(first.id)).toBe(1);
  await noHorizontalOverflow(page);
});

for (const state of ['empty', 'unavailable', 'broken'] as const) {
  test(`사진이 ${state}이면 사진 영역을 숨기고, 다른 장소 사진과 일정 교체는 유지된다`, async ({ page }) => {
    const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, trip, {
      defaultState: 'ready', states: new Map([[beach.id, state]]),
    });
    const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
    const first = alternatives.alternatives[0]!.place;
    const original = page.getByRole('article', { name: '원래 일정' });
    await expect(original.getByRole('heading')).toHaveText(beach.name);
    await expect(original.locator('.w-visual'), '사진이 없으면 빈 자리나 안내 문구도 두지 않는다').toHaveCount(0);
    await expect(original.locator('img')).toHaveCount(0);
    await expectPhoto(page.getByRole('article', { name: '바꿔볼 장소' }), first);
    const before: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
    expect(before.days).toEqual(trip.days);
    await page.getByRole('button', { name: `${beach.name}을(를) ${first.name}(으)로 교체` }).click();
    const saved: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
    expect(saved.days[1]!.items).toEqual([
      { placeId: cafe.id, memo: '', visited: false },
      { placeId: first.id, memo: '노을 보기', visited: false },
      { placeId: night.id, memo: '', visited: false },
    ]);
    expect(loaded.legacyRequests).toEqual([]);
  });
}

test('the center "이 장소만 교체" button replaces the stop', async ({ page }) => {
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  const first = alternatives.alternatives[0]!.place;
  await page.getByRole('button', { name: `${beach.name}을(를) ${first.name}(으)로 교체` }).click();
  await expect(page.getByRole('status').filter({ hasText: '바꿨어요' })).toContainText(`${beach.name}을(를) ${first.name}(으)로 바꿨어요.`);
  const saved: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
  expect(saved.days[1]!.items.map((item) => item.placeId)).toEqual([cafe.id, first.id, night.id]);
});

for (const width of [1586, 1440, 1150, 1101]) {
  test(`${width}px에서 원래 일정·바꿔볼 장소·이런 곳도는 변경할 장소 패널 안에 쌓는다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, trip, { defaultState: 'ready' });
    await expect(page.getByRole('article', { name: '바꿔볼 장소', exact: true })).toBeVisible();
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
      };
      const row = (selector: string) => [...document.querySelectorAll(selector)].map((e) => ({ x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y }));
      return {
        hero: box('.w-hero'), panel: box('.w-panel.swap'), original: box('.w-place:not(.chosen)'), chosen: box('.w-place.chosen'),
        originalCopy: box('.w-place:not(.chosen) .w-place-copy'), originalImage: box('.w-place:not(.chosen) .w-visual'),
        chosenCopy: box('.w-place.chosen .w-place-copy'), chosenImage: box('.w-place.chosen .w-visual'),
        recommendations: row('.w-more-list > li').slice(0, 2),
      };
    });
    expect(geometry.hero.height, '선택 영역이 머리글 높이를 늘리지 않아야 한다').toBeLessThan(200);
    await expect(page.locator('.w-hero-copy .w-pickers')).toHaveCount(0);
    const inside = (box: { x: number; right: number }) => box.x >= geometry.panel.x && box.right <= geometry.panel.right;
    expect(inside(geometry.original) && inside(geometry.chosen), '두 장소 카드는 변경할 장소 패널 안에 있다').toBe(true);
    expect(geometry.chosen.y, '바꿔볼 장소는 원래 일정 아래에 쌓인다').toBeGreaterThan(geometry.original.bottom);
    expect(geometry.originalImage.y, '좁은 패널에서는 사진이 글 아래로 간다').toBeGreaterThan(geometry.originalCopy.y);
    expect(geometry.chosenImage.y).toBeGreaterThan(geometry.chosenCopy.y);
    expect(geometry.recommendations).toHaveLength(2);
    expect(geometry.recommendations[1]!.y, '이런 곳도 있어요도 한 열로 쌓인다').toBeGreaterThan(geometry.recommendations[0]!.y);
    expect(Math.abs(geometry.recommendations[0]!.x - geometry.recommendations[1]!.x)).toBeLessThanOrEqual(1);
    if (width === 1586) {
      // 1·2·4단계와 같은 폭: 최대 1440px 에서 좌우 여백 32px 을 뺀 1376px
      expect(Math.round(geometry.hero.width), '넓은 화면에서도 다른 단계 화면과 같은 콘텐츠 폭을 쓴다').toBe(1376);
    }
    await noHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`weather-aligned-${width}.png`), fullPage: true });
  });
}

test('공공누리 제1유형 사진은 시안 프레임을 채운다', async ({ page }) => {
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, trip, { defaultState: 'ready', license: '공공누리 제1유형(출처표시)' });
  const image = page.getByRole('article', { name: '원래 일정', exact: true }).getByRole('img', { name: `${beach.name} 사진 (${beach.name} 원본)`, exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveCSS('object-fit', 'cover');
});


for (const width of [1101, 390]) {
  test(`${width}px에서 긴 장소 주소가 카드나 화면을 넘지 않고 전체 주소를 보존한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const address = '부산광역시 해운대구 해운대해변로 264 (우동) 해운대해수욕장 관광안내소와 해변 산책로 입구';
    const seeded = { ...trip, places: { ...trip.places, [beach.id]: { ...beach, address } } };
    await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, seeded, { defaultState: 'ready' });
    const original = page.getByRole('article', { name: '원래 일정', exact: true });
    const addressLink = original.getByRole('button', { name: `${beach.name} 해설 보기`, exact: true });
    await expect(addressLink).toHaveAttribute('title', address);
    await expect(addressLink).toContainText(address);
    await addressLink.scrollIntoViewIfNeeded();
    const card = await original.boundingBox();
    const link = await addressLink.boundingBox();
    expect(link!.x + link!.width).toBeLessThanOrEqual(card!.x + card!.width);
    await noHorizontalOverflow(page);
  });
}

for (const width of [390, 1440]) {
  test(`${width}px 플로팅 바는 비 소식이 있는 추천 변경 일정 수와 날짜를 보여주고 이전 단계로 돌아간다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    // 해운대해수욕장(DAY 2)과 광안리해수욕장(DAY 1·DAY 2)에만 비가 온다 → 3개.
    const rainyLongitudes = [beach.longitude, night.longitude].map(String);
    await page.route('**/api/weather/forecast?**', (route) => {
      const rainyPlace = rainyLongitudes.includes(new URL(route.request().url()).searchParams.get('longitude')!);
      return route.fulfill({ json: forecast('ok', [slot('15:00', rainyPlace ? 70 : 20)]) });
    });
    await installPhotos(page, {});
    const seeded: Trip = { ...trip, days: [{ date: '2026-10-24', items: [{ placeId: night.id, memo: '', visited: false }] }, trip.days[1]!] };
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((value) => localStorage.setItem('pinday.trip.v1', JSON.stringify(value)), seeded);
    await page.goto('/weather?day=2&item=1', { waitUntil: 'domcontentloaded' });

    const tray = page.locator('.weather-tray');
    await expect(tray.getByRole('heading', { name: '추천 변경 일정 3개 / 변경한 일정 0개' })).toBeVisible();
    await expect(tray).toContainText('DAY 1 (변경 없음) · DAY 2 (변경 없음)');
    const back = tray.getByRole('button', { name: '전 단계로 돌아가기', exact: true });
    const transport = tray.getByRole('button', { name: '교통 확인하기', exact: true });
    await expect(back).toBeInViewport();
    await expect(transport).toBeInViewport();
    const [backBox, transportBox] = [await back.boundingBox(), await transport.boundingBox()];
    expect(backBox!.y).toBe(transportBox!.y);
    expect(backBox!.height).toBe(transportBox!.height);
    await noHorizontalOverflow(page);
    // 다른 화면처럼 페이지 배경은 흰색이다.
    expect(await page.locator('main > div').first().evaluate((element) => getComputedStyle(element, '::before').content)).toBe('none');
    await tray.screenshot({ path: testInfo.outputPath(`weather-tray-${width}.png`) });

    await transport.click();
    await expect(page).toHaveURL(/\/transport$/);
    await page.goBack();
    await page.locator('.weather-tray').getByRole('button', { name: '전 단계로 돌아가기', exact: true }).click();
    await expect(page, '전 단계인 2. 언제 갈까?로 돌아간다').toHaveURL(/\/schedule$/);
  });
}

test('날씨 체크도 단계 바를 고정하고, 작은 변경할 장소 지도에 장소 이름 핀을 쓴다', async ({ page }, testInfo) => {
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  const mapPanel = page.getByRole('region', { name: '변경할 장소 지도' }).first();
  const frame = mapPanel.locator('.map-frame');
  expect(await frame.evaluate((element) => element.getBoundingClientRect().height)).toBe(220);
  await expect(frame).toHaveAttribute('data-pin-count', '2');
  if (await frame.getAttribute('data-map-status') !== 'missing-key') {
    await expect(frame).toHaveAttribute('data-map-status', 'ready', { timeout: 15_000 });
    await expect(mapPanel.locator('.map-pin')).toHaveText([beach.name, alternatives.alternatives[0]!.place.name]);
  }
  await page.screenshot({ path: testInfo.outputPath('weather-map.png') });

  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(() => page.locator('.trip-bar-wrap').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(78);
});

test('변경 추천은 비가 오는 야외 장소에만 붙고, 추천이 아닌 실내 장소도 직접 바꿀 수 있다', async ({ page }, testInfo) => {
  await mockCafeSearch(page); // 카페는 근처 카페로 바꿔 보여주므로 카카오 검색을 고정한다
  // 세 곳 모두 비 예보. 해리단길 카페는 이름으로 실내(카페)라 추천하지 않는다.
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  const plan = page.getByRole('region', { name: '변경 추천 일정' });
  const row = (name: string) => plan.locator('.w-plan-row').filter({ hasText: name });
  await expect(row(beach.name)).toContainText('변경 추천');
  await expect(row(night.name)).toContainText('변경 추천');
  await expect(row(cafe.name)).not.toContainText('변경 추천');
  await expect(plan).not.toContainText('비 예보');
  await expect(page.locator('.weather-tray').getByRole('heading')).toHaveText(/^추천 변경 일정 2개/);
  const swap = page.getByRole('region', { name: '변경할 장소', exact: true });
  await expect(swap).toContainText('실내 장소로 바꾸는 걸 추천해요');
  await page.screenshot({ path: testInfo.outputPath('weather-advice.png') });

  await row(cafe.name).click();
  await expect(page).toHaveURL(/\/weather\?day=2&item=0$/);
  await expect(swap).toContainText('꼭 바꿀 필요는 없는 일정이에요');
  const chosen = swap.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosen.getByRole('heading')).not.toHaveText('');
  const name = await chosen.getByRole('heading').textContent();
  await page.getByRole('button', { name: `${cafe.name}을(를) ${name}(으)로 교체` }).click();
  await expect(row(name!)).toBeVisible();
});

test('식당·카페·쇼핑몰은 비가 와도 변경 추천하지 않고, 실내 태그는 회색·바꿔볼 장소는 DAY 색이다', async ({ page }) => {
  // 카카오 검색에서 담은 장소: 분류(category)와 설명(category_name)으로 실내를 알아본다
  const restaurant = { ...place('kakao:food', '해운대 돼지국밥', 35.1600, 129.1610), category: '음식점', description: '음식점 > 한식 > 국밥', source: '카카오 로컬' };
  const mall = { ...place('kakao:mall', '센텀 쇼핑몰', 35.1690, 129.1300), category: '', description: '쇼핑,유통 > 쇼핑몰', source: '카카오 로컬' };
  const seeded: Trip = {
    ...trip,
    places: { ...trip.places, [restaurant.id]: restaurant, [mall.id]: mall },
    days: [trip.days[0]!, { ...trip.days[1]!, items: [{ placeId: restaurant.id, memo: '', visited: false }, { placeId: beach.id, memo: '', visited: false }, { placeId: mall.id, memo: '', visited: false }] }],
  };
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, seeded);
  const plan = page.getByRole('region', { name: '변경 추천 일정' });
  const row = (name: string) => plan.locator('.w-plan-row').filter({ hasText: name });
  await expect(row(beach.name)).toContainText('변경 추천');
  await expect(row(restaurant.name)).not.toContainText('변경 추천');
  await expect(row(mall.name)).not.toContainText('변경 추천');
  await expect(page.locator('.weather-tray').getByRole('heading')).toHaveText(/^추천 변경 일정 1개/);

  const chosen = page.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosen.locator('.w-tag.accent')).toHaveCSS('background-color', 'rgb(243, 122, 31)'); // DAY 2 주황
  await expect(chosen.locator('.w-badge.indoor')).not.toHaveCSS('color', 'rgb(21, 87, 167)');

  await row(restaurant.name).click();
  await expect(page.getByRole('article', { name: '원래 일정' })).toContainText('실내');
});

test('온천건강랜드는 실내로 보고, 일정 목록을 누르면 변경할 장소로 이동하며, 교체하면 변경 이력이 남고 누르면 되돌린다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const spa = { ...place('e2e:spa', '허심청', 35.2211, 129.0826), description: '편안하고 즐거운 온천욕과 휴식을 위한 도시형 온천건강랜드이다' };
  const stream = { ...place('e2e:stream', '온천천시민공원', 35.2050, 129.0860), description: '도심을 흐르는 하천을 따라 조성된 공원' };
  const seeded: Trip = {
    ...trip,
    places: { ...trip.places, [spa.id]: spa, [stream.id]: stream },
    days: [trip.days[0]!, { ...trip.days[1]!, items: [{ placeId: spa.id, memo: '', visited: false }, { placeId: beach.id, memo: '', visited: false }, { placeId: stream.id, memo: '', visited: false }] }],
  };
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) }, seeded);
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  const plan = page.getByRole('region', { name: '변경 추천 일정' });
  const row = (name: string) => plan.locator('.w-plan-row').filter({ hasText: name });
  await expect(row(spa.name), '온천건강랜드는 비가 와도 추천하지 않는다').not.toContainText('변경 추천');
  await expect(row(stream.name), "'온천천'은 하천 이름이라 야외로 본다").toContainText('변경 추천');

  // 좁은 화면에서는 패널이 아래에 있으므로 목록을 누르면 변경할 장소 머리로 스크롤된다
  await page.evaluate(() => window.scrollTo(0, 0));
  await row(beach.name).click();
  const heading = page.getByRole('heading', { name: '변경할 장소', exact: true });
  await expect.poll(async () => {
    const box = await heading.boundingBox();
    return box!.y > 150 && box!.y < 844 / 2;
  }).toBe(true);

  const first = alternatives.alternatives[0]!.place;
  await page.getByRole('button', { name: `${beach.name}을(를) ${first.name}(으)로 교체` }).click();
  const log = plan.locator('.w-change-log');
  await expect(log).toHaveText(new RegExp(`^${beach.name} → ${first.name}(으로|로) 변경되돌리기$`));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(log, '새로고침 뒤에도 이력이 남는다').toContainText(`${beach.name} → ${first.name}`);
  await page.screenshot({ path: testInfo.outputPath('weather-change-log.png') });

  // 이력을 누르면 원래 장소로 되돌리고 이력·변경 개수도 지운다
  await page.getByRole('button', { name: `${first.name}을(를) 원래 장소 ${beach.name}(으)로 되돌리기` }).click();
  await expect(log).toHaveCount(0);
  await expect(row(beach.name)).toBeVisible();
  const saved: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
  expect(saved.days[1]!.items.map((item) => item.placeId)).toEqual([spa.id, beach.id, stream.id]);
  await expect(page.locator('.weather-tray').getByRole('heading')).toHaveText(/변경한 일정 0개$/);
  await expect(page.getByRole('article', { name: '원래 일정' }).getByRole('heading')).toHaveText(beach.name);
});

test('예보 출처 태그는 DAY 날짜 옆에, 바꿔볼 장소는 배경 없이 DAY 색 테두리·회색 태그이며, 교체하면 언제 갈까?에 동선 재확인 알림이 뜬다', async ({ page }, testInfo) => {
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  const first = ((await (await loaded.alternatives).json()) as WeatherAlternatives).alternatives[0]!.place;
  const head = page.locator('.w-forecast-head');
  const [date, badge] = await Promise.all([head.locator('span').first().boundingBox(), head.locator('.w-source-badge').boundingBox()]);
  expect(badge!.x - (date!.x + date!.width), 'OpenWeather 예보 태그는 날짜 바로 옆').toBeLessThan(16);
  const chosenCard = page.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosenCard, '배경색 없이').toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(chosenCard, 'DAY 2 주황 테두리만').toHaveCSS('border-top-color', 'rgb(243, 122, 31)');
  const grayBg = await page.evaluate(() => { const probe = document.createElement('span'); probe.style.background = 'var(--semantic-background-neutral-secondary)'; document.body.append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; });
  await expect(chosenCard.locator('.w-badge.indoor'), '태그는 회색').toHaveCSS('background-color', grayBg);
  await page.screenshot({ path: testInfo.outputPath('weather-forecast-head.png') });

  await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
  const notice = page.getByRole('status').filter({ hasText: '동선을 다시 체크해보세요' });
  await expect(notice, '바꾼 일정이 없으면 알림도 없다').toHaveCount(0);

  await page.goto('/weather?day=2&item=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: `${beach.name}을(를) ${first.name}(으)로 교체` }).click();
  await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
  await expect(notice, '바뀐 일정의 DAY와 순서까지 알려 준다').toContainText('비가 예상되어 일정이 변경됐으니 동선을 다시 체크해보세요. (DAY 2 2번)');
  await expect(notice.getByRole('button', { name: '변경 내역 보기' }), '변경 내역 보기 버튼은 두지 않는다').toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('schedule-weather-notice.png') });

  // '동선 체크 완료'는 바뀐 DAY(2, 주황) 색 바탕에 흰 글씨이고, 주의 아이콘은 첫 글자 줄 가운데에 맞춘다
  const done = notice.getByRole('button', { name: '동선 체크 완료' });
  await expect(done).toHaveCSS('background-color', 'rgb(243, 122, 31)');
  await expect(done).toHaveCSS('color', 'rgb(255, 255, 255)');
  const offset = await notice.evaluate((node) => {
    const icon = node.querySelector('svg')!.getBoundingClientRect();
    const leaf = [...node.querySelectorAll('*')].find((each) => each.children.length === 0 && (each.textContent ?? '').startsWith('비가'))!;
    const range = document.createRange(); range.selectNodeContents(leaf);
    const line = range.getClientRects()[0]!;
    return (icon.top + icon.height / 2) - (line.top + line.height / 2);
  });
  expect(Math.abs(offset), '아이콘만 위로 솟지 않는다').toBeLessThanOrEqual(1.5);

  // 동선을 확인하고 '동선 체크 완료'를 누르면 알림이 사라지고, 새로고침해도 다시 나오지 않는다
  await done.click();
  await expect(notice).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '나의 일정', exact: true })).toBeVisible();
  await expect(notice).toHaveCount(0);

  // 날씨 체크에서 다른 일정을 또 바꾸면 다시 알린다
  await page.goto('/weather?day=2&item=2', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /\(으\)로 교체$/ }).click();
  await page.goto('/schedule', { waitUntil: 'domcontentloaded' });
  await expect(notice).toContainText('(DAY 2 2번, 3번)');
});

const nearbyCafe = { ...place('kakao:near', '해운대 근처 카페', 35.1640, 129.1600), category: '카페', description: '음식점 > 카페', source: '카카오 로컬' };
const farCafe = { ...place('kakao:far', '기장 먼 카페', 35.2440, 129.2220), category: '카페', description: '음식점 > 카페', source: '카카오 로컬' };
async function mockCafeSearch(page: Page) {
  const searches: URLSearchParams[] = [];
  await page.route('**/api/travel/search?**', (route) => {
    searches.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: { places: [farCafe, nearbyCafe], total: 2, source: '카카오 로컬', source_url: 'https://developers.kakao.com', date_min: null, date_max: null } });
  });
  return searches;
}

test('후보함에 담은 카페가 없으면 원래 카페 근처 카페를 가까운 순으로 보여주고, 실내 관광지 대안은 찾지 않는다', async ({ page }) => {
  const searches = await mockCafeSearch(page);
  const alternativeNames: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/weather/alternatives') alternativeNames.push(url.searchParams.get('name') ?? '');
  });
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  await page.goto('/weather?day=2&item=0', { waitUntil: 'domcontentloaded' });
  const chosen = page.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosen.getByRole('heading')).toHaveText(nearbyCafe.name);
  await expect(chosen).toContainText('근처 카페 · 운영정보 확인 필요');
  expect(searches.at(-1)?.get('category')).toBe('CE7');
  expect(searches.at(-1)?.get('query')).toBe('부산광역시 해운대구 카페');
  expect(alternativeNames, '카페는 실내 관광지(박물관 등) 대안을 찾지 않는다').not.toContain(cafe.name);
  await expect(page.getByRole('region', { name: '이런 곳도 있어요' }), '3km 밖의 카페는 근처 카페가 있으면 뺀다').toHaveCount(0);
});

test('후보함에 담은 카페가 있으면 그 카페로 바꿔 보여주고 근처 검색은 하지 않는다', async ({ page }, testInfo) => {
  const searches = await mockCafeSearch(page);
  const savedCafe = { ...place('kakao:saved', '전포 카페거리 카페', 35.1555, 129.0640), category: '카페', description: '음식점 > 카페', source: '카카오 로컬' };
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) },
    { ...trip, places: { ...trip.places, [savedCafe.id]: savedCafe }, candidateIds: [...trip.candidateIds, savedCafe.id] });
  await page.goto('/weather?day=2&item=0', { waitUntil: 'domcontentloaded' });
  const chosen = page.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosen.getByRole('heading')).toHaveText(savedCafe.name);
  await expect(chosen).toContainText('후보함에 담은 카페');
  expect(searches, '후보함에 담은 카페가 있으면 근처 검색을 하지 않는다').toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath('weather-same-kind.png') });

  await page.getByRole('button', { name: `${cafe.name}을(를) ${savedCafe.name}(으)로 교체` }).click();
  const saved: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
  expect(saved.days[1]!.items[0]!.placeId).toBe(savedCafe.id);
});
