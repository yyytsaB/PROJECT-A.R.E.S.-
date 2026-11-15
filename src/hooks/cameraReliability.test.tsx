import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { CameraSetupError } from '../adapters/poseCameraAdapter';
import type { PoseSource, PoseSourceOptions } from '../adapters/poseCameraAdapter';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { buildPoseFrame, buildRepTrajectory } from '../core/kinematics/poseFixtures';
import type { RawPoseFrame } from '../core/types';
import { useWorkoutArena } from './useWorkoutArena';

// Controlled live source: tests decide when permission resolves and which frames the "camera" yields.
const camera = vi.hoisted(() => ({ calls: [] as { options: PoseSourceOptions; resolve(source: PoseSource): void; reject(error: unknown): void }[] }));
vi.mock('../adapters/poseCameraAdapter', async importOriginal => {
  const actual = await importOriginal<typeof import('../adapters/poseCameraAdapter')>();
  return { ...actual, createPoseSource: (options: PoseSourceOptions) => options.mode === 'SIMULATED' ? actual.createPoseSource(options)
    : new Promise<PoseSource>((resolve, reject) => { camera.calls.push({ options, resolve, reject }); }) };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div');
document.body.append(host);
let root = createRoot(host);
afterEach(async () => { await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host); camera.calls.length = 0; vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function liveSource(frames: RawPoseFrame[]) {
  const source = { close: vi.fn(), read: vi.fn((timestampMs: number) => { const frame = frames.shift(); return frame ? { ...frame, timestampMs } : null; }) };
  return source;
}
async function mount(onCompleted = vi.fn()) {
  const frames = new Map<number, FrameRequestCallback>(); let id = 0, now = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => { frames.delete(handle); });
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena({ onCompleted }); return <><video ref={arena.videoRef} /><canvas ref={arena.canvasRef} width={640} height={480} /></>; }
  await act(() => root.render(<Harness />));
  const step = async (count = 1) => { for (let i = 0; i < count; i++) await act(() => { const pending = [...frames.values()]; frames.clear(); now += 34; pending.forEach(callback => callback(now)); }); };
  return { get arena() { return arena; }, step, onCompleted };
}

test('a double click or Start during pending permission reuses one camera request and starts when it is ready', async () => {
  const view = await mount();
  await act(async () => { void view.arena.prepare('LIVE'); void view.arena.prepare('LIVE'); });
  expect(camera.calls).toHaveLength(1);
  expect(view.arena.sessionStatus).toBe('STARTING');
  await act(async () => { void view.arena.start('LIVE'); });
  expect(camera.calls).toHaveLength(1);
  await act(async () => camera.calls[0].resolve(liveSource([])));
  expect(view.arena.sessionStatus).toBe('RUNNING');
  expect(camera.calls).toHaveLength(1);
});

test('explains each camera failure honestly and keeps the simulation alternative', async () => {
  const view = await mount();
  for (const [kind, phrase] of [['PERMISSION_DENIED', 'permission'], ['NO_CAMERA', 'No camera'], ['CAMERA_BUSY', 'in use'], ['INSECURE_CONTEXT', 'HTTPS'],
    ['UNSUPPORTED', 'browser'], ['MODEL_FAILED', 'pose model'], ['UNKNOWN', 'Camera unavailable']] as const) {
    await act(async () => { void view.arena.prepare('LIVE'); });
    await act(async () => camera.calls.at(-1)!.reject(new CameraSetupError(kind, 'platform detail')));
    expect(view.arena.sessionStatus).toBe('ERROR');
    expect(view.arena.cameraFailure).toBe(kind);
    expect(view.arena.errorMessage).toContain(phrase);
    expect(view.arena.errorMessage).toContain('simulated rep');
  }
});

test('reports real preparation stages and a slow permission prompt without inventing progress', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  const view = await mount();
  await act(async () => { void view.arena.prepare('LIVE'); });
  await act(() => camera.calls[0].options.onStage?.('PERMISSION'));
  expect(view.arena.preparationStage).toBe('PERMISSION');
  await act(() => vi.advanceTimersByTime(8000));
  expect(view.arena.preparationStage).toBe('PERMISSION_SLOW');
  await act(() => camera.calls[0].options.onStage?.('MODEL'));
  expect(view.arena.preparationStage).toBe('MODEL');
  await act(async () => camera.calls[0].resolve(liveSource([])));
  expect(view.arena.sessionStatus).toBe('READY');
  expect(view.arena.preparationStage).toBeNull();
  expect(view.arena.elapsedSeconds).toBe(0);
});

test('a camera that disconnects mid-workout stops tracking, keeps completed reps and saves them exactly once', async () => {
  const exercise = getExerciseById('SQUAT');
  const view = await mount();
  await act(async () => { void view.arena.start('LIVE'); });
  const source = liveSource([...buildRepTrajectory(exercise)]);
  await act(async () => camera.calls[0].resolve(source));
  await view.step(14);
  expect(view.arena.state.repCount).toBe(1);
  await act(() => camera.calls[0].options.onInterrupted?.('TRACK_ENDED'));
  expect(view.arena.sessionStatus).toBe('ERROR');
  expect(view.arena.errorMessage).toContain('disconnected');
  expect(source.close).toHaveBeenCalled();
  expect(view.arena.canEndSession).toBe(true);
  await act(() => { view.arena.stop(); view.arena.stop(); });
  expect(view.onCompleted).toHaveBeenCalledOnce();
  expect(view.onCompleted).toHaveBeenCalledWith(expect.objectContaining({ repCount: 1 }), expect.any(Number));
});

test('no-person frames and pauses clear stale reassurance, give framing guidance and size the overlay to the source', async () => {
  const exercise = getExerciseById('SQUAT');
  const standing = buildPoseFrame(exercise, { width: 1280, height: 720 });
  const nobody = { ...standing, landmarks: standing.landmarks.map(() => ({ x: 0, y: 0, z: 0, visibility: 0 })) };
  const view = await mount();
  await act(async () => { void view.arena.prepare('LIVE'); });
  await act(async () => camera.calls[0].resolve(liveSource([standing, standing, nobody, nobody, standing, standing, standing])));
  await view.step(1);
  expect(view.arena.sessionStatus).toBe('READY');
  expect(view.arena.state.repCount).toBe(0);
  expect(view.arena.trackingGuidance).toBe('');
  expect((host.querySelector('canvas') as HTMLCanvasElement).width).toBe(1280);
  expect((host.querySelector('canvas') as HTMLCanvasElement).height).toBe(720);
  await act(async () => { await view.arena.start('LIVE'); });
  await view.step(1);
  expect(view.arena.formFeedback).toBe('Spine aligned');
  await view.step(1);
  expect(view.arena.formFeedback).toBe('');
  expect(view.arena.trackingGuidance).toContain('step into');
  await view.step(2);
  expect(view.arena.trackingGuidance).toBe('');
  expect(view.arena.formFeedback).toBe('Spine aligned');
  await act(() => view.arena.pause());
  expect(view.arena.formFeedback).toBe('');
});

test('leaving the camera view mid-rep for half a second abandons that rep, while a brief stall does not', async () => {
  const exercise = getExerciseById('SQUAT');
  const rep = [...buildRepTrajectory(exercise)];
  const nobody = { ...rep[0], landmarks: rep[0].landmarks.map(() => ({ x: 0, y: 0, z: 0, visibility: 0 })) };
  const view = await mount();
  await act(async () => { void view.arena.start('LIVE'); });
  // Reach the bottom of the squat, leave view for 20 frames (~680 ms), then come back standing.
  await act(async () => camera.calls[0].resolve(liveSource([...rep.slice(0, 7), ...Array.from({ length: 20 }, () => nobody), rep[11], rep[11], rep[11], rep[11]])));
  await view.step(30);
  expect(view.arena.state.repCount).toBe(0);
  // A single dropped detection mid-rep (well under the occlusion limit) does not cost a real rep.
  camera.calls.length = 0;
  await act(async () => { void view.arena.start('LIVE'); });
  await act(async () => camera.calls[0].resolve(liveSource([...rep.slice(0, 6), nobody, nobody, ...rep.slice(6), rep[11]])));
  await view.step(16);
  expect(view.arena.state.repCount).toBe(1);
});
