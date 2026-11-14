import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPoseSource, generateSimulatedRepFrames } from '../adapters/poseCameraAdapter';
import type { PoseSource } from '../adapters/poseCameraAdapter';
import { drawPoseWireframe } from '../adapters/poseCanvasRenderer';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { advanceRepState, createInitialRepState } from '../core/kinematics/repStateMachine';
import type { KinematicFrameAnalysis, RepMachineState, ResistanceExerciseId, SimulatedRepKind, UseWorkoutArenaOptions, WorkoutArenaController as CoreController } from '../core/types';

type SessionStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
interface ArenaView {
  readonly state: RepMachineState; readonly analysis: KinematicFrameAnalysis | null; readonly activeFaultAlerts: readonly string[];
  readonly sessionStatus: SessionStatus; readonly errorMessage: string | null; readonly maxRomPct: number;
  readonly mode: 'LIVE' | 'SIMULATED' | null;
}
export interface WorkoutArenaController extends CoreController, ArenaView {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>; readonly videoRef: RefObject<HTMLVideoElement | null>;
  selectExercise(id: ResistanceExerciseId): void;
  stop(): RepMachineState;
}

export function useWorkoutArena(options: UseWorkoutArenaOptions = {}): WorkoutArenaController {
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
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && step.analysis && exercise.kind === 'RESISTANCE') drawPoseWireframe(ctx, frame, step.analysis, exercise.id);
          current.current = { ...before, state: step.state, analysis: step.analysis,
            activeFaultAlerts: step.activeFaultAlerts, maxRomPct: Math.max(before.maxRomPct, step.analysis?.romPct ?? 0) };
          if (before.state.phase !== step.state.phase || before.state.repCount !== step.state.repCount ||
            before.state.faultFlags.join() !== step.state.faultFlags.join() || before.activeFaultAlerts.join() !== step.activeFaultAlerts.join()) publish();
        }
      }
      animation.current = requestAnimationFrame(tick);
    } catch {
      dispose(); current.current = { ...current.current, sessionStatus: 'ERROR', errorMessage: 'Camera tracking stopped. Use a simulated rep to continue.' }; publish();
    }
  }
  async function start(mode: 'LIVE' | 'SIMULATED'): Promise<void> {
    dispose();
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
      publish(); animation.current = requestAnimationFrame(tick);
    } catch {
      if (version !== generation.current) return;
      dispose(); current.current = { ...current.current, sessionStatus: 'ERROR', errorMessage: 'Camera unavailable. Use a simulated rep to continue.' }; publish();
    }
  }
  function pause() {
    if (current.current.sessionStatus !== 'RUNNING') return;
    cancelAnimation(); current.current = { ...current.current, sessionStatus: 'PAUSED' }; publish();
  }
  function resume() {
    if (current.current.sessionStatus !== 'PAUSED' || !source.current) return;
    current.current = { ...current.current, sessionStatus: 'RUNNING' }; lastTick.current = -Infinity;
    publish(); animation.current = requestAnimationFrame(tick);
  }
  function stop(): RepMachineState {
    const active = ['RUNNING', 'PAUSED', 'STARTING'].includes(current.current.sessionStatus);
    dispose(); current.current = { ...current.current, sessionStatus: 'COMPLETED' }; publish();
    if (active) callbacks.current.onCompleted?.(current.current.state);
    return current.current.state;
  }
  function selectExercise(id: ResistanceExerciseId) {
    if (getExerciseById(id).kind !== 'RESISTANCE') throw new RangeError('Workout arena requires a resistance exercise');
    dispose(); current.current = { state: createInitialRepState(id), analysis: null,
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
  return { ...view, isRunning: view.sessionStatus === 'RUNNING', canvasRef, videoRef,
    start, pause, resume, stop, selectExercise, triggerSimulatedRep };
}
