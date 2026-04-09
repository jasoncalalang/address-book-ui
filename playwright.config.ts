import { defineConfig, devices } from '@playwright/test';

// Use a non-default port to avoid colliding with anything on :3000
// (e.g. another dev server, an SSH tunnel). The BFF reads PORT from env.
const TEST_PORT = 3030;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm start',
    env: { PORT: String(TEST_PORT) },
    url: `http://localhost:${TEST_PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
