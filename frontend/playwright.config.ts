import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [['list']],
  outputDir: './e2e/artifacts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8501',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1080 } },
    },
    {
      name: 'mobile-chromium',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
    },
  ],
});
