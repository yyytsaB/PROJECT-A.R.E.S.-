import { getExerciseById } from '../catalog/missionCatalog';
import type { AstronautProfile, CompletedWorkoutInput, ExpeditionProgressReport, FlightSurgeonReport, MedicalTelemetryReport, PlanetaryRoute, ResistanceExerciseId, SyncQueueSummary, WorkoutSessionRecord } from '../types';

export function computeSessionRecord(input: CompletedWorkoutInput, profile: AstronautProfile): WorkoutSessionRecord {
  const values = [input.sets, input.reps, input.loadKg, input.cardioDistanceKm, input.formAccuracyPct, input.symmetryScorePct];
  if (!input.id.trim() || !Number.isFinite(Date.parse(input.completedAtIso)) || values.some(v => !Number.isFinite(v) || v < 0) ||
    !Number.isInteger(input.sets) || !Number.isInteger(input.reps) || input.formAccuracyPct > 100 || input.symmetryScorePct > 100) throw new RangeError('Invalid completed workout metrics');
  const exercise = getExerciseById(input.exerciseId);
  const resistanceVolumeKg = exercise.kind === 'RESISTANCE' ? input.sets * input.reps * input.loadKg : 0;
  const round = (value: number) => +value.toFixed(3);
  const snapshots = input.snapshots.map(s => ({ ...s, primaryAngleDeg: round(s.primaryAngleDeg), symmetryScorePct: round(s.symmetryScorePct),
    faultFlags: [...s.faultFlags], landmarks: s.landmarks.map(p => ({ x: round(p.x), y: round(p.y), z: round(p.z), visibility: round(p.visibility) })) }));
  return { ...input, snapshots, astronautId: profile.id, gravityProfileId: profile.gravityProfileId, resistanceVolumeKg,
    effectiveLoadKg: exercise.kind === 'RESISTANCE' ? input.loadKg * exercise.earthLoadMultiplier : 0,
    expeditionDistanceKm: exercise.kind === 'CARDIO' ? input.cardioDistanceKm * exercise.distanceMultiplier : resistanceVolumeKg * input.formAccuracyPct / 100 / 250 };
}

const DAY_MS = 86400000;
const mean = (values: readonly number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const resistance = (sessions: readonly WorkoutSessionRecord[]) => sessions.filter(s => getExerciseById(s.exerciseId).kind === 'RESISTANCE');
function windowSessions(sessions: readonly WorkoutSessionRecord[], end: number) {
  const start = Math.floor(end / DAY_MS) * DAY_MS - 29 * DAY_MS;
  return sessions.filter(s => Date.parse(s.completedAtIso) >= start && Date.parse(s.completedAtIso) <= end);
}
// Session-weighted normalized ARED load; simulated hardware resistance is Earth-equivalent even at 0g.
function retention(sessions: readonly WorkoutSessionRecord[], profile: AstronautProfile): number {
  const lifts = resistance(sessions);
  if (!lifts.length) return 0;
  const ratio = mean(lifts.map(s => s.effectiveLoadKg / profile.earthBaseline1RM[s.exerciseId as ResistanceExerciseId]));
  return 70 * Math.min(1, ratio) + 30 * mean(lifts.map(s => s.formAccuracyPct)) / 100;
}

export function computeMedicalTelemetry(sessions: readonly WorkoutSessionRecord[], profile: AstronautProfile, nowIso: string): MedicalTelemetryReport {
  const now = Date.parse(nowIso);
  const recent = windowSessions(sessions, now);
  const faultCounts: MedicalTelemetryReport['faultCounts'] = { DEPTH_INSUFFICIENT: 0, SPINE_MISALIGNED: 0, BILATERAL_ASYMMETRY: 0, LOW_VISIBILITY: 0 };
  const counts = { ...faultCounts };
  for (const session of recent) for (const snapshot of session.snapshots) for (const fault of new Set(snapshot.faultFlags)) counts[fault]++;
  return { strengthRetentionPct: retention(recent, profile), cumulativeVolumeKg: recent.reduce((sum, s) => sum + s.resistanceVolumeKg, 0),
    symmetryConsistencyPct: mean(resistance(recent).map(s => s.symmetryScorePct)), faultCounts: counts, sessions: recent,
    dailyRetentionSeries: Array.from({ length: 30 }, (_, index) => {
      const day = Math.floor(now / DAY_MS) * DAY_MS - (29 - index) * DAY_MS;
      return { dateIso: new Date(day).toISOString().slice(0, 10), strengthRetentionPct: retention(windowSessions(sessions, Math.min(now, day + DAY_MS - 1)), profile) };
    }) };
}

export function computeExpeditionProgress(sessions: readonly WorkoutSessionRecord[], route: PlanetaryRoute): ExpeditionProgressReport {
  const cumulativeDistanceKm = sessions.reduce((sum, s) => sum + s.expeditionDistanceKm, 0);
  return { routeId: route.id, cumulativeDistanceKm, progressPct: Math.min(100, cumulativeDistanceKm / route.totalDistanceKm * 100),
    unlockedMilestones: route.milestones.filter(m => m.distanceKm <= cumulativeDistanceKm) };
}

export function buildFlightSurgeonReport(telemetry: MedicalTelemetryReport, profile: AstronautProfile, syncSummary: SyncQueueSummary, exportedAtIso: string): FlightSurgeonReport {
  const rows: (string | number | null)[][] = [
    ['metric', 'value'], ['astronaut_id', profile.id], ['astronaut_name', profile.name], ['gravity_profile', profile.gravityProfileId],
    ['exported_at', exportedAtIso], ['strength_retention_pct', telemetry.strengthRetentionPct], ['cumulative_volume_kg', telemetry.cumulativeVolumeKg],
    ['symmetry_consistency_pct', telemetry.symmetryConsistencyPct], ['pending_sync_count', syncSummary.pendingCount], ['last_synced_at', syncSummary.lastSyncedAtIso],
    ...Object.entries(profile.earthBaseline1RM).map(([id, value]) => [`earth_baseline_${id}`, value]),
    ...Object.entries(telemetry.faultCounts),
    ['session_id', 'exercise', 'completed_at', 'sets', 'reps', 'load_kg', 'volume_kg', 'form_accuracy_pct', 'symmetry_pct', 'flagged_reps'],
    ...telemetry.sessions.map(s => [s.id, s.exerciseId, s.completedAtIso, s.sets, s.reps, s.loadKg, s.resistanceVolumeKg, s.formAccuracyPct, s.symmetryScorePct, s.snapshots.length]),
  ];
  const escape = (value: string | number | null) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return { json: structuredClone({ profile, telemetry, syncSummary, exportedAtIso }), csv: rows.map(row => row.map(escape).join(',')).join('\r\n') + '\r\n' };
}
