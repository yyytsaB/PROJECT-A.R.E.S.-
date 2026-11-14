import { expect, test } from '@playwright/test';

for (const offline of [false, true]) {
  test(`replacing demo data cancels the old workout ${offline ? 'offline' : 'online'}`, async ({ page, context }) => {
    await page.goto('/');
    if (offline) await context.setOffline(true);
    await page.getByRole('button', { name: 'Simulate Shallow Rep', exact: true }).click();
    await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
    await page.getByRole('button', { name: 'Seed 30-Day Mars Demo Data', exact: true }).click();
    await expect(page.getByLabel('Session status', { exact: true })).toHaveText('IDLE');
    await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('0');
    await expect(page.getByRole('button', { name: 'End session', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('60');
    await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
    await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
    await page.getByRole('button', { name: 'Clear Local Data', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm clear', exact: true }).click();
    await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('0');
    await expect(page.getByLabel('Queued sync count', { exact: true })).toHaveText('0');
    await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('0');
    await expect(page.getByRole('button', { name: 'End session', exact: true })).toBeDisabled();
  });
  test(`completed workout metrics survive session transitions ${offline ? 'offline' : 'online'}`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    if (offline) await context.setOffline(true);
    await page.getByRole('button', { name: 'Clear Local Data', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm clear', exact: true }).click();
    const load = page.getByLabel('ARED load (kg)', { exact: true });
    await load.fill('70');
    await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
    await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
    await expect(load).toBeDisabled();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(load).toBeDisabled();
    await page.getByRole('button', { name: 'Start simulator', exact: true }).click();
    await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('1');
    await expect(page.getByLabel('Visible volume', { exact: true })).toHaveText('70 kg');
    await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
    await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
    await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('DEADLIFT');
    await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('2');
    await expect(page.getByLabel('Visible volume', { exact: true })).toHaveText('140 kg');
    await expect(page.getByLabel('Queued sync count', { exact: true })).toHaveText('2');
    await expect(load).toBeEnabled();
    await page.getByRole('button', { name: 'Start simulator', exact: true }).click();
    await page.getByRole('button', { name: 'End session', exact: true }).click();
    await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('2');
    expect(errors).toEqual([]);
  });
}
