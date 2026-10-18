import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/tmp/**', '**/test-results/**', '**/playwright-report/**', '**/*-debug.log'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-auth': ['firebase/app', 'firebase/auth'],
          'firebase-store': ['firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    exclude: process.env.FIRESTORE_EMULATOR_HOST ? [] : ['tests/firestore.rules.test.ts'],
  },
});
