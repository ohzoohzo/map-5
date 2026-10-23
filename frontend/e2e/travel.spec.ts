import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { errors } from '@playwright/test';
import { catalogResponse, expect, expectCatalogRendered, expectItinerary, openCatalog, readCatalog, test } from './support';

test('real destination filters update the map input, all table rows, and the result metric together', async ({ page }, testInfo) => {
  const initial = await openCatalog(page);
  await expectCatalogRendered(page, initial);
  await expect(page.getByRole('link', { name: /전국관광지정보표준데이터/ })).toHaveAttribute('href', initial.source_url);
  await page.screenshot({ path: testInfo.outputPath('desktop-1440.png') });

  const region = initial.regions[0]!;
  const regionLoaded = catalogResponse(page, region);
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption(region);
  const regional = await readCatalog(await regionLoaded);
  expect(regional.total).toBeGreaterThan(0);
  expect(regional.total).toBeLessThan(initial.total);
  await expectCatalogRendered(page, regional);

  const query = regional.places[0]!.name;
  const queryLoaded = catalogResponse(page, region, query);
  await page.getByRole('searchbox', { name: '여행지 검색', exact: true }).fill(query);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const searched = await readCatalog(await queryLoaded);
  expect(searched.places.some((place) => place.id === regional.places[0]!.id)).toBe(true);
  await expectCatalogRendered(page, searched);
});

test('a traveler can build days, reorder with the keyboard, remove stops, and reload the saved plan', async ({ page }) => {
  const initial = await openCatalog(page);
  const [first, second, third] = initial.places;
  expect(first && second && third).toBeTruthy();
  const table = page.getByTestId(IDS.PLACES_TABLE);
  await table.getByRole('button', { name: `${first!.name} 일정에 담기`, exact: true }).click();
  await table.getByRole('button', { name: `${second!.name} 일정에 담기`, exact: true }).click();
  await expectItinerary(page, [first!.name, second!.name]);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('2');
  await expect(page.getByTestId(IDS.STRAIGHT_DISTANCE)).not.toHaveText('0');
  const firstRow = table.getByRole('row').filter({ has: page.getByRole('button', { name: first!.name, exact: true }) });
  await expect(firstRow.getByRole('button', { name: '담은 장소', exact: true })).toBeDisabled();

  const moveSecondUp = page.getByRole('button', { name: `${second!.name} 순서 위로`, exact: true });
  await moveSecondUp.focus();
  await moveSecondUp.press('Enter');
  await expectItinerary(page, [second!.name, first!.name]);

  await page.getByRole('combobox', { name: '여행 기간', exact: true }).selectOption('4');
  await page.getByRole('tab', { name: /^4일차/ }).click();
  await expectItinerary(page, []);
  await expect(page.getByTestId(IDS.STRAIGHT_DISTANCE)).toHaveText('0');
  await table.getByRole('button', { name: `${third!.name} 일정에 담기`, exact: true }).click();
  await expectItinerary(page, [third!.name]);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('3');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: '여행 기간', exact: true })).toHaveValue('4');
  await expect(page.getByRole('tab', { name: /^4일차/ })).toHaveAttribute('aria-selected', 'true');
  await expectItinerary(page, [third!.name]);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('3');
  await page.getByRole('tab', { name: /^1일차/ }).click();
  await expectItinerary(page, [second!.name, first!.name]);
  await page.getByRole('button', { name: `${first!.name} 일정에서 빼기`, exact: true }).click();
  await expectItinerary(page, [second!.name]);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('2');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectItinerary(page, [second!.name]);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('2');

  await page.getByRole('combobox', { name: '여행 기간', exact: true }).selectOption('1');
  await expect(page.getByRole('alert')).toContainText('여행 기간을 줄일까요?');
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '여행 기간', exact: true })).toHaveValue('4');
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('2');
  await page.getByRole('combobox', { name: '여행 기간', exact: true }).selectOption('1');
  await page.getByRole('button', { name: '기간 줄이기', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^4일차/ })).toHaveCount(0);
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('1');
  await expectItinerary(page, [second!.name]);
});

test('an unmatched catalog search clears stale results and reset restores real destinations without losing the plan', async ({ page }) => {
  const initial = await openCatalog(page);
  const chosen = initial.places[0]!;
  await page.getByTestId(IDS.PLACES_TABLE).getByRole('button', { name: `${chosen.name} 일정에 담기`, exact: true }).click();

  const query = '검색결과가없어야하는문자열-map5-qa';
  const emptyLoaded = catalogResponse(page, '', query);
  await page.getByRole('searchbox', { name: '여행지 검색', exact: true }).fill(query);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const empty = await readCatalog(await emptyLoaded);
  expect(empty.places).toEqual([]);
  await expectCatalogRendered(page, empty);
  await expect(page.getByText('조건에 맞는 여행지가 없어요', { exact: true })).toBeVisible();
  await expect(page.getByTestId(IDS.SELECTED_PLACE_COUNT)).toHaveText('1');
  await expectItinerary(page, [chosen.name]);

  await page.getByRole('button', { name: '검색 조건 초기화', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: '여행지 검색', exact: true })).toHaveValue('');
  await expectCatalogRendered(page, initial);
  await expectItinerary(page, [chosen.name]);
});

test('saving an HTML trace artifact cannot reload the travel workspace or discard an unfinished search', async ({ page }, testInfo) => {
  await openCatalog(page);
  const search = page.getByRole('searchbox', { name: '여행지 검색', exact: true });
  await search.fill('아직 제출하지 않은 검색어');
  const probe = testInfo.outputPath('traces', 'resources', 'watch-exclusion-probe.html');
  await mkdir(dirname(probe), { recursive: true });
  const navigated = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
    timeout: 2_000,
  }).then(() => true, (error: unknown) => {
    if (error instanceof errors.TimeoutError) return false;
    throw error;
  });
  try {
    await writeFile(probe, '<!doctype html><title>Trace artifact watch regression</title>', 'utf8');
    expect(await navigated, 'Writing a trace-like HTML file must not trigger a Vite page reload').toBe(false);
    await expect(search).toHaveValue('아직 제출하지 않은 검색어');
  } finally {
    await unlink(probe);
  }
});
