import { expect, test } from '@playwright/test';

test('the static bundle serves every local runtime asset and initializes the real camera model', async ({ page, context, request }) => {
  const errors: string[] = [], failedAssets: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === 'http://127.0.0.1:4173') failedAssets.push(response.url()); });
  for (const path of ['pose_landmarker_lite.task', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm', 'wasm/vision_wasm_nosimd_internal.js', 'wasm/vision_wasm_nosimd_internal.wasm']) {
    const response = await request.get(`/mediapipe/${path}`);
    expect(response.status(), path).toBe(200);
    expect((await response.body()).byteLength, path).toBeGreaterThan(100000);
    if (path.endsWith('.wasm')) expect(response.headers()['content-type']).toContain('application/wasm');
  }
  await context.grantPermissions(['camera']);
  await context.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort());
  await page.goto('/');
  const sources = page.getByRole('region', { name: 'NASA Data & Space Agency Partner Sources', exact: true });
  await expect(sources).toBeVisible();
  await expect(sources.getByRole('link', { name: 'NASA Open Science Data Repository (OSDR)', exact: true })).toHaveAttribute('href', 'https://science.nasa.gov/biological-physical/data/osdr/');
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Session status')).toHaveText('RUNNING', { timeout: 30000 });
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

for (const unavailable of ['camera', 'model', 'wasm'] as const) {
  test(`all demo modes work when ${unavailable} access is blocked`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.grantPermissions(['camera']);
    if (unavailable === 'camera') await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
    });
    if (unavailable === 'model') await page.route('**/pose_landmarker_lite.task', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Unavailable model' }));
    if (unavailable === 'wasm') await page.route('**/mediapipe/wasm/**', route => route.abort());
    await page.goto('/');
    await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Use a simulated rep', { timeout: 15000 });
    for (const [i, name] of ['Simulate Good Rep', 'Simulate Shallow Rep', 'Simulate Spine Fault'].entries()) {
      const button = page.getByRole('button', { name, exact: true });
      await button.focus(); await page.keyboard.press('Enter');
      await expect(page.getByLabel('Completed reps')).toHaveText(String(i + 1));
      if (i === 1) await expect(page.getByLabel('Form alerts')).toContainText('Depth insufficient');
      if (i === 2) await expect(page.getByLabel('Form alerts')).toContainText('Spine not aligned');
    }
    expect(errors).toEqual([]);
  });
}

test('a pending camera permission prompt can be replaced directly by a one-click demo', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(() => {}); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start webcam', exact: true }).click();
  await expect(page.getByLabel('Session status')).toHaveText('STARTING');
  const demo = page.getByRole('button', { name: 'Simulate Good Rep', exact: true });
  await expect(demo).toBeEnabled();
  await demo.click();
  await expect(page.getByLabel('Completed reps')).toHaveText('1');
});
