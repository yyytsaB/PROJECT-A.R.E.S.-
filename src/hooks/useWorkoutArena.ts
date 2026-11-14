import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPoseSource, generateSimulatedRepFrames } from '../adapters/poseCameraAdapter';
import type { PoseSource } from '../adapters/poseCameraAdapter';
import { drawPoseWireframe } from '../adapters/poseCanvasRenderer';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { advanceRepState, createInitialRepState } from '../core/kinematics/repStateMachine';
import type { KinematicFrameAnalysis, RepMachineState, ResistanceExerciseId, SimulatedRepKind, UseWorkoutArenaOptions, WorkoutArenaController as CoreController } from '../core/types';
import { useVoiceCoach } from './useVoiceCoach';

type SessionStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
interface ArenaView {
  readonly state: RepMachineState; readonly analysis: KinematicFrameAnalysis | null; readonly activeFaultAlerts: readonly string[];
  readonly sessionStatus: SessionStatus; readonly errorMessage: string | null; readonly maxRomPct: number;
  readonly mode: 'LIVE' | 'SIMULATED' | null;
}
export interface WorkoutArenaController extends CoreController, ArenaView {
  readonly canConfigureLoad: boolean;
  readonly canEndSession: boolean;
  readonly elapsedSeconds: number; readonly formFeedback: string;
  readonly voiceEnabled: boolean; readonly visualOverlayEnabled: boolean;
  setVoiceEnabled(enabled: boolean): void; setVisualOverlayEnabled(enabled: boolean): void;
  readonly voiceCoachEnabled: boolean; readonly voiceCoachStatus: string;
  setVoiceCoachEnabled(enabled: boolean): void;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>; readonly videoRef: RefObject<HTMLVideoElement | null>;
  selectExercise(id: ResistanceExerciseId): void;
  stop(): RepMachineState;
}

export function useWorkoutArena(options: UseWorkoutArenaOptions = {}): WorkoutArenaController {
  const voiceCoach = useVoiceCoach();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [visualOverlayEnabled, setVisualOverlay] = useState(true);
  const overlay = useRef(true);
  const elapsedMs = useRef(0);
  const runningSince = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const current = useRef<ArenaView>({ state: createInitialRepState(options.exerciseId ?? 'SQUAT'), analysis: null,
    activeFaultAlerts: [], sessionStatus: 'IDLE', errorMessage: null, maxRomPct: 0, mode: null });
  const [view, setView] = useState(current.current);
  const source = useRef<PoseSource | null>(null);
  const abort = useRef<AbortController | null>(null);
  const animation = useRef<number | null>(null);
  const generation = useRef(0);
  const lastTick = useRef(-Infinity);
  const publish = () => setView({ ...current.current });
  const cancelAnimation = () => { if (animation.current !== null) cancelAnimationFrame(animation.current); animation.current = null; };
  const dispose = () => {
    stopTimer();
    voiceCoach.cancelSpeech();
    generation.current++;
    cancelAnimation(); abort.current?.abort(); abort.current = null;
    source.current?.close(); source.current = null;
  };
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
          const ctx = canvasRef.current?.getContext('2d');
          if (overlay.current && ctx) {
            if (step.analysis && exercise.kind === 'RESISTANCE') drawPoseWireframe(ctx, frame, step.analysis, exercise.id);
            else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          }
          current.current = { ...before, state: step.state, analysis: step.analysis,
            activeFaultAlerts: step.activeFaultAlerts, maxRomPct: Math.max(before.maxRomPct, step.analysis?.romPct ?? 0) };
          if (before.analysis?.isVisible !== step.analysis?.isVisible || before.state.phase !== step.state.phase || before.state.repCount !== step.state.repCount ||
            before.state.faultFlags.join() !== step.state.faultFlags.join() || before.activeFaultAlerts.join() !== step.activeFaultAlerts.join()) publish();
        }
      }
      animation.current = requestAnimationFrame(tick);
    } catch {
      dispose(); current.current = { ...current.current, sessionStatus: 'ERROR', errorMessage: 'Camera tracking stopped. Use a simulated rep to continue.' }; publish();
    }
  }
  async function start(mode: 'LIVE' | 'SIMULATED'): Promise<void> {
    finishPendingReps();
    dispose();
    resetTimer();
    const version = generation.current;
    abort.current = new AbortController();
    current.current = { state: createInitialRepState(current.current.state.exerciseId), analysis: null,
      activeFaultAlerts: [], sessionStatus: 'STARTING', errorMessage: null, maxRomPct: 0, mode };
    publish();
    try {
      const opened = await createPoseSource({ mode, video: videoRef.current ?? undefined, signal: abort.current.signal });
      if (version !== generation.current) { opened.close(); return; }
      source.current = opened;
      current.current = { ...current.current, sessionStatus: 'RUNNING' }; lastTick.current = -Infinity;
      startTimer(); publish(); animation.current = requestAnimationFrame(tick);
    } catch {
      if (version !== generation.current) return;
      dispose(); current.current = { ...current.current, sessionStatus: 'ERROR', errorMessage: 'Camera unavailable. Use a simulated rep to continue.' }; publish();
    }
  }
  function pause() {
    if (current.current.sessionStatus !== 'RUNNING') return;
    stopTimer();
    voiceCoach.cancelSpeech();
    cancelAnimation(); current.current = { ...current.current, sessionStatus: 'PAUSED' }; publish();
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
    dispose(); current.current = { ...current.current, sessionStatus: 'COMPLETED' }; publish();
    if (active) callbacks.current.onCompleted?.(current.current.state, Math.floor(elapsedMs.current / 1000));
    return current.current.state;
  }
  function finishPendingReps() {
    if (current.current.state.repCount > 0 && current.current.sessionStatus !== 'COMPLETED') stop();
  }
  function selectExercise(id: ResistanceExerciseId) {
    if (getExerciseById(id).kind !== 'RESISTANCE') throw new RangeError('Workout arena requires a resistance exercise');
    finishPendingReps();
    dispose(); resetTimer(); current.current = { state: createInitialRepState(id), analysis: null,
      activeFaultAlerts: [], sessionStatus: 'IDLE', errorMessage: null, maxRomPct: 0, mode: null }; publish();
  }
  async function triggerSimulatedRep(kind: SimulatedRepKind): Promise<void> {
    if (current.current.sessionStatus === 'STARTING' && current.current.mode !== 'LIVE') return;
    if (!source.current?.enqueue) await start('SIMULATED');
    source.current?.enqueue?.(generateSimulatedRepFrames(current.current.state.exerciseId, kind));
  }
  useEffect(() => () => dispose(), []);
  useEffect(() => {
    if (options.exerciseId && options.exerciseId !== current.current.state.exerciseId) selectExercise(options.exerciseId);
  }, [options.exerciseId]);
  return { ...view, elapsedSeconds, formFeedback: view.analysis?.isVisible && view.activeFaultAlerts.length === 0 ? 'Spine aligned' : '',
    canConfigureLoad: ['IDLE', 'COMPLETED'].includes(view.sessionStatus) || (view.sessionStatus === 'ERROR' && view.state.repCount === 0),
    canEndSession: ['RUNNING', 'PAUSED', 'STARTING'].includes(view.sessionStatus) || (view.sessionStatus === 'ERROR' && view.state.repCount > 0),
    voiceEnabled: voiceCoach.voiceCoachEnabled, setVoiceEnabled: voiceCoach.setVoiceCoachEnabled, visualOverlayEnabled, setVisualOverlayEnabled,
    voiceCoachEnabled: voiceCoach.voiceCoachEnabled, voiceCoachStatus: voiceCoach.voiceCoachStatus,
    setVoiceCoachEnabled: voiceCoach.setVoiceCoachEnabled, isRunning: view.sessionStatus === 'RUNNING', canvasRef, videoRef,
    start, pause, resume, stop, selectExercise, triggerSimulatedRep };
}
