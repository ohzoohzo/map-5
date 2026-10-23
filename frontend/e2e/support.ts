import { expect, test as base, type Page, type Response } from '@playwright/test';
import type { CatalogResponse } from '../src/api/client';
import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack || error.message));
    await use();
    expect(errors, 'The travel workspace must not raise browser runtime errors').toEqual([]);
  }, { auto: true }],
});

export { expect };

export function catalogResponse(page: Page, region = '', query = '') {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/travel/catalog'
      && url.searchParams.get('region') === region
      && url.searchParams.get('query') === query;
  });
}

export async function readCatalog(response: Response): Promise<CatalogResponse> {
  expect(response.status(), 'The UI must query the real local catalog successfully').toBe(200);
  const catalog: CatalogResponse = await response.json();
  expect(catalog.total).toBe(catalog.places.length);
  expect(catalog.total).toBeLessThanOrEqual(200);
  return catalog;
}

export async function openCatalog(page: Page): Promise<CatalogResponse> {
  const loaded = catalogResponse(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const catalog = await readCatalog(await loaded);
  expect(catalog.places.length, 'The official cleaned CSV must contain real destinations').toBeGreaterThan(2);
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeEnabled();
  return catalog;
}

export async function expectCatalogRendered(page: Page, catalog: CatalogResponse) {
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(catalog.total));
  await expect(page.getByTestId(IDS.MAP_FRAME)).toHaveAttribute('data-place-count', String(catalog.total));
  const table = page.getByTestId(IDS.PLACES_TABLE);
  await expect(table.locator('tbody tr')).toHaveCount(catalog.total);
  if (catalog.total > 0) {
    await expect(table.locator('tbody tr td:first-child button')).toHaveText(catalog.places.map((place) => place.name));
    await expect(table.locator('tbody tr td:nth-child(2)')).toHaveText(catalog.places.map((place) => place.address || '주소 정보 없음'));
  }
}

export async function expectItinerary(page: Page, names: string[]) {
  const rows = page.getByTestId(IDS.ITINERARY_LIST).getByRole('listitem');
  await expect(rows).toHaveCount(names.length);
  for (let index = 0; index < names.length; index += 1) {
    await expect(rows.nth(index).getByRole('button').first()).toHaveText(names[index]!);
  }
}
