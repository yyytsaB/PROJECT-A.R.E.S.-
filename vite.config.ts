import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= fileURLToPath(new URL('./.playwright-browsers', import.meta.url));

export default defineConfig({
  optimizeDeps: { include: ['react', 'react/jsx-dev-runtime', 'react-dom/client', '@mediapipe/tasks-vision'] },
  test: {
    coverage: { provider: 'v8', include: ['src/core/**/*.ts', 'src/adapters/**/*.ts', 'src/hooks/**/*.ts'], exclude: ['src/core/types.ts', '**/poseFixtures.ts', '**/*.test.ts'] },
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}'], exclude: ['src/hooks/**/*.test.tsx'] } },
      { extends: true, test: { name: 'browser', include: ['src/hooks/**/*.test.tsx'], browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: 'chromium' }] } } },
    ],
  },
});
