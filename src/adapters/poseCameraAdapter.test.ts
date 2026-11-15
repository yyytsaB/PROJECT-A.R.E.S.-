import { afterEach, expect, test, vi } from 'vitest';
import { advanceRepState, createInitialRepState } from '../core/kinematics/repStateMachine';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { createPoseSource, generateSimulatedRepFrames } from './poseCameraAdapter';

const sdk = vi.hoisted(() => ({ loaded: vi.fn(), resolve: vi.fn(async () => ({})), create: vi.fn(), detect: vi.fn(), close: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => {
  sdk.loaded();
  return { FilesetResolver: { forVisionTasks: sdk.resolve }, PoseLandmarker: { createFromOptions: sdk.create } };
});

test('cleans up failed and cancelled camera startup, including resources resolving after cancellation', async () => {
  const stop = vi.fn();
  let resolveStream!: (stream: MediaStream) => void;
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const video = { srcObject: null, play: vi.fn(async () => {}), pause: vi.fn() } as unknown as HTMLVideoElement;
  const getUserMedia = vi.fn().mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValueOnce(stream)
    .mockImplementationOnce(() => new Promise<MediaStream>(resolve => { resolveStream = resolve; }));
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  await expect(createPoseSource({ mode: 'LIVE', video })).rejects.toThrow('Permission denied');
  sdk.create.mockRejectedValueOnce(new Error('Model unavailable'));
  await expect(createPoseSource({ mode: 'LIVE', video })).rejects.toThrow('Model unavailable');
  expect(stop).toHaveBeenCalledTimes(1);
  expect(video.srcObject).toBeNull();
  const abort = new AbortController();
  const pending = createPoseSource({ mode: 'LIVE', video, signal: abort.signal });
  abort.abort(); resolveStream(stream);
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(stop).toHaveBeenCalledTimes(2);
  expect(video.srcObject).toBeNull();
  await expect(createPoseSource({ mode: 'LIVE', video, signal: abort.signal })).rejects.toMatchObject({ name: 'AbortError' });
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

test('simulates all four exercises deterministically and opens a lazy, local, safely closable camera source', async () => {
  const loadedBeforeSimulation = sdk.loaded.mock.calls.length;
  for (const id of ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL'] as const) {
    const exercise = getExerciseById(id);
    for (const kind of ['GOOD', 'SHALLOW', 'SPINE_FAULT'] as const) {
      const frames = generateSimulatedRepFrames(id, kind);
      expect(frames).toEqual(generateSimulatedRepFrames(id, kind));
      expect(frames.every((f, i) => f.landmarks.length === 33 && (i === 0 || f.timestampMs > frames[i - 1].timestampMs))).toBe(true);
      const source = await createPoseSource({ mode: 'SIMULATED', frames });
      let state = createInitialRepState(id);
      for (let i = 0; i < frames.length; i++) state = advanceRepState(state, source.read(1000 + i * 33), exercise).state;
      expect(state.repCount).toBe(1);
      expect(state.snapshots).toHaveLength(kind === 'GOOD' ? 0 : 1);
      if (kind !== 'GOOD') expect(state.snapshots[0].faultFlags).toContain(kind === 'SHALLOW' ? 'DEPTH_INSUFFICIENT' : 'SPINE_MISALIGNED');
      expect(source.read(2000)).toBeNull();
      source.close();
    }
  }
  expect(sdk.loaded.mock.calls.length).toBe(loadedBeforeSimulation);
  expect(sdk.create).not.toHaveBeenCalled();
  expect(() => generateSimulatedRepFrames('ROWING', 'GOOD')).toThrow(RangeError);
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  const getUserMedia = vi.fn(async () => stream);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  const video = { srcObject: null, play: vi.fn(async () => {}), pause: vi.fn(), readyState: 2, currentTime: 1, videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;
  sdk.create.mockResolvedValue({ detectForVideo: sdk.detect, close: sdk.close });
  const landmarks = generateSimulatedRepFrames('SQUAT', 'GOOD')[0].landmarks;
  sdk.detect.mockReturnValue({ landmarks: [landmarks] });
  const live = await createPoseSource({ mode: 'LIVE', video });
  expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
  expect(sdk.create).toHaveBeenCalledOnce();
  expect(sdk.resolve).toHaveBeenCalledWith('/mediapipe/wasm');
  expect(sdk.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ runningMode: 'VIDEO', baseOptions: expect.objectContaining({ modelAssetPath: '/mediapipe/pose_landmarker_lite.task' }) }));
  expect(live.read(3000)).toEqual({ width: 640, height: 480, timestampMs: 3000, landmarks });
  expect(live.read(3033)).toBeNull(); // Do not analyze the same decoded video frame twice.
  live.close(); live.close();
  expect(stop).toHaveBeenCalledOnce();
  expect(sdk.close).toHaveBeenCalledOnce();
  expect(video.srcObject).toBeNull();
  expect(live.read(4000)).toBeNull();
});

test('classifies camera setup failures from the platform error instead of reporting one generic cause', async () => {
  const video = { srcObject: null, play: vi.fn(async () => {}), pause: vi.fn() } as unknown as HTMLVideoElement;
  const failWith = (name: string) => vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new DOMException('platform message', name)) } });
  for (const [name, kind] of [['NotAllowedError', 'PERMISSION_DENIED'], ['SecurityError', 'PERMISSION_DENIED'], ['NotFoundError', 'NO_CAMERA'], ['OverconstrainedError', 'NO_CAMERA'],
    ['NotReadableError', 'CAMERA_BUSY'], ['AbortError', 'CAMERA_BUSY'], ['TypeError', 'UNKNOWN']] as const) {
    failWith(name);
    await expect(createPoseSource({ mode: 'LIVE', video }), name).rejects.toMatchObject({ name: 'CameraSetupError', kind });
  }
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('isSecureContext', false);
  await expect(createPoseSource({ mode: 'LIVE', video })).rejects.toMatchObject({ kind: 'INSECURE_CONTEXT' });
  vi.stubGlobal('isSecureContext', true);
  await expect(createPoseSource({ mode: 'LIVE', video })).rejects.toMatchObject({ kind: 'UNSUPPORTED' });
  const stop = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop, addEventListener: vi.fn() }] })) } });
  sdk.create.mockRejectedValueOnce(new Error('wasm fetch failed'));
  await expect(createPoseSource({ mode: 'LIVE', video })).rejects.toMatchObject({ kind: 'MODEL_FAILED' });
  expect(stop).toHaveBeenCalledOnce();
});

test('reports honest preparation stages and a mid-session camera interruption once', async () => {
  const listeners: Record<string, () => void> = {};
  const track = { stop: vi.fn(), addEventListener: vi.fn((type: string, listener: () => void) => { listeners[type] = listener; }), removeEventListener: vi.fn() };
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) } });
  sdk.create.mockResolvedValue({ detectForVideo: sdk.detect, close: sdk.close });
  const video = { srcObject: null, play: vi.fn(async () => {}), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as HTMLVideoElement;
  const stages: string[] = [], interruptions: string[] = [];
  const source = await createPoseSource({ mode: 'LIVE', video, onStage: stage => stages.push(stage), onInterrupted: reason => interruptions.push(reason) });
  expect(stages).toEqual(['PERMISSION', 'VIDEO', 'MODEL']);
  listeners.ended(); listeners.ended();
  expect(interruptions).toEqual(['TRACK_ENDED']);
  source.close();
  expect(track.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
});

test('simulated playback stays one continuous observation even when the scheduler stalls between frames', async () => {
  const exercise = getExerciseById('SQUAT');
  const source = await createPoseSource({ mode: 'SIMULATED', frames: generateSimulatedRepFrames('SQUAT', 'GOOD') });
  let state = createInitialRepState('SQUAT'), tick = 1000, previous = -Infinity;
  for (let i = 0; i < 12; i++) {
    tick += i === 5 ? 2500 : 34; // a 2.5 s main-thread stall mid-rep
    const frame = source.read(tick)!;
    expect(frame.timestampMs).toBeGreaterThan(previous);
    expect(frame.timestampMs - (previous === -Infinity ? frame.timestampMs : previous)).toBeLessThanOrEqual(34);
    previous = frame.timestampMs;
    state = advanceRepState(state, frame, exercise).state;
  }
  expect(state.repCount).toBe(1);
});
