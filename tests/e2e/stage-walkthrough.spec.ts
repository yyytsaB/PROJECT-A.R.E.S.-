import { navigate as goTo, openCardio } from './navigation';
import { expect, test } from '@playwright/test';
import type { Download } from '@playwright/test';

async function readDownload(download: Download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Report download unavailable');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

for (const offline of [false, true]) {
  test(`six-flow stage rehearsal ${offline ? 'offline at 1024px' : 'online at 1440px'}`, async ({ page, context }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: offline ? 1024 : 1440, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
    if (offline) await context.setOffline(true);
    const button = (name: string) => page.getByRole('button', { name, exact: true });
    const output = (name: string) => page.getByLabel(name, { exact: true });
    const navigate = (name: string) => goTo(page, name);
    const capture = async (name: string, region: string) => {
      const path = info.outputPath(`${name}.png`);
      await page.getByRole('region', { name: region, exact: true }).screenshot({ path });
      await info.attach(name, { path, contentType: 'image/png' });
    };
    await navigate('Settings');
    await button('Clear Local Data').click();
    await button('Confirm clear').click();

    await test.step('1. Complete onboarding with live BMI, vitals and reviewed routine', async () => {
      await navigate('Onboarding');
      const wizard = page.getByRole('region', { name: 'Mission Onboarding — Set Up Your Profile', exact: true });
      await wizard.getByLabel('Onboarding astronaut name', { exact: true }).fill('Stage Demo Crew');
      for (const [label, value] of [['Height (cm)', '180'], ['Body weight (kg)', '81'], ['Resting heart rate (bpm)', '64'],
        ['Systolic blood pressure (mmHg)', '122'], ['Diastolic blood pressure (mmHg)', '78']]) {
        await wizard.getByLabel(`Onboarding ${label}`, { exact: true }).fill(value);
      }
      await expect(output('Calculated BMI')).toHaveText('25 kg/m²');
      await capture('01-onboarding', 'Mission Onboarding — Set Up Your Profile');
      await wizard.getByRole('button', { name: 'Next step', exact: true }).focus();
      await page.keyboard.press('Enter');
      for (const [exercise, baseline] of [['Squat', '100'], ['Deadlift', '120'], ['Overhead Press', '60'], ['Bicep Curl', '30']]) {
        await wizard.getByLabel(`Onboarding ${exercise} Earth baseline (kg)`, { exact: true }).fill(baseline);
      }
      await wizard.getByLabel('Onboarding injury or physical limitation', { exact: true }).selectOption('KNEE_SENSITIVITY');
      await wizard.getByLabel('Onboarding limitation notes (optional)', { exact: true }).fill('Synthetic stage example');
      await wizard.getByRole('button', { name: 'Next step', exact: true }).click();
      await wizard.getByLabel('Onboarding gravity environment', { exact: true }).selectOption('MARS_038G');
      const processing = output('Onboarding processing');
      const seen = processing.evaluate(element => new Promise<string>(resolve => {
        const observer = new MutationObserver(() => {
          if (element.textContent) { observer.disconnect(); resolve(element.textContent); }
        });
        observer.observe(element, { childList: true, subtree: true, characterData: true });
      }));
      await button('Generate My Routine').click();
      expect(await seen).toBe('ARES is building your personalized program…');
      const preview = wizard.getByRole('region', { name: 'Routine preview', exact: true });
      await expect(preview.getByRole('listitem')).toHaveCount(7);
      await expect(preview).toContainText('4×12 @ 68 kg');
      await expect(preview).toContainText('not a diagnosis');
      await button('Confirm & Apply Routine').click();
      await expect(output('Onboarding confirmation')).toHaveText('Profile and routine confirmed and applied.');
    });

    await test.step('2. Review dashboard rationale, gravity goals and primary launch', async () => {
      await navigate('Dashboard');
      await expect(output('Personalized routine label')).toHaveText('Personalized for you — Adapted to your progress');
      for (const [gravity, goal, g] of [['MICROGRAVITY_0G', '75.0%', '0g'], ['MOON_016G', '82.0%', '0.16g'], ['MARS_038G', '88.0%', '0.38g']]) {
        await navigate('Settings');
        await output('Gravity profile').selectOption(gravity);
        await navigate('Dashboard');
        await expect(output('Gravity scenario comparison')).toContainText(`(${g})`);
        await expect(output('Gravity scenario comparison')).toContainText(`Prototype goal: ${goal}`);
      }
      await capture('02-command-center', 'Command Center');
      await button("INITIATE TODAY'S SESSION").click();
      await expect(output('Session status')).toHaveText('RUNNING');
      await expect(page.getByRole('combobox', { name: 'Exercise', exact: true })).toHaveValue('SQUAT');
    });

    await test.step('3. Run all simulator rep modes, timer, cues and current replay', async () => {
      await navigate('Workout Arena');
      await page.getByRole('checkbox', { name: 'Voice Coach', exact: true }).check();
      await expect(output('Voice Coach status')).toHaveText(/Local voice active|No local offline voice available|Voice Coach unavailable/);
      await info.attach('voice-status', { body: await output('Voice Coach status').innerText(), contentType: 'text/plain' });
      await button('Simulate Good Rep').click();
      await expect(output('Completed reps')).toHaveText('1');
      await expect(output('Form feedback')).toHaveText('Spine aligned');
      expect(await output('Live skeletal pose').evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels.some((value, index) => index % 4 === 3 && value > 0);
      })).toBe(true);
      await expect(output('Workout duration')).toHaveText(/^\d{2,}:\d{2}$/);
      await expect(output('Workout duration')).not.toHaveText('00:00');
      await button('Pause').click();
      const pausedTime = await output('Workout duration').innerText();
      await page.waitForTimeout(1100);
      await expect(output('Workout duration')).toHaveText(pausedTime);
      await button('Resume').click();
      await button('Simulate Shallow Rep').click();
      await expect(output('Completed reps')).toHaveText('2');
      await expect(page.getByRole('list', { name: 'Form alerts', exact: true })).toContainText('Depth insufficient');
      await button('Simulate Spine Fault').click();
      await expect(output('Completed reps')).toHaveText('3');
      await expect(page.getByRole('list', { name: 'Form alerts', exact: true })).toContainText('Spine not aligned');
      await capture('03-arena', 'AI Workout Arena');
      await button('Replay rep 2').click();
      await expect(output('Kinematic snapshot replay')).toBeVisible();
      await expect(output('Current snapshot diagnostic')).toContainText('short of target');
      await capture('03-current-replay', 'Kinematic Snapshot Replay');
      await button('End session').click();
      await page.getByRole('checkbox', { name: 'Voice Coach', exact: true }).uncheck();
      await expect(output('Saved session count')).toHaveText('1');
      await expect(output('Queued sync count')).toHaveText('1');
    });

    await test.step('4. Switch routes and inspect unlocked and locked badge descriptions', async () => {
      await openCardio(page);
      await output('Cardio distance (km)').fill('55');
      await button('Log cardio session').click();
      await navigate('Journey');
      for (const [id, route, firstBadge] of [['VALLES_MARINERIS', 'Valles Marineris', 'First Traverse'], ['OLYMPUS_MONS', 'Olympus Mons', 'Base Camp']]) {
        await output('Active route').selectOption(id);
        await expect(page.getByRole('img', { name: `${route} virtual game route illustration, not terrain-derived or to scale`, exact: true })).toBeVisible();
        const badges = page.getByRole('list', { name: 'Mission badges', exact: true });
        await expect(badges.getByRole('listitem')).toHaveCount(1);
        await expect(badges).toContainText(`${firstBadge} · Unlocked`);
        await button('View all badges').click();
        await expect(badges.getByRole('listitem')).toHaveCount(3);
        await expect(badges).toContainText('Locked');
        await expect(badges).toContainText('50 km');
        await capture(`04-${id.toLowerCase()}`, 'Expedition Journey');
        await button('View all badges').click();
      }
    });

    await test.step('5. Filter telemetry, download reports, print and inspect saved reps', async () => {
      await navigate('Analytics');
      for (const days of [7, 14, 30]) {
        await output('Telemetry date window').selectOption(String(days));
        await expect(page.getByRole('table', { name: 'Medical telemetry', exact: true }).locator('tbody tr')).toHaveCount(days);
        await expect(output('Visible volume')).toHaveText('240 kg');
      }
      for (const format of ['JSON', 'CSV']) {
        const downloading = page.waitForEvent('download');
        await button(`Export Flight Surgeon ${format}`).click();
        const download = await downloading;
        await download.saveAs(info.outputPath(`stage-flight-surgeon.${format.toLowerCase()}`));
        const text = await readDownload(download);
        expect(text).toContain('not clinically validated');
        expect(text).toContain('SQUAT');
        if (format === 'JSON') {
          const report = JSON.parse(text);
          expect(report.profile.name).toBe('Stage Demo Crew');
          expect(report.telemetry.sessions).toHaveLength(2);
          expect(report.telemetry.cumulativeVolumeKg).toBe(240);
          expect(report.syncSummary.pendingCount).toBe(2);
        } else expect(text).toContain('session_id,exercise,completed_at');
      }
      await capture('05-medical', 'Medical Telemetry');
      await button('Print / Save as PDF').click();
      await expect(output('Export confirmation')).toContainText('Print dialog opened.');
      await page.pdf({ path: info.outputPath('stage-flight-surgeon.pdf'), format: 'A4', printBackground: true, tagged: true });
      await navigate('Logs');
      await output('Search workouts').fill('SQUAT');
      const row = page.getByRole('table', { name: 'Workout history', exact: true }).getByRole('row').filter({ hasText: 'SQUAT' });
      await row.getByRole('button', { name: 'Details', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Session details', exact: true })).toContainText('load: 80 kg; volume: 240 kg');
      await row.locator('summary').click();
      await row.getByRole('button', { name: 'Replay saved rep 2', exact: true }).click();
      await expect(output('Saved snapshot replay')).toBeVisible();
      await expect(output('Saved snapshot diagnostic')).toContainText('short of target');
      await capture('05-history', 'Workout Logs & History');
    });

    await test.step('6. Recalibrate, toggle automatic updates, flush comms, seed and confirm clear', async () => {
      await navigate('Profile');
      await output('Height (cm)').fill('182');
      await expect(output('Settings BMI')).toHaveText('24.5 kg/m²');
      await navigate('Settings');
      const automatic = page.getByRole('checkbox', { name: 'Auto-adjust routine based on progress', exact: true });
      await automatic.uncheck();
      const schedule = page.getByRole('list', { name: 'Personalized daily schedule', exact: true });
      await navigate('Dashboard');
      const frozen = await schedule.innerText();
      await openCardio(page);
      await output('Cardio distance (km)').fill('7');
      await button('Log cardio session').click();
      await navigate('Dashboard');
      await expect(schedule).toHaveText(frozen, { useInnerText: true });
      await navigate('Settings');
      await button('Recalibrate Routine').click();
      await expect(output('Routine update notification')).toHaveText('Your routine has been updated based on your recent progress.');
      await navigate('Dashboard');
      await expect(schedule).toContainText('6 km');
      await navigate('Settings');
      await automatic.check();
      await openCardio(page);
      await output('Cardio distance (km)').fill('8');
      await button('Log cardio session').click();
      await navigate('Dashboard');
      await expect(schedule).toContainText('6.8 km');
      await expect(output('Queued sync count')).toHaveText('4');
      await navigate('Settings');
      await button('Open comms window').click();
      await expect(output('Queued sync count')).toHaveText('0');
      await expect(output('Acknowledged session count')).toHaveText('4');
      await capture('06-settings', 'Profile & Mission Settings');
      await button('Seed 30-Day Mars Demo Data').click();
      await expect(output('Saved session count')).toHaveText('60');
      await button('Clear Local Data').click();
      const dialog = page.getByRole('dialog', { name: 'Clear all local mission data?', exact: true });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', { name: 'Cancel clear', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(output('Saved session count')).toHaveText('60');
      await button('Clear Local Data').click();
      await dialog.getByRole('button', { name: 'Confirm clear', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(output('Saved session count')).toHaveText('0');
      await expect(output('Queued sync count')).toHaveText('0');
      await expect(dialog).not.toBeVisible();
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
