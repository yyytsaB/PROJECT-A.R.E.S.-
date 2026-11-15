import { expect, test } from '@playwright/test';

for (const size of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 375, height: 900 }]) {
  test(`launch is detached, initially pinned, then scrolls away at its home position at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const launch = page.getByRole('button', { name: "INITIATE TODAY'S SESSION", exact: true });
    await expect(launch).toBeInViewport({ ratio: 1 });
    const first = await launch.boundingBox();
    expect(first!.y + first!.height).toBeLessThanOrEqual(size.height - 15);
    expect(first!.y + first!.height).toBeGreaterThan(size.height - 40);
    const ready = page.getByRole('region', { name: 'Ready when you are', exact: true });
    await expect(ready).toBeAttached();
    await expect(ready.getByRole('button', { name: "INITIATE TODAY'S SESSION", exact: true })).toHaveCount(0);
    await page.mouse.wheel(0, 150);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    const pinned = await launch.boundingBox();
    expect(Math.abs(pinned!.y - first!.y)).toBeLessThan(2);
    await page.getByText('Prototype scoring, routine & local data details', { exact: true }).click();
    await page.getByLabel('Local cache used', { exact: true }).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 4000);
    await expect.poll(async () => (await launch.boundingBox())!.y).toBeLessThan(first!.y - 48);
    const released = await launch.boundingBox(), readyBox = await ready.boundingBox();
    expect(Math.abs(released!.y - (readyBox!.y + readyBox!.height) - (size.width < 768 ? 20 : 24))).toBeLessThan(2);
    await page.getByRole('link', { name: 'Start session', exact: true }).click();
    await expect(launch).not.toBeVisible();
  });
}
test('the reference week control opens a clearly labelled template and returns keyboard focus on close', async ({ page }) => {
  await page.goto('/');
  const week = page.getByRole('button', { name: 'View week', exact: true });
  await week.click();
  const dialog = page.getByRole('dialog', { name: "This week's microcycle", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Illustrative weekly template');
  await expect(dialog.getByRole('list', { name: 'Weekly training microcycle', exact: true }).getByRole('listitem')).toHaveCount(7);
  await expect(dialog).toContainText('Lower body + intervals');
  await expect(dialog).toContainText('Rest + health check');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(week).toBeFocused();
});

test('reference health tiles show unavailable measurements honestly and use saved profile heart rate', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Review your mission profile', exact: true }).click();
  await page.getByLabel('Resting heart rate (bpm)', { exact: true }).fill('73');
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  const ready = page.getByRole('region', { name: 'Ready when you are', exact: true });
  await expect(ready.locator('dd')).toHaveText(['—', '—', '73']);
  await expect(ready).toContainText('Readiness and sleep are not recorded');
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  await context.setOffline(true);
  await page.getByRole('button', { name: 'View week', exact: true }).click();
  await expect(page.getByRole('dialog', { name: "This week's microcycle", exact: true })).toBeVisible();
});

test('wide desktop preserves the reference proportions and keeps the detached launch aligned while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // The supplied desktop artboard is 1440px wide with a 264px sidebar.
  const sidebar = page.getByRole('navigation', { name: 'Mission sections', exact: true });
  expect((await sidebar.boundingBox())!.width).toBeGreaterThan(290);
  const banner = (await page.getByRole('banner').boundingBox())!;
  expect(banner.x + banner.width).toBeGreaterThan(1890);
  const ready = page.getByRole('region', { name: 'Ready when you are', exact: true });
  const launch = page.getByRole('button', { name: "INITIATE TODAY'S SESSION", exact: true });
  await expect(launch).toBeInViewport({ ratio: 1 });
  const start = (await launch.boundingBox())!, rail = (await ready.boundingBox())!;
  expect(Math.abs(start.x - rail.x)).toBeLessThan(2);
  expect(Math.abs(start.width - rail.width)).toBeLessThan(2);
  expect(start.y + start.height).toBeGreaterThan(1040);
  expect(start.y + start.height).toBeLessThanOrEqual(1057);
  await page.mouse.wheel(0, 150);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(Math.abs((await launch.boundingBox())!.y - start.y)).toBeLessThan(2);
  await page.getByText('Prototype scoring, routine & local data details', { exact: true }).click();
  await page.getByLabel('Local cache used', { exact: true }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 4000);
  await expect.poll(async () => (await launch.boundingBox())!.y).toBeLessThan(start.y - 48);
});
