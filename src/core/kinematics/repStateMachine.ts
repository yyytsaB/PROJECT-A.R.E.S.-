import type { ExerciseDefinition, ExerciseId, FormFaultFlag, KinematicFrameAnalysis, KinematicSnapshot, RawPoseFrame, RepMachineState, RepMachineStepResult } from '../types';
import { analyzeExerciseFrame, normalizePose33 } from './kinematicMath';

const faultAlerts: Record<FormFaultFlag, string> = {
  DEPTH_INSUFFICIENT: 'Depth insufficient', SPINE_MISALIGNED: 'Spine not aligned',
  BILATERAL_ASYMMETRY: 'Left/Right imbalance', LOW_VISIBILITY: 'Pose visibility too low',
};

function buildSnapshot(frame: RawPoseFrame, analysis: KinematicFrameAnalysis, repNumber: number, exerciseId: ExerciseId, faultFlags: readonly FormFaultFlag[]): KinematicSnapshot {
  const round = (n: number) => Number(n.toFixed(3));
  return {
    repNumber, exerciseId, timestampMs: frame.timestampMs,
    primaryAngleDeg: round(analysis.primaryAngleDeg), symmetryScorePct: round(analysis.symmetryScorePct),
    faultFlags, landmarks: frame.landmarks.map(p => ({ x: round(p.x), y: round(p.y), z: round(p.z), visibility: round(p.visibility) })),
  };
}

export function createInitialRepState(exerciseId: ExerciseId): RepMachineState {
  return {
    exerciseId, phase: 'IDLE', repCount: 0, faultedRepCount: 0, formAccuracyPct: 100,
    snapshots: [], faultFlags: [], peakProgressDeg: 0, peakFrame: null, peakAnalysis: null,
    lastTimestampMs: null, departureFrames: 0, returnFrames: 0, isArmed: false,
    previousFrame: null, previousAnalysis: null, targetConfirmed: false,
  };
}

export function advanceRepState(state: RepMachineState, frame: RawPoseFrame | null, exercise: ExerciseDefinition): RepMachineStepResult {
  if (exercise.kind !== 'RESISTANCE' || exercise.id !== state.exerciseId) throw new RangeError('Rep state and resistance exercise must match');
  const result = (next: RepMachineState, analysis: KinematicFrameAnalysis | null = null, activeFaultAlerts = next.faultFlags.map(flag => faultAlerts[flag]), capturedSnapshots: readonly KinematicSnapshot[] = []): RepMachineStepResult => ({ state: next, analysis, activeFaultAlerts, capturedSnapshots });
  if (frame === null || (state.lastTimestampMs !== null && frame.timestampMs <= state.lastTimestampMs)) return result(state);
  let analysis: KinematicFrameAnalysis;
  try { analysis = analyzeExerciseFrame(normalizePose33(frame), exercise); }
  catch { return result(state, null, ['Pose unavailable']); }
  if (!analysis.isVisible) return result(state, analysis, ['Pose visibility too low']);
  // All snapshot strings are ASCII, so string length equals its UTF-8 byte count.
  // Reserve every possible fault label before accepting a replayable observation.
  const largestCapture = buildSnapshot(frame, analysis, state.repCount + 1, exercise.id, Object.keys(faultAlerts) as FormFaultFlag[]);
  if (JSON.stringify(largestCapture).length > 2048) return result(state, { ...analysis, isVisible: false, faultFlags: ['LOW_VISIBILITY'] }, ['Pose unavailable']);
  const direction = Math.sign(exercise.targetAngleDeg - exercise.startAngleDeg);
  const progress = direction * (analysis.primaryAngleDeg - exercise.startAngleDeg);
  const range = Math.abs(exercise.targetAngleDeg - exercise.startAngleDeg);
  const buffer = exercise.hysteresisDeg;
  let next = { ...state, lastTimestampMs: frame.timestampMs };
  if (next.phase === 'COMPLETED') {
    if (progress <= buffer + 1e-8) return result(next, analysis);
    next = { ...createInitialRepState(state.exerciseId), repCount: state.repCount, faultedRepCount: state.faultedRepCount, formAccuracyPct: state.formAccuracyPct, snapshots: state.snapshots, isArmed: true, lastTimestampMs: frame.timestampMs };
  }
  if (next.phase === 'IDLE') {
    if (progress <= buffer + 1e-8) return result({ ...next, isArmed: true, departureFrames: 0, peakProgressDeg: 0, peakFrame: null, peakAnalysis: null, previousFrame: null, previousAnalysis: null }, analysis);
    if (!next.isArmed) return result(next, analysis);
    next = { ...next, departureFrames: next.departureFrames + 1 };
    if (next.departureFrames < 2) return result(next, analysis);
    next = { ...next, phase: 'ECCENTRIC' };
  }
  // An adjacent observation within the configured angular buffer confirms an extreme.
  // An isolated depth spike therefore cannot qualify a shallow rep.
  const { previousFrame, previousAnalysis } = next;
  if (previousFrame && previousAnalysis && Math.abs(analysis.primaryAngleDeg - previousAnalysis.primaryAngleDeg) <= buffer + 1e-8) {
    const previousProgress = direction * (previousAnalysis.primaryAngleDeg - exercise.startAngleDeg);
    if (Math.min(progress, previousProgress) >= range - buffer - 1e-8) next = { ...next, targetConfirmed: true };
    for (const [candidateFrame, candidate] of [[previousFrame, previousAnalysis], [frame, analysis]] as const) {
      const candidateProgress = direction * (candidate.primaryAngleDeg - exercise.startAngleDeg);
      const previous = next.peakAnalysis;
      const worseForm = previous !== null && (candidate.faultFlags.length > previous.faultFlags.length ||
        (candidate.faultFlags.length === previous.faultFlags.length && (candidate.trunkLeanDeg > previous.trunkLeanDeg + 1e-8 || candidate.symmetryScorePct < previous.symmetryScorePct - 1e-8)));
      if (candidateProgress > next.peakProgressDeg + 1e-8 || (Math.abs(candidateProgress - next.peakProgressDeg) <= 1e-8 && worseForm)) {
        next = { ...next, peakProgressDeg: candidateProgress, peakFrame: structuredClone(candidateFrame), peakAnalysis: candidate };
      }
    }
  }
  next = { ...next, previousFrame: structuredClone(frame), previousAnalysis: analysis };
  // Depth is decided once at the inflection, rather than penalizing the journey down and up.
  next = { ...next, faultFlags: [...new Set([...next.faultFlags, ...analysis.faultFlags.filter(flag => flag !== 'DEPTH_INSUFFICIENT')])] };
  const reversing = next.peakProgressDeg - progress >= buffer - 1e-8;
  if (next.phase === 'ECCENTRIC' && (next.targetConfirmed || reversing)) next = { ...next, phase: 'INFLECTION' };
  else if (next.phase === 'INFLECTION' && reversing) next = { ...next, phase: 'CONCENTRIC' };
  if (next.phase === 'CONCENTRIC') {
    next = { ...next, returnFrames: progress <= buffer + 1e-8 ? next.returnFrames + 1 : 0 };
    if (next.returnFrames >= 2) {
      const faultFlags: readonly FormFaultFlag[] = !next.targetConfirmed
        ? ['DEPTH_INSUFFICIENT', ...next.faultFlags] : next.faultFlags;
      const repCount = next.repCount + 1;
      const faultedRepCount = next.faultedRepCount + (faultFlags.length > 0 ? 1 : 0);
      const capturedSnapshots: KinematicSnapshot[] = [];
      if (faultFlags.length > 0 && next.peakFrame && next.peakAnalysis) {
        capturedSnapshots.push(buildSnapshot(next.peakFrame, next.peakAnalysis, repCount, exercise.id, faultFlags));
      }
      next = { ...next, phase: 'COMPLETED', repCount, faultedRepCount, faultFlags,
        formAccuracyPct: 100 * (repCount - faultedRepCount) / repCount,
        snapshots: [...next.snapshots, ...capturedSnapshots] };
      return result(next, analysis, undefined, capturedSnapshots);
    }
  }
  return result(next, analysis);
}
