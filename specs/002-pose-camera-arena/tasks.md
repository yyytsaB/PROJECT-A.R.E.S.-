# Implementation Tasks (Vertical TDD Slices): M2 — MediaPipe Pose Adapter, Canvas & Snapshot Replay

- **Spec Reference:** `./spec.md`
- **Owner:** Developer #1 (Vision & Kinematics Lead)

---

## Vertical Slices

- [x] **Slice 1 (Tracer Bullet): 2D `<canvas>` Skeletal Wireframe & Snapshot Replay Renderer (`src/adapters/poseCanvasRenderer.ts`)**
  - **Target Seam:** `Seam 6 — drawPoseWireframe & renderKinematicSnapshot`
  - **Red Test Assertion:** Unit test with a mock/spy `CanvasRenderingContext2D` verifies 33-point bone connections are drawn, primary vertex joint angle text is rendered, and faulted joints use alert stroke styling when `faultFlags` is non-empty.
  - **Files Touched:** `src/adapters/poseCanvasRenderer.ts`, `src/adapters/poseCanvasRenderer.test.ts`
  - **Verify Command:** `npx vitest run src/adapters/poseCanvasRenderer.test.ts`

- [x] **Slice 2: Lazy MediaPipe `PoseLandmarker` Source & Deterministic Trajectory Simulator (`src/adapters/poseCameraAdapter.ts`)**
  - **Target Seam:** `Seam 6 — createPoseSource & generateSimulatedRepFrames`
  - **Red Test Assertion:** Verifies `generateSimulatedRepFrames(exerciseId, 'GOOD' | 'SHALLOW' | 'SPINE_FAULT')` produces a deterministic sequence of 33-point `RawPoseFrame` objects that drive `advanceRepState` to a completed rep (or flagged snapshot) across all 4 ARED exercises.
  - **Files Touched:** `src/adapters/poseCameraAdapter.ts`, `src/adapters/poseCameraAdapter.test.ts`
  - **Verify Command:** `npx vitest run src/adapters/poseCameraAdapter.test.ts`

- [x] **Slice 3: Headless `useWorkoutArena` Hook & Plain Semantic Arena Testbench**
  - **Target Seam:** `Seam 6 — useWorkoutArena`
  - **Red Test Assertion:** Integration test starts a session, switches exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), runs a simulated good rep and a simulated shallow rep, pauses/resumes, and ends the session returning the completed summary + captured `KinematicSnapshot[]`.
  - **Files Touched:** `src/hooks/useWorkoutArena.ts`, `src/hooks/useWorkoutArena.test.tsx`, `src/App.tsx`
  - **Verify Command:** `npx vitest run && npm run typecheck`

---

## Milestone Completion Checklist

- [x] All vertical slices above are marked `[x]` with passing tests.
- [x] `npm run typecheck` passes with zero errors.
- [x] `ROADMAP.md` updated to mark `M2` complete (`[x]`).

Verification: run the tests and typecheck commands recorded above.
