import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { expect, expectCatalogRendered, expectItinerary, openCatalog, test } from './support';

test('at 390px a traveler can discover, open the map, and manage a day without horizontal page overflow', async ({ page }, testInfo) => {
  const initial = await openCatalog(page);
  await expect(page.getByRole('tab', { name: '여행지', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: '여행지 검색', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '검색', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('mobile-390.png') });

  const chosen = initial.places[0]!;
  await page.getByRole('button', { name: `${chosen.name} 일정에 담기`, exact: true }).first().click();
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('1');
  await page.getByRole('tab', { name: /^나의 일정/ }).click();
  await expectItinerary(page, [chosen.name]);
  await expect(page.getByRole('combobox', { name: '여행 기간', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `${chosen.name} 일정에서 빼기`, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('mobile-plan-390.png') });

  await page.getByRole('tab', { name: '지도', exact: true }).click();
  await expect(page.getByTestId(IDS.MAP_FRAME)).toBeVisible();
  await expectCatalogRendered(page, initial);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  await page.getByRole('tab', { name: /^나의 일정/ }).click();
  await page.getByRole('button', { name: `${chosen.name} 일정에서 빼기`, exact: true }).click();
  await expectItinerary(page, []);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('0');
});
