import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test } from 'vitest';
import { createSafeStorage } from '../adapters/telemetryStorageAdapter';
import type { CompletedWorkoutInput, StorageLike } from '../core/types';
import { MissionTelemetryProvider, useMilestoneCelebrations, useMissionTelemetry } from './useMissionTelemetry';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = document.createElement('div');
document.body.append(host);
let root = createRoot(host);
afterEach(async () => { await act(() => root.unmount()); host.replaceChildren(); root = createRoot(host); });

const NOW = '2026-11-15T12:00:00.000Z';
let counter = 0;
const treadmill = (km: number, id = `run-${++counter}`): CompletedWorkoutInput => ({ id, exerciseId: 'TREADMILL', completedAtIso: NOW, durationSec: 600,
  sets: 0, reps: 0, loadKg: 0, cardioDistanceKm: km, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] });

async function mount(storage: StorageLike = createSafeStorage(), clear = true) {
  let mission!: ReturnType<typeof useMissionTelemetry>, celebrations!: ReturnType<typeof useMilestoneCelebrations>;
  function Harness() { mission = useMissionTelemetry(); celebrations = useMilestoneCelebrations(); return null; }
  await act(() => root.render(<MissionTelemetryProvider storage={storage} now={() => NOW}><Harness /></MissionTelemetryProvider>));
  if (clear) await act(() => mission.clearLocalCache());
  return { get mission() { return mission; }, get celebrations() { return celebrations; }, storage };
}
const ids = (view: Awaited<ReturnType<typeof mount>>) => view.celebrations.queue.map(item => item.milestoneId);

test('celebrates a milestone only when an accepted workout crosses it: below, exactly at and above the boundary', async () => {
  const view = await mount();
  await act(() => view.mission.saveWorkout(treadmill(49.99)));
  expect(ids(view)).toEqual([]);
  await act(() => view.mission.saveWorkout(treadmill(0.01)));
  expect(ids(view)).toEqual(['FIRST_TRAVERSE']);
  expect(view.celebrations.current).toMatchObject({ milestoneId: 'FIRST_TRAVERSE', name: 'First Traverse', routeName: 'Valles Marineris', distanceKm: 50,
    badgeSrc: '/assets/badges/first-traverse.svg', description: 'Complete 50 km of virtual expedition progress.' });
  await act(() => view.celebrations.dismiss(view.celebrations.current!.key));
  await act(() => view.mission.saveWorkout(treadmill(10)));
  expect(ids(view)).toEqual([]);
});

test('queues several milestones crossed by one workout once each, in progression order, and ignores a duplicate save', async () => {
  const view = await mount();
  await act(() => view.mission.updateProfile({ routeId: 'OLYMPUS_MONS' }));
  const big = treadmill(320, 'big-run');
  await act(() => view.mission.saveWorkout(big));
  expect(ids(view)).toEqual(['BASE_CAMP', 'UPPER_SLOPE']);
  await act(() => view.mission.saveWorkout(big));
  expect(ids(view)).toEqual(['BASE_CAMP', 'UPPER_SLOPE']);
  await act(() => view.celebrations.dismiss(view.celebrations.current!.key));
  expect(ids(view)).toEqual(['UPPER_SLOPE']);
  expect(view.celebrations.current?.badgeSrc).toBe('/assets/badges/upper-slope.svg');
});

test('never celebrates historical awards on reload, demo seeding, route changes or a rejected save, and a new mission can earn badges again', async () => {
  const storage = createSafeStorage();
  const view = await mount(storage);
  await act(() => view.mission.saveWorkout(treadmill(60)));
  expect(ids(view)).toEqual(['FIRST_TRAVERSE']);
  await act(() => root.unmount()); root = createRoot(host);
  const reloaded = await mount(storage, false);
  expect(reloaded.mission.state.sessions).toHaveLength(1);
  expect(ids(reloaded)).toEqual([]);
  await act(() => reloaded.mission.updateProfile({ routeId: 'OLYMPUS_MONS' }));
  expect(ids(reloaded)).toEqual([]);
  await act(() => reloaded.mission.saveWorkout(treadmill(Number.POSITIVE_INFINITY)));
  expect(ids(reloaded)).toEqual([]);
  await act(() => reloaded.mission.updateProfile({ routeId: 'VALLES_MARINERIS' }));
  await act(() => reloaded.mission.saveWorkout(treadmill(1950)));
  expect(ids(reloaded)).toEqual(['CANYON_MIDPOINT']);
  await act(() => reloaded.mission.seed30DayDemoData());
  expect(ids(reloaded)).toEqual([]);
  await act(() => reloaded.mission.clearLocalCache());
  await act(() => reloaded.mission.saveWorkout(treadmill(50)));
  expect(ids(reloaded)).toEqual(['FIRST_TRAVERSE']);
});
