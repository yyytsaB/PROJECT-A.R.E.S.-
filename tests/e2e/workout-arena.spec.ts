import { expect, test } from '@playwright/test';

test('completes simulated workouts, pauses, and replays flagged reps without external services', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AI Workout Arena' })).toBeVisible();
  for (const id of ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL']) {
    await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption(id);
    await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
    await expect(page.getByLabel('Completed reps')).toHaveText('1');
    await expect(page.getByLabel('Peak ROM')).toHaveText('100%');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByLabel('Session status')).toHaveText('PAUSED');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByRole('button', { name: 'Simulate Shallow Rep', exact: true }).click();
    await expect(page.getByLabel('Completed reps')).toHaveText('2');
    await expect(page.getByLabel('Form alerts')).toContainText('Depth insufficient');
    await page.getByRole('button', { name: 'Replay rep 2', exact: true }).click();
    const hasRed = await page.getByLabel('Kinematic snapshot replay', { exact: true }).evaluate((canvas: HTMLCanvasElement) => {
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      return data.some((value, i) => i % 4 === 0 && value > 150 && data[i + 1] < 80 && data[i + 2] < 80 && data[i + 3] > 0);
    });
    expect(hasRed).toBe(true);
    await page.getByRole('button', { name: 'End session', exact: true }).click();
    await expect(page.getByLabel('Completed workout summary')).toContainText('2 reps');
  }
  await page.getByRole('button', { name: 'Start simulator', exact: true }).click();
  await expect(page.getByLabel('Kinematic snapshot replay', { exact: true })).not.toBeVisible();
  await page.screenshot({ path: 'test-results/workout-arena.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('camera denial offers a one-click simulator fallback', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Camera unavailable. Use a simulated rep to continue.');
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps')).toHaveText('1');
});

test('injected 33-point frames pass through the real rep engine and snapshot replay', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/adapters/poseCameraAdapter.ts';
    const { generateSimulatedRepFrames } = await import(path);
    window.__ARES_TEST_POSE_FRAMES__ = generateSimulatedRepFrames('BICEP_CURL', 'SPINE_FAULT');
  });
  await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('BICEP_CURL');
  await page.getByRole('button', { name: 'Start simulator', exact: true }).click();
  await expect(page.getByLabel('Completed reps')).toHaveText('1');
  await expect(page.getByLabel('Form alerts')).toContainText('Spine not aligned');
  await page.getByRole('button', { name: 'Replay rep 1', exact: true }).click();
  await expect(page.getByLabel('Kinematic snapshot replay', { exact: true })).toBeVisible();
});

test('initializes the real MediaPipe runtime and model using local assets and releases the camera', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await context.grantPermissions(['camera']);
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  expect(requests.some(url => url.includes('tasks-vision') || url.includes('.wasm') || url.includes('.task'))).toBe(false);
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Session status')).toHaveText('RUNNING', { timeout: 30000 });
  expect(requests.some(url => url.endsWith('/mediapipe/pose_landmarker_lite.task'))).toBe(true);
  expect(requests.some(url => url.includes('/mediapipe/wasm/') && url.includes('.wasm'))).toBe(true);
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  expect(await page.getByLabel('Live camera preview').evaluate((video: HTMLVideoElement) => video.srcObject)).toBeNull();
});
