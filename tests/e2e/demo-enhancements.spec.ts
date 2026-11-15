import { navigate } from './navigation';
import { expect, test } from '@playwright/test';

test('explains an offline workout with local voice, replay diagnostics, byte sizes and scenario goals', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.addInitScript(() => {
    const voice = { name: 'Local demo', lang: 'en-US', localService: true };
    const log = { messages: [] as string[], cancellations: 0 };
    Object.assign(window, { __voiceLog: log });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: Object.assign(new EventTarget(), {
      getVoices: () => [voice], cancel: () => { log.cancellations++; },
      speak: (utterance: SpeechSynthesisUtterance) => { log.messages.push(utterance.text); },
    }) });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class {
      constructor(public text: string) {}
    } });
  });
  await page.goto('/');
  await navigate(page, 'Settings');
  await page.getByRole('button', { name: 'Clear Local Data', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear', exact: true }).click();
  await navigate(page, 'Workout Arena');
  const toggle = page.getByRole('checkbox', { name: 'Voice Coach', exact: true });
  await expect(toggle).not.toBeChecked();
  await toggle.focus(); await page.keyboard.press('Space');
  await expect(page.getByLabel('Voice Coach status', { exact: true })).toHaveText('Local voice active: Local demo (offline service)');
  await page.getByRole('button', { name: 'Simulate Good Rep', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'Simulate Spine Fault', exact: true }).click();
  await expect(page.getByLabel('Completed reps', { exact: true })).toHaveText('2');
  await expect(page.getByLabel('Form alerts', { exact: true })).toContainText('Spine not aligned');
  await page.getByRole('button', { name: 'Replay rep 2', exact: true }).click();
  await expect(page.getByLabel('Current snapshot diagnostic', { exact: true })).toContainText('Configured target: 95° · Target reached · Faults: Spine not aligned');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page.getByLabel('Gravity scenario comparison', { exact: true })).toContainText('Score: 85.0% · Prototype goal: 88.0% · Below prototype goal by 3.0 percentage points');
  const currentDiagnostic = await page.getByLabel('Current snapshot diagnostic', { exact: true }).innerText();
  await navigate(page, 'Settings');
  await page.getByLabel('Gravity profile', { exact: true }).selectOption('MOON_016G');
  await expect(page.getByLabel('Strength retention', { exact: true })).toHaveText('85.0%');
  await expect(page.getByLabel('Gravity scenario comparison', { exact: true })).toContainText('Prototype goal: 82.0% · Goal exceeded by 3.0 percentage points');
  await navigate(page, 'Logs');
  await page.getByRole('table', { name: 'Workout history', exact: true }).locator('summary').first().click();
  await page.getByRole('button', { name: 'Replay saved rep 2', exact: true }).click();
  await expect(page.getByLabel('Saved snapshot diagnostic', { exact: true })).toHaveText(currentDiagnostic);
  const sizes = page.getByLabel('Queue and snapshot sizes', { exact: true });
  await expect(sizes).toHaveText(/1 queued session summaries · Queued payload: \d+\.\d KB · Pose snapshots retained locally \([1-9]\d*\.\d KB\)/);
  await navigate(page, 'Dashboard');
  await page.getByText('Prototype scoring, routine & local data details', { exact: true }).click();
  const retained = (await sizes.innerText()).split('Pose snapshots')[1];
  await navigate(page, 'Settings');
  await page.getByRole('button', { name: 'Open comms window', exact: true }).click();
  await expect(sizes).toContainText('0 queued session summaries · Queued payload: 0.0 KB');
  expect((await sizes.innerText()).split('Pose snapshots')[1]).toBe(retained);
  const spoken = await page.evaluate(() => (window as unknown as { __voiceLog: { messages: string[] } }).__voiceLog.messages);
  expect(spoken).toContain('Rep 1 complete — 100 percent symmetry');
  expect(spoken.filter(message => message.includes('Warning: Spine not aligned'))).toHaveLength(1);
  await navigate(page, 'Workout Arena');
  await toggle.uncheck();
  await expect(page.getByLabel('Voice Coach status', { exact: true })).toHaveText('Off');
  expect(errors).toEqual([]);
});
