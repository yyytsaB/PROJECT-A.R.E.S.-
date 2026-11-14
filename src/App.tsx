import { useEffect, useRef, useState } from 'react';
import { getExerciseById, loadMissionCatalog } from './core/catalog/missionCatalog';
import { describeSnapshotDiagnostic, faultAlerts } from './core/kinematics/kinematicMath';
import { formatDurationMmSs, getSessionFormStatus } from './core/telemetry/telemetryEngine';
import type { CardioExerciseId, GravityProfileId, KinematicSnapshot, InjuryLimitation, MissionType, PlanetaryRouteId, RepMachineState, ResistanceExerciseId, WorkoutDateRange } from './core/types';
import { renderKinematicSnapshot } from './adapters/poseCanvasRenderer';
import { useWorkoutArena } from './hooks/useWorkoutArena';
import { useAppNavigation } from './hooks/useAppNavigation';
import { OnboardingSection, RoutinePrescription } from './OnboardingSection';
import { HealthMetricFields } from './HealthMetricFields';
import routineRules from './content/routineRules.json';
import scienceSources from './content/scienceSources.json';
import { MissionTelemetryProvider, useDashboardSummary, useExpeditionJourney, useMedicalTelemetry, useMissionProfile, useMissionTelemetry, useWorkoutHistory } from './hooks/useMissionTelemetry';

export default function App() {
  return <MissionTelemetryProvider><MissionApp /></MissionTelemetryProvider>;
}

function SnapshotDiagnostic({ snapshot, label }: { snapshot: KinematicSnapshot | null; label: string }) {
  const exercise = snapshot && getExerciseById(snapshot.exerciseId);
  return snapshot && exercise?.kind === 'RESISTANCE'
    ? <p aria-label={label}>{describeSnapshotDiagnostic(snapshot, exercise)}</p> : null;
}

function MissionApp() {
  const navigation = useAppNavigation();
  const mainRef = useRef<HTMLElement>(null);
  const catalog = loadMissionCatalog();
  const mission = useMissionTelemetry();
  const [loadKg, setLoadKg] = useState(getExerciseById('SQUAT').defaultLoadKg);
  const [cardioExercise, setCardioExercise] = useState<CardioExerciseId>('TREADMILL');
  const [cardioDistance, setCardioDistance] = useState('5');
  const [summary, setSummary] = useState<RepMachineState | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<KinematicSnapshot | null>(null);
  const replayCanvas = useRef<HTMLCanvasElement>(null);
  const arena = useWorkoutArena({ onCompleted: (state, durationSec) => {
    setSummary(state);
    if (state.repCount > 0) mission.saveWorkout({ id: crypto.randomUUID(), exerciseId: state.exerciseId, completedAtIso: new Date().toISOString(),
      durationSec, sets: 1, reps: state.repCount, loadKg, cardioDistanceKm: 0, formAccuracyPct: state.formAccuracyPct,
      symmetryScorePct: state.peakAnalysis?.symmetryScorePct ?? 100, snapshots: state.snapshots });
  } });
  const dashboard = useDashboardSummary(id => { arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay(); void arena.start('SIMULATED'); }, arena.mode === 'LIVE' && arena.isRunning);
  const journey = useExpeditionJourney();
  const medical = useMedicalTelemetry();
  const history = useWorkoutHistory();
  const settings = useMissionProfile();
  const clearDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = clearDialog.current;
    if (settings.clearConfirmationPending && dialog && !dialog.open) dialog.showModal();
    else if (!settings.clearConfirmationPending && dialog?.open) dialog.close();
  }, [settings.clearConfirmationPending]);
  const resetDisplay = () => { setSummary(null); setSelectedSnapshot(null); };
  useEffect(() => {
    const ctx = replayCanvas.current?.getContext('2d');
    if (ctx && selectedSnapshot) renderKinematicSnapshot(ctx, selectedSnapshot);
  }, [selectedSnapshot]);
  return <>
    <a href="#main-content" onClick={() => mainRef.current?.focus()}>Skip to main content</a>
    <nav aria-label="Mission sections"><ul>{navigation.pages.map(page => <li key={page.id}>
      <a href={`#${page.headingId}`} aria-current={navigation.activePage === page.id ? 'page' : undefined} onClick={() => navigation.setActivePage(page.id)}>{page.label}</a>
    </li>)}</ul></nav>
    <main ref={mainRef} id="main-content" tabIndex={-1}>
    <h1>Project A.R.E.S. Command Center</h1>
    <section aria-labelledby="command-heading">
      <h2 id="command-heading">Command Center</h2>
      <p>Mission day: {dashboard.missionDay}. Offline-first storage active.</p>
      <p>Strength retention: <output aria-label="Strength retention">{medical.strengthRetentionPct.toFixed(1)}%</output></p>
      <p><output aria-label="Gravity scenario comparison">{dashboard.gravityScenarioDescription}</output></p>
      <p>Team-defined prototype goals; not NASA standards or clinical clearance.</p>
      <p>Comms: <output aria-label="Comms status">{settings.commsStatus}</output>. Queued: <output aria-label="Queued sync count">{mission.state.syncQueue.length}</output></p>
      <p><output aria-label="Queue and snapshot sizes">{mission.state.syncQueue.length} queued session summaries · Queued payload: {(mission.queuedPayloadBytes / 1000).toFixed(1)} KB · Pose snapshots retained locally ({(mission.retainedSnapshotBytes / 1000).toFixed(1)} KB)</output> · Local cache used: <output aria-label="Local cache used">{(mission.localCacheBytes / 1000).toFixed(1)} KB</output></p>
      <p>Serialized JSON sizes; 1 KB = 1,000 bytes.</p>
      <p>Saved sessions: <output aria-label="Saved session count">{mission.state.sessions.length}</output>. Acknowledged: <output aria-label="Acknowledged session count">{mission.state.acknowledgements.length}</output></p>
      <h3>Today’s exercise schedule</h3>
      <p aria-label="Personalized routine label">{dashboard.personalizedRoutine.summaryLabel}</p>
      <p>{dashboard.personalizedRoutine.disclaimer}</p>
      <p>Prototype targets are for review; ARED load remains manually configurable in the Workout Arena.</p>
      <p role="status" aria-label="Routine update notification">{dashboard.routineNotification}</p>
      <p>Sample schedule for the UTC mission day; times are demo settings.</p>
      <button disabled={arena.sessionStatus === 'STARTING'} onClick={dashboard.initiateTodaysSession}>INITIATE TODAY'S SESSION</button>
      <ul aria-label="Personalized daily schedule">{dashboard.todaySchedule.map(exercise => <li key={exercise.id}>
        <time dateTime={exercise.scheduledTime}>{exercise.scheduledTime}</time>{' '}
        <label><input type="checkbox" aria-label={`Mark ${exercise.name} complete`} checked={exercise.completed} onChange={e => dashboard.setScheduleCompletion(exercise.id, e.target.checked)} />{exercise.name}</label>{' '}
        {exercise.kind === 'RESISTANCE' && <button onClick={() => dashboard.quickLaunchExercise?.(exercise.id)}>Quick launch {exercise.name}</button>}
        {exercise.prescription && <p><RoutinePrescription item={exercise.prescription} /> — {exercise.prescription.rationale}</p>}
      </li>)}</ul>
      <form onSubmit={event => {
        event.preventDefault(); const distance = Number(cardioDistance);
        if (!Number.isFinite(distance) || distance <= 0) return;
        mission.saveWorkout({ durationSec: 0, id: crypto.randomUUID(), exerciseId: cardioExercise, completedAtIso: new Date().toISOString(), sets: 0, reps: 0, loadKg: 0,
          cardioDistanceKm: distance, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] });
      }}>
        <label htmlFor="cardio-exercise">Cardio exercise</label>{' '}<select id="cardio-exercise" value={cardioExercise} onChange={e => setCardioExercise(e.target.value as CardioExerciseId)}>{catalog.exercises.filter(e => e.kind === 'CARDIO').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>{' '}
        <label htmlFor="cardio-distance">Cardio distance (km)</label>{' '}<input id="cardio-distance" type="number" min="0.01" step="0.01" required value={cardioDistance} onChange={e => setCardioDistance(e.target.value)} />{' '}
        <button type="submit">Log cardio session</button>
      </form>
    </section>
    <OnboardingSection />
    <section aria-labelledby="exercises-heading">
      <h2 id="exercises-heading">ARED resistance exercises</h2>
      <ul aria-label="ARED resistance exercises">
        {catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => <li key={e.id}>{e.name}</li>)}
      </ul>
    </section>
    <section aria-labelledby="routes-heading">
      <h2 id="routes-heading">Planetary routes</h2>
      <ul aria-label="Planetary routes">
        {catalog.routes.map(r => <li key={r.id}>{r.name}: {r.totalDistanceKm} km</li>)}
      </ul>
    </section>
    <section aria-labelledby="arena-heading">
      <h2 id="arena-heading">AI Workout Arena</h2>
      <fieldset><legend>Audio/Visual Cues</legend>
        <label><input type="checkbox" aria-label="Voice Coach" checked={arena.voiceEnabled} onChange={e => arena.setVoiceEnabled(e.target.checked)} /> Voice Coach</label>{' '}
        <label><input type="checkbox" aria-label="Visual overlay" checked={arena.visualOverlayEnabled} onChange={e => arena.setVisualOverlayEnabled(e.target.checked)} /> Visual overlay</label>
      </fieldset>
      <p><output aria-label="Voice Coach status" aria-live="polite">{arena.voiceCoachStatus}</output></p>
      <label htmlFor="arena-exercise">Exercise</label>{' '}<select id="arena-exercise" value={arena.state.exerciseId} onChange={e => {
        const id = e.target.value as ResistanceExerciseId; arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay();
      }}>
        {catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <label htmlFor="ared-load">ARED load (kg)</label>{' '}<input id="ared-load" type="number" min="0" step="1" value={loadKg} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0) setLoadKg(value); }} />
      <p>
        <button disabled={arena.sessionStatus === 'STARTING'} onClick={() => { resetDisplay(); void arena.start('LIVE'); }}>Start webcam</button>{' '}
        <button disabled={arena.sessionStatus === 'STARTING'} onClick={() => { resetDisplay(); void arena.start('SIMULATED'); }}>Start simulator</button>{' '}
        <button disabled={!arena.isRunning} onClick={arena.pause}>Pause</button>{' '}
        <button disabled={arena.sessionStatus !== 'PAUSED'} onClick={arena.resume}>Resume</button>{' '}
        <button disabled={!['RUNNING', 'PAUSED', 'STARTING'].includes(arena.sessionStatus)} onClick={() => arena.stop()}>End session</button>
      </p>
      <p>
        {(['GOOD', 'SHALLOW', 'SPINE_FAULT'] as const).map((kind, i) => <button key={kind}
          disabled={(arena.sessionStatus === 'STARTING' && arena.mode !== 'LIVE') || arena.sessionStatus === 'PAUSED'}
          onClick={() => { resetDisplay(); void arena.triggerSimulatedRep(kind); }}>
          {['Simulate Good Rep', 'Simulate Shallow Rep', 'Simulate Spine Fault'][i]}
        </button>)}
      </p>
      <p>Session: <output aria-label="Session status">{arena.sessionStatus}</output>{' '}
        Duration: <output aria-label="Workout duration">{formatDurationMmSs(arena.elapsedSeconds)}</output>{' '}
        Reps: <output aria-label="Completed reps">{arena.state.repCount}</output>{' '}
        Phase: <output aria-label="Rep phase">{arena.state.phase}</output>{' '}
        Peak ROM: <output aria-label="Peak ROM">{Math.round(arena.maxRomPct)}%</output></p>
      {arena.errorMessage && <p role="alert">{arena.errorMessage}</p>}
      <ul aria-label="Form alerts" aria-live="polite">{arena.activeFaultAlerts.map(alert => <li key={alert}>{alert}</li>)}</ul>
      <p aria-label="Form feedback" role="status">{arena.formFeedback}</p>
      <video ref={arena.videoRef} aria-label="Live camera preview" width={640} height={480} muted playsInline
        hidden={arena.mode !== 'LIVE' || !['STARTING', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus)} />
      <canvas ref={arena.canvasRef} aria-label="Live skeletal pose" width={640} height={480} hidden={!arena.visualOverlayEnabled}>Live pose wireframe and joint angle display.</canvas>
      {summary && <p aria-label="Completed workout summary">Session complete: {summary.repCount} reps; {summary.faultedRepCount} flagged; {Math.round(summary.formAccuracyPct)}% form accuracy.</p>}
    </section>
    <section aria-labelledby="journey-heading">
      <h2 id="journey-heading">Expedition Journey</h2>
      <label htmlFor="active-route">Active route</label>{' '}<select id="active-route" value={journey.activeRoute.id} onChange={e => journey.selectRoute(e.target.value as PlanetaryRouteId)}>{catalog.routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}</select>
      <p>Distance: <output aria-label="Expedition distance">{journey.cumulativeDistanceKm.toFixed(2)} km</output>. Progress: {journey.progressPct.toFixed(3)}%</p>
      <progress aria-label="Route progress" max={100} value={journey.progressPct} />
      <p>Cardio: {journey.cardioKm.toFixed(2)} km; resistance equivalent: {journey.resistanceEquivalentKm.toFixed(2)} km; tonnage: {journey.totalTonnageKg.toFixed(0)} kg.</p>
      <button aria-pressed={journey.showAllBadges} onClick={() => journey.setShowAllBadges(!journey.showAllBadges)}>View all badges</button>
      <ul aria-label="Mission badges">{journey.badges.map(badge => <li key={badge.id}>{badge.name} · {badge.isUnlocked ? 'Unlocked' : 'Locked'} · {badge.description}</li>)}</ul>
      <p>Next waypoint: {journey.nextWaypoint ? `${journey.nextWaypoint.name} at ${journey.nextWaypoint.distanceKm} km` : 'Route complete'}</p>
    </section>
    <section aria-labelledby="medical-heading">
      <h2 id="medical-heading">Medical Telemetry</h2>
      <label htmlFor="telemetry-date-window">Telemetry date window</label>{' '}<select id="telemetry-date-window" value={medical.dateWindowDays} onChange={e => medical.setDateWindowDays(Number(e.target.value) as 7 | 14 | 30)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
      <p>{medical.dateWindowDays}-day tonnage: <output aria-label="Visible volume">{medical.visibleVolumeKg.toFixed(0)} kg</output>. Symmetry consistency (30 days): {medical.symmetryScoreAvg.toFixed(1)}%.</p>
      <p>Chart windows show rolling 30-day scores. JSON/CSV reports include the full 30-day reporting period.</p>
      <table aria-label="Medical telemetry"><thead><tr><th>Date (UTC)</th><th>Strength retention (%)</th><th>Volume (kg)</th></tr></thead><tbody>{medical.retentionSeries.map((point, index) => <tr key={point.dateIso}><td>{point.dateIso}</td><td>{point.strengthRetentionPct.toFixed(1)}</td><td>{medical.volumeSeries[index].volumeKg.toFixed(0)}</td></tr>)}</tbody></table>
      <ul aria-label="Fault counts">{Object.entries(medical.faultCounts).map(([fault, count]) => <li key={fault}>{fault}: {count}</li>)}</ul>
      <button onClick={() => medical.exportFlightSurgeonReport('json')}>Export Flight Surgeon JSON</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('csv')}>Export Flight Surgeon CSV</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('pdf')}>Print / Save as PDF</button>
      <p aria-label="Export confirmation" role="status">{medical.exportConfirmationMessage}</p>
    </section>
    <section aria-labelledby="history-heading">
      <h2 id="history-heading">Workout Logs &amp; History</h2>
      <label htmlFor="workout-search">Search workouts</label>{' '}<input id="workout-search" type="search" value={history.searchQuery} onChange={e => history.setSearchQuery(e.target.value)} />{' '}
      <label htmlFor="history-date-range">Workout date range</label>{' '}<select id="history-date-range" value={history.dateRange} onChange={e => history.setDateRange(e.target.value as WorkoutDateRange)}>
        <option value="ALL">All dates</option><option value="LAST_7_DAYS">Last 7 days</option><option value="LAST_14_DAYS">Last 14 days</option><option value="LAST_30_DAYS">Last 30 days</option>
      </select>
      <p>GREEN / YELLOW / RED indicate prototype form status, not medical clearance.</p>
      <table aria-label="Workout history">
        <thead><tr><th>Completed (UTC)</th><th>Exercise</th><th>Duration (MM:SS)</th><th>Status</th><th>Reps</th><th>Volume (kg)</th><th>Form (%)</th><th>Sync</th><th>Details / flagged reps</th></tr></thead>
        <tbody>{history.sessions.map(session => <tr key={session.id}>
          <td>{session.completedAtIso}</td><td>{session.exerciseId}</td><td>{session.formattedDuration}</td><td>{session.formStatus}</td><td>{session.sets * session.reps}</td>
          <td>{session.resistanceVolumeKg.toFixed(0)}</td><td>{session.formAccuracyPct.toFixed(1)}</td><td>{mission.state.acknowledgements.some(a => a.sessionId === session.id) ? 'SYNCED' : 'QUEUED_BLACKOUT'}</td>
          <td><button onClick={() => history.selectSession(session.id)}>Details</button>{' '}{session.snapshots.map(snapshot => <button key={snapshot.repNumber} onClick={() => history.selectSnapshotForReplay(snapshot)}>Replay saved rep {snapshot.repNumber}</button>)}</td>
        </tr>)}</tbody>
      </table>
      {!history.totalSessions && <p>No workouts match these filters.</p>}
      <p><button disabled={history.page === 1} onClick={() => history.setPage(history.page - 1)}>Previous page</button>{' '}
        <output aria-label="History pagination">Page {history.page} of {history.totalPages}</output>{' '}
        <button disabled={history.page === history.totalPages} onClick={() => history.setPage(history.page + 1)}>Next page</button></p>
      <section aria-label="Session details" hidden={!history.selectedSession}>
        <h3>Session Details</h3>
        {history.selectedSession && <>
          <p>{history.selectedSession.exerciseId} · {history.selectedSession.completedAtIso} · {formatDurationMmSs(history.selectedSession.durationSec)} · {getSessionFormStatus(history.selectedSession)}</p>
          <p>Sets: {history.selectedSession.sets}; reps per set: {history.selectedSession.reps}; load: {history.selectedSession.loadKg} kg; volume: {history.selectedSession.resistanceVolumeKg} kg.</p>
          <p>Form: {history.selectedSession.formAccuracyPct.toFixed(1)}%; symmetry: {history.selectedSession.symmetryScorePct.toFixed(1)}%; distance: {history.selectedSession.cardioDistanceKm} km.</p>
          <p>Flagged issues: {[...new Set(history.selectedSession.snapshots.flatMap(snapshot => snapshot.faultFlags))].map(flag => faultAlerts[flag]).join(', ') || 'None'}</p>
          {history.selectedSession.snapshots.map(snapshot => <button key={snapshot.repNumber} onClick={() => history.selectSnapshotForReplay(snapshot)}>Replay detail rep {snapshot.repNumber}</button>)}
        </>}
        <canvas ref={history.replayCanvasRef} aria-label="Saved snapshot replay" width={640} height={480} hidden={!history.selectedSnapshot}>Saved flagged rep skeletal replay.</canvas>
        <SnapshotDiagnostic snapshot={history.selectedSnapshot} label="Saved snapshot diagnostic" />
      </section>
    </section>
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading">Profile &amp; Mission Settings</h2>
      <label htmlFor="body-weight">Body weight (kg)</label>{' '}<input id="body-weight" type="number" min="0.1" step="0.1" value={settings.profileFieldValue('bodyWeightKg')} aria-invalid={Boolean(settings.fieldErrors.bodyWeightKg)} aria-describedby="body-weight-error" onChange={e => settings.setProfileField('bodyWeightKg', e.target.value)} />
      <p id="body-weight-error" role={settings.fieldErrors.bodyWeightKg ? 'alert' : undefined}>{settings.fieldErrors.bodyWeightKg}</p>
      <label htmlFor="astronaut-name">Astronaut name</label>{' '}<input id="astronaut-name" value={settings.profileFieldValue('name')} aria-invalid={Boolean(settings.fieldErrors.name)} aria-describedby="astronaut-name-error" onChange={e => settings.setProfileField('name', e.target.value)} />
      <p id="astronaut-name-error" role={settings.fieldErrors.name ? 'alert' : undefined}>{settings.fieldErrors.name}</p>
      <label htmlFor="gravity-profile">Gravity profile</label>{' '}<select id="gravity-profile" value={settings.gravityProfile} onChange={e => settings.setGravityProfile(e.target.value as GravityProfileId)}>{catalog.gravityProfiles.map(g => <option key={g.id} value={g.id}>{g.name} ({g.gravityG}g)</option>)}</select>
      <section aria-labelledby="health-metrics-heading">
        <h3 id="health-metrics-heading">Update Health Metrics</h3>
        <HealthMetricFields prefix="settings" fieldValue={settings.profileFieldValue} setField={settings.setProfileField} errors={settings.fieldErrors} bmi={settings.bmi} includeWeight={false} />
        <label htmlFor="settings-injury-limitations">Injury or physical limitation</label>{' '}<select id="settings-injury-limitations" value={settings.astronautProfile.injuryLimitations} onChange={event => settings.setInjuryLimitation(event.target.value as InjuryLimitation)}>{Object.entries(routineRules.limitations).map(([id, rule]) => <option key={id} value={id}>{rule.label}</option>)}</select>{' '}
        <label htmlFor="settings-injuryNotes">Limitation notes (optional)</label>{' '}<input id="settings-injuryNotes" value={settings.profileFieldValue('injuryNotes')} onChange={event => settings.setProfileField('injuryNotes', event.target.value)} />{' '}
        <label htmlFor="settings-mission-type">Mission type</label>{' '}<select id="settings-mission-type" value={settings.astronautProfile.missionType} onChange={event => settings.setMissionType(event.target.value as MissionType)}>{Object.entries(routineRules.missions).map(([id, mission]) => <option key={id} value={id}>{mission.label}</option>)}</select>{' '}
        <label htmlFor="settings-missionDurationDays">Mission duration (days)</label>{' '}<input id="settings-missionDurationDays" type="number" min="1" step="1" value={settings.profileFieldValue('missionDurationDays')} onChange={event => settings.setProfileField('missionDurationDays', event.target.value)} aria-invalid={Boolean(settings.fieldErrors.missionDurationDays)} aria-describedby="settings-mission-duration-error" />
        <p id="settings-mission-duration-error" role={settings.fieldErrors.missionDurationDays ? 'alert' : undefined}>{settings.fieldErrors.missionDurationDays}</p>
        <button onClick={settings.recalibrateRoutine}>Recalibrate Routine</button>{' '}
        <label><input type="checkbox" aria-label="Auto-adjust routine based on progress" checked={settings.astronautProfile.autoAdjustRoutine} onChange={event => settings.setAutoAdjustRoutine(event.target.checked)} /> Auto-adjust routine based on progress</label>
      </section>
      <fieldset><legend>Earth 1RM baselines (kg)</legend>{Object.keys(settings.astronautProfile.earthBaseline1RM).map(key => {
        const id = key as ResistanceExerciseId;
        return <div key={id}><label htmlFor={`baseline-${id}`}>{id} <input id={`baseline-${id}`} aria-label={`${id} Earth baseline (kg)`} aria-invalid={Boolean(settings.fieldErrors[id])} aria-describedby={`baseline-${id}-error`} type="number" min="0.1" step="any" value={settings.profileFieldValue(id)} onChange={e => settings.setProfileField(id, e.target.value)} /></label><p id={`baseline-${id}-error`} role={settings.fieldErrors[id] ? 'alert' : undefined}>{settings.fieldErrors[id]}</p></div>;
      })}</fieldset>
      <button onClick={settings.applyProfile}>Save / Apply</button>
      <p aria-label="Profile confirmation" role="status">{settings.profileConfirmationMessage}</p>
      <button onClick={settings.toggleCommsWindow}>{settings.commsStatus === 'WINDOW_OPEN' ? 'Close comms window' : 'Open comms window'}</button>{' '}
      <button disabled={mission.syncing || settings.commsStatus !== 'WINDOW_OPEN'} onClick={() => void settings.flushSyncQueueNow()}>Flush sync queue now</button>{' '}
      <output aria-label="Sync activity">{mission.syncing ? 'Syncing' : 'Idle'}</output>
      {mission.syncError && <p role="status">{mission.syncError}</p>}
      <p>Last sync: {mission.state.lastSyncedAtIso ?? 'Never'}</p>
      <button onClick={settings.seed30DayDemoData}>Seed 30-Day Mars Demo Data</button>{' '}
      <button onClick={settings.clearLocalCache}>Clear Local Data</button>
      <dialog ref={clearDialog} aria-labelledby="clear-data-heading" aria-describedby="clear-data-warning" onCancel={event => { event.preventDefault(); settings.cancelClearLocalData(); }}>
        <h3 id="clear-data-heading">Clear all local mission data?</h3>
        <p id="clear-data-warning">This removes saved workouts, snapshots, queued summaries and profile settings from this browser. This cannot be undone.</p>
        <button onClick={() => { arena.selectExercise(arena.state.exerciseId as ResistanceExerciseId); resetDisplay(); settings.confirmClearLocalData(); }}>Confirm clear</button>{' '}
        <button onClick={settings.cancelClearLocalData}>Cancel clear</button>
      </dialog>
    </section>
    <section aria-labelledby="replay-heading">
      <h2 id="replay-heading">Kinematic Snapshot Replay</h2>
      <ul aria-label="Flagged reps">{arena.state.snapshots.map(snapshot => <li key={snapshot.repNumber}>
        <button onClick={() => setSelectedSnapshot(snapshot)}>Replay rep {snapshot.repNumber}</button>
      </li>)}</ul>
      <canvas ref={replayCanvas} aria-label="Kinematic snapshot replay" width={640} height={480} hidden={!selectedSnapshot}>Flagged rep skeletal replay with red fault highlights.</canvas>
      <SnapshotDiagnostic snapshot={selectedSnapshot} label="Current snapshot diagnostic" />
    </section>
    <section aria-labelledby="science-sources-heading">
      <h2 id="science-sources-heading">NASA Data &amp; Space Agency Partner Sources</h2>
      <p>NASA resources inform the exercise problem and catalog geography. Research references and planned data integrations are identified below.</p>
      <p>CSA, ESA, and JAXA are listed among the <a href="https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/">2026 NASA Space Apps Space Agency Partners</a>.</p>
      <ul>{scienceSources.map(source => <li key={source.title}>
        <h3>{source.title}</h3>
        <p>{source.description}</p>
        <p>{source.links.map((link, index) => <span key={link.url}>{index > 0 && ' · '}<a href={link.url}>{link.label}</a></span>)}</p>
      </li>)}</ul>
    </section>
  </main></>;
}
