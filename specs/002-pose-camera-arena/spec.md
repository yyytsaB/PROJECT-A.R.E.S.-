# Feature Spec: M2 — Live MediaPipe Pose Adapter, 60fps Skeletal Canvas & Snapshot Replay (`Seam 6`)

- **Status:** `APPROVED` (Nov 14, 2026)
- **Milestone Reference:** `ROADMAP.md` -> `M2`
- **Owner:** Developer #1 (Vision & Kinematics Lead)
- **Resolved Fog Items:** `F1`, `F3`, `F5`

---

## 1. Problem Statement & Crew Outcome
The AI Workout Arena (Screen 2 in PDF 2) and Workout Logs Snapshot Replay (Screen 5 in PDF 2) require:
1. A lazy-loaded in-browser `@mediapipe/tasks-vision` (`PoseLandmarker`) adapter that renders the 33-point skeletal wireframe + joint-angle HUD onto an `<HTMLCanvasElement>` at 30+ FPS via `requestAnimationFrame` without triggering React `setState` on every frame.
2. A **1-Click Simulated Pose Trajectory Mode** (`Simulate Good Rep`, `Simulate Shallow Rep`, `Simulate Spine Fault`) and `window.__ARES_TEST_POSE_FRAMES__` hook so live hackathon demos and Playwright E2E tests work deterministically even without a webcam.
3. A **2D `<canvas>` Kinematic Snapshot Replay Renderer** (`renderSnapshotToCanvas`) that draws any saved 33-point `KinematicSnapshot` with red fault highlights on the offending joints.
4. A clean headless hook (`useWorkoutArena`) ready for the 2 Frontend teammates.

## 2. Confirmed Public Test Seams (`Seam 6: PoseCameraAndE2EHarness`)
```ts
// src/adapters/poseCameraAdapter.ts
export function drawPoseWireframe(
  ctx: CanvasRenderingContext2D,
  frame: RawPoseFrame,
  analysis: KinematicFrameAnalysis
): void;

export function renderKinematicSnapshot(
  ctx: CanvasRenderingContext2D,
  snapshot: KinematicSnapshot
): void;

// src/hooks/useWorkoutArena.ts
export function useWorkoutArena(options?: UseWorkoutArenaOptions): WorkoutArenaController;
```

## 3. Acceptance Scenarios (Given / When / Then)
1. **Scenario 1 (Simulated Rep Trajectory in Workout Arena):**
   - **Given** the Workout Arena is started in Simulated or E2E mode for `SQUAT` (or any of the 4 ARED exercises), **When** `triggerSimulatedRep('GOOD')` is clicked, **Then** the `<canvas>` animates the 33-point skeleton through the rep, `repCount` increments by `1`, and `romPct` reaches `100%`.
2. **Scenario 2 (Simulated Fault & Snapshot Replay):**
   - **Given** `triggerSimulatedRep('SHALLOW')` or `triggerSimulatedRep('SPINE_FAULT')` is triggered, **When** the rep completes, **Then** `"Depth insufficient"` or `"Spine not aligned"` appears in `activeFaultAlerts`, a `KinematicSnapshot` is recorded, and selecting that snapshot renders the faulted 33-point skeleton onto the Replay `<canvas>`.
