import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { useWorkoutArena } from './useWorkoutArena';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div');
document.body.append(host);
let root = createRoot(host);
afterEach(async () => { await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host); vi.unstubAllGlobals(); vi.restoreAllMocks(); delete window.__ARES_TEST_POSE_FRAMES__; });

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
    await tick(4);
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
