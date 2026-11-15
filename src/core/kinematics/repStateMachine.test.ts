import { expect, test } from 'vitest';
import { getExerciseById } from '../catalog/missionCatalog';
import { buildPoseFrame, buildRepTrajectory } from './poseFixtures';
import { abandonRepInProgress, advanceRepState, createInitialRepState, MAX_OBSERVATION_GAP_MS } from './repStateMachine';
import type { RawPoseFrame, RepPhase } from '../types';

test('retains source frame dimensions for aspect-correct snapshot replay', () => {
  const exercise = getExerciseById('SQUAT');
  let state = createInitialRepState('SQUAT');
  for (const frame of buildRepTrajectory(exercise, 'SHALLOW')) {
    const wide = { ...frame, width: 1280, height: 720, landmarks: frame.landmarks.map(p => ({ ...p, x: p.x * 0.75, z: p.z * 0.75 })) };
    state = advanceRepState(state, wide, exercise).state;
  }
  expect(state.snapshots[0]).toMatchObject({ frameWidth: 1280, frameHeight: 720 });
  expect(new TextEncoder().encode(JSON.stringify(state.snapshots[0])).length).toBeLessThanOrEqual(2048);
});

test('counts balanced flexion and extension reps with hysteresis, pause, and timestamp protection', () => {
  for (const id of ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL'] as const) {
    const exercise = getExerciseById(id);
    let state = createInitialRepState(id);
    const phases: RepPhase[] = [state.phase];
    for (const frame of buildRepTrajectory(exercise)) {
      const original = structuredClone(state);
      const step = advanceRepState(state, frame, exercise);
      expect(state).toEqual(original);
      state = step.state;
      if (phases.at(-1) !== state.phase) phases.push(state.phase);
      expect(step.capturedSnapshots).toEqual([]);
      expect(step.activeFaultAlerts).toEqual([]);
      if (state.phase === 'ECCENTRIC') {
        expect(advanceRepState(state, null, exercise).state).toBe(state);
        expect(advanceRepState(state, frame, exercise).state).toBe(state);
        const hidden = { ...frame, timestampMs: frame.timestampMs + 1, landmarks: frame.landmarks.map(p => ({ ...p, visibility: 0.1 })) };
        expect(advanceRepState(state, hidden, exercise).state).toBe(state);
      }
    }
    expect(phases).toEqual(['IDLE', 'ECCENTRIC', 'INFLECTION', 'CONCENTRIC', 'COMPLETED']);
    expect(state).toMatchObject({ repCount: 1, formAccuracyPct: 100, snapshots: [] });
    for (const frame of buildRepTrajectory(exercise, 'GOOD', 1000)) state = advanceRepState(state, frame, exercise).state;
    expect(state.repCount).toBe(2);
    for (const angleDeg of [exercise.startAngleDeg, exercise.startAngleDeg + 5, exercise.startAngleDeg - 5, exercise.targetAngleDeg, exercise.startAngleDeg]) {
      state = advanceRepState(state, buildPoseFrame(exercise, { angleDeg, timestampMs: (state.lastTimestampMs ?? 0) + 33 }), exercise).state;
    }
    expect(state.repCount).toBe(2);
    const malformed = { ...buildPoseFrame(exercise), timestampMs: 3000, landmarks: [] };
    expect(advanceRepState(state, malformed, exercise).state).toBe(state);
  }
  const squat = getExerciseById('SQUAT');
  const initial = createInitialRepState('SQUAT');
  expect(advanceRepState(initial, null, squat)).toMatchObject({ state: initial, analysis: null });
  expect(() => advanceRepState(initial, buildPoseFrame(squat), getExerciseById('DEADLIFT'))).toThrow(RangeError);
  expect(() => advanceRepState(createInitialRepState('ROWING'), null, getExerciseById('ROWING'))).toThrow(RangeError);
  // A tracking stream starting at depth must first observe the start posture.
  let unarmed = createInitialRepState('SQUAT');
  const frames: RawPoseFrame[] = [95, 95, 140, 170, 170].map((angleDeg, i) => buildPoseFrame(squat, { angleDeg, timestampMs: i * 33 }));
  for (const frame of frames) unarmed = advanceRepState(unarmed, frame, squat).state;
  expect(unarmed.repCount).toBe(0);
});

test('requires two target-band observations even when a shallow neighbor is within the noise buffer', () => {
  const exercise = getExerciseById('SQUAT');
  let state = createInitialRepState('SQUAT');
  for (const [i, angleDeg] of [170, 150, 135, 125, 110, 101, 110, 125, 140, 170, 170].entries()) {
    state = advanceRepState(state, buildPoseFrame(exercise, { angleDeg, timestampMs: i * 33 }), exercise).state;
  }
  expect(state).toMatchObject({ repCount: 1, faultedRepCount: 1 });
  expect(state.snapshots[0].faultFlags).toContain('DEPTH_INSUFFICIENT');
});

test('rejects pose payloads that cannot fit the required replay budget without altering coordinates', () => {
  const exercise = getExerciseById('SQUAT');
  const required = new Set([...exercise.leftJoint, ...exercise.rightJoint, 11, 12, 23, 24]);
  const initial = createInitialRepState('SQUAT');
  for (const frame of buildRepTrajectory(exercise, 'SHALLOW')) {
    const oversized = { ...frame, landmarks: frame.landmarks.map((p, i) => required.has(i) ? p : {
      ...p, x: 123456789012345600000, y: -123456789012345600000, z: 123456789012345600000,
    }) };
    const step = advanceRepState(initial, oversized, exercise);
    expect(step.state).toBe(initial);
    expect(step.analysis).toMatchObject({ isVisible: false, faultFlags: ['LOW_VISIBILITY'] });
    expect(step.capturedSnapshots).toEqual([]);
  }
});

test('does not qualify a shallow rep from one isolated target-depth observation', () => {
  const exercise = getExerciseById('SQUAT');
  let state = createInitialRepState('SQUAT');
  for (const [i, angleDeg] of [170, 150, 135, 125, 125, 95, 125, 125, 140, 170, 170].entries()) {
    state = advanceRepState(state, buildPoseFrame(exercise, { angleDeg, timestampMs: i * 33 }), exercise).state;
  }
  expect(state).toMatchObject({ repCount: 1, faultedRepCount: 1 });
  expect(state.snapshots[0]).toMatchObject({ primaryAngleDeg: 125, faultFlags: ['DEPTH_INSUFFICIENT'], timestampMs: 99 });
});

test('captures the worst form frame when the astronaut holds the same inflection depth', () => {
  const exercise = getExerciseById('SQUAT');
  const frames = buildRepTrajectory(exercise).map((frame, i) => i === 6
    ? buildPoseFrame(exercise, { angleDeg: 95, trunkLeanDeg: 45, timestampMs: frame.timestampMs }) : frame);
  let state = createInitialRepState('SQUAT');
  for (const frame of frames) state = advanceRepState(state, frame, exercise).state;
  expect(state.snapshots[0]).toMatchObject({ timestampMs: 198, faultFlags: ['SPINE_MISALIGNED'] });
});

test('flags improper attempts, emits crew alerts, and captures compact detached 33-point inflection snapshots', () => {
  for (const [id, kind, flag, alert, expectedAngle] of [
    ['SQUAT', 'SHALLOW', 'DEPTH_INSUFFICIENT', 'Depth insufficient', 125],
    ['DEADLIFT', 'SPINE_FAULT', 'SPINE_MISALIGNED', 'Spine not aligned', 100],
    ['OVERHEAD_PRESS', 'SHALLOW', 'DEPTH_INSUFFICIENT', 'Depth insufficient', 129],
    ['BICEP_CURL', 'ASYMMETRIC', 'BILATERAL_ASYMMETRY', 'Left/Right imbalance', 69.25],
  ] as const) {
    const exercise = getExerciseById(id);
    const frames = buildRepTrajectory(exercise, kind, 1000);
    let state = createInitialRepState(id);
    let captures = 0;
    for (const frame of frames) {
      const step = advanceRepState(state, frame, exercise);
      state = step.state;
      captures += step.capturedSnapshots.length;
      if (state.phase === 'COMPLETED') expect(step.activeFaultAlerts).toContain(alert);
    }
    expect(state).toMatchObject({ repCount: 1, faultedRepCount: 1 });
    expect(state.formAccuracyPct).toBeLessThan(90);
    expect(state.faultFlags).toContain(flag);
    expect(captures).toBe(1);
    expect(state.snapshots).toHaveLength(1);
    const snapshot = state.snapshots[0];
    expect(snapshot).toMatchObject({ repNumber: 1, exerciseId: id, timestampMs: 1165 });
    expect(snapshot.primaryAngleDeg).toBeCloseTo(expectedAngle, 5);
    expect(snapshot.faultFlags).toContain(flag);
    expect(snapshot.landmarks).toHaveLength(33);
    expect(new TextEncoder().encode(JSON.stringify(snapshot)).length).toBeLessThanOrEqual(2048);
    expect(snapshot.landmarks).not.toBe(frames[5].landmarks);
    expect(snapshot.landmarks[0].x).toBeCloseTo(frames[5].landmarks[0].x, 3);
    expect(snapshot.landmarks[0].y).toBeCloseTo(frames[5].landmarks[0].y, 3);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    const original = structuredClone(state);
    const paused = advanceRepState(state, null, exercise);
    expect(paused.state).toBe(state);
    expect(paused.capturedSnapshots).toEqual([]);
    expect(state).toEqual(original);
    for (const frame of buildRepTrajectory(exercise, 'GOOD', 2000)) state = advanceRepState(state, frame, exercise).state;
    expect(state).toMatchObject({ repCount: 2, faultedRepCount: 1, formAccuracyPct: 50, faultFlags: [] });
    expect(state.snapshots).toHaveLength(1);
  }
});

test('a rep interrupted by a long observation gap is abandoned instead of completed from stale landmarks', () => {
  for (const id of ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL'] as const) {
    const exercise = getExerciseById(id);
    const rep = buildRepTrajectory(exercise);
    const rest = (timestampMs: number) => ({ ...rep[11], timestampMs });
    const hidden = (timestampMs: number) => ({ ...rep[11], timestampMs, landmarks: rep[11].landmarks.map(p => ({ ...p, visibility: 0 })) });
    // Descend partway, then no usable frames for longer than the gap limit, then standing again.
    let state = createInitialRepState(id);
    for (const frame of rep.slice(0, 5)) state = advanceRepState(state, frame, exercise).state;
    expect(state.phase).toBe('ECCENTRIC');
    for (let t = 200; t <= 200 + MAX_OBSERVATION_GAP_MS; t += 33) state = advanceRepState(state, hidden(t), exercise).state;
    for (let t = 300 + MAX_OBSERVATION_GAP_MS; t <= 500 + MAX_OBSERVATION_GAP_MS; t += 33) state = advanceRepState(state, rest(t), exercise).state;
    expect(state.repCount, `${id} leave/re-enter`).toBe(0);
    expect(state.phase).toBe('IDLE');
    // A paused session resumes with a time gap and no intermediate frames.
    state = createInitialRepState(id);
    for (const frame of rep.slice(0, 7)) state = advanceRepState(state, frame, exercise).state;
    for (let t = 5000; t <= 5200; t += 33) state = advanceRepState(state, rest(t), exercise).state;
    expect(state.repCount, `${id} resume gap`).toBe(0);
    // A complete, continuously observed rep still counts once afterwards.
    for (const frame of buildRepTrajectory(exercise, 'GOOD', 6000)) state = advanceRepState(state, frame, exercise).state;
    expect(state.repCount, `${id} continuous rep`).toBe(1);
  }
});

test('abandoning a rep in progress keeps completed reps and requires a fresh start position', () => {
  const exercise = getExerciseById('SQUAT');
  let state = createInitialRepState('SQUAT');
  for (const frame of buildRepTrajectory(exercise, 'SHALLOW')) state = advanceRepState(state, frame, exercise).state;
  for (const frame of buildRepTrajectory(exercise, 'GOOD', 1000).slice(0, 6)) state = advanceRepState(state, frame, exercise).state;
  expect(state.phase).not.toBe('IDLE');
  const abandoned = abandonRepInProgress(state);
  expect(abandoned).toMatchObject({ phase: 'IDLE', isArmed: false, repCount: 1, faultedRepCount: 1, snapshots: state.snapshots, lastTimestampMs: state.lastTimestampMs });
  let next = abandoned;
  // Finishing the old rep's second half from the bottom cannot count: the machine needs a fresh start position.
  for (const frame of buildRepTrajectory(exercise, 'GOOD', 1200).slice(6)) next = advanceRepState(next, frame, exercise).state;
  expect(next.repCount).toBe(1);
  for (const frame of buildRepTrajectory(exercise, 'GOOD', 2000)) next = advanceRepState(next, frame, exercise).state;
  expect(next.repCount).toBe(2);
});

// Live-camera realism: the pose model on a low-end laptop updates about 7 times per second, and a straight
// limb rarely reads as exactly straight.
const LIVE_FRAME_MS = 130;
const runAngles = (exerciseId: 'SQUAT' | 'DEADLIFT' | 'OVERHEAD_PRESS' | 'BICEP_CURL', angles: readonly number[], startMs = 0) => {
  const exercise = getExerciseById(exerciseId);
  let state = createInitialRepState(exerciseId);
  for (const [i, angleDeg] of angles.entries()) state = advanceRepState(state, buildPoseFrame(exercise, { angleDeg, timestampMs: startMs + i * LIVE_FRAME_MS }), exercise).state;
  return state;
};

test('counts full-depth reps when standing reads a few degrees short of straight and the turnaround is quick', () => {
  const squat = [158, 162, 156, 140, 115, 96, 93, 108, 130, 150, 157, 159];
  const state = runAngles('SQUAT', [...squat, ...squat, ...squat]);
  expect(state).toMatchObject({ repCount: 3, faultedRepCount: 0, formAccuracyPct: 100 });
});

test('counts every overhead press and curl rep at a live frame rate without a perfect return', () => {
  // Press: the bar comes back to about 95 degrees of elbow flexion rather than the configured 75.
  const press = [92, 96, 110, 135, 158, 163, 150, 125, 104, 95, 93];
  expect(runAngles('OVERHEAD_PRESS', [...press, ...press, ...press])).toMatchObject({ repCount: 3, faultedRepCount: 0 });
  // Curl: the arm lowers to about 140 degrees instead of locking out at 160.
  const curl = [142, 138, 115, 85, 58, 52, 70, 100, 128, 140, 143];
  expect(runAngles('BICEP_CURL', [...curl, ...curl, ...curl])).toMatchObject({ repCount: 3, faultedRepCount: 0 });
});

test('pose jitter around the start position never produces a rep', () => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const id of ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL'] as const) {
    const { startAngleDeg } = getExerciseById(id);
    const angles = Array.from({ length: 300 }, () => startAngleDeg + (random() - 0.5) * 30);
    expect(runAngles(id, angles).repCount, id).toBe(0);
  }
});

test('a half-hearted dip that returns to standing does not count, and the next real rep still does', () => {
  const state = runAngles('SQUAT', [168, 165, 150, 140, 138, 150, 165, 168, 150, 120, 96, 94, 120, 150, 166, 168]);
  expect(state).toMatchObject({ repCount: 1, faultedRepCount: 0 });
});

test('a shallow but real rep still counts and is flagged', () => {
  const state = runAngles('SQUAT', [168, 165, 145, 128, 124, 126, 145, 165, 168]);
  expect(state).toMatchObject({ repCount: 1, faultedRepCount: 1 });
  expect(state.snapshots[0].faultFlags).toContain('DEPTH_INSUFFICIENT');
});
