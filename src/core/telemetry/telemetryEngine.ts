import { getExerciseById, getGravityProfileById, getPlanetaryRouteById, loadMissionCatalog } from '../catalog/missionCatalog';
import { serializeMissionStore } from '../storage/missionSerialization';
import { withProfileDefaults } from './profileDefaults';
import { calculateBmi, validateProfileFields } from './profileFields';
import rules from '../../content/routineRules.json';
import prototypeNotice from '../../content/prototypeNotice.json';
import type { AstronautProfile, CompletedWorkoutInput, ExpeditionProgressReport, FlightSurgeonReport, GravityProfile, MedicalTelemetryReport, MissionStoreState, PersonalizedRoutinePlan, PlanetaryRoute, ResistanceExerciseId, SyncQueueSummary, WorkoutSessionRecord } from '../types';

export { calculateBmi } from './profileFields';

export function generatePersonalizedRoutine(profile: AstronautProfile, sessions: readonly WorkoutSessionRecord[], nowIso: string): PersonalizedRoutinePlan {
  const crew = withProfileDefaults(profile), now = Date.parse(nowIso);
  calculateBmi(crew.bodyWeightKg, crew.heightCm);
  if (typeof crew.id !== 'string' || !crew.id.trim() || typeof crew.name !== 'string' || !crew.name.trim() || typeof crew.autoAdjustRoutine !== 'boolean' ||
    typeof crew.injuryLimitations !== 'string' || typeof crew.missionType !== 'string' || !Object.hasOwn(rules.limitations, crew.injuryLimitations) || !Object.hasOwn(rules.missions, crew.missionType) ||
    !crew.earthBaseline1RM || typeof crew.earthBaseline1RM !== 'object' || Array.isArray(crew.earthBaseline1RM)) throw new RangeError('Invalid routine profile');
  getPlanetaryRouteById(crew.routeId);
  const limitation = rules.limitations[crew.injuryLimitations], mission = rules.missions[crew.missionType];
  if (typeof nowIso !== 'string' || !Number.isFinite(now) || !limitation || !mission || Object.keys(validateProfileFields(crew, {})).length || typeof crew.injuryNotes !== 'string') throw new RangeError('Invalid routine profile or timestamp');
  const gravity = getGravityProfileById(crew.gravityProfileId);
  const recent = windowSessions(sessions, now).reverse().sort((a, b) => Date.parse(b.completedAtIso) - Date.parse(a.completedAtIso));
  const round = (value: number) => value > Number.MAX_VALUE / 10 ? value : Math.round(value * 10) / 10;
  const items = loadMissionCatalog().exercises.map(exercise => {
    const history = recent.filter(session => session.exerciseId === exercise.id);
    const moderated = (limitation.exercises as readonly string[]).includes(exercise.id);
    const factor = moderated ? 0.85 : 1;
    const context = `${gravity.name} (${gravity.gravityG}g) scenario, prototype goal ${gravity.prototypeGoalPct}%; ${mission.label}, ${crew.missionDurationDays} days.`;
    let recommendedLoadKg = 0, targetCardioKm = 0, rationale: string;
    if (exercise.kind === 'RESISTANCE') {
      const baseline = crew.earthBaseline1RM[exercise.id];
      if (!Number.isFinite(baseline) || baseline <= 0) throw new RangeError('Earth baseline must be positive and finite');
      const score = retention(history, crew);
      const load = history.length ? history[0].loadKg * (score >= gravity.prototypeGoalPct ? 1.05 : 1) : baseline * 0.8;
      recommendedLoadKg = round(Math.min(baseline * 0.9, load) * factor);
      rationale = history.length ? `Targeting ${rules.focus[exercise.id]} (currently at ${score.toFixed(1)}%).` : `No recent history; starting at 80% of the entered Earth 1RM for ${rules.focus[exercise.id]}.`;
      rationale += ` Earth 1RM ${baseline} kg. ${context}${moderated ? ` Load moderated for ${limitation.label} by the 15% prototype rule.` : ''}`;
    } else {
      const latest = history.find(session => session.cardioDistanceKm > 0);
      targetCardioKm = round((latest?.cardioDistanceKm ?? rules.cardioKm[exercise.id]) * factor);
      rationale = `${rules.focus[exercise.id]}; ${latest ? 'latest recorded distance' : 'prototype starting distance'}. ${context}${moderated ? ` Distance moderated for ${limitation.label} by the 15% prototype rule.` : ''}`;
    }
    return { exerciseId: exercise.id, name: exercise.name, kind: exercise.kind, scheduledTime: exercise.scheduledTime,
      targetSets: exercise.kind === 'RESISTANCE' ? 4 : 0, targetReps: exercise.kind === 'RESISTANCE' ? 12 : 0, recommendedLoadKg, targetCardioKm, rationale };
  });
  const generatedAtIso = new Date(now).toISOString();
  let hash = 2166136261;
  for (const character of JSON.stringify({ crew, items, generatedAtIso })) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return { routineId: `routine-${(hash >>> 0).toString(16)}`, generatedAtIso, summaryLabel: 'Personalized for you — Adapted to your progress',
    disclaimer: 'Rule-based prototype prescription engine. Targets are for review; this is not a diagnosis, injury treatment, or NASA Flight Surgeon medical clearance.', items };
}

export function describeGravityScenario(score: number, gravity: GravityProfile): string {
  const margin = Number((score - gravity.prototypeGoalPct).toFixed(1));
  const comparison = margin > 0 ? `Goal exceeded by ${margin.toFixed(1)} percentage points`
    : margin < 0 ? `Below prototype goal by ${Math.abs(margin).toFixed(1)} percentage points` : 'Prototype goal met';
  return `${gravity.name} (${gravity.gravityG}g) scenario · Score: ${score.toFixed(1)}% · Prototype goal: ${gravity.prototypeGoalPct.toFixed(1)}% · ${comparison}`;
}

export function measureMissionPayloads(state: MissionStoreState): { queuedPayloadBytes: number; retainedSnapshotBytes: number; localCacheBytes: number } {
  const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  return { queuedPayloadBytes: bytes(state.syncQueue), retainedSnapshotBytes: bytes(state.sessions.flatMap(session => session.snapshots)), localCacheBytes: new TextEncoder().encode(serializeMissionStore(state)).byteLength };
}

export function formatDurationMmSs(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec < 0) throw new RangeError('Duration must be finite and nonnegative');
  const seconds = Math.floor(durationSec);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function getSessionFormStatus(session: WorkoutSessionRecord): 'GREEN' | 'YELLOW' | 'RED' {
  if (session.formAccuracyPct >= 90 && !session.snapshots.some(snapshot => snapshot.faultFlags.length > 0)) return 'GREEN';
  return session.formAccuracyPct >= 75 ? 'YELLOW' : 'RED';
}

export function computeSessionRecord(input: Omit<CompletedWorkoutInput, 'durationSec'> & { readonly durationSec?: number }, profile: AstronautProfile): WorkoutSessionRecord {
  const durationSec = input.durationSec === undefined ? 0 : input.durationSec;
  const values = [durationSec, input.sets, input.reps, input.loadKg, input.cardioDistanceKm, input.formAccuracyPct, input.symmetryScorePct];
  if (!input.id.trim() || !Number.isFinite(Date.parse(input.completedAtIso)) || values.some(v => !Number.isFinite(v) || v < 0) ||
    !Number.isInteger(input.sets) || !Number.isInteger(input.reps) || input.formAccuracyPct > 100 || input.symmetryScorePct > 100) throw new RangeError('Invalid completed workout metrics');
  const exercise = getExerciseById(input.exerciseId);
  const resistanceVolumeKg = exercise.kind === 'RESISTANCE' ? input.sets * input.reps * input.loadKg : 0;
  const effectiveLoadKg = exercise.kind === 'RESISTANCE' ? input.loadKg * exercise.earthLoadMultiplier : 0;
  const expeditionDistanceKm = exercise.kind === 'CARDIO' ? input.cardioDistanceKm * exercise.distanceMultiplier : resistanceVolumeKg * (input.formAccuracyPct / 100) / 250;
  if (![input.sets * input.reps, resistanceVolumeKg, effectiveLoadKg, expeditionDistanceKm].every(Number.isFinite)) throw new RangeError('Completed workout totals must be finite');
  const round = (value: number) => +value.toFixed(3);
  const snapshots = input.snapshots.map(s => ({ ...s, primaryAngleDeg: round(s.primaryAngleDeg), symmetryScorePct: round(s.symmetryScorePct),
    faultFlags: [...s.faultFlags], landmarks: s.landmarks.map(p => ({ x: round(p.x), y: round(p.y), z: round(p.z), visibility: round(p.visibility) })) }));
  return { ...input, durationSec, snapshots, astronautId: profile.id, gravityProfileId: profile.gravityProfileId, resistanceVolumeKg,
    effectiveLoadKg, expeditionDistanceKm };
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
    ['prototype_disclaimer', prototypeNotice.disclaimer], ['metric_interpretation', prototypeNotice.metricInterpretation],
    ['gravity_goals_notice', prototypeNotice.gravityGoals], ['comms_scenario_notice', prototypeNotice.commsScenario], ['data_notice', prototypeNotice.dataNotice],
    ['body_weight_kg', profile.bodyWeightKg],
    ['exported_at', exportedAtIso], ['strength_retention_pct', telemetry.strengthRetentionPct], ['cumulative_volume_kg', telemetry.cumulativeVolumeKg],
    ['symmetry_consistency_pct', telemetry.symmetryConsistencyPct], ['pending_sync_count', syncSummary.pendingCount], ['last_synced_at', syncSummary.lastSyncedAtIso],
    ...Object.entries(profile.earthBaseline1RM).map(([id, value]) => [`earth_baseline_${id}`, value]),
    ...Object.entries(telemetry.faultCounts),
    ['session_id', 'exercise', 'completed_at', 'sets', 'reps', 'load_kg', 'volume_kg', 'form_accuracy_pct', 'symmetry_pct', 'flagged_reps', 'duration_sec'],
    ...telemetry.sessions.map(s => [s.id, s.exerciseId, s.completedAtIso, s.sets, s.reps, s.loadKg, s.resistanceVolumeKg, s.formAccuracyPct, s.symmetryScorePct, s.snapshots.length, s.durationSec]),
  ];
  const escape = (value: string | number | null) => {
    const raw = String(value ?? '');
    const text = typeof value === 'string' && (/^\s*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw)) ? `'${raw}` : raw;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return { json: structuredClone({ profile, telemetry, syncSummary, exportedAtIso, prototypeNotice }), csv: rows.map(row => row.map(escape).join(',')).join('\r\n') + '\r\n' };
}
