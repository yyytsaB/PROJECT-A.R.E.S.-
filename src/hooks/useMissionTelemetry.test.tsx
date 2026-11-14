import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import { createSafeStorage } from '../adapters/telemetryStorageAdapter';
import { MissionTelemetryProvider, useMissionTelemetry } from './useMissionTelemetry';
import type { CompletedWorkoutInput } from '../core/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('auto-sync preserves concurrent saves/settings and cannot resurrect cleared history or strand a new mission', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const batches: string[][] = [];
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const client = { sendBatch: async (batch: readonly { sessionId: string }[]) => { batches.push(batch.map(e => e.sessionId)); if (batches.length === 1) await blocked; } };
  let mission!: ReturnType<typeof useMissionTelemetry>;
  function Harness() { mission = useMissionTelemetry(); return null; }
  const input: CompletedWorkoutInput = { id: 'first', exerciseId: 'SQUAT', completedAtIso: '2026-11-14T12:00:00.000Z', sets: 1, reps: 10, loadKg: 80, cardioDistanceKm: 0, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] };
  try {
    await act(() => root.render(<MissionTelemetryProvider storage={createSafeStorage()} syncClient={client} now={() => input.completedAtIso}><Harness /></MissionTelemetryProvider>));
    await act(() => { mission.clearLocalCache(); mission.saveWorkout(input); mission.setCommsStatus('WINDOW_OPEN'); });
    expect(batches).toEqual([['first']]);
    await act(() => { mission.saveWorkout({ ...input, id: 'second' }); mission.updateProfile({ name: 'Commander' }); });
    expect(mission.state.sessions).toHaveLength(2);
    await act(() => { mission.clearLocalCache(); mission.saveWorkout({ ...input, id: 'new-mission' }); mission.updateProfile({ name: 'New Commander' }); mission.setCommsStatus('WINDOW_OPEN'); });
    await act(async () => { release(); await blocked; });
    expect(batches).toEqual([['first'], ['new-mission']]);
    expect(mission.state.sessions.map(s => s.id)).toEqual(['new-mission']);
    expect(mission.state.profile.name).toBe('New Commander');
    expect(mission.state.syncQueue).toEqual([]);
    expect(mission.state.acknowledgements.map(a => a.sessionId)).toEqual(['new-mission']);
  } finally { release(); await act(() => root.unmount()); host.remove(); }
});
