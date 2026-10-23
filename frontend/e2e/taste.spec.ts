import type { Page } from '@playwright/test';
import type { Trip } from '../src/shared/trip/tripStore';
import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { expect, expectNames, noHorizontalOverflow, startTrip, test } from './support';

const slowAnswers = ['동네 골목을 천천히 구경하기', '2곳을 깊게', '알록달록한 골목길', '그때그때 마음 가는 대로', '“동네를 제대로 느꼈다”'];
const seaAnswers = ['바다 보며 커피 한 잔', '3곳, 쉬엄쉬엄', '노을 지는 바다', '쉬는 시간을 넉넉하게', '“푹 쉬고 왔다”'];
const readTrip = (page: Page): Promise<Trip> => page.evaluate(() => JSON.parse(localStorage.getItem('pinday.trip.v1')!));

async function answerQuestions(page: Page, answers: string[]) {
  for (const answer of answers) await page.getByRole('button', { name: answer, exact: true }).click();
}

test('취향 결과를 저장해 다시 보고, 후보를 토글해도 기존 일정은 보존한 채 장소 탐색으로 이동한다', async ({ page }) => {
  const catalog = await startTrip(page);
  const gamcheon = catalog.places.find((place) => place.name === '감천문화마을')!;
  expect(gamcheon, '실제 부산 카탈로그의 추천 장소가 필요하다').toBeDefined();
  await page.goto('/taste', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: slowAnswers[0]!, exact: true }).click();
  await expect(page.getByRole('heading', { name: '하루에 몇 곳 정도 가면 좋을까요?' })).toBeVisible();
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await expect(page.getByRole('heading', { name: '여행 첫날 아침, 가장 먼저 하고 싶은 건?' })).toBeVisible();
  await answerQuestions(page, slowAnswers);
  await expect(page.getByRole('heading', { name: '느긋한 골목 탐험가', exact: true })).toBeVisible();
  expect((await readTrip(page)).taste).toBe('slow-alley');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '느긋한 골목 탐험가', exact: true })).toBeVisible();
  await expect(page.getByText('결과를 저장하고 ‘어디 갈까?’로 이동해요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 카드 공유', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `${gamcheon.name} 후보함에 저장`, exact: true }).click();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
  await page.getByRole('link', { name: '언제 갈까?', exact: true }).click();
  await page.getByRole('button', { name: `${gamcheon.name} DAY 1에 추가` }).click();
  await expectNames(page, IDS.ITINERARY_LIST, [gamcheon.name]);
  const scheduled = await readTrip(page);

  await page.goto('/taste', { waitUntil: 'domcontentloaded' });
  const remove = page.getByRole('button', { name: `${gamcheon.name} 후보함에서 빼기`, exact: true });
  await expect(remove).toHaveAttribute('aria-pressed', 'true');
  await remove.click();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('0');
  await expect(page.getByTestId(IDS.SCHEDULED_COUNT)).toHaveText('1');
  expect((await readTrip(page)).days).toEqual(scheduled.days);
  expect((await readTrip(page)).candidateIds).not.toContain(gamcheon.id);
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect((await readTrip(page)).days).toEqual(scheduled.days);
  await page.getByRole('button', { name: `${gamcheon.name} 후보함에 저장`, exact: true }).click();
  await expect(page.getByTestId(IDS.CANDIDATE_COUNT)).toHaveText('1');
  await page.getByRole('button', { name: '취향 저장하고 장소 둘러보기', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByTestId(IDS.RESULT_COUNT)).toHaveText(String(catalog.total));
  expect((await readTrip(page)).taste).toBe('slow-alley');
  expect((await readTrip(page)).days).toEqual(scheduled.days);
});

test('390px에서 건너뛰기는 결과를 만들지 않고, 재테스트한 새 결과는 새로고침해도 유지한다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTrip(page);
  await page.goto('/taste', { waitUntil: 'domcontentloaded' });
  await noHorizontalOverflow(page);
  await page.getByRole('link', { name: '건너뛰고 바로 시작하기', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  expect((await readTrip(page)).taste).toBeNull();

  await page.goto('/taste', { waitUntil: 'domcontentloaded' });
  await answerQuestions(page, slowAnswers);
  await expect(page.getByRole('heading', { name: '느긋한 골목 탐험가', exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.getByRole('button', { name: '다시 테스트하기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '여행 첫날 아침, 가장 먼저 하고 싶은 건?' })).toBeVisible();
  await answerQuestions(page, seaAnswers);
  await expect(page.getByRole('heading', { name: '바다 보며 쉬는 힐링러', exact: true })).toBeVisible();
  expect((await readTrip(page)).taste).toBe('sea-healing');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '바다 보며 쉬는 힐링러', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '다대포해수욕장 후보함에 저장', exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('taste-result-390.png'), fullPage: true });
});
