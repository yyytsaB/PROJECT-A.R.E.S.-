import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrowserStorage } from '../adapters/telemetryStorageAdapter';
import { createSupabaseSyncAdapter } from '../adapters/supabaseSyncAdapter';
import { renderKinematicSnapshot } from '../adapters/poseCanvasRenderer';
import { getPlanetaryRouteById, loadMissionCatalog } from '../core/catalog/missionCatalog';
import { clearMissionStore, flushCommsSyncQueue, loadMissionStore, MISSION_STORAGE_KEY, persistMissionStore, recordCompletedWorkout, seedDemoMissionState } from '../core/storage/telemetryStore';
import { isMissionStoreState } from '../core/storage/validateMissionStore';
import { buildFlightSurgeonReport, computeExpeditionProgress, computeMedicalTelemetry, computeSessionRecord } from '../core/telemetry/telemetryEngine';
import type { AstronautProfile, CompletedWorkoutInput, CommsLinkStatus, KinematicSnapshot, MissionStoreState, ResistanceExerciseId, StorageLike, TelemetrySyncClient } from '../core/types';

interface ProviderOptions { children: ReactNode; storage?: StorageLike; syncClient?: TelemetrySyncClient; now?: () => string }
function useMissionController(options: ProviderOptions) {
  const storage = useRef(options.storage ?? createBrowserStorage()).current;
  const now = options.now ?? (() => new Date().toISOString());
  const client = useRef(options.syncClient ?? createSupabaseSyncAdapter()).current;
  const [state, setState] = useState(() => {
    const missing = storage.getItem(MISSION_STORAGE_KEY) === null;
    return missing ? seedDemoMissionState(now(), storage) : loadMissionStore(storage, now());
  });
  const current = useRef(state);
  const generation = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  function publish(next: MissionStoreState) {
    current.current = persistMissionStore(next, storage); setState(current.current);
  }
  function saveWorkout(input: CompletedWorkoutInput) {
    publish(recordCompletedWorkout(current.current, computeSessionRecord(input, current.current.profile)));
  }
  function updateProfile(patch: Partial<AstronautProfile>) {
    const next = { ...current.current, profile: { ...current.current.profile, ...patch } };
    if (!isMissionStoreState(next)) throw new RangeError('Mission profile requires valid catalog IDs and positive Earth baselines');
    publish(next);
  }
  function setCommsStatus(commsStatus: CommsLinkStatus) { setSyncError(null); publish({ ...current.current, commsStatus }); }
  async function flushSyncQueueNow(): Promise<void> {
    if (inFlight.current) return inFlight.current;
    const snapshot = current.current;
    if (snapshot.commsStatus !== 'WINDOW_OPEN' || !snapshot.syncQueue.length) return;
    const version = generation.current;
    setSyncing(true); setSyncError(null);
    const operation = (async () => {
      // Merge the acknowledgement into current state: new workouts/settings may arrive while uploading.
      const result = await flushCommsSyncQueue(snapshot, 'WINDOW_OPEN', client, now());
      if (version !== generation.current) return;
      const sent = new Set(result.acknowledgements.map(a => a.sessionId));
      const latest = current.current;
      publish({ ...latest, syncQueue: latest.syncQueue.filter(e => !sent.has(e.sessionId)),
        acknowledgements: [...latest.acknowledgements.filter(a => !sent.has(a.sessionId)), ...result.acknowledgements], lastSyncedAtIso: result.lastSyncedAtIso });
      if (result.syncQueue.length) setSyncError('Upload unavailable. Telemetry remains queued; retry when communications recover.');
    })();
    inFlight.current = operation;
    try { await operation; } finally { inFlight.current = null; setSyncing(false); }
  }
  function replaceMission(seed: boolean) {
    generation.current++; setSyncError(null);
    publish(seed ? seedDemoMissionState(now()) : clearMissionStore());
  }
  useEffect(() => { if (!syncing && !syncError) void flushSyncQueueNow(); }, [state.commsStatus, state.syncQueue.length, syncing, syncError]);
  return { state, nowIso: now(), syncing, syncError, saveWorkout, updateProfile, setCommsStatus, flushSyncQueueNow,
    toggleCommsWindow: () => setCommsStatus(current.current.commsStatus === 'WINDOW_OPEN' ? 'BLACKOUT_24MIN_DELAY' : 'WINDOW_OPEN'),
    seed30DayDemoData: () => replaceMission(true), clearLocalCache: () => replaceMission(false) };
}

const MissionContext = createContext<ReturnType<typeof useMissionController> | null>(null);
export function MissionTelemetryProvider(options: ProviderOptions) {
  return createElement(MissionContext.Provider, { value: useMissionController(options) }, options.children);
}
export function useMissionTelemetry() {
  const mission = useContext(MissionContext);
  if (!mission) throw new Error('MissionTelemetryProvider is required');
  return mission;
}

export function useDashboardSummary(quickLaunchExercise?: (id: ResistanceExerciseId) => void, cameraReady = false) {
  const mission = useMissionTelemetry();
  const telemetry = computeMedicalTelemetry(mission.state.sessions, mission.state.profile, mission.nowIso);
  const earliest = mission.state.sessions.reduce((earliest, s) => Math.min(earliest, Date.parse(s.completedAtIso)), Date.parse(mission.nowIso));
  return { missionDay: Math.floor((Date.parse(mission.nowIso) - earliest) / 86400000) + 1, strengthRetentionPct: telemetry.strengthRetentionPct,
    todaySchedule: loadMissionCatalog().exercises, statusIndicators: { isOfflineFirst: true, cameraReady, commsLinkStatus: mission.state.commsStatus, queuedSyncCount: mission.state.syncQueue.length }, quickLaunchExercise };
}
export const useDashboardTelemetry = useDashboardSummary;

export function useExpeditionJourney() {
  const { state, updateProfile } = useMissionTelemetry();
  const activeRoute = getPlanetaryRouteById(state.profile.routeId);
  const progress = computeExpeditionProgress(state.sessions, activeRoute);
  const totalTonnageKg = state.sessions.reduce((sum, s) => sum + s.resistanceVolumeKg, 0);
  const cardioKm = state.sessions.filter(s => loadMissionCatalog().exercises.some(e => e.id === s.exerciseId && e.kind === 'CARDIO')).reduce((sum, s) => sum + s.expeditionDistanceKm, 0);
  return { ...progress, activeRoute, totalTonnageKg, cardioKm, resistanceEquivalentKm: progress.cumulativeDistanceKm - cardioKm,
    unlockedBadges: progress.unlockedMilestones, nextWaypoint: activeRoute.milestones.find(m => m.distanceKm > progress.cumulativeDistanceKm) ?? null,
    selectRoute: (routeId: AstronautProfile['routeId']) => updateProfile({ routeId }) };
}

export function useMedicalTelemetry() {
  const { state, nowIso } = useMissionTelemetry();
  const telemetry = computeMedicalTelemetry(state.sessions, state.profile, nowIso);
  function exportFlightSurgeonReport(format: 'json' | 'csv' = 'json') {
    const report = buildFlightSurgeonReport(telemetry, state.profile, { pendingCount: state.syncQueue.length, lastSyncedAtIso: state.lastSyncedAtIso }, nowIso);
    const url = URL.createObjectURL(new Blob([format === 'json' ? JSON.stringify(report.json, null, 2) : report.csv], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ares-flight-surgeon.${format}`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return report;
  }
  return { ...telemetry, retentionSeries30d: telemetry.dailyRetentionSeries,
    volumeSeries30d: telemetry.dailyRetentionSeries.map(point => ({ dateIso: point.dateIso, volumeKg: telemetry.sessions.filter(s => s.completedAtIso.slice(0, 10) === point.dateIso).reduce((sum, s) => sum + s.resistanceVolumeKg, 0) })),
    symmetryScoreAvg: telemetry.symmetryConsistencyPct, kinematicConsistencyScore: telemetry.symmetryConsistencyPct, exportFlightSurgeonReport };
}
export const useMedicalAnalytics = useMedicalTelemetry;

export function useWorkoutHistory() {
  const { state } = useMissionTelemetry();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSnapshot, selectSnapshotForReplay] = useState<KinematicSnapshot | null>(null);
  const replayCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { selectSnapshotForReplay(null); }, [state.sessions]);
  useEffect(() => {
    const ctx = replayCanvasRef.current?.getContext('2d');
    if (ctx && selectedSnapshot) renderKinematicSnapshot(ctx, selectedSnapshot);
  }, [selectedSnapshot]);
  return { sessions: state.sessions.filter(s => `${s.exerciseId} ${s.completedAtIso} ${s.id}`.toLowerCase().includes(searchQuery.toLowerCase())).reverse(),
    searchQuery, setSearchQuery, selectedSnapshot, selectSnapshotForReplay, replayCanvasRef };
}

export function useMissionProfile() {
  const mission = useMissionTelemetry();
  return { astronautProfile: mission.state.profile, updateProfile: mission.updateProfile, gravityProfile: mission.state.profile.gravityProfileId,
    setGravityProfile: (gravityProfileId: AstronautProfile['gravityProfileId']) => mission.updateProfile({ gravityProfileId }), commsStatus: mission.state.commsStatus,
    toggleCommsWindow: mission.toggleCommsWindow, flushSyncQueueNow: mission.flushSyncQueueNow, seed30DayDemoData: mission.seed30DayDemoData, clearLocalCache: mission.clearLocalCache };
}
