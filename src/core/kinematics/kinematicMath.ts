import type { ExerciseDefinition, FormFaultFlag, KinematicFrameAnalysis, KinematicSnapshot, NormalizedPose33, Point3D, PoseLandmark33, RawPoseFrame, ResistanceExerciseDefinition } from '../types';

export const faultAlerts: Readonly<Record<FormFaultFlag, string>> = {
  DEPTH_INSUFFICIENT: 'Depth insufficient', SPINE_MISALIGNED: 'Spine not aligned',
  BILATERAL_ASYMMETRY: 'Left/Right imbalance', LOW_VISIBILITY: 'Pose visibility too low',
};

export function describeSnapshotDiagnostic(snapshot: KinematicSnapshot, exercise: ResistanceExerciseDefinition): string {
  const direction = Math.sign(exercise.targetAngleDeg - exercise.startAngleDeg);
  const deficit = direction * (exercise.targetAngleDeg - snapshot.primaryAngleDeg);
  const angle = (value: number) => Number(value.toFixed(1));
  const target = deficit <= exercise.hysteresisDeg + 1e-8 ? 'Target reached' : `${angle(deficit)}° short of target`;
  const faults = snapshot.faultFlags.map(flag => faultAlerts[flag]).join(', ') || 'None';
  return `Estimated angle: ${angle(snapshot.primaryAngleDeg)}° · Configured target: ${angle(exercise.targetAngleDeg)}° · ${target} · Faults: ${faults}`;
}

const midpoint = (a: Point3D, b: Point3D): Point3D => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const length = (p: Point3D) => Math.hypot(p.x, p.y, p.z);
const subtract = (a: Point3D, b: Point3D): Point3D => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const finitePoint = (p: Point3D) => p && [p.x, p.y, p.z].every(Number.isFinite);

export function normalizePose33(raw: RawPoseFrame): NormalizedPose33 {
  if (!Number.isFinite(raw.width) || raw.width <= 0 || !Number.isFinite(raw.height) || raw.height <= 0 || !Number.isFinite(raw.timestampMs) || raw.timestampMs < 0 || raw.landmarks.length !== 33 || !Array.from(raw.landmarks).every(p => finitePoint(p) && Number.isFinite(p.visibility) && p.visibility >= 0 && p.visibility <= 1)) {
    throw new RangeError('Pose requires 33 finite landmarks, visibility in 0..1, positive dimensions and a nonnegative timestamp');
  }
  // MediaPipe image x and z use image width; y uses image height.
  const aspect = raw.width / raw.height;
  const points = raw.landmarks.map(p => ({ ...p, x: p.x * aspect, z: p.z * aspect }));
  const pelvis = midpoint(points[23], points[24]);
  const torso = length(subtract(midpoint(points[11], points[12]), pelvis));
  if (!Number.isFinite(torso) || torso <= 1e-10) throw new RangeError('Pose torso must have nonzero length');
  const landmarks: PoseLandmark33[] = points.map(p => ({
    x: (p.x - pelvis.x) / torso, y: (p.y - pelvis.y) / torso,
    z: (p.z - pelvis.z) / torso, visibility: p.visibility,
  }));
  return { landmarks, timestampMs: raw.timestampMs };
}

export function computeJointAngleDeg(a: Point3D, b: Point3D, c: Point3D): number {
  if (![a, b, c].every(finitePoint)) throw new RangeError('Joint points must be finite');
  const ab = subtract(a, b);
  const cb = subtract(c, b);
  const abLength = length(ab);
  const cbLength = length(cb);
  if (abLength <= 1e-10 || cbLength <= 1e-10 || !Number.isFinite(abLength) || !Number.isFinite(cbLength)) throw new RangeError('Joint segments must have nonzero finite length');
  const cosine = (ab.x / abLength) * (cb.x / cbLength) + (ab.y / abLength) * (cb.y / cbLength) + (ab.z / abLength) * (cb.z / cbLength);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

export function analyzeExerciseFrame(pose: NormalizedPose33, exercise: ExerciseDefinition): KinematicFrameAnalysis {
  if (exercise.kind !== 'RESISTANCE') throw new RangeError('Camera analysis requires a resistance exercise');
  const points = pose.landmarks;
  const unavailable: KinematicFrameAnalysis = {
    primaryAngleDeg: 0, leftAngleDeg: 0, rightAngleDeg: 0, romPct: 0,
    symmetryScorePct: 0, trunkLeanDeg: 0, faultFlags: ['LOW_VISIBILITY'], isVisible: false,
  };
  const required = new Set([...exercise.leftJoint, ...exercise.rightJoint, 11, 12, 23, 24]);
  if (points.length !== 33 || [...required].some(i => !finitePoint(points[i]) || !Number.isFinite(points[i].visibility) || points[i].visibility < 0.5)) return unavailable;
  const jointAngle = (joint: readonly [number, number, number]) => computeJointAngleDeg(points[joint[0]], points[joint[1]], points[joint[2]]);
  let leftAngleDeg: number, rightAngleDeg: number, trunkLeanDeg: number;
  try {
    leftAngleDeg = jointAngle(exercise.leftJoint);
    rightAngleDeg = jointAngle(exercise.rightJoint);
    const pelvis = midpoint(points[23], points[24]);
    trunkLeanDeg = computeJointAngleDeg(midpoint(points[11], points[12]), pelvis, { ...pelvis, y: pelvis.y - 1 });
  } catch { return unavailable; }
  const primaryAngleDeg = (leftAngleDeg + rightAngleDeg) / 2;
  const progress = (primaryAngleDeg - exercise.startAngleDeg) / (exercise.targetAngleDeg - exercise.startAngleDeg);
  const difference = Math.abs(leftAngleDeg - rightAngleDeg);
  const faultFlags: FormFaultFlag[] = [];
  if (Math.abs(exercise.targetAngleDeg - exercise.startAngleDeg) * (1 - progress) > exercise.hysteresisDeg + 1e-8) faultFlags.push('DEPTH_INSUFFICIENT');
  if (trunkLeanDeg > exercise.maxTrunkLeanDeg + 1e-8) faultFlags.push('SPINE_MISALIGNED');
  if (difference > exercise.symmetryToleranceDeg + 1e-8) faultFlags.push('BILATERAL_ASYMMETRY');
  return {
    primaryAngleDeg, leftAngleDeg, rightAngleDeg, romPct: Math.max(0, Math.min(100, progress * 100)),
    symmetryScorePct: Math.max(0, 100 * (1 - difference / 180)), trunkLeanDeg, faultFlags, isVisible: true,
  };
}
