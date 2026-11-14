import { loadMissionCatalog } from '../catalog/missionCatalog';
import { buildPoseFrame } from '../kinematics/poseFixtures';
import { computeSessionRecord } from '../telemetry/telemetryEngine';
import { isMissionStoreState } from './validateMissionStore';
import type { CommsLinkStatus, MissionStoreState, StorageLike, TelemetrySyncClient, WorkoutSessionRecord } from '../types';

export const MISSION_STORAGE_KEY = 'ares.mission.v1';
const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

function emptyMission(): MissionStoreState {
  const catalog = loadMissionCatalog();
  return { schemaVersion: 1, profile: { id: 'ares-crew-1', name: 'Ares Crew', gravityProfileId: 'MARS_038G', routeId: 'VALLES_MARINERIS',
    earthBaseline1RM: Object.fromEntries(catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => [e.id, e.defaultLoadKg])) as MissionStoreState['profile']['earthBaseline1RM'] },
  sessions: [], syncQueue: [], commsStatus: 'BLACKOUT_24MIN_DELAY', acknowledgements: [], lastSyncedAtIso: null };
}

export function persistMissionStore(state: MissionStoreState, storage?: StorageLike): MissionStoreState {
  try { storage?.setItem(MISSION_STORAGE_KEY, JSON.stringify(state)); } catch { /* Caller retains the returned state if raw storage fails. */ }
  return state;
}

export function loadMissionStore(storage?: StorageLike, _nowIso = DEFAULT_NOW): MissionStoreState {
  try {
    const value = storage?.getItem(MISSION_STORAGE_KEY);
    if (value) {
      const state: unknown = JSON.parse(value);
      if (isMissionStoreState(state)) return state;
    }
  } catch { /* Malformed/unavailable storage starts a clean mission. */ }
  return persistMissionStore(emptyMission(), storage);
}

export function clearMissionStore(storage?: StorageLike, _nowIso = DEFAULT_NOW): MissionStoreState {
  try { storage?.removeItem(MISSION_STORAGE_KEY); } catch { /* Safe to continue in memory. */ }
  return persistMissionStore(emptyMission(), storage);
}

export function recordCompletedWorkout(state: MissionStoreState, session: WorkoutSessionRecord, storage?: StorageLike): MissionStoreState {
  if (state.sessions.some(s => s.id === session.id)) return state;
  return persistMissionStore({ ...state, sessions: [...state.sessions, structuredClone(session)], syncQueue: [...state.syncQueue, {
    sessionId: session.id, astronautId: session.astronautId, exerciseId: session.exerciseId, reps: session.sets * session.reps,
    formAccuracyPct: session.formAccuracyPct, volumeKg: session.resistanceVolumeKg, completedAtIso: session.completedAtIso, status: 'QUEUED_BLACKOUT',
  }] }, storage);
}

export async function flushCommsSyncQueue(state: MissionStoreState, commsStatus: CommsLinkStatus, syncClient?: TelemetrySyncClient, nowIso = DEFAULT_NOW, storage?: StorageLike): Promise<MissionStoreState> {
  const next = { ...state, commsStatus };
  if (commsStatus !== 'WINDOW_OPEN' || !state.syncQueue.length) return persistMissionStore(next, storage);
  try { await syncClient?.sendBatch(state.syncQueue); } catch { return persistMissionStore(next, storage); }
  return persistMissionStore({ ...next, syncQueue: [], lastSyncedAtIso: nowIso,
    acknowledgements: [...state.acknowledgements, ...state.syncQueue.map(e => ({ sessionId: e.sessionId, acknowledgedAtIso: nowIso }))] }, storage);
}

export function seedDemoMissionState(nowIso: string, storage?: StorageLike): MissionStoreState {
  let state = emptyMission();
  const exercises = loadMissionCatalog().exercises;
  const lifts = exercises.filter(e => e.kind === 'RESISTANCE');
  const cardio = exercises.filter(e => e.kind === 'CARDIO');
  for (let day = 0; day < 30; day++) {
    const completedAtIso = new Date(Date.parse(nowIso) - (29 - day) * 86400000).toISOString();
    const exercise = lifts[day % lifts.length];
    const faulty = day % 7 === 0;
    const frame = buildPoseFrame(exercise, { angleDeg: exercise.targetAngleDeg, timestampMs: 165 });
    const snapshots: WorkoutSessionRecord['snapshots'] = faulty ? [{ repNumber: 1, timestampMs: 165, exerciseId: exercise.id,
      faultFlags: ['DEPTH_INSUFFICIENT'], primaryAngleDeg: exercise.targetAngleDeg, symmetryScorePct: 90,
      landmarks: frame.landmarks.map(p => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3), visibility: 1 })) }] : [];
    state = recordCompletedWorkout(state, computeSessionRecord({ id: `demo-${completedAtIso}-ared`, exerciseId: exercise.id, completedAtIso,
      sets: 4, reps: 12, loadKg: exercise.defaultLoadKg * (0.8 + day % 5 * 0.04), cardioDistanceKm: 0,
      formAccuracyPct: faulty ? 90 : 98, symmetryScorePct: 90 + day % 10, snapshots }, state.profile));
    state = recordCompletedWorkout(state, computeSessionRecord({ id: `demo-${completedAtIso}-cardio`, exerciseId: cardio[day % cardio.length].id, completedAtIso,
      sets: 0, reps: 0, loadKg: 0, cardioDistanceKm: 4 + day % 4, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] }, state.profile));
  }
  return persistMissionStore(state, storage);
}
