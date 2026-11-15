import { navigate } from './navigation';
import { expect, test } from './demoFixture';

test('an idle page starts a fresh exercise schedule at the UTC mission-day boundary', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-14T12:00:00.000Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-11-14T23:59:58.000Z'));
  const squat = page.getByRole('checkbox', { name: 'Mark Squat complete', exact: true });
  await squat.check();
  await expect(squat).toBeChecked();
  await page.clock.runFor(3000);
  await expect(squat).not.toBeChecked();
  await squat.check();
  await page.clock.setSystemTime(new Date('2026-11-16T12:00:00.000Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(squat).not.toBeChecked();
});

test('live feedback clears when a new camera observation has no detected person', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  await context.route('**/*tasks-vision*.js*', route => route.fulfill({ contentType: 'text/javascript', body: `
    export const FilesetResolver = { forVisionTasks: async () => ({}) };
    export const PoseLandmarker = { createFromOptions: async () => {
      const frames = [...(window.__ARES_TEST_POSE_FRAMES__ ?? [])];
      return { detectForVideo() { const frame = frames.shift(); return { landmarks: frame ? [frame.landmarks] : [] }; }, close() {} };
    } };
  ` }));
  await page.goto('/#/arena');
  await page.evaluate(async () => {
    const path = '/src/adapters/poseCameraAdapter.ts';
    const { generateSimulatedRepFrames } = await import(path);
    window.__ARES_TEST_POSE_FRAMES__ = generateSimulatedRepFrames('SQUAT', 'GOOD');
  });
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  await expect(page.getByLabel('Form feedback', { exact: true })).toHaveText('');
  await expect(page.getByLabel('Form alerts', { exact: true })).toContainText('Pose unavailable');
  expect(await page.getByLabel('Live skeletal pose', { exact: true }).evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.some((value, i) => i % 4 === 3 && value > 0))).toBe(false);
  await page.getByRole('button', { name: 'End session', exact: true }).click();
});

test('a tracking error leaves End session available to save completed reps once', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Settings');
  await page.getByRole('button', { name: 'Clear Local Data', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear', exact: true }).click();
  await navigate(page, 'Workout Arena');
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  await page.getByLabel('Live skeletal pose', { exact: true }).evaluate((canvas: HTMLCanvasElement) => {
    canvas.getContext = () => { throw new Error('Canvas context lost'); };
  });
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Session status', { exact: true })).toHaveText('ERROR');
  const end = page.getByRole('button', { name: 'End session', exact: true });
  await expect(end).toBeEnabled();
  await end.click();
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('1');
  await expect(end).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Saved session count', { exact: true })).toHaveText('1');
});
