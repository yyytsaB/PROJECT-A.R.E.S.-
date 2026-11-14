import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../App';
import { clearMissionStore, MISSION_STORAGE_KEY, recordCompletedWorkout } from '../core/storage/telemetryStore';
import { computeSessionRecord } from '../core/telemetry/telemetryEngine';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div');
document.body.append(host);
let root = createRoot(host);
beforeEach(() => localStorage.clear());
afterEach(async () => {
  await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host);
  localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

const click = async (name: string) => {
  const button = [...host.querySelectorAll('button')].find(button => button.textContent === name);
  expect(button, name).toBeDefined();
  await act(async () => { button!.click(); });
};
const output = (name: string) => host.querySelector(`[aria-label="${name}"]`)?.textContent;

test('explains the selected current-session and saved snapshot beneath each replay canvas', async () => {
  let frame: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  await act(() => root.render(<App />));
  await click('Clear Local Data'); await click('Confirm clear');
  expect(output('Current snapshot diagnostic')).toBeUndefined();
  expect(output('Saved snapshot diagnostic')).toBeUndefined();
  await click('Simulate Shallow Rep');
  for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; next?.(i * 34); });
  expect(output('Completed reps')).toBe('1');
  await click('Replay rep 1');
  expect(output('Current snapshot diagnostic')).toMatch(/^Estimated angle: .*° · Configured target: 95° · .*° short of target · Faults: Depth insufficient$/);
  expect(host.querySelector('[aria-label="Kinematic snapshot replay"]')?.nextElementSibling?.textContent).toBe(output('Current snapshot diagnostic'));
  await click('End session');
  await click('Replay saved rep 1');
  expect(output('Saved snapshot diagnostic')).toBe(output('Current snapshot diagnostic'));
  expect(host.querySelector('[aria-label="Saved snapshot replay"]')?.nextElementSibling?.textContent).toBe(output('Saved snapshot diagnostic'));
});

test('shows measured queued summary bytes and keeps local snapshot bytes after a flush', async () => {
  const empty = clearMissionStore();
  const snapshot = { repNumber: 1, timestampMs: 33, exerciseId: 'SQUAT' as const, faultFlags: ['DEPTH_INSUFFICIENT' as const], primaryAngleDeg: 125,
    symmetryScorePct: 90, landmarks: Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 })) };
  const session = computeSessionRecord({ id: 'rep-🚀', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z', sets: 4, reps: 25,
    loadKg: 100, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 90, snapshots: [snapshot] }, { ...empty.profile, id: 'crew-1' });
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(recordCompletedWorkout(empty, session)));
  await act(() => root.render(<App />));
  expect(output('Queue and snapshot sizes')).toBe('1 queued session summaries · Queued payload: 0.2 KB · Pose snapshots retained locally (1.3 KB)');
  await click('Open comms window');
  expect(output('Queue and snapshot sizes')).toBe('0 queued session summaries · Queued payload: 0.0 KB · Pose snapshots retained locally (1.3 KB)');
  await click('Clear Local Data'); await click('Confirm clear');
  expect(output('Queue and snapshot sizes')).toBe('0 queued session summaries · Queued payload: 0.0 KB · Pose snapshots retained locally (0.0 KB)');
  expect(host.textContent).toContain('Serialized JSON sizes; 1 KB = 1,000 bytes.');
  expect(host.textContent).not.toMatch(/DSN bandwidth saved|99\.997%/i);
});

test('offers optional local-only voice output with delayed discovery and nonblocking unavailable services', async () => {
  const localVoice = { name: 'Demo English', lang: 'en-US', localService: true } as SpeechSynthesisVoice;
  const remoteVoice = { name: 'Cloud English', lang: 'en-US', localService: false } as SpeechSynthesisVoice;
  for (const kind of ['local', 'delayed', 'remote-only', 'missing', 'throws'] as const) {
    let voices = kind === 'local' ? [remoteVoice, localVoice] : [remoteVoice];
    const speech = Object.assign(new EventTarget(), { cancel: vi.fn(), speak: vi.fn(), getVoices: () => {
      if (kind === 'throws') throw new Error('Unavailable');
      return voices;
    } });
    vi.stubGlobal('speechSynthesis', kind === 'missing' ? undefined : speech);
    await act(() => root.render(<App />));
    const toggle = host.querySelector<HTMLInputElement>('input[aria-label="Voice Coach"]');
    expect(toggle).not.toBeNull();
    expect(toggle!.checked).toBe(false);
    expect(output('Voice Coach status')).toBe('Off');
    await act(async () => { toggle!.click(); });
    if (kind === 'local') expect(output('Voice Coach status')).toBe('Local voice active: Demo English (offline service)');
    else if (kind === 'delayed') {
      expect(output('Voice Coach status')).toContain('No local offline voice');
      voices = [localVoice];
      await act(() => speech.dispatchEvent(new Event('voiceschanged')));
      expect(output('Voice Coach status')).toBe('Local voice active: Demo English (offline service)');
    } else expect(output('Voice Coach status')).toMatch(/unavailable|No local offline voice/i);
    expect(speech.speak).not.toHaveBeenCalled();
    expect(host.querySelector('[aria-label="Form alerts"]')).not.toBeNull();
    await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host);
  }
});

test('compares live team-defined gravity goals while preserving recorded performance', async () => {
  const empty = clearMissionStore();
  const session = computeSessionRecord({ id: 'scenario-workout', exerciseId: 'SQUAT', completedAtIso: new Date().toISOString(),
    sets: 1, reps: 10, loadKg: 73.6, cardioDistanceKm: 0, formAccuracyPct: 90, symmetryScorePct: 95, snapshots: [] }, empty.profile);
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(recordCompletedWorkout(empty, session)));
  await act(() => root.render(<App />));
  expect(output('Strength retention')).toBe('91.4%');
  expect(output('Gravity scenario comparison')).toBe('Mars (0.38g) scenario · Score: 91.4% · Prototype goal: 88.0% · Goal exceeded by 3.4 percentage points');
  const select = host.querySelector<HTMLSelectElement>('#gravity-profile')!;
  for (const [id, text] of [
    ['MOON_016G', 'Moon (0.16g) scenario · Score: 91.4% · Prototype goal: 82.0% · Goal exceeded by 9.4 percentage points'],
    ['MICROGRAVITY_0G', 'Microgravity (0g) scenario · Score: 91.4% · Prototype goal: 75.0% · Goal exceeded by 16.4 percentage points'],
  ]) {
    await act(() => { select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(output('Gravity scenario comparison')).toBe(text);
    expect(output('Strength retention')).toBe('91.4%');
  }
  const baseline = host.querySelector<HTMLInputElement>('[aria-label="SQUAT Earth baseline (kg)"]')!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(() => { setValue.call(baseline, '107.33333333333333'); baseline.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(output('Gravity scenario comparison')).toContain('Score: 75.0% · Prototype goal: 75.0% · Prototype goal met');
  await act(() => { select.value = 'MARS_038G'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(output('Gravity scenario comparison')).toContain('Score: 75.0% · Prototype goal: 88.0% · Below prototype goal by 13.0 percentage points');
  expect(host.textContent).toContain('Team-defined prototype goals; not NASA standards or clinical clearance.');
  expect(host.textContent).not.toMatch(/GO FOR LANDING|HRP Target|INCREASE ARED LOAD/);
});
