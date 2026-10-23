import { expect, test } from './support';
import type { Page, Route } from '@playwright/test';

const places = {
  harbor: {
    id: 'harbor',
    name: '부산항',
    address: '부산광역시 중구',
    latitude: 35.1028,
    longitude: 129.0403,
    category: '관광지',
    description: '',
    phone: '',
    source: 'test',
    source_date: null,
    url: '',
  },
  market: {
    id: 'market',
    name: '국제시장',
    address: '부산광역시 중구 신창동',
    latitude: 35.1014,
    longitude: 129.0287,
    category: '시장',
    description: '',
    phone: '',
    source: 'test',
    source_date: null,
    url: '',
  },
  village: {
    id: 'village',
    name: '감천문화마을',
    address: '부산광역시 사하구',
    latitude: 35.0975,
    longitude: 129.0106,
    category: '관광지',
    description: '',
    phone: '',
    source: 'test',
    source_date: null,
    url: '',
  },
};

const trip = {
  version: 1,
  destination: '부산',
  startDate: '2026-10-24',
  endDate: '2026-10-30',
  taste: null,
  places,
  candidateIds: [],
  days: [
    {
      date: '2026-10-24',
      items: [
        { placeId: 'harbor', memo: '', visited: false },
        { placeId: 'market', memo: '', visited: false },
        { placeId: 'village', memo: '', visited: false },
      ],
    },
    {
      date: '2026-10-25',
      items: [
        { placeId: 'village', memo: '', visited: false },
        { placeId: 'harbor', memo: '', visited: false },
      ],
    },
    ...Array.from({ length: 5 }, (_, index) => ({ date: `2026-10-${26 + index}`, items: [] })),
  ],
  selectedPlaceId: null,
};

async function seedTrip(page: Page, savedTrip = trip) {
  await page.addInitScript((savedTrip) => {
    localStorage.setItem('pinday.trip.v1', JSON.stringify(savedTrip));
  }, savedTrip);
}

type RouteMode = 'transit' | 'walk' | 'car';
type Coordinate = { latitude: number; longitude: number };
type MapRuntime = { __transportLines: { active: boolean; path: Coordinate[] }[]; __transportBounds: Coordinate[][] };

function directionsUrl(mode: 'traffic' | 'walk' | 'car', departure = places.harbor, arrival = places.market) {
  const endpoint = (place: typeof places.harbor) => `${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
  return `https://map.kakao.com/link/by/${mode}/${endpoint(departure)}/${endpoint(arrival)}`;
}

function routeResponse(url: URL, status: 'ok' | 'no_route' = 'ok') {
  const mode = url.searchParams.get('mode') as RouteMode;
  const origin = {
    latitude: Number(url.searchParams.get('start_latitude')),
    longitude: Number(url.searchParams.get('start_longitude')),
  };
  const destination = {
    latitude: Number(url.searchParams.get('end_latitude')),
    longitude: Number(url.searchParams.get('end_longitude')),
  };
  const boarding = { latitude: origin.latitude + 0.0004, longitude: origin.longitude - 0.0003 };
  const routes = mode === 'car' ? [{
    type: 'car', distance_m: 4800, duration_seconds: 660, transfers: null, fare_won: null, toll_won: 0,
    steps: [{ mode: 'car', instruction: '부산항로를 따라 국제시장까지 이동해요.', distance_m: 4800, duration_seconds: 660,
      path: [origin, { latitude: origin.latitude + 0.001, longitude: destination.longitude + 0.002 }, destination] }],
  }, {
    type: 'car', distance_m: 8200, duration_seconds: 840, transfers: null, fare_won: null, toll_won: 2400,
    steps: [{ mode: 'car', instruction: '유료도로를 거쳐 목적지로 이동해요.', distance_m: 8200, duration_seconds: 840,
      path: [origin, { latitude: origin.latitude + 0.004, longitude: origin.longitude + 0.002 },
        { latitude: destination.latitude + 0.003, longitude: destination.longitude + 0.001 }, destination] }],
  }] : mode === 'walk' ? [{
    type: 'walk', distance_m: 1700, duration_seconds: 1500, transfers: null, fare_won: null, toll_won: null,
    steps: [{ mode: 'walk', instruction: '해안 산책로를 따라 목적지까지 걸어요.', distance_m: 1700, duration_seconds: 1500,
      path: [origin, { latitude: origin.latitude - 0.0008, longitude: origin.longitude - 0.001 }, destination] }],
  }] : [{
    type: 'mixed', distance_m: 2200, duration_seconds: 1080, transfers: 1, fare_won: 1550, toll_won: null,
    steps: [
      { mode: 'walk', instruction: '부산항 정류장까지 걸어요.', distance_m: 200, duration_seconds: 180,
        path: [origin, { latitude: origin.latitude + 0.0002, longitude: origin.longitude - 0.0001 }, boarding] },
      { mode: 'bus', instruction: '부산 26번 버스를 타고 국제시장으로 이동해요.', distance_m: 2000, duration_seconds: 900,
        path: [boarding, { latitude: destination.latitude + 0.001, longitude: destination.longitude + 0.0005 }, destination] },
    ],
  }, {
    type: 'subway', distance_m: 3200, duration_seconds: 1560, transfers: 0, fare_won: 1600, toll_won: null,
    steps: [{ mode: 'subway', instruction: '부산 1호선을 타고 남포역에서 내려요.', distance_m: 3200, duration_seconds: 1560,
      path: [origin, { latitude: origin.latitude + 0.003, longitude: origin.longitude + 0.004 }, destination] }],
  }];
  return {
    mode, status, routes: status === 'ok' ? routes : [],
    source: mode === 'car' ? '카카오모빌리티' : '카카오맵',
    source_url: mode === 'car' ? 'https://developers.kakaomobility.com/' : 'https://map.kakao.com/',
  };
}

const fulfillRoutes = (route: Route, status: 'ok' | 'no_route' = 'ok') => route.fulfill({
  json: routeResponse(new URL(route.request().url()), status),
});

async function useMapSpy(page: Page, bootstrapOnly = false, highMapLayer = false) {
  await page.route('**/api/config', (route) => route.fulfill({
    json: { js_key: 'transport-route-test', place_search_enabled: false },
  }));
  // SDK boundary spy: retain active path geometry and viewport bounds while using
  // the same constructors and cleanup calls as the real Kakao SDK.
  await page.route('https://dapi.kakao.com/v2/maps/sdk.js?*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `(() => {
      window.__transportLines = [];
      window.__transportBounds = [];
      class LatLng { constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; } }
      class LatLngBounds { constructor() { this.points = []; } extend(point) { this.points.push(point); } }
      class Map {
        constructor(element, options) {
          this.center = options.center; this.level = options.level;
          if (${highMapLayer}) {
            element.style.position = 'relative';
            const pane = document.createElement('div');
            pane.setAttribute('data-transport-sdk-pane', 'true');
            pane.style.cssText = 'position:absolute;inset:0;z-index:100';
            pane.innerHTML = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e4eaf1" /></svg>';
            element.appendChild(pane);
          }
        }
        setBounds(bounds) { window.__transportBounds.push(bounds.points); }
        setCenter(point) { this.center = point; } getCenter() { return this.center; }
        setLevel(level) { this.level = level; } getLevel() { return this.level; }
        relayout() {} panTo(point) { this.center = point; }
      }
      class Marker { constructor(options) { this.map = options.map; } setMap(map) { this.map = map; } }
      class Polyline {
        constructor(options) { this.record = { active: Boolean(options.map), path: options.path }; window.__transportLines.push(this.record); }
        setMap(map) { this.record.active = Boolean(map); }
      }
      const constructors = { LatLng, LatLngBounds, Map, Marker, Polyline };
      window.__transportSdkLoadCalls = 0;
      const maps = {
        load(callback) {
          window.__transportSdkLoadCalls += 1;
          const ready = () => { Object.assign(maps, constructors); callback(); };
          if (${bootstrapOnly}) queueMicrotask(ready);
          else ready();
        },
        ...(${bootstrapOnly} ? {} : constructors),
      };
      window.__transportSdkInitiallyReady = 'Map' in maps;
      window.kakao = { maps };
    })();`,
  }));
}

const activeMapPoints = (page: Page) => page.evaluate(() => {
  const lines = (window as unknown as Partial<MapRuntime>).__transportLines;
  return lines === undefined ? null : lines.filter((line) => line.active).flatMap((line) => line.path);
});

function defaultRequest(mode: RouteMode = 'transit') {
  return new URL(`https://test.invalid/api/transport/routes?mode=${mode}&start_latitude=35.1028&start_longitude=129.0403&end_latitude=35.1014&end_longitude=129.0287`);
}

const routeGuidance = (page: Page) => page.getByRole('region', { name: '이동 경로 안내', exact: true });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/config', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ js_key: '', place_search_enabled: false }),
  }));
  await page.route('**/api/transport/routes?*', (route) => fulfillRoutes(route));
});

test('selecting a segment updates the Kakao directions link and transport mode', async ({ page }) => {
  await seedTrip(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: /DAY 1/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /국제시장 → 감천문화마을/ }).click();
  await expect(page.getByText('국제시장', { exact: true }).first()).toBeVisible();

  const directions = page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' });
  await expect(directions).toHaveAttribute(
    'href',
    directionsUrl('traffic', places.market, places.village),
  );
  await expect(directions).toHaveAttribute('target', '_blank');
  await expect(directions).toHaveAttribute('rel', 'noopener noreferrer');

  const walking = page.getByRole('button', { name: '도보' });
  await walking.click();
  await expect(walking).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('도보 경로와 예상 이동 시간을 확인해요.', { exact: true })).toBeVisible();
  await expect(directions).toHaveAttribute('href', directionsUrl('walk', places.market, places.village));
  await expect(page.getByText('지도를 사용할 수 없어요.', { exact: true })).toBeVisible();
});

test('changing the day resets the segment to the first consecutive pair', async ({ page }) => {
  await seedTrip(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /국제시장 → 감천문화마을/ }).click();

  await page.getByRole('button', { name: /DAY 2/ }).click();

  await expect(page.getByRole('button', { name: /DAY 2/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute(
      'href',
      directionsUrl('traffic', places.village, places.harbor),
    );
});

test('long segment names stay selectable without horizontal overflow on mobile', async ({ page }) => {
  const departureName = '국립부산과학관 어린이과학관';
  const arrivalName = '국립일제강제동원역사관';
  await page.setViewportSize({ width: 390, height: 844 });
  await seedTrip(page, {
    ...trip,
    places: {
      ...places,
      market: { ...places.market, name: departureName },
      village: { ...places.village, name: arrivalName },
    },
  });
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  const segment = page.getByRole('button', { name: `${departureName} → ${arrivalName}`, exact: true });
  await expect(segment).toHaveAttribute('aria-pressed', 'false');
  await segment.click();
  await expect(segment).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' })).toHaveAttribute(
    'href',
    directionsUrl('traffic', { ...places.market, name: departureName }, { ...places.village, name: arrivalName }),
  );
  await expect(routeGuidance(page).getByText('약 18분', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
});

test('transit alternatives replace the summary, instructions and full route geometry', async ({ page }, testInfo) => {
  await useMapSpy(page);
  await seedTrip(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  const guidance = routeGuidance(page);
  const alternatives = page.getByRole('group', { name: '경로 선택', exact: true });
  const first = alternatives.getByRole('button', { name: /경로 1/ });
  const second = alternatives.getByRole('button', { name: /경로 2/ });
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(guidance.getByText('약 18분', { exact: true })).toBeVisible();
  await expect(guidance.getByText('2.2 km', { exact: true })).toBeVisible();
  await expect(guidance.getByText('환승 1회', { exact: true })).toBeVisible();
  await expect(guidance.getByText('1,550원', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toContainText('부산 26번 버스를 타고 국제시장으로 이동해요.');

  const responses = routeResponse(defaultRequest()).routes;
  const firstPoints = responses[0]!.steps.flatMap((step) => step.path);
  await expect.poll(() => activeMapPoints(page)).toEqual(firstPoints);
  await expect.poll(() => page.evaluate(() => (window as unknown as MapRuntime).__transportBounds.at(-1)))
    .toEqual(expect.arrayContaining(firstPoints));
  await page.screenshot({ path: testInfo.outputPath('transport-inline-transit-desktop.png'), fullPage: true });

  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(guidance.getByText('약 26분', { exact: true })).toBeVisible();
  await expect(guidance.getByText('3.2 km', { exact: true })).toBeVisible();
  await expect(guidance.getByText('환승 0회', { exact: true })).toBeVisible();
  await expect(guidance.getByText('1,600원', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toContainText('부산 1호선을 타고 남포역에서 내려요.');
  await expect(page.getByText('부산 26번 버스를 타고 국제시장으로 이동해요.', { exact: true })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual(responses[1]!.steps.flatMap((step) => step.path));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('transport-inline-transit-390.png'), fullPage: true });
});

test('autoload false SDK bootstrap calls load before requiring map constructors', async ({ page }) => {
  await useMapSpy(page, true);
  await seedTrip(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  await expect(routeGuidance(page).getByText('약 18분', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__transportSdkInitiallyReady'))).toBe(false);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__transportSdkLoadCalls'))).toBeGreaterThan(0);
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest()).routes[0]!.steps.flatMap((step) => step.path));
  await expect(page.getByText('지도를 불러오지 못했어요.', { exact: true })).toHaveCount(0);
});

test('route legend stays painted above the SDK map layers on desktop and mobile', async ({ page }, testInfo) => {
  await useMapSpy(page, false, true);
  await seedTrip(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest()).routes[0]!.steps.flatMap((step) => step.path));

  const map = page.getByRole('region', { name: '선택 구간 지도', exact: true });
  const legend = map.locator('.map-legend');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await legend.scrollIntoViewIfNeeded();
    await expect(legend).toContainText('도보 · 점선');
    await expect(legend).toContainText('버스 · 실선');
    await expect(map.locator('[data-transport-sdk-pane]')).toHaveCount(1);
    // pointer-events:none lets map interaction pass through the legend. Briefly
    // include it in hit testing to inspect paint order, then restore the style.
    await expect.poll(() => legend.evaluate((element) => {
      const previous = element.style.pointerEvents;
      element.style.pointerEvents = 'auto';
      try {
        const bounds = element.getBoundingClientRect();
        const top = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return top !== null && element.contains(top);
      } finally {
        element.style.pointerEvents = previous;
      }
    }), `범례가 ${width}px 화면에서 SDK의 높은 지도 레이어보다 앞에 표시돼야 한다`).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`transport-map-legend-${width}.png`), fullPage: true });
  }
});

test('driving, walking and transit use their own geometry, costs and sources when switching modes', async ({ page }, testInfo) => {
  await useMapSpy(page);
  await seedTrip(page);
  const requests: URL[] = [];
  await page.route('**/api/transport/routes?*', (route) => {
    requests.push(new URL(route.request().url()));
    return fulfillRoutes(route);
  });
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  const guidance = routeGuidance(page);
  await expect(guidance.getByText('약 18분', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '자동차', exact: true }).click();
  await expect(guidance.getByText('약 11분', { exact: true })).toBeVisible();
  await expect(guidance.getByText('4.8 km', { exact: true })).toBeVisible();
  await expect(guidance.getByText('통행료 0원', { exact: true })).toBeVisible();
  await expect(guidance.getByText('출처: 카카오모빌리티', { exact: true })).toBeVisible();
  await expect(page.getByText('자동차 경로와 도로별 이동 안내를 확인해요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toContainText('부산항로를 따라 국제시장까지 이동해요.');
  const drivingRequest = requests.find((url) => url.searchParams.get('mode') === 'car');
  expect(drivingRequest, '자동차 선택은 자동차 경로 API를 요청해야 한다').toBeDefined();
  expect(Object.fromEntries(drivingRequest!.searchParams)).toEqual({
    mode: 'car', start_latitude: '35.1028', start_longitude: '129.0403',
    end_latitude: '35.1014', end_longitude: '129.0287',
  });
  const drivingRoutes = routeResponse(defaultRequest('car')).routes;
  await expect.poll(() => activeMapPoints(page)).toEqual(drivingRoutes[0]!.steps.flatMap((step) => step.path));
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute('href', directionsUrl('car'));

  await page.getByRole('group', { name: '경로 선택', exact: true }).getByRole('button', { name: /경로 2/ }).click();
  await expect(guidance.getByText('약 14분', { exact: true })).toBeVisible();
  await expect(guidance.getByText('8.2 km', { exact: true })).toBeVisible();
  await expect(guidance.getByText('통행료 2,400원', { exact: true })).toBeVisible();
  await expect(guidance.getByText('통행료 0원', { exact: true })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual(drivingRoutes[1]!.steps.flatMap((step) => step.path));
  await page.screenshot({ path: testInfo.outputPath('transport-driving-toll-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('transport-driving-toll-390.png'), fullPage: true });

  await page.getByRole('button', { name: '도보', exact: true }).click();
  await expect(guidance.getByText('약 25분', { exact: true })).toBeVisible();
  await expect(guidance.getByText('1.7 km', { exact: true })).toBeVisible();
  await expect(guidance.getByText('출처: 카카오맵', { exact: true })).toBeVisible();
  await expect(guidance.getByText('통행료', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toContainText('해안 산책로를 따라 목적지까지 걸어요.');
  await expect(page.getByText('유료도로를 거쳐 목적지로 이동해요.', { exact: true })).toHaveCount(0);
  const walkingRequest = requests.find((url) => url.searchParams.get('mode') === 'walk');
  expect(walkingRequest, '도보 선택은 도보 경로 API를 요청해야 한다').toBeDefined();
  expect(Object.fromEntries(walkingRequest!.searchParams)).toEqual({
    mode: 'walk', start_latitude: '35.1028', start_longitude: '129.0403',
    end_latitude: '35.1014', end_longitude: '129.0287',
  });
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest('walk')).routes[0]!.steps.flatMap((step) => step.path));
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute('href', directionsUrl('walk'));

  await page.getByRole('button', { name: '대중교통', exact: true }).click();
  await expect(guidance.getByText('약 18분', { exact: true })).toBeVisible();
  await expect(guidance.getByText('1,550원', { exact: true })).toBeVisible();
  await expect(guidance.getByText('통행료', { exact: false })).toHaveCount(0);
  await expect(guidance.getByText('출처: 카카오맵', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '경로 선택', exact: true }).getByRole('button', { name: /경로 1/ }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest()).routes[0]!.steps.flatMap((step) => step.path));
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute('href', directionsUrl('traffic'));
});

test('changing segment, day and mode clears old guidance and ignores a late response', async ({ page }) => {
  await useMapSpy(page);
  await seedTrip(page);
  let releaseOldResponse: () => void = () => {};
  let oldResponseReleased = false;
  const oldResponseGate = new Promise<void>((resolve) => { releaseOldResponse = resolve; });
  await page.route('**/api/transport/routes?*', async (route) => {
    const url = new URL(route.request().url());
    const response = routeResponse(url);
    const delayed = url.searchParams.get('start_latitude') === '35.1014' && url.searchParams.get('mode') === 'transit';
    if (delayed) await oldResponseGate;
    for (const candidate of response.routes) {
      for (const step of candidate.steps) {
        step.instruction = delayed ? '늦게 도착한 이전 구간 안내' : '지금 선택한 이동 구간 안내';
      }
    }
    // A correct client aborts obsolete fetches, so delivering a held response can
    // find the old request already closed. Both cancellation and ignoring work.
    await route.fulfill({ json: response }).catch((error: unknown) => {
      if (!delayed) throw error;
    });
    if (delayed) oldResponseReleased = true;
  });
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await expect(routeGuidance(page)).toContainText('지금 선택한 이동 구간 안내');
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest()).routes[0]!.steps.flatMap((step) => step.path));

  const pending = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/transport/routes' && url.searchParams.get('start_latitude') === '35.1014';
  });
  await page.getByRole('button', { name: /국제시장 → 감천문화마을/ }).click();
  await pending;
  await expect(page.getByText('이동 경로를 불러오는 중이에요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual([]);

  await page.getByRole('button', { name: /DAY 2/ }).click();
  await page.getByRole('button', { name: '도보', exact: true }).click();
  await expect(routeGuidance(page)).toContainText('25분');
  const expectedUrl = new URL('https://test.invalid/api/transport/routes?mode=walk&start_latitude=35.0975&start_longitude=129.0106&end_latitude=35.1028&end_longitude=129.0403');
  const expectedPath = routeResponse(expectedUrl).routes[0]!.steps.flatMap((step) => step.path);
  await expect.poll(() => activeMapPoints(page)).toEqual(expectedPath);
  releaseOldResponse();
  await expect.poll(() => oldResponseReleased).toBe(true);

  await expect(page.getByRole('button', { name: '도보', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(routeGuidance(page)).toContainText('25분');
  await expect(page.getByText('늦게 도착한 이전 구간 안내', { exact: true })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual(expectedPath);
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute('href', directionsUrl('walk', places.village, places.harbor));
});

test('no route keeps the external option and never draws a fabricated path on mobile', async ({ page }) => {
  await useMapSpy(page);
  await seedTrip(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/transport/routes?*', (route) => fulfillRoutes(route, 'no_route'));
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('이 구간의 이동 경로를 찾지 못했어요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '경로 선택', exact: true })).toHaveCount(0);
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute('href', directionsUrl('traffic'));
  await expect.poll(() => activeMapPoints(page)).toEqual([]);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
});

test('a temporary route service failure can recover using the explicit retry action', async ({ page }) => {
  await useMapSpy(page);
  await seedTrip(page);
  let recovered = false;
  await page.route('**/api/transport/routes?*', (route) => recovered
    ? fulfillRoutes(route)
    : route.fulfill({ status: 503, json: { detail: '경로 조회 서비스가 일시적으로 응답하지 않아요.' } }));
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });

  const retry = page.getByRole('button', { name: '경로 다시 조회', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual([]);
  recovered = true;
  await retry.click();

  await expect(routeGuidance(page)).toContainText('18분');
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toContainText('부산 26번 버스를 타고 국제시장으로 이동해요.');
  await expect(retry).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual(routeResponse(defaultRequest()).routes[0]!.steps.flatMap((step) => step.path));
});

test('a driving route with no result clears the previous transit path and keeps Kakao directions available', async ({ page }) => {
  await useMapSpy(page);
  await seedTrip(page);
  await page.route('**/api/transport/routes?*', (route) => fulfillRoutes(route,
    new URL(route.request().url()).searchParams.get('mode') === 'car' ? 'no_route' : 'ok'));
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest()).routes[0]!.steps.flatMap((step) => step.path));

  await page.getByRole('button', { name: '자동차', exact: true }).click();

  await expect(page.getByText('이 구간의 이동 경로를 찾지 못했어요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '경로 선택', exact: true })).toHaveCount(0);
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toHaveCount(0);
  await expect(routeGuidance(page).getByText('통행료', { exact: false })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual([]);
  await expect(page.getByRole('link', { name: '카카오맵에서 이 구간 길찾기' }))
    .toHaveAttribute('href', directionsUrl('car'));
});

test('a failed driving request can retry without restoring an obsolete transit route', async ({ page }) => {
  await useMapSpy(page);
  await seedTrip(page);
  let recovered = false;
  await page.route('**/api/transport/routes?*', (route) => {
    const car = new URL(route.request().url()).searchParams.get('mode') === 'car';
    return car && !recovered
      ? route.fulfill({ status: 503, json: { detail: '자동차 경로 서비스가 일시적으로 응답하지 않아요.' } })
      : fulfillRoutes(route);
  });
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await expect(routeGuidance(page).getByText('약 18분', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '자동차', exact: true }).click();

  const retry = page.getByRole('button', { name: '경로 다시 조회', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('list', { name: '구간별 이동 안내' })).toHaveCount(0);
  await expect(routeGuidance(page).getByText('약 18분', { exact: true })).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page)).toEqual([]);
  recovered = true;
  await retry.click();

  await expect(page.getByRole('button', { name: '자동차', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(routeGuidance(page).getByText('약 11분', { exact: true })).toBeVisible();
  await expect(routeGuidance(page).getByText('통행료 0원', { exact: true })).toBeVisible();
  await expect(routeGuidance(page).getByText('출처: 카카오모빌리티', { exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect.poll(() => activeMapPoints(page))
    .toEqual(routeResponse(defaultRequest('car')).routes[0]!.steps.flatMap((step) => step.path));
});

test.describe('mobile date navigation', () => {
  test.use({ hasTouch: true });

  test('mobile dates keep their icons and labels inside each button and all days stay reachable', async ({ page }, testInfo) => {
    await seedTrip(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/transport', { waitUntil: 'domcontentloaded' });
    const strip = page.getByRole('group', { name: '여행 날짜' });
    const days = strip.getByRole('button');
    await expect(days).toHaveCount(7);
    await page.evaluate(() => document.fonts.ready);

    // 문서 전체 폭만 확인하면 버튼 안에서 날짜가 이웃 아이콘과 겹치는 문제를 놓친다.
    const contentsFit = await days.evaluateAll((buttons) => buttons.every((button) => {
      const bounds = button.getBoundingClientRect();
      const icon = button.querySelector('svg')!.getBoundingClientRect();
      const label = document.getElementById(button.getAttribute('aria-labelledby')!)!;
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = range.getBoundingClientRect();
      return icon.left >= bounds.left && icon.right <= text.left
        && text.right <= bounds.right && text.top >= bounds.top && text.bottom <= bounds.bottom;
    }));
    expect(contentsFit, '각 날짜의 아이콘과 글자는 자기 버튼 안에 서로 겹치지 않고 표시돼야 한다').toBe(true);
    expect(await strip.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await days.first().focus();
    for (let index = 1; index < 7; index += 1) await page.keyboard.press('Tab');
    await expect(days.last()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(days.last()).toHaveAttribute('aria-pressed', 'true');
    const lastVisible = await days.last().evaluate((button) => {
      const bounds = button.getBoundingClientRect();
      const stripBounds = button.parentElement!.getBoundingClientRect();
      return bounds.left >= stripBounds.left && bounds.right <= stripBounds.right;
    });
    expect(lastVisible, '키보드로 이동한 마지막 날짜는 스트립 안으로 스크롤돼야 한다').toBe(true);

    await strip.evaluate((element) => { element.scrollLeft = 0; });
    await days.first().tap();
    await expect(days.first()).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('transport-mobile-dates.png') });
  });
});
