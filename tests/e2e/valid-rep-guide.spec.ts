import { expect, test } from './demoFixture';

test('the valid rep reference explains the counted angles for each exercise and stays out of live tracking', async ({ page }) => {
  await page.goto('/#/arena');
  const guide = page.getByRole('region', { name: 'Valid rep reference', exact: true });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('img', { name: /^Reference squat:/ })).toBeVisible();
  // Squat: start 170°, target 95°, 10° buffer, start zone a quarter of the 75° range.
  await expect(guide.getByRole('listitem')).toHaveText([
    'Stand tall until the knee angle reads ≥ 151°. This arms the counter.',
    'Squat down to ≤ 105° for a clean rep. Reaching ≤ 133° still counts, flagged “Depth insufficient”; less is ignored.',
    'Return to ≥ 151°. The rep counts on the return.',
    'Keep your shoulders, hips, knees and ankles in frame, trunk lean within 35° and both sides within 12° of each other.',
  ]);
  await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('OVERHEAD_PRESS');
  await expect(guide.getByRole('listitem').first()).toHaveText('Hands at shoulders until the elbow angle reads ≤ 98°. This arms the counter.');
  await expect(guide.getByRole('listitem').nth(1)).toContainText('Press overhead to ≥ 155° for a clean rep.');
  await guide.getByRole('button', { name: 'Pause reference rep', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Play reference rep', exact: true })).toBeVisible();
  await guide.screenshot({ path: 'test-results/valid-rep-guide.png' });
  // Simulation keeps the reference beside the simulated feed.
  await page.getByRole('button', { name: 'Start simulator', exact: true }).click();
  await expect(guide).toBeVisible();
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps')).toHaveText('1');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.arena-layout').screenshot({ path: 'test-results/valid-rep-guide-arena.png' });
  await page.getByRole('button', { name: 'End session', exact: true }).click();
});

test('the valid rep reference fits a phone screen without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/arena');
  await expect(page.getByRole('region', { name: 'Valid rep reference', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('region', { name: 'Valid rep reference', exact: true }).screenshot({ path: 'test-results/valid-rep-guide-375.png' });
});

test('the reference gauge never widens the page, even resting at full depth', async ({ page }) => {
  // Reduced motion rests the reference on the target pose, where the gauge marker is at the far end.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/arena');
    await page.getByRole('region', { name: 'Valid rep reference', exact: true }).waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}px`).toBe(true);
  }
});
