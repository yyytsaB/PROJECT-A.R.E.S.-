import { expect, test } from 'vitest';
import { analyzeExerciseFrame, computeJointAngleDeg, describeSnapshotDiagnostic, normalizePose33 } from './kinematicMath';
import { getExerciseById } from '../catalog/missionCatalog';
import { buildPoseFrame } from './poseFixtures';
import type { FormFaultFlag, RawPoseFrame, ResistanceExerciseId } from '../types';

test('describes estimated replay angles in the configured movement direction and target band', () => {
  const cases: [ResistanceExerciseId, number, FormFaultFlag[], string][] = [
    ['SQUAT', 125, ['DEPTH_INSUFFICIENT'], '30° short of target · Faults: Depth insufficient'],
    ['DEADLIFT', 130, ['DEPTH_INSUFFICIENT'], '30° short of target · Faults: Depth insufficient'],
    ['BICEP_CURL', 80, ['DEPTH_INSUFFICIENT'], '30° short of target · Faults: Depth insufficient'],
    ['OVERHEAD_PRESS', 135, ['DEPTH_INSUFFICIENT'], '30° short of target · Faults: Depth insufficient'],
    ['SQUAT', 105, ['SPINE_MISALIGNED'], 'Target reached · Faults: Spine not aligned'],
    ['OVERHEAD_PRESS', 155, ['BILATERAL_ASYMMETRY'], 'Target reached · Faults: Left/Right imbalance'],
    ['OVERHEAD_PRESS', 175, [], 'Target reached · Faults: None'],
    ['SQUAT', 85, ['SPINE_MISALIGNED', 'BILATERAL_ASYMMETRY'], 'Target reached · Faults: Spine not aligned, Left/Right imbalance'],
  ];
  for (const [id, angle, faultFlags, description] of cases) {
    const exercise = getExerciseById(id);
    const snapshot = { repNumber: 1, timestampMs: 33, exerciseId: id, primaryAngleDeg: angle,
      symmetryScorePct: 90, faultFlags, landmarks: buildPoseFrame(exercise, { angleDeg: angle }).landmarks };
    expect(describeSnapshotDiagnostic(snapshot, exercise)).toBe(`Estimated angle: ${angle}° · Configured target: ${exercise.targetAngleDeg}° · ${description}`);
  }
});

test('computes known 3D angles and normalizes all 33 landmarks independent of framing', () => {
  const origin = { x: 0, y: 0, z: 0 };
  expect(computeJointAngleDeg({ x: 1, y: 0, z: 0 }, origin, { x: 0, y: 0, z: 1 })).toBeCloseTo(90, 10);
  expect(computeJointAngleDeg({ x: 1, y: 0, z: 0 }, origin, { x: -1, y: 0, z: 0 })).toBe(180);
  expect(computeJointAngleDeg({ x: 1, y: 0, z: 0 }, origin, { x: 1, y: 1, z: 0 })).toBeCloseTo(45, 10);
  const landmarks = Array.from({ length: 33 }, (_, i) => ({ x: i / 100, y: i / 80, z: i / 200, visibility: 1 }));
  landmarks[23] = { x: 0.4, y: 0.6, z: 0, visibility: 1 };
  landmarks[24] = { x: 0.6, y: 0.6, z: 0, visibility: 1 };
  landmarks[11] = { x: 0.4, y: 0.2, z: 0, visibility: 1 };
  landmarks[12] = { x: 0.6, y: 0.2, z: 0, visibility: 1 };
  const raw: RawPoseFrame = { landmarks, width: 640, height: 480, timestampMs: 10 };
  const normalized = normalizePose33(raw);
  expect(normalized.landmarks).toHaveLength(33);
  expect(normalized.landmarks[11].y).toBeCloseTo(-1, 10);
  expect((normalized.landmarks[23].x + normalized.landmarks[24].x) / 2).toBeCloseTo(0, 10);
  const moved = normalizePose33({ ...raw, landmarks: landmarks.map(p => ({ ...p, x: p.x * 2 + 0.2, y: p.y * 2 - 0.1, z: p.z * 2 + 0.3 })) });
  for (let i = 0; i < 33; i++) for (const axis of ['x', 'y', 'z'] as const) expect(moved.landmarks[i][axis]).toBeCloseTo(normalized.landmarks[i][axis], 10);
  // The same pixel-space skeleton encoded in a square image has the same result.
  const square = normalizePose33({ ...raw, width: 480, landmarks: landmarks.map(p => ({ ...p, x: p.x * 640 / 480, z: p.z * 640 / 480 })) });
  expect(square.landmarks[0].x).toBeCloseTo(normalized.landmarks[0].x, 10);
  expect(square.landmarks[0].z).toBeCloseTo(normalized.landmarks[0].z, 10);
  for (const invalid of [
    { ...raw, landmarks: [] }, { ...raw, width: 0 }, { ...raw, height: Infinity },
    { ...raw, timestampMs: NaN }, { ...raw, landmarks: landmarks.map(p => ({ ...p, x: NaN })) },
    { ...raw, landmarks: landmarks.map(p => ({ ...p, visibility: -1 })) },
    { ...raw, landmarks: landmarks.map(() => landmarks[23]) },
  ]) expect(() => normalizePose33(invalid)).toThrow(RangeError);
  expect(() => computeJointAngleDeg(origin, origin, origin)).toThrow(RangeError);
  expect(() => computeJointAngleDeg({ ...origin, x: Infinity }, origin, { x: 1, y: 0, z: 0 })).toThrow(RangeError);
});

test('analyzes flexion and extension ROM, bilateral symmetry, trunk lean, and visible joint geometry', async () => {
  const { analyzeExerciseFrame } = await import('./kinematicMath');
  for (const [id, halfAngle, beyondStart, beyondTarget] of [
    ['SQUAT', 132.5, 180, 85], ['DEADLIFT', 135, 180, 90],
    ['BICEP_CURL', 105, 170, 40], ['OVERHEAD_PRESS', 120, 60, 175],
  ] as const) {
    const exercise = getExerciseById(id);
    const analyze = (angleDeg: number) => analyzeExerciseFrame(normalizePose33(buildPoseFrame(exercise, { angleDeg })), exercise);
    expect(analyze(halfAngle).romPct).toBeCloseTo(50, 8);
    expect(analyze(beyondStart).romPct).toBe(0);
    expect(analyze(beyondTarget).romPct).toBe(100);
    expect(analyze(exercise.startAngleDeg).faultFlags).toContain('DEPTH_INSUFFICIENT');
    expect(analyze(exercise.targetAngleDeg)).toMatchObject({ faultFlags: [], isVisible: true });
    expect(analyze(exercise.targetAngleDeg).symmetryScorePct).toBeCloseTo(100, 8);
  }
  const squat = getExerciseById('SQUAT');
  const leaned = buildPoseFrame(squat, { angleDeg: 95, trunkLeanDeg: 45 });
  const analysis = analyzeExerciseFrame(normalizePose33(leaned), squat);
  expect(analysis.trunkLeanDeg).toBeCloseTo(45, 8);
  expect(analysis.faultFlags).toEqual(['SPINE_MISALIGNED']);
  const asymmetric = analyzeExerciseFrame(normalizePose33(buildPoseFrame(squat, { angleDeg: 90, rightAngleDeg: 120 })), squat);
  expect(asymmetric.primaryAngleDeg).toBeCloseTo(105, 8);
  expect(asymmetric.symmetryScorePct).toBeCloseTo(83.3333333333, 8);
  expect(asymmetric.faultFlags).toContain('BILATERAL_ASYMMETRY');
  const moved = normalizePose33({ ...leaned, landmarks: leaned.landmarks.map(p => ({ ...p, x: p.x * 2 + 0.2, y: p.y * 2 - 0.1, z: p.z * 2 })) });
  expect(analyzeExerciseFrame(moved, squat).primaryAngleDeg).toBeCloseTo(analysis.primaryAngleDeg, 8);
  const hidden = { ...leaned, landmarks: leaned.landmarks.map((p, i) => ({ ...p, visibility: i === 25 ? 0.49 : 1 })) };
  expect(analyzeExerciseFrame(normalizePose33(hidden), squat)).toMatchObject({ isVisible: false, faultFlags: ['LOW_VISIBILITY'] });
  const boundary = { ...hidden, landmarks: hidden.landmarks.map(p => ({ ...p, visibility: 0.5 })) };
  expect(analyzeExerciseFrame(normalizePose33(boundary), squat).isVisible).toBe(true);
  const collapsed = { ...leaned, landmarks: leaned.landmarks.map((p, i) => i === 27 ? leaned.landmarks[25] : p) };
  expect(analyzeExerciseFrame(normalizePose33(collapsed), squat)).toMatchObject({ isVisible: false, faultFlags: ['LOW_VISIBILITY'] });
  expect(() => analyzeExerciseFrame(normalizePose33(leaned), getExerciseById('ROWING'))).toThrow(RangeError);
});

test('prefers metric world landmarks over image-space depth for joint angles', () => {
  const squat = getExerciseById('SQUAT');
  const frame = buildPoseFrame(squat, { angleDeg: 120 });
  const aspect = frame.width / frame.height;
  const world = frame.landmarks.map(p => ({ x: p.x * aspect, y: p.y, z: p.z * aspect }));
  // Corrupt image depth at the ankles, as a noisy estimate would.
  const noisy = { ...frame, landmarks: frame.landmarks.map((p, i) => i === 27 || i === 28 ? { ...p, z: 0.3 } : p) };
  expect(analyzeExerciseFrame(normalizePose33(noisy), squat).primaryAngleDeg).not.toBeCloseTo(120, 0);
  expect(analyzeExerciseFrame(normalizePose33({ ...noisy, worldLandmarks: world }), squat).primaryAngleDeg).toBeCloseTo(120, 5);
  // Incomplete world data falls back to the image landmarks.
  expect(analyzeExerciseFrame(normalizePose33({ ...frame, worldLandmarks: world.slice(0, 10) }), squat).primaryAngleDeg).toBeCloseTo(120, 5);
});
