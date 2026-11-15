import { expect, test } from '@playwright/test';

test('crew can read the local catalog without external services', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/#/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Project ARES Command Center' })).toBeVisible();
  const exercises = page.getByRole('list', { name: 'ARED resistance exercises' });
  await expect(exercises.getByRole('listitem')).toHaveCount(4);
  await expect(exercises.getByRole('listitem')).toHaveText(['Squat', 'Deadlift', 'Overhead Press', 'Bicep Curl']);
  const routes = page.getByRole('list', { name: 'Planetary routes' });
  await expect(routes.getByRole('listitem')).toHaveCount(2);
  await expect(routes.getByRole('listitem')).toHaveText(['Valles Marineris: 4000 km', 'Olympus Mons: 600 km']);
  await page.screenshot({ path: 'test-results/command-center.png', fullPage: true });
  expect(errors).toEqual([]);
});
