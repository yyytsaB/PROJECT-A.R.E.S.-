import { test as base } from '@playwright/test';

/**
 * Suites written against the populated 30-day demo. A real first visit starts empty on onboarding; these suites opt
 * in to the demo seed on first load instead, which is equivalent to pressing Settings → Seed 30-Day Mars Demo Data.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => { (window as Window & { __ARES_TEST_SEED_DEMO__?: boolean }).__ARES_TEST_SEED_DEMO__ = true; });
    await use(context);
  },
});
export { expect } from '@playwright/test';
