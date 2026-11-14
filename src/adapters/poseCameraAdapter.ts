import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { buildRepTrajectory } from '../core/kinematics/poseFixtures';
import type { ExerciseId, RawPoseFrame, SimulatedRepKind } from '../core/types';

export { drawPoseWireframe, renderKinematicSnapshot } from './poseCanvasRenderer';
export interface PoseSource {
  read(timestampMs: number): RawPoseFrame | null;
  enqueue?(frames: readonly RawPoseFrame[]): void;
  close(): void;
}
export interface PoseSourceOptions {
  readonly mode: 'LIVE' | 'SIMULATED'; readonly video?: HTMLVideoElement;
  readonly frames?: readonly RawPoseFrame[]; readonly signal?: AbortSignal;
}
declare global { interface Window { __ARES_TEST_POSE_FRAMES__?: readonly RawPoseFrame[] } }

export function generateSimulatedRepFrames(exerciseId: ExerciseId, kind: SimulatedRepKind): readonly RawPoseFrame[] {
  const exercise = getExerciseById(exerciseId);
  if (exercise.kind !== 'RESISTANCE') throw new RangeError('Pose simulation requires a resistance exercise');
  return buildRepTrajectory(exercise, kind);
}

export async function createPoseSource(options: PoseSourceOptions): Promise<PoseSource> {
  let closed = false;
  const assertActive = () => { if (closed || options.signal?.aborted) throw new DOMException('Pose source cancelled', 'AbortError'); };
  assertActive();
  if (options.mode === 'SIMULATED') {
    const injected = typeof window !== 'undefined' ? window.__ARES_TEST_POSE_FRAMES__ : undefined;
    const queue = structuredClone([...(options.frames ?? injected ?? [])]);
    return {
      read(timestampMs) { const frame = closed ? undefined : queue.shift(); return frame ? { ...frame, timestampMs } : null; },
      enqueue(frames) { if (!closed) queue.push(...structuredClone(frames)); },
      close() { closed = true; queue.length = 0; },
    };
  }
  const video = options.video;
  if (!video) throw new RangeError('Live pose source requires a video element');
  let stream: MediaStream | null = null;
  let landmarker: PoseLandmarker | null = null;
  const close = () => {
    closed = true;
    options.signal?.removeEventListener('abort', close);
    if (stream && video.srcObject === stream) { video.pause(); video.srcObject = null; }
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    landmarker?.close(); landmarker = null;
  };
  options.signal?.addEventListener('abort', close, { once: true });
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    assertActive();
    video.srcObject = stream;
    await video.play(); assertActive();
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    assertActive();
    const base = import.meta.env.BASE_URL;
    const files = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
    assertActive();
    landmarker = await PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${base}mediapipe/pose_landmarker_lite.task`, delegate: 'CPU' },
      runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false,
    });
    assertActive();
    let lastVideoTime = -1, lastTimestampMs = -1;
    return {
      read(timestampMs) {
        if (closed || !landmarker || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0 || video.currentTime === lastVideoTime || timestampMs <= lastTimestampMs) return null;
        lastVideoTime = video.currentTime; lastTimestampMs = timestampMs;
        const points = landmarker.detectForVideo(video, timestampMs).landmarks[0];
        return { width: video.videoWidth, height: video.videoHeight, timestampMs,
          landmarks: points?.length === 33
            ? points.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility }))
            : Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 })) };
      }, close,
    };
  } catch (error) { close(); throw error; }
}
