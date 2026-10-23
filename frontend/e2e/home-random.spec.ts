import type { Page } from '@playwright/test';
import type { Trip } from '../src/shared/trip/tripStore';
import { catalogResponse, expect, readCatalog, startTrip, test } from './support';

const card = (page: Page) => page.locator('section[aria-labelledby="random-title"]');
const storedTrip = (page: Page): Promise<Trip> => page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));

for (const destination of ['서울특별시', '서울']) {
test(`홈 랜덤 뽑기는 기존 서울 여행(${destination})의 지역과 날짜를 유지한 채 탐색으로 이어진다`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startTrip(page, '서울특별시', '서울');
  const before = await storedTrip(page);
  before.destination = destination;
  await page.evaluate((trip) => localStorage.setItem('pinday.trip.v1', JSON.stringify(trip)), before);
  await page.goto('/');
  await expect(card(page)).toContainText('서울 여행지 하나, 가볍게 뽑아볼까요?', { timeout: 2_000 });
  const loaded = catalogResponse(page, '서울특별시');
  await card(page).getByRole('button', { name: '여행지 랜덤 뽑기', exact: true }).click();
  const seoul = await readCatalog(await loaded);
  await expect(card(page).getByRole('heading', { level: 3 })).toBeVisible();
  const name = await card(page).getByRole('heading', { level: 3 }).innerText();
  expect(seoul.places.some((place) => place.name === name)).toBe(true);
  await card(page).getByRole('button', { name: '후보함에 담기', exact: true }).click();
  await card(page).getByRole('button', { name: '어디 갈까?에서 보기', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('heading', { name: '서울의 어디를 담아볼까요?' })).toBeVisible();
  const after = await storedTrip(page);
  expect(after.destination).toBe(before.destination);
  expect(after.startDate).toBe(before.startDate);
  expect(after.endDate).toBe(before.endDate);
  expect(after.days).toEqual(before.days);
  expect(after.candidateIds).toHaveLength(1);
});
}

test('새 여행은 부산에서 세 번 뽑고 연속 중복 없이 홈에서 고른 날짜로 시작한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByLabel('출발 날짜', { exact: true }).fill('2026-11-10');
  await page.getByLabel('돌아오는 날짜', { exact: true }).fill('2026-11-12');
  const loaded = catalogResponse(page, '부산광역시');
  await card(page).getByRole('button', { name: '여행지 랜덤 뽑기', exact: true }).click();
  const busan = await readCatalog(await loaded);
  let previous = '';
  for (let draw = 1; draw <= 3; draw += 1) {
    await expect(card(page).getByRole('heading', { level: 3 })).toBeVisible();
    await expect(card(page).getByLabel(`남은 기회 ${3 - draw}번`, { exact: true })).toBeVisible();
    const name = await card(page).getByRole('heading', { level: 3 }).innerText();
    expect(busan.places.some((place) => place.name === name)).toBe(true);
    expect(name).not.toBe(previous);
    previous = name;
    if (draw < 3) await card(page).getByRole('button', { name: '다시 뽑기', exact: true }).click();
  }
  await expect(card(page).getByRole('button', { name: '다시 뽑기', exact: true })).toBeDisabled();
  await card(page).getByRole('button', { name: '후보함에 담기', exact: true }).click();
  await card(page).getByRole('button', { name: '어디 갈까?에서 보기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '부산의 어디를 담아볼까요?' })).toBeVisible();
  const trip = await storedTrip(page);
  expect(trip.destination).toBe('부산광역시');
  expect(trip.startDate).toBe('2026-11-10');
  expect(trip.endDate).toBe('2026-11-12');
  expect(trip.candidateIds).toHaveLength(1);
});

test('관광지 요청 실패 뒤 재시도하면 뽑기 기회를 소모하지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let failing = true;
  await page.route('**/api/travel/catalog?*', (route) => failing ? route.abort('failed') : route.continue());
  await page.goto('/');
  await card(page).getByRole('button', { name: '여행지 랜덤 뽑기', exact: true }).click();
  await expect(card(page).getByRole('alert')).toHaveText('관광지를 불러오지 못했어요. 잠시 후 다시 눌러 주세요.');
  await expect(card(page).getByRole('button', { name: '여행지 랜덤 뽑기', exact: true })).toBeEnabled();
  failing = false;
  await card(page).getByRole('button', { name: '여행지 랜덤 뽑기', exact: true }).click();
  await expect(card(page).getByRole('heading', { level: 3 })).toBeVisible();
  await expect(card(page).getByLabel('남은 기회 2번', { exact: true })).toBeVisible();
  await expect(card(page).getByRole('alert')).toHaveCount(0);
});

test('슬롯 연출 중에는 추가 뽑기와 탐색 이동을 막고 한 번만 기회를 사용한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await card(page).getByRole('button', { name: '여행지 랜덤 뽑기', exact: true }).click();
  await expect(card(page).locator('.slot')).toBeVisible();
  await expect(card(page).getByRole('button', { name: '다시 뽑기', exact: true })).toBeDisabled();
  await expect(card(page).getByRole('button', { name: '어디 갈까?에서 보기', exact: true })).toBeDisabled();
  await expect(card(page).getByRole('heading', { level: 3 })).toBeVisible();
  await expect(card(page).getByLabel('남은 기회 2번', { exact: true })).toBeVisible();
  await expect(card(page).getByRole('button', { name: '다시 뽑기', exact: true })).toBeEnabled();
});
