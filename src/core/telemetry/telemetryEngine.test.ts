import { expect, test } from 'vitest';
import { getPlanetaryRouteById } from '../catalog/missionCatalog';
import type { AstronautProfile, CompletedWorkoutInput } from '../types';
import { buildPoseFrame } from '../kinematics/poseFixtures';
import { getExerciseById } from '../catalog/missionCatalog';
import { computeSessionRecord, computeExpeditionProgress, computeMedicalTelemetry, buildFlightSurgeonReport } from './telemetryEngine';

export const profile: AstronautProfile = { id: 'crew-1', name: 'Crew, "Ares"', gravityProfileId: 'MARS_038G', routeId: 'VALLES_MARINERIS', earthBaseline1RM: { SQUAT: 100, DEADLIFT: 120, OVERHEAD_PRESS: 60, BICEP_CURL: 30 } };
export const workout: CompletedWorkoutInput = { id: 'workout-1', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z', sets: 4, reps: 25, loadKg: 100, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 90, snapshots: [] };

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
