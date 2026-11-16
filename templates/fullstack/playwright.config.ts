import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const e2eDatabaseUrl =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "pglite://./.data/e2e-pgdata";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run db:migrate && npx next dev --webpack --port ${port} --hostname 127.0.0.1`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: "test",
      APP_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      TRUSTED_ORIGINS: baseURL,
      TEST_DATABASE_URL: e2eDatabaseUrl,
      DATABASE_URL: e2eDatabaseUrl,
      SESSION_SECRET:
        process.env.SESSION_SECRET ||
        "e2e-playwright-test-secret-minimum-32-characters-long-0123456789",
      MAIL_OUTBOX_FILE: process.env.MAIL_OUTBOX_FILE || ".data/e2e-outbox.json",
    },
  },
});
