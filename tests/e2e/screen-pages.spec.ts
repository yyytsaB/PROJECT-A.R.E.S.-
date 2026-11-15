import { expect, test } from '@playwright/test';

test('each mission URL opens one screen and browser history restores the previous screen', async ({ page }) => {
  await page.goto('/#/logs');
  await expect(page.getByRole('heading', { name: 'Workout Logs & History', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Command Center', exact: true })).not.toBeVisible();
  await expect(page.getByRole('region', { name: 'AI Workout Arena', exact: true })).not.toBeVisible();
  await page.getByRole('navigation', { name: 'Mission sections', exact: true }).getByRole('link', { name: 'Journey', exact: true }).click();
  await expect(page).toHaveURL(/#\/journey$/);
  await expect(page.getByRole('heading', { name: 'Expedition Journey', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Workout history', exact: true })).not.toBeVisible();
  await page.goBack();
  await expect(page.getByRole('table', { name: 'Workout history', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workout Logs & History', exact: true })).toBeVisible();
});
import { navigate } from './navigation';

test('mobile navigation contains keyboard focus, closes on Escape, and page search opens a real screen offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Start session', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await context.setOffline(true);
  const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
  await menu.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Navigation menu', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close navigation menu', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(element.ownerDocument.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(menu).toBeFocused();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search pages and actions', exact: true });
  await expect(search).toBeFocused();
  await search.fill('Logs');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/logs$/);
  await expect(page.getByRole('heading', { name: 'Workout Logs & History', exact: true })).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
});

test('changing pages preserves an active workout and its flagged replay', async ({ page }) => {
  await page.goto('/#/arena');
  await page.getByRole('button', { name: 'Simulate Shallow Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  await navigate(page, 'Journey');
  await expect(page.getByRole('region', { name: 'AI Workout Arena', exact: true })).not.toBeVisible();
  await navigate(page, 'Workout Arena');
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('RUNNING');
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'Replay rep 1', exact: true }).click();
  await expect(page.getByLabel('Kinematic snapshot replay', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Current snapshot diagnostic', { exact: true })).toContainText('short of target');
});

test('all redesigned pages reflow and the mockup fonts and translucent surfaces load locally', async ({ page, context }) => {
  const remoteRequests: string[] = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    remoteRequests.push(route.request().url()); return route.abort();
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => ['600 16px Conthrax', '400 14px "Plus Jakarta Sans"', '500 14px "JetBrains Mono"'].every(font => document.fonts.check(font)))).toBe(true);
    expect(await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Plus Jakarta Sans');
    const surface = await page.getByRole('heading', { name: 'Strength Retention Score', exact: true }).evaluate(element => {
      const style = getComputedStyle(element.closest('.readiness-card')!);
      return { blur: style.backdropFilter, background: style.backgroundImage, color: style.backgroundColor };
    });
    expect(surface.blur).toBe('blur(16px)');
    expect(surface.background).toContain('rgba(255, 255, 255, 0.1)');
    expect(surface.color).toBe('rgba(0, 0, 0, 0)');
    for (const name of ['Dashboard', 'Workout Arena', 'Journey', 'Analytics', 'Logs', 'Settings', 'Profile', 'NASA Data Sources', 'Onboarding']) {
      await navigate(page, name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}px`).toBe(true);
    }
  }
  expect(remoteRequests).toEqual([]);
});
test('skip navigation keeps the current screen instead of resetting the route', async ({ page }) => {
  await page.goto('/#/logs');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(/#\/logs$/);
  await expect(page.getByRole('heading', { name: 'Workout Logs & History', exact: true })).toBeVisible();
});
test('a rejected aggregate workout save is visible on the current screen and preserves saved history', async ({ page }) => {
  await page.goto('/#/arena');
  await page.getByText('Log a cardio session', { exact: true }).click();
  await page.getByLabel('Cardio distance (km)', { exact: true }).fill('1e308');
  await page.getByRole('button', { name: 'Log cardio session', exact: true }).click();
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('61');
  await page.getByRole('button', { name: 'Log cardio session', exact: true }).click();
  const error = page.getByLabel('Workout save error', { exact: true });
  await expect(error).toContainText('Workout not saved');
  await expect(error).toBeVisible();
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('61');
});
