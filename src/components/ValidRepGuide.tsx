import { useEffect, useRef, useState } from 'react';
import { getExerciseById } from '../core/catalog/missionCatalog';
import { MIN_REP_EXCURSION_FRACTION, startZoneDeg } from '../core/kinematics/repStateMachine';
import type { ResistanceExerciseId } from '../core/types';
import { CONNECTIONS, CYCLE_MS, easeCycle, posePoints, prefersReducedMotion } from './RepIllustration';

/*
 * Reference motion for what the rep counter accepts. The figure is a drawing (labelled "Reference"); every angle and
 * zone shown comes from the same exercise configuration and rep-machine constants that count real reps.
 */
const cues: Readonly<Record<ResistanceExerciseId, { joint: string; start: string; target: string; moving: string; inFrame: string }>> = {
  SQUAT: { joint: 'Knee', start: 'Stand tall', target: 'Squat down', moving: 'Lowering', inFrame: 'shoulders, hips, knees and ankles' },
  DEADLIFT: { joint: 'Hip', start: 'Stand tall', target: 'Hinge forward', moving: 'Hinging', inFrame: 'shoulders, hips and knees' },
  OVERHEAD_PRESS: { joint: 'Elbow', start: 'Hands at shoulders', target: 'Press overhead', moving: 'Pressing', inFrame: 'shoulders, elbows, wrists and hips' },
  BICEP_CURL: { joint: 'Elbow', start: 'Arms extended', target: 'Curl up', moving: 'Curling', inFrame: 'shoulders, elbows, wrists and hips' },
};
const FRAME_MS = 33;

export function ValidRepGuide({ exerciseId, animate }: { exerciseId: ResistanceExerciseId; animate: boolean }) {
  const exercise = getExerciseById(exerciseId);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  // Reduced motion rests at the target pose, the most informative frame.
  const [position, setPosition] = useState(() => prefersReducedMotion() ? 0.5 : 0);
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = prefersReducedMotion() ? 0.5 : 0; setPosition(positionRef.current); }, [exerciseId]);
  const running = playing && animate;
  useEffect(() => {
    if (!running) return;
    let frame = 0, previous = performance.now(), drawn = 0;
    const tick = (now: number) => {
      positionRef.current = (positionRef.current + (now - previous) / (CYCLE_MS * 1.4)) % 1;
      previous = now;
      // About 30 updates per second is smooth for a small line drawing and halves the React work.
      if (now - drawn >= FRAME_MS) { drawn = now; setPosition(positionRef.current); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  if (exercise.kind !== 'RESISTANCE') return null;

  const cue = cues[exerciseId];
  const direction = Math.sign(exercise.targetAngleDeg - exercise.startAngleDeg);
  const range = Math.abs(exercise.targetAngleDeg - exercise.startAngleDeg);
  const zone = startZoneDeg(exercise);
  const angleAt = (fraction: number) => Math.round(exercise.startAngleDeg + direction * range * fraction);
  const toward = direction < 0 ? '≤' : '≥', away = direction < 0 ? '≥' : '≤';
  const startBound = angleAt(zone / range), countBound = angleAt(MIN_REP_EXCURSION_FRACTION), cleanBound = angleAt((range - exercise.hysteresisDeg) / range);
  const stops = [0, zone / range, MIN_REP_EXCURSION_FRACTION, (range - exercise.hysteresisDeg) / range, 1].map(value => value * 100);

  const phase = easeCycle(position);
  const points = posePoints(exerciseId, phase, 0);
  const angle = angleAt(phase);
  const phaseLabel = phase < 0.06 ? 'Start position' : phase > 0.94 ? 'Target reached' : position < 0.5 ? cue.moving : 'Returning';
  const zoneLabel = phase * range <= zone ? 'Start zone' : phase < MIN_REP_EXCURSION_FRACTION ? 'Not counted yet' : phase * range < range - exercise.hysteresisDeg ? 'Counts, flagged shallow' : 'Clean rep depth';

  return <section className="glass valid-rep-guide" aria-labelledby="valid-rep-guide-heading">
    <div className="valid-rep-heading"><h3 id="valid-rep-guide-heading">Valid rep reference</h3>
      <button type="button" className="valid-rep-toggle" aria-label={running ? 'Pause reference rep' : 'Play reference rep'} aria-pressed={!running} disabled={!animate} onClick={() => setPlaying(value => !value)}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false">{running ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" /> : <path d="m8 5 11 7-11 7Z" />}</svg>
      </button></div>
    <div className="valid-rep-stage">
      <span className="valid-rep-tag"><span className="valid-rep-dot" aria-hidden="true" />Reference</span>
      <span className="valid-rep-phase" aria-hidden="true">{phaseLabel}</span>
      <svg viewBox="30 -3 100 91" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Reference ${exercise.name.toLowerCase()}: ${cue.start.toLowerCase()}, ${cue.target.toLowerCase()} to a ${cue.joint.toLowerCase()} angle of ${toward} ${cleanBound} degrees, then return to the start`}>
        {CONNECTIONS.map(([a, b]) => <line key={`${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke="#8fd3ff" strokeWidth={0.6} strokeLinecap="round" />)}
        {points.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r={index <= 10 ? 0.55 : 0.95} fill={index >= 23 ? '#f6a623' : '#fff'} stroke="#08183a" strokeWidth={0.25} />)}
      </svg>
      <span className="valid-rep-caption" aria-hidden="true">33-point pose · {cue.joint} angle {angle}°</span>
    </div>
    <div className="valid-rep-gauge" aria-hidden="true">
      <div className="valid-rep-track" style={{ background: `linear-gradient(90deg, #8fbcff55 0 ${stops[1]}%, #ffffff1a ${stops[1]}% ${stops[2]}%, #f6a62366 ${stops[2]}% ${stops[3]}%, #64e3ae88 ${stops[3]}% 100%)` }}>
        <span className="valid-rep-rail" style={{ transform: `translateX(${phase * 100}%)` }}><span className="valid-rep-marker" /></span>
      </div>
      <div className="valid-rep-scale"><span>{exercise.startAngleDeg}°</span><strong>{zoneLabel}</strong><span>{exercise.targetAngleDeg}°</span></div>
    </div>
    <ol className="valid-rep-rules">
      <li><strong>{cue.start}</strong> until the {cue.joint.toLowerCase()} angle reads {away} {startBound}°. This arms the counter.</li>
      <li><strong>{cue.target}</strong> to {toward} {cleanBound}° for a clean rep. Reaching {toward} {countBound}° still counts, flagged “Depth insufficient”; less is ignored.</li>
      <li><strong>Return</strong> to {away} {startBound}°. The rep counts on the return.</li>
      <li>Keep your {cue.inFrame} in frame, trunk lean within {exercise.maxTrunkLeanDeg}° and both sides within {exercise.symmetryToleranceDeg}° of each other.</li>
    </ol>
  </section>;
}
