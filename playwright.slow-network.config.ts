import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testDir: './e2e/slow-network',
  testIgnore: [],
  outputDir: './test-results/slow-network',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: { baseURL: 'http://127.0.0.1:4176', trace: 'on' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
  },
});
