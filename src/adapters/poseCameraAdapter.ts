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
export type CameraPreparationStage = 'PERMISSION' | 'VIDEO' | 'MODEL';
export type CameraFailureKind = 'PERMISSION_DENIED' | 'NO_CAMERA' | 'CAMERA_BUSY' | 'INSECURE_CONTEXT' | 'UNSUPPORTED' | 'MODEL_FAILED' | 'UNKNOWN';
export type CameraInterruption = 'TRACK_ENDED';
export interface PoseSourceOptions {
  readonly mode: 'LIVE' | 'SIMULATED'; readonly video?: HTMLVideoElement;
  readonly frames?: readonly RawPoseFrame[]; readonly signal?: AbortSignal;
  /** Called as live preparation reaches each real step; there are no invented percentages. */
  readonly onStage?: (stage: CameraPreparationStage) => void;
  /** Called at most once if an opened camera stops delivering video (unplugged, permission revoked, taken by the OS). */
  readonly onInterrupted?: (reason: CameraInterruption) => void;
}
declare global { interface Window { __ARES_TEST_POSE_FRAMES__?: readonly RawPoseFrame[] } }

/** A camera or model setup failure carrying the most specific cause the platform exposed. */
export class CameraSetupError extends Error {
  override readonly name = 'CameraSetupError';
  constructor(readonly kind: CameraFailureKind, message: string, options?: { cause?: unknown }) { super(message, options); }
}
// getUserMedia DOMException names (plus legacy Chromium aliases). Anything else stays UNKNOWN rather than guessed.
const failureByErrorName: Readonly<Record<string, CameraFailureKind>> = {
  NotAllowedError: 'PERMISSION_DENIED', SecurityError: 'PERMISSION_DENIED', PermissionDeniedError: 'PERMISSION_DENIED',
  NotFoundError: 'NO_CAMERA', DevicesNotFoundError: 'NO_CAMERA', OverconstrainedError: 'NO_CAMERA',
  NotReadableError: 'CAMERA_BUSY', TrackStartError: 'CAMERA_BUSY', AbortError: 'CAMERA_BUSY',
};
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

export function generateSimulatedRepFrames(exerciseId: ExerciseId, kind: SimulatedRepKind): readonly RawPoseFrame[] {
  const exercise = getExerciseById(exerciseId);
  if (exercise.kind !== 'RESISTANCE') throw new RangeError('Pose simulation requires a resistance exercise');
  return buildRepTrajectory(exercise, kind);
}

export async function createPoseSource(options: PoseSourceOptions): Promise<PoseSource> {
  let closed = false;
  const cancelled = () => closed || Boolean(options.signal?.aborted);
  const assertActive = () => { if (cancelled()) throw new DOMException('Pose source cancelled', 'AbortError'); };
  assertActive();
  if (options.mode === 'SIMULATED') {
    const injected = typeof window !== 'undefined' ? window.__ARES_TEST_POSE_FRAMES__ : undefined;
    const queue = structuredClone([...(options.frames ?? injected ?? [])]);
    // Synthetic playback is one continuous observation: advance its clock by at most one ~30 Hz frame per read,
    // so main-thread stalls are not mistaken for the real-camera observation gaps the rep machine abandons.
    let clock: number | null = null;
    return {
      read(timestampMs) {
        const frame = closed ? undefined : queue.shift();
        if (!frame) return null;
        clock = clock === null ? timestampMs : Math.max(clock + 1, Math.min(timestampMs, clock + 34));
        return { ...frame, timestampMs: clock };
      },
      enqueue(frames) { if (!closed) queue.push(...structuredClone(frames)); },
      close() { closed = true; queue.length = 0; },
    };
  }
  const video = options.video;
  if (!video) throw new RangeError('Live pose source requires a video element');
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw typeof isSecureContext !== 'undefined' && !isSecureContext
      ? new CameraSetupError('INSECURE_CONTEXT', 'Camera access requires HTTPS or localhost.')
      : new CameraSetupError('UNSUPPORTED', 'This browser does not provide camera access.');
  }
  let stream: MediaStream | null = null;
  let landmarker: PoseLandmarker | null = null;
  let interrupted = false;
  const onTrackEnded = () => { if (closed || interrupted) return; interrupted = true; options.onInterrupted?.('TRACK_ENDED'); };
  // Some browsers pause a stream preview while the tab is hidden; resume it when the tab returns.
  const onVisibility = () => { if (!closed && stream && document.visibilityState === 'visible' && video.paused) void video.play().catch(() => {}); };
  const close = () => {
    closed = true;
    options.signal?.removeEventListener('abort', close);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    stream?.getTracks().forEach(track => track.removeEventListener?.('ended', onTrackEnded));
    if (stream && video.srcObject === stream) { video.pause(); video.srcObject = null; }
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    landmarker?.close(); landmarker = null;
  };
  options.signal?.addEventListener('abort', close, { once: true });
  try {
    options.onStage?.('PERMISSION');
    try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
    catch (error) {
      if (cancelled()) throw error;
      throw new CameraSetupError(failureByErrorName[error instanceof Error ? error.name : ''] ?? 'UNKNOWN', messageOf(error), { cause: error });
    }
    assertActive();
    stream.getTracks().forEach(track => track.addEventListener?.('ended', onTrackEnded));
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    options.onStage?.('VIDEO');
    video.srcObject = stream;
    await video.play(); assertActive();
    options.onStage?.('MODEL');
    try {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      assertActive();
      const base = import.meta.env.BASE_URL;
      const files = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
      assertActive();
      landmarker = await PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${base}mediapipe/pose_landmarker_lite.task`, delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false,
      });
    } catch (error) {
      if (cancelled()) throw error;
      throw new CameraSetupError('MODEL_FAILED', messageOf(error), { cause: error });
    }
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
