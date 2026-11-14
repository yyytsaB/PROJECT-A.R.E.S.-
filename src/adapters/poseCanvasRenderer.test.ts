import { expect, test, vi } from 'vitest';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { analyzeExerciseFrame, normalizePose33 } from '../core/kinematics/kinematicMath';
import { buildPoseFrame } from '../core/kinematics/poseFixtures';
import { drawPoseWireframe, renderKinematicSnapshot } from './poseCanvasRenderer';

test('clears stale drawings and explains unreplayable legacy geometry without crashing', () => {
  const ctx = { canvas: { width: 640, height: 480 }, save: vi.fn(), restore: vi.fn(), clearRect: vi.fn(), fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const snapshot = { exerciseId: 'SQUAT' as const, repNumber: 1, timestampMs: 165, primaryAngleDeg: 125, symmetryScorePct: 90,
    faultFlags: ['DEPTH_INSUFFICIENT' as const], landmarks: Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 })) };
  expect(() => renderKinematicSnapshot(ctx, snapshot)).not.toThrow();
  expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
  expect(ctx.fillText).toHaveBeenCalledWith('Pose unavailable: saved geometry cannot be replayed.', 8, 20);
  expect(ctx.save).toHaveBeenCalledOnce();
  expect(ctx.restore).toHaveBeenCalledOnce();
});

test('draws the 33-point skeleton, angle/ROM HUD, and red fault joints in live and replay canvases', () => {
  const marks: { x: number; y: number; color: unknown }[] = [];
  const strokes: unknown[] = [];
  const ctx = {
    canvas: { width: 640, height: 480 }, strokeStyle: '', fillStyle: '',
    save: vi.fn(), restore: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), fill: vi.fn(), fillText: vi.fn(),
    arc: vi.fn((x: number, y: number) => marks.push({ x, y, color: ctx.fillStyle })),
    stroke: vi.fn(() => strokes.push(ctx.strokeStyle)),
  } as unknown as CanvasRenderingContext2D;
  const exercise = getExerciseById('SQUAT');
  const frame = buildPoseFrame(exercise, { angleDeg: 95 });
  const analysis = analyzeExerciseFrame(normalizePose33(frame), exercise);
  drawPoseWireframe(ctx, frame, analysis, 'SQUAT');
  expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
  expect(marks).toHaveLength(33);
  expect(ctx.lineTo).toHaveBeenCalledTimes(35);
  expect(ctx.fillText).toHaveBeenCalledWith('95°', expect.any(Number), expect.any(Number));
  expect(ctx.fillText).toHaveBeenCalledWith('ROM 100% · Symmetry 100%', expect.any(Number), expect.any(Number));
  expect(strokes).not.toContain('#c00');
  marks.length = 0;
  renderKinematicSnapshot(ctx, { exerciseId: 'SQUAT', repNumber: 1, timestampMs: 165,
    landmarks: frame.landmarks, faultFlags: ['DEPTH_INSUFFICIENT'], primaryAngleDeg: 125, symmetryScorePct: 100 });
  expect(marks).toHaveLength(33);
  expect(marks.filter(p => p.color === '#c00')).toEqual([
    { x: frame.landmarks[25].x * 640, y: frame.landmarks[25].y * 480, color: '#c00' },
    { x: frame.landmarks[26].x * 640, y: frame.landmarks[26].y * 480, color: '#c00' },
  ]);
  expect(strokes).toContain('#c00');
  expect(ctx.fillText).toHaveBeenCalledWith('125°', expect.any(Number), expect.any(Number));
  expect(ctx.save).toHaveBeenCalledTimes(2);
  expect(ctx.restore).toHaveBeenCalledTimes(2);
});

test('preserves a widescreen pose aspect ratio in both live drawing and stored replay', () => {
  const marks: number[][] = [];
  const ctx = { canvas: { width: 640, height: 480 }, save() {}, restore() {}, clearRect() {}, beginPath() {},
    moveTo() {}, lineTo() {}, stroke() {}, fill() {}, fillText() {}, arc(x: number, y: number) { marks.push([x, y]); },
  } as unknown as CanvasRenderingContext2D;
  const exercise = getExerciseById('SQUAT');
  const original = buildPoseFrame(exercise, { width: 1280, height: 720, angleDeg: 125 });
  const landmarks = original.landmarks.map((p, i) => i === 0 ? { ...p, x: 0, y: 0 } : i === 1 ? { ...p, x: 1, y: 1 } : p);
  const frame = { ...original, landmarks };
  const analysis = analyzeExerciseFrame(normalizePose33(frame), exercise);
  drawPoseWireframe(ctx, frame, analysis, 'SQUAT');
  expect(marks.slice(0, 2)).toEqual([[0, 60], [640, 420]]);
  marks.length = 0;
  const snapshot = { exerciseId: 'SQUAT' as const, repNumber: 1, timestampMs: 0, frameWidth: 1280, frameHeight: 720,
    landmarks, faultFlags: analysis.faultFlags, primaryAngleDeg: 125, symmetryScorePct: 100 };
  renderKinematicSnapshot(ctx, snapshot);
  expect(marks.slice(0, 2)).toEqual([[0, 60], [640, 420]]);
});
