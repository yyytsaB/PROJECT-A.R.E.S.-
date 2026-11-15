import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { CameraSetupError, createPoseSource, generateSimulatedRepFrames } from '../adapters/poseCameraAdapter';
import type { CameraFailureKind, CameraPreparationStage, PoseSource } from '../adapters/poseCameraAdapter';
import { drawPoseWireframe } from '../adapters/poseCanvasRenderer';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { analyzeExerciseFrame, normalizePose33 } from '../core/kinematics/kinematicMath';
import { advanceRepState, createInitialRepState } from '../core/kinematics/repStateMachine';
import type { KinematicFrameAnalysis, RawPoseFrame, RepMachineState, ResistanceExerciseId, SimulatedRepKind, UseWorkoutArenaOptions, WorkoutArenaController as CoreController } from '../core/types';
import { useVoiceCoach } from './useVoiceCoach';

type SessionStatus = 'IDLE' | 'STARTING' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
/** WAITING: no camera frame analysed yet; NO_PERSON: frame without a usable body; PARTIAL: body found but required joints not visible. */
type TrackingState = 'WAITING' | 'NO_PERSON' | 'PARTIAL' | 'TRACKING';
export type PreparationStage = CameraPreparationStage | 'PERMISSION_SLOW';
interface ArenaView {
  readonly state: RepMachineState; readonly analysis: KinematicFrameAnalysis | null; readonly activeFaultAlerts: readonly string[];
  readonly sessionStatus: SessionStatus; readonly errorMessage: string | null; readonly maxRomPct: number;
  readonly mode: 'LIVE' | 'SIMULATED' | null;
  readonly cameraFailure: CameraFailureKind | null; readonly preparationStage: PreparationStage | null; readonly trackingState: TrackingState;
}
export interface WorkoutArenaController extends CoreController, ArenaView {
  readonly canConfigureLoad: boolean;
  readonly canEndSession: boolean;
  readonly elapsedSeconds: number; readonly formFeedback: string;
  /** Plain-language framing help when the camera cannot see the body or the joints this exercise needs. */
  readonly trackingGuidance: string;
  readonly voiceEnabled: boolean; readonly visualOverlayEnabled: boolean;
  setVoiceEnabled(enabled: boolean): void; setVisualOverlayEnabled(enabled: boolean): void;
  readonly voiceCoachEnabled: boolean; readonly voiceCoachStatus: string;
  setVoiceCoachEnabled(enabled: boolean): void;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>; readonly videoRef: RefObject<HTMLVideoElement | null>;
  prepare(mode: 'LIVE' | 'SIMULATED'): Promise<void>;
  selectExercise(id: ResistanceExerciseId): void;
  stop(): RepMachineState;
}

const SIMULATION_HINT = 'or use a simulated rep to continue.';
const failureMessages: Readonly<Record<CameraFailureKind, string>> = {
  PERMISSION_DENIED: `Camera permission was blocked. Allow camera access for this site in the browser's address bar and select Enable camera again, ${SIMULATION_HINT}`,
  NO_CAMERA: `No camera was found. Connect a webcam and select Enable camera again, ${SIMULATION_HINT}`,
  CAMERA_BUSY: `The camera is in use by another app or tab, or could not start. Close it there and select Enable camera again, ${SIMULATION_HINT}`,
  INSECURE_CONTEXT: `Camera access needs a secure page (HTTPS or localhost). Open the secure address, ${SIMULATION_HINT}`,
  UNSUPPORTED: `This browser does not support camera access. Try a current Chrome, Edge or Firefox, ${SIMULATION_HINT}`,
  MODEL_FAILED: `The camera started, but the local pose model could not load. Reload the page and select Enable camera again, ${SIMULATION_HINT}`,
  UNKNOWN: 'Camera unavailable. Use a simulated rep to continue.',
};
const DISCONNECTED_MESSAGE = 'The camera disconnected or stopped sending video. Completed reps are kept: End session to save them, select Enable camera to reconnect, or use a simulated rep to continue.';
const landmarkGroups: Readonly<Record<number, string>> = { 11: 'shoulders', 12: 'shoulders', 13: 'elbows', 14: 'elbows', 15: 'wrists', 16: 'wrists', 23: 'hips', 24: 'hips', 25: 'knees', 26: 'knees', 27: 'ankles', 28: 'ankles' };
function requiredJoints(id: ResistanceExerciseId) {
  const exercise = getExerciseById(id);
  const names = exercise.kind === 'RESISTANCE' ? [...new Set(exercise.leftJoint.map(index => landmarkGroups[index]).filter(Boolean))] : [];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? 'body';
}
const trackingStateOf = (analysis: KinematicFrameAnalysis | null): TrackingState => analysis === null ? 'NO_PERSON' : analysis.isVisible ? 'TRACKING' : 'PARTIAL';

export function useWorkoutArena(options: UseWorkoutArenaOptions = {}): WorkoutArenaController {
  const voiceCoach = useVoiceCoach();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [visualOverlayEnabled, setVisualOverlay] = useState(true);
  const overlay = useRef(true);
  const elapsedMs = useRef(0);
  const runningSince = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowPermission = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stopTimer() {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    if (runningSince.current !== null) elapsedMs.current += Math.max(0, Date.now() - runningSince.current);
    runningSince.current = null;
    setElapsedSeconds(Math.floor(elapsedMs.current / 1000));
  }
  function startTimer() {
    runningSince.current = Date.now();
    timer.current = setInterval(() => setElapsedSeconds(Math.floor((elapsedMs.current + Math.max(0, Date.now() - runningSince.current!)) / 1000)), 1000);
  }
  function resetTimer() { elapsedMs.current = 0; setElapsedSeconds(0); }
  function setVisualOverlayEnabled(enabled: boolean) {
    overlay.current = enabled; setVisualOverlay(enabled);
    if (!enabled) { const canvas = canvasRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); }
  }
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef(options); callbacks.current = options;
  const idleView = (exerciseId: ResistanceExerciseId | RepMachineState['exerciseId']): ArenaView => ({ state: createInitialRepState(exerciseId), analysis: null,
    activeFaultAlerts: [], sessionStatus: 'IDLE', errorMessage: null, maxRomPct: 0, mode: null, cameraFailure: null, preparationStage: null, trackingState: 'WAITING' });
  const current = useRef<ArenaView>(idleView(options.exerciseId ?? 'SQUAT'));
  const [view, setView] = useState(current.current);
  const source = useRef<PoseSource | null>(null);
  const abort = useRef<AbortController | null>(null);
  const animation = useRef<number | null>(null);
  const generation = useRef(0);
  const preparingOnly = useRef(false);
  const runWhenReady = useRef(false);
  const pending = useRef<Promise<void> | null>(null);
  const lastTick = useRef(-Infinity);
  const publish = () => setView({ ...current.current });
  const update = (patch: Partial<ArenaView>) => { current.current = { ...current.current, ...patch }; publish(); };
  const cancelAnimation = () => { if (animation.current !== null) cancelAnimationFrame(animation.current); animation.current = null; };
  const clearSlowPermission = () => { if (slowPermission.current !== null) clearTimeout(slowPermission.current); slowPermission.current = null; };
  const dispose = () => {
    preparingOnly.current = false; runWhenReady.current = false; pending.current = null;
    stopTimer(); clearSlowPermission();
    voiceCoach.cancelSpeech();
    generation.current++;
    cancelAnimation(); abort.current?.abort(); abort.current = null;
    source.current?.close(); source.current = null;
  };
  /** Match the overlay bitmap to the camera frame so it letterboxes exactly like the object-fit: contain video. */
  function fitCanvas(frame: RawPoseFrame) {
    const canvas = canvasRef.current;
    if (canvas && (canvas.width !== frame.width || canvas.height !== frame.height)) { canvas.width = frame.width; canvas.height = frame.height; }
    return canvas?.getContext('2d') ?? null;
  }
  function draw(frame: RawPoseFrame, analysis: KinematicFrameAnalysis | null, exerciseId: RepMachineState['exerciseId']) {
    const exercise = getExerciseById(exerciseId);
    const ctx = fitCanvas(frame);
    if (!overlay.current || !ctx) return;
    if (analysis && exercise.kind === 'RESISTANCE') drawPoseWireframe(ctx, frame, analysis, exercise.id);
    else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  /** READY preview: show the skeleton and framing help on the prepared camera without counting reps or timing. */
  function previewTick(timestampMs: number) {
    animation.current = null;
    if (current.current.sessionStatus !== 'READY' || current.current.mode !== 'LIVE') return;
    if (timestampMs - lastTick.current >= 33) {
      lastTick.current = timestampMs;
      const frame = source.current?.read(timestampMs);
      if (frame) {
        const exercise = getExerciseById(current.current.state.exerciseId);
        let analysis: KinematicFrameAnalysis | null = null;
        try { if (exercise.kind === 'RESISTANCE') analysis = analyzeExerciseFrame(normalizePose33(frame), exercise); } catch { analysis = null; }
        draw(frame, analysis, exercise.id);
        const trackingState = trackingStateOf(analysis);
        const changed = trackingState !== current.current.trackingState;
        current.current = { ...current.current, analysis, trackingState };
        if (changed) publish();
      }
    }
    animation.current = requestAnimationFrame(previewTick);
  }
  function tick(timestampMs: number) {
    animation.current = null;
    if (current.current.sessionStatus !== 'RUNNING') return;
    try {
      if (timestampMs - lastTick.current >= 33) {
        lastTick.current = timestampMs;
        const frame = source.current?.read(timestampMs);
        if (frame) {
          const before = current.current;
          const exercise = getExerciseById(before.state.exerciseId);
          const step = advanceRepState(before.state, frame, exercise);
          const messages = step.activeFaultAlerts.filter(alert => !before.activeFaultAlerts.includes(alert)).map(alert => `Warning: ${alert}`);
          const hasNewFault = messages.length > 0;
          if (step.state.repCount > before.state.repCount) {
            const symmetry = step.state.peakAnalysis?.symmetryScorePct;
            messages.push(`Rep ${step.state.repCount} complete${symmetry === undefined ? '' : ` — ${Math.round(symmetry)} percent symmetry`}`);
          }
          if (messages.length) voiceCoach.speak(messages.join('. '), hasNewFault);
          draw(frame, step.analysis, exercise.id);
          const trackingState = trackingStateOf(step.analysis);
          current.current = { ...before, state: step.state, analysis: step.analysis, trackingState,
            activeFaultAlerts: step.activeFaultAlerts, maxRomPct: Math.max(before.maxRomPct, step.analysis?.romPct ?? 0) };
          if (before.trackingState !== trackingState || before.state.phase !== step.state.phase || before.state.repCount !== step.state.repCount ||
            before.state.faultFlags.join() !== step.state.faultFlags.join() || before.activeFaultAlerts.join() !== step.activeFaultAlerts.join()) publish();
        }
      }
      animation.current = requestAnimationFrame(tick);
    } catch {
      dispose(); update({ sessionStatus: 'ERROR', errorMessage: 'Camera tracking stopped. Use a simulated rep to continue.', preparationStage: null });
    }
  }
  function openFeed(mode: 'LIVE' | 'SIMULATED', runImmediately: boolean): Promise<void> {
    // A second click while the same feed is still being prepared reuses that request instead of opening another stream.
    if (current.current.sessionStatus === 'STARTING' && current.current.mode === mode && pending.current) {
      if (runImmediately) { runWhenReady.current = true; preparingOnly.current = false; }
      return pending.current;
    }
    finishPendingReps();
    dispose();
    resetTimer();
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    preparingOnly.current = !runImmediately;
    runWhenReady.current = runImmediately;
    const version = generation.current;
    abort.current = new AbortController();
    current.current = { ...idleView(current.current.state.exerciseId), sessionStatus: 'STARTING', mode };
    publish();
    const onStage = (stage: CameraPreparationStage) => {
      if (version !== generation.current) return;
      clearSlowPermission();
      // Browsers give no signal for an unanswered prompt; after a while, point the user at it instead of spinning silently.
      if (stage === 'PERMISSION') slowPermission.current = setTimeout(() => { if (version === generation.current && current.current.preparationStage === 'PERMISSION') update({ preparationStage: 'PERMISSION_SLOW' }); }, 8000);
      update({ preparationStage: stage });
    };
    const onInterrupted = () => {
      if (version !== generation.current) return;
      dispose(); update({ sessionStatus: 'ERROR', errorMessage: DISCONNECTED_MESSAGE, cameraFailure: null, preparationStage: null, analysis: null, trackingState: 'WAITING' });
    };
    const operation = (async () => {
      try {
        const opened = await createPoseSource({ mode, video: videoRef.current ?? undefined, signal: abort.current!.signal, onStage, onInterrupted });
        if (version !== generation.current) { opened.close(); return; }
        source.current = opened; pending.current = null; clearSlowPermission();
        if (runWhenReady.current) beginRun();
        else {
          update({ sessionStatus: 'READY', preparationStage: null });
          lastTick.current = -Infinity;
          if (mode === 'LIVE') animation.current = requestAnimationFrame(previewTick);
        }
      } catch (error) {
        if (version !== generation.current) return;
        const kind = error instanceof CameraSetupError ? error.kind : 'UNKNOWN';
        dispose(); update({ sessionStatus: 'ERROR', errorMessage: failureMessages[kind], cameraFailure: kind, preparationStage: null });
      }
    })();
    pending.current = operation;
    return operation;
  }
  function beginRun() {
    preparingOnly.current = false; runWhenReady.current = false;
    cancelAnimation();
    current.current = { ...current.current, sessionStatus: 'RUNNING', preparationStage: null }; lastTick.current = -Infinity;
    startTimer(); publish(); animation.current = requestAnimationFrame(tick);
  }
  async function start(mode: 'LIVE' | 'SIMULATED'): Promise<void> {
    if (current.current.sessionStatus === 'READY' && current.current.mode === mode && source.current) beginRun();
    else await openFeed(mode, true);
  }
  const prepare = (mode: 'LIVE' | 'SIMULATED') => openFeed(mode, false);
  function pause() {
    if (current.current.sessionStatus !== 'RUNNING') return;
    stopTimer();
    voiceCoach.cancelSpeech();
    cancelAnimation(); update({ sessionStatus: 'PAUSED' });
  }
  function resume() {
    if (current.current.sessionStatus !== 'PAUSED' || !source.current) return;
    current.current = { ...current.current, sessionStatus: 'RUNNING' }; lastTick.current = -Infinity;
    startTimer();
    publish(); animation.current = requestAnimationFrame(tick);
  }
  function stop(): RepMachineState {
    const active = ['RUNNING', 'PAUSED', 'STARTING'].includes(current.current.sessionStatus) ||
      (current.current.sessionStatus === 'ERROR' && current.current.state.repCount > 0);
    dispose(); update({ sessionStatus: 'COMPLETED', preparationStage: null });
    if (active) callbacks.current.onCompleted?.(current.current.state, Math.floor(elapsedMs.current / 1000));
    return current.current.state;
  }
  function finishPendingReps() {
    if (current.current.state.repCount > 0 && current.current.sessionStatus !== 'COMPLETED') stop();
  }
  function selectExercise(id: ResistanceExerciseId) {
    if (getExerciseById(id).kind !== 'RESISTANCE') throw new RangeError('Workout arena requires a resistance exercise');
    finishPendingReps();
    if (current.current.sessionStatus === 'READY') {
      update({ state: createInitialRepState(id), analysis: null, activeFaultAlerts: [], maxRomPct: 0 }); return;
    }
    dispose(); resetTimer(); current.current = idleView(id); publish();
  }
  async function triggerSimulatedRep(kind: SimulatedRepKind): Promise<void> {
    if (current.current.sessionStatus === 'STARTING' && current.current.mode !== 'LIVE') return;
    if (!source.current?.enqueue || current.current.sessionStatus === 'READY') await start('SIMULATED');
    source.current?.enqueue?.(generateSimulatedRepFrames(current.current.state.exerciseId, kind));
  }
  useEffect(() => () => dispose(), []);
  useEffect(() => {
    if (options.active === false && preparingOnly.current) {
      dispose(); resetTimer();
      update({ sessionStatus: 'IDLE', mode: null, analysis: null, errorMessage: null, preparationStage: null, trackingState: 'WAITING' });
    }
  }, [options.active]);
  useEffect(() => {
    if (options.exerciseId && options.exerciseId !== current.current.state.exerciseId) selectExercise(options.exerciseId);
  }, [options.exerciseId]);
  const tracking = view.sessionStatus === 'RUNNING' || (view.sessionStatus === 'READY' && view.mode === 'LIVE');
  const trackingGuidance = !tracking ? '' : view.trackingState === 'NO_PERSON' ? 'No person detected — step into the camera view.'
    : view.trackingState === 'PARTIAL' ? `Move back so your ${requiredJoints(view.state.exerciseId as ResistanceExerciseId)} are fully in view.` : '';
  return { ...view, elapsedSeconds, trackingGuidance,
    formFeedback: view.sessionStatus === 'RUNNING' && view.analysis?.isVisible && view.activeFaultAlerts.length === 0 ? 'Spine aligned' : '',
    canConfigureLoad: ['IDLE', 'READY', 'COMPLETED'].includes(view.sessionStatus) || (view.sessionStatus === 'ERROR' && view.state.repCount === 0),
    canEndSession: ['READY', 'RUNNING', 'PAUSED', 'STARTING'].includes(view.sessionStatus) || (view.sessionStatus === 'ERROR' && view.state.repCount > 0),
    voiceEnabled: voiceCoach.voiceCoachEnabled, setVoiceEnabled: voiceCoach.setVoiceCoachEnabled, visualOverlayEnabled, setVisualOverlayEnabled,
    voiceCoachEnabled: voiceCoach.voiceCoachEnabled, voiceCoachStatus: voiceCoach.voiceCoachStatus,
    setVoiceCoachEnabled: voiceCoach.setVoiceCoachEnabled, isRunning: view.sessionStatus === 'RUNNING', canvasRef, videoRef,
    start, prepare, pause, resume, stop, selectExercise, triggerSimulatedRep };
}
