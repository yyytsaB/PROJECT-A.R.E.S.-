import type { Page } from '@playwright/test';

/** Exercise the same visible navigation that crew members use, including the phone drawer. */
export async function navigate(page: Page, name: string) {
  const returnButton = page.getByRole('button', { name: 'Return to dashboard', exact: true });
  if (await returnButton.isVisible()) await returnButton.click();
  const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Mission sections', exact: true }).getByRole('link', { name, exact: true }).click();
}

export async function openCardio(page: Page) {
  await navigate(page, 'Workout Arena');
  const details = page.locator('details').filter({ has: page.getByText('Log a cardio session', { exact: true }) });
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}
