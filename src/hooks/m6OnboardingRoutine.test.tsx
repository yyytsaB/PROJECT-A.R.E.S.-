import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { MissionTelemetryProvider, useMissionTelemetry } from './useMissionTelemetry';
import { createSafeStorage } from '../adapters/telemetryStorageAdapter';
import App from '../App';
import { clearMissionStore, loadMissionStore, MISSION_STORAGE_KEY, seedDemoMissionState } from '../core/storage/telemetryStore';
import { generatePersonalizedRoutine, measureMissionPayloads } from '../core/telemetry/telemetryEngine';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div'); document.body.append(host);
let root = createRoot(host);
const click = async (name: string) => {
  const button = [...host.querySelectorAll('button')].find(button => button.textContent === name);
  expect(button, name).toBeDefined(); await act(async () => { button!.click(); });
};
const input = async (id: string, value: string) => {
  const element = host.querySelector<HTMLInputElement>(`#${id}`)!;
  expect(element, id).not.toBeNull(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
  await act(() => element.dispatchEvent(new Event('input', { bubbles: true })));
};
const select = async (id: string, value: string) => {
  const element = host.querySelector<HTMLSelectElement>(`#${id}`)!;
  expect(element, id).not.toBeNull(); await act(() => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
};
const output = (label: string) => host.querySelector(`[aria-label="${label}"]`)?.textContent;
afterEach(async () => {
  await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host);
  localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

test('hydrates compatible M6 defaults, rejects invalid health fields and measures the actual compact cache', () => {
  const now = '2026-11-14T12:00:00.000Z';
  const seeded = seedDemoMissionState(now, localStorage);
  expect(seeded.profile).toMatchObject({ heightCm: 175, restingHeartRateBpm: 60, systolicBpMmHg: 118, diastolicBpMmHg: 76,
    injuryLimitations: 'NONE', injuryNotes: '', missionType: 'MARS_TRANSIT_360D', missionDurationDays: 360, autoAdjustRoutine: true });
  expect(seeded.routineNotification).toBe('');
  const serialized = localStorage.getItem(MISSION_STORAGE_KEY)!;
  expect(JSON.parse(serialized).profile.heightCm).toBeUndefined(); // Defaults are implicit in the legacy-compatible wire shape.
  expect(loadMissionStore(localStorage, now)).toEqual(seeded);
  expect(measureMissionPayloads(seeded).localCacheBytes).toBe(new Blob([serialized]).size);
  expect(measureMissionPayloads(clearMissionStore()).localCacheBytes).toBe(365);
  for (const patch of [{ heightCm: 0 }, { restingHeartRateBpm: -1 }, { systolicBpMmHg: 60 }, { diastolicBpMmHg: 130 },
    { injuryLimitations: 'UNKNOWN' }, { injuryLimitations: ['NONE'] }, { injuryNotes: null }, { missionType: 'UNKNOWN' },
    { missionType: ['MARS_TRANSIT_360D'] }, { missionDurationDays: 1.5 }, { autoAdjustRoutine: 'yes' }]) {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ ...seeded, profile: { ...seeded.profile, ...patch } }));
    expect(loadMissionStore(localStorage, now).sessions).toHaveLength(0);
  }
});

test('retains a valid reviewed routine and rejects malformed stored plans', () => {
  const now = '2026-11-14T12:00:00.000Z', state = seedDemoMissionState(now);
  const plan = generatePersonalizedRoutine(state.profile, state.sessions, now);
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ ...state, personalizedRoutine: plan }));
  expect(loadMissionStore(localStorage, now).personalizedRoutine).toEqual(plan);
  for (const invalid of [{ ...plan, items: [] }, { ...plan, generatedAtIso: 'invalid' },
    { ...plan, items: plan.items.map((item, index) => index ? item : { ...item, recommendedLoadKg: -1 }) },
    { ...plan, items: plan.items.map((item, index) => index ? item : { ...item, exerciseId: 'UNKNOWN' }) }]) {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ ...state, personalizedRoutine: invalid }));
    expect(loadMissionStore(localStorage, now).sessions).toHaveLength(0);
  }
});

test('persists initial/manual routines, respects auto-adjust off, and recalibrates from the latest saved progress when on', async () => {
  const now = '2026-11-14T12:00:00.000Z', storage = createSafeStorage();
  let mission!: ReturnType<typeof useMissionTelemetry>;
  function Harness() { mission = useMissionTelemetry(); return null; }
  const mount = () => root.render(<MissionTelemetryProvider storage={storage} now={() => now}><Harness /></MissionTelemetryProvider>);
  await act(mount);
  await act(() => mission.clearLocalCache());
  expect(mission.state.personalizedRoutine?.items[0].recommendedLoadKg).toBe(64);
  await act(() => mission.updateProfile({ autoAdjustRoutine: false }));
  const initialPlan = structuredClone(mission.state.personalizedRoutine);
  const workout = { durationSec: 60, id: 'm6-first', exerciseId: 'SQUAT' as const, completedAtIso: now,
    sets: 1, reps: 12, loadKg: 80, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] };
  await act(() => mission.saveWorkout(workout));
  expect(mission.state.personalizedRoutine).toEqual(initialPlan);
  expect(mission.state.routineNotification).toBe('');
  await act(() => mission.recalibrateRoutine());
  expect(mission.state.personalizedRoutine?.items[0].recommendedLoadKg).toBe(72);
  expect(mission.state.routineNotification).toBe('Your routine has been updated based on your recent progress.');
  await act(() => mission.updateProfile({ autoAdjustRoutine: true }));
  await act(() => mission.saveWorkout({ ...workout, id: 'm6-latest', loadKg: 40 }));
  expect(mission.state.personalizedRoutine?.items[0].recommendedLoadKg).toBe(40);
  const applied = structuredClone(mission.state.personalizedRoutine);
  await act(() => root.unmount()); root = createRoot(host);
  await act(mount);
  expect(mission.state.personalizedRoutine).toEqual(applied);
});

test('reviews a validated three-step onboarding draft with visible processing before confirming the profile and routine', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  await act(() => root.render(<App />));
  expect(host.textContent).toContain('Mission Onboarding — Set Up Your Profile');
  expect(output('Onboarding progress')).toBe('Step 1 of 3');
  expect(output('Calculated BMI')).toBe('25.5 kg/m²');
  await input('onboarding-name', ''); await click('Next step');
  expect(output('Onboarding progress')).toBe('Step 1 of 3');
  expect(host.querySelector('#onboarding-name-error')?.textContent).toBe('Enter an astronaut name.');
  await input('onboarding-name', 'Commander Demo'); await input('onboarding-heightCm', '180'); await input('onboarding-bodyWeightKg', '81');
  expect(output('Calculated BMI')).toBe('25 kg/m²');
  await click('Next step');
  expect(output('Onboarding progress')).toBe('Step 2 of 3');
  for (const [id, value] of [['SQUAT', '100'], ['DEADLIFT', '120'], ['OVERHEAD_PRESS', '60'], ['BICEP_CURL', '30']]) await input(`onboarding-${id}`, value);
  await select('onboarding-injury-limitations', 'KNEE_SENSITIVITY'); await input('onboarding-injuryNotes', 'Reported knee sensitivity');
  await click('Previous step');
  expect(host.querySelector<HTMLInputElement>('#onboarding-name')?.value).toBe('Commander Demo');
  await click('Next step'); await click('Next step');
  expect(output('Onboarding progress')).toBe('Step 3 of 3');
  await select('onboarding-mission-type', 'LUNAR_ARTEMIS_30D'); await select('onboarding-gravity-profile', 'MOON_016G');
  await click('Generate My Routine');
  expect(output('Onboarding processing')).toBe('ARES is building your personalized program…');
  await act(() => vi.advanceTimersByTime(149));
  expect(host.textContent).not.toContain('Confirm & Apply Routine');
  await act(() => vi.advanceTimersByTime(1));
  expect(host.textContent).toContain('Confirm & Apply Routine');
  expect(host.querySelector('[aria-label="Routine preview"]')?.textContent).toContain('Load moderated for knee sensitivity');
  expect(JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY)!).profile.name).toBe('Ares Crew');
  await click('Confirm & Apply Routine');
  expect(output('Onboarding confirmation')).toBe('Profile and routine confirmed and applied.');
  const saved = loadMissionStore(localStorage);
  expect(saved.profile).toMatchObject({ name: 'Commander Demo', heightCm: 180, bodyWeightKg: 81, injuryLimitations: 'KNEE_SENSITIVITY', injuryNotes: 'Reported knee sensitivity', missionType: 'LUNAR_ARTEMIS_30D', missionDurationDays: 30, gravityProfileId: 'MOON_016G' });
  expect(saved.personalizedRoutine?.items).toHaveLength(7);
});

test('invalidates pending onboarding previews when going back or clearing the mission', async () => {
  vi.useFakeTimers();
  await act(() => root.render(<App />));
  await click('Next step'); await click('Next step'); await click('Generate My Routine');
  await click('Previous step'); await act(() => vi.advanceTimersByTime(500));
  expect(output('Onboarding progress')).toBe('Step 2 of 3');
  expect(host.querySelector('[aria-label="Routine preview"]')).toBeNull();
  await click('Next step'); await click('Generate My Routine');
  await click('Clear Local Data'); await click('Confirm clear');
  await act(() => vi.advanceTimersByTime(500));
  expect(output('Onboarding progress')).toBe('Step 1 of 3');
  expect(host.querySelector('[aria-label="Routine preview"]')).toBeNull();
  expect(loadMissionStore(localStorage).sessions).toHaveLength(0);
});

test('edits health metrics with validation and BMI, recalibrates dashboard targets, and persists the auto-adjust toggle', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
  await act(() => root.render(<App />));
  expect(output('Personalized routine label')).toBe('Personalized for you — Adapted to your progress');
  expect(output('Settings BMI')).toBe('25.5 kg/m²');
  const originalPlan = loadMissionStore(localStorage).personalizedRoutine;
  await input('settings-heightCm', '0'); await click('Recalibrate Routine');
  expect(host.querySelector('#settings-heightCm-error')?.textContent).toBe('Height must be greater than 0 cm.');
  expect(output('Settings BMI')).toBe('— kg/m²');
  expect(loadMissionStore(localStorage).personalizedRoutine).toEqual(originalPlan);
  await input('settings-heightCm', '180'); await input('settings-restingHeartRateBpm', '64');
  await input('settings-systolicBpMmHg', '125'); await input('settings-diastolicBpMmHg', '82');
  await input('settings-injuryNotes', 'Reported shoulder mobility'); await select('settings-injury-limitations', 'SHOULDER_MOBILITY');
  await input('settings-missionDurationDays', '120');
  expect(output('Settings BMI')).toBe('24.1 kg/m²');
  const auto = host.querySelector<HTMLInputElement>('input[aria-label="Auto-adjust routine based on progress"]')!;
  expect(auto.checked).toBe(true); await act(() => auto.click());
  await click('Log cardio session');
  expect(loadMissionStore(localStorage).personalizedRoutine).toEqual(originalPlan);
  await click('Recalibrate Routine');
  expect(output('Routine update notification')).toBe('Your routine has been updated based on your recent progress.');
  const stored = loadMissionStore(localStorage);
  expect(stored.profile).toMatchObject({ heightCm: 180, restingHeartRateBpm: 64, systolicBpMmHg: 125, diastolicBpMmHg: 82, injuryLimitations: 'SHOULDER_MOBILITY', injuryNotes: 'Reported shoulder mobility', missionDurationDays: 120, autoAdjustRoutine: false });
  expect(stored.personalizedRoutine?.routineId).not.toBe(originalPlan?.routineId);
  expect(host.querySelector('[aria-label="Personalized daily schedule"]')?.textContent).toContain('Load moderated for shoulder mobility');
  await act(() => auto.click()); await input('cardio-distance', '6'); await click('Log cardio session');
  expect(loadMissionStore(localStorage).personalizedRoutine?.items.find(item => item.exerciseId === 'TREADMILL')?.targetCardioKm).toBe(6);
  expect(output('Routine update notification')).toBe('Your routine has been updated based on your recent progress.');
});

test('onboarding confirmation preserves current route and auto-adjust choices that are absent from the wizard', async () => {
  vi.useFakeTimers();
  await act(() => root.render(<App />));
  await select('active-route', 'OLYMPUS_MONS');
  const auto = host.querySelector<HTMLInputElement>('input[aria-label="Auto-adjust routine based on progress"]')!;
  await act(() => auto.click());
  await click('Next step'); await click('Next step'); await click('Generate My Routine');
  await act(() => vi.advanceTimersByTime(150)); await click('Confirm & Apply Routine');
  expect(loadMissionStore(localStorage).profile.routeId).toBe('OLYMPUS_MONS');
  expect(loadMissionStore(localStorage).profile.autoAdjustRoutine).toBe(false);
});
