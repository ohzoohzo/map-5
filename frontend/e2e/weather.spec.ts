import type { Page } from '@playwright/test';
import type { Place } from '../src/api/client';
import type { WeatherAlternatives, WeatherForecast } from '../src/api/generated/model';
import type { Trip } from '../src/shared/trip/tripStore';
import { expect, test } from './support';

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

async function openWeather(page: Page, response: { status: number; body: unknown }, seeded: Trip | null = trip) {
  // 외부 예보는 키·시점에 따라 달라지므로 응답을 고정한다. 대안 장소는 실제 로컬 관광 데이터를 쓴다.
  await page.route('**/api/weather/forecast?**', (route) => route.fulfill({ status: response.status, json: response.body }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    if (value) localStorage.setItem('pinday.trip.v1', JSON.stringify(value));
    else localStorage.removeItem('pinday.trip.v1');
  }, seeded);
  const alternatives = page.waitForResponse((each) => new URL(each.url()).pathname === '/api/weather/alternatives');
  alternatives.catch(() => undefined); // 일정이 없는 경우엔 대안 요청이 없다
  await page.goto('/weather?day=2&item=1', { waitUntil: 'domcontentloaded' });
  return { alternatives };
}

test('rain on a scheduled outdoor stop can be swapped for a nearby indoor place without touching the rest of the day', async ({ page }, testInfo) => {
  const loaded = await openWeather(page, { status: 200, body: forecast('ok', [slot('12:00', 30), slot('15:00', 70)]) });
  const alternatives: WeatherAlternatives = await (await loaded.alternatives).json();
  expect(alternatives.alternatives.length, 'The real catalog must have indoor places near Haeundae').toBeGreaterThan(1);
  const [first, second] = alternatives.alternatives;

  await expect(page.getByRole('region', { name: '오후 비 예보' })).toContainText('15 – 18시 · 강수확률 70%');
  await expect(page.getByRole('combobox', { name: '날짜' })).toContainText('DAY 2 · 10.25 (일)');
  await expect(page.getByRole('combobox', { name: '확인할 장소' })).toContainText(`2. ${beach.name}`);
  const original = page.getByRole('article', { name: '원래 일정' });
  await expect(original.getByRole('heading')).toHaveText(beach.name);
  await expect(original).toContainText('야외일 수 있어요');
  const chosen = page.getByRole('article', { name: '바꿔볼 장소' });
  await expect(chosen.getByRole('heading')).toHaveText(first!.place.name);
  await page.screenshot({ path: testInfo.outputPath('weather-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: `${second!.place.name}을(를) 바꿀 장소로 보기` }).click();
  await expect(chosen.getByRole('heading')).toHaveText(second!.place.name);
  const preview = page.getByRole('region', { name: '교체 후 미리보기' });
  await expect(preview.getByRole('listitem')).toHaveText([`1번째이전 일정 (그대로)${cafe.name}`, `2번째교체될 장소${second!.place.name}`, `3번째이후 일정 (그대로)${night.name}`]);

  await page.getByRole('button', { name: '이 장소로 교체하기' }).click();
  await expect(page.getByRole('status').filter({ hasText: '바꿨어요' })).toContainText(`DAY 2의 ${beach.name}을(를) ${second!.place.name}(으)로 바꿨어요.`);
  const saved: Trip = await page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));
  expect(saved.days[1]!.items).toEqual([
    { placeId: cafe.id, memo: '', visited: false },
    { placeId: second!.place.id, memo: '노을 보기', visited: false },
    { placeId: night.id, memo: '', visited: false },
  ]);
  expect(saved.places[second!.place.id]?.name).toBe(second!.place.name);
  await expect(page.getByRole('combobox', { name: '확인할 장소' })).toContainText(`2. ${second!.place.name}`);
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
  await expect(page.getByRole('combobox', { name: '날짜' })).toContainText('DAY 2 · 장소 3곳');
  await expect(page.getByRole('region', { name: '여행 날짜가 아직 없어요' })).toBeVisible();
  await expect(page.getByRole('article', { name: '바꿔볼 장소' })).toBeVisible();
  expect(forecastCalls).toBe(0);
});

test('the chosen alternative can be explained by the AI docent only when asked', async ({ page }) => {
  const docentCalls: string[] = [];
  await page.route('**/api/docent/**', (route) => {
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

test('another stop of the day can be picked from the place selector', async ({ page }) => {
  await openWeather(page, { status: 200, body: forecast('ok', [slot('15:00', 70)]) });
  await page.getByRole('combobox', { name: '확인할 장소' }).click();
  await page.getByRole('option', { name: `3. ${night.name}` }).click();
  await expect(page).toHaveURL(/\/weather\?day=2&item=2$/);
  await expect(page.getByRole('article', { name: '원래 일정' }).getByRole('heading')).toHaveText(night.name);
});
