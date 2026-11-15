import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrowserStorage } from '../adapters/telemetryStorageAdapter';
import { createSupabaseSyncAdapter } from '../adapters/supabaseSyncAdapter';
import { renderKinematicSnapshot } from '../adapters/poseCanvasRenderer';
import { getExerciseById, getGravityProfileById, getPlanetaryRouteById, loadMissionCatalog } from '../core/catalog/missionCatalog';
import { clearMissionStore, flushCommsSyncQueue, loadMissionStore, MISSION_STORAGE_KEY, persistMissionStore, recordCompletedWorkout, seedDemoMissionState } from '../core/storage/telemetryStore';
import { isMissionStoreState } from '../core/storage/validateMissionStore';
import { withProfileDefaults } from '../core/telemetry/profileDefaults';
import { profileWithFields, readProfileField, validateProfileFields } from '../core/telemetry/profileFields';
import type { ProfileEdits, ProfileField } from '../core/telemetry/profileFields';
import rules from '../content/routineRules.json';
import { buildFlightSurgeonReport, calculateBmi, computeExpeditionProgress, computeMedicalTelemetry, computeSessionRecord, describeGravityScenario, formatDurationMmSs, generatePersonalizedRoutine, getSessionFormStatus, measureMissionPayloads } from '../core/telemetry/telemetryEngine';
import type { AstronautProfile, CompletedWorkoutInput, CommsLinkStatus, ExerciseId, KinematicSnapshot, MissionStoreState, MissionType, InjuryLimitation, PersonalizedRoutinePlan, ResistanceExerciseId, StorageLike, TelemetrySyncClient, WorkoutDateRange } from '../core/types';

interface ProviderOptions { children: ReactNode; storage?: StorageLike; syncClient?: TelemetrySyncClient; now?: () => string }
export const ROUTINE_UPDATE_MESSAGE = 'Your routine has been updated based on your recent progress.';
function useMissionController(options: ProviderOptions) {
  const storage = useRef(options.storage ?? createBrowserStorage()).current;
  const now = options.now ?? (() => new Date().toISOString());
  const clock = useRef(now); clock.current = now;
  const [, refreshClock] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      const untilMidnight = 86400000 - Date.parse(clock.current()) % 86400000;
      timer = setTimeout(() => { refreshClock(value => value + 1); schedule(); }, untilMidnight + 1);
    };
    const refresh = () => { refreshClock(value => value + 1); schedule(); };
    schedule();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const client = useRef(options.syncClient ?? createSupabaseSyncAdapter()).current;
  const initializeRoutine = (state: MissionStoreState) => persistMissionStore({ ...state,
    personalizedRoutine: state.personalizedRoutine ?? generatePersonalizedRoutine(state.profile, state.sessions, now()) }, storage);
  const [state, setState] = useState(() => {
    const missing = storage.getItem(MISSION_STORAGE_KEY) === null;
    return initializeRoutine(missing ? seedDemoMissionState(now(), storage) : loadMissionStore(storage, now()));
  });
  const current = useRef(state);
  const generation = useRef(0);
  const profileRevision = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  function publish(next: MissionStoreState) {
    current.current = persistMissionStore(next, storage); setState(current.current);
  }
  function saveWorkout(input: CompletedWorkoutInput) {
    try {
      const next = recordCompletedWorkout(current.current, computeSessionRecord(input, current.current.profile));
      if (next === current.current) return;
      publish(next.profile.autoAdjustRoutine !== false ? { ...next,
        personalizedRoutine: generatePersonalizedRoutine(next.profile, next.sessions, now()), routineNotification: ROUTINE_UPDATE_MESSAGE } : { ...next, routineNotification: '' });
      setWorkoutError(null);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setWorkoutError('Workout not saved: check the entered metrics and totals. Existing history is unchanged.');
    }
  }
  function recalibrateRoutine() {
    const latest = current.current;
    publish({ ...latest, personalizedRoutine: generatePersonalizedRoutine(latest.profile, latest.sessions, now()), routineNotification: ROUTINE_UPDATE_MESSAGE });
  }
  function applyPersonalizedRoutine(profile: AstronautProfile, personalizedRoutine: PersonalizedRoutinePlan) {
    const latest = withProfileDefaults(current.current.profile);
    const reviewed = { ...profile, id: latest.id, routeId: latest.routeId, autoAdjustRoutine: latest.autoAdjustRoutine };
    const next = { ...current.current, profile: withProfileDefaults(reviewed), personalizedRoutine: structuredClone(personalizedRoutine), routineNotification: ROUTINE_UPDATE_MESSAGE };
    if (!isMissionStoreState(next)) throw new RangeError('Invalid profile or personalized routine');
    profileRevision.current++; publish(next);
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
    generation.current++; setSyncError(null); setWorkoutError(null);
    publish(initializeRoutine(seed ? seedDemoMissionState(now()) : clearMissionStore()));
  }
  function setScheduleCompletion(exerciseId: ExerciseId, completed: boolean) {
    const day = new Date(now()).toISOString().slice(0, 10);
    publish({ ...current.current, scheduleCompletion: { ...current.current.scheduleCompletion, [day]: { ...current.current.scheduleCompletion[day], [exerciseId]: completed } } });
  }
  useEffect(() => { if (!syncing && !syncError) void flushSyncQueueNow(); }, [state.commsStatus, state.syncQueue.length, syncing, syncError]);
  return { state, ...measureMissionPayloads(state), nowIso: now(), missionRevision: generation.current, profileRevision: profileRevision.current, syncing, syncError, workoutError, saveWorkout, updateProfile, recalibrateRoutine, applyPersonalizedRoutine, setCommsStatus, flushSyncQueueNow, setScheduleCompletion,
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
  const completed = mission.state.scheduleCompletion[new Date(mission.nowIso).toISOString().slice(0, 10)] ?? {};
  const personalizedRoutine = mission.state.personalizedRoutine ?? generatePersonalizedRoutine(mission.state.profile, mission.state.sessions, mission.nowIso);
  const todaySchedule = loadMissionCatalog().exercises.map(exercise => ({ ...exercise, completed: completed[exercise.id] ?? false, prescription: personalizedRoutine.items.find(item => item.exerciseId === exercise.id) }));
  const resistanceSchedule = todaySchedule.filter(exercise => exercise.kind === 'RESISTANCE');
  const next = resistanceSchedule.find(exercise => !exercise.completed) ?? resistanceSchedule[0];
  const missionDay = Math.floor((Date.parse(mission.nowIso) - earliest) / 86400000) + 1;
  const missionDurationDays = withProfileDefaults(mission.state.profile).missionDurationDays;
  return { missionDay, missionDurationDays, missionProgressPct: Math.min(100, missionDay / missionDurationDays * 100),
    completedExerciseCount: todaySchedule.filter(exercise => exercise.completed).length, strengthRetentionPct: telemetry.strengthRetentionPct,
    gravityScenarioDescription: describeGravityScenario(telemetry.strengthRetentionPct, getGravityProfileById(mission.state.profile.gravityProfileId)),
    todaySchedule, personalizedRoutine, routineNotification: mission.state.routineNotification ?? '', setScheduleCompletion: mission.setScheduleCompletion, initiateTodaysSession: () => { if (next) quickLaunchExercise?.(next.id); },
    statusIndicators: { isOfflineFirst: true, cameraReady, commsLinkStatus: mission.state.commsStatus, queuedSyncCount: mission.state.syncQueue.length }, quickLaunchExercise };
}
export const useDashboardTelemetry = useDashboardSummary;

export function useExpeditionJourney() {
  const { state, updateProfile } = useMissionTelemetry();
  const [showAllBadges, setShowAllBadges] = useState(false);
  const activeRoute = getPlanetaryRouteById(state.profile.routeId);
  const progress = computeExpeditionProgress(state.sessions, activeRoute);
  const totalTonnageKg = state.sessions.reduce((sum, s) => sum + s.resistanceVolumeKg, 0);
  const cardioKm = state.sessions.filter(s => loadMissionCatalog().exercises.some(e => e.id === s.exerciseId && e.kind === 'CARDIO')).reduce((sum, s) => sum + s.expeditionDistanceKm, 0);
  const badges = activeRoute.milestones.map(milestone => ({ ...milestone, isUnlocked: milestone.distanceKm <= progress.cumulativeDistanceKm }));
  return { ...progress, activeRoute, totalTonnageKg, cardioKm, resistanceEquivalentKm: progress.cumulativeDistanceKm - cardioKm,
    unlockedBadges: progress.unlockedMilestones, showAllBadges, setShowAllBadges, badges: badges.filter(badge => showAllBadges || badge.isUnlocked),
    nextWaypoint: activeRoute.milestones.find(m => m.distanceKm > progress.cumulativeDistanceKm) ?? null,
    selectRoute: (routeId: AstronautProfile['routeId']) => updateProfile({ routeId }) };
}

export function useMedicalTelemetry() {
  const { state, nowIso } = useMissionTelemetry();
  const [dateWindowDays, setWindow] = useState<7 | 14 | 30>(30);
  const [exportConfirmationMessage, setExportConfirmation] = useState('');
  const telemetry = computeMedicalTelemetry(state.sessions, state.profile, nowIso);
  const volumeSeries30d = telemetry.dailyRetentionSeries.map(point => ({ dateIso: point.dateIso, volumeKg: telemetry.sessions.filter(s => new Date(s.completedAtIso).toISOString().slice(0, 10) === point.dateIso).reduce((sum, s) => sum + s.resistanceVolumeKg, 0) }));
  const volumeSeries = volumeSeries30d.slice(-dateWindowDays);
  function exportFlightSurgeonReport(format: 'json' | 'csv' | 'pdf' = 'json') {
    const report = buildFlightSurgeonReport(telemetry, state.profile, { pendingCount: state.syncQueue.length, lastSyncedAtIso: state.lastSyncedAtIso }, nowIso);
    if (format === 'pdf') {
      window.print(); setExportConfirmation('Print dialog opened. Choose Save as PDF to save a copy.'); return report;
    }
    const url = URL.createObjectURL(new Blob([format === 'json' ? JSON.stringify(report.json, null, 2) : report.csv], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ares-flight-surgeon.${format}`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportConfirmation('Health telemetry report exported.');
    return report;
  }
  return { ...telemetry, retentionSeries30d: telemetry.dailyRetentionSeries,
    volumeSeries30d, retentionSeries: telemetry.dailyRetentionSeries.slice(-dateWindowDays), volumeSeries,
    visibleVolumeKg: volumeSeries.reduce((sum, point) => sum + point.volumeKg, 0), dateWindowDays,
    setDateWindowDays: (days: 7 | 14 | 30) => { setWindow(days); setExportConfirmation(''); }, exportConfirmationMessage,
    symmetryScoreAvg: telemetry.symmetryConsistencyPct, kinematicConsistencyScore: telemetry.symmetryConsistencyPct, exportFlightSurgeonReport };
}
export const useMedicalAnalytics = useMedicalTelemetry;

export function useWorkoutHistory() {
  const { state, nowIso } = useMissionTelemetry();
  const [searchQuery, setSearch] = useState('');
  const [dateRange, setRange] = useState<WorkoutDateRange>('ALL');
  const [requestedPage, setRequestedPage] = useState(1);
  const [selectedSessionId, setSelectedSession] = useState<string | null>(null);
  const [selectedSnapshot, setSnapshot] = useState<KinematicSnapshot | null>(null);
  const replayCanvasRef = useRef<HTMLCanvasElement>(null);
  const days = { LAST_7_DAYS: 7, LAST_14_DAYS: 14, LAST_30_DAYS: 30, ALL: Infinity }[dateRange];
  const now = Date.parse(nowIso);
  const start = Math.floor(now / 86400000) * 86400000 - (days - 1) * 86400000;
  const filtered = state.sessions.filter(session => `${session.exerciseId} ${getExerciseById(session.exerciseId).name} ${session.completedAtIso} ${session.id}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (dateRange === 'ALL' || (Date.parse(session.completedAtIso) >= start && Date.parse(session.completedAtIso) <= now)))
    .reverse().sort((a, b) => Date.parse(b.completedAtIso) - Date.parse(a.completedAtIso));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(requestedPage, totalPages);
  function resetSelection() { setRequestedPage(1); setSelectedSession(null); setSnapshot(null); }
  function selectSession(id: string) { setSelectedSession(id); setSnapshot(null); }
  function selectSnapshotForReplay(snapshot: KinematicSnapshot) {
    setSelectedSession(state.sessions.find(session => session.snapshots.includes(snapshot))?.id ?? null); setSnapshot(snapshot);
  }
  useEffect(() => { setRequestedPage(page); }, [page]);
  useEffect(() => { setSnapshot(null); setSelectedSession(null); }, [state.sessions]);
  useEffect(() => {
    const ctx = replayCanvasRef.current?.getContext('2d');
    if (ctx && selectedSnapshot) renderKinematicSnapshot(ctx, selectedSnapshot);
  }, [selectedSnapshot]);
  return { sessions: filtered.slice((page - 1) * 10, page * 10).map(session => ({ ...session, formStatus: getSessionFormStatus(session), formattedDuration: formatDurationMmSs(session.durationSec) })),
    searchQuery, setSearchQuery: (value: string) => { setSearch(value); resetSelection(); }, dateRange,
    setDateRange: (value: WorkoutDateRange) => { setRange(value); resetSelection(); }, page, totalPages, totalSessions: filtered.length,
    setPage: (value: number) => setRequestedPage(Math.max(1, Math.min(totalPages, Math.floor(value)))),
    selectedSession: state.sessions.find(session => session.id === selectedSessionId) ?? null, selectSession,
    selectedSnapshot, selectSnapshotForReplay, replayCanvasRef };
}

export function useMissionProfile() {
  const mission = useMissionTelemetry();
  const profile = withProfileDefaults(mission.state.profile);
  const [edits, setEdits] = useState<ProfileEdits>({});
  const [fieldErrors, setFieldErrors] = useState<ProfileEdits>({});
  const [profileConfirmationMessage, setConfirmation] = useState('');
  const [clearConfirmationPending, setClearPending] = useState(false);
  const profileFieldValue = (field: ProfileField) => edits[field] ?? readProfileField(profile, field);
  const candidate = profileWithFields(profile, edits);
  let bmi: number | null = null;
  try { bmi = calculateBmi(candidate.bodyWeightKg, candidate.heightCm); } catch { /* Keep invalid drafts editable. */ }
  function setProfileField(field: ProfileField, value: string) {
    const next = { ...edits, [field]: value }, errors = validateProfileFields(profile, next);
    setEdits(next); setFieldErrors(errors); setConfirmation('');
    if (!Object.keys(errors).length) mission.updateProfile(profileWithFields(profile, next));
  }
  function applyProfile(): boolean {
    const errors = validateProfileFields(profile, edits); setFieldErrors(errors);
    if (Object.keys(errors).length) return false;
    mission.updateProfile(candidate); setConfirmation('Profile saved.'); return true;
  }
  function resetForm() { setEdits({}); setFieldErrors({}); setClearPending(false); }
  function confirmClearLocalData() {
    if (!clearConfirmationPending) return;
    mission.clearLocalCache(); resetForm(); setConfirmation('Local data cleared.');
  }
  useEffect(() => { resetForm(); }, [mission.profileRevision, mission.missionRevision]);
  return { astronautProfile: profile, updateProfile: mission.updateProfile, gravityProfile: profile.gravityProfileId, bmi,
    profileFieldValue, setProfileField, fieldErrors, applyProfile, profileConfirmationMessage,
    recalibrateRoutine: () => { if (applyProfile()) mission.recalibrateRoutine(); },
    setInjuryLimitation: (injuryLimitations: InjuryLimitation) => { mission.updateProfile({ injuryLimitations }); setConfirmation(''); },
    setMissionType: (missionType: MissionType) => {
      const duration = rules.missions[missionType].durationDays;
      mission.updateProfile({ missionType, missionDurationDays: duration });
      const next = { ...edits, missionDurationDays: String(duration) }; setEdits(next); setFieldErrors(validateProfileFields(profile, next)); setConfirmation('');
    },
    setAutoAdjustRoutine: (autoAdjustRoutine: boolean) => mission.updateProfile({ autoAdjustRoutine }),
    clearConfirmationPending, cancelClearLocalData: () => setClearPending(false), confirmClearLocalData,
    setGravityProfile: (gravityProfileId: AstronautProfile['gravityProfileId']) => mission.updateProfile({ gravityProfileId }), commsStatus: mission.state.commsStatus,
    toggleCommsWindow: mission.toggleCommsWindow, flushSyncQueueNow: mission.flushSyncQueueNow,
    seed30DayDemoData: () => { mission.seed30DayDemoData(); resetForm(); setConfirmation('Demo mission loaded.'); }, clearLocalCache: () => setClearPending(true) };
}
