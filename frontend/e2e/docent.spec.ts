import type { DocentPhotos } from '../src/api/generated/model';
import { TRAVEL_TEST_IDS as IDS } from '../src/shared/testIds';
import { expect, noHorizontalOverflow, startTrip, test } from './support';

// 사진 유무에 따라 달라지는 레이아웃을 재현한다. 장소·여행 상태는 실제 카탈로그와 화면 동작을 쓴다.
const photoTitle = '도슨트 사진 배치 회귀 검증';
const photoUrl = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#e1edf7"/></svg>')}`;

for (const viewport of [{ width: 1440, height: 1080 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 일정 도슨트 사진이 패널 안에 맞고 설명이 아래에 놓인다`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/docent/photos?**', (route) => {
      const placeId = new URL(route.request().url()).searchParams.get('place_id')!;
      const photos: DocentPhotos = {
        place_id: placeId,
        photos: [{ url: photoUrl, thumbnail_url: photoUrl, title: photoTitle, license: 'E2E fixture' }],
        source: 'E2E fixture', source_url: '',
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
