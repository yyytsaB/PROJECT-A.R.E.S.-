import { expect, test } from './demoFixture';
import { navigate } from './navigation';

const members = ['Regina Annemarie I. Bool', 'Sebastian Miguel A. Bueno', 'Aldred Laurenze C. De Castro', 'Haidie N. Fanoga', 'Athena Ashley R. Punzalan', 'Karl Andrei C. Talagtag'];

for (const width of [1440, 768, 375]) {
  test(`Meet the Team shows the crew, pitch deck and video slot at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await navigate(page, 'Meet the Team');
    await expect(page).toHaveTitle('Meet the Team — ARES');
    const section = page.getByRole('region', { name: 'Meet the Team', exact: true });
    await expect(section.getByRole('heading', { level: 2, name: 'Meet the Team' })).toBeVisible();
    const photo = section.getByRole('img', { name: 'Group photo of the six ARES team members standing together in a classroom' });
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBeGreaterThan(0);
    const roster = section.getByRole('region', { name: 'Team members', exact: true }).getByRole('listitem');
    await expect(roster).toHaveCount(members.length);
    await expect(roster.locator('strong')).toHaveText(members);
    const deck = section.getByRole('link', { name: /Open the pitch deck/ });
    await expect(deck).toHaveAttribute('href', 'https://www.figma.com/make/Ztf5NQe7wMI5HFzqa6cWUO/PROJECT-ARES?p=f&fullscreen=1');
    await expect(deck).toHaveAttribute('target', '_blank');
    await expect(deck).toHaveAttribute('rel', /noopener/);
    await expect(section.getByRole('note')).toContainText('being edited');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await section.screenshot({ path: `test-results/meet-the-team-${width}.png` });
  });
}
