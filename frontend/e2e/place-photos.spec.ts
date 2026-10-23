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
  await expect(scope).toContainText('한국관광공사');
  await expect(scope).toContainText('공공누리 제3유형');
  if (!slideshow) await expect(scope.locator('.photo-credit')).toHaveAttribute('title', new RegExp(sourceUrl(place.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
  await expectPhoto(page.locator('.map-popup').filter({ hasText: place.name }), place);

  await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
  const unscheduled = page.getByTestId(IDS.UNSCHEDULED_LIST).locator('li').filter({ hasText: place.name });
  await expectPhoto(unscheduled, place);
  await page.getByRole('button', { name: `${place.name} DAY 1에 추가` }).click();
  const visit = page.getByTestId(IDS.ITINERARY_LIST).locator('li').filter({ hasText: place.name });
  await expectPhoto(visit, place);
  await visit.locator('.visit-name').click();
  await expectPhoto(page.locator('.map-popup').filter({ hasText: place.name }), place);
  await expectPhoto(page.getByRole('region', { name: 'AI 도슨트', exact: true }), place, true);

  await page.getByRole('link', { name: 'AI 도슨트', exact: true }).click();
  await expect(page).toHaveURL(/\/docent$/);
  await expectPhoto(page.getByRole('region', { name: 'AI 도슨트', exact: true }), place, true);
  await page.getByRole('link', { name: '원래 일정으로', exact: true }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [place.name]);
  expect(requests.get(place.id), '같은 여행의 장소 사진은 화면을 오가도 한 번만 조회한다').toBe(1);
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
    await expect(card.getByRole('img', { name: `${place.name} 사진 없음`, exact: true })).toBeVisible();
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
    await expect(popup.getByRole('img', { name: `${place.name} 사진 없음`, exact: true })).toBeVisible();
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
