# CONTEXT.md — Project A.R.E.S. Domain Glossary, Architecture & Public Test Seams

> **Purpose:** This document is the single source of truth for Project A.R.E.S.'s domain vocabulary, biomechanical/telemetry formulas, data contracts, **Confirmed Public Test Seams**, and reconciled PDF decisions. All specs (`specs/NNN/spec.md`), tests, and code must use these exact terms and interfaces.

---

## 1. Domain Glossary & Core Invariants

| Term | Definition & Invariant in Code |
| :--- | :--- |
| **`RawPoseFrame`** | `{ landmarks: readonly PoseLandmark33[]; width: number; height: number; timestampMs: number }`. Contains exactly 33 finite MediaPipe Pose landmarks (`{ x, y, z, visibility }`), positive frame dimensions, and monotonic timestamp in ms. |
| **`NormalizedPose33`** | Pelvis-centered (midpoint of landmarks `23` Left Hip & `24` Right Hip at origin), torso-scaled (divided by Euclidean distance between mid-hip and mid-shoulder `11`/`12` in aspect-corrected image space) 33-point pose so joint angles and symmetry metrics are invariant to astronaut height and camera distance. |
| **`ExerciseId`** | `'SQUAT' \| 'DEADLIFT' \| 'OVERHEAD_PRESS' \| 'BICEP_CURL'` for live camera-tracked ARED resistance exercises, plus `'TREADMILL' \| 'CYCLE_ERGOMETER' \| 'ROWING'` for stationary cardio session logs. |
| **`ExerciseDefinition`** | Static config in `src/content/missionCatalog.json` defining an exercise's primary left/right joint triplets `[proximalIdx, vertexIdx, distalIdx]`, start/extension angle (`deg`), target inflection/depth angle (`deg`), hysteresis buffer (`deg`), max trunk-lean deviation (`deg`), bilateral symmetry tolerance (`deg`), and Earth-equivalent load multiplier. |
| **`KinematicFrameAnalysis`** | Per-frame output of `analyzeExerciseFrame`: `{ primaryAngleDeg, leftAngleDeg, rightAngleDeg, romPct, symmetryScorePct, trunkLeanDeg, faultFlags: readonly FormFaultFlag[], isVisible: boolean }`. |
| **`FormFaultFlag`** | `'DEPTH_INSUFFICIENT' \| 'SPINE_MISALIGNED' \| 'BILATERAL_ASYMMETRY' \| 'LOW_VISIBILITY'`. Mapped to human-readable crew alerts (e.g., `"Depth insufficient"`, `"Spine not aligned"`, `"Left/Right imbalance"`). |
| **`RepPhase`** | `'IDLE' \| 'ECCENTRIC' \| 'INFLECTION' \| 'CONCENTRIC' \| 'COMPLETED'`. Deterministic hysteresis state machine preventing false rep triggers from single-frame webcam noise. |
| **`KinematicSnapshot`** | Lightweight JSON record (`~1.5 KB`) captured automatically at the inflection point of any rep flagged with a `FormFaultFlag`: `{ repNumber, timestampMs, exerciseId, faultFlags, primaryAngleDeg, symmetryScorePct, landmarks: readonly PoseLandmark33[] }`. Replaces heavy `.mp4` blobs for instant 2D `<canvas>` wireframe replay in Workout Logs. |
| **`GravityProfileId`** | `'MICROGRAVITY_0G'` (`0.0g`), `'MOON_016G'` (`0.16g`), `'MARS_038G'` (`0.38g`). Determines daily ARED volume targets and gravity-transition readiness thresholds. |
| **`PlanetaryRouteId`** | `'VALLES_MARINERIS'` (`4,000 km` game expedition based on approximate canyon length) or `'OLYMPUS_MONS'` (`600 km` game expedition based on approximate volcano diameter). These are not terrain-derived traverses. Converts cardio distance and form-qualified ARED volume (`250 kg = 1.0 km Expedition Equivalent Distance`, per locked F4) into route progress. |
| **`StrengthRetentionScore`** | Percentage (`0..100+`) comparing the astronaut's rolling 30-day effective resistance load & form-qualified volume against pre-launch `AstronautProfile.earthBaseline1RM` benchmarks. |
| **`CommsLinkStatus`** | `'BLACKOUT_24MIN_DELAY' \| 'WINDOW_OPEN'`. When in blackout (default deep-space mode), completed sessions append to `SyncQueueEnvelope[]` locally; when `WINDOW_OPEN` is triggered, queued telemetry flushes to Supabase (if configured) or the local Mission Control ack log. |

---

## 2. System Architecture & Ponytail Boundaries

Following the **Ponytail Ladder of Laziness**:
1. **Declarative Exercise & Route Catalog (`src/content/missionCatalog.json`):** All 4 ARED exercises, 3 cardio modalities, 3 gravity profiles, and 2 planetary routes (Valles Marineris & Olympus Mons) are defined as static JSON data. Adding or tuning an exercise never requires new state machine classes or UI branching.
2. **Pure Math & Domain Core (`src/core/`):** Zero React, DOM, MediaPipe, or Supabase imports. All kinematic vector math, rep counting, planetary distance conversion, 30-day strength retention scoring, and sync-queue transitions are 100% pure TypeScript functions with injected timestamps (`timestampMs` / `nowIso`).
3. **Hardware & Storage Adapters (`src/adapters/`):**
   - `poseCameraAdapter.ts`: Lazy-loads `@mediapipe/tasks-vision` (`PoseLandmarker`) in browser mode, draws the 33-point wireframe + HUD gauge onto `<canvas>` inside `requestAnimationFrame` (zero per-frame React `setState`), and accepts `window.__ARES_TEST_POSE_FRAMES__` or built-in simulated trajectories for headless E2E tests and live-demo backup.
   - `telemetryStorageAdapter.ts`: Wraps `localStorage` / `IndexedDB` with safe in-memory fallback and optional Supabase REST batch-sync (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
4. **Headless React Hooks (`src/hooks/`) for the 2 Frontend Teammates:**
   - Exposes `useDashboardTelemetry()`, `useWorkoutArena()`, `useExpeditionJourney()`, `useMedicalAnalytics()`, `useWorkoutHistory()`, and `useMissionProfile()` corresponding 1-to-1 with the **6 screens in PDF 2**.
   - Developers only maintain a plain semantic HTML testbench (`src/App.tsx`) until the 2 Frontend teammates attach their styled Vite/React components to these hooks.

---

## 3. Confirmed Public Test Seams (Where Tests Live)

Under the project testing standards, **all unit, integration, and E2E tests must target only these 6 pre-agreed seams**:

### Seam 1: `KinematicMath` (`src/core/kinematics/kinematicMath.ts`) — *Owner: Developer #1 (Vision & Kinematics Lead)*
- **Public Interface:**
  - `normalizePose33(raw: RawPoseFrame): NormalizedPose33`
  - `computeJointAngleDeg(a: Point3D, b: Point3D, c: Point3D): number`
  - `analyzeExerciseFrame(pose: NormalizedPose33, exercise: ExerciseDefinition): KinematicFrameAnalysis`
- **What Tests Verify:** Pelvis-translation & torso-scale invariance across 33 landmarks, exact `0..180°` vector angle math (`90°` right angle, `180°` full extension), ROM percentage clamping (`0..100%`), bilateral left/right symmetry scoring, spine alignment angle check, and low-visibility landmark rejection.

### Seam 2: `RepAndFormStateMachine` (`src/core/kinematics/repStateMachine.ts`) — *Owner: Developer #1 (Vision & Kinematics Lead)*
- **Public Interface:**
  - `createInitialRepState(exerciseId: ExerciseId): RepMachineState`
  - `advanceRepState(state: RepMachineState, frame: RawPoseFrame | null, exercise: ExerciseDefinition): RepMachineStepResult`
- **What Tests Verify:** Full rep cycle (`IDLE -> ECCENTRIC -> INFLECTION -> CONCENTRIC -> COMPLETED`), jitter hysteresis (ignoring 1-frame noise), shallow-rep rejection (`"Depth insufficient"` alert + flagged rep + captured `KinematicSnapshot`), spine-lean fault flagging (`"Spine not aligned"`), and session pause/resume state preservation.

### Seam 3: `ExerciseAndMissionCatalog` (`src/core/catalog/missionCatalog.ts`) — *Owner: Developer #1 (Vision & Kinematics Lead), M0*
- **Public Interface:**
  - `loadMissionCatalog(): MissionCatalog`
  - `getExerciseById(id: ExerciseId): ExerciseDefinition`
  - `getPlanetaryRouteById(id: PlanetaryRouteId): PlanetaryRoute`
  - `validateMissionCatalogSchema(rawJson: unknown): ValidationResult`
- **What Tests Verify:** Structural schema integrity of `src/content/missionCatalog.json`: valid 0..32 MediaPipe Pose landmark indices, non-degenerate start/target angle bounds for all 4 ARED exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), valid cardio equivalents, and ordered milestone waypoints along Valles Marineris and Olympus Mons.

### Seam 4: `ProgressionAndTelemetryEngine` (`src/core/telemetry/telemetryEngine.ts`) — *Owner: Developer #2 (Telemetry & Offline Sync Lead)*
- **Public Interface:**
  - `computeSessionRecord(input: CompletedWorkoutInput, profile: AstronautProfile): WorkoutSessionRecord`
  - `computeExpeditionProgress(sessions: readonly WorkoutSessionRecord[], route: PlanetaryRoute): ExpeditionProgressReport`
  - `computeMedicalTelemetry(sessions: readonly WorkoutSessionRecord[], profile: AstronautProfile, nowIso: string): MedicalTelemetryReport`
  - `buildFlightSurgeonReport(telemetry: MedicalTelemetryReport, profile: AstronautProfile, syncSummary: SyncQueueSummary, exportedAtIso: string): FlightSurgeonReport`
- **What Tests Verify:** Tonnage lifted (`sets × reps × loadKg`) + cardio distance conversion into planetary route kilometers (`Valles Marineris` / `Olympus Mons`), milestone badge unlocking, 30-day **Earth-Baseline Strength Retention %** calculation across gravity profiles (`0g / 0.16g / 0.38g`), symmetry consistency aggregation, and deterministic Flight Surgeon JSON report generation.

### Seam 5: `OfflineTelemetryAndSyncStore` (`src/core/storage/telemetryStore.ts`) — *Owner: Developer #2 (Telemetry & Offline Sync Lead)*
- **Public Interface:**
  - `loadMissionStore(storage?: StorageLike, nowIso?: string): MissionStoreState`
  - `recordCompletedWorkout(state: MissionStoreState, session: WorkoutSessionRecord, storage?: StorageLike): MissionStoreState`
  - `flushCommsSyncQueue(state: MissionStoreState, commsStatus: CommsLinkStatus, syncClient?: TelemetrySyncClient, nowIso?: string, storage?: StorageLike): Promise<MissionStoreState>`
  - `seedDemoMissionState(nowIso: string, storage?: StorageLike): MissionStoreState`
- **What Tests Verify:** Corrupted storage recovery, in-memory fallback when `localStorage` throws, automatic enqueueing of compressed summary telemetry during `BLACKOUT_24MIN_DELAY`, batch sync to Supabase/Mission Control when `WINDOW_OPEN` is active, and deterministic 30-day Mars mission demo seeding.

### Seam 6: `PoseCameraAndE2EHarness` (`src/adapters/poseCameraAdapter.ts` & `tests/e2e/*.spec.ts`) — *Shared M2/M4*
- **Public Interface:** Browser DOM (`getByRole`, `getByLabel`), `<canvas>` wireframe renderer, and `window.__ARES_TEST_POSE_FRAMES__` / Demo Simulator trigger.
- **What Tests Verify:** Launching a live or simulated workout from Command Center, completing good and shallow reps across the 4 ARED exercises, inspecting the flagged rep's **Kinematic Snapshot wireframe replay** in Workout Logs, viewing updated Valles Marineris progress, and exporting the Flight Surgeon report while offline.

---

## 4. Approved Starting Decisions (`F1–F5` Confirmed — November 14, 2026)

Across the 3 provided PDFs, the following inconsistencies were identified, confirmed by the user on November 14, 2026, and locked as binding architectural invariants:

1. **`F1` — AI Engine & Exercise Scope (PDF 1/2 vs. PDF 3):**
   - *PDF Contradiction:* PDF 3 p.1 mentions "MediaPipe/PyTorch", PDF 3 p.3 says "count squats or bicep curls", while PDF 2 specifies **4 live camera resistance exercises** (`Squats`, `Deadlifts`, `Overhead Press`, `Bicep Curls`) plus daily schedule cardio (`Treadmill`, `Cycle Ergometer`, `Rowing`).
   - *Proposed Resolution:* Use **100% client-side `@mediapipe/tasks-vision` (`PoseLandmarker`, 33 points)**—no PyTorch backend. Support **all 4 ARED resistance exercises** via a single data-driven joint-triplet config in `missionCatalog.json`, plus quick-log / simulator inputs for `Treadmill` and `Cycle Ergometer` so all 6 screens in PDF 2 work cohesively.
2. **`F2` — Storage & Sync Architecture (PDF 1/2 Offline IndexedDB/Queue vs. PDF 3 Simple Supabase Table):**
   - *PDF Contradiction:* PDF 1 & 2 require an **offline-first local database** with an **automatic batch-sync queue** for 24-minute Mars comms blackouts, while PDF 3 p.3 describes a basic 4-column Supabase table (`user_id`, `exercise_type`, `reps_counted`, `date`).
   - *Proposed Resolution:* Make **local persistence (`localStorage` / `IndexedDB` via `Seam 5`) primary and 100% self-sufficient** (seeded with 30 days of realistic Mars transit telemetry on first load). Include a **Comms Window Toggle (`24-Min Blackout` vs `Comms Window Open`)** that flushes queued sessions to Supabase (`user_id`, `exercise_type`, `reps_counted`, `form_accuracy`, `volume_kg`, `date`) when `VITE_SUPABASE_URL` is configured, or to a local Mission Control Ack log when running offline.
3. **`F3` — Flagged Improper Rep Replay (PDF 2 "Video clip / kinematic snapshot replay"):**
   - *PDF Contradiction:* Storing raw webcam video clips offline in browser storage quickly exceeds storage quotas.
   - *Proposed Resolution:* Store **33-point `KinematicSnapshot` JSON frames** whenever a rep has a form fault (`"Depth insufficient"` or `"Spine not aligned"`), and render an interactive **2D `<canvas>` Skeletal Replay** inside Workout Logs & History.
4. **`F4` — Planetary Progression & Strength Retention Formulas (PDF 1/2/3):**
   - *PDF Contradiction:* No explicit mathematical formula is given in the PDFs for converting resistance tonnage + cardio into Valles Marineris (`4,000 km`) / Olympus Mons (`600 km`) distance or calculating `Earth-Baseline Strength Retention %`.
   - *Proposed Resolution:*
     - **Expedition Distance (`km`):** `cardioDistanceKm + (resistanceVolumeKg / 250)` (every `250 kg` of form-qualified ARED volume equals `1.0 km` of rover/eva traverse equivalent, so a typical `5,000 kg` ARED session advances the crew `20 km` across Valles Marineris).
     - **Strength Retention Score (`0..100%`):** Weighted rolling 30-day score: `0.70 * min(1, rollingEffectiveLoad / earthBaselineLoad) + 0.30 * (meanFormAccuracyPct / 100)`, scaled by `100`.
5. **`F5` — 6-Person Team & UI Ownership Boundary:**
   - *Rule:* The 2 developers (Developer #1 (Vision & Kinematics Lead) and Developer #2 (Telemetry & Offline Sync Lead)) build **zero decorative UI**. We deliver `src/core/`, `src/adapters/`, `src/hooks/`, automated tests, and a bare semantic HTML harness so the 2 Frontend teammates own all Vite/React styling and layouts without merge conflicts.
