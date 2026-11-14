import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.{ts,tsx}'], coverage: { provider: 'v8', include: ['src/core/**/*.ts'], exclude: ['src/core/types.ts', '**/poseFixtures.ts', '**/*.test.ts'] } },
});
