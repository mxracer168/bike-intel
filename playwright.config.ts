import { defineConfig, devices } from '@playwright/test'

/**
 * Two suites:
 *  - public: pages that need no backend (runs anywhere)
 *  - full:   sign-up, onboarding and tenant isolation against a LOCAL
 *            Supabase stack. Enabled only with E2E_SUPABASE=1. Never point
 *            this at the live project.
 */
const full = process.env.E2E_SUPABASE === '1'
const port = Number(process.env.E2E_PORT ?? 3000)
const chromiumPath = process.env.PW_CHROMIUM_PATH

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : undefined,
  },
  projects: [
    { name: 'public', testMatch: /public\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    ...(full ? [{ name: 'full', testMatch: /(onboarding|isolation|intelligence)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } }] : []),
  ],
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://localhost:${port}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
