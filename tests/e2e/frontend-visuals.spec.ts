import { navigate } from './navigation';
import { expect, test } from '@playwright/test';

test('print output keeps routine notifications, schedule labels and chart captions readable', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Settings');
  await page.getByRole('button', { name: 'Recalibrate Routine', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const samples = [page.getByLabel('Routine update notification', { exact: true }),
    page.getByRole('list', { name: 'Personalized daily schedule', exact: true }).getByRole('listitem').first().locator('label'),
    page.getByText('STRENGTH RETENTION · %', { exact: true }), page.getByText('Date (UTC)', { exact: true }).first()];
  for (const sample of samples) {
    await expect(sample).toBeVisible();
    const contrast = await sample.evaluate(element => {
      const channels = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number);
      const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => {
        const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
      let ancestor: Element | null = element;
      while (ancestor && channels(getComputedStyle(ancestor).backgroundColor)[3] === 0) ancestor = ancestor.parentElement;
      const foreground = luminance(channels(element instanceof SVGElement ? getComputedStyle(element).fill : getComputedStyle(element).color));
      const background = luminance(channels(ancestor ? getComputedStyle(ancestor).backgroundColor : 'rgb(255, 255, 255)'));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast, (await sample.textContent()) ?? 'Printed text').toBeGreaterThanOrEqual(4.5);
  }
});

test('mission layout remains readable at desktop, tablet and phone widths with local accessible artwork', async ({ page }) => {
  await page.goto('/');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Project A.R.E.S. Command Center' })).toBeVisible();
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Mission sections' })).toBeVisible();
      await page.keyboard.press('Escape');
    } else await expect(page.getByRole('navigation', { name: 'Mission sections' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.getByRole('button', { name: "INITIATE TODAY'S SESSION", exact: true }).evaluate(element => {
      const box = element.getBoundingClientRect(); return box.x >= 0 && box.right <= innerWidth && box.height >= 40;
    })).toBe(true);
  }
  await expect(page.getByRole('img', { name: 'A.R.E.S. mission emblem', exact: true })).toBeVisible();
  expect(await page.locator('body').evaluate(element => getComputedStyle(element).colorScheme)).toBe('dark');
  for (const image of await page.locator('img').all()) {
    expect(await image.getAttribute('alt')).toBeTruthy();
    expect(await image.getAttribute('src')).toMatch(/^\/assets\//);
  }
  await navigate(page, 'Journey');
  await page.getByLabel('Active route', { exact: true }).selectOption('OLYMPUS_MONS');
  await expect(page.getByRole('img', { name: 'Olympus Mons virtual game route illustration, not terrain-derived or to scale' })).toBeVisible();
  await navigate(page, 'Workout Arena');
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  expect(await page.getByLabel('Live skeletal pose', { exact: true }).evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 0 && value > 120 && pixels[index + 1] > 160 && pixels[index + 2] > 160 && pixels[index + 3] > 0);
  })).toBe(true);
});

test('keyboard focus and route artwork remain available when the loaded mission goes offline', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  expect(await skip.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  await context.setOffline(true);
  await navigate(page, 'Journey');
  await page.getByLabel('Active route', { exact: true }).selectOption('OLYMPUS_MONS');
  const artwork = page.getByRole('img', { name: 'Olympus Mons virtual game route illustration, not terrain-derived or to scale' });
  await expect(artwork).toBeVisible();
  expect(await artwork.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'View all badges', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Mission badges' }).getByRole('listitem')).toHaveCount(3);
});
