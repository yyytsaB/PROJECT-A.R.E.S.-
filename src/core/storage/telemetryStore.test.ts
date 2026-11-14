import { expect, test } from 'vitest';
import type { StorageLike } from '../types';
import { createSafeStorage } from '../../adapters/telemetryStorageAdapter';
import { clearMissionStore, loadMissionStore, recordCompletedWorkout, flushCommsSyncQueue, seedDemoMissionState, MISSION_STORAGE_KEY } from './telemetryStore';
import { computeSessionRecord } from '../telemetry/telemetryEngine';
import { createSupabaseSyncAdapter } from '../../adapters/supabaseSyncAdapter';

const now = '2026-11-14T12:00:00.000Z';
function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
}

test('preserves legacy sessions while defaulting missing duration and seeds realistic durations', () => {
  const storage = memoryStorage();
  const seeded = seedDemoMissionState(now);
  expect(seeded.sessions.every(session => session.durationSec >= 45 && session.durationSec <= 900)).toBe(true);
  const legacy = JSON.parse(JSON.stringify(seeded));
  for (const session of legacy.sessions) delete session.durationSec;
  storage.setItem(MISSION_STORAGE_KEY, JSON.stringify(legacy));
  const loaded = loadMissionStore(storage, now);
  expect(loaded.sessions).toHaveLength(60);
  expect(loaded.syncQueue).toEqual(seeded.syncQueue);
  expect(loaded.sessions.every(session => session.durationSec === 0)).toBe(true);
  expect(loadMissionStore(storage, now)).toEqual(loaded);
  for (const durationSec of [-1, '45', null]) {
    storage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ ...seeded, sessions: [{ ...seeded.sessions[0], durationSec }] }));
    expect(loadMissionStore(storage, now).sessions).toEqual([]);
  }
});

test('defaults legacy body weight to 78kg while retaining history and rejects explicit invalid weights', () => {
  const storage = memoryStorage();
  const state = seedDemoMissionState(now);
  expect(state.profile.bodyWeightKg).toBe(78);
  const legacy = JSON.parse(JSON.stringify(state)); delete legacy.profile.bodyWeightKg;
  storage.setItem(MISSION_STORAGE_KEY, JSON.stringify(legacy));
  expect(loadMissionStore(storage, now)).toEqual(state);
  for (const bodyWeightKg of [0, -1, null, '78']) {
    storage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ ...state, profile: { ...state.profile, bodyWeightKg } }));
    expect(loadMissionStore(storage, now).sessions).toEqual([]);
  }
});

test('persists daily schedule completion from workouts and reconstructs it for legacy missions', () => {
  const fresh = clearMissionStore();
  expect(fresh.scheduleCompletion).toEqual({});
  const session = computeSessionRecord({ id: 'scheduled-lift', exerciseId: 'SQUAT', completedAtIso: '2026-11-13T23:30:00-02:00', durationSec: 60,
    sets: 1, reps: 10, loadKg: 80, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] }, fresh.profile);
  const saved = recordCompletedWorkout(fresh, session);
  expect(saved.scheduleCompletion).toEqual({ '2026-11-14': { SQUAT: true } });
  const legacy = JSON.parse(JSON.stringify(saved)); delete legacy.scheduleCompletion;
  const storage = memoryStorage(); storage.setItem(MISSION_STORAGE_KEY, JSON.stringify(legacy));
  expect(loadMissionStore(storage, now)).toEqual(saved);
  for (const scheduleCompletion of [{ badDate: { SQUAT: true } }, { '2026-11-14': { UNKNOWN: true } }, { '2026-11-14': { SQUAT: 'yes' } }]) {
    storage.setItem(MISSION_STORAGE_KEY, JSON.stringify({ ...saved, scheduleCompletion }));
    expect(loadMissionStore(storage, now).sessions).toEqual([]);
  }
});

test('initializes a clean mission, recovers corrupt storage and retains data in the injected memory fallback', () => {
  const storage = memoryStorage();
  const fresh = loadMissionStore(storage, now);
  expect(fresh).toMatchObject({ schemaVersion: 1, sessions: [], syncQueue: [], commsStatus: 'BLACKOUT_24MIN_DELAY', acknowledgements: [], lastSyncedAtIso: null });
  expect(fresh.profile.earthBaseline1RM.SQUAT).toBeGreaterThan(0);
  expect(loadMissionStore(storage, now)).toEqual(fresh);
  for (const corrupt of ['{broken', '{"schemaVersion":1,"sessions":[null]}', '{"schemaVersion":99}']) {
    const damaged: StorageLike = { ...storage, getItem: () => corrupt };
    expect(loadMissionStore(damaged, now)).toEqual(fresh);
  }
  for (const errorName of ['QuotaExceededError', 'SecurityError']) {
    const broken: StorageLike = { getItem: () => { throw new Error(errorName); }, setItem: () => { throw new Error(errorName); }, removeItem: () => { throw new Error(errorName); } };
    const safe = createSafeStorage(broken);
    expect(clearMissionStore(safe, now)).toEqual(fresh);
    expect(loadMissionStore(safe, now)).toEqual(fresh);
    expect(() => clearMissionStore(broken, now)).not.toThrow();
  }
});

test('rejects structurally valid JSON containing unusable profiles, sessions, queue entries or snapshots', () => {
  const fresh = loadMissionStore(undefined, now);
  const damagedValues = [
    { ...fresh, profile: { ...fresh.profile, gravityProfileId: 'EARTH' } },
    { ...fresh, profile: { ...fresh.profile, earthBaseline1RM: { SQUAT: 0 } } },
    { ...fresh, sessions: [{ id: 'bad' }] },
    { ...fresh, syncQueue: [null] },
    { ...fresh, acknowledgements: [{ sessionId: 'a' }] },
    { ...fresh, lastSyncedAtIso: 'invalid' },
  ];
  for (const value of damagedValues) expect(loadMissionStore({ ...memoryStorage(), getItem: () => JSON.stringify(value) }, now)).toEqual(fresh);
});

test('seeds exactly 30 deterministic Mars days with all exercise modalities and compact replayable fault snapshots', () => {
  const storage = memoryStorage();
  const state = seedDemoMissionState(now, storage);
  expect(seedDemoMissionState(now)).toEqual(state);
  expect(loadMissionStore(storage, now)).toEqual(state);
  expect(state.sessions).toHaveLength(60);
  expect(new Set(state.sessions.map(s => s.completedAtIso.slice(0, 10))).size).toBe(30);
  expect(new Set(state.sessions.map(s => s.exerciseId)).size).toBe(7);
  expect(state.sessions.every(s => s.gravityProfileId === 'MARS_038G' && s.completedAtIso <= now)).toBe(true);
  expect(state.syncQueue).toHaveLength(60);
  const snapshots = state.sessions.flatMap(s => s.snapshots);
  expect(snapshots.length).toBeGreaterThan(0);
  for (const snapshot of snapshots) {
    expect(snapshot.landmarks).toHaveLength(33);
    expect(JSON.stringify(snapshot).length).toBeLessThanOrEqual(2048);
  }
  expect(clearMissionStore(storage, now).sessions).toEqual([]);
  expect(loadMissionStore(storage, now).sessions).toEqual([]);
});

test('blackout saves snapshots locally and queues compact summaries; open windows batch-ack once, preserving failed batches', async () => {
  const storage = memoryStorage();
  let state = loadMissionStore(storage, now);
  for (let i = 0; i < 3; i++) state = recordCompletedWorkout(state, computeSessionRecord({ id: `s${i}`, exerciseId: 'SQUAT', completedAtIso: now, sets: 3, reps: 10, loadKg: 80, cardioDistanceKm: 0, formAccuracyPct: 90, symmetryScorePct: 95, snapshots: [] }, state.profile), storage);
  expect(loadMissionStore(storage, now)).toEqual(state);
  expect(state.syncQueue).toHaveLength(3);
  expect(state.syncQueue[0]).toMatchObject({ sessionId: 's0', volumeKg: 2400, status: 'QUEUED_BLACKOUT' });
  expect(state.syncQueue[0]).not.toHaveProperty('snapshots');
  expect(recordCompletedWorkout(state, state.sessions[0], storage)).toEqual(state);
  const batches: unknown[] = [];
  const client = { sendBatch: async (batch: unknown) => { batches.push(batch); } };
  expect(await flushCommsSyncQueue(state, 'BLACKOUT_24MIN_DELAY', client, now, storage)).toEqual(state);
  expect(batches).toEqual([]);
  const failed = await flushCommsSyncQueue(state, 'WINDOW_OPEN', { sendBatch: async () => { throw new Error('offline'); } }, now, storage);
  expect(failed.syncQueue).toEqual(state.syncQueue);
  expect(failed.lastSyncedAtIso).toBeNull();
  const synced = await flushCommsSyncQueue(failed, 'WINDOW_OPEN', client, now, storage);
  expect(batches).toEqual([state.syncQueue]);
  expect(synced).toMatchObject({ syncQueue: [], lastSyncedAtIso: now });
  expect(synced.acknowledgements.map(a => a.sessionId)).toEqual(['s0', 's1', 's2']);
  expect(loadMissionStore(storage, now)).toEqual(synced);
  expect((await flushCommsSyncQueue(state, 'WINDOW_OPEN', undefined, now)).acknowledgements).toHaveLength(3);
});

test('configured sync sends one Supabase REST batch with idempotent session IDs and keeps HTTP failures queued', async () => {
  const storage = memoryStorage();
  const initial = loadMissionStore(storage, now);
  const state = recordCompletedWorkout(initial, computeSessionRecord({ id: 'session-1', exerciseId: 'ROWING', completedAtIso: now, sets: 0, reps: 0, loadKg: 0, cardioDistanceKm: 5, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] }, initial.profile));
  const requests: { url: string; init?: RequestInit }[] = [];
  const adapter = createSupabaseSyncAdapter({ url: 'https://example.supabase.co/', anonKey: 'test-key', fetch: async (url, init) => { requests.push({ url: String(url), init }); return new Response(null, { status: 201 }); } });
  expect((await flushCommsSyncQueue(state, 'WINDOW_OPEN', adapter, now)).syncQueue).toEqual([]);
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('https://example.supabase.co/rest/v1/workout_logs?on_conflict=id');
  expect(JSON.parse(String(requests[0].init?.body))).toEqual([{ id: 'session-1', user_id: 'ares-crew-1', exercise_type: 'ROWING', reps_counted: 0, form_accuracy: 100, volume_kg: 0, date: now }]);
  const unavailable = createSupabaseSyncAdapter({ url: 'https://example.supabase.co', anonKey: 'test-key', fetch: async () => new Response(null, { status: 503 }) });
  expect((await flushCommsSyncQueue(state, 'WINDOW_OPEN', unavailable, now)).syncQueue).toEqual(state.syncQueue);
});
