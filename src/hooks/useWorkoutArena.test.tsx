import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { useWorkoutArena } from './useWorkoutArena';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div');
document.body.append(host);
let root = createRoot(host);
afterEach(async () => { await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); delete window.__ARES_TEST_POSE_FRAMES__; });

test('finalizes completed reps once before restarting or changing exercises', async () => {
  vi.useFakeTimers();
  let frame: FrameRequestCallback | null = null, timestamp = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  const onCompleted = vi.fn();
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena({ onCompleted }); return null; }
  const completeRep = async () => {
    await act(() => arena.triggerSimulatedRep('GOOD'));
    for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; timestamp += 34; next?.(timestamp); });
    await act(() => vi.advanceTimersByTime(2500));
    expect(arena.state.repCount).toBe(1);
  };
  await act(() => root.render(<Harness />));
  await completeRep();
  await act(() => arena.pause());
  await act(() => arena.start('SIMULATED'));
  expect(onCompleted).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ exerciseId: 'SQUAT', repCount: 1 }), 2);
  expect(arena.state.repCount).toBe(0);
  await completeRep();
  await act(() => arena.selectExercise('DEADLIFT'));
  expect(onCompleted).toHaveBeenCalledTimes(2);
  expect(onCompleted).toHaveBeenLastCalledWith(expect.objectContaining({ exerciseId: 'SQUAT', repCount: 1 }), 2);
  expect(arena.state.exerciseId).toBe('DEADLIFT');
  await completeRep();
  await act(() => arena.stop());
  await act(() => arena.start('SIMULATED'));
  await act(() => arena.selectExercise('SQUAT'));
  expect(onCompleted.mock.calls.filter(([state]) => state.repCount > 0)).toHaveLength(3);
});

test('times only running intervals, saves elapsed duration and exposes positive form and cue controls', async () => {
  vi.useFakeTimers();
  let frame: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  const onCompleted = vi.fn();
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena({ onCompleted }); return <canvas ref={arena.canvasRef} width={640} height={480} />; }
  await act(() => root.render(<Harness />));
  expect(arena.elapsedSeconds).toBe(0);
  expect(arena.voiceEnabled).toBe(false);
  expect(arena.visualOverlayEnabled).toBe(true);
  expect(arena.formFeedback).toBe('');
  await act(() => arena.triggerSimulatedRep('GOOD'));
  for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; next?.(i * 34); });
  expect(arena.formFeedback).toBe('Spine aligned');
  await act(() => vi.advanceTimersByTime(2500));
  expect(arena.elapsedSeconds).toBe(2);
  await act(() => arena.pause());
  await act(() => vi.advanceTimersByTime(10000));
  expect(arena.elapsedSeconds).toBe(2);
  await act(() => arena.resume());
  await act(() => vi.advanceTimersByTime(500));
  await act(() => arena.stop());
  expect(arena.elapsedSeconds).toBe(3);
  expect(onCompleted).toHaveBeenCalledWith(expect.objectContaining({ repCount: 1 }), 3);
  await act(() => { arena.setVoiceEnabled(true); arena.setVisualOverlayEnabled(false); });
  expect(arena.voiceCoachEnabled).toBe(true);
  expect(arena.visualOverlayEnabled).toBe(false);
  await act(() => arena.selectExercise('OVERHEAD_PRESS'));
  expect(arena.elapsedSeconds).toBe(0);
});

test('runs all four exercises, pauses without losing a rep, returns summaries and snapshots, and avoids per-frame React updates', async () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 0, timestampMs = 0, renders = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  const tick = async (count: number) => {
    for (let i = 0; i < count; i++) await act(() => {
      timestampMs += 34;
      const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(timestampMs));
    });
  };
  let arena!: ReturnType<typeof useWorkoutArena>;
  const onCompleted = vi.fn();
  function Harness() {
    renders++;
    arena = useWorkoutArena({ onCompleted });
    return <><video ref={arena.videoRef} muted playsInline /><canvas ref={arena.canvasRef} width={640} height={480} /></>;
  }
  await act(() => root.render(<Harness />));
  for (const id of ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL'] as const) {
    await act(() => arena.selectExercise(id));
    await act(async () => { await arena.start('SIMULATED'); });
    expect(arena.isRunning).toBe(true);
    await act(() => arena.triggerSimulatedRep('GOOD'));
    const renderStart = renders;
    // The start zone spans a quarter of the range, so the synthetic rep departs on its fifth frame.
    await tick(5);
    expect(arena.state.phase).toBe('ECCENTRIC');
    await act(() => arena.pause());
    const paused = arena.state;
    await tick(4);
    expect(arena.state).toBe(paused);
    expect(arena.isRunning).toBe(false);
    await act(() => arena.resume());
    await tick(12);
    expect(arena.state).toMatchObject({ repCount: 1, snapshots: [] });
    expect(arena.maxRomPct).toBeCloseTo(100, 5);
    expect(renders - renderStart).toBeLessThan(12);
    await act(() => arena.triggerSimulatedRep('SHALLOW'));
    await tick(12);
    expect(arena.state.repCount).toBe(2);
    expect(arena.activeFaultAlerts).toContain('Depth insufficient');
    expect(arena.state.snapshots).toHaveLength(1);
    expect(arena.state.snapshots[0]).toMatchObject({ repNumber: 2, exerciseId: id });
    await act(() => {
      const summary = arena.stop();
      expect(summary).toMatchObject({ repCount: 2, faultedRepCount: 1 });
      expect(summary.snapshots).toHaveLength(1);
    });
    expect(arena.sessionStatus).toBe('COMPLETED');
    expect(callbacks.size).toBe(0);
  }
  expect(onCompleted).toHaveBeenCalledTimes(4);
});

test('recovers from denied camera access with a one-click simulated rep', async () => {
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
  let callback: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => { callback = next; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { callback = null; });
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena(); return <video ref={arena.videoRef} muted playsInline />; }
  await act(() => root.render(<Harness />));
  await act(async () => { await arena.start('LIVE'); });
  expect(arena.sessionStatus).toBe('ERROR');
  expect(arena.errorMessage).toContain('simulated rep');
  await act(() => arena.triggerSimulatedRep('GOOD'));
  for (let i = 0; i < 12; i++) await act(() => { const next = callback; callback = null; next?.(i * 34); });
  expect(arena.state.repCount).toBe(1);
  expect(arena.errorMessage).toBeNull();
});

test('does not revive a cancelled camera startup after switching exercises', async () => {
  let resolveStream!: (stream: MediaStream) => void;
  vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(() => new Promise<MediaStream>(resolve => { resolveStream = resolve; }));
  const requestFrame = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena(); return <video ref={arena.videoRef} muted playsInline />; }
  await act(() => root.render(<Harness />));
  let starting!: Promise<void>;
  await act(() => { starting = arena.start('LIVE'); });
  expect(arena.sessionStatus).toBe('STARTING');
  await act(() => arena.selectExercise('DEADLIFT'));
  await act(async () => { resolveStream(stream); await starting; });
  expect(arena.sessionStatus).toBe('IDLE');
  expect(arena.state.exerciseId).toBe('DEADLIFT');
  expect(stop).toHaveBeenCalledOnce();
  expect(requestFrame).not.toHaveBeenCalled();
});

test('speaks only new rep/fault transitions with local measured feedback and cancels on every interruption', async () => {
  const localVoice = { name: 'Offline demo', lang: 'en-US', localService: true } as SpeechSynthesisVoice;
  const spoken: { text: string; voice: SpeechSynthesisVoice | null }[] = [];
  let speaking: SpeechSynthesisUtterance | null = null;
  const cancel = vi.fn();
  const speech = Object.assign(new EventTarget(), { getVoices: () => [localVoice], cancel,
    speak: (utterance: SpeechSynthesisUtterance) => { speaking = utterance; spoken.push({ text: utterance.text, voice: utterance.voice }); } });
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', class { voice: SpeechSynthesisVoice | null = null; constructor(public text: string) {} });
  let frame: FrameRequestCallback | null = null, timestamp = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  const tick = async (count = 12) => {
    for (let i = 0; i < count; i++) await act(() => { const next = frame; frame = null; timestamp += 34; next?.(timestamp); });
  };
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena(); return null; }
  await act(() => root.render(<Harness />));
  await act(() => arena.triggerSimulatedRep('GOOD')); await tick();
  expect(spoken).toEqual([]);
  await act(() => arena.setVoiceCoachEnabled(true)); await tick();
  expect(spoken).toEqual([]); // Enabling does not replay rep 1.
  await act(() => arena.triggerSimulatedRep('GOOD')); await tick();
  expect(spoken).toEqual([{ text: 'Rep 2 complete — 100 percent symmetry', voice: localVoice }]);
  await tick();
  expect(spoken).toHaveLength(1);
  await act(() => arena.triggerSimulatedRep('SPINE_FAULT')); await tick();
  expect(spoken.filter(item => item.text.includes('Warning: Spine not aligned'))).toHaveLength(1);
  // A completion must wait until the active fault warning has actually finished.
  expect(spoken.some(item => item.text.includes('Rep 3 complete'))).toBe(false);
  await act(() => arena.triggerSimulatedRep('GOOD')); await tick();
  expect(spoken.some(item => item.text.includes('Rep 4 complete'))).toBe(false);
  await act(() => { const utterance = speaking; utterance?.onend?.(new Event('end') as SpeechSynthesisEvent); });
  expect(spoken.some(item => item.text.includes('Rep 3 complete'))).toBe(false);
  expect(spoken.some(item => item.text.includes('Rep 4 complete — 100 percent symmetry'))).toBe(true);
  const assertCancelled = async (action: () => unknown) => {
    const count = cancel.mock.calls.length;
    await act(async () => { await action(); });
    expect(cancel.mock.calls.length).toBeGreaterThan(count);
  };
  await assertCancelled(() => arena.pause());
  const pausedCount = spoken.length;
  await act(() => arena.resume()); await tick();
  expect(spoken).toHaveLength(pausedCount);
  await assertCancelled(() => arena.stop());
  await assertCancelled(() => arena.selectExercise('OVERHEAD_PRESS'));
  await assertCancelled(() => arena.start('SIMULATED'));
  await act(() => arena.triggerSimulatedRep('ASYMMETRIC')); await tick();
  await act(() => { const utterance = speaking; utterance?.onend?.(new Event('end') as SpeechSynthesisEvent); });
  expect(spoken.some(item => item.text.includes('Rep 1 complete — 83 percent symmetry'))).toBe(true);
  expect(spoken.filter(item => item.text.includes('Warning: Left/Right imbalance'))).toHaveLength(1);
  // A stale warning callback must not revive deferred speech after an interruption.
  await assertCancelled(() => arena.selectExercise('SQUAT'));
  await act(() => arena.triggerSimulatedRep('SPINE_FAULT')); await tick();
  const interrupted = speaking as SpeechSynthesisUtterance | null;
  await assertCancelled(() => arena.pause());
  const interruptedCount = spoken.length;
  await act(() => { interrupted?.onend?.(new Event('end') as SpeechSynthesisEvent); });
  expect(spoken).toHaveLength(interruptedCount);
  await act(() => arena.resume());
  await assertCancelled(() => arena.setVoiceCoachEnabled(false));
  const disabledCount = spoken.length;
  await act(() => arena.triggerSimulatedRep('GOOD')); await tick();
  expect(spoken).toHaveLength(disabledCount);
  await assertCancelled(() => root.unmount());
  root = createRoot(host);
});

test('keeps workouts and visible faults active when local speech output fails', async () => {
  const speech = Object.assign(new EventTarget(), { getVoices: () => [{ name: 'Local', localService: true } as SpeechSynthesisVoice],
    cancel: () => { throw new Error('Audio unavailable'); }, speak: () => { throw new Error('Audio unavailable'); } });
  vi.stubGlobal('speechSynthesis', speech);
  let frame: FrameRequestCallback | null = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena(); return null; }
  await act(() => root.render(<Harness />));
  await act(() => arena.setVoiceCoachEnabled(true));
  await act(() => arena.triggerSimulatedRep('SPINE_FAULT'));
  for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; next?.(i * 34); });
  expect(arena.sessionStatus).toBe('RUNNING');
  expect(arena.state.repCount).toBe(1);
  expect(arena.activeFaultAlerts).toContain('Spine not aligned');
  expect(arena.voiceCoachStatus).toContain('unavailable');
});

test('recovers from browser-interrupted warnings and ignores stale utterance errors', async () => {
  const utterances: SpeechSynthesisUtterance[] = [];
  const localVoice = { name: 'Local', lang: 'en-US', localService: true } as SpeechSynthesisVoice;
  vi.stubGlobal('speechSynthesis', Object.assign(new EventTarget(), { getVoices: () => [localVoice], cancel: vi.fn(),
    speak: (utterance: SpeechSynthesisUtterance) => { utterances.push(utterance); } }));
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
  let frame: FrameRequestCallback | null = null, timestamp = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  let arena!: ReturnType<typeof useWorkoutArena>;
  function Harness() { arena = useWorkoutArena(); return null; }
  const rep = async (kind: 'GOOD' | 'SPINE_FAULT') => {
    await act(() => arena.triggerSimulatedRep(kind));
    for (let i = 0; i < 12; i++) await act(() => { const next = frame; frame = null; timestamp += 34; next?.(timestamp); });
  };
  await act(() => root.render(<Harness />));
  await act(() => arena.setVoiceCoachEnabled(true));
  await rep('SPINE_FAULT');
  const interrupted = utterances[0];
  await act(() => interrupted.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent));
  await rep('GOOD');
  expect(utterances.map(item => item.text)).toContain('Rep 2 complete — 100 percent symmetry');
  await rep('SPINE_FAULT');
  const currentWarning = utterances.at(-1)!;
  await act(() => interrupted.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent));
  expect(arena.voiceCoachStatus).toContain('Local voice active');
  await act(() => currentWarning.onend?.(new Event('end') as SpeechSynthesisEvent));
  expect(utterances.at(-1)?.text).toBe('Rep 3 complete — 100 percent symmetry');
});
