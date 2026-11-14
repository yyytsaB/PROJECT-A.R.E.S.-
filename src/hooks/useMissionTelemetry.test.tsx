import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import { createSafeStorage } from '../adapters/telemetryStorageAdapter';
import { MissionTelemetryProvider, useMissionTelemetry, useMissionProfile } from './useMissionTelemetry';
import type { CompletedWorkoutInput } from '../core/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('invalid or overflowing workout totals show a recoverable error and preserve saved history', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), storage = createSafeStorage();
  let mission!: ReturnType<typeof useMissionTelemetry>;
  function Harness() { mission = useMissionTelemetry(); return null; }
  const input: CompletedWorkoutInput = { id: 'large', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z',
    durationSec: 1, sets: 1, reps: 1, loadKg: 1e308, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] };
  try {
    await act(() => root.render(<MissionTelemetryProvider storage={storage} now={() => input.completedAtIso}><Harness /></MissionTelemetryProvider>));
    await act(() => { mission.clearLocalCache(); mission.saveWorkout(input); });
    await act(() => mission.saveWorkout({ ...input, id: 'overflow' }));
    expect(mission.state.sessions.map(session => session.id)).toEqual(['large']);
    expect(mission.workoutError).toContain('not saved');
    await act(() => mission.saveWorkout({ ...input, id: 'product-overflow', reps: 2 }));
    expect(mission.state.sessions).toHaveLength(1);
    await act(() => mission.saveWorkout({ ...input, id: 'recovery', loadKg: 1 }));
    expect(mission.state.sessions).toHaveLength(2);
    expect(mission.workoutError).toBeNull();
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('settings persist representable positive metrics and keep an overflowing BMI draft out of the store', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), storage = createSafeStorage();
  let mission!: ReturnType<typeof useMissionTelemetry>, settings!: ReturnType<typeof useMissionProfile>;
  function Harness() { mission = useMissionTelemetry(); settings = useMissionProfile(); return null; }
  try {
    await act(() => root.render(<MissionTelemetryProvider storage={storage} now={() => '2026-11-14T12:00:00.000Z'}><Harness /></MissionTelemetryProvider>));
    await act(() => settings.setProfileField('heightCm', '1e-18'));
    expect(settings.fieldErrors.heightCm).toBeUndefined();
    expect(mission.state.profile.heightCm).toBe(1e-18);
    await act(() => settings.setProfileField('heightCm', '1e-300'));
    expect(settings.fieldErrors.heightCm).toContain('BMI');
    expect(settings.bmi).toBeNull();
    expect(mission.state.profile.heightCm).toBe(1e-18);
    const plan = mission.state.personalizedRoutine;
    await act(() => settings.recalibrateRoutine());
    expect(mission.state.personalizedRoutine).toBe(plan);
    expect(mission.state.sessions).toHaveLength(60);
  } finally { await act(() => root.unmount()); host.remove(); }
});

test('retry after a network failure preserves workouts saved during upload and acknowledges each once', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), storage = createSafeStorage();
  const batches: string[][] = [];
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const client = { sendBatch: async (batch: readonly { sessionId: string }[]) => {
    batches.push(batch.map(entry => entry.sessionId));
    if (batches.length === 1) throw new Error('Network unavailable');
    if (batches.length === 2) await pending;
  } };
  let mission!: ReturnType<typeof useMissionTelemetry>;
  function Harness() { mission = useMissionTelemetry(); return null; }
  const input: CompletedWorkoutInput = { durationSec: 60, id: 'first', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z',
    sets: 1, reps: 10, loadKg: 80, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] };
  try {
    await act(() => root.render(<MissionTelemetryProvider storage={storage} syncClient={client} now={() => input.completedAtIso}><Harness /></MissionTelemetryProvider>));
    await act(() => { mission.clearLocalCache(); mission.saveWorkout(input); mission.setCommsStatus('WINDOW_OPEN'); });
    expect(mission.syncError).toContain('remains queued');
    expect(mission.state.syncQueue.map(entry => entry.sessionId)).toEqual(['first']);
    expect(mission.state.acknowledgements).toEqual([]);
    await act(() => mission.saveWorkout({ ...input, id: 'second' }));
    let retry!: Promise<void>;
    await act(() => { retry = mission.flushSyncQueueNow(); });
    await act(() => { mission.saveWorkout({ ...input, id: 'third' }); mission.updateProfile({ name: 'Commander Retry' }); });
    await act(async () => { release(); await retry; });
    expect(batches).toEqual([['first'], ['first', 'second'], ['third']]);
    expect(mission.state.sessions.map(session => session.id)).toEqual(['first', 'second', 'third']);
    expect(mission.state.profile.name).toBe('Commander Retry');
    expect(mission.state.syncQueue).toEqual([]);
    expect(mission.state.acknowledgements.map(entry => entry.sessionId)).toEqual(['first', 'second', 'third']);
    expect(mission.syncError).toBeNull();
  } finally { release(); await act(() => root.unmount()); host.remove(); }
});

test('auto-sync preserves concurrent saves/settings and cannot resurrect cleared history or strand a new mission', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const batches: string[][] = [];
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const client = { sendBatch: async (batch: readonly { sessionId: string }[]) => { batches.push(batch.map(e => e.sessionId)); if (batches.length === 1) await blocked; } };
  let mission!: ReturnType<typeof useMissionTelemetry>;
  function Harness() { mission = useMissionTelemetry(); return null; }
  const input: CompletedWorkoutInput = { durationSec: 0, id: 'first', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z', sets: 1, reps: 10, loadKg: 80, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] };
  try {
    await act(() => root.render(<MissionTelemetryProvider storage={createSafeStorage()} syncClient={client} now={() => input.completedAtIso}><Harness /></MissionTelemetryProvider>));
    await act(() => { mission.clearLocalCache(); mission.saveWorkout(input); mission.setCommsStatus('WINDOW_OPEN'); });
    expect(batches).toEqual([['first']]);
    await act(() => { mission.saveWorkout({ ...input, id: 'second' }); mission.updateProfile({ name: 'Commander' }); });
    expect(mission.state.sessions).toHaveLength(2);
    await act(() => { mission.clearLocalCache(); mission.saveWorkout({ ...input, id: 'new-mission' }); mission.updateProfile({ name: 'New Commander' }); mission.setCommsStatus('WINDOW_OPEN'); });
    await act(async () => { release(); await blocked; });
    expect(batches).toEqual([['first'], ['new-mission']]);
    expect(mission.state.sessions.map(s => s.id)).toEqual(['new-mission']);
    expect(mission.state.profile.name).toBe('New Commander');
    expect(mission.state.syncQueue).toEqual([]);
    expect(mission.state.acknowledgements.map(a => a.sessionId)).toEqual(['new-mission']);
  } finally { release(); await act(() => root.unmount()); host.remove(); }
});
