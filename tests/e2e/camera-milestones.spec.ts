import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type Probe = Window & { __prepared?: MediaStream; __ready?: MediaStream };

async function freshMission(page: Page) {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Clear Local Data', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear', exact: true }).click();
  await page.getByRole('link', { name: 'Workout Arena', exact: true }).click();
}
async function logTreadmill(page: Page, km: number) {
  const distance = page.getByLabel('Cardio distance (km)', { exact: true });
  if (!(await distance.isVisible())) await page.getByText('Log a cardio session', { exact: true }).click();
  await distance.fill(String(km));
  await page.getByRole('button', { name: 'Log cardio session', exact: true }).click();
}
const celebration = (page: Page) => page.getByRole('group', { name: /^Milestone unlocked:/ });

test('a workout that crosses a milestone shows one accessible celebration that fades away and never replays on reload', async ({ page }) => {
  await freshMission(page);
  await logTreadmill(page, 49);
  await expect(celebration(page)).toHaveCount(0);
  await logTreadmill(page, 1);
  const card = celebration(page);
  await expect(card).toBeVisible();
  await expect(card).toHaveAccessibleName('Milestone unlocked: First Traverse');
  await expect(card).toContainText('Valles Marineris · 50 km');
  await expect(card.locator('img')).toHaveAttribute('src', '/assets/badges/first-traverse.svg');
  await expect(page.getByLabel('Milestone announcements', { exact: true })).toHaveText('Milestone unlocked: First Traverse. Valles Marineris, 50 km.');
  // The layer never takes focus or intercepts clicks outside the card.
  await expect(page.getByRole('button', { name: 'Log cardio session', exact: true })).toBeFocused();
  expect(await page.locator('.milestone-celebration').evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  await expect(card).toBeHidden({ timeout: 7000 });
  await expect(page.locator('.milestone-celebration')).toHaveCount(0);
  await page.getByRole('link', { name: 'Journey', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Mission badges', exact: true })).toContainText('First Traverse');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Mission badges', exact: true })).toContainText('First Traverse');
  await expect(celebration(page)).toHaveCount(0);
});

test('the celebration can be dismissed, respects reduced motion and falls back when badge art is unavailable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/assets/badges/first-traverse.svg', route => route.abort());
  await freshMission(page);
  await logTreadmill(page, 50);
  const card = celebration(page);
  await expect(card).toBeVisible();
  await expect(card.locator('img')).toHaveAttribute('src', '/assets/mission-badge.svg');
  expect(await card.evaluate(element => getComputedStyle(element).animationName)).toBe('milestone-celebration-life-reduced');
  expect(await page.locator('.milestone-coin').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Dismiss milestone celebration', exact: true }).click();
  await expect(card).toHaveCount(0);
});

test('a prewarmed offline session still saves, celebrates with local badge art and queues the workout for later sync', async ({ page, context }) => {
  await freshMission(page);
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  await logTreadmill(page, 60);
  const card = celebration(page);
  await expect(card).toBeVisible();
  await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.getByLabel('Queued sync count', { exact: true })).toHaveText('1');
  await context.setOffline(false);
});

test('live camera preparation shows a READY preview that neither times nor counts, gives framing guidance and releases the stream', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  await page.goto('/#/arena');
  await expect(page.getByRole('heading', { name: 'Allow camera access', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).srcObject)).toBeNull();
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('READY', { timeout: 30000 });
  await expect(page.getByText('Camera ready · reps and timer start when you select Start webcam', { exact: true })).toBeVisible();
  // Chromium's fake camera shows a test pattern, not a person: guidance must say so instead of reassuring.
  await expect(page.getByLabel('Framing guidance', { exact: true })).toHaveText('No person detected — step into the camera view.', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await expect(page.getByLabel('Workout duration', { exact: true })).toHaveText('00:00');
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('0');
  const canvas = await page.getByLabel('Live skeletal pose', { exact: true }).evaluate((element: HTMLCanvasElement) => ({ width: element.width, height: element.height }));
  const video = await page.getByLabel('Live camera preview').evaluate((element: HTMLVideoElement) => ({ width: element.videoWidth, height: element.videoHeight }));
  expect(canvas).toEqual(video);
  const kinds = await page.evaluate(() => { const stream = (document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream; (window as Probe).__prepared = stream; return stream.getTracks().map(track => track.kind); });
  expect(kinds).toEqual(['video']);
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('RUNNING');
  expect(await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement).srcObject === (window as Probe).__prepared)).toBe(true);
  await expect(page.getByLabel('Form feedback', { exact: true })).toHaveText('');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('PAUSED');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  expect(await page.evaluate(() => (window as Probe).__prepared!.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('READY', { timeout: 30000 });
  await page.evaluate(() => { (window as Probe).__ready = (document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream; });
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  expect(await page.evaluate(() => (window as Probe).__ready!.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
});

test('a camera that disconnects mid-workout explains what happened and keeps the simulation alternative', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  await page.goto('/#/arena');
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('RUNNING', { timeout: 30000 });
  // An ended track is what the browser reports when a camera is unplugged or its permission revoked.
  await page.evaluate(() => { const track = ((document.querySelector('video') as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]; track.stop(); track.dispatchEvent(new Event('ended')); });
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('ERROR');
  await expect(page.getByRole('alert')).toContainText('The camera disconnected or stopped sending video.');
  await expect(page.getByRole('button', { name: 'Use simulation feed', exact: true })).toBeEnabled();
});
