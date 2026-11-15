import { expect, test } from './demoFixture';

test('Arena opens with the reference permission panel and camera denial keeps simulation available', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  });
  await page.goto('/#/arena');
  await expect(page.getByRole('heading', { name: 'Allow camera access', exact: true })).toBeVisible();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('IDLE');
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Camera permission was blocked.');
  await expect(page.getByRole('button', { name: 'Use simulation feed', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Use simulation feed', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('READY');
  await expect(page.getByLabel('Workout duration', { exact: true })).toHaveText('00:00');
  await expect(page.getByLabel('ARED load (kg)', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Start simulator', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('RUNNING');
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('0');
  await expect(page.getByRole('heading', { name: 'Allow camera access', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
});

test('Journey waypoints expose real catalog details and route changes work offline', async ({ page, context }) => {
  await page.goto('/#/journey');
  const distance = await page.getByLabel('Expedition distance', { exact: true }).innerText();
  await page.getByRole('button', { name: 'Canyon Midpoint, 2000 km, Locked', exact: true }).click();
  const details = page.getByRole('region', { name: 'Waypoint details', exact: true });
  await expect(details).toContainText('Reach 2,000 km on the virtual canyon route.');
  await expect(page.getByLabel('Expedition distance', { exact: true })).toHaveText(distance);
  await page.getByRole('button', { name: 'View all badges', exact: true }).click();
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  await context.setOffline(true);
  await page.getByLabel('Active route', { exact: true }).selectOption('OLYMPUS_MONS');
  await page.getByRole('button', { name: /Caldera, 600 km,/ }).click();
  await expect(details).toContainText('Finish the 600 km game route, based on volcano diameter.');
  await expect(details).not.toContainText('Canyon Midpoint');
  const badges = page.getByRole('list', { name: 'Mission badges', exact: true });
  await expect(badges.getByRole('listitem')).toHaveCount(3);
  expect(await badges.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
});

test('reference exercise tiles and the existing selector control the same real exercise', async ({ page }) => {
  await page.goto('/#/arena');
  await page.getByRole('radio', { name: 'Overhead Press', exact: true }).check();
  await expect(page.getByRole('combobox', { name: 'Exercise', exact: true })).toHaveValue('OVERHEAD_PRESS');
  await expect(page.getByLabel('ARED load (kg)', { exact: true })).toHaveValue('40');
  await expect(page.getByText('Configured target angle: 165°', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('SQUAT');
  await expect(page.getByRole('radio', { name: 'Squat', exact: true })).toBeChecked();
  await expect(page.getByLabel('ARED load (kg)', { exact: true })).toHaveValue('80');
});

test('camera preparation keeps the timer idle, retains preview across exercise changes and releases it on leaving', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  await page.goto('/#/arena');
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('READY', { timeout: 30000 });
  const preview = page.getByLabel('Live camera preview', { exact: true });
  await expect(preview).toBeVisible();
  const track = await preview.evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream).getVideoTracks()[0].id);
  await page.getByRole('radio', { name: 'Overhead Press', exact: true }).check();
  expect(await preview.evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream).getVideoTracks()[0].id)).toBe(track);
  await expect(page.getByLabel('Workout duration', { exact: true })).toHaveText('00:00');
  await expect(page.getByLabel('ARED load (kg)', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('RUNNING');
  expect(await preview.evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream).getVideoTracks()[0].id)).toBe(track);
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('READY', { timeout: 30000 });
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  expect(await preview.evaluate((video: HTMLVideoElement) => video.srcObject)).toBeNull();
  await page.getByText('Prototype scoring, routine & local data details', { exact: true }).click();
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('60');
});

test('an unanswered permission prompt can switch to simulation or be abandoned without blocking the Arena', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(() => {}); });
  await page.goto('/#/arena');
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for camera access…', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use simulation feed', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('READY');
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('STARTING');
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('link', { name: 'Workout Arena', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('IDLE');
  await expect(page.getByRole('button', { name: 'Enable camera', exact: true })).toBeEnabled();
});

test('the session timer remains above the camera panel on phone and desktop layouts', async ({ page }) => {
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto('/#/arena');
    const timer = (await page.getByLabel('Workout duration', { exact: true }).locator('..').boundingBox())!;
    const panel = (await page.getByRole('heading', { name: 'Allow camera access', exact: true }).locator('..').boundingBox())!;
    expect(timer.y + timer.height, `${width}px timer must not be covered by the camera surface`).toBeLessThanOrEqual(panel.y);
  }
});
