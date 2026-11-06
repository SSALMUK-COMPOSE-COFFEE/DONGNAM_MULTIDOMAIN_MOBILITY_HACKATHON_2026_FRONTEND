import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3107);
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  ...(!externalBaseURL && {
    webServer: {
      command: `PORT=${port} pnpm dev:mock`,
      url: `${baseURL}/test/login`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  }),
});
