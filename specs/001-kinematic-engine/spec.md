# Feature Spec: M1 — 33-Point Kinematic Analysis Engine & Rep/Form State Machine (`Seam 1` & `Seam 2`)

- **Status:** `APPROVED` (Nov 14, 2026)
- **Milestone Reference:** `ROADMAP.md` -> `M1`
- **Owner:** Developer #1 (You + ChatGPT Heavy Coder)
- **Resolved Fog Items:** `F1`, `F3`

---

## 1. Problem Statement & Crew Outcome
During a 24-minute Mars communication blackout, Houston flight surgeons cannot watch an astronaut lift on the ARED device. Project A.R.E.S. requires a 100% pure, deterministic biomechanical analysis engine (`Seam 1: KinematicMath`) and hysteresis repetition state machine (`Seam 2: RepAndFormStateMachine`) that:
1. Normalizes 33-point MediaPipe Pose frames (`RawPoseFrame`) for camera distance and body position.
2. Computes primary left/right joint angles (`0..180°`), Range-of-Motion (`0..100%`), bilateral left/right symmetry (`0..100%`), and trunk/spine alignment lean (`deg`).
3. Counts valid repetitions (`IDLE -> ECCENTRIC -> INFLECTION -> CONCENTRIC -> COMPLETED`) across all 4 ARED exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`) driven purely by `ExerciseDefinition` data.
4. Flags improper reps (`"Depth insufficient"`, `"Spine not aligned"`, `"Left/Right imbalance"`) and automatically captures a lightweight 33-point **`KinematicSnapshot`** at the worst inflection frame for Workout Log wireframe replay.

## 2. Scope (Goals vs. Out of Scope)
- **In Scope (Goals):**
  - `src/core/kinematics/kinematicMath.ts` + `.test.ts` (`Seam 1`).
  - `src/core/kinematics/repStateMachine.ts` + `.test.ts` (`Seam 2`).
  - Synthetic 33-point pose fixture builders (`src/core/kinematics/poseFixtures.ts`) generating deterministic good reps, shallow reps, spine-lean reps, and asymmetric reps.
- **Out of Scope (Non-Goals):**
  - Browser `<video>` / `<canvas>` DOM integration (deferred to `M2`).

## 3. Ponytail Check (7-Rung Ladder of Laziness)
- **Reuse & Data over Code:** One generic angle + hysteresis algorithm reads `ExerciseDefinition` from `missionCatalog.json` to handle both **flexion-target exercises** (`SQUAT`, `DEADLIFT`, `BICEP_CURL` where `targetAngleDeg < startAngleDeg`) and **extension-target exercises** (`OVERHEAD_PRESS` where `targetAngleDeg > startAngleDeg`). Zero per-exercise subclasses.

## 4. Confirmed Public Test Seams (`Seam 1` & `Seam 2`)
```ts
// Seam 1: src/core/kinematics/kinematicMath.ts
export function normalizePose33(raw: RawPoseFrame): NormalizedPose33;
export function computeJointAngleDeg(a: Point3D, b: Point3D, c: Point3D): number;
export function analyzeExerciseFrame(pose: NormalizedPose33, exercise: ExerciseDefinition): KinematicFrameAnalysis;

// Seam 2: src/core/kinematics/repStateMachine.ts
export function createInitialRepState(exerciseId: ExerciseId): RepMachineState;
export function advanceRepState(
  state: RepMachineState,
  rawFrame: RawPoseFrame | null,
  exercise: ExerciseDefinition
): RepMachineStepResult;
```

## 5. Acceptance Scenarios (Given / When / Then)
1. **Scenario 1 (Scale & Translation Invariance):**
   - **Given** a 33-point pose frame and a copy translated by `(+0.2, -0.1)` and scaled by `2.0x`, **When** `normalizePose33` and `analyzeExerciseFrame` run, **Then** both yield identical `primaryAngleDeg`, `romPct`, and `symmetryScorePct` within `1e-5`.
2. **Scenario 2 (Full Good Rep Across Flexion & Extension Exercises):**
   - **Given** a sequence of frames transitioning from `startAngleDeg` (`170°` Squat) through `targetAngleDeg` (`90°`) and back to `170°` with aligned spine and balanced symmetry, **When** `advanceRepState` processes the trajectory, **Then** `repCount` increments to `1`, `formAccuracyPct >= 90`, and `capturedSnapshots` remains empty.
3. **Scenario 3 (Shallow Rep & Spine Fault -> KinematicSnapshot Capture):**
   - **Given** a Squat trajectory that reverses at `125°` (never reaching `targetAngleDeg: 95°`) or exhibits `trunkLeanDeg > maxTrunkLeanDeg`, **When** the astronaut returns to standing, **Then** the rep is flagged with `'DEPTH_INSUFFICIENT'` or `'SPINE_MISALIGNED'`, human-readable alert `"Depth insufficient"` / `"Spine not aligned"` is emitted, and a 33-point `KinematicSnapshot` at the inflection frame is appended to `state.snapshots`.
