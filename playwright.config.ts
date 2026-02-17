import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for HypoStage.
 * Requires the app to be running (e.g. standalone: backend on 7007, frontend on 3000).
 * Videos are recorded for every test and saved under e2e/e2e-videos.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'e2e/e2e-report', open: 'never' }]],
  outputDir: 'e2e/e2e-videos',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
});
