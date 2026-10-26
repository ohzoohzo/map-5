import type { DocentPhotos } from '../src/api/generated/model';
import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { expect, noHorizontalOverflow, startTrip, test } from './support';

// 사진 유무에 따라 달라지는 레이아웃을 재현한다. 장소·여행 상태는 실제 카탈로그와 화면 동작을 쓴다.
const photoTitle = '도슨트 사진 배치 회귀 검증';
const photoUrl = 'https://pinday-docent-fixture.example/photo.svg';

for (const viewport of [{ width: 1440, height: 1080 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 일정 도슨트 사진이 패널 안에 맞고 설명이 아래에 놓인다`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route(photoUrl, (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#e1edf7"/></svg>' }));
    await page.route('**/api/docent/photos?**', (route) => {
      const placeId = new URL(route.request().url()).searchParams.get('place_id')!;
      const photos: DocentPhotos = {
        place_id: placeId,
        photos: [{ url: photoUrl, thumbnail_url: photoUrl, title: photoTitle, license: 'E2E fixture' }],
        source: 'E2E fixture', source_url: 'https://pinday-docent-fixture.example/',
      };
      return route.fulfill({ json: photos });
    });

    const catalog = await startTrip(page);
    const place = catalog.places.find((each) => each.description.trim() !== '')!;
    expect(place, '사진 옆 설명이 있는 실제 카탈로그 장소가 필요하다').toBeDefined();
    await page.getByRole('button', { name: `${place.name} 후보함에 저장`, exact: true }).click();
    await page.getByRole('button', { name: '날짜별 일정 짜기' }).click();
    await page.getByTestId(IDS.UNSCHEDULED_LIST).locator('.visit-name').filter({ hasText: place.name }).click();

    const panel = page.getByRole('region', { name: 'AI 도슨트', exact: true });
    const image = panel.getByRole('img', { name: photoTitle, exact: true });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    const panelBox = (await panel.boundingBox())!;
    const imageBox = (await image.boundingBox())!;
    const summaryBox = (await panel.locator('.hero-text').boundingBox())!;
    expect(imageBox.x).toBeGreaterThanOrEqual(panelBox.x);
    expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
    expect(summaryBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`schedule-docent-${viewport.width}.png`), fullPage: true });

    if (viewport.width === 1440) {
      // 독립 페이지의 넓은 패널에서는 기존 사진+설명 2열을 유지한다.
      await page.goto('/docent', { waitUntil: 'domcontentloaded' });
      await expect(image).toBeVisible();
      const wideImage = (await image.boundingBox())!;
      const wideSummary = (await panel.locator('.hero-text').boundingBox())!;
      expect(wideSummary.x).toBeGreaterThanOrEqual(wideImage.x + wideImage.width);
      await noHorizontalOverflow(page);
    }
  });
}

test('도슨트 머리말은 다른 화면과 같은 모양이고, 해설 장소 목록은 후보함 저장 여부를 북마크로 보여준다', async ({ page }, testInfo) => {
  const catalog = await startTrip(page);
  const [saved, other] = catalog.places.filter((each) => each.address.startsWith('부산'));
  expect(saved && other, '부산 장소가 두 곳 이상 필요하다').toBeTruthy();
  await page.getByRole('button', { name: `${saved!.name} 후보함에 저장`, exact: true }).click();

  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  const transportTitle = await page.getByRole('heading', { level: 1 }).evaluate((node) => getComputedStyle(node).fontSize);
  await page.goto('/docent', { waitUntil: 'domcontentloaded' });
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveText('핀을 따라, 동네의 이야기를 만나요.');
  await expect(title, '여행 계획하기·이동 전 확인하기와 같은 제목 크기').toHaveCSS('font-size', transportTitle);

  const item = (name: string) => page.getByRole('region', { name: '해설을 들을 장소' }).getByRole('listitem').filter({ hasText: name });
  await expect(item(saved!.name).locator('.bookmark.saved')).toBeVisible();
  await expect(item(saved!.name)).toContainText('후보함에 저장됨');
  await expect(item(other!.name).locator('.bookmark')).toBeVisible();
  await expect(item(other!.name).locator('.bookmark.saved')).toHaveCount(0);
  const [savedColor, otherColor] = await Promise.all([saved!, other!].map((each) => item(each.name).locator('.bookmark').evaluate((node) => getComputedStyle(node).color)));
  // 북마크(저장·미저장)와 선택한 탭은 강조색 대신 검정, '지금 보고 있는 곳' 태그는 회색이다
  const tone = (value: string) => page.evaluate((css) => { const probe = document.createElement('span'); probe.style.color = css; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; }, value);
  const ink = await tone('var(--semantic-foreground-neutral-strong)');
  expect(savedColor).toBe(ink);
  expect(otherColor).toBe(ink);
  await expect(page.getByRole('tab', { name: '지역 이야기' })).toHaveCSS('color', ink);
  await item(other!.name).getByRole('button').click();
  const label = page.getByRole('region', { name: 'AI 도슨트', exact: true }).getByText('지금 보고 있는 곳', { exact: true });
  await expect(label).toHaveCSS('color', await tone('var(--semantic-foreground-neutral-secondary)'));
  await page.getByRole('tab', { name: '최근 소식' }).click();
  await expect(page.getByRole('tab', { name: '최근 소식' })).toHaveCSS('color', ink);
  await expect(page.locator('.news')).toHaveCSS('color', ink);

  await page.screenshot({ path: testInfo.outputPath('docent-bookmarks.png') });
  await page.getByRole('button', { name: '계획 단계로 돌아가기', exact: true }).click();
  await expect(page, '이동 전 확인하기 단계 바와 같이 계획 단계로 돌아간다').toHaveURL(/\/explore$/);
});

test('지역 이야기 AI 해설 카드는 한 장씩 자동으로 넘기고 < > 로 이동하며, 근거 자료는 접어 둔다', async ({ page }, testInfo) => {
  await page.clock.install();
  const sections = [
    { key: 'history', title: '역사와 문화', body: '역사 문단입니다.', reference_indexes: [1] },
    { key: 'feature', title: '동네의 특징', body: '특징 문단입니다.', reference_indexes: [1, 2] },
    { key: 'tip', title: '방문 전 알아두기', body: '방문 팁 문단입니다.', reference_indexes: [] },
  ];
  await page.route('**/api/docent/story?**', (route) => route.fulfill({ json: {
    place_id: new URL(route.request().url()).searchParams.get('place_id'), ready: true, message: '근거 자료를 바탕으로 AI가 정리한 해설이에요.',
    summary: '요약입니다.', sections, model: 'gpt-5-mini', generated_at: '2026-10-26T09:00:00+09:00',
    references: [
      { index: 1, kind: 'catalog', label: '관광지 소개', source: '한국관광공사', url: 'https://example.com/1', date: null },
      { index: 2, kind: 'heritage', label: '문화유산 설명', source: '국가유산청', url: 'https://example.com/2', date: '2026-01-01' },
    ],
  } }));
  await page.goto('/docent', { waitUntil: 'domcontentloaded' });
  await page.getByRole('region', { name: '해설을 들을 장소' }).getByRole('listitem').first().getByRole('button').click();

  const carousel = page.getByRole('region', { name: '지역 이야기 해설' });
  const slide = carousel.locator('.section');
  await expect(slide, '카드는 한 번에 하나만').toHaveCount(1);
  await expect(slide).toContainText('역사와 문화');
  await expect(slide).toContainText('1 / 3');

  // 6초마다 다음 카드로 자동으로 넘어간다
  await page.clock.runFor(6100);
  await expect(slide).toContainText('동네의 특징');

  // < > 버튼과 점으로 이동한다 (마우스를 올린 동안은 자동으로 넘어가지 않는다)
  await carousel.getByRole('button', { name: '다음 해설' }).click();
  await expect(slide).toContainText('방문 전 알아두기');
  await carousel.getByRole('button', { name: '다음 해설' }).click();
  await expect(slide, '마지막 다음은 처음으로').toContainText('역사와 문화');
  await carousel.getByRole('button', { name: '이전 해설' }).click();
  await expect(slide).toContainText('방문 전 알아두기');
  await carousel.getByRole('button', { name: '동네의 특징' }).click();
  await expect(slide).toContainText('특징 문단입니다.');
  await page.clock.runFor(6100);
  await expect(slide, '마우스를 올려 둔 동안은 멈춘다').toContainText('동네의 특징');

  // 근거 자료는 '근거 자료 2건' 토글로 접혀 있다가 펼친다
  const refs = page.locator('details.refs');
  await expect(refs.locator('summary')).toHaveText('근거 자료 2건');
  await expect(refs.getByRole('link').first()).toBeHidden();
  await refs.locator('summary').click();
  await expect(refs.getByRole('link')).toHaveCount(2);
  await expect(refs.getByRole('link').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('docent-carousel.png') });
});
