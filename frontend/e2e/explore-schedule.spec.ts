import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { catalogResponse, expect, expectNames, readCatalog, startTrip, test } from './support';

test('어디 갈까?: 시·도와 동네로 실제 관광지를 좁히고 후보함에 모은다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  expect(busan.places.every((place) => place.address.startsWith('부산'))).toBe(true);
  await expect(page.getByRole('heading', { name: '가고 싶은 곳을, 나의 하루에' })).toBeVisible();
  await expect(page.getByText('여행 장소를 담고, 일정과 동선을 계획해요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '1. 장소 선택', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '2. 일정 선택', exact: true })).toBeVisible();
  const desktopPositions = await page.evaluate(() => ({
    listLeft: document.querySelector('.explore-list').getBoundingClientRect().left,
    mapLeft: document.querySelector('.explore-map').getBoundingClientRect().left,
    resultTop: document.querySelector('.result-line').getBoundingClientRect().top,
    mapTop: document.querySelector('.explore-map').getBoundingClientRect().top,
  }));
  expect(desktopPositions.listLeft).toBeLessThan(desktopPositions.mapLeft);
  expect(desktopPositions.resultTop - desktopPositions.mapTop).toBeLessThan(250);
  await page.screenshot({ path: testInfo.outputPath('explore-1440.png') });

  const district = busan.regions.find((region) => region.startsWith('부산광역시 '))!.slice('부산광역시 '.length);
  const narrowed = catalogResponse(page, `부산광역시 ${district}`);
  await page.getByRole('group', { name: '동네' }).getByRole('button', { name: district, exact: true }).click();
  const local = await readCatalog(await narrowed);
  expect(local.total).toBeLessThan(busan.total);
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(local.total));

  const [first, second] = local.places.length > 1 ? local.places : busan.places;
  await page.getByRole('button', { name: `${first!.name} 후보함에 저장`, exact: true }).click();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
  const savedButton = page.getByTestId(IDS.PLACE_GRID).getByRole('button', { name: `${first!.name} 후보함에 저장됨`, exact: true });
  await expect(savedButton).toHaveAttribute('aria-pressed', 'true');
  await savedButton.click();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('0');
  await page.getByRole('button', { name: `${first!.name} 후보함에 저장`, exact: true }).click();
  if (second) await page.getByRole('button', { name: `${second.name} 후보함에 저장`, exact: true }).click();
  await expect(page.getByTestId(IDS.CANDIDATE_TRAY)).toContainText(first!.name);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText(second ? '2' : '1');
});

test('모바일 어디 갈까?: 필터 다음에 100px sticky 지도를 두고 장소 카드를 아래로 배치한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTrip(page);

  const filter = page.locator('.filter-row');
  const map = page.locator('.explore-map');
  const frame = map.locator('.map-frame');
  const list = page.locator('.result-line');
  const layout = await page.evaluate(() => {
    const filterElement = document.querySelector('.filter-row')!;
    const mapElement = document.querySelector('.explore-map')!;
    const listElement = document.querySelector('.result-line')!;
    return {
      filterTop: filterElement.getBoundingClientRect().top,
      mapTop: mapElement.getBoundingClientRect().top,
      listTop: listElement.getBoundingClientRect().top,
      filterOverflowX: getComputedStyle(filterElement).overflowX,
      filterClientWidth: filterElement.clientWidth,
      filterScrollWidth: filterElement.scrollWidth,
    };
  });

  await expect(filter).toBeVisible();
  await expect(map).toBeVisible();
  await expect(frame).toBeVisible();
  await expect(list).toBeVisible();
  expect(layout.mapTop).toBeLessThan(layout.filterTop);
  expect(layout.filterTop).toBeLessThan(layout.listTop);
  expect(layout.filterScrollWidth).toBeLessThanOrEqual(layout.filterClientWidth);
  expect(layout.filterOverflowX).not.toBe('auto');
  expect(await map.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect((await frame.boundingBox())!.width).toBeGreaterThan(0);
  expect(await frame.evaluate((element) => element.getBoundingClientRect().height)).toBe(100);
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => page.locator('.trip-bar-wrap').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0);
  await expect.poll(() => map.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(148);
});

test('언제 갈까?: 후보를 날짜에 배치·정렬하고, 기간을 줄이면 뒤쪽 일정은 후보함으로 돌아간다', async ({ page }) => {
  const busan = await startTrip(page);
  const [a, b, c] = busan.places;
  for (const place of [a!, b!, c!]) await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole('heading', { name: '가고 싶은 곳을, 나의 하루에' })).toBeVisible();
  await expect(page.getByText('여행 장소를 담고, 일정과 동선을 계획해요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '1. 장소 선택', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '2. 일정 선택', exact: true })).toBeVisible();
  await expectNames(page, IDS.UNSCHEDULED_LIST, [a!.name, b!.name, c!.name]);

  await page.getByRole('button', { name: `${a!.name} DAY 1에 추가` }).click();
  await page.getByRole('button', { name: `${b!.name} DAY 1에 추가` }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [a!.name, b!.name]);
  await expect(page.getByTestId(IDS.STRAIGHT_DISTANCE)).not.toHaveText('0');
  await page.getByRole('button', { name: `${b!.name} 순서 위로`, exact: true }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [b!.name, a!.name]);

  await page.getByRole('tab', { name: /^DAY 3/ }).click();
  await page.getByRole('button', { name: `${c!.name} DAY 3에 추가` }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [c!.name]);
  await expect(page.getByTestId(IDS.SCHEDULED_COUNT)).toHaveText('3');
  await expect(page.getByTestId(IDS.UNSCHEDULED_LIST)).toContainText('후보를 모두 날짜에 배치했어요.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /^DAY 1/ }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [b!.name, a!.name]);

  await page.getByRole('button', { name: '여행 조건 수정' }).click();
  await page.getByRole('combobox', { name: '기간', exact: true }).click();
  await page.getByRole('option', { name: '1박 2일', exact: true }).click();
  await expect(page.getByText('뒤쪽 날짜의 일정 1곳은 후보함으로 돌아가요.')).toBeVisible();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^DAY 3/ })).toHaveCount(0);
  await expect(page.getByTestId(IDS.SCHEDULED_COUNT)).toHaveText('2');
  await expectNames(page, IDS.UNSCHEDULED_LIST, [c!.name]);

  await page.getByRole('button', { name: `${a!.name} 일정에서 빼기`, exact: true }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [b!.name]);
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('3');
});

test('모바일 언제 갈까?: 일정 정보보다 먼저 100px sticky 지도를 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();

  const map = page.locator('.planner-map');
  const panel = page.locator('.schedule-panel');
  await expect(map).toBeVisible();
  await expect(panel).toBeVisible();
  expect(await map.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(await map.locator('.map-frame').evaluate((element) => element.getBoundingClientRect().height)).toBe(100);
  expect((await map.boundingBox())!.y).toBeLessThan((await panel.boundingBox())!.y);
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => page.locator('.trip-bar-wrap').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0);
  await expect.poll(() => map.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(148);
});

test('카카오 검색 탭은 키가 있으면 시·도·동네로 좁힌 카테고리 검색을, 없으면 이유를 보여준다', async ({ page }) => {
  await startTrip(page);
  const config = await (await page.request.get('/api/config')).json() as { place_search_enabled: boolean };
  if (!config.place_search_enabled) {
    await page.getByRole('tab', { name: '맛집' }).click();
    await expect(page.getByText('장소 검색이 꺼져 있어요')).toBeVisible();
    return;
  }
  const searched = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/travel/search');
  await page.getByRole('tab', { name: '맛집' }).click();
  const response = await searched;
  const url = new URL(response.url());
  expect(url.searchParams.get('query')).toBe('부산 맛집');
  expect(url.searchParams.get('category')).toBe('FD6');
  const body = await response.json() as { total: number };
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(body.total));
});

test('Playwright 추적 HTML을 저장해도 개발 서버가 새로고침하지 않아 입력 중인 검색어가 남는다', async ({ page }, testInfo) => {
  const { mkdir, unlink, writeFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await startTrip(page);
  const search = page.getByRole('searchbox', { name: '장소 검색' });
  await search.fill('아직 제출하지 않은 검색어');
  const probe = testInfo.outputPath('traces', 'resources', 'watch-exclusion-probe.html');
  await mkdir(dirname(probe), { recursive: true });
  const navigated = page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame(), timeout: 2_000 }).then(() => true, () => false);
  try {
    await writeFile(probe, '<!doctype html><title>Trace artifact watch regression</title>', 'utf8');
    expect(await navigated).toBe(false);
    await expect(search).toHaveValue('아직 제출하지 않은 검색어');
  } finally {
    await unlink(probe);
  }
});

test('홈에서 시작한 여행(짧은 목적지 이름)도 어디 갈까?에 그 시·도 관광지를 보여준다', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  const loaded = catalogResponse(page, '부산광역시');
  await page.getByRole('button', { name: '내 여행 시작하기' }).click();
  await expect(page).toHaveURL(/\/explore$/);
  const busan = await readCatalog(await loaded);
  expect(busan.total).toBeGreaterThan(0);
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(busan.total));
  await expect(page.getByRole('heading', { name: '가고 싶은 곳을, 나의 하루에' })).toBeVisible();
});

test('어디 갈까?: 지역 카탈로그 실패를 보여주고 재시도로 저장한 여행과 후보를 복구한다', async ({ page }) => {
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();

  let unavailable = true;
  await page.route('**/api/travel/catalog?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('region') === '' && unavailable) {
      await route.fulfill({ status: 503, json: { detail: '지역 정보를 일시적으로 불러올 수 없습니다.' } });
      return;
    }
    await route.continue();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByText('여행 지역을 불러오지 못했어요')).toBeVisible();
  await expect(page.getByText('지역 정보를 일시적으로 불러올 수 없습니다.')).toBeVisible();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
  await expect(page.getByTestId(IDS.CANDIDATE_TRAY)).toContainText(place.name);

  unavailable = false;
  const recovered = catalogResponse(page, '부산광역시');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  const catalog = await readCatalog(await recovered);
  await expect(page.getByRole('heading', { name: '가고 싶은 곳을, 나의 하루에' })).toBeVisible();
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(catalog.total));
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
  await expect(page.getByText('여행 지역을 불러오지 못했어요')).toHaveCount(0);
});
