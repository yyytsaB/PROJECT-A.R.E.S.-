import { navigate } from './navigation';
import { expect, test } from './demoFixture';

test('mission launch opens the live working arena and keeps navigation context in sync', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "INITIATE TODAY'S SESSION", exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('RUNNING');
  await expect(page).toHaveURL(/#\/arena$/);
  await expect(page.getByRole('navigation', { name: 'Mission sections' }).getByRole('link', { name: 'Workout Arena', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('Live skeletal pose', { exact: true })).toBeInViewport();
});

test('the integrated shell reflows at narrow phone and tablet sizes without scaling or page overflow', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await page.locator('body').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
    expect(await page.getByRole('button', { name: "INITIATE TODAY'S SESSION", exact: true }).evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Mission sections' })).toBeVisible();
      await page.keyboard.press('Escape');
    } else await expect(page.getByRole('navigation', { name: 'Mission sections' })).toBeVisible();
  }
  await navigate(page, 'Settings');
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('navigation', { name: 'Mission sections' }).getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('a filtered-out session cannot leave unrelated detail or replay visible', async ({ page }) => {
  await page.goto('/#/logs');
  await page.getByRole('table', { name: 'Workout history', exact: true }).getByRole('button', { name: 'Details', exact: true }).first().click();
  const details = page.getByRole('region', { name: 'Session details', exact: true });
  await expect(details).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search workouts', exact: true }).fill('__ares_no_match__');
  await expect(page.getByText('No workouts match these filters.', { exact: true })).toBeVisible();
  await expect(details).not.toBeVisible();
  await expect(page.getByLabel('Saved snapshot replay', { exact: true })).not.toBeVisible();
});
