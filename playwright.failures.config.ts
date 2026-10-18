import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  outputDir: './test-results/failures',
  testDir: './tests/failures',
  workers: 1,
  timeout: 30_000,
  use: {
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  projects: [
    {
      name: 'maps-unavailable',
      testMatch: 'maps.spec.ts',
      use: { baseURL: 'http://127.0.0.1:5176' },
    },
    {
      name: 'firebase-incomplete',
      testMatch: 'firebase.spec.ts',
      use: { baseURL: 'http://127.0.0.1:5177' },
    },
  ],
  webServer: [
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5176 --strictPort',
      url: 'http://127.0.0.1:5176',
      env: { VITE_DATA_MODE: 'demo', VITE_GOOGLE_MAPS_API_KEY: 'test-key-not-a-real-credential' },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5177 --strictPort',
      url: 'http://127.0.0.1:5177',
      env: {
        VITE_DATA_MODE: 'firebase',
        VITE_FIREBASE_API_KEY: '',
        VITE_FIREBASE_PROJECT_ID: '',
        VITE_FIREBASE_APP_ID: '',
        VITE_FIREBASE_AUTH_DOMAIN: '',
      },
    },
  ],
});
