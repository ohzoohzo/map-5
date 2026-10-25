import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { expect, expectNames, noHorizontalOverflow, startTrip, test } from './support';

test('390px에서 목록/지도를 오가며 후보를 담고, 일정 화면까지 가로 넘침이 없다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  await noHorizontalOverflow(page);
  const chosen = busan.places[0]!;
  await page.getByRole('button', { name: `${chosen.name} 후보함에 저장`, exact: true }).click();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
  await page.screenshot({ path: testInfo.outputPath('explore-390.png') });

  await page.getByRole('radio', { name: '지도' }).click();
  await expect(page.getByTestId(IDS.MAP_FRAME)).toBeVisible();
  await expect(page.getByTestId(IDS.PLACE_GRID)).toBeHidden();
  await noHorizontalOverflow(page);

  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  await page.getByRole('button', { name: `${chosen.name} DAY 1에 추가` }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [chosen.name]);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('schedule-390.png') });
});

test('숨긴 모바일 지도는 표시된 크기로 다시 맞추고 일반 크기 변경은 사용자가 이동한 중심을 유지한다', async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({ json: { js_key: 'map-layout-test', place_search_enabled: false } }));
  // SDK boundary spy: relayout deliberately changes its center so missing restoration is observable.
  await page.route('https://dapi.kakao.com/v2/maps/sdk.js?*', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    (() => {
    window.__mapCalls = [];
    class LatLng { constructor(lat, lng) { this.lat = lat; this.lng = lng; } }
    class Map {
      constructor(element, options) { this.element = element; this.center = options.center; this.level = options.level; window.__testMap = this; }
      relayout() { this.center = new LatLng(0, 0); window.__mapCalls.push({ kind: 'layout' }); }
      setBounds() { window.__mapCalls.push({ kind: 'bounds', width: this.element.clientWidth, height: this.element.clientHeight }); }
      setCenter(center) { this.center = center; window.__mapCalls.push({ kind: 'center', level: this.level, lat: center.lat, lng: center.lng }); }
      getCenter() { return this.center; }
      setLevel(level) { this.level = level; } getLevel() { return this.level; } panTo(center) { this.center = center; }
    }
    class Layer { setMap() {} }
    window.kakao = { maps: { load(callback) { callback(); }, LatLng, Map,
      LatLngBounds: class { extend() {} }, CustomOverlay: Layer, Polyline: Layer } };
    })();
  ` }));
  const catalog = await startTrip(page);
  const bounds = () => page.evaluate(() => (window as unknown as { __mapCalls: { kind: string; width: number; height: number }[] }).__mapCalls.filter((call) => call.kind === 'bounds'));
  await expect(page.getByTestId(IDS.MAP_FRAME)).toHaveAttribute('data-map-status', 'ready');
  expect(await bounds()).toEqual([]);
  await page.getByRole('radio', { name: '지도', exact: true }).click();
  await expect.poll(async () => (await bounds()).length).toBeGreaterThan(0);
  expect((await bounds()).every((call) => call.width > 0 && call.height > 0)).toBe(true);
  const before = (await bounds()).length;
  await page.evaluate(() => {
    const runtime = window as unknown as { __testMap: { setCenter(center: { lat: number; lng: number }): void } };
    runtime.__testMap.setCenter({ lat: 35.1, lng: 129.1 });
  });
  const layouts = () => page.evaluate(() => (window as unknown as { __mapCalls: { kind: string }[] }).__mapCalls.filter((call) => call.kind === 'layout').length);
  const previousLayouts = await layouts();
  await page.setViewportSize({ width: 410, height: 844 });
  await expect.poll(layouts).toBeGreaterThan(previousLayouts);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __testMap: { getCenter(): { lat: number; lng: number } } }).__testMap.getCenter())).toEqual({ lat: 35.1, lng: 129.1 });
  expect((await bounds()).length).toBe(before);
  await page.getByRole('radio', { name: '목록', exact: true }).click();
  await expect(page.getByTestId(IDS.MAP_FRAME)).toBeHidden();
  await page.getByRole('radio', { name: '지도', exact: true }).click();
  await expect.poll(async () => (await bounds()).length).toBeGreaterThan(before);

  await page.getByRole('radio', { name: '목록', exact: true }).click();
  const place = catalog.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기', exact: true }).click();
  await page.getByRole('button', { name: `${place.name} DAY 1에 추가`, exact: false }).click();
  // Kakao rounds center coordinates to map pixels: apply the final zoom before
  // centering a lone pin, otherwise world-zoom rounding becomes a large offset.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mapCalls: { kind: string; level: number; lat: number; lng: number }[] }).__mapCalls.filter((call) => call.kind === 'center').at(-1)))
    .toEqual({ kind: 'center', level: 5, lat: place.latitude, lng: place.longitude });
});
