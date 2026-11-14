# Implementation Tasks (Vertical TDD Slices): M1 — Kinematic Analysis Engine & Rep State Machine

- **Spec Reference:** `./spec.md`
- **Owner:** Developer #1 (Vision & Kinematics Lead)

---

## Vertical Slices

- [x] **Slice 1 (Tracer Bullet): `computeJointAngleDeg` & `normalizePose33` Invariance (`Seam 1`)**
  - **Target Seam:** `Seam 1 — computeJointAngleDeg & normalizePose33`
  - **Red Test Assertion:** Asserts exact `90°`, `180°`, and `45°` vector angles on known 3D coordinates, plus translation/scale invariance of pelvis-centered `normalizePose33`.
  - **Files Touched:** `src/core/kinematics/poseFixtures.ts`, `src/core/kinematics/kinematicMath.ts`, `src/core/kinematics/kinematicMath.test.ts`
  - **Verify Command:** `npx vitest run src/core/kinematics/kinematicMath.test.ts`

- [x] **Slice 2: `analyzeExerciseFrame` — ROM %, Bilateral Symmetry %, Spine Lean & Fault Flags (`Seam 1`)**
  - **Target Seam:** `Seam 1 — analyzeExerciseFrame`
  - **Red Test Assertion:** Verifies ROM (`0..100%`) for both flexion exercises (`SQUAT`, `BICEP_CURL`) and extension exercises (`OVERHEAD_PRESS`), flags `'SPINE_MISALIGNED'` when trunk lean exceeds `maxTrunkLeanDeg`, flags `'BILATERAL_ASYMMETRY'` when left/right angles diverge beyond `symmetryToleranceDeg`, and flags `'LOW_VISIBILITY'` when key landmark visibility `< 0.5`.
  - **Files Touched:** `src/core/kinematics/kinematicMath.ts`, `src/core/kinematics/kinematicMath.test.ts`
  - **Verify Command:** `npx vitest run src/core/kinematics/kinematicMath.test.ts`

- [x] **Slice 3: `advanceRepState` — Good Rep Hysteresis Cycle for Flexion & Extension Exercises (`Seam 2`)**
  - **Target Seam:** `Seam 2 — createInitialRepState & advanceRepState`
  - **Red Test Assertion:** Feeding a full Squat (`170° -> 90° -> 170°`) and Overhead Press (`75° -> 170° -> 75°`) trajectory transitions `IDLE -> ECCENTRIC -> INFLECTION -> CONCENTRIC -> COMPLETED`, increments `repCount` by `1`, and ignores single-frame jitter within `hysteresisDeg`.
  - **Files Touched:** `src/core/kinematics/repStateMachine.ts`, `src/core/kinematics/repStateMachine.test.ts`
  - **Verify Command:** `npx vitest run src/core/kinematics/repStateMachine.test.ts`

- [x] **Slice 4: Shallow Rep & Spine Fault Detection + Automatic 33-Point `KinematicSnapshot` Capture (`Seam 2`)**
  - **Target Seam:** `Seam 2 — advanceRepState` fault & snapshot capture
  - **Red Test Assertion:** Feeding a shallow Squat (`170° -> 125° -> 170°`) or spine-lean Deadlift records `'DEPTH_INSUFFICIENT'` / `'SPINE_MISALIGNED'`, emits human-readable alert strings (`"Depth insufficient"`, `"Spine not aligned"`), and saves a 33-point `KinematicSnapshot` at the inflection timestamp.
  - **Files Touched:** `src/core/kinematics/repStateMachine.ts`, `src/core/kinematics/repStateMachine.test.ts`
  - **Verify Command:** `npx vitest run && npm run typecheck`

---

## Milestone Completion Checklist

- [x] All vertical slices above are marked `[x]` with passing tests.
- [x] `npm run typecheck` passes with zero errors.
- [x] `ROADMAP.md` updated to mark `M1` complete (`[x]`).

Verification: run the tests and typecheck commands recorded above.
