import { getExerciseById } from '../core/catalog/missionCatalog';
import { analyzeExerciseFrame, normalizePose33 } from '../core/kinematics/kinematicMath';
import type { FormFaultFlag, KinematicFrameAnalysis, KinematicSnapshot, PoseLandmark33, RawPoseFrame, ResistanceExerciseId } from '../core/types';

// MediaPipe Pose's standard 33-landmark topology, kept local so replay needs no ML runtime.
const bones = [[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
  [11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],
  [12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],
  [23,25],[24,26],[25,27],[26,28],[27,29],[28,30],[29,31],[30,32],[27,31],[28,32]] as const;
const visible = (p: PoseLandmark33 | undefined): p is PoseLandmark33 => !!p && [p.x, p.y, p.z, p.visibility].every(Number.isFinite) && p.visibility >= 0.5;

export function drawPoseWireframe(ctx: CanvasRenderingContext2D, frame: RawPoseFrame, analysis: KinematicFrameAnalysis, exerciseId: ResistanceExerciseId = 'SQUAT'): void {
  const { width, height } = ctx.canvas;
  // Strokes and labels scale with the bitmap so a native-resolution overlay stays legible on a projector.
  const unit = Math.max(1, Math.min(width, height) / 480);
  const scale = Math.min(width / frame.width, height / frame.height);
  const drawnWidth = frame.width * scale, drawnHeight = frame.height * scale;
  const offsetX = (width - drawnWidth) / 2, offsetY = (height - drawnHeight) / 2;
  const x = (p: PoseLandmark33) => offsetX + p.x * drawnWidth;
  const y = (p: PoseLandmark33) => offsetY + p.y * drawnHeight;
  const exercise = getExerciseById(exerciseId);
  const highlighted = new Set<number>();
  for (const flag of analysis.faultFlags) {
    const indices: Record<FormFaultFlag, readonly number[]> = {
      DEPTH_INSUFFICIENT: [exercise.leftJoint[1], exercise.rightJoint[1]],
      SPINE_MISALIGNED: [11, 12, 23, 24],
      BILATERAL_ASYMMETRY: [...exercise.leftJoint, ...exercise.rightJoint],
      LOW_VISIBILITY: [...exercise.leftJoint, ...exercise.rightJoint, 11, 12, 23, 24],
    };
    indices[flag].forEach(i => highlighted.add(i));
  }
  ctx.save();
  try {
    ctx.clearRect(0, 0, width, height);
    if (frame.landmarks.length !== 33) return;
    ctx.lineWidth = 3 * unit; ctx.lineCap = 'round';
    for (const [from, to] of bones) {
      const a = frame.landmarks[from], b = frame.landmarks[to];
      if (!visible(a) || !visible(b)) continue;
      ctx.strokeStyle = highlighted.has(from) || highlighted.has(to) ? '#c00' : '#bdebf2';
      ctx.beginPath(); ctx.moveTo(x(a), y(a)); ctx.lineTo(x(b), y(b)); ctx.stroke();
    }
    frame.landmarks.forEach((p, i) => {
      if (!visible(p)) return;
      ctx.fillStyle = highlighted.has(i) ? '#c00' : '#bdebf2';
      ctx.beginPath(); ctx.arc(x(p), y(p), 4 * unit, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#e4f3ff'; ctx.font = `600 ${Math.round(16 * unit)}px sans-serif`;
    for (const index of [exercise.leftJoint[1], exercise.rightJoint[1]]) {
      const p = frame.landmarks[index];
      if (visible(p)) ctx.fillText(`${Math.round(analysis.primaryAngleDeg)}°`, x(p) + 8 * unit, y(p));
    }
    ctx.fillText(`ROM ${Math.round(analysis.romPct)}% · Symmetry ${Math.round(analysis.symmetryScorePct)}%`, offsetX + 8 * unit, offsetY + 20 * unit);
  } finally { ctx.restore(); }
}

export function renderKinematicSnapshot(ctx: CanvasRenderingContext2D, snapshot: KinematicSnapshot): void {
  const exercise = getExerciseById(snapshot.exerciseId);
  if (exercise.kind !== 'RESISTANCE') throw new RangeError('Snapshot replay requires a resistance exercise');
  const frame = { landmarks: snapshot.landmarks, width: snapshot.frameWidth ?? ctx.canvas.width, height: snapshot.frameHeight ?? ctx.canvas.height, timestampMs: snapshot.timestampMs };
  let analysis: KinematicFrameAnalysis;
  try { analysis = analyzeExerciseFrame(normalizePose33(frame), exercise); }
  catch {
    ctx.save();
    try {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#e4f3ff'; ctx.font = '16px sans-serif';
      ctx.fillText('Pose unavailable: saved geometry cannot be replayed.', 8, 20);
    } finally { ctx.restore(); }
    return;
  }
  drawPoseWireframe(ctx, frame, { ...analysis, primaryAngleDeg: snapshot.primaryAngleDeg, symmetryScorePct: snapshot.symmetryScorePct, faultFlags: snapshot.faultFlags }, exercise.id);
}
