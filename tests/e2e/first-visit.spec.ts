import { expect, test } from '@playwright/test';
import { navigate } from './navigation';

test('a first visit starts an empty mission on onboarding; returning visitors land on the dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Onboarding — ARES');
  await expect(page.locator('#onboarding-heading')).toBeVisible();
  await page.getByRole('button', { name: 'Return to dashboard', exact: true }).click();
  await expect(page).toHaveTitle('Dashboard — ARES');
  await page.reload();
  await expect(page).toHaveTitle('Dashboard — ARES');
  await navigate(page, 'Settings');
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('0');
  await page.getByRole('button', { name: 'Seed 30-Day Mars Demo Data', exact: true }).click();
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('60');
});
