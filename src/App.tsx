import { useEffect, useRef, useState } from 'react';
import { getExerciseById, loadMissionCatalog } from './core/catalog/missionCatalog';
import type { CardioExerciseId, GravityProfileId, KinematicSnapshot, PlanetaryRouteId, RepMachineState, ResistanceExerciseId } from './core/types';
import { renderKinematicSnapshot } from './adapters/poseCanvasRenderer';
import { useWorkoutArena } from './hooks/useWorkoutArena';
import scienceSources from './content/scienceSources.json';
import { MissionTelemetryProvider, useDashboardSummary, useExpeditionJourney, useMedicalTelemetry, useMissionProfile, useMissionTelemetry, useWorkoutHistory } from './hooks/useMissionTelemetry';

export default function App() {
  return <MissionTelemetryProvider><MissionApp /></MissionTelemetryProvider>;
}

function MissionApp() {
  const catalog = loadMissionCatalog();
  const mission = useMissionTelemetry();
  const [loadKg, setLoadKg] = useState(getExerciseById('SQUAT').defaultLoadKg);
  const [cardioExercise, setCardioExercise] = useState<CardioExerciseId>('TREADMILL');
  const [cardioDistance, setCardioDistance] = useState('5');
  const [summary, setSummary] = useState<RepMachineState | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<KinematicSnapshot | null>(null);
  const replayCanvas = useRef<HTMLCanvasElement>(null);
  const arena = useWorkoutArena({ onCompleted: state => {
    setSummary(state);
    if (state.repCount > 0) mission.saveWorkout({ id: crypto.randomUUID(), exerciseId: state.exerciseId, completedAtIso: new Date().toISOString(),
      sets: 1, reps: state.repCount, loadKg, cardioDistanceKm: 0, formAccuracyPct: state.formAccuracyPct,
      symmetryScorePct: state.peakAnalysis?.symmetryScorePct ?? 100, snapshots: state.snapshots });
  } });
  const dashboard = useDashboardSummary(id => { arena.selectExercise(id); setLoadKg(getExerciseById(id).defaultLoadKg); resetDisplay(); void arena.start('SIMULATED'); }, arena.mode === 'LIVE' && arena.isRunning);
  const journey = useExpeditionJourney();
  const medical = useMedicalTelemetry();
  const history = useWorkoutHistory();
  const settings = useMissionProfile();
  const resetDisplay = () => { setSummary(null); setSelectedSnapshot(null); };
  useEffect(() => {
    const ctx = replayCanvas.current?.getContext('2d');
    if (ctx && selectedSnapshot) renderKinematicSnapshot(ctx, selectedSnapshot);
  }, [selectedSnapshot]);
  return <main>
    <h1>Project A.R.E.S. Command Center</h1>
    <section aria-labelledby="command-heading">
      <h2 id="command-heading">Command Center</h2>
      <p>Mission day: {dashboard.missionDay}. Offline-first storage active.</p>
      <p>Strength retention: <output aria-label="Strength retention">{medical.strengthRetentionPct.toFixed(1)}%</output></p>
      <p>Comms: <output aria-label="Comms status">{settings.commsStatus}</output>. Queued: <output aria-label="Queued sync count">{mission.state.syncQueue.length}</output></p>
      <p>Saved sessions: <output aria-label="Saved session count">{mission.state.sessions.length}</output>. Acknowledged: <output aria-label="Acknowledged session count">{mission.state.acknowledgements.length}</output></p>
      <h3>Today’s exercise schedule</h3>
      <ul>{dashboard.todaySchedule.map(exercise => <li key={exercise.id}>{exercise.name}{exercise.kind === 'RESISTANCE' && <button onClick={() => dashboard.quickLaunchExercise?.(exercise.id)}>Quick launch {exercise.name}</button>}</li>)}</ul>
      <form onSubmit={event => {
        event.preventDefault(); const distance = Number(cardioDistance);
        if (!Number.isFinite(distance) || distance <= 0) return;
        mission.saveWorkout({ id: crypto.randomUUID(), exerciseId: cardioExercise, completedAtIso: new Date().toISOString(), sets: 0, reps: 0, loadKg: 0,
          cardioDistanceKm: distance, formAccuracyPct: 100, symmetryScorePct: 100, snapshots: [] });
      }}>
        <label htmlFor="cardio-exercise">Cardio exercise</label>{' '}<select id="cardio-exercise" value={cardioExercise} onChange={e => setCardioExercise(e.target.value as CardioExerciseId)}>{catalog.exercises.filter(e => e.kind === 'CARDIO').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>{' '}
        <label htmlFor="cardio-distance">Cardio distance (km)</label>{' '}<input id="cardio-distance" type="number" min="0.01" step="0.01" required value={cardioDistance} onChange={e => setCardioDistance(e.target.value)} />{' '}
        <button type="submit">Log cardio session</button>
      </form>
    </section>
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
        Reps: <output aria-label="Completed reps">{arena.state.repCount}</output>{' '}
        Phase: <output aria-label="Rep phase">{arena.state.phase}</output>{' '}
        Peak ROM: <output aria-label="Peak ROM">{Math.round(arena.maxRomPct)}%</output></p>
      {arena.errorMessage && <p role="alert">{arena.errorMessage}</p>}
      <ul aria-label="Form alerts" aria-live="polite">{arena.activeFaultAlerts.map(alert => <li key={alert}>{alert}</li>)}</ul>
      <video ref={arena.videoRef} aria-label="Live camera preview" width={640} height={480} muted playsInline
        hidden={arena.mode !== 'LIVE' || !['STARTING', 'RUNNING', 'PAUSED'].includes(arena.sessionStatus)} />
      <canvas ref={arena.canvasRef} aria-label="Live skeletal pose" width={640} height={480}>Live pose wireframe and joint angle display.</canvas>
      {summary && <p aria-label="Completed workout summary">Session complete: {summary.repCount} reps; {summary.faultedRepCount} flagged; {Math.round(summary.formAccuracyPct)}% form accuracy.</p>}
    </section>
    <section aria-labelledby="journey-heading">
      <h2 id="journey-heading">Expedition Journey</h2>
      <label htmlFor="active-route">Active route</label>{' '}<select id="active-route" value={journey.activeRoute.id} onChange={e => journey.selectRoute(e.target.value as PlanetaryRouteId)}>{catalog.routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}</select>
      <p>Distance: <output aria-label="Expedition distance">{journey.cumulativeDistanceKm.toFixed(2)} km</output>. Progress: {journey.progressPct.toFixed(3)}%</p>
      <progress aria-label="Route progress" max={100} value={journey.progressPct} />
      <p>Cardio: {journey.cardioKm.toFixed(2)} km; resistance equivalent: {journey.resistanceEquivalentKm.toFixed(2)} km; tonnage: {journey.totalTonnageKg.toFixed(0)} kg.</p>
      <ul aria-label="Unlocked badges">{journey.unlockedBadges.map(badge => <li key={badge.id}>{badge.name}</li>)}</ul>
      <p>Next waypoint: {journey.nextWaypoint ? `${journey.nextWaypoint.name} at ${journey.nextWaypoint.distanceKm} km` : 'Route complete'}</p>
    </section>
    <section aria-labelledby="medical-heading">
      <h2 id="medical-heading">Medical Telemetry</h2>
      <p>30-day tonnage: {medical.cumulativeVolumeKg.toFixed(0)} kg. Symmetry consistency: {medical.symmetryScoreAvg.toFixed(1)}%.</p>
      <table aria-label="30-day medical telemetry"><thead><tr><th>Date (UTC)</th><th>Strength retention (%)</th><th>Volume (kg)</th></tr></thead><tbody>{medical.retentionSeries30d.map((point, index) => <tr key={point.dateIso}><td>{point.dateIso}</td><td>{point.strengthRetentionPct.toFixed(1)}</td><td>{medical.volumeSeries30d[index].volumeKg.toFixed(0)}</td></tr>)}</tbody></table>
      <ul aria-label="Fault counts">{Object.entries(medical.faultCounts).map(([fault, count]) => <li key={fault}>{fault}: {count}</li>)}</ul>
      <button onClick={() => medical.exportFlightSurgeonReport('json')}>Export Flight Surgeon JSON</button>{' '}
      <button onClick={() => medical.exportFlightSurgeonReport('csv')}>Export Flight Surgeon CSV</button>
    </section>
    <section aria-labelledby="history-heading">
      <h2 id="history-heading">Workout Logs &amp; History</h2>
      <label htmlFor="workout-search">Search workouts</label>{' '}<input id="workout-search" type="search" value={history.searchQuery} onChange={e => history.setSearchQuery(e.target.value)} />
      <table aria-label="Workout history"><thead><tr><th>Completed (UTC)</th><th>Exercise</th><th>Reps</th><th>Volume (kg)</th><th>Form (%)</th><th>Sync</th><th>Flagged reps</th></tr></thead><tbody>{history.sessions.map(session => <tr key={session.id}><td>{session.completedAtIso}</td><td>{session.exerciseId}</td><td>{session.sets * session.reps}</td><td>{session.resistanceVolumeKg.toFixed(0)}</td><td>{session.formAccuracyPct.toFixed(1)}</td><td>{mission.state.acknowledgements.some(a => a.sessionId === session.id) ? 'SYNCED' : 'QUEUED_BLACKOUT'}</td><td>{session.snapshots.map(snapshot => <button key={snapshot.repNumber} onClick={() => history.selectSnapshotForReplay(snapshot)}>Replay saved rep {snapshot.repNumber}</button>)}</td></tr>)}</tbody></table>
      <canvas ref={history.replayCanvasRef} aria-label="Saved snapshot replay" width={640} height={480} hidden={!history.selectedSnapshot}>Saved flagged rep skeletal replay.</canvas>
    </section>
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading">Profile &amp; Mission Settings</h2>
      <label htmlFor="astronaut-name">Astronaut name</label>{' '}<input id="astronaut-name" value={settings.astronautProfile.name} onChange={e => { if (e.target.value.trim()) settings.updateProfile({ name: e.target.value }); }} />{' '}
      <label htmlFor="gravity-profile">Gravity profile</label>{' '}<select id="gravity-profile" value={settings.gravityProfile} onChange={e => settings.setGravityProfile(e.target.value as GravityProfileId)}>{catalog.gravityProfiles.map(g => <option key={g.id} value={g.id}>{g.name} ({g.gravityG}g)</option>)}</select>
      <fieldset><legend>Earth 1RM baselines (kg)</legend>{Object.entries(settings.astronautProfile.earthBaseline1RM).map(([id, baseline]) => <label key={id}>{id} <input aria-label={`${id} Earth baseline (kg)`} type="number" min="1" value={baseline} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value > 0) settings.updateProfile({ earthBaseline1RM: { ...settings.astronautProfile.earthBaseline1RM, [id]: value } }); }} /></label>)}</fieldset>
      <button onClick={settings.toggleCommsWindow}>{settings.commsStatus === 'WINDOW_OPEN' ? 'Close comms window' : 'Open comms window'}</button>{' '}
      <button disabled={mission.syncing || settings.commsStatus !== 'WINDOW_OPEN'} onClick={() => void settings.flushSyncQueueNow()}>Flush sync queue now</button>{' '}
      <output aria-label="Sync activity">{mission.syncing ? 'Syncing' : 'Idle'}</output>
      {mission.syncError && <p role="status">{mission.syncError}</p>}
      <p>Last sync: {mission.state.lastSyncedAtIso ?? 'Never'}</p>
      <button onClick={settings.seed30DayDemoData}>Seed 30-Day Mars Demo Data</button>{' '}
      <button onClick={settings.clearLocalCache}>Clear local cache</button>
    </section>
    <section aria-labelledby="replay-heading">
      <h2 id="replay-heading">Kinematic Snapshot Replay</h2>
      <ul aria-label="Flagged reps">{arena.state.snapshots.map(snapshot => <li key={snapshot.repNumber}>
        <button onClick={() => setSelectedSnapshot(snapshot)}>Replay rep {snapshot.repNumber}</button>
      </li>)}</ul>
      <canvas ref={replayCanvas} aria-label="Kinematic snapshot replay" width={640} height={480} hidden={!selectedSnapshot}>Flagged rep skeletal replay with red fault highlights.</canvas>
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
  </main>;
}
