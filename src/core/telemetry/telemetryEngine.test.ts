import { expect, test } from 'vitest';
import { getPlanetaryRouteById } from '../catalog/missionCatalog';
import type { AstronautProfile, CompletedWorkoutInput } from '../types';
import { buildPoseFrame } from '../kinematics/poseFixtures';
import { getExerciseById } from '../catalog/missionCatalog';
import { computeSessionRecord, computeExpeditionProgress, computeMedicalTelemetry, buildFlightSurgeonReport, measureMissionPayloads, formatDurationMmSs, getSessionFormStatus } from './telemetryEngine';
import { clearMissionStore, flushCommsSyncQueue, recordCompletedWorkout } from '../storage/telemetryStore';

export const profile: AstronautProfile = { bodyWeightKg: 78, id: 'crew-1', name: 'Crew, "Ares"', gravityProfileId: 'MARS_038G', routeId: 'VALLES_MARINERIS', earthBaseline1RM: { SQUAT: 100, DEADLIFT: 120, OVERHEAD_PRESS: 60, BICEP_CURL: 30 } };
export const workout: CompletedWorkoutInput = { durationSec: 0, id: 'workout-1', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z', sets: 4, reps: 25, loadKg: 100, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 90, snapshots: [] };

test('normalizes, validates and formats workout duration without changing resistance metrics', () => {
  expect(formatDurationMmSs(45)).toBe('00:45');
  expect(formatDurationMmSs(125.9)).toBe('02:05');
  expect(formatDurationMmSs(3600)).toBe('60:00');
  expect(formatDurationMmSs(0)).toBe('00:00');
  const legacy = { ...workout, durationSec: undefined };
  expect(computeSessionRecord(legacy, profile).durationSec).toBe(0);
  expect(computeSessionRecord({ ...workout, durationSec: 45 }, profile)).toMatchObject({ durationSec: 45, resistanceVolumeKg: 10000 });
  for (const durationSec of [-1, NaN, Infinity]) {
    expect(() => formatDurationMmSs(durationSec)).toThrow(RangeError);
    expect(() => computeSessionRecord({ ...workout, durationSec }, profile)).toThrow(RangeError);
  }
});

test('labels demo session form status at the exact thresholds while preserving captured faults', () => {
  const session = computeSessionRecord(workout, profile);
  expect(getSessionFormStatus({ ...session, formAccuracyPct: 90 })).toBe('GREEN');
  const snapshot = { repNumber: 1, timestampMs: 33, exerciseId: 'SQUAT' as const, primaryAngleDeg: 95, symmetryScorePct: 100,
    faultFlags: ['SPINE_MISALIGNED' as const], landmarks: buildPoseFrame(getExerciseById('SQUAT')).landmarks };
  expect(getSessionFormStatus({ ...session, formAccuracyPct: 95, snapshots: [snapshot] })).toBe('YELLOW');
  expect(getSessionFormStatus({ ...session, formAccuracyPct: 75 })).toBe('YELLOW');
  expect(getSessionFormStatus({ ...session, formAccuracyPct: 74.9 })).toBe('RED');
});

test('measures UTF-8 queue JSON separately from snapshots retained after synchronization', async () => {
  const empty = clearMissionStore();
  expect(measureMissionPayloads(empty)).toMatchObject({ queuedPayloadBytes: 2, retainedSnapshotBytes: 2 });
  const snapshot = { repNumber: 1, timestampMs: 33, exerciseId: 'SQUAT' as const, faultFlags: ['DEPTH_INSUFFICIENT' as const],
    primaryAngleDeg: 125, symmetryScorePct: 90, landmarks: Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 })) };
  const session = computeSessionRecord({ ...workout, id: 'rep-🚀', snapshots: [snapshot] }, profile);
  const state = recordCompletedWorkout(empty, session);
  // Fixed serialized fixtures: the rocket occupies 4 UTF-8 bytes, not 2 JS code units.
  expect(measureMissionPayloads(state)).toMatchObject({ queuedPayloadBytes: 191, retainedSnapshotBytes: 1304 });
  const synced = await flushCommsSyncQueue(state, 'WINDOW_OPEN', undefined, workout.completedAtIso);
  expect(measureMissionPayloads(synced)).toMatchObject({ queuedPayloadBytes: 2, retainedSnapshotBytes: 1304 });
  expect(measureMissionPayloads({ ...state, sessions: [session, { ...session, id: 'second' }] }).retainedSnapshotBytes).toBe(2607);
});

test('measures serialized mission cache bytes independently of queue and retained snapshot sizes', () => {
  const state = clearMissionStore();
  expect(measureMissionPayloads(state).localCacheBytes).toBe(365);
  expect(measureMissionPayloads({ ...state, profile: { ...state.profile, name: '🚀' } }).localCacheBytes).toBe(360);
});

test('form-qualified tonnage and cardio advance both routes and unlock reached milestones', () => {
  const strength = computeSessionRecord(workout, profile);
  const cardio = computeSessionRecord({ ...workout, id: 'cardio', exerciseId: 'TREADMILL', cardioDistanceKm: 15 }, profile);
  expect(strength.resistanceVolumeKg).toBe(10000);
  expect(strength.expeditionDistanceKm).toBe(40);
  expect(cardio.resistanceVolumeKg).toBe(0);
  const valles = computeExpeditionProgress([strength, cardio], getPlanetaryRouteById('VALLES_MARINERIS'));
  expect(valles).toMatchObject({ cumulativeDistanceKm: 55, progressPct: 1.375 });
  expect(valles.unlockedMilestones.map(m => m.id)).toEqual(['FIRST_TRAVERSE']);
  const olympus = computeExpeditionProgress([strength, cardio], getPlanetaryRouteById('OLYMPUS_MONS'));
  expect(olympus.progressPct).toBeCloseTo(9.1666667);
  expect(olympus.unlockedMilestones.map(m => m.id)).toEqual(['BASE_CAMP']);
  expect(computeSessionRecord({ ...workout, formAccuracyPct: 50 }, profile).expeditionDistanceKm).toBe(20);
});

test('completed session rejects invalid metrics and stores a compact independent 33-point replay snapshot', () => {
  for (const patch of [{ reps: -1 }, { sets: 1.5 }, { loadKg: NaN }, { formAccuracyPct: 101 }, { symmetryScorePct: -1 }, { cardioDistanceKm: Infinity }, { completedAtIso: 'bad-date' }]) {
    expect(() => computeSessionRecord({ ...workout, ...patch }, profile)).toThrow(RangeError);
  }
  const frame = buildPoseFrame(getExerciseById('SQUAT'), { angleDeg: 90 });
  const snapshot = { repNumber: 1, timestampMs: 165, exerciseId: 'SQUAT' as const, faultFlags: ['SPINE_MISALIGNED' as const], primaryAngleDeg: 91.123456789, symmetryScorePct: 99.123456789, landmarks: frame.landmarks };
  const session = computeSessionRecord({ ...workout, snapshots: [snapshot] }, profile);
  expect(JSON.stringify(session.snapshots[0]).length).toBeLessThanOrEqual(2048);
  expect(session.snapshots[0].landmarks).toHaveLength(33);
  expect(session.snapshots[0]).not.toBe(snapshot);
});

test('Flight Surgeon export preserves baselines, fault counts, session metrics and escaped CSV deterministically', () => {
  const session = computeSessionRecord({ ...workout, snapshots: [{ repNumber: 1, timestampMs: 33, exerciseId: 'SQUAT', faultFlags: ['SPINE_MISALIGNED'], primaryAngleDeg: 90, symmetryScorePct: 90, landmarks: [] }] }, profile);
  const telemetry = computeMedicalTelemetry([session], profile, workout.completedAtIso);
  const syncSummary = { pendingCount: 1, lastSyncedAtIso: null };
  const report = buildFlightSurgeonReport(telemetry, profile, syncSummary, workout.completedAtIso);
  expect(report.json).toEqual({ profile, telemetry, syncSummary, exportedAtIso: workout.completedAtIso });
  expect(report.json.telemetry.faultCounts.SPINE_MISALIGNED).toBe(1);
  expect(report.csv).toContain('"Crew, ""Ares"""');
  expect(report.csv).toContain('strength_retention_pct,100');
  expect(report.csv).toContain('cumulative_volume_kg,10000');
  expect(report.csv).toContain('SPINE_MISALIGNED,1');
  expect(report.csv).toContain('workout-1,SQUAT,2026-11-14T12:00:00.000Z,4,25,100,10000,100,90,1');
  expect(buildFlightSurgeonReport(telemetry, profile, syncSummary, workout.completedAtIso)).toEqual(report);
});

test('rolling medical telemetry uses Earth-equivalent ARED loads in every gravity profile and excludes old/future/cardio sessions', () => {
  for (const gravityProfileId of ['MICROGRAVITY_0G', 'MOON_016G', 'MARS_038G'] as const) {
    const crew = { ...profile, gravityProfileId };
    const recent = computeSessionRecord({ ...workout, loadKg: 50, formAccuracyPct: 80 }, crew);
    const old = computeSessionRecord({ ...workout, id: 'old', completedAtIso: '2026-10-15T23:59:59.000Z' }, crew);
    const future = computeSessionRecord({ ...workout, id: 'future', completedAtIso: '2026-11-15T00:00:00.000Z' }, crew);
    const cardio = computeSessionRecord({ ...workout, exerciseId: 'ROWING', formAccuracyPct: 0 }, crew);
    const report = computeMedicalTelemetry([recent, old, future, cardio], crew, workout.completedAtIso);
    expect(report.strengthRetentionPct).toBe(59);
    expect(report.cumulativeVolumeKg).toBe(5000);
    expect(report.symmetryConsistencyPct).toBe(90);
    expect(report.sessions.map(s => s.id)).toEqual(['workout-1', 'workout-1']);
    expect(report.dailyRetentionSeries).toHaveLength(30);
    expect(report.dailyRetentionSeries[0]).toEqual({ dateIso: '2026-10-16', strengthRetentionPct: 100 });
    expect(report.dailyRetentionSeries[29]).toEqual({ dateIso: '2026-11-14', strengthRetentionPct: 59 });
    expect(computeMedicalTelemetry([], crew, workout.completedAtIso).strengthRetentionPct).toBe(0);
  }
});

test('calculates a one-decimal BMI from positive finite biometrics without diagnostic labels', async () => {
  const { calculateBmi } = await import('./telemetryEngine');
  expect(calculateBmi(78, 175)).toBe(25.5);
  expect(calculateBmi(60, 160)).toBe(23.4);
  for (const [weight, height] of [[0, 175], [-1, 175], [78, 0], [78, -1], [NaN, 175], [78, Infinity]]) {
    expect(() => calculateBmi(weight, height)).toThrow(RangeError);
  }
});

test('generates deterministic prototype routines from Earth baselines, recent progress, scenario goals and applicable limitations', async () => {
  const { generatePersonalizedRoutine } = await import('./telemetryEngine');
  const now = workout.completedAtIso;
  const fresh = generatePersonalizedRoutine(profile, [], now);
  expect(fresh.summaryLabel).toBe('Personalized for you — Adapted to your progress');
  expect(fresh.items.map(item => item.exerciseId)).toEqual(['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL', 'TREADMILL', 'CYCLE_ERGOMETER', 'ROWING']);
  expect(fresh.items[0]).toMatchObject({ targetSets: 4, targetReps: 12, recommendedLoadKg: 80, targetCardioKm: 0, scheduledTime: '08:00' });
  expect(fresh.items[0].rationale).toContain('No recent history');
  expect(fresh.disclaimer).toContain('Rule-based prototype');
  const recent = computeSessionRecord({ ...workout, loadKg: 80 }, profile); // 70×.8 +30 =86%.
  const old = { ...recent, id: 'old', loadKg: 100, effectiveLoadKg: 100, completedAtIso: '2026-10-01T12:00:00.000Z' };
  const future = { ...old, id: 'future', completedAtIso: '2026-11-15T12:00:00.000Z' };
  const history = [old, recent, future];
  const mars = generatePersonalizedRoutine(profile, history, now);
  expect(mars.items[0].recommendedLoadKg).toBe(80);
  expect(mars.items[0].rationale).toContain('Targeting lower-body retention (currently at 86.0%)');
  expect(mars.items[0].rationale).toContain('Mars (0.38g)');
  expect(generatePersonalizedRoutine({ ...profile, gravityProfileId: 'MOON_016G' }, history, now).items[0].recommendedLoadKg).toBe(84);
  const moderated = generatePersonalizedRoutine({ ...profile, injuryLimitations: 'KNEE_SENSITIVITY' }, history, now);
  expect(moderated.items[0].recommendedLoadKg).toBe(68);
  expect(moderated.items[0].rationale).toContain('Load moderated for knee sensitivity');
  expect(moderated.items[1].recommendedLoadKg).toBe(96); // Unaffected deadlift keeps its baseline suggestion.
  expect(moderated.items[4].targetCardioKm).toBe(2.6);
  expect(generatePersonalizedRoutine({ ...profile, injuryLimitations: 'SHOULDER_MOBILITY' }, [], now).items[2].recommendedLoadKg).toBe(40.8);
  expect(generatePersonalizedRoutine({ ...profile, injuryLimitations: 'LOWER_BACK_SENSITIVITY' }, [], now).items[1].recommendedLoadKg).toBe(81.6);
  expect(generatePersonalizedRoutine(profile, history, now)).toEqual(mars);
  expect(generatePersonalizedRoutine(profile, history, now).routineId).not.toBe(moderated.routineId);
  expect(() => generatePersonalizedRoutine(profile, [], 'invalid')).toThrow(RangeError);
});

test('rejects malformed profiles at the public personalized-routine boundary', async () => {
  const { generatePersonalizedRoutine } = await import('./telemetryEngine');
  const invalidProfiles: unknown[] = [
    { ...profile, name: '' }, { ...profile, name: null }, { ...profile, id: '' }, { ...profile, routeId: 'UNKNOWN' },
    { ...profile, autoAdjustRoutine: 'yes' }, { ...profile, injuryLimitations: ['NONE'] }, { ...profile, missionType: ['MARS_TRANSIT_360D'] },
    { ...profile, missionType: 'toString' }, { ...profile, missionType: '__proto__' }, { ...profile, injuryLimitations: 'constructor' },
    { ...profile, heightCm: 0 }, { ...profile, restingHeartRateBpm: NaN }, { ...profile, missionDurationDays: 1.5 },
    { ...profile, injuryNotes: null }, { ...profile, earthBaseline1RM: null },
  ];
  for (const invalid of invalidProfiles) expect(() => generatePersonalizedRoutine(invalid as AstronautProfile, [], workout.completedAtIso)).toThrow(RangeError);
});
