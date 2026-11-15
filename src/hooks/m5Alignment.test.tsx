import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { clearMissionStore, MISSION_STORAGE_KEY, recordCompletedWorkout, seedDemoMissionState } from '../core/storage/telemetryStore';
import { computeSessionRecord } from '../core/telemetry/telemetryEngine';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div'); document.body.append(host);
let root = createRoot(host);
beforeEach(() => localStorage.clear());
afterEach(async () => {
  await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host);
  localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
});
const click = async (text: string) => {
  const button = [...host.querySelectorAll('button')].find(button => (button.getAttribute('aria-label') ?? button.textContent) === text);
  expect(button, text).toBeDefined();
  await act(async () => { button!.click(); });
};
const output = (label: string) => host.querySelector(`[aria-label="${label}"]`)?.textContent;
const select = async (id: string, value: string) => {
  const element = host.querySelector<HTMLSelectElement>(`#${id}`)!;
  expect(element, id).not.toBeNull();
  await act(() => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
};
const input = async (id: string, value: string) => {
  const element = host.querySelector<HTMLInputElement>(`#${id}`)!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
  await act(() => element.dispatchEvent(new Event('input', { bubbles: true })));
};

test('renders the running duration, positive form and independent cue toggle and saves actual session time', async () => {
  vi.useFakeTimers();
  let frame: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  await act(() => root.render(<App />));
  await click('Clear Local Data'); await click('Confirm clear');
  expect(output('Workout duration')).toBe('00:00');
  await click('Simulate Good Rep');
  for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; next?.(i * 34); });
  expect(output('Form feedback')).toBe('Spine aligned');
  await act(() => vi.advanceTimersByTime(45000));
  expect(output('Workout duration')).toBe('00:45');
  const toggle = host.querySelector<HTMLInputElement>('input[aria-label="Visual overlay"]')!;
  expect(toggle.checked).toBe(true);
  await act(() => toggle.click());
  expect(host.querySelector<HTMLCanvasElement>('[aria-label="Live skeletal pose"]')?.hidden).toBe(true);
  expect(output('Form feedback')).toBe('Spine aligned');
  await click('End session');
  const saved = JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY)!);
  expect(saved.sessions[0].durationSec).toBe(45);
});

test('filters and paginates workout history with durations, demo status and selectable session details/replay', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  seedDemoMissionState(new Date().toISOString(), localStorage);
  await act(() => root.render(<App />));
  const rows = () => host.querySelectorAll('[aria-label="Workout history"] tbody tr');
  expect(rows()).toHaveLength(10);
  expect(output('History pagination')).toBe('Page 1 of 6');
  expect(rows()[0].textContent).toContain('15:00');
  expect(rows()[0].textContent).toContain('GREEN');
  await select('history-date-range', 'LAST_7_DAYS');
  expect(output('History pagination')).toBe('Page 1 of 2');
  await click('Next page');
  expect(output('History pagination')).toBe('Page 2 of 2');
  expect(rows()).toHaveLength(4);
  await select('history-date-range', 'LAST_14_DAYS');
  expect(output('History pagination')).toBe('Page 1 of 3');
  await select('history-date-range', 'LAST_30_DAYS');
  expect(output('History pagination')).toBe('Page 1 of 6');
  await input('workout-search', 'not-a-session');
  expect(rows()).toHaveLength(0);
  expect(output('History pagination')).toBe('Page 1 of 1');
  expect(host.textContent).toContain('No workouts match these filters.');
  await input('workout-search', ''); await select('history-date-range', 'ALL');
  await click('Details');
  expect(output('Session details')).toContain('15:00');
  expect(output('Session details')).toContain('GREEN');
  await click('Replay saved rep 1');
  expect(output('Session details')).toContain('Depth insufficient');
  expect(output('Saved snapshot diagnostic')).toContain('Estimated angle:');
});

test('filters analytics views without redefining retention and confirms JSON/CSV exports and printing', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  let state = clearMissionStore();
  for (const [daysAgo, reps] of [[0, 10], [10, 20], [20, 30]]) {
    state = recordCompletedWorkout(state, computeSessionRecord({ id: `day-${daysAgo}`, exerciseId: 'SQUAT', durationSec: 60,
      completedAtIso: daysAgo === 0 ? '2026-11-15T01:00:00+14:00' : new Date(Date.now() - daysAgo * 86400000).toISOString(), sets: 1, reps, loadKg: 80, cardioDistanceKm: 0,
      formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] }, state.profile));
  }
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(state));
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await act(() => root.render(<App />));
  const rows = () => host.querySelectorAll('[aria-label="Medical telemetry"] tbody tr');
  expect(rows()).toHaveLength(30);
  expect(output('Visible volume')).toBe('4800 kg');
  await select('telemetry-date-window', '7');
  expect(rows()).toHaveLength(7);
  expect(output('Visible volume')).toBe('800 kg');
  expect(output('Strength retention')).toBe('100.0%');
  await click('Export Flight Surgeon JSON');
  expect(output('Export confirmation')).toBe('Health telemetry report exported.');
  await select('telemetry-date-window', '14');
  expect(rows()).toHaveLength(14);
  expect(output('Visible volume')).toBe('2400 kg');
  expect(output('Export confirmation')).toBe('');
  await click('Export Flight Surgeon CSV');
  expect(output('Export confirmation')).toBe('Health telemetry report exported.');
  await click('Print / Save as PDF');
  expect(print).toHaveBeenCalledOnce();
  expect(output('Export confirmation')).toBe('Print dialog opened. Choose Save as PDF to save a copy.');
  await select('telemetry-date-window', '30');
  expect(rows()).toHaveLength(30);
});

test('persists body weight and shows descriptions for unlocked and locked expedition badges', async () => {
  await act(() => root.render(<App />));
  const weight = host.querySelector<HTMLInputElement>('#body-weight')!;
  expect(weight).not.toBeNull();
  expect(weight.value).toBe('78');
  await input('body-weight', '82');
  expect(JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY)!).profile.bodyWeightKg).toBe(82);
  const badges = () => host.querySelectorAll('[aria-label="Mission badges"] li');
  expect(badges()).toHaveLength(1);
  expect(badges()[0].textContent).toContain('Unlocked');
  await click('View all badges');
  expect(badges()).toHaveLength(3);
  expect(badges()[1].textContent).toContain('Locked');
  expect(badges()[1].textContent).toContain('Reach 2,000 km on the virtual canyon route.');
  await click('View all badges');
  expect(badges()).toHaveLength(1);
});

test('measures the local cache, validates each profile field and requires an explicit data-clear confirmation', async () => {
  await act(() => root.render(<App />));
  const storedBytes = new Blob([localStorage.getItem(MISSION_STORAGE_KEY)!]).size;
  expect(output('Local cache used')).toBe(`${(storedBytes / 1000).toFixed(1)} KB`);
  await input('body-weight', '0');
  expect(host.querySelector('#body-weight-error')?.textContent).toBe('Body weight must be greater than 0 kg.');
  expect(JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY)!).profile.bodyWeightKg).toBe(78);
  await input('astronaut-name', '');
  expect(host.querySelector('#astronaut-name-error')?.textContent).toBe('Enter an astronaut name.');
  await input('baseline-SQUAT', '0');
  expect(host.querySelector('#baseline-SQUAT-error')?.textContent).toBe('SQUAT Earth baseline must be greater than 0 kg.');
  await click('Save / Apply');
  expect(output('Profile confirmation')).toBe('');
  await input('body-weight', '82'); await input('astronaut-name', 'Commander Ares'); await input('baseline-SQUAT', '100');
  await click('Save / Apply');
  expect(output('Profile confirmation')).toBe('Profile saved.');
  await click('Clear Local Data');
  expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(true);
  expect(output('Saved session count')).toBe('60');
  await click('Cancel clear');
  expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(false);
  expect(output('Saved session count')).toBe('60');
  await click('Clear Local Data'); await click('Confirm clear');
  expect(output('Saved session count')).toBe('0');
  expect(output('Profile confirmation')).toBe('Local data cleared.');
});

test('shows sample schedule times, persists completion per mission day and launches the next unfinished exercise', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  let frame: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  await act(() => root.render(<App />));
  await click('Clear Local Data'); await click('Confirm clear');
  expect(host.querySelector('time[datetime="08:00"]')?.textContent).toBe('08:00');
  const checkbox = (id: string) => host.querySelector<HTMLInputElement>(`input[aria-label="Mark ${id} complete"]`)!;
  await act(() => checkbox('Squat').click());
  expect(output('Saved session count')).toBe('0');
  expect(JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY)!).scheduleCompletion['2026-11-14'].SQUAT).toBe(true);
  await click("INITIATE TODAY'S SESSION");
  expect(host.querySelector<HTMLSelectElement>('#arena-exercise')?.value).toBe('DEADLIFT');
  expect(output('Session status')).toBe('RUNNING');
  await click('Simulate Good Rep');
  for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; next?.(i * 34); });
  await click('End session');
  expect(checkbox('Deadlift').checked).toBe(true);
  await act(() => root.unmount()); root = createRoot(host);
  await act(() => root.render(<App />));
  expect(checkbox('Squat').checked).toBe(true);
  expect(checkbox('Deadlift').checked).toBe(true);
  vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z'));
  await act(() => root.unmount()); root = createRoot(host);
  await act(() => root.render(<App />));
  expect(checkbox('Squat').checked).toBe(false);
});

test('selects accessible sections with matching page titles and a focusable skip target', async () => {
  await act(() => root.render(<App />));
  expect(document.title).toBe('Dashboard — A.R.E.S.');
  const navigation = host.querySelector('nav[aria-label="Mission sections"]');
  expect(navigation).not.toBeNull();
  for (const name of ['Workout Arena', 'Journey', 'Analytics', 'Logs', 'Settings', 'Dashboard']) {
    const link = [...navigation!.querySelectorAll('a')].find(anchor => (anchor.getAttribute('aria-label') ?? anchor.textContent) === name)!;
    await act(async () => { link.click(); });
    expect(document.title).toBe(`${name} — A.R.E.S.`);
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(navigation!.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  }
  const skip = [...host.querySelectorAll('a')].find(anchor => anchor.textContent === 'Skip to main content')!;
  expect(skip.getAttribute('href')).toBe('#main-content');
  await act(async () => { skip.click(); });
  expect(document.activeElement).toBe(host.querySelector('main'));
});

test('aligns titles and active navigation with direct section links and browser hash changes', async () => {
  window.history.replaceState(null, '', '#history-heading');
  await act(() => root.render(<App />));
  expect(document.title).toBe('Logs — A.R.E.S.');
  expect(host.querySelector('nav [aria-current="page"]')?.textContent).toBe('Logs');
  await act(() => {
    window.history.replaceState(null, '', '#settings-heading');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(document.title).toBe('Settings — A.R.E.S.');
  expect(host.querySelector('nav [aria-current="page"]')?.textContent).toBe('Settings');
  await act(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(document.title).toBe('Dashboard — A.R.E.S.');
});
