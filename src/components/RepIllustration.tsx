import { useEffect, useRef, useState } from 'react';
import { getExerciseById } from '../core/catalog/missionCatalog';
import type { FormFaultFlag, ResistanceExerciseId } from '../core/types';

/*
 * Illustrated rep motion for the Logs replay, ported from the team's Figma/mockup pose generator.
 * Only the recorded exercise and fault flags come from the session; the motion itself is a drawing,
 * so it is always labelled "Illustrated". The saved peak pose remains available as the real replay.
 */
export type Pt = [number, number];
export const CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];
// Standing frontal pose in a 160 × 90 drawing space.
const BASE: readonly Pt[] = [
  [80, 17], [81.2, 15.8], [82.2, 15.6], [83.2, 15.8], [78.8, 15.8], [77.8, 15.6], [76.8, 15.8],
  [84.5, 16.5], [75.5, 16.5], [81.3, 19.3], [78.7, 19.3],
  [88, 26], [72, 26], [90.5, 38], [69.5, 38], [91.5, 49], [68.5, 49],
  [92.5, 52], [67.5, 52], [91.5, 53], [68.5, 53], [90.3, 51.5], [69.7, 51.5],
  [85.5, 50], [74.5, 50], [86.5, 66], [73.5, 66], [87, 81], [73, 81],
  [86.5, 83], [73.5, 83], [89, 84.5], [71, 84.5],
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const CYCLE_MS = 2600;
export const easeCycle = (x: number) => (1 - Math.cos(2 * Math.PI * x)) / 2;

export function posePoints(exercise: ResistanceExerciseId, t: number, lean: number): Pt[] {
  const p = BASE.map(([x, y]) => [x, y] as Pt);
  const upper = Array.from({ length: 23 }, (_, i) => i);
  const move = (indices: number[], dx: number, dy: number) => indices.forEach(i => { p[i][0] += dx; p[i][1] += dy; });
  const setArm = (side: 'L' | 'R', elbow: Pt, wrist: Pt) => {
    const [s, e, w, pinky, index, thumb] = side === 'L' ? [11, 13, 15, 17, 19, 21] : [12, 14, 16, 18, 20, 22];
    const sign = side === 'L' ? 1 : -1;
    p[e] = [p[s][0] + sign * elbow[0], p[s][1] + elbow[1]];
    p[w] = [p[s][0] + sign * wrist[0], p[s][1] + wrist[1]];
    const dx = p[w][0] - p[e][0], dy = p[w][1] - p[e][1], length = Math.hypot(dx, dy) || 1, ux = dx / length, uy = dy / length;
    p[pinky] = [p[w][0] + ux * 3 + sign, p[w][1] + uy * 3];
    p[index] = [p[w][0] + ux * 4, p[w][1] + uy * 4];
    p[thumb] = [p[w][0] + ux * 2.5 - sign * 1.2, p[w][1] + uy * 2.5];
  };
  if (exercise === 'SQUAT') {
    move(upper, 0, 15 * t);
    p[23][1] += 15 * t; p[24][1] += 15 * t; p[23][0] += 1.5 * t; p[24][0] -= 1.5 * t;
    p[25] = [p[25][0] + 4.5 * t, p[25][1] + 3 * t]; p[26] = [p[26][0] - 4.5 * t, p[26][1] + 3 * t];
    setArm('L', [5, 5], [7, -1]); setArm('R', [5, 5], [7, -1]);
  } else if (exercise === 'DEADLIFT') {
    move(upper, 0, 18 * t);
    p[23][1] += 6 * t; p[24][1] += 6 * t; p[25][0] += 1.2 * t; p[26][0] -= 1.2 * t; p[25][1] += 2 * t; p[26][1] += 2 * t;
    setArm('L', [1, 12], [-0.5, 23]); setArm('R', [1, 12], [-0.5, 23]);
  } else if (exercise === 'OVERHEAD_PRESS') {
    setArm('L', [lerp(7, 4, t), lerp(6, -12, t)], [lerp(5, 3, t), lerp(-3, -24, t)]);
    setArm('R', [lerp(7, 4, t), lerp(6, -12, t)], [lerp(5, 3, t), lerp(-3, -24, t)]);
  } else {
    setArm('L', [2.5, 12], [lerp(3, 4.5, t), lerp(23, 3, t)]);
    setArm('R', [2.5, 12], [lerp(3, 4.5, t), lerp(23, 3, t)]);
  }
  // Shoulders and head shift sideways while hips stay put: a visible spinal tilt.
  if (lean) upper.forEach(i => { p[i][0] += lean * 3.2 * (i <= 10 ? 1.2 : 1); });
  return p;
}

function faultJoints(exerciseId: ResistanceExerciseId, flags: readonly FormFaultFlag[]) {
  const exercise = getExerciseById(exerciseId);
  const joints = new Set<number>();
  if (exercise.kind !== 'RESISTANCE') return joints;
  for (const flag of flags) {
    const indices = flag === 'SPINE_MISALIGNED' ? [0, 11, 12, 23, 24] : flag === 'LOW_VISIBILITY' ? [] : [...exercise.leftJoint, ...exercise.rightJoint];
    indices.forEach(index => joints.add(index));
  }
  return joints;
}

export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props { exerciseId: ResistanceExerciseId; repNumber: number; faultFlags: readonly FormFaultFlag[]; faultLabel: string }
export function RepIllustration({ exerciseId, repNumber, faultFlags, faultLabel }: Props) {
  // Reduced motion starts paused at the bottom of the rep, where the fault is shown.
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [position, setPosition] = useState(() => prefersReducedMotion() ? 0.5 : 0);
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = prefersReducedMotion() ? 0.5 : 0; setPosition(positionRef.current); setPlaying(!prefersReducedMotion()); }, [exerciseId, repNumber]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      positionRef.current = (positionRef.current + (now - previous) / CYCLE_MS) % 1;
      previous = now; setPosition(positionRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const shallow = faultFlags.includes('DEPTH_INSUFFICIENT'), leaning = faultFlags.includes('SPINE_MISALIGNED');
  const phase = easeCycle(position);
  const points = posePoints(exerciseId, phase * (shallow ? 0.66 : 1), leaning ? phase : 0);
  const showFault = phase > 0.45;
  const bad = showFault ? faultJoints(exerciseId, faultFlags) : new Set<number>();
  return <div className="rep-illustration">
    <div className="rep-illustration-stage">
      <svg viewBox="20 -2 120 92" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Illustrated ${getExerciseById(exerciseId).name.toLowerCase()} rep ${repNumber} showing: ${faultLabel}`}>
        {CONNECTIONS.map(([a, b]) => { const isBad = bad.has(a) && bad.has(b);
          return <line key={`${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke={isBad ? '#ff6b6b' : '#8fd3ff'} strokeWidth={isBad ? 0.8 : 0.55} strokeLinecap="round" opacity={0.9} />; })}
        {points.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r={index <= 10 ? 0.55 : 0.9} fill={bad.has(index) ? '#ff6b6b' : index >= 23 ? '#f6a623' : '#fff'} stroke="#08183a" strokeWidth={0.25} />)}
      </svg>
      <span className="rep-illustration-tag">Illustrated · Rep {repNumber}</span>
      {showFault && <span className="rep-illustration-fault">{faultLabel}</span>}
    </div>
    <div className="rep-illustration-controls">
      <button type="button" className="rep-illustration-toggle" aria-label={playing ? 'Pause illustrated rep' : 'Play illustrated rep'} onClick={() => setPlaying(value => !value)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">{playing ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" /> : <path d="m8 5 11 7-11 7Z" />}</svg>
      </button>
      <input type="range" min={0} max={100} value={Math.round(position * 100)} aria-label="Illustrated rep position"
        onChange={event => { setPlaying(false); positionRef.current = Number(event.target.value) / 100; setPosition(positionRef.current); }} />
    </div>
  </div>;
}
