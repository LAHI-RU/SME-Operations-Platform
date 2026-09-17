import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  globalTeardown: './tests/stop-e2e-api.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5177',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    actionTimeout: 15_000,
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/start-e2e-api.mjs',
      url: 'http://127.0.0.1:8011/api/v1/health',
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5177 --strictPort',
      url: 'http://127.0.0.1:5177',
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:8011/api/v1' },
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
})
