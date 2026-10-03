import { defineConfig } from '@playwright/test';

/**
 * E2E tests (Week 6 Day 29). Run against LOCAL workers:
 *
 *   1. pnpm --filter auth dev      # :8787 (separate terminal)
 *   2. pnpm --filter billing dev   # :8788
 *   3. pnpm --filter web dev       # :5173
 *   4. pnpm e2e                    # (install browsers once: pnpm exec playwright install --with-deps chromium)
 *
 * CI: run the same steps, then `pnpm e2e`. Browsers are NOT committed —
 * CI installs chromium on first run.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: undefined, // workers are started manually (see above) for D1 access
});
