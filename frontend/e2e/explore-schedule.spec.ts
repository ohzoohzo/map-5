import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { catalogResponse, expect, expectNames, readCatalog, startTrip, test } from './support';

test('어디 갈까?: 시·도와 동네로 실제 관광지를 좁히고 후보함에 모은다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  expect(busan.places.every((place) => place.address.startsWith('부산'))).toBe(true);
  await expect(page.getByRole('heading', { name: '가고 싶은 곳을, 나의 하루에' })).toBeVisible();
  await expect(page.getByText('여행 장소를 담고, 일정과 동선을 계획해요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '1. 어디 갈까?', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '2. 언제 갈까?', exact: true })).toBeVisible();
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

  const filter = page.locator('.filter-row');
  const actions = page.locator('.explore-actions');
  await expect(filter).toHaveCSS('margin-bottom', '0px');
  await expect(filter).toHaveCSS('padding-bottom', '16px');
  for (const name of ['남구', '수영구', '영도구', '해운대구']) {
    await page.getByRole('group', { name: '동네' }).getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('group', { name: '동네' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const gap = await actions.evaluate((element) => element.getBoundingClientRect().top - document.querySelector('.filter-row')!.getBoundingClientRect().bottom);
    expect(gap, `${name} 선택 후 LNB와 검색 사이에 과도한 공백이 생기지 않는다`).toBeLessThan(48);
  }
  await page.getByRole('group', { name: '동네' }).getByRole('button', { name: district, exact: true }).click();
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

test('GNB를 네 메뉴로 묶고 이동 전 확인하기는 3. 날씨 체크로, 단계 바는 4. 어떻게 갈까?와 연결한다', async ({ page }) => {
  await startTrip(page);
  const navigation = page.getByRole('navigation', { name: '여행 설계' });
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
  await expect(navigation.getByRole('link', { name: '여행 계획하기' })).toHaveAttribute('href', '/explore');
  await expect(navigation.getByRole('link', { name: 'AI 도슨트' })).toHaveAttribute('href', '/docent');

  await navigation.getByRole('link', { name: '이동 전 확인하기' }).click();
  await expect(page).toHaveURL(/\/weather$/);
  await expect(navigation.getByRole('link', { name: '이동 전 확인하기' })).toHaveAttribute('aria-current', 'page');
  // 선택한 메뉴는 강조 파랑, 나머지는 회색
  await expect(navigation.getByRole('link', { name: '이동 전 확인하기' })).toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(navigation.getByRole('link', { name: '홈' })).not.toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(page.locator('.site-header .brand > span'), '로고 글씨는 진한 네이비 한 색').toHaveCSS('color', 'rgb(0, 41, 102)');
  await expect(page.locator('.site-header .brand-dot')).toHaveCSS('color', 'rgb(0, 41, 102)');
  await expect(page.getByRole('link', { name: 'PinDay', exact: true })).toBeVisible();
  const steps = page.locator('.trip-counts');
  await expect(steps.getByRole('button')).toHaveText(['3. 날씨 체크', '4. 어떻게 갈까?']);
  const weatherStep = steps.getByRole('button', { name: '3. 날씨 체크', exact: true });
  const transportStep = steps.getByRole('button', { name: '4. 어떻게 갈까?', exact: true });
  await expect(weatherStep).toHaveClass(/active/);
  await expect(weatherStep).toHaveCSS('background-color', 'rgb(234, 242, 254)');
  await expect(transportStep).not.toHaveClass(/active/);
  await expect(steps.getByTestId(IDS.CANDIDATE_COUNT)).toHaveCount(0);
  await expect(steps.getByTestId(IDS.SCHEDULED_COUNT)).toHaveCount(0);

  await transportStep.click();
  await expect(page).toHaveURL(/\/transport$/);
  await expect(navigation.getByRole('link', { name: '이동 전 확인하기' })).toHaveAttribute('aria-current', 'page');
  await expect(steps.getByRole('button', { name: '4. 어떻게 갈까?', exact: true })).toHaveClass(/active/);
  await steps.getByRole('button', { name: '3. 날씨 체크', exact: true }).click();
  await expect(page).toHaveURL(/\/weather$/);

  await page.goto('/before-travel');
  await expect(page.getByRole('heading', { name: '이동 전 확인하기' })).toHaveCount(0);
});

test('모바일 어디 갈까?: 필터와 검색 아래 리스트는 왼쪽 한 열, 지도는 오른쪽에 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTrip(page);

  const filter = page.locator('.filter-row');
  const tripBar = page.locator('.trip-bar-wrap');
  const actions = page.locator('.explore-actions');
  const searchField = actions.locator('input[type="search"]');
  const searchButton = actions.locator('form button[type="submit"]');
  const randomButton = actions.locator(':scope > button');
  const map = page.locator('.explore-map');
  const frame = map.locator('.map-frame');
  const list = page.locator('.result-line');
  const placeGrid = page.getByTestId(IDS.PLACE_GRID);
  const layout = await page.evaluate(() => {
    const filterElement = document.querySelector('.filter-row')!;
    const actionsElement = document.querySelector('.explore-actions')!;
    const mapElement = document.querySelector('.explore-map')!;
    const listElement = document.querySelector('.result-line')!;
    return {
      filterTop: filterElement.getBoundingClientRect().top,
      filterBottom: filterElement.getBoundingClientRect().bottom,
      actionsTop: actionsElement.getBoundingClientRect().top,
      actionsBottom: actionsElement.getBoundingClientRect().bottom,
      mapTop: mapElement.getBoundingClientRect().top,
      mapBottom: mapElement.getBoundingClientRect().bottom,
      listTop: listElement.getBoundingClientRect().top,
      listLeft: document.querySelector('.explore-list')!.getBoundingClientRect().left,
      mapLeft: mapElement.getBoundingClientRect().left,
      filterOverflowX: getComputedStyle(filterElement).overflowX,
      filterBackground: getComputedStyle(filterElement).backgroundColor,
      tripBarBackground: getComputedStyle(document.querySelector('.trip-bar-wrap')!).backgroundColor,
      filterMarginBottom: getComputedStyle(filterElement).marginBottom,
      filterClientWidth: filterElement.clientWidth,
      filterScrollWidth: filterElement.scrollWidth,
    };
  });

  await expect(filter).toBeVisible();
  await expect(tripBar).toBeVisible();
  await expect(actions).toBeVisible();
  await expect(searchField).toBeVisible();
  await expect(searchButton).toBeVisible();
  await expect(randomButton).toBeVisible();
  await expect(map).toBeVisible();
  await expect(frame).toBeVisible();
  await expect(list).toBeVisible();
  expect(layout.filterBottom).toBeLessThanOrEqual(layout.actionsTop);
  expect(layout.actionsBottom).toBeLessThan(layout.mapTop);
  expect(layout.actionsBottom).toBeLessThan(layout.listTop);
  expect(layout.listLeft).toBeLessThan(layout.mapLeft);
  expect(Math.abs(layout.listTop - layout.mapTop)).toBeLessThan(1);
  expect(layout.filterBackground).toBe('rgb(255, 255, 255)');
  expect(layout.tripBarBackground).toBe('rgb(255, 255, 255)');
  const steps = page.locator('.trip-bar-wrap .count-chip');
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toHaveClass(/active/);
  await expect(steps.nth(0)).toHaveCSS('background-color', 'rgb(234, 242, 254)');
  await expect(steps.nth(0)).toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(steps.nth(0)).toHaveCSS('font-weight', '700');
  await expect(steps.nth(1)).not.toHaveClass(/active/);
  await expect(steps.nth(1)).not.toHaveCSS('background-color', 'rgb(234, 242, 254)');
  await expect(steps.nth(1)).not.toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(steps.nth(1)).not.toHaveCSS('font-weight', '700');
  expect(layout.filterMarginBottom).toBe('0px');
  expect(layout.filterScrollWidth).toBeLessThanOrEqual(layout.filterClientWidth);
  expect(layout.filterOverflowX).not.toBe('auto');
  expect(await map.evaluate((element) => getComputedStyle(element).position)).toBe('static');
  expect((await frame.boundingBox())!.width).toBeGreaterThan(0);
  const mapBounds = await map.boundingBox();
  const listBounds = await page.locator('.explore-list').boundingBox();
  expect(mapBounds!.width).toBeCloseTo(listBounds!.width, 0);
  expect(await frame.evaluate((element) => element.getBoundingClientRect().height)).toBe(450);
  const controls = await Promise.all([searchField, searchButton, randomButton].map((locator) => locator.boundingBox()));
  const controlCenters = controls.map((box) => box!.y + box!.height / 2);
  expect(Math.max(...controlCenters) - Math.min(...controlCenters)).toBeLessThan(1);
  expect(await placeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
  expect(await placeGrid.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
  expect(await placeGrid.evaluate((element) => element.clientHeight)).toBe(450);
  expect(await placeGrid.evaluate((element) => element.scrollHeight)).toBeGreaterThan(await placeGrid.evaluate((element) => element.clientHeight));
});

test('가장 작은 화면은 리스트 절반과 지도 절반을 나란히 보여준다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTrip(page);
  const list = page.locator('.explore-list');
  const map = page.locator('.explore-map');
  const listBounds = await list.boundingBox();
  const mapBounds = await map.boundingBox();
  expect(mapBounds!.width).toBeCloseTo(listBounds!.width, 0);
  expect(mapBounds!.x).toBeGreaterThan(listBounds!.x + listBounds!.width);
  expect(await page.getByTestId(IDS.PLACE_GRID).evaluate((element) => element.clientHeight)).toBe(450);
  expect(await map.locator('.map-frame').evaluate((element) => element.getBoundingClientRect().height)).toBe(450);
});

test('가장 작은 화면은 결과를 숫자와 단위만 표시하고 지도 팝업을 숨긴다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const catalog = await startTrip(page);
  const place = catalog.places[0]!;
  const resultLine = page.locator('.result-line');
  await expect(resultLine.getByTestId(IDS.RESULT_COUNT)).toBeVisible();
  await expect(resultLine.locator('.result-label')).toBeHidden();
  await expect(resultLine.locator('.result-source')).toBeHidden();
  await expect(resultLine.locator('> :first-child')).toContainText(`${catalog.total}곳`);

  await page.getByRole('button', { name: `${place.name} 지도에서 보기`, exact: true }).click();
  await expect(page.locator('.map-popup')).toBeHidden();
});

test('좁은 반응형에서도 리스트와 지도를 좌우 반반으로 나눈다', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await startTrip(page);
  const placeGrid = page.getByTestId(IDS.PLACE_GRID);
  await expect(placeGrid).toBeVisible();
  await expect.poll(() => placeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBeGreaterThanOrEqual(1);
  const map = await page.locator('.explore-map').boundingBox();
  const list = await page.locator('.explore-list').boundingBox();
  expect(map!.width).toBeCloseTo(list!.width, 0);
  expect(await placeGrid.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
  expect(await page.locator('.explore-map .map-frame').evaluate((element) => element.getBoundingClientRect().height)).toBe(300);
  expect(map!.x).toBeGreaterThan(list!.x + list!.width);
});

test('중간 너비에서도 장소 목록 왼쪽·지도 오른쪽을 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 900 });
  await startTrip(page);
  const map = page.locator('.explore-map');
  const list = page.locator('.explore-list');
  const mapBounds = await map.boundingBox();
  const listBounds = await list.boundingBox();
  expect(mapBounds!.width).toBe(300);
  expect(mapBounds!.x).toBeGreaterThan(listBounds!.x + listBounds!.width);
  expect(await map.locator('.map-frame').evaluate((element) => element.getBoundingClientRect().height)).toBe(300);
  const placeGrid = page.getByTestId(IDS.PLACE_GRID);
  await expect.poll(() => placeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
});

for (const { width, columns, chipRows } of [
  { width: 800, columns: 1, chipRows: 2 },
  { width: 892, columns: 1, chipRows: 2 },
  { width: 893, columns: 2, chipRows: 1 },
  { width: 894, columns: 2, chipRows: 1 },
  { width: 900, columns: 2, chipRows: 1 },
  { width: 901, columns: 2, chipRows: 1 },
  { width: 1100, columns: 2, chipRows: 1 },
]) {
  test(`${width}px에서 동네 필터가 ${chipRows}줄일 때 장소 목록을 ${columns}열로 표시한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await startTrip(page);
    const placeGrid = page.getByTestId(IDS.PLACE_GRID);
    const districtChips = page.locator('.district-chips');
    await expect.poll(() => placeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(columns);
    expect(await districtChips.evaluate((element) => new Set([...element.querySelectorAll('button')].map((button) => Math.round(button.getBoundingClientRect().top))).size)).toBe(chipRows);
  });
}

test('여행 단계 버튼이 두 번째 줄이면 양옆을 채운다', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await startTrip(page);
  const tripBar = page.locator('.trip-bar');
  const facts = tripBar.locator('.trip-fact');
  const counts = tripBar.locator('.trip-counts');
  const buttons = counts.locator('.count-chip');
  const factBottom = await facts.last().evaluate((element) => element.getBoundingClientRect().bottom);
  const countsBounds = await counts.boundingBox();
  const barBounds = await tripBar.boundingBox();
  expect(countsBounds!.y).toBeGreaterThan(factBottom);
  expect(countsBounds!.width / barBounds!.width).toBeGreaterThan(0.9);
  const buttonBounds = await Promise.all([buttons.nth(0).boundingBox(), buttons.nth(1).boundingBox()]);
  expect(buttonBounds[0]!.width).toBeCloseTo(buttonBounds[1]!.width, 0);
});

for (const width of [1280, 1440]) {
  test(`${width}px 화면에서 목록은 왼쪽, 지도는 오른쪽에 두고 목록을 5열로 표시한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await startTrip(page);
    const map = page.locator('.explore-map');
    await expect(map).toBeVisible();
    const mapBounds = await map.boundingBox();
    expect(mapBounds!.width).toBe(300);
    expect(await map.locator('.map-frame').evaluate((element) => element.getBoundingClientRect().height)).toBe(300);
    const list = page.locator('.explore-list');
    const listBounds = await list.boundingBox();
    expect(mapBounds!.x).toBeGreaterThan(listBounds!.x + listBounds!.width);
    expect(await map.evaluate((element) => getComputedStyle(element).position)).toBe('static');
    const placeGrid = page.getByTestId(IDS.PLACE_GRID);
    await expect.poll(() => placeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(5);
  });
}

test('언제 갈까?: 후보를 날짜에 배치·정렬하고, 기간을 줄이면 뒤쪽 일정은 후보함으로 돌아간다', async ({ page }) => {
  const busan = await startTrip(page);
  const [a, b, c] = busan.places;
  for (const place of [a!, b!, c!]) await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole('heading', { name: '가고 싶은 곳을, 나의 하루에' })).toBeVisible();
  await expect(page.getByText('여행 장소를 담고, 일정과 동선을 계획해요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '1. 어디 갈까?', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '2. 언제 갈까?', exact: true })).toBeVisible();
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

test('언제 갈까?: 지도·일정·지역 이야기를 순서대로 배치하고 팝업에서 날짜별 색상으로 추가한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();

  const map = page.locator('.planner-map');
  const schedulePanel = page.locator('.schedule-panel');
  const regionStory = page.locator('.docent-side');
  await expect(page.locator('.planner-map')).toHaveCount(1);
  await expect(map.locator('.map-toolbar')).toContainText('지도별 확인');
  await expect(map.locator('.map-toolbar')).toContainText('날짜별 확인');
  const left = await map.boundingBox();
  const center = await schedulePanel.boundingBox();
  const right = await regionStory.boundingBox();
  expect(left!.x).toBeLessThan(center!.x);
  expect(center!.x).toBeLessThan(right!.x);

  await page.locator('.unscheduled-list .visit-name').click();
  const popup = map.locator('.map-popup');
  const dayActions = popup.locator('.popup-day-action');
  await expect(dayActions).toHaveCount(3);
  await expect(dayActions.nth(0)).toHaveText('DAY 1 추가');
  await expect(dayActions.nth(1)).toHaveText('DAY 2 추가');
  await expect(dayActions.nth(2)).toHaveText('DAY 3 추가');
  expect(await popup.locator('.popup-day-actions').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  for (let index = 0; index < 3; index += 1) {
    const actionColor = await dayActions.nth(index).evaluate((element) => getComputedStyle(element).getPropertyValue('--day-color'));
    const tabColor = await page.getByRole('tab', { name: new RegExp(`DAY ${index + 1}`) })
      .evaluate((element) => getComputedStyle(element).getPropertyValue('--day-color'));
    expect(actionColor).toBe(tabColor);
  }

  await page.getByRole('button', { name: 'DAY 2 추가' }).click();
  await expect(page.getByRole('button', { name: 'DAY 2 추가' })).toBeDisabled();
  await page.getByRole('button', { name: 'DAY 1 추가' }).click();
  await page.getByRole('tab', { name: /^DAY 1/ }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [place.name]);
});

test('노트북 높이에서도 언제 갈까 지도 전체가 화면 안에 표시된다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 768 });
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();

  const mapCard = page.locator('.planner-map .map-card');
  const mapFrame = mapCard.locator('.map-frame');
  const bounds = await mapFrame.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeLessThan(460);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
  expect((await mapCard.boundingBox())!.y + (await mapCard.boundingBox())!.height).toBeLessThanOrEqual(768);
});

test('모바일 언제 갈까?: 일정 정보보다 먼저 300px 일반 지도를 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();

  const map = page.locator('.planner-map');
  const panel = page.locator('.schedule-panel');
  const tripBar = page.locator('.trip-bar-wrap');
  await expect(map).toBeVisible();
  await expect(panel).toBeVisible();
  const steps = tripBar.locator('.count-chip');
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).not.toHaveClass(/active/);
  await expect(steps.nth(0)).not.toHaveCSS('background-color', 'rgb(234, 242, 254)');
  await expect(steps.nth(0)).not.toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(steps.nth(0)).not.toHaveCSS('font-weight', '700');
  await expect(steps.nth(1)).toHaveClass(/active/);
  await expect(steps.nth(1)).toHaveCSS('background-color', 'rgb(234, 242, 254)');
  await expect(steps.nth(1)).toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(steps.nth(1)).toHaveCSS('font-weight', '700');
  expect(await map.evaluate((element) => getComputedStyle(element).position)).toBe('static');
  expect(await map.locator('.map-frame').evaluate((element) => element.getBoundingClientRect().height)).toBe(300);
  expect((await map.boundingBox())!.y).toBeLessThan((await panel.boundingBox())!.y);
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => tripBar.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(66);
  expect((await page.locator('.site-header').boundingBox())!.y + (await page.locator('.site-header').boundingBox())!.height)
    .toBeLessThanOrEqual((await tripBar.boundingBox())!.y);
  expect(await map.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeLessThan(0);
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

test('언제 갈까?: 후보함 추가 버튼은 검정이고, 플로팅 바에서 이전·다음 단계로 이동한다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();

  const add = page.getByRole('button', { name: `${place.name} DAY 1에 추가` });
  const back = page.getByRole('button', { name: '갈 곳 다시 확인' });
  const next = page.getByRole('button', { name: '이동 전 확인' });
  await expect(add).not.toHaveCSS('color', 'rgb(0, 102, 255)');
  await expect(back).toBeVisible();
  await expect(next).toBeDisabled();
  await add.click();
  await expect(next).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('schedule-tray.png') });

  await back.click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  await page.getByRole('button', { name: '이동 전 확인' }).click();
  await expect(page).toHaveURL(/\/weather$/);
});

test('언제 갈까?: 날짜마다 일정을 역순으로 바꾸거나 제거한다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  const [a, b, c] = busan.places;
  for (const place of [a!, b!, c!]) await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  const reverse = page.getByRole('button', { name: '역순으로 변경하기' });
  const clear = page.getByRole('button', { name: '일정 제거하기' });
  await expect(reverse).toBeDisabled();
  await expect(clear).toBeDisabled();

  await page.getByRole('button', { name: `${a!.name} DAY 1에 추가` }).click();
  await page.getByRole('button', { name: `${b!.name} DAY 1에 추가` }).click();
  await page.getByRole('tab', { name: /^DAY 2/ }).click();
  await page.getByRole('button', { name: `${c!.name} DAY 2에 추가` }).click();
  await page.getByRole('tab', { name: /^DAY 1/ }).click();
  await reverse.click();
  await expectNames(page, IDS.ITINERARY_LIST, [b!.name, a!.name]);
  await page.screenshot({ path: testInfo.outputPath('schedule-day-tools.png') });

  await clear.click();
  await expect(page.getByTestId(IDS.ITINERARY_LIST).locator('li')).toHaveCount(0);
  await expect(page.getByTestId(IDS.SCHEDULED_COUNT)).toHaveText('1');
  await page.getByRole('tab', { name: /^DAY 2/ }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [c!.name]);
});

test('언제 갈까?: 지도별 확인에서는 DAY 탭을 회색으로 두고, 날짜를 고르면 강조한다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  const place = busan.places[0]!;
  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  await page.getByRole('button', { name: `${place.name} DAY 1에 추가` }).click();
  const tabs = page.locator('.day-tab');
  await expect(tabs.nth(0)).not.toHaveClass(/active/);
  await expect(page.locator('.visit-number').first()).not.toHaveCSS('background-color', 'rgb(0, 152, 178)');
  await page.screenshot({ path: testInfo.outputPath('schedule-district.png') });

  await page.getByRole('radio', { name: '날짜별 확인' }).click();
  await expect(tabs.nth(0)).toHaveClass(/active/);
  await expect(page.locator('.visit-number').first()).toHaveCSS('background-color', 'rgb(0, 152, 178)');
  await page.getByRole('radio', { name: '지도별 확인' }).click();
  await expect(tabs.nth(0)).not.toHaveClass(/active/);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveClass(/active/);
});

test('언제 갈까?: 여행 단계 버튼이 두 번째 줄이면 양옆을 채운다', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  const busan = await startTrip(page);
  await page.getByRole('button', { name: `${busan.places[0]!.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  const bar = await page.locator('.trip-bar').boundingBox();
  const counts = await page.locator('.trip-counts').boundingBox();
  expect(counts!.width).toBeGreaterThan(bar!.width - 80);
});

test('언제 갈까?: 후보함에서 바로 빼고, 지역 이야기는 검정 탭과 AI 도슨트와 같은 회색 태그를 쓴다', async ({ page }, testInfo) => {
  const busan = await startTrip(page);
  const [a, b] = busan.places;
  for (const place of [a!, b!]) await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();

  await page.getByRole('button', { name: `${b!.name} 후보함에서 빼기` }).click();
  await expectNames(page, IDS.UNSCHEDULED_LIST, [a!.name]);
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');

  const docent = page.locator('.docent-side');
  await page.getByTestId(IDS.UNSCHEDULED_LIST).locator('.visit-name').click();
  await expect(docent.getByRole('tab', { name: '지역 이야기' })).not.toHaveCSS('color', 'rgb(21, 87, 167)');
  const tag = docent.getByText('지금 보고 있는 곳');
  const gray = await page.evaluate(() => { const probe = document.createElement('span'); probe.style.color = 'var(--semantic-foreground-neutral-secondary)'; probe.style.background = 'var(--semantic-background-neutral-secondary)'; document.body.append(probe); const style = getComputedStyle(probe); const value = { color: style.color, background: style.backgroundColor }; probe.remove(); return value; });
  await expect(tag).toHaveCSS('color', gray.color);
  await expect(tag).toHaveCSS('background-color', gray.background);

  await page.getByRole('tab', { name: /^DAY 2/ }).click();
  await page.getByRole('button', { name: `${a!.name} DAY 2에 추가` }).click();
  await page.getByTestId(IDS.ITINERARY_LIST).locator('.visit-name').click();
  await expect(tag, '일정에 넣어도 DAY 색이 아닌 회색 태그').toHaveCSS('color', gray.color);
  await page.screenshot({ path: testInfo.outputPath('schedule-docent-tag.png') });
});
