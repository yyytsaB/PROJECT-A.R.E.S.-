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
import prototypeNotice from './content/prototypeNotice.json';
import { MissionTelemetryProvider, useDashboardSummary, useExpeditionJourney, useMedicalTelemetry, useMissionProfile, useMissionTelemetry, useWorkoutHistory } from './hooks/useMissionTelemetry';
import { MissionIcon, ProgressRing, RouteArtwork, TelemetryChart } from './components/MissionVisuals';

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
  const dashboard = useDashboardSummary(id => { arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay(); navigation.navigateToPage('arena'); void arena.start('SIMULATED'); }, arena.mode === 'LIVE' && arena.isRunning);
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
    <a className="skip-link" href="#main-content" onClick={() => mainRef.current?.focus()}>Skip to main content</a>
    <div className="mission-shell">
    <aside className="mission-sidebar">
      <div className="mission-brand"><img src="/assets/ares-mark.svg" alt="A.R.E.S. mission emblem" width="56" height="56" /><div><strong>A.R.E.S.</strong><span>Resistance &amp; Exercise</span></div></div>
      <p className="nav-caption">MISSION CONTROL</p>
      <nav aria-label="Mission sections"><ul>{navigation.pages.map(page => <li key={page.id}>
        <a href={`#${page.headingId}`} aria-current={navigation.activePage === page.id ? 'page' : undefined} onClick={() => navigation.setActivePage(page.id)}><MissionIcon name={page.id} />{page.label}</a>
      </li>)}</ul></nav>
      <div className="sidebar-footer"><a className="crew-profile" href="#settings-heading" onClick={() => navigation.setActivePage('settings')}><span className="crew-avatar" aria-hidden="true">{settings.astronautProfile.name.slice(0, 1).toUpperCase()}</span><span><strong>{settings.astronautProfile.name}</strong><small><span className="system-dot" />Local crew profile</small></span><MissionIcon name="settings" /></a><small>SPACE APPS 2026 · TEAM PROTOTYPE</small></div>
    </aside>
    <div className="mission-workspace">
    <header className="mission-topbar">
      <label className="section-jump"><MissionIcon name="dashboard" /><span className="visually-hidden">Jump to mission section</span><select aria-label="Jump to mission section" value={navigation.activePage} onChange={event => {
        const page = navigation.pages.find(item => item.id === event.target.value);
        if (page) navigation.navigateToPage(page.id);
      }}>{navigation.pages.map(page => <option key={page.id} value={page.id}>{page.label}</option>)}</select></label>
      <div className="topbar-actions"><span className="connection-chip" data-open={settings.commsStatus === 'WINDOW_OPEN'}><span className="system-dot" />{settings.commsStatus === 'WINDOW_OPEN' ? 'COMMS WINDOW OPEN' : '24-MIN COMMS BLACKOUT'}</span>
      <a className="queue-shortcut" href="#settings-heading" onClick={() => navigation.setActivePage('settings')} aria-label={`Open sync settings, ${mission.state.syncQueue.length} summaries pending`}><MissionIcon name="sync" /><span>{mission.state.syncQueue.length}</span></a>
      <a className="topbar-start" href="#arena-heading" onClick={() => navigation.setActivePage('arena')}><MissionIcon name="play" /><span>Start session</span></a></div>
    </header>
    <main ref={mainRef} id="main-content" tabIndex={-1}>
    <div className="page-heading"><div><p className="eyebrow">PROJECT A.R.E.S. · MISSION OPERATIONS</p>
    <h1>Project A.R.E.S. Command Center</h1>
    <p>Your physical readiness at a glance. Every session moves the mission forward.</p></div><span className="prototype-chip">TEAM PROTOTYPE</span></div>
    <section className="mission-section command-section" aria-labelledby="command-heading">
      <div className="section-heading"><p className="eyebrow">YOUR MISSION AT A GLANCE</p>
      <h2 id="command-heading">Command Center</h2>
      </div>
      <div className="dashboard-grid">
      <div className="readiness-card">
      <span className="card-kicker">Strength Retention Score</span>
      <p>Mission day: {dashboard.missionDay}. Offline-first storage active.</p>
      <ProgressRing value={medical.strengthRetentionPct}><span className="ring-kicker">Strength retention:</span><output aria-label="Strength retention">{medical.strengthRetentionPct.toFixed(1)}%</output><span className="ring-footnote">ROLLING 30 DAYS</span></ProgressRing>
      <p><output aria-label="Gravity scenario comparison">{dashboard.gravityScenarioDescription}</output></p>
      <p className="prototype-note">Team-defined prototype goals; not NASA standards or clinical clearance.</p>
      <p className="prototype-note">{prototypeNotice.metricInterpretation}</p>
      </div>
      <div className="mission-progress-card">
        <span className="card-kicker">Mission Progress</span><p>{routineRules.missions[settings.astronautProfile.missionType].label} · {catalog.gravityProfiles.find(gravity => gravity.id === settings.gravityProfile)?.name}</p>
        <p className="mission-day-value"><strong>{dashboard.missionDay}</strong><span>/ {dashboard.missionDurationDays} days</span></p>
        <progress aria-label="Mission duration progress" max={100} value={dashboard.missionProgressPct} />
        <p>{dashboard.missionProgressPct.toFixed(1)}% of planned duration · Mission day is derived from locally recorded history.</p>
        <figure className="mission-route-preview"><RouteArtwork activeRoute={journey.activeRoute} routes={catalog.routes} preview /><figcaption>{journey.activeRoute.name} <span>{journey.cumulativeDistanceKm.toFixed(1)} km traversed</span></figcaption></figure>
        <a className="text-action" href="#journey-heading" onClick={() => navigation.setActivePage('journey')}>Explore your expedition <span aria-hidden="true">↗</span></a>
      </div></div>
      <dl className="system-status-strip" aria-label="Mission system indicators">
        <div><MissionIcon name="storage" /><dt>LOCAL STORAGE</dt><dd>Offline-first · {(mission.localCacheBytes / 1000).toFixed(1)} KB cached</dd></div>
        <div><MissionIcon name="camera" /><dt>CAMERA FEED</dt><dd>{dashboard.statusIndicators.cameraReady ? 'Live tracking active' : arena.mode === 'SIMULATED' && arena.isRunning ? 'Simulator active · no camera' : arena.sessionStatus === 'PAUSED' ? 'Tracking paused' : arena.sessionStatus === 'STARTING' ? 'Starting tracking' : arena.sessionStatus === 'IDLE' ? 'Not started' : 'Inactive'}</dd></div>
        <div><MissionIcon name="sync" /><dt>COMMS QUEUE</dt><dd>{mission.state.syncQueue.length} summaries pending · {settings.commsStatus === 'WINDOW_OPEN' ? 'Window open' : 'Blackout scenario'}</dd></div>
      </dl>
      <div className="command-lower-grid"><div className="schedule-card">
      <div className="schedule-heading"><div><span className="card-kicker">YOUR NEXT OBJECTIVE</span>
      <h3>Today’s exercise schedule</h3>
      <p aria-label="Personalized routine label">{dashboard.personalizedRoutine.summaryLabel}</p></div>
      <button className="primary-action" disabled={arena.sessionStatus === 'STARTING'} onClick={dashboard.initiateTodaysSession}>INITIATE TODAY'S SESSION</button></div>
      <p className="prototype-note">{dashboard.personalizedRoutine.disclaimer}</p>
      <p className="prototype-note">Prototype targets are for review; ARED load remains manually configurable in the Workout Arena.</p>
      <p className="success-message" role="status" aria-label="Routine update notification">{dashboard.routineNotification}</p>
      <p className="schedule-meta">{dashboard.completedExerciseCount} of {dashboard.todaySchedule.length} complete · Sample schedule for the UTC mission day; times are demo settings.</p>
      <ul className="daily-schedule" aria-label="Personalized daily schedule">{dashboard.todaySchedule.map(exercise => <li key={exercise.id} data-completed={exercise.completed}>
        <time dateTime={exercise.scheduledTime}>{exercise.scheduledTime}</time>{' '}
        <label><input type="checkbox" aria-label={`Mark ${exercise.name} complete`} checked={exercise.completed} onChange={e => dashboard.setScheduleCompletion(exercise.id, e.target.checked)} />{exercise.name}</label>{' '}
        {exercise.kind === 'RESISTANCE' && <button onClick={() => dashboard.quickLaunchExercise?.(exercise.id)}>Quick launch {exercise.name}</button>}
        {exercise.prescription && <p><RoutinePrescription item={exercise.prescription} /> — {exercise.prescription.rationale}</p>}
      </li>)}</ul>
      </div>
      <div className="comms-card">
      <span className="card-kicker">COMMUNICATIONS &amp; LOCAL STORAGE</span>
      <p>Comms: <output aria-label="Comms status">{settings.commsStatus}</output>. Queued: <output aria-label="Queued sync count">{mission.state.syncQueue.length}</output></p>
      <p><output aria-label="Queue and snapshot sizes">{mission.state.syncQueue.length} queued session summaries · Queued payload: {(mission.queuedPayloadBytes / 1000).toFixed(1)} KB · Pose snapshots retained locally ({(mission.retainedSnapshotBytes / 1000).toFixed(1)} KB)</output> · Local cache used: <output aria-label="Local cache used">{(mission.localCacheBytes / 1000).toFixed(1)} KB</output></p>
      <p>Serialized JSON sizes; 1 KB = 1,000 bytes.</p>
      <p>Saved sessions: <output aria-label="Saved session count">{mission.state.sessions.length}</output>. Acknowledged: <output aria-label="Acknowledged session count">{mission.state.acknowledgements.length}</output></p>
      <p role="alert" aria-label="Workout save error">{mission.workoutError}</p>
      <p className="prototype-note">{prototypeNotice.dataNotice}</p>
      <div className="local-data-note"><MissionIcon name="storage" /><p>Workouts save to this browser first. Comms acknowledgements are a local demo unless a sync backend is configured.</p></div>
      <a className="text-action" href="#settings-heading" onClick={() => navigation.setActivePage('settings')}>Manage data &amp; sync <span aria-hidden="true">↗</span></a>
      </div></div>
      <form className="cardio-form" onSubmit={event => {
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
    <div className="catalog-grid">
    <section className="mission-section catalog-section" aria-labelledby="exercises-heading">
      <h2 id="exercises-heading">ARED resistance exercises</h2>
      <ul aria-label="ARED resistance exercises">
        {catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => <li key={e.id}>{e.name}</li>)}
      </ul>
    </section>
    <section className="mission-section catalog-section" aria-labelledby="routes-heading">
      <h2 id="routes-heading">Planetary routes</h2>
      <ul aria-label="Planetary routes">
        {catalog.routes.map(r => <li key={r.id}>{r.name}: {r.totalDistanceKm} km</li>)}
      </ul>
    </section>
    </div>
    <section className="mission-section arena-section" aria-labelledby="arena-heading">
      <p className="eyebrow">02 / MOVEMENT INTELLIGENCE</p>
      <h2 id="arena-heading">AI Workout Arena</h2>
      <p className="section-subtitle">Real-time pose coaching. Camera-free simulation when you need it.</p>
      <div className="arena-layout"><div className="arena-controls">
      <fieldset className="cue-controls"><legend>Audio/Visual Cues</legend>
        <label><input type="checkbox" aria-label="Voice Coach" checked={arena.voiceEnabled} onChange={e => arena.setVoiceEnabled(e.target.checked)} /> Voice Coach</label>{' '}
        <label><input type="checkbox" aria-label="Visual overlay" checked={arena.visualOverlayEnabled} onChange={e => arena.setVisualOverlayEnabled(e.target.checked)} /> Visual overlay</label>
      </fieldset>
      <p><output aria-label="Voice Coach status" aria-live="polite">{arena.voiceCoachStatus}</output></p>
      <label htmlFor="arena-exercise">Exercise</label>{' '}<select id="arena-exercise" value={arena.state.exerciseId} onChange={e => {
        const id = e.target.value as ResistanceExerciseId; arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay();
      }}>
        {catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <label htmlFor="ared-load">ARED load (kg)</label>{' '}<input id="ared-load" type="number" min="0" step="1" disabled={!arena.canConfigureLoad} value={loadKg} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0) setLoadKg(value); }} />
      <p className="button-row">
        <button disabled={arena.sessionStatus === 'STARTING'} onClick={() => { resetDisplay(); void arena.start('LIVE'); }}>Start webcam</button>{' '}
        <button disabled={arena.sessionStatus === 'STARTING'} onClick={() => { resetDisplay(); void arena.start('SIMULATED'); }}>Start simulator</button>{' '}
        <button disabled={!arena.isRunning} onClick={arena.pause}>Pause</button>{' '}
        <button disabled={arena.sessionStatus !== 'PAUSED'} onClick={arena.resume}>Resume</button>{' '}
        <button disabled={!arena.canEndSession} onClick={() => arena.stop()}>End session</button>
      </p>
      <p className="button-row simulator-controls">
        {(['GOOD', 'SHALLOW', 'SPINE_FAULT'] as const).map((kind, i) => <button key={kind}
          disabled={(arena.sessionStatus === 'STARTING' && arena.mode !== 'LIVE') || arena.sessionStatus === 'PAUSED'}
          onClick={() => { resetDisplay(); void arena.triggerSimulatedRep(kind); }}>
          {['Simulate Good Rep', 'Simulate Shallow Rep', 'Simulate Spine Fault'][i]}
        </button>)}
      </p>
      <p className="arena-readouts"><span>Session: <output aria-label="Session status">{arena.sessionStatus}</output></span>{' '}
        <span>Duration: <output aria-label="Workout duration">{formatDurationMmSs(arena.elapsedSeconds)}</output></span>{' '}
        <span>Reps: <output aria-label="Completed reps">{arena.state.repCount}</output></span>{' '}
        <span>Phase: <output aria-label="Rep phase">{arena.state.phase}</output></span>{' '}
        <span>Peak ROM: <output aria-label="Peak ROM">{Math.round(arena.maxRomPct)}%</output></span></p>
      {arena.errorMessage && <p role="alert">{arena.errorMessage}</p>}
      <ul aria-label="Form alerts" aria-live="polite">{arena.activeFaultAlerts.map(alert => <li key={alert}>{alert}</li>)}</ul>
      <p className="success-message" aria-label="Form feedback" role="status">{arena.formFeedback}</p>
      <p className="prototype-note">{arena.state.repCount ? `${arena.state.formAccuracyPct.toFixed(0)}% form accuracy across completed reps` : 'No completed reps yet. Form accuracy is available after your first rep.'}</p>
      </div>
      <div className="tracking-stage">
      <div className="tracking-label"><span className="system-dot" />{arena.mode === 'SIMULATED' ? 'SIMULATED POSE FEED' : arena.mode === 'LIVE' ? 'CAMERA POSE FEED' : 'POSE TRACKING STANDBY'}<span>33 landmarks · processed locally</span></div>
      <video ref={arena.videoRef} aria-label="Live camera preview" width={640} height={480} muted playsInline
        hidden={arena.mode !== 'LIVE' || !['STARTING', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus)} />
      <canvas ref={arena.canvasRef} aria-label="Live skeletal pose" width={640} height={480} hidden={!arena.visualOverlayEnabled}>Live pose wireframe and joint angle display.</canvas>
      {arena.sessionStatus === 'IDLE' && <div className="tracking-placeholder"><MissionIcon name="camera" /><strong>Your next session starts here</strong><p>Start your webcam, or choose the simulator.<br />No webcam video is recorded.</p></div>}
      </div>
      </div>
      {summary && <p aria-label="Completed workout summary">Session complete: {summary.repCount} reps; {summary.faultedRepCount} flagged; {Math.round(summary.formAccuracyPct)}% form accuracy.</p>}
    </section>
    <section className="mission-section journey-section" aria-labelledby="journey-heading">
      <p className="eyebrow">03 / EXPEDITION PROGRESS</p>
      <h2 id="journey-heading">Expedition Journey</h2>
      <p className="section-subtitle">Every logged kilometre and form-qualified rep advances your virtual expedition.</p>
      <figure className="route-illustration"><RouteArtwork activeRoute={journey.activeRoute} routes={catalog.routes} /><figcaption>{journey.activeRoute.name} · {journey.activeRoute.totalDistanceKm.toLocaleString()} km game expedition · Schematic illustration</figcaption></figure>
      <label htmlFor="active-route">Active route</label>{' '}<select id="active-route" value={journey.activeRoute.id} onChange={e => journey.selectRoute(e.target.value as PlanetaryRouteId)}>{catalog.routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}</select>
      <p>Distance: <output aria-label="Expedition distance">{journey.cumulativeDistanceKm.toFixed(2)} km</output>. Progress: {journey.progressPct.toFixed(3)}%</p>
      <progress aria-label="Route progress" max={100} value={journey.progressPct} />
      <p>Cardio: {journey.cardioKm.toFixed(2)} km; resistance equivalent: {journey.resistanceEquivalentKm.toFixed(2)} km; tonnage: {journey.totalTonnageKg.toFixed(0)} kg.</p>
      <button aria-pressed={journey.showAllBadges} onClick={() => journey.setShowAllBadges(!journey.showAllBadges)}>View all badges</button>
      <ul className="mission-badges" aria-label="Mission badges">{journey.badges.map(badge => <li key={badge.id} data-unlocked={badge.isUnlocked}><img src="/assets/mission-badge.svg" alt={`${badge.name} mission badge illustration`} width="64" height="70" /><span>{badge.name} · {badge.isUnlocked ? 'Unlocked' : 'Locked'} · {badge.description}</span></li>)}</ul>
      <p>Next waypoint: {journey.nextWaypoint ? `${journey.nextWaypoint.name} at ${journey.nextWaypoint.distanceKm} km` : 'Route complete'}</p>
    </section>
    <section className="mission-section medical-section" aria-labelledby="medical-heading">
      <p className="eyebrow">04 / LONGITUDINAL PERFORMANCE</p>
      <h2 id="medical-heading">Medical Telemetry</h2>
      <p className="section-subtitle">Retention scores, training volume and movement symmetry. Built from your local workout history.</p>
      <p className="prototype-note">{prototypeNotice.disclaimer}</p>
      <p className="prototype-note">{prototypeNotice.metricInterpretation}</p>
      <label htmlFor="telemetry-date-window">Telemetry date window</label>{' '}<select id="telemetry-date-window" value={medical.dateWindowDays} onChange={e => medical.setDateWindowDays(Number(e.target.value) as 7 | 14 | 30)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
      <p>{medical.dateWindowDays}-day tonnage: <output aria-label="Visible volume">{medical.visibleVolumeKg.toFixed(0)} kg</output>. Symmetry consistency (30 days): {medical.symmetryScoreAvg.toFixed(1)}%.</p>
      <p>Chart windows show rolling 30-day scores. JSON/CSV reports include the full 30-day reporting period.</p>
      <div className="chart-grid"><figure><figcaption>STRENGTH RETENTION · %</figcaption><TelemetryChart kind="retention" values={medical.retentionSeries.map(point => point.strengthRetentionPct)} /></figure><figure><figcaption>RESISTANCE VOLUME · KG</figcaption><TelemetryChart kind="volume" values={medical.volumeSeries.map(point => point.volumeKg)} /></figure></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Medical telemetry table scroll area"><table aria-label="Medical telemetry"><thead><tr><th>Date (UTC)</th><th>Strength retention (%)</th><th>Volume (kg)</th></tr></thead><tbody>{medical.retentionSeries.map((point, index) => <tr key={point.dateIso}><td>{point.dateIso}</td><td>{point.strengthRetentionPct.toFixed(1)}</td><td>{medical.volumeSeries[index].volumeKg.toFixed(0)}</td></tr>)}</tbody></table></div>
      <ul aria-label="Fault counts">{Object.entries(medical.faultCounts).map(([fault, count]) => <li key={fault}>{fault}: {count}</li>)}</ul>
      <button onClick={() => medical.exportFlightSurgeonReport('json')}>Export Flight Surgeon JSON</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('csv')}>Export Flight Surgeon CSV</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('pdf')}>Print / Save as PDF</button>
      <p aria-label="Export confirmation" role="status">{medical.exportConfirmationMessage}</p>
    </section>
    <section className="mission-section history-section" aria-labelledby="history-heading">
      <p className="eyebrow">05 / SESSION ARCHIVE</p>
      <h2 id="history-heading">Workout Logs &amp; History</h2>
      <p className="section-subtitle">{history.totalSessions} matching sessions · Select Details to inspect a workout or replay a flagged rep.</p>
      <div className="history-filters">
      <label htmlFor="workout-search">Search workouts</label>{' '}<input id="workout-search" type="search" value={history.searchQuery} onChange={e => history.setSearchQuery(e.target.value)} />{' '}
      <label htmlFor="history-date-range">Workout date range</label>{' '}<select id="history-date-range" value={history.dateRange} onChange={e => history.setDateRange(e.target.value as WorkoutDateRange)}>
        <option value="ALL">All dates</option><option value="LAST_7_DAYS">Last 7 days</option><option value="LAST_14_DAYS">Last 14 days</option><option value="LAST_30_DAYS">Last 30 days</option>
      </select>
      </div>
      <p>GREEN / YELLOW / RED indicate prototype form status, not medical clearance.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Workout history table scroll area"><table aria-label="Workout history">
        <thead><tr><th>Completed (UTC)</th><th>Exercise</th><th>Duration (MM:SS)</th><th>Status</th><th>Reps</th><th>Volume (kg)</th><th>Form (%)</th><th>Sync</th><th>Details / flagged reps</th></tr></thead>
        <tbody>{history.sessions.map(session => <tr key={session.id}>
          <td>{session.completedAtIso}</td><td>{session.exerciseId}</td><td>{session.formattedDuration}</td><td><span className="form-status" data-status={session.formStatus}>{session.formStatus}</span></td><td>{session.sets * session.reps}</td>
          <td>{session.resistanceVolumeKg.toFixed(0)}</td><td>{session.formAccuracyPct.toFixed(1)}</td><td>{mission.state.acknowledgements.some(a => a.sessionId === session.id) ? 'SYNCED' : 'QUEUED_BLACKOUT'}</td>
          <td><button onClick={() => history.selectSession(session.id)}>Details</button>{' '}{session.snapshots.map(snapshot => <button key={snapshot.repNumber} onClick={() => history.selectSnapshotForReplay(snapshot)}>Replay saved rep {snapshot.repNumber}</button>)}</td>
        </tr>)}</tbody>
      </table></div>
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
    <section className="mission-section settings-section" aria-labelledby="settings-heading">
      <p className="eyebrow">06 / CREW CONFIGURATION</p>
      <h2 id="settings-heading">Profile &amp; Mission Settings</h2>
      <p className="section-subtitle">Your crew profile, gravity scenario, personalized routine and onboard data.</p>
      <div className="profile-fields">
      <label htmlFor="body-weight">Body weight (kg)</label>{' '}<input id="body-weight" type="number" min="0.1" step="0.1" value={settings.profileFieldValue('bodyWeightKg')} aria-invalid={Boolean(settings.fieldErrors.bodyWeightKg)} aria-describedby="body-weight-error" onChange={e => settings.setProfileField('bodyWeightKg', e.target.value)} />
      <p id="body-weight-error" role={settings.fieldErrors.bodyWeightKg ? 'alert' : undefined}>{settings.fieldErrors.bodyWeightKg}</p>
      <label htmlFor="astronaut-name">Astronaut name</label>{' '}<input id="astronaut-name" value={settings.profileFieldValue('name')} aria-invalid={Boolean(settings.fieldErrors.name)} aria-describedby="astronaut-name-error" onChange={e => settings.setProfileField('name', e.target.value)} />
      <p id="astronaut-name-error" role={settings.fieldErrors.name ? 'alert' : undefined}>{settings.fieldErrors.name}</p>
      <label htmlFor="gravity-profile">Gravity profile</label>{' '}<select id="gravity-profile" value={settings.gravityProfile} onChange={e => settings.setGravityProfile(e.target.value as GravityProfileId)}>{catalog.gravityProfiles.map(g => <option key={g.id} value={g.id}>{g.name} ({g.gravityG}g)</option>)}</select>
      </div>
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
      <p className="prototype-note">{prototypeNotice.commsScenario}</p>
      <button onClick={() => { arena.selectExercise(arena.state.exerciseId as ResistanceExerciseId); resetDisplay(); settings.seed30DayDemoData(); }}>Seed 30-Day Mars Demo Data</button>{' '}
      <button onClick={settings.clearLocalCache}>Clear Local Data</button>
      <dialog ref={clearDialog} aria-labelledby="clear-data-heading" aria-describedby="clear-data-warning" onCancel={event => { event.preventDefault(); settings.cancelClearLocalData(); }}>
        <h3 id="clear-data-heading">Clear all local mission data?</h3>
        <p id="clear-data-warning">This removes saved workouts, snapshots, queued summaries and profile settings from this browser. This cannot be undone.</p>
        <button onClick={() => { arena.selectExercise(arena.state.exerciseId as ResistanceExerciseId); resetDisplay(); settings.confirmClearLocalData(); }}>Confirm clear</button>{' '}
        <button onClick={settings.cancelClearLocalData}>Cancel clear</button>
      </dialog>
    </section>
    <section className="mission-section replay-section" aria-labelledby="replay-heading">
      <p className="eyebrow">MOVEMENT REVIEW</p>
      <h2 id="replay-heading">Kinematic Snapshot Replay</h2>
      <ul aria-label="Flagged reps">{arena.state.snapshots.map(snapshot => <li key={snapshot.repNumber}>
        <button onClick={() => setSelectedSnapshot(snapshot)}>Replay rep {snapshot.repNumber}</button>
      </li>)}</ul>
      <canvas ref={replayCanvas} aria-label="Kinematic snapshot replay" width={640} height={480} hidden={!selectedSnapshot}>Flagged rep skeletal replay with red fault highlights.</canvas>
      <SnapshotDiagnostic snapshot={selectedSnapshot} label="Current snapshot diagnostic" />
    </section>
    <section className="mission-section sources-section" aria-labelledby="science-sources-heading">
      <p className="eyebrow">RESEARCH &amp; REFERENCES</p>
      <h2 id="science-sources-heading">NASA Data &amp; Space Agency Partner Sources</h2>
      <p>NASA resources inform the exercise problem and catalog geography. Research references and planned data integrations are identified below.</p>
      <p>CSA, ESA, and JAXA are listed among the <a href="https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/">2026 NASA Space Apps Space Agency Partners</a>.</p>
      <ul>{scienceSources.map(source => <li key={source.title}>
        <h3>{source.title}</h3>
        <p>{source.description}</p>
        <p>{source.links.map((link, index) => <span key={link.url}>{index > 0 && ' · '}<a href={link.url}>{link.label}</a></span>)}</p>
      </li>)}</ul>
    </section>
  </main>
  <footer className="mission-footer">PROJECT A.R.E.S. <span>SPACE APPS 2026 · TEAM PROTOTYPE · LOCAL-FIRST TELEMETRY</span></footer>
  </div></div></>;
}
