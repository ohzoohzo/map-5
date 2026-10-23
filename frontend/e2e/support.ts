import { expect, test as base, type Page, type Response } from '@playwright/test';
import type { CatalogResponse } from '../src/api/client';
import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack || error.message));
    await use();
    expect(errors, 'Pages must not raise browser runtime errors').toEqual([]);
  }, { auto: true }],
});

export { expect };

export function catalogResponse(page: Page, region: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/travel/catalog' && url.searchParams.get('region') === region;
  });
}

export async function readCatalog(response: Response): Promise<CatalogResponse> {
  expect(response.status(), 'The UI must query the real local catalog successfully').toBe(200);
  const catalog: CatalogResponse = await response.json();
  expect(catalog.total).toBe(catalog.places.length);
  return catalog;
}

/** 새 여행을 시작한다: 빈 저장소 → 여행지·기간 선택 → 탐색 화면의 첫 관광지 목록 */
export async function startTrip(page: Page, province = '부산광역시', provinceLabel = '부산', length = '2박 3일'): Promise<CatalogResponse> {
  await page.goto('/explore', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('combobox', { name: '여행지', exact: true }).click();
  await page.getByRole('option', { name: provinceLabel, exact: true }).click();
  await page.getByRole('combobox', { name: '기간', exact: true }).click();
  await page.getByRole('option', { name: length, exact: true }).click();
  const loaded = catalogResponse(page, province);
  await page.getByRole('button', { name: '여행 시작', exact: true }).click();
  const catalog = await readCatalog(await loaded);
  expect(catalog.places.length, 'The official cleaned CSV must contain real destinations in the province').toBeGreaterThan(2);
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(catalog.total));
  return catalog;
}

export async function expectNames(page: Page, testId: string, names: string[]) {
  await expect(page.getByTestId(testId).locator('.visit-name strong')).toHaveText(names);
}

export const noHorizontalOverflow = (page: Page) => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
