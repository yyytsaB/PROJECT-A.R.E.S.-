import { expect, test } from './demoFixture';

test('Arena feedback sits under the camera feed so neither column leaves dead space', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/arena');
  const stage = await page.locator('.arena-stage-card').boundingBox();
  const feedback = await page.getByRole('heading', { name: 'Form feedback', exact: true }).locator('xpath=..').boundingBox();
  const controls = await page.locator('.arena-controls').boundingBox();
  expect(stage && feedback && controls).toBeTruthy();
  expect(Math.abs(feedback!.x - stage!.x)).toBeLessThan(2);
  expect(feedback!.y).toBeGreaterThan(stage!.y + stage!.height - 1);
  const leftBottom = feedback!.y + feedback!.height, rightBottom = controls!.y + controls!.height;
  expect(Math.abs(leftBottom - rightBottom)).toBeLessThan(260);
});

test('Analytics export actions have their own row below the heading', async ({ page }) => {
  for (const width of [1440, 1024, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/analytics');
    const subtitle = await page.locator('.medical-section > .section-subtitle').first().boundingBox();
    const firstAction = await page.getByRole('button', { name: 'Export Flight Surgeon JSON', exact: true }).boundingBox();
    expect(firstAction!.y, `${width}px`).toBeGreaterThanOrEqual(subtitle!.y + subtitle!.height + 8);
  }
});
