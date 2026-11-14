import type { PoseLandmark33, RawPoseFrame, ResistanceExerciseDefinition, SimulatedRepKind } from '../types';

export interface PoseFixtureOptions {
  readonly angleDeg?: number; readonly rightAngleDeg?: number; readonly trunkLeanDeg?: number;
  readonly timestampMs?: number; readonly width?: number; readonly height?: number;
}

/** Synthetic geometry for seam tests and camera-free demos, not a biomechanical model. */
export function buildPoseFrame(exercise: ResistanceExerciseDefinition, options: PoseFixtureOptions = {}): RawPoseFrame {
  const width = options.width ?? 640;
  const height = options.height ?? 480;
  const points: PoseLandmark33[] = Array.from({ length: 33 }, () => ({ x: 0, y: -1.3, z: 0, visibility: 1 }));
  points[11] = { x: -0.2, y: -1, z: 0, visibility: 1 };
  points[12] = { x: 0.2, y: -1, z: 0, visibility: 1 };
  points[23] = { x: -0.2, y: 0, z: 0, visibility: 1 };
  points[24] = { x: 0.2, y: 0, z: 0, visibility: 1 };
  for (const [joint, angle] of [
    [exercise.leftJoint, options.angleDeg ?? exercise.startAngleDeg],
    [exercise.rightJoint, options.rightAngleDeg ?? options.angleDeg ?? exercise.startAngleDeg],
  ] as const) {
    const [proximal, vertex, distal] = joint;
    // Keep torso anchors fixed for hip triplets; otherwise hang the joint below its proximal point.
    if (vertex !== 23 && vertex !== 24) points[vertex] = { ...points[proximal], y: points[proximal].y + 0.7 };
    const p = points[proximal];
    const v = points[vertex];
    const base = Math.atan2(p.y - v.y, p.x - v.x);
    const direction = base + angle * Math.PI / 180;
    points[distal] = { x: v.x + 0.7 * Math.cos(direction), y: v.y + 0.7 * Math.sin(direction), z: 0, visibility: 1 };
  }
  const lean = (options.trunkLeanDeg ?? 0) * Math.PI / 180;
  return {
    width, height, timestampMs: options.timestampMs ?? 0,
    landmarks: points.map(p => ({
      x: 0.5 + (p.x * Math.cos(lean) - p.y * Math.sin(lean)) / (5 * width / height),
      y: 0.45 + (p.x * Math.sin(lean) + p.y * Math.cos(lean)) / 5,
      z: p.z / (5 * width / height), visibility: p.visibility,
    })),
  };
}

export function buildRepTrajectory(exercise: ResistanceExerciseDefinition, kind: SimulatedRepKind = 'GOOD', startTimestampMs = 0): readonly RawPoseFrame[] {
  const excursion = exercise.targetAngleDeg - exercise.startAngleDeg;
  return [0, 0.08, 0.25, 0.45, 0.7, 1, 1, 0.75, 0.45, 0.15, 0, 0].map((progress, index) => {
    const depth = progress * (kind === 'SHALLOW' ? 0.6 : 1);
    return buildPoseFrame(exercise, {
      angleDeg: exercise.startAngleDeg + excursion * depth,
      rightAngleDeg: exercise.startAngleDeg + excursion * depth * (kind === 'ASYMMETRIC' ? 0.65 : 1),
      trunkLeanDeg: kind === 'SPINE_FAULT' && progress >= 0.45 ? exercise.maxTrunkLeanDeg + 10 : 0,
      timestampMs: startTimestampMs + index * 33,
    });
  });
}
