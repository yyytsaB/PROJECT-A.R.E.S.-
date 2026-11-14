# ROADMAP.md — Project A.R.E.S. Wayfinder Map & 48-Hour Hackathon Milestone Tracker

> **Instructions for Agents (`wayfinder` & `superpowers-sdd`):**
> 1. Check **Section 1 (Fog / PDF Inconsistencies)** first. Confirm `F1–F5` with the user before writing production code.
> 2. Work through **Section 2 (Vertical Milestones `M0 -> M4`)** designed for parallel execution by **Developer 1 (You + ChatGPT)** and **Developer 2** during the **Nov 14–15 NASA Space Apps Sprint**.
> 3. Keep **Section 3 (Deferred)** strictly out of scope, and leave all visual styling to the **2 Frontend Teammates**.

---

## Current Project State
- **Current Phase:** Hackathon implementation — **M0 and M1 complete**, verified November 14, 2026. Coding began after the 09:00 AM local start gate.
- **HACKATHON FAIR-PLAY HARD GATE:** Do **NOT** run `npm init`, scaffold `package.json`, or create any files under `src/` or `tests/` until the official **Nov 14, 09:00 AM** start signal.
- **Next Milestones:** `M2: Live MediaPipe Pose Adapter, Skeletal Canvas & Snapshot Replay` (Dev #1) & `M3: Planetary Expedition & Telemetry Engine` (Dev #2; shared M0 types are available).
- **Verification:** `docs/M0-M1-VERIFICATION.md` records test output, core coverage, browser verification, and independent Standards/Spec audit results.
- **Team Topology (6 Members):**
  - **Developers (2):** Dev #1 (You + ChatGPT Heavy Coder) on `M0`, `M1`, `M2`; Dev #2 on `M3`, `M4`.
  - **Frontend / Wireframes (2):** Owns Vite/React dark-mode UI, progression rings, planetary map visuals, and charts consuming `src/hooks/`.
  - **Documentation (2):** Owns NASA Space Apps challenge write-up, pitch deck, and demo script (`docs/PROPOSAL.md`).
- **Lead Heavy Coder:** ChatGPT
- **Architect / Two-Axis Auditor:** Antigravity / Claude Opus 5.5

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
  Confirmed the zero-conflict split where **Dev #1 (You + ChatGPT)** owns `M0 + M1 + M2` (`src/core/catalog/`, `src/core/kinematics/`, `src/adapters/poseCameraAdapter.ts`), **Dev #2** owns `M3 + M4` (`src/core/telemetry/`, `src/core/storage/`), and both expose clean headless hooks in `src/hooks/` with a plain semantic HTML testbench (`src/App.tsx`) until the **2 Frontend teammates** plug in their UI.

---

## 2. CLEAR / IN-SCOPE VERTICAL MILESTONES (Nov 14–15 Sprint)

### [x] M0: Project Skeleton, Mission Catalog Schema & Headless Hook Contracts *(Owner: Dev #1 + ChatGPT)*
- **Spec Path:** `specs/000-foundation/spec.md` | **Tasks:** `specs/000-foundation/tasks.md`
- **Blocked by:** `F1`, `F5`
- **Scope:**
  - Initialize Vite + React + TypeScript + Vitest + Playwright harness with zero extra bloat (`ponytail`).
  - `Seam 3` (`ExerciseAndMissionCatalog`): `src/content/missionCatalog.json` + strict validator covering the 4 ARED exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), 3 cardio modalities, 3 gravity profiles (`0g`, `0.16g`, `0.38g`), and 2 planetary routes (`VALLES_MARINERIS`, `OLYMPUS_MONS`).
  - Define shared TypeScript contracts (`src/core/types.ts`) so Dev #1, Dev #2, and the 2 Frontend teammates can work in parallel immediately after `M0`.

### [x] M1: 33-Point Kinematic Analysis Engine & Rep/Form State Machine *(Owner: Dev #1 + ChatGPT)*
- **Spec Path:** `specs/001-kinematic-engine/spec.md` | **Tasks:** `specs/001-kinematic-engine/tasks.md`
- **Blocked by:** `M0`, `F1`, `F3`
- **Scope:**
  - `Seam 1` (`KinematicMath`): Pelvis-centered, torso-scaled 33-point normalization, 3D/2D joint-angle calculation, Range-of-Motion (ROM) %, bilateral symmetry %, spine alignment guard, and form fault detection (`"Depth insufficient"`, `"Spine not aligned"`).
  - `Seam 2` (`RepAndFormStateMachine`): Hysteresis rep counter (`IDLE -> ECCENTRIC -> INFLECTION -> CONCENTRIC -> COMPLETED`), form accuracy scoring, and automatic `KinematicSnapshot` capture on faulted reps.

### [ ] M2: Live MediaPipe Pose Adapter, 60fps Skeletal Canvas & Snapshot Replay *(Owner: Dev #1 + ChatGPT)*
- **Spec Path:** `specs/002-pose-camera-arena/spec.md` | **Tasks:** `specs/002-pose-camera-arena/tasks.md`
- **Blocked by:** `M1`
- **Scope:**
  - `Seam 6` (`PoseCameraAndE2EHarness`): Lazy-loaded `@mediapipe/tasks-vision` `PoseLandmarker` running at 30+ FPS on `<canvas>` without React `setState` thrashing.
  - Built-in **Simulated Pose Trajectory Generator** (`Simulate Good Rep`, `Simulate Shallow/Bad Spine Rep`) so live pitches and Playwright E2E tests work deterministically even without a webcam.
  - 2D `<canvas>` **Kinematic Snapshot Replay** viewer for inspecting flagged improper reps in Workout Logs, plus headless `useWorkoutArena()` hook for the Frontend team.

### [ ] M3: Planetary Expedition Engine, Strength Retention & Flight Surgeon Telemetry *(Owner: Dev #2 — Parallel Track)*
- **Spec Path:** `specs/003-progression-and-telemetry/spec.md` | **Tasks:** `specs/003-progression-and-telemetry/tasks.md`
- **Blocked by:** `M0`, `F4` *(Can run in parallel with `M1`/`M2`!)*
- **Scope:**
  - `Seam 4` (`ProgressionAndTelemetryEngine`): Pure functions calculating session tonnage & effective load, converting cardio km + ARED tonnage into **Valles Marineris / Olympus Mons** route progress and milestone badges, computing 30-day **Earth-Baseline Strength Retention %** and symmetry scores, and generating the exportable **Flight Surgeon Telemetry Report** (JSON/CSV).

### [ ] M4: Offline-First Store, 24-Min Comms Blackout Sync Queue & 30-Day Demo Seeder *(Owner: Dev #2 — Parallel Track)*
- **Spec Path:** `specs/004-offline-sync-store/spec.md` | **Tasks:** `specs/004-offline-sync-store/tasks.md`
- **Blocked by:** `M3`, `F2`
- **Scope:**
  - `Seam 5` (`OfflineTelemetryAndSyncStore`): Local persistence (`localStorage` / `IndexedDB` fallback), deterministic **30-Day Mars Transit Demo Seeder**, **24-Minute Comms Blackout Queue**, and optional **Supabase REST Batch-Sync** when the Comms Window opens.
  - Headless hooks (`useDashboardTelemetry`, `useExpeditionJourney`, `useMedicalAnalytics`, `useWorkoutHistory`, `useMissionProfile`) ready for the 2 Frontend teammates.

---

## 3. DEFERRED (Strictly Out of Scope for the 48-Hour Hackathon Sprint)

- **Custom PyTorch Model Training:** 100% handled by Google MediaPipe Pose (`@mediapipe/tasks-vision`) + geometric joint-angle kinematics in the browser.
- **Raw Video Blob Recording/Upload:** Replaced by 33-point `KinematicSnapshot` wireframe replay (`~1.5 KB` per flagged rep).
- **Hardware ARED Serial/Bluetooth Drivers:** Simulated via configurable ARED resistance load (`kg`) and gravity profile settings (`0g`, `0.16g`, `0.38g`).
- **Decorative CSS / Final Visual Skinning inside Dev Branches:** Owned exclusively by the 2 Frontend/Wireframe teammates to prevent git merge conflicts.
