import { expect, test } from './demoFixture';

test('the analytics table header stays opaque over scrolled rows and the symmetry card shows real per-exercise data', async ({ page }) => {
  await page.goto('/#/analytics');
  const header = page.getByRole('table', { name: 'Medical telemetry', exact: true }).locator('th').first();
  const background = await header.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(background, 'sticky header must hide rows scrolling beneath it').toMatch(/^rgb\(/);
  const breakdown = page.getByRole('list', { name: 'Symmetry by exercise', exact: true });
  await expect(breakdown.getByRole('listitem')).toHaveCount(4);
  await expect(breakdown).toContainText('Squat');
  await expect(page.locator('.symmetry-card')).toContainText('Form accuracy');
});

test('a flagged session shows a labelled, controllable illustrated rep next to its saved pose', async ({ page }) => {
  await page.goto('/#/logs');
  await page.getByRole('table', { name: 'Workout history', exact: true }).locator('tbody tr', { hasText: 'Flagged reps' }).first().click();
  const details = page.getByRole('region', { name: 'Session details', exact: true });
  const illustration = details.getByRole('img', { name: /^Illustrated .* rep \d+ showing: / });
  await expect(illustration).toBeVisible();
  await expect(details).toContainText('Illustrated · Rep');
  await expect(details).not.toContainText('0000000');
  const pause = details.getByRole('button', { name: 'Pause illustrated rep', exact: true });
  await pause.click();
  await expect(details.getByRole('button', { name: 'Play illustrated rep', exact: true })).toBeVisible();
  const position = details.getByLabel('Illustrated rep position', { exact: true });
  const frozen = await position.inputValue();
  await page.waitForTimeout(400);
  await expect(position).toHaveValue(frozen);
  await details.getByRole('button', { name: /^Replay detail rep \d+$/ }).first().click();
  await expect(page.getByLabel('Saved snapshot replay', { exact: true })).toBeVisible();
});

test('reduced motion starts the illustrated rep paused at the fault pose', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/logs');
  await page.getByRole('table', { name: 'Workout history', exact: true }).locator('tbody tr', { hasText: 'Flagged reps' }).first().click();
  const details = page.getByRole('region', { name: 'Session details', exact: true });
  await expect(details.getByRole('button', { name: 'Play illustrated rep', exact: true })).toBeVisible();
  await expect(details.getByLabel('Illustrated rep position', { exact: true })).toHaveValue('50');
  await expect(details.locator('.rep-illustration-fault')).toBeVisible();
});
