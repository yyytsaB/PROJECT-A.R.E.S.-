# ROADMAP.md — Project A.R.E.S. Wayfinder Map & 48-Hour Hackathon Milestone Tracker

> **Milestone planning and verification:**
> 1. Check **Section 1 (Fog / PDF Inconsistencies)** first. Confirm `F1–F5` with the user before writing production code.
> 2. Work through **Section 2 (Vertical Milestones `M0 -> M4`)** designed for parallel execution by **Developer #1 (Vision & Kinematics Lead)** and **Developer 2** during the **Nov 14–15 NASA Space Apps Sprint**.
> 3. Keep **Section 3 (Deferred)** strictly out of scope, and leave all visual styling to the **2 Frontend Teammates**.

---

## Current Project State
- **Current Phase:** Hackathon implementation — **M0 through M6 and the approved demo enhancements complete**, verified November 14, 2026. Coding began after the 09:00 AM local start gate.
- **HACKATHON FAIR-PLAY HARD GATE:** Do **NOT** run `npm init`, scaffold `package.json`, or create any files under `src/` or `tests/` until the official **Nov 14, 09:00 AM** start signal.
- **Next Step:** Native print-preview and stage speaker/webcam checks, then final frontend/artwork revision. The complete Parts 1–4 re-audit fixed seven additional defects and passed both six-flow software rehearsals. Publication verification remains separate. See `docs/INTEGRATION_FULL_AUDIT.md` for current findings, evidence and limitations; earlier reports remain historical records.
- **Verification:** Latest frontend integration checks passed 80 unit/Chromium tests, 44 E2E tests, 5 production-bundle tests, strict typecheck, architecture lint and production build. Reproduce with `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`, and `npm run test:production`.
- **Team Topology (6 Members):**
  - **Developers (2):** Developer #1 (Vision & Kinematics Lead) on `M0`, `M1`, `M2`; Dev #2 on `M3`, `M4`.
  - **Frontend / Wireframes (2):** Owns Vite/React dark-mode UI, progression rings, planetary map visuals, and charts consuming `src/hooks/`.
  - **Documentation (2):** Owns NASA Space Apps challenge write-up, pitch deck, and demo script (`docs/PROPOSAL.md`).
- **Vision & Kinematics Lead:** Developer #1 (Vision & Kinematics Lead)
- **Architecture & Verification:** Architecture & Verification Lead

---

## 1. FOG (PDF Inconsistencies & Decisions — Confirmed in Pre-Sprint Alignment)

All 5 Fog items reconciling the 3 project PDFs have been confirmed by the team and locked in `CONTEXT.md` Section 4:

- [x] **`F1 [DECISION]` Exercise Scope & Pure MediaPipe Pose (Reconciling PDF 2 vs. PDF 3):**
  Confirmed using 100% client-side `@mediapipe/tasks-vision` (`PoseLandmarker`, 33 landmarks, no PyTorch backend) supporting all **4 ARED exercises** from PDF 2 (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`) via declarative joint-angle configs in `src/content/missionCatalog.json`, plus quick-log / simulated cardio (`TREADMILL`, `CYCLE_ERGOMETER`, `ROWING`) and a 1-click Simulated Pose trigger for live demos.
- [x] **`F2 [DECISION]` Offline-First Store + Comms-Window Batch Sync (Reconciling PDF 1/2 vs. PDF 3):**
  Confirmed making local storage (`localStorage` / `IndexedDB` with 30-day pre-seeded Mars mission data) the primary store so the app works 100% offline during simulated **24-minute Mars comms blackouts**, while providing an optional **Supabase Batch-Sync Adapter** (`user_id`, `exercise_type`, `reps_counted`, `form_accuracy`, `volume_kg`, `date`) that flushes queued sessions when the Comms Window toggle is set to `WINDOW_OPEN`.
- [x] **`F3 [DECISION]` Kinematic Snapshot Replay for Improper Reps (PDF 2 Workout Logs):**
  Confirmed implementing PDF 2's *"Video clip / kinematic snapshot replay of flagged improper reps"* as lightweight **33-point `KinematicSnapshot` JSON captures** rendered on a 2D `<canvas>` skeletal viewer (avoiding heavy `.mp4` video blob storage).
- [x] **`F4 [DECISION]` Planetary Distance & Earth-Baseline Strength Retention Math:**
  Confirmed the deterministic formulas in `CONTEXT.md` (`1.0 km` Expedition Progress per `1.0 km` cardio or per `250 kg` ARED volume lifted across `Valles Marineris 4,000 km` / `Olympus Mons 600 km`; rolling 30-day `StrengthRetentionScore` combining `70%` effective load retention vs. Earth 1RM baselines + `30%` mean form accuracy across `0g / 0.16g / 0.38g`).
- [x] **`F5 [DECISION]` 2-Developer Parallel Split & Headless Hook Contract for the 2 Frontend Teammates:**
  Confirmed the zero-conflict split where **Developer #1 (Vision & Kinematics Lead)** owns `M0 + M1 + M2` (`src/core/catalog/`, `src/core/kinematics/`, `src/adapters/poseCameraAdapter.ts`), **Dev #2** owns `M3 + M4` (`src/core/telemetry/`, `src/core/storage/`), and both expose clean headless hooks in `src/hooks/` with a plain semantic HTML testbench (`src/App.tsx`) until the **2 Frontend teammates** plug in their UI.

---

## 2. CLEAR / IN-SCOPE VERTICAL MILESTONES (Nov 14–15 Sprint)

### [x] M0: Project Skeleton, Mission Catalog Schema & Headless Hook Contracts *(Owner: Developer #1 (Vision & Kinematics Lead))*
- **Spec Path:** `specs/000-foundation/spec.md` | **Tasks:** `specs/000-foundation/tasks.md`
- **Blocked by:** `F1`, `F5`
- **Scope:**
  - Initialize Vite + React + TypeScript + Vitest + Playwright harness with zero extra bloat (`ponytail`).
  - `Seam 3` (`ExerciseAndMissionCatalog`): `src/content/missionCatalog.json` + strict validator covering the 4 ARED exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), 3 cardio modalities, 3 gravity profiles (`0g`, `0.16g`, `0.38g`), and 2 planetary routes (`VALLES_MARINERIS`, `OLYMPUS_MONS`).
  - Define shared TypeScript contracts (`src/core/types.ts`) so Dev #1, Dev #2, and the 2 Frontend teammates can work in parallel immediately after `M0`.

### [x] M1: 33-Point Kinematic Analysis Engine & Rep/Form State Machine *(Owner: Developer #1 (Vision & Kinematics Lead))*
- **Spec Path:** `specs/001-kinematic-engine/spec.md` | **Tasks:** `specs/001-kinematic-engine/tasks.md`
- **Blocked by:** `M0`, `F1`, `F3`
- **Scope:**
  - `Seam 1` (`KinematicMath`): Pelvis-centered, torso-scaled 33-point normalization, 3D/2D joint-angle calculation, Range-of-Motion (ROM) %, bilateral symmetry %, spine alignment guard, and form fault detection (`"Depth insufficient"`, `"Spine not aligned"`).
  - `Seam 2` (`RepAndFormStateMachine`): Hysteresis rep counter (`IDLE -> ECCENTRIC -> INFLECTION -> CONCENTRIC -> COMPLETED`), form accuracy scoring, and automatic `KinematicSnapshot` capture on faulted reps.

### [x] M2: Live MediaPipe Pose Adapter, 60fps Skeletal Canvas & Snapshot Replay *(Owner: Developer #1 (Vision & Kinematics Lead))*
- **Spec Path:** `specs/002-pose-camera-arena/spec.md` | **Tasks:** `specs/002-pose-camera-arena/tasks.md`
- **Blocked by:** `M1`
- **Scope:**
  - `Seam 6` (`PoseCameraAndE2EHarness`): Lazy-loaded `@mediapipe/tasks-vision` `PoseLandmarker` running at 30+ FPS on `<canvas>` without React `setState` thrashing.
  - Built-in **Simulated Pose Trajectory Generator** (`Simulate Good Rep`, `Simulate Shallow/Bad Spine Rep`) so live pitches and Playwright E2E tests work deterministically even without a webcam.
  - 2D `<canvas>` **Kinematic Snapshot Replay** viewer for inspecting flagged improper reps in Workout Logs, plus headless `useWorkoutArena()` hook for the Frontend team.

### [x] M3: Planetary Expedition Engine, Strength Retention & Flight Surgeon Telemetry *(Owner: Developer #2 (Telemetry & Offline Sync Lead))*
- **Spec Path:** `specs/003-progression-and-telemetry/spec.md` | **Tasks:** `specs/003-progression-and-telemetry/tasks.md`
- **Blocked by:** `M0`, `F4` *(Can run in parallel with `M1`/`M2`!)*
- **Scope:**
  - `Seam 4` (`ProgressionAndTelemetryEngine`): Pure functions calculating session tonnage & effective load, converting cardio km + ARED tonnage into **Valles Marineris / Olympus Mons** route progress and milestone badges, computing 30-day **Earth-Baseline Strength Retention %** and symmetry scores, and generating the exportable **Flight Surgeon Telemetry Report** (JSON/CSV).

### [x] M4: Offline-First Store, 24-Min Comms Blackout Sync Queue & 30-Day Demo Seeder *(Owner: Developer #2 (Telemetry & Offline Sync Lead))*
- **Spec Path:** `specs/004-offline-sync-store/spec.md` | **Tasks:** `specs/004-offline-sync-store/tasks.md`
- **Blocked by:** `M3`, `F2`
- **Scope:**
  - `Seam 5` (`OfflineTelemetryAndSyncStore`): Local persistence (`localStorage` / `IndexedDB` fallback), deterministic **30-Day Mars Transit Demo Seeder**, **24-Minute Comms Blackout Queue**, and optional **Supabase REST Batch-Sync** when the Comms Window opens.
  - Headless hooks (`useDashboardTelemetry`, `useExpeditionJourney`, `useMedicalAnalytics`, `useWorkoutHistory`, `useMissionProfile`) ready for the 2 Frontend teammates.

---

### [x] Post-M4: Honest Demo Enhancements

Approved post-M4 demo enhancement work is tracked separately in [the demo spec](specs/005-demo-enhancements/spec.md) and [ordered tasks](specs/005-demo-enhancements/tasks.md): replay diagnostics and measured JSON sizes, optional local Voice Coach, then team-defined gravity scenario goals. Historical strength scores and the semantic UI boundary remain unchanged.

Verified November 14: 39 unit/integration tests across 11 files, typecheck and production build passed; 7 E2E journeys passed. Spec and standards reviews have no remaining actionable findings.

### [x] M5: Alignment & Demo Polish

- **Spec:** `specs/006-m5-alignment-demo-polish/spec.md` | **Tasks/evidence:** `specs/006-m5-alignment-demo-polish/tasks.md`
- **Depends on:** M0–M4 and the completed demo enhancements.
- **Delivered:** Persisted duration/running-only timer and cue controls; searchable/date-filtered paginated logs with form status, details and replay; analytics windows and export/print confirmations; profile weight/validation/save and clear warning; milestone descriptions/all-badge view; measured cache bytes; persistent sample schedule and primary launch; accessible section navigation/titles/skip link.
- **Verified:** 56 tests in 12 files, typecheck, production build and 8 E2E journeys passed. Spec and standards audits have no remaining actionable findings. Existing scientific-honesty and unstyled semantic HTML boundaries remain intact.

### [x] M6: Pre-Space Onboarding & Personalized Routine Engine

- **Spec:** `specs/007-onboarding-personalized-routine/spec.md` | **Tasks/evidence:** `specs/007-onboarding-personalized-routine/tasks.md`
- **Depends on:** M0–M5.
- **Delivered:** `calculateBmi` and deterministic `generatePersonalizedRoutine` with 15% injury-limitation moderation and per-exercise retention rationale; 3-step `useMissionOnboarding` wizard (`Mission Onboarding — Set Up Your Profile`) with live BMI calculation, 150ms processing state, and preview/confirm flow; Dashboard `"Personalized for you — Adapted to your progress"` schedule rationales and automatic/manual update notification; Settings `"Update Health Metrics"`, `"Recalibrate Routine"` button, and `"Auto-adjust routine based on progress"` toggle; dependency-free architecture linter (`npm run lint`).
- **Verified:** 66 unit/Chromium browser tests across 13 files, `npm run typecheck`, `npm run lint`, `npm run build`, and offline Playwright E2E journey (`tests/e2e/m6-onboarding.spec.ts`) passed.

## 3. DEFERRED (Strictly Out of Scope for the 48-Hour Hackathon Sprint)

- **Custom PyTorch Model Training:** 100% handled by Google MediaPipe Pose (`@mediapipe/tasks-vision`) + geometric joint-angle kinematics in the browser.
- **Raw Video Blob Recording/Upload:** Replaced by 33-point `KinematicSnapshot` wireframe replay (`~1.5 KB` per flagged rep).
- **Hardware ARED Serial/Bluetooth Drivers:** Simulated via configurable ARED resistance load (`kg`) and gravity profile settings (`0g`, `0.16g`, `0.38g`).
- **Decorative CSS / Final Visual Skinning inside Dev Branches:** Owned exclusively by the 2 Frontend/Wireframe teammates to prevent git merge conflicts.
