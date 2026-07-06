import { defineConfig, devices } from '@playwright/test';

// E2E tests drive the real Next app with all network calls mocked (see
// e2e/helpers.ts), so they need no backend, database, or seed data.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:3100',
        trace: 'on-first-retry',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: 'npm run dev -- -p 3100',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
});
