import { loadMissionCatalog } from '../catalog/missionCatalog';
import type { MissionStoreState } from '../types';

const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const number = (v: unknown, min = 0, max = Infinity): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
const array = (v: unknown, valid: (entry: unknown) => boolean) => Array.isArray(v) && v.every(valid);

export function isMissionStoreState(value: unknown): value is MissionStoreState {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.profile)) return false;
  const catalog = loadMissionCatalog();
  const exercise = (v: unknown) => catalog.exercises.some(e => e.id === v);
  const gravity = (v: unknown) => catalog.gravityProfiles.some(g => g.id === v);
  const profile = value.profile;
  if (!text(profile.id) || !text(profile.name) || !gravity(profile.gravityProfileId) || !catalog.routes.some(r => r.id === profile.routeId) || !object(profile.earthBaseline1RM)) return false;
  const baselines = profile.earthBaseline1RM;
  if (!catalog.exercises.filter(e => e.kind === 'RESISTANCE').every(e => number(baselines[e.id], Number.EPSILON))) return false;
  const snapshot = (v: unknown) => object(v) && number(v.repNumber, 1) && number(v.timestampMs) && exercise(v.exerciseId) &&
    number(v.primaryAngleDeg, 0, 180) && number(v.symmetryScorePct, 0, 100) &&
    array(v.faultFlags, f => ['DEPTH_INSUFFICIENT', 'SPINE_MISALIGNED', 'BILATERAL_ASYMMETRY', 'LOW_VISIBILITY'].includes(String(f))) &&
    Array.isArray(v.landmarks) && v.landmarks.length === 33 && v.landmarks.every(p => object(p) && number(p.x, -Infinity) && number(p.y, -Infinity) && number(p.z, -Infinity) && number(p.visibility, 0, 1));
  const session = (v: unknown) => object(v) && text(v.id) && text(v.astronautId) && exercise(v.exerciseId) && gravity(v.gravityProfileId) && date(v.completedAtIso) &&
    ['sets', 'reps', 'loadKg', 'cardioDistanceKm', 'resistanceVolumeKg', 'effectiveLoadKg', 'expeditionDistanceKm'].every(k => number(v[k])) &&
    number(v.formAccuracyPct, 0, 100) && number(v.symmetryScorePct, 0, 100) && array(v.snapshots, snapshot);
  return array(value.sessions, session) && array(value.syncQueue, v => object(v) && text(v.sessionId) && text(v.astronautId) && exercise(v.exerciseId) &&
    number(v.reps) && number(v.formAccuracyPct, 0, 100) && number(v.volumeKg) && date(v.completedAtIso) && v.status === 'QUEUED_BLACKOUT') &&
    array(value.acknowledgements, v => object(v) && text(v.sessionId) && date(v.acknowledgedAtIso)) &&
    ['BLACKOUT_24MIN_DELAY', 'WINDOW_OPEN'].includes(String(value.commsStatus)) && (value.lastSyncedAtIso === null || date(value.lastSyncedAtIso));
}
