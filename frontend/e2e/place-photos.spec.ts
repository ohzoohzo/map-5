import type { Locator, Page } from '@playwright/test';
import type { CatalogResponse, Place } from '../src/api/client';
import type { DocentPhotos } from '../src/api/generated/model';
import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { expect, expectNames, noHorizontalOverflow, startTrip, test } from './support';

// 실제 카탈로그로 여러 화면과 사진 실패 상태를 왕복하는 사용자 여정의 전체 실행 예산.
test.setTimeout(60_000);

// 장소 목록과 여행 저장은 실제 API/화면을 사용한다. 외부 사진 서비스만 재현한다.
const PHOTO_ORIGIN = 'https://pinday-photo-fixture.example';
const SOURCE_ORIGIN = 'https://gallery.visitkorea.or.kr';
const LICENSE = '공공누리 제3유형 (출처표시 + 변경금지)';
type PhotoState = 'ready' | 'empty' | 'unavailable' | 'broken';
const photoUrl = (id: string) => `${PHOTO_ORIGIN}/${encodeURIComponent(id)}.svg`;
const sourceUrl = (id: string) => `${SOURCE_ORIGIN}/fixture/${encodeURIComponent(id)}`;

async function installPhotos(page: Page, states: ReadonlyMap<string, PhotoState> = new Map()) {
  const requests = new Map<string, number>();
  await page.route(`${PHOTO_ORIGIN}/**`, (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.slice(1, -4));
    if (states.get(id) === 'broken') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Image unavailable' });
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="#d2ebf2"/><circle cx="600" cy="200" r="120" fill="#80bbc9"/></svg>',
    });
  });
  await page.route('**/api/docent/photos?**', (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('place_id')!;
    requests.set(id, (requests.get(id) ?? 0) + 1);
    const state = states.get(id) ?? 'ready';
    if (state === 'unavailable') return route.fulfill({ status: 503, json: { detail: '사진 서비스를 일시적으로 이용할 수 없습니다.' } });
    const body: DocentPhotos = {
      place_id: id,
      photos: state === 'empty' ? [] : [{ url: photoUrl(id), thumbnail_url: photoUrl(id), title: `${url.searchParams.get('name')} 원본`, license: LICENSE }],
      source: '한국관광공사 TourAPI',
      source_url: sourceUrl(id),
    };
    return route.fulfill({ json: body });
  });
  return requests;
}

function placeCard(page: Page, place: Place) {
  return page.getByTestId(IDS.PLACE_GRID).locator('.place-card').filter({ has: page.getByRole('button', { name: `${place.name} 지도에서 보기`, exact: true }) });
}

async function expectPhoto(scope: Locator, place: Place, slideshow = false) {
  await scope.scrollIntoViewIfNeeded();
  const image = scope.getByRole('img', { name: slideshow ? `${place.name} 원본` : `${place.name} 사진`, exact: true });
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute('src', photoUrl(place.id));
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  await expect(scope.locator('.photo-credit')).toHaveCount(0);
  await expect(scope.getByRole('button', { name: /이용조건/ })).toHaveCount(0);
  await expect(scope.getByText(LICENSE, { exact: true })).toHaveCount(0);
  return image;
}

test('같은 장소의 사진과 출처가 탐색 → 후보함 → 일정 → 지도·도슨트에서 재사용된다', async ({ page }) => {
  const requests = await installPhotos(page);
  const catalog = await startTrip(page);
  const place = catalog.places[0]!;
  await expectPhoto(placeCard(page, place), place);

  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  const candidate = page.getByTestId(IDS.CANDIDATE_TRAY).locator('.tray-item').filter({ hasText: place.name });
  await expectPhoto(candidate, place);
  await placeCard(page, place).getByRole('button', { name: `${place.name} 지도에서 보기`, exact: true }).click();
  const popup = page.locator('.map-popup').filter({ hasText: place.name });
  const popupImage = await expectPhoto(popup, place);
  expect(await popupImage.evaluate((image) => image.getBoundingClientRect().height)).toBe(150);
  expect(await popupImage.evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
  expect(await popupImage.evaluate((image) => image.getBoundingClientRect().width))
    .toBe(await popup.locator('.photo-frame').evaluate((frame) => frame.getBoundingClientRect().width));

  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  const unscheduled = page.getByTestId(IDS.UNSCHEDULED_LIST).locator('li').filter({ hasText: place.name });
  await expectPhoto(unscheduled, place);
  await page.getByRole('button', { name: `${place.name} DAY 1에 추가` }).click();
  const visit = page.getByTestId(IDS.ITINERARY_LIST).locator('li').filter({ hasText: place.name });
  await expectPhoto(visit, place);
  await visit.locator('.visit-name').click();
  const schedulePopup = page.locator('.map-popup').filter({ hasText: place.name });
  const schedulePopupImage = await expectPhoto(schedulePopup, place);
  expect(await schedulePopupImage.evaluate((image) => image.getBoundingClientRect().height)).toBe(150);
  expect(await schedulePopupImage.evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
  expect(await schedulePopupImage.evaluate((image) => image.getBoundingClientRect().width))
    .toBe(await schedulePopup.locator('.photo-frame').evaluate((frame) => frame.getBoundingClientRect().width));
  await expectPhoto(page.getByRole('region', { name: 'AI 도슨트', exact: true }), place, true);

  await page.getByRole('link', { name: 'AI 도슨트', exact: true }).click();
  await expect(page).toHaveURL(/\/docent$/);
  await expectPhoto(page.getByRole('region', { name: 'AI 도슨트', exact: true }), place, true);
  await page.getByRole('link', { name: '원래 일정으로', exact: true }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [place.name]);
  expect(requests.get(place.id), '같은 여행의 장소 사진은 화면을 오가도 한 번만 조회한다').toBe(1);
});

test('사진 API가 일시적으로 실패한 뒤 복구되면 SPA로 돌아왔을 때 사진과 출처를 다시 표시한다', async ({ page }) => {
  const response = await page.request.get('/api/travel/catalog', { params: { region: '부산광역시', query: '' } });
  expect(response.ok()).toBe(true);
  const initial = await response.json() as CatalogResponse;
  const place = initial.places[0]!;
  const states = new Map<string, PhotoState>([[place.id, 'unavailable']]);
  const requests = await installPhotos(page, states);
  await startTrip(page);

  const card = placeCard(page, place);
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('.place-visual')).toBeHidden();
  await expect(card.locator('.photo-frame')).toHaveCount(0);
  expect(requests.get(place.id)).toBe(1);
  const documentStartedAt = await page.evaluate(() => performance.timeOrigin);

  states.set(place.id, 'ready');
  await page.locator('.main-nav a[href="/"]').click();
  await expect(page).toHaveURL('/');
  await page.locator('.main-nav a[href="/explore"]').click();
  await expect(page).toHaveURL('/explore');

  await expect.poll(() => requests.get(place.id)).toBe(2);
  await expectPhoto(card, place);
  expect(await page.evaluate(() => performance.timeOrigin), '전체 새로고침 없이 사진을 복구한다').toBe(documentStartedAt);
});

test('사진 정보가 확인된 장소를 사진 없는 장소보다 목록 앞에 둔다', async ({ page }) => {
  const response = await page.request.get('/api/travel/catalog', { params: { region: '부산광역시', query: '' } });
  expect(response.ok()).toBe(true);
  const initial = await response.json() as CatalogResponse;
  const [withoutPhoto, withPhoto] = initial.places;
  expect(initial.places.length).toBeGreaterThanOrEqual(2);
  const states = new Map<string, PhotoState>([[withoutPhoto!.id, 'empty'], [withPhoto!.id, 'ready']]);
  const requests = await installPhotos(page, states);
  await startTrip(page);

  for (const place of [withoutPhoto!, withPhoto!]) {
    await placeCard(page, place).scrollIntoViewIfNeeded();
    await expect.poll(() => requests.get(place.id)).toBe(1);
  }

  const indexOf = (place: Place) => placeCard(page, place).evaluate((element) => Array.from(element.parentElement!.children).indexOf(element));
  await expect.poll(async () => (await indexOf(withPhoto!)) < (await indexOf(withoutPhoto!))).toBe(true);
});

test('사진 없음·API 실패·깨진 이미지에서도 후보 저장과 일정 편집이 동작하고 다른 장소 사진이 섞이지 않는다', async ({ page }) => {
  const response = await page.request.get('/api/travel/catalog', { params: { region: '부산광역시', query: '' } });
  expect(response.ok()).toBe(true);
  const initial = await response.json() as CatalogResponse;
  const [empty, unavailable, broken, good] = initial.places;
  expect(initial.places.length).toBeGreaterThanOrEqual(4);
  const states = new Map<string, PhotoState>([[empty!.id, 'empty'], [unavailable!.id, 'unavailable'], [broken!.id, 'broken']]);
  await installPhotos(page, states);
  await startTrip(page);

  for (const place of [empty!, unavailable!, broken!]) {
    const card = placeCard(page, place);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.place-visual')).toBeHidden();
    await expect(card.locator('.photo-frame')).toHaveCount(0);
    const numberBounds = await card.locator('.place-index').boundingBox();
    const textBounds = await card.locator('.place-copy strong').boundingBox();
    expect(numberBounds).not.toBeNull();
    expect(textBounds).not.toBeNull();
    expect(textBounds!.y).toBeGreaterThanOrEqual(numberBounds!.y + numberBounds!.height);
    await expect(card.locator('img')).toHaveCount(0);
    await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  }
  await expectPhoto(placeCard(page, good!), good!);
  await page.getByRole('button', { name: `${good!.name} 후보함에 저장`, exact: true }).click();
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  for (const place of [empty!, unavailable!, broken!, good!]) await page.getByRole('button', { name: `${place.name} DAY 1에 추가` }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [empty!.name, unavailable!.name, broken!.name, good!.name]);

  // 정상 사진을 본 뒤 실패한 장소로 바꾸어도 이전 사진을 붙여 보여주지 않는다.
  await page.getByTestId(IDS.ITINERARY_LIST).locator('.visit-name').filter({ hasText: good!.name }).click();
  await expectPhoto(page.locator('.map-popup'), good!);
  for (const place of [empty!, unavailable!, broken!]) {
    await page.getByTestId(IDS.ITINERARY_LIST).locator('.visit-name').filter({ hasText: place.name }).click();
    const popup = page.locator('.map-popup');
    await expect(popup.locator('[data-photo-missing="true"]')).toBeHidden();
    await expect(popup.locator('.photo-frame')).toHaveCount(0);
    await expect(popup.locator('img')).toHaveCount(0);
  }
  await page.getByRole('button', { name: `${broken!.name} 순서 위로`, exact: true }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [empty!.name, broken!.name, unavailable!.name, good!.name]);
  await page.getByRole('button', { name: `${empty!.name} 일정에서 빼기`, exact: true }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [broken!.name, unavailable!.name, good!.name]);
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('4');
  await expect(page.getByTestId(IDS.SCHEDULED_COUNT)).toHaveText('3');
});

test('390px에서 변경금지 사진을 자르지 않고 보여주며 출처와 일정이 화면을 넘지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installPhotos(page);
  const catalog = await startTrip(page);
  const place = catalog.places[0]!;
  const card = placeCard(page, place);
  const image = await expectPhoto(card, place);
  await expect(image).toHaveCSS('object-fit', 'contain');
  expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth / node.naturalHeight)).toBe(3);
  await noHorizontalOverflow(page);

  await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
  await expectPhoto(page.getByTestId(IDS.CANDIDATE_TRAY).locator('.tray-item'), place);
  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  await page.getByRole('button', { name: `${place.name} DAY 1에 추가` }).click();
  await page.getByTestId(IDS.ITINERARY_LIST).locator('.visit-name').click();
  const panel = page.getByRole('region', { name: 'AI 도슨트', exact: true });
  await panel.scrollIntoViewIfNeeded();
  const hero = await expectPhoto(panel, place, true);
  await expect(hero).toHaveCSS('object-fit', 'contain');
  const box = (await hero.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  await noHorizontalOverflow(page);
});

test('목록의 화면 밖 장소는 스크롤해서 볼 때 사진을 조회한다', async ({ page }) => {
  const requests = await installPhotos(page);
  const catalog = await startTrip(page);
  const first = catalog.places[0]!;
  const last = catalog.places.at(-1)!;
  await expectPhoto(placeCard(page, first), first);
  expect(requests.get(last.id) ?? 0).toBe(0);
  await placeCard(page, last).scrollIntoViewIfNeeded();
  await expectPhoto(placeCard(page, last), last);
  expect(requests.get(last.id)).toBe(1);
});



test('카드 출처는 푸터의 별도 출처 페이지에서 사진별 원본과 이용조건으로 확인한다', async ({ page }, testInfo) => {
  const requests = await installPhotos(page);
  const catalog = await startTrip(page);
  const place = catalog.places[0]!;
  const card = placeCard(page, place);
  await expectPhoto(card, place);
  const before = await page.evaluate(() => localStorage.getItem('pinday.trip.v1'));
  const sourceLink = page.getByRole('contentinfo').getByRole('link', { name: '데이터·사진 출처', exact: true });
  await sourceLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/sources$/);
  await expect(page.getByRole('heading', { name: '데이터·사진 출처', exact: true })).toBeVisible();
  await expect(page.getByText(`${place.name} 원본`, { exact: true })).toBeVisible();
  await expect(page.getByText('한국관광공사 TourAPI', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(LICENSE, { exact: true }).first()).toBeVisible();
  for (const href of [photoUrl(place.id), sourceUrl(place.id)]) {
    const link = page.locator(`a[href="${href}"]`);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
  expect(requests.get(place.id)).toBe(1);
  expect(requests.get(catalog.places.at(-1)!.id) ?? 0, '출처 확인을 위해 화면 밖 사진까지 추가로 조회하지 않는다').toBe(0);
  await page.screenshot({ path: testInfo.outputPath('photo-sources-desktop.png') });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/explore$/);
  await expectPhoto(placeCard(page, place), place);
  expect(await page.evaluate(() => localStorage.getItem('pinday.trip.v1'))).toBe(before);
  expect(requests.get(place.id)).toBe(1);
  await expect(page.locator('button button, button a, button [role="button"]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('photo-credit-free-desktop.png') });
});

test.describe('터치로 확인하는 사진 출처', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('390px 일정에서 푸터로 사진 출처를 확인하고 돌아와도 후보와 일정이 유지된다', async ({ page }, testInfo) => {
    await installPhotos(page);
    const catalog = await startTrip(page);
    const place = catalog.places[0]!;
    await expectPhoto(placeCard(page, place), place);
    await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).tap();
    await page.getByRole('button', { name: '날짜별 일정 짜기' }).tap();
    await page.getByRole('button', { name: `${place.name} DAY 1에 추가` }).tap();
    const visit = page.getByTestId(IDS.ITINERARY_LIST).locator('li').filter({ hasText: place.name });
    await expectPhoto(visit, place);
    const before = await page.evaluate(() => localStorage.getItem('pinday.trip.v1'));
    await page.getByRole('contentinfo').getByRole('link', { name: '데이터·사진 출처', exact: true }).tap();
    await expect(page).toHaveURL(/\/sources$/);
    const title = page.getByText(`${place.name} 원본`, { exact: true });
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();
    await expect(page.locator(`a[href="${photoUrl(place.id)}"]`)).toBeVisible();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('photo-sources-mobile.png') });
    await page.locator('.main-nav a[href="/explore"]').tap();
    await expect(page).toHaveURL(/\/explore$/);
    await page.getByRole('button', { name: '2. 언제 갈까?', exact: true }).tap();
    await expect(page).toHaveURL(/\/schedule$/);
    await expectNames(page, IDS.ITINERARY_LIST, [place.name]);
    expect(await page.evaluate(() => localStorage.getItem('pinday.trip.v1'))).toBe(before);
    await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
    await expect(page.getByTestId(IDS.SCHEDULED_COUNT)).toHaveText('1');
    await noHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('photo-credit-free-mobile.png') });
  });
});

test('출처 페이지에 직접 방문해도 제공 데이터의 링크와 사진 조회 전 안내를 보여준다', async ({ page }) => {
  await page.goto('/sources', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '데이터·사진 출처', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '전국관광지정보표준데이터', exact: true })).toHaveAttribute('href', 'https://www.data.go.kr/data/15021141/standard.do');
  await expect(page.locator('.main-nav a[href="/sources"]')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(/사진.*조회/);
});
