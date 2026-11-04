import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/firebase-e2e',
  outputDir: './test-results/firebase',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5178',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
    env: {
      VITE_DATA_MODE: 'firebase',
      VITE_USE_EMULATORS: 'true',
      VITE_FIREBASE_API_KEY: 'demo-key-only',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-ecodescarte.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-ecodescarte',
      VITE_FIREBASE_APP_ID: '1:123:web:demo',
      VITE_AUTH_CONTINUE_URL: 'http://127.0.0.1:5178/verificar-email',
      VITE_GOOGLE_MAPS_API_KEY: '',
    },
  },
});
