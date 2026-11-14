import { useEffect, useRef, useState } from 'react';
import { loadMissionCatalog } from './core/catalog/missionCatalog';
import type { KinematicSnapshot, RepMachineState, ResistanceExerciseId } from './core/types';
import { renderKinematicSnapshot } from './adapters/poseCanvasRenderer';
import { useWorkoutArena } from './hooks/useWorkoutArena';
import scienceSources from './content/scienceSources.json';

export default function App() {
  const catalog = loadMissionCatalog();
  const [summary, setSummary] = useState<RepMachineState | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<KinematicSnapshot | null>(null);
  const replayCanvas = useRef<HTMLCanvasElement>(null);
  const arena = useWorkoutArena({ onCompleted: setSummary });
  const resetDisplay = () => { setSummary(null); setSelectedSnapshot(null); };
  useEffect(() => {
    const ctx = replayCanvas.current?.getContext('2d');
    if (ctx && selectedSnapshot) renderKinematicSnapshot(ctx, selectedSnapshot);
  }, [selectedSnapshot]);
  return <main>
    <h1>Project A.R.E.S. Command Center</h1>
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
        arena.selectExercise(e.target.value as ResistanceExerciseId); resetDisplay();
      }}>
        {catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
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
