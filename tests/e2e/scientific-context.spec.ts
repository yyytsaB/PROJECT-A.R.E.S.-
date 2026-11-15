import { navigate } from './navigation';
import { expect, test } from './demoFixture';
import type { Download } from '@playwright/test';

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Report download was unavailable');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('prototype context stays visible and accompanies offline report downloads and print output', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  await context.setOffline(true);
  await expect(page.getByText('Team-defined prototype goals; not NASA standards or clinical clearance.', { exact: true })).toBeVisible();
  await navigate(page, 'Analytics');
  const notice = 'Team-defined prototype telemetry for demonstration and review; not clinically validated, NASA-approved, or medical clearance.';
  await expect(page.getByText(notice, { exact: true })).toBeVisible();
  for (const format of ['JSON', 'CSV']) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: `Export Flight Surgeon ${format}`, exact: true }).click();
    const text = await readDownload(await downloading);
    expect(text).toContain('not clinically validated');
    expect(text).toContain('not a measurement of muscle mass');
    expect(text).toContain('not NASA clinical standards');
    expect(text).toContain('synthetic demo sessions');
    if (format === 'JSON') expect(JSON.parse(text).prototypeNotice.disclaimer).toBe(notice);
  }
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByText(notice, { exact: true })).toBeVisible();
});
