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
