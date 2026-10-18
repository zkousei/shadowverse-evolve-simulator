import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testIgnore: '**/production/**',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
        baseURL: 'http://127.0.0.1:5173',
        trace: 'retain-on-failure',
        locale: 'ja-JP',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1',
        // Development generates and verifies the catalog on its first request.
        // Finish server preparation before functional UI assertions begin.
        url: 'http://127.0.0.1:5173/card-catalog/manifest.json',
        reuseExistingServer: !process.env.CI,
    },
});
