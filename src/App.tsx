import { useEffect, useRef, useState } from 'react';
import { getExerciseById, loadMissionCatalog } from './core/catalog/missionCatalog';
import { describeSnapshotDiagnostic, faultAlerts } from './core/kinematics/kinematicMath';
import { formatDurationMmSs, getSessionFormStatus } from './core/telemetry/telemetryEngine';
import type { CardioExerciseId, GravityProfileId, KinematicSnapshot, InjuryLimitation, MissionType, RepMachineState, ResistanceExerciseId, WorkoutDateRange } from './core/types';
import { renderKinematicSnapshot } from './adapters/poseCanvasRenderer';
import { useWorkoutArena } from './hooks/useWorkoutArena';
import { useAppNavigation } from './hooks/useAppNavigation';
import { OnboardingSection } from './OnboardingSection';
import { HealthMetricFields } from './HealthMetricFields';
import routineRules from './content/routineRules.json';
import scienceSources from './content/scienceSources.json';
import prototypeNotice from './content/prototypeNotice.json';
import { MissionTelemetryProvider, useDashboardSummary, useExpeditionJourney, useMedicalTelemetry, useMilestoneCelebrations, useMissionProfile, useMissionTelemetry, useWorkoutHistory } from './hooks/useMissionTelemetry';
import { ReferenceIcon } from './components/ReferenceIcon';
import { JourneySection } from './components/JourneySection';
import { DashboardSchedule } from './components/DashboardSchedule';
import { SessionLaunchDock } from './components/SessionLaunchDock';
import { MissionChrome } from './components/MissionChrome';
import { MissionIcon, ProgressRing, TelemetryChart } from './components/MissionVisuals';
import { MilestoneCelebration } from './components/MilestoneCelebration';
import { RepIllustration } from './components/RepIllustration';

export default function App() {
  return <MissionTelemetryProvider><MissionApp /></MissionTelemetryProvider>;
}

function SnapshotDiagnostic({ snapshot, label }: { snapshot: KinematicSnapshot | null; label: string }) {
  const exercise = snapshot && getExerciseById(snapshot.exerciseId);
  return snapshot && exercise?.kind === 'RESISTANCE'
    ? <p aria-label={label}>{describeSnapshotDiagnostic(snapshot, exercise)}</p> : null;
}

const LOG_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatLogDate = (iso: string) => `${LOG_MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const cameraStageHeadings = { PERMISSION: 'Waiting for camera access…', PERMISSION_SLOW: 'Waiting for camera access…', VIDEO: 'Starting camera preview…', MODEL: 'Loading the local pose model…' } as const;
/** Display-only rounding: stored loads keep full precision, but 73.600000000001 should read 73.6. */
const roundKg = (kg: number) => Number(kg.toFixed(1)).toLocaleString();
const formatPace = (secPerKm: number) => `${Math.floor(secPerKm / 60)}:${String(Math.floor(secPerKm % 60)).padStart(2, '0')}/km`;
const statusLabels = { GREEN: 'Good', YELLOW: 'Review', RED: 'Flagged' } as const;
const gravitySubtitles: Record<GravityProfileId, string> = { MICROGRAVITY_0G: 'ISS / transit', MOON_016G: 'Lunar surface', MARS_038G: 'Martian surface' };
const sentenceCase = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

/** Readable status with the prototype GREEN/YELLOW/RED code kept for assistive tech and exports. */
function FormStatus({ status }: { status: keyof typeof statusLabels }) {
  return <span className="form-status" data-status={status}><span aria-hidden="true" className="status-dot" />{statusLabels[status]}<span className="visually-hidden"> ({status})</span></span>;
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
  const arena = useWorkoutArena({ active: navigation.activePage === 'arena', onCompleted: (state, durationSec) => {
    setSummary(state);
    if (state.repCount > 0) mission.saveWorkout({ id: crypto.randomUUID(), exerciseId: state.exerciseId, completedAtIso: new Date().toISOString(),
      durationSec, sets: 1, reps: state.repCount, loadKg, cardioDistanceKm: 0, formAccuracyPct: state.formAccuracyPct,
      symmetryScorePct: state.peakAnalysis?.symmetryScorePct ?? 100, snapshots: state.snapshots });
  } });
  const arenaExercise = getExerciseById(arena.state.exerciseId);
  const dashboard = useDashboardSummary(id => { arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay(); navigation.navigateToPage('arena'); void arena.start('SIMULATED'); }, arena.mode === 'LIVE' && arena.isRunning);
  const journey = useExpeditionJourney();
  const medical = useMedicalTelemetry();
  const celebrations = useMilestoneCelebrations();
  const history = useWorkoutHistory();
  const settings = useMissionProfile();
  const scenarioGoalPct = catalog.gravityProfiles.find(gravity => gravity.id === settings.gravityProfile)?.prototypeGoalPct ?? 0;
  const windowDates = new Set(medical.volumeSeries.map(point => point.dateIso));
  const windowSessions = medical.sessions.filter(session => windowDates.has(new Date(session.completedAtIso).toISOString().slice(0, 10)));
  const windowLifts = windowSessions.filter(session => getExerciseById(session.exerciseId).kind === 'RESISTANCE');
  const windowFormAccuracyPct = windowLifts.length ? windowLifts.reduce((sum, session) => sum + session.formAccuracyPct, 0) / windowLifts.length : null;
  const symmetryByExercise = catalog.exercises.filter(exercise => exercise.kind === 'RESISTANCE').map(exercise => {
    const sessions = windowLifts.filter(session => session.exerciseId === exercise.id);
    return { id: exercise.id, name: exercise.name, sessions: sessions.length, symmetryPct: sessions.reduce((sum, session) => sum + session.symmetryScorePct, 0) / Math.max(1, sessions.length) };
  }).filter(row => row.sessions > 0);
  const clearDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = clearDialog.current;
    if (settings.clearConfirmationPending && dialog && !dialog.open) dialog.showModal();
    else if (!settings.clearConfirmationPending && dialog?.open) dialog.close();
  }, [settings.clearConfirmationPending]);
  // Master-detail: like the reference, open the newest matching session instead of an empty detail panel.
  const firstHistoryId = history.sessions[0]?.id;
  useEffect(() => {
    if (navigation.activePage === 'logs' && !history.selectedSession && firstHistoryId) history.selectSession(firstHistoryId);
  }, [navigation.activePage, history.selectedSession, firstHistoryId]);
  const resetDisplay = () => { setSummary(null); setSelectedSnapshot(null); };
  const selectArenaExercise = (id: ResistanceExerciseId) => { arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay(); };
  useEffect(() => {
    const ctx = replayCanvas.current?.getContext('2d');
    if (ctx && selectedSnapshot) renderKinematicSnapshot(ctx, selectedSnapshot);
  }, [selectedSnapshot]);
  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>Skip to main content</a>
    <MissionChrome navigation={navigation} name={settings.astronautProfile.name} pendingCount={mission.state.syncQueue.length} commsOpen={settings.commsStatus === 'WINDOW_OPEN'} notification={dashboard.routineNotification}>
    <main ref={mainRef} id="main-content" tabIndex={-1}>
      <p className="global-save-error" role="alert" aria-label="Workout save error">{mission.workoutError}</p>
    <div className="app-title visually-hidden"><h1>Project ARES Command Center</h1></div>
    <div className="page-heading" data-screen="dashboard" data-active={navigation.activePage === 'dashboard'}><div><p className="eyebrow">Project ARES · Command Center</p><h2 className="page-title">Good Morning, <span>{settings.astronautProfile.name.split(' ')[0]}.</span></h2><p>Your physical readiness at a glance</p></div><div className="mission-day-badge glass"><span>Mission Day</span><strong>{dashboard.missionDay}<small>/ {dashboard.missionDurationDays}</small></strong></div></div>
    <section className="mission-section command-section" data-screen="dashboard" data-active={navigation.activePage === 'dashboard'} aria-labelledby="command-heading">
      <h2 id="command-heading" className="visually-hidden">Command Center</h2>
      <p className="success-message routine-notice" role="status" aria-label="Routine update notification">{dashboard.routineNotification}</p>
      <div className="dashboard-grid">
        <div className="readiness-card glass"><div className="card-heading"><div><h3>Strength Retention Score</h3><p>vs. your pre-flight Earth baseline</p></div><span className="card-period">30 days</span></div><div className="retention-body">
          <ProgressRing value={medical.strengthRetentionPct}><span className="ring-kicker">Strength retention:</span><output aria-label="Strength retention">{medical.strengthRetentionPct.toFixed(1).split('.')[0]}<span className="ring-decimal">.{medical.strengthRetentionPct.toFixed(1).split('.')[1]}%</span></output><span className="ring-footnote">retained score</span></ProgressRing>
          <div className="retention-breakdown"><label>Workout score <span>{medical.strengthRetentionPct.toFixed(1)}%</span><progress aria-label="Workout-derived retention score" max={100} value={medical.strengthRetentionPct} /></label><label>Movement symmetry <span>{medical.symmetryScoreAvg.toFixed(1)}%</span><progress aria-label="Movement symmetry" max={100} value={medical.symmetryScoreAvg} /></label><label>Scenario goal <span>{catalog.gravityProfiles.find(gravity => gravity.id === settings.gravityProfile)?.prototypeGoalPct}%</span><progress aria-label="Team-defined scenario goal" max={100} value={catalog.gravityProfiles.find(gravity => gravity.id === settings.gravityProfile)?.prototypeGoalPct} /></label></div>
        </div><p className="prototype-note card-footnote">Team-defined prototype goals; not NASA standards or clinical clearance.</p></div>
        <div className="mission-progress-card glass"><div className="card-heading"><div><h3>Mission Progress</h3><p>{routineRules.missions[settings.astronautProfile.missionType].label} · {catalog.gravityProfiles.find(gravity => gravity.id === settings.gravityProfile)?.name}</p></div><span className="completion-chip">{dashboard.missionProgressPct.toFixed(0)}% complete</span></div><p className="mission-day-value"><strong>{dashboard.missionDay}</strong><span>/ {dashboard.missionDurationDays} days</span></p><p className="days-remaining">{Math.max(0, dashboard.missionDurationDays - dashboard.missionDay)} planned mission days remaining</p><progress aria-label="Mission duration progress" max={100} value={dashboard.missionProgressPct} /><div className="mission-timeline"><span>Launch<small>D1</small></span><span>Current<small>D{dashboard.missionDay}</small></span><span>Mission end<small>D{dashboard.missionDurationDays}</small></span></div><div className="next-objective"><MissionIcon name="journey" /><p>Next milestone: <strong>{journey.nextWaypoint?.name ?? 'Route complete'}</strong><small>{journey.activeRoute.name} virtual expedition</small></p></div></div>
      </div>
      <dl className="system-status-strip" aria-label="Mission system indicators"><div><dt><MissionIcon name="storage" />LOCAL STORAGE</dt><dd><span className="status-dot" data-tone="info" aria-hidden="true" />Offline-first · local cache</dd></div><div><dt><MissionIcon name="camera" />CAMERA FEED</dt><dd><span className="status-dot" data-tone={dashboard.statusIndicators.cameraReady || (arena.mode === 'SIMULATED' && arena.isRunning) ? 'ok' : arena.sessionStatus === 'PAUSED' || arena.sessionStatus === 'STARTING' ? 'warn' : 'idle'} aria-hidden="true" />{dashboard.statusIndicators.cameraReady ? 'Live tracking active' : arena.mode === 'SIMULATED' && arena.isRunning ? 'Simulator active' : arena.sessionStatus === 'PAUSED' ? 'Tracking paused' : arena.sessionStatus === 'STARTING' ? 'Starting tracking' : arena.sessionStatus === 'IDLE' ? 'Not started' : 'Inactive'}</dd></div><div><dt><MissionIcon name="sync" />COMMS SCENARIO</dt><dd><span className="status-dot" data-tone={settings.commsStatus === 'WINDOW_OPEN' ? 'ok' : 'warn'} aria-hidden="true" />{settings.commsStatus === 'WINDOW_OPEN' ? 'Window open' : 'Manual blackout mode'}</dd></div></dl>
      <div className="command-lower-grid"><DashboardSchedule dashboard={dashboard} />
      <div className="ready-rail"><section className="ready-card glass" aria-labelledby="ready-heading"><h3 id="ready-heading">Ready when you are</h3><p>{dashboard.todaySchedule.length} exercises in your personalized program. The form coach tracks your reps and joint angles locally.</p><dl className="ready-metrics"><div><dt>READINESS</dt><dd>—</dd></div><div><dt>SLEEP</dt><dd>—</dd></div><div><dt>RESTING HR</dt><dd>{settings.astronautProfile.restingHeartRateBpm}</dd></div></dl><p className="ready-data-note">Readiness and sleep are not recorded. Resting HR is from your saved profile (bpm).</p></section><SessionLaunchDock active={navigation.activePage === 'dashboard'} disabled={arena.sessionStatus === 'STARTING'} onLaunch={dashboard.initiateTodaysSession} /><a className="text-action" href="#/profile" onClick={event => { event.preventDefault(); navigation.navigateToPage('profile'); }}>Review your mission profile <span aria-hidden="true">&#8599;</span></a></div></div>
      <details className="prototype-details"><summary>Prototype scoring, routine &amp; local data details</summary><p><output aria-label="Gravity scenario comparison">{dashboard.gravityScenarioDescription}</output></p><p className="prototype-note">{prototypeNotice.metricInterpretation}</p><p className="prototype-note">{dashboard.personalizedRoutine.disclaimer}</p><p className="prototype-note">Prototype targets are for review; ARED load remains manually configurable in the Workout Arena.</p>      <div className="comms-details">
      <span className="card-kicker">COMMUNICATIONS &amp; LOCAL STORAGE</span>
      <p>Comms: <output aria-label="Comms status">{settings.commsStatus}</output>. Queued: <output aria-label="Queued sync count">{mission.state.syncQueue.length}</output></p>
      <p><output aria-label="Queue and snapshot sizes">{mission.state.syncQueue.length} queued session summaries · Queued payload: {(mission.queuedPayloadBytes / 1000).toFixed(1)} KB · Pose snapshots retained locally ({(mission.retainedSnapshotBytes / 1000).toFixed(1)} KB)</output> · Local cache used: <output aria-label="Local cache used">{(mission.localCacheBytes / 1000).toFixed(1)} KB</output></p>
      <p>Serialized JSON sizes; 1 KB = 1,000 bytes.</p>
      <p>Saved sessions: <output aria-label="Saved session count">{mission.state.sessions.length}</output>. Acknowledged: <output aria-label="Acknowledged session count">{mission.state.acknowledgements.length}</output></p>
      <p className="prototype-note">{prototypeNotice.dataNotice}</p>
</div></details>
    </section>
    <div data-screen="onboarding" data-active={navigation.activePage === 'onboarding'}><OnboardingSection onSkip={() => navigation.navigateToPage('dashboard')} /></div>
    <div className="catalog-grid" data-screen="sources" data-active={navigation.activePage === 'sources'}>
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
    <section className="mission-section arena-section" data-screen="arena" data-active={navigation.activePage === 'arena'} aria-labelledby="arena-heading">
      <p className="eyebrow">Live Form Coach</p>
      <h2 className="page-title" id="arena-heading">AI Workout Arena</h2>
      <p className="section-subtitle">Real-time pose tracking with joint-angle and range-of-motion feedback</p>
      <div className="arena-timer glass"><ReferenceIcon name="timer" />Duration: <output aria-label="Workout duration">{formatDurationMmSs(arena.elapsedSeconds)}</output></div>
      <div className="arena-layout"><div className="glass arena-stage-card">
      <div className="tracking-stage">
      <div className="tracking-label"><span className="system-dot" />{arena.mode === 'SIMULATED' ? 'SIMULATED POSE FEED' : arena.mode === 'LIVE' ? 'CAMERA POSE FEED' : 'POSE TRACKING STANDBY'}<span>33 landmarks · processed locally</span></div>
      <div className="tracking-viewport" data-idle={!['READY', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus)}><video ref={arena.videoRef} aria-label="Live camera preview" width={640} height={480} muted playsInline
        hidden={arena.mode !== 'LIVE' || !['STARTING', 'READY', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus)} />
      <canvas ref={arena.canvasRef} aria-label="Live skeletal pose" width={640} height={480} hidden={!arena.visualOverlayEnabled || !['READY', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus)}>Live pose wireframe and joint angle display.</canvas>
      {!['READY', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus) && <div className="tracking-placeholder camera-access-panel"><span className="camera-access-icon"><ReferenceIcon name="camera" /></span><h3>{arena.sessionStatus === 'STARTING' ? arena.mode === 'LIVE' ? cameraStageHeadings[arena.preparationStage ?? 'PERMISSION'] : 'Starting simulation…' : arena.sessionStatus === 'ERROR' ? arena.cameraFailure === 'PERMISSION_DENIED' ? 'Camera permission blocked' : 'Camera needs attention' : 'Allow camera access'}</h3><p role={arena.errorMessage ? 'alert' : undefined}>{arena.errorMessage ?? (arena.preparationStage === 'PERMISSION_SLOW' ? 'Still waiting for permission. Look for the camera prompt next to the browser address bar, or use the simulation feed instead.' : 'ARES needs your camera to track 33 body landmarks and coach your form in real time. Video is processed locally and is not recorded or uploaded.')}</p>{arena.sessionStatus === 'STARTING' && arena.mode === 'LIVE' && <ol className="camera-stage-steps" aria-label="Camera preparation steps">{(['PERMISSION', 'VIDEO', 'MODEL'] as const).map((stage, index) => { const at = ['PERMISSION', 'VIDEO', 'MODEL'].indexOf(arena.preparationStage === 'PERMISSION_SLOW' ? 'PERMISSION' : arena.preparationStage ?? 'PERMISSION'); return <li key={stage} data-state={index < at ? 'done' : index === at ? 'active' : 'pending'}>{['Permission', 'Camera preview', 'Pose model'][index]}</li>; })}</ol>}<div className="camera-access-actions"><button disabled={arena.sessionStatus === 'STARTING'} onClick={() => { resetDisplay(); void arena.prepare('LIVE'); }}><ReferenceIcon name="camera" />Enable camera</button><button disabled={arena.sessionStatus === 'STARTING' && arena.mode !== 'LIVE'} onClick={() => { resetDisplay(); void arena.prepare('SIMULATED'); }}><ReferenceIcon name="scan-line" />Use simulation feed</button></div></div>}
      {arena.sessionStatus === 'READY' && arena.mode === 'LIVE' && <p className="tracking-chip ready-chip">Camera ready · reps and timer start when you select Start webcam</p>}
      {arena.trackingGuidance && <p className="tracking-chip guidance-chip" aria-label="Framing guidance">{arena.trackingGuidance}</p>}
      {arena.sessionStatus === 'READY' && arena.mode === 'SIMULATED' && <div className="tracking-placeholder prepared-feed-panel"><ReferenceIcon name="scan-line" /><h3>Simulation feed ready</h3><p>Start simulator or choose a simulated rep to begin your workout.</p></div>}
      </div></div>
      <p className="button-row" data-feed={arena.mode ?? 'LIVE'}>
        <button disabled={arena.sessionStatus === 'STARTING'} onClick={() => { resetDisplay(); void arena.start('LIVE'); }}>Start webcam</button>{' '}
        <button disabled={arena.sessionStatus === 'STARTING' && arena.mode !== 'LIVE'} onClick={() => { resetDisplay(); void arena.start('SIMULATED'); }}>Start simulator</button>{' '}
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
      <fieldset className="cue-controls"><legend>Audio/Visual Cues</legend>
        <label><input type="checkbox" aria-label="Voice Coach" checked={arena.voiceEnabled} onChange={e => arena.setVoiceEnabled(e.target.checked)} /> Voice Coach</label>{' '}
        <label><input type="checkbox" aria-label="Visual overlay" checked={arena.visualOverlayEnabled} onChange={e => arena.setVisualOverlayEnabled(e.target.checked)} /> Visual overlay</label>
      </fieldset>
      <p><output aria-label="Voice Coach status" aria-live="polite">{arena.voiceCoachStatus}</output></p>
      </div><div className="arena-controls"><section className="glass exercise-settings"><div className="exercise-heading"><h3>Exercise</h3><label className="visually-hidden" htmlFor="arena-exercise">Exercise</label><select id="arena-exercise" value={arena.state.exerciseId} onChange={event => selectArenaExercise(event.target.value as ResistanceExerciseId)}>{catalog.exercises.filter(exercise => exercise.kind === 'RESISTANCE').map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></div><p>Select a movement to coach</p>
      <div className="exercise-choices" role="radiogroup" aria-label="Quick exercise selection">{catalog.exercises.filter(exercise => exercise.kind === 'RESISTANCE').map(exercise => <label key={exercise.id} className="exercise-choice"><input type="radio" name="arena-exercise-choice" value={exercise.id} checked={arena.state.exerciseId === exercise.id} onChange={() => selectArenaExercise(exercise.id)} /><span>{exercise.name}</span></label>)}</div>
      <p className="exercise-target">Configured target angle: {arenaExercise.kind === 'RESISTANCE' ? arenaExercise.targetAngleDeg : '—'}°</p>
      <label htmlFor="ared-load">ARED load (kg)</label><input id="ared-load" type="number" min="0" step="1" disabled={!arena.canConfigureLoad} value={loadKg} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) setLoadKg(value); }} />
</section><section className="glass form-feedback-card"><h3>Form feedback</h3>
      <div className="feedback-banner" data-tone={arena.activeFaultAlerts.length ? 'warning' : arena.formFeedback ? 'good' : 'neutral'}><ReferenceIcon name="shield-check" /><div><p className="success-message" aria-label="Form feedback" role="status">{arena.formFeedback}</p>{!arena.formFeedback && <strong>{arena.activeFaultAlerts.length ? 'Correction needed' : arena.sessionStatus === 'PAUSED' ? 'Session paused' : arena.sessionStatus === 'RUNNING' ? 'Waiting for movement' : arena.sessionStatus === 'STARTING' ? 'Preparing feed' : arena.sessionStatus === 'READY' ? 'Feed ready' : arena.sessionStatus === 'COMPLETED' ? 'Session complete' : arena.sessionStatus === 'ERROR' ? 'Feed unavailable' : 'Ready to begin'}</strong>}<p>{arena.activeFaultAlerts.length ? 'Review the correction alerts below.' : arena.sessionStatus === 'IDLE' ? 'Enable camera or simulation to begin.' : arena.sessionStatus === 'READY' ? 'Start the workout when you are ready.' : 'Form scores are based on completed reps.'}</p></div></div>
      <dl className="form-score-grid"><div><dt>Reps</dt><dd><output aria-label="Completed reps">{arena.state.repCount}</output></dd></div><div><dt>Accuracy</dt><dd><output aria-label="Form accuracy">{arena.state.repCount ? `${arena.state.formAccuracyPct.toFixed(0)}%` : '—'}</output></dd></div><div><dt>Flagged reps</dt><dd><output aria-label="Flagged rep count">{arena.state.faultedRepCount}</output></dd></div></dl>
      <p className="arena-readouts"><span>Session: <output aria-label="Session status">{arena.sessionStatus}</output></span><span>Phase: <output aria-label="Rep phase">{arena.state.phase}</output></span><span>Peak ROM: <output aria-label="Peak ROM">{Math.round(arena.maxRomPct)}%</output></span></p>
      <h4 className="correction-heading">Correction alerts this set</h4><ul aria-label="Form alerts" aria-live="polite">{arena.activeFaultAlerts.map(alert => <li key={alert}>{alert}</li>)}</ul>{!arena.activeFaultAlerts.length && <p className="no-corrections">No alerts yet.</p>}
      <p className="prototype-note">{arena.state.repCount ? `${arena.state.formAccuracyPct.toFixed(0)}% form accuracy across completed reps` : 'No completed reps yet. Form accuracy is available after your first rep.'}</p>
</section></div></div>
      {summary && <p aria-label="Completed workout summary">Session complete: {summary.repCount} reps; {summary.faultedRepCount} flagged; {Math.round(summary.formAccuracyPct)}% form accuracy.</p>}
      <details className="cardio-disclosure"><summary>Log a cardio session</summary>      <form className="cardio-form" onSubmit={event => {
        event.preventDefault(); const distance = Number(cardioDistance);
        if (!Number.isFinite(distance) || distance <= 0) return;
        mission.saveWorkout({ durationSec: 0, id: crypto.randomUUID(), exerciseId: cardioExercise, completedAtIso: new Date().toISOString(), sets: 0, reps: 0, loadKg: 0,
          cardioDistanceKm: distance, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] });
      }}>
        <label htmlFor="cardio-exercise">Cardio exercise</label>{' '}<select id="cardio-exercise" value={cardioExercise} onChange={e => setCardioExercise(e.target.value as CardioExerciseId)}>{catalog.exercises.filter(e => e.kind === 'CARDIO').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>{' '}
        <label htmlFor="cardio-distance">Cardio distance (km)</label>{' '}<input id="cardio-distance" type="number" min="0.01" step="0.01" required value={cardioDistance} onChange={e => setCardioDistance(e.target.value)} />{' '}
        <button type="submit">Log cardio session</button>
      </form></details>
    </section>
    <section className="mission-section journey-section" data-screen="journey" data-active={navigation.activePage === 'journey'} aria-labelledby="journey-heading">
      <JourneySection journey={journey} routes={catalog.routes} missionDay={dashboard.missionDay} durationDays={dashboard.missionDurationDays} />
    </section>
    <section className="mission-section medical-section" data-screen="analytics" data-active={navigation.activePage === 'analytics'} aria-labelledby="medical-heading">
      <p className="eyebrow">Flight Surgeon View</p>
      <h2 className="page-title" id="medical-heading">Medical Telemetry</h2>
      <p className="section-subtitle">Retention scores, training volume and movement symmetry. Built from your local workout history.</p>
      <div className="export-actions">      <button onClick={() => medical.exportFlightSurgeonReport('json')}>Export Flight Surgeon JSON</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('csv')}>Export Flight Surgeon CSV</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('pdf')}>Print / Save as PDF</button>
      <p aria-label="Export confirmation" role="status">{medical.exportConfirmationMessage}</p>
</div>
      <aside className="telemetry-notice" aria-label="Prototype telemetry context"><ReferenceIcon name="info" /><div><h3>Prototype telemetry</h3><p className="prototype-note">{prototypeNotice.disclaimer}</p><p className="prototype-note">{prototypeNotice.metricInterpretation}</p></div></aside>
      <div className="telemetry-toolbar"><div><label htmlFor="telemetry-date-window">Telemetry date window</label><select id="telemetry-date-window" value={medical.dateWindowDays} onChange={event => medical.setDateWindowDays(Number(event.target.value) as 7 | 14 | 30)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div><p>Chart windows show rolling 30-day scores. JSON/CSV reports include the full 30-day reporting period.</p></div>
      <dl className="telemetry-summary"><div><dt>{medical.dateWindowDays}-day tonnage:</dt><dd><output aria-label="Visible volume">{medical.visibleVolumeKg.toFixed(0)} kg</output></dd></div><div><dt>Symmetry consistency (30 days):</dt><dd>{medical.symmetryScoreAvg.toFixed(1)}%</dd></div></dl>
      <div className="chart-grid"><figure><figcaption><span>{medical.dateWindowDays}-Day Strength Retention · %</span><strong>{medical.strengthRetentionPct.toFixed(1)}%</strong></figcaption><p className="chart-description">Workout-derived score against your pre-flight baseline</p><ul className="chart-legend" aria-label="Chart legend"><li data-series="retention">Retention score</li><li data-series="baseline">Earth baseline (100%)</li><li data-series="goal">Scenario goal ({scenarioGoalPct}%)</li></ul><TelemetryChart kind="retention" goalPct={scenarioGoalPct} dates={medical.retentionSeries.map(point => point.dateIso)} values={medical.retentionSeries.map(point => point.strengthRetentionPct)} /></figure><figure><figcaption><span>Resistance Volume · kg</span><strong>{(medical.visibleVolumeKg / 1000).toFixed(1)} t</strong></figcaption><p className="chart-description">Cumulative ARED weight moved per day</p><dl className="volume-stats"><div><dt>Sets</dt><dd>{windowSessions.reduce((sum, session) => sum + session.sets, 0).toLocaleString()}</dd></div><div><dt>Reps</dt><dd>{windowSessions.reduce((sum, session) => sum + session.sets * session.reps, 0).toLocaleString()}</dd></div><div><dt>Sessions</dt><dd>{windowSessions.length}</dd></div></dl><TelemetryChart kind="volume" dates={medical.volumeSeries.map(point => point.dateIso)} values={medical.volumeSeries.map(point => point.volumeKg)} /></figure><figure className="symmetry-card"><figcaption>Movement Symmetry</figcaption><div className="symmetry-rings"><ProgressRing value={medical.symmetryScoreAvg}><strong>{medical.symmetryScoreAvg.toFixed(1)}%</strong><span>Symmetry</span></ProgressRing><div className="form-ring"><ProgressRing value={windowFormAccuracyPct ?? 0}><strong>{windowFormAccuracyPct === null ? '—' : `${windowFormAccuracyPct.toFixed(1)}%`}</strong><span>Form accuracy</span></ProgressRing></div></div>
        <h4 className="symmetry-breakdown-title">Symmetry by exercise · {medical.dateWindowDays} days</h4>
        {symmetryByExercise.length ? <ul className="symmetry-breakdown" aria-label="Symmetry by exercise">{symmetryByExercise.map(row => <li key={row.id}><span>{row.name}</span><strong>{row.symmetryPct.toFixed(1)}%</strong><progress aria-label={`${row.name} average symmetry`} max={100} value={row.symmetryPct} /><small>{row.sessions} {row.sessions === 1 ? 'session' : 'sessions'}</small></li>)}</ul> : <p className="symmetry-empty">No resistance sessions in this window yet.</p>}
        <p>Averages of recorded movement symmetry and completed-rep form accuracy.</p></figure></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Medical telemetry table scroll area"><table aria-label="Medical telemetry"><thead><tr><th>Date (UTC)</th><th>Strength retention (%)</th><th>Volume (kg)</th></tr></thead><tbody>{medical.retentionSeries.map((point, index) => <tr key={point.dateIso}><td>{point.dateIso}</td><td>{point.strengthRetentionPct.toFixed(1)}</td><td>{medical.volumeSeries[index].volumeKg.toFixed(0)}</td></tr>)}</tbody></table></div>
      <section className="glass correction-summary"><h3>Recorded correction flags</h3><ul aria-label="Fault counts">{Object.entries(medical.faultCounts).map(([fault, count]) => <li key={fault}><span>{faultAlerts[fault as keyof typeof faultAlerts] ?? fault}</span><strong>{count}</strong></li>)}</ul></section>
    </section>
    <section className="mission-section history-section" data-screen="logs" data-active={navigation.activePage === 'logs'} aria-labelledby="history-heading">
      <p className="eyebrow">Session Archive</p>
      <h2 className="page-title" id="history-heading">Workout Logs &amp; History</h2>
      <p className="section-subtitle">{history.totalSessions} matching sessions · Select Details to inspect a workout or replay a flagged rep.</p>
      <p className="status-legend">Good / Review / Flagged (GREEN / YELLOW / RED) indicate prototype form status, not medical clearance.</p>
      <div className="history-layout"><div className="glass history-master">      <div className="history-filters">
      <label className="visually-hidden" htmlFor="workout-search">Search workouts</label>{' '}<input placeholder="Search exercise, date, issue…" id="workout-search" type="search" value={history.searchQuery} onChange={e => history.setSearchQuery(e.target.value)} />{' '}
      <label htmlFor="history-date-range">Workout date range</label>{' '}<select id="history-date-range" value={history.dateRange} onChange={e => history.setDateRange(e.target.value as WorkoutDateRange)}>
        <option value="ALL">All dates</option><option value="LAST_7_DAYS">Last 7 days</option><option value="LAST_14_DAYS">Last 14 days</option><option value="LAST_30_DAYS">Last 30 days</option>
      </select>
      </div>
<div className="table-scroll" tabIndex={0} role="region" aria-label="Workout history table scroll area"><table aria-label="Workout history">
        <thead><tr><th>Completed (UTC)</th><th>Exercise</th><th>Duration (MM:SS)</th><th>Status</th><th>Form (%)</th><th>Details / flagged reps</th></tr></thead>
        <tbody>{history.sessions.map(session => <tr key={session.id} data-selected={history.selectedSession?.id === session.id} onClick={event => { if (!(event.target as HTMLElement).closest('button, summary, details')) history.selectSession(session.id); }}>
          <td><time dateTime={session.completedAtIso} aria-label={session.completedAtIso}>{formatLogDate(session.completedAtIso)}<small>{session.completedAtIso.slice(11, 16)} UTC</small></time></td><td>{getExerciseById(session.exerciseId).name}</td><td>{session.formattedDuration}</td><td><FormStatus status={session.formStatus} /></td><td>{session.formAccuracyPct.toFixed(1)}</td>
          <td><button onClick={() => history.selectSession(session.id)}>Details</button>{' '}{session.snapshots.length > 0 && <details className="row-replays"><summary>Flagged reps ({session.snapshots.length})</summary>{session.snapshots.map(snapshot => <button key={snapshot.repNumber} onClick={() => history.selectSnapshotForReplay(snapshot)}>Replay saved rep {snapshot.repNumber}</button>)}</details>}</td>
        </tr>)}</tbody>
      </table></div>
      {!history.totalSessions && <p>No workouts match these filters.</p>}
      <p><button disabled={history.page === 1} onClick={() => history.setPage(history.page - 1)}>Previous page</button>{' '}
        <output aria-label="History pagination">Page {history.page} of {history.totalPages}</output>{' '}
        <button disabled={history.page === history.totalPages} onClick={() => history.setPage(history.page + 1)}>Next page</button></p>
      </div><aside className="glass history-detail-panel">{!history.selectedSession && <div className="history-placeholder"><MissionIcon name="logs" /><h3>Session Details</h3><p>Select a workout to review session metrics and flagged rep diagnostics.</p></div>}<section aria-label="Session details" hidden={!history.selectedSession}>
        <h3>Session Details</h3>
        {history.selectedSession && <>
          <h4 className="history-exercise-title">{getExerciseById(history.selectedSession.exerciseId).name}</h4>
          <p className="history-session-date">{formatLogDate(history.selectedSession.completedAtIso)} · {history.selectedSession.completedAtIso.slice(11, 16)} UTC</p><FormStatus status={getSessionFormStatus(history.selectedSession)} />
          <dl className="session-metrics">{(getExerciseById(history.selectedSession.exerciseId).kind === 'CARDIO' ? [
            ['Distance', `${history.selectedSession.cardioDistanceKm} km`], ['Duration', formatDurationMmSs(history.selectedSession.durationSec)],
            ['Pace', history.selectedSession.durationSec > 0 && history.selectedSession.cardioDistanceKm > 0 ? `${formatPace(history.selectedSession.durationSec / history.selectedSession.cardioDistanceKm)}` : '—'],
          ] : [
            ['Reps', history.selectedSession.sets * history.selectedSession.reps], ['Sets', history.selectedSession.sets], ['Load', `${roundKg(history.selectedSession.loadKg)} kg`],
            ['Duration', formatDurationMmSs(history.selectedSession.durationSec)], ['Accuracy', `${history.selectedSession.formAccuracyPct.toFixed(1)}%`], ['Symmetry', `${history.selectedSession.symmetryScorePct.toFixed(1)}%`],
          ]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <p className="session-volume">Logged load: {roundKg(history.selectedSession.loadKg)} kg; volume: {roundKg(history.selectedSession.resistanceVolumeKg)} kg · Distance: {history.selectedSession.cardioDistanceKm} km · Sync: {mission.state.acknowledgements.some(ack => ack.sessionId === history.selectedSession?.id) ? 'SYNCED' : 'QUEUED_BLACKOUT'}</p>
          <h4 className="session-flags-title">Form issues flagged ({history.selectedSession.snapshots.length})</h4>
          <p className="session-flags">Flagged issues: {[...new Set(history.selectedSession.snapshots.flatMap(snapshot => snapshot.faultFlags))].map(flag => faultAlerts[flag]).join(', ') || 'None'}</p>
          <h4 className="session-replay-title">Kinematic snapshot replay</h4>
          {!history.selectedSession.snapshots.length && <p className="session-replay-empty">No flagged reps were captured for this session — clean session.</p>}
          {(() => { const session = history.selectedSession, shown = (history.selectedSnapshot && session.snapshots.includes(history.selectedSnapshot) ? history.selectedSnapshot : session.snapshots[0]);
            return shown && getExerciseById(session.exerciseId).kind === 'RESISTANCE' ? <RepIllustration exerciseId={session.exerciseId as ResistanceExerciseId} repNumber={shown.repNumber} faultFlags={shown.faultFlags} faultLabel={shown.faultFlags.map(flag => faultAlerts[flag]).join(' · ')} /> : null; })()}
          {history.selectedSession.snapshots.length > 0 && <p className="session-replay-note">Motion is illustrated from the recorded fault. Select a rep to view its saved pose.</p>}
          <div className="session-replay-reps">{history.selectedSession.snapshots.map(snapshot => <button key={snapshot.repNumber} aria-pressed={history.selectedSnapshot === snapshot} onClick={() => history.selectSnapshotForReplay(snapshot)}>Replay detail rep {snapshot.repNumber}</button>)}</div>
        </>}
        <canvas ref={history.replayCanvasRef} aria-label="Saved snapshot replay" width={640} height={480} hidden={!history.selectedSnapshot}>Saved flagged rep skeletal replay.</canvas>
        <SnapshotDiagnostic snapshot={history.selectedSnapshot} label="Saved snapshot diagnostic" />
      </section></aside></div>
    </section>
    <section className="mission-section settings-section" data-screen="settings" data-view={navigation.activePage} data-active={navigation.activePage === 'settings' || navigation.activePage === 'profile'} aria-labelledby={navigation.activePage === 'profile' ? 'profile-heading' : 'settings-heading'}>
      <p className="eyebrow">{navigation.activePage === 'profile' ? 'Crew Member' : 'Configuration'}</p>
      <h2 className="page-title settings-only" id="settings-heading">Profile &amp; Mission Settings</h2>
      <h2 className="page-title profile-only" id="profile-heading">Astronaut Profile</h2>
      <p className="section-subtitle">{navigation.activePage === 'profile' ? 'Your personal details, health metrics and Earth baselines' : 'Gravity environment, routine behaviour and onboard data'}</p>
      <div className="configuration-actions"><button onClick={settings.applyProfile}>Save / Apply</button><p aria-label="Profile confirmation" role="status">{settings.profileConfirmationMessage}</p></div>
      <div className="configuration-grid">
        <section className="glass profile-only personal-card" aria-labelledby="personal-details-heading"><h3 className="section-card-heading" id="personal-details-heading"><MissionIcon name="profile" />Personal Details</h3><p className="section-subtitle">Your local crew identity and body weight.</p><div className="personal-details-body"><div className="profile-portrait" aria-hidden="true"><MissionIcon name="profile" /></div><div className="profile-fields">
      <label htmlFor="astronaut-name">Astronaut name</label>{' '}<input id="astronaut-name" value={settings.profileFieldValue('name')} aria-invalid={Boolean(settings.fieldErrors.name)} aria-describedby="astronaut-name-error" onChange={e => settings.setProfileField('name', e.target.value)} />
      <p id="astronaut-name-error" role={settings.fieldErrors.name ? 'alert' : undefined}>{settings.fieldErrors.name}</p>
      <label htmlFor="body-weight">Body weight (kg)</label>{' '}<span className="unit-input" data-unit="kg"><input id="body-weight" type="number" min="0.1" step="0.1" value={settings.profileFieldValue('bodyWeightKg')} aria-invalid={Boolean(settings.fieldErrors.bodyWeightKg)} aria-describedby="body-weight-error" onChange={e => settings.setProfileField('bodyWeightKg', e.target.value)} /></span>
      <p id="body-weight-error" role={settings.fieldErrors.bodyWeightKg ? 'alert' : undefined}>{settings.fieldErrors.bodyWeightKg}</p>
        </div></div></section>
        <section className="glass profile-only health-card" aria-labelledby="health-metrics-heading"><h3 className="section-card-heading" id="health-metrics-heading"><MissionIcon name="analytics" />Update Health Metrics</h3><p className="section-subtitle">Update your pre-flight context for routine recalibration.</p>
        <div className="health-metrics-grid"><HealthMetricFields prefix="settings" fieldValue={settings.profileFieldValue} setField={settings.setProfileField} errors={settings.fieldErrors} bmi={settings.bmi} includeWeight={false} /></div>
        <label htmlFor="settings-injury-limitations">Injury or physical limitation</label>{' '}<select id="settings-injury-limitations" value={settings.astronautProfile.injuryLimitations} onChange={event => settings.setInjuryLimitation(event.target.value as InjuryLimitation)}>{Object.entries(routineRules.limitations).map(([id, rule]) => <option key={id} value={id}>{sentenceCase(rule.label)}</option>)}</select>{' '}
        <label htmlFor="settings-injuryNotes">Limitation notes (optional)</label>{' '}<input id="settings-injuryNotes" value={settings.profileFieldValue('injuryNotes')} onChange={event => settings.setProfileField('injuryNotes', event.target.value)} />{' '}
        </section>
        <section className="glass settings-only gravity-card" aria-labelledby="gravity-settings-heading"><h3 className="section-card-heading" id="gravity-settings-heading"><MissionIcon name="globe" />Gravity Environment</h3><p className="section-subtitle">Choose the scenario for your next session.</p><div className="gravity-options">{catalog.gravityProfiles.map(gravity => <button key={gravity.id} aria-pressed={settings.gravityProfile === gravity.id} onClick={() => settings.setGravityProfile(gravity.id)}><strong>{gravity.gravityG}g</strong><span>{gravity.name}</span><small>{gravitySubtitles[gravity.id]} · {gravity.prototypeGoalPct}% scenario goal</small></button>)}</div>
      <label htmlFor="gravity-profile">Gravity profile</label>{' '}<select id="gravity-profile" value={settings.gravityProfile} onChange={e => settings.setGravityProfile(e.target.value as GravityProfileId)}>{catalog.gravityProfiles.map(g => <option key={g.id} value={g.id}>{g.name} ({g.gravityG}g)</option>)}</select>
        <label htmlFor="settings-mission-type">Mission type</label>{' '}<select id="settings-mission-type" value={settings.astronautProfile.missionType} onChange={event => settings.setMissionType(event.target.value as MissionType)}>{Object.entries(routineRules.missions).map(([id, mission]) => <option key={id} value={id}>{mission.label}</option>)}</select>{' '}
        <label htmlFor="settings-missionDurationDays">Mission duration (days)</label>{' '}<input id="settings-missionDurationDays" type="number" min="1" step="1" value={settings.profileFieldValue('missionDurationDays')} onChange={event => settings.setProfileField('missionDurationDays', event.target.value)} aria-invalid={Boolean(settings.fieldErrors.missionDurationDays)} aria-describedby="settings-mission-duration-error" />
        <p id="settings-mission-duration-error" role={settings.fieldErrors.missionDurationDays ? 'alert' : undefined}>{settings.fieldErrors.missionDurationDays}</p>
        </section>
        <section className="glass settings-only routine-settings" aria-labelledby="routine-settings-heading"><h3 className="section-card-heading" id="routine-settings-heading"><ReferenceIcon name="sparkles" />Routine Personalization</h3><p>Keep your program aligned with your saved baselines and recorded progress.</p><p className="prototype-note">Rule-based prototype prescriptions, not official medical standards.</p>
        <label className="toggle-row"><span><strong>Auto-adjust routine based on progress</strong><small>Regenerates your routine from your profile and recorded sessions after each saved workout.</small></span><input type="checkbox" aria-label="Auto-adjust routine based on progress" checked={settings.astronautProfile.autoAdjustRoutine} onChange={event => settings.setAutoAdjustRoutine(event.target.checked)} /></label>
        <div className="recalibration-card"><p><strong>Recalibrate Routine</strong></p><p>Regenerate your program using your current profile, Earth baselines and recorded progress.</p><button onClick={settings.recalibrateRoutine}><ReferenceIcon name="sparkles" />Recalibrate Routine</button></div>
<div className="settings-links"><button className="text-action" onClick={() => navigation.navigateToPage('onboarding')}><MissionIcon name="sync" />Re-run full mission onboarding</button><button className="text-action" onClick={() => navigation.navigateToPage('profile')}><MissionIcon name="profile" />Update profile &amp; health metrics</button></div></section>
        <div className="profile-only baseline-card">      <fieldset><legend><MissionIcon name="arena" />Earth 1RM baselines (kg)</legend>{Object.keys(settings.astronautProfile.earthBaseline1RM).map(key => {
        const id = key as ResistanceExerciseId;
        return <div key={id}><label htmlFor={`baseline-${id}`}>{getExerciseById(id).name} <span className="unit-input" data-unit="kg"><input id={`baseline-${id}`} aria-label={`${id} Earth baseline (kg)`} aria-invalid={Boolean(settings.fieldErrors[id])} aria-describedby={`baseline-${id}-error`} type="number" min="0.1" step="any" value={settings.profileFieldValue(id)} onChange={e => settings.setProfileField(id, e.target.value)} /></span></label><p id={`baseline-${id}-error`} role={settings.fieldErrors[id] ? 'alert' : undefined}>{settings.fieldErrors[id]}</p></div>;
      })}</fieldset>
<p className="prototype-note">Earth baselines are self-reported inputs for prototype load recommendations.</p></div>
        <section className="glass settings-only sync-settings" aria-labelledby="data-sync-heading"><h3 className="section-card-heading" id="data-sync-heading"><MissionIcon name="storage" />Data &amp; Communications</h3><p className="section-subtitle">Local storage and simulated communications windows.</p>
      <button onClick={settings.toggleCommsWindow}>{settings.commsStatus === 'WINDOW_OPEN' ? 'Close comms window' : 'Open comms window'}</button>{' '}
      <button disabled={mission.syncing || settings.commsStatus !== 'WINDOW_OPEN'} onClick={() => void settings.flushSyncQueueNow()}>Flush sync queue now</button>{' '}
      <output aria-label="Sync activity">{mission.syncing ? 'Syncing' : 'Idle'}</output>
      {mission.syncError && <p role="status">{mission.syncError}</p>}
      <dl className="sync-summary"><div><dt>Local data cache</dt><dd>{(mission.localCacheBytes / 1000).toFixed(1)} KB</dd><small>Serialized mission data; not disk quota</small></div><div><dt>Sync queue</dt><dd>{mission.state.syncQueue.length} pending</dd><small>{(mission.queuedPayloadBytes / 1000).toFixed(1)} KB summary payload</small></div><div><dt>Last sync</dt><dd>{mission.state.lastSyncedAtIso ?? 'Never'}</dd></div></dl>
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
      </div>
    </section>
    <section className="mission-section replay-section" data-screen="arena" data-active={navigation.activePage === 'arena'} aria-labelledby="replay-heading">
      <p className="eyebrow">MOVEMENT REVIEW</p>
      <h2 id="replay-heading">Kinematic Snapshot Replay</h2>
      <ul aria-label="Flagged reps">{arena.state.snapshots.map(snapshot => <li key={snapshot.repNumber}>
        <button onClick={() => setSelectedSnapshot(snapshot)}>Replay rep {snapshot.repNumber}</button>
      </li>)}</ul>
      <canvas ref={replayCanvas} aria-label="Kinematic snapshot replay" width={640} height={480} hidden={!selectedSnapshot}>Flagged rep skeletal replay with red fault highlights.</canvas>
      <SnapshotDiagnostic snapshot={selectedSnapshot} label="Current snapshot diagnostic" />
    </section>
    <section className="mission-section sources-section" data-screen="sources" data-active={navigation.activePage === 'sources'} aria-labelledby="science-sources-heading">
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
  <MilestoneCelebration celebrations={celebrations} />
  <footer className="mission-footer">PROJECT ARES · Astronaut Resistance &amp; Exercise System · NASA Space Apps Challenge</footer>
  </MissionChrome></>;
}
