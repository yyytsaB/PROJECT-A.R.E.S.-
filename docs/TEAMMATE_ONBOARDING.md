# Project A.R.E.S. — 6-Person NASA Space Apps Hackathon Playbook & Zero-Conflict Split

Welcome to the **Project A.R.E.S. (Astronaut Resistance & Exercise System)** repository for the **Nov 14–15 NASA Space Apps Hackathon**!
This document defines how our **6-person team** works in parallel over the 48-hour sprint so **nobody steps on each other's files or causes git merge conflicts**.

---

## 1. How Our 6-Person Team Is Divided (Zero Merge Conflicts)

| Sub-Team | Members | Ownership & Deliverables | Folders Touched |
| :--- | :--- | :--- | :--- |
| **Development Track A (Vision & Kinematics)** | **Developer #1 (You) + ChatGPT Heavy Coder** | **M0:** Vite/TS/Vitest/Playwright scaffold + `Seam 3: ExerciseAndMissionCatalog` (`src/content/missionCatalog.json`) + shared `src/core/types.ts`.<br>**M1:** `Seam 1: KinematicMath` (33-point normalization, joint angles, ROM %, symmetry %, spine guard) + `Seam 2: RepAndFormStateMachine` (rep hysteresis, form alerts, `KinematicSnapshot` capture).<br>**M2:** `Seam 6: PoseCameraAndE2EHarness` (lazy MediaPipe `PoseLandmarker`, 30+ FPS `<canvas>` skeletal overlay, 1-click Simulated Pose Demo Mode, Snapshot Replay canvas, and `useWorkoutArena()` hook). | `src/core/catalog/`, `src/core/kinematics/`, `src/adapters/poseCameraAdapter.ts`, `src/hooks/useWorkoutArena.ts`, `specs/000..002/` |
| **Development Track B (Progression, Telemetry & Offline Sync)** | **Developer #2 + AI Assistant** | **M3:** `Seam 4: ProgressionAndTelemetryEngine` (tonnage + cardio -> Valles Marineris `4,000 km` & Olympus Mons `600 km` milestones, 30-day Earth-Baseline Strength Retention % across `0g / 0.16g / 0.38g`, Flight Surgeon JSON/CSV Report builder).<br>**M4:** `Seam 5: OfflineTelemetryAndSyncStore` (`localStorage` / `IndexedDB` persistence, 24-min Mars Comms Blackout Queue, optional Supabase batch sync, 30-day Mars demo seeder, and telemetry/journey hooks). | `src/core/telemetry/`, `src/core/storage/`, `src/adapters/supabaseSyncAdapter.ts`, `src/hooks/useMissionTelemetry.ts`, `specs/003..004/` |
| **Frontend & Wireframes** | **2 Frontend Members** | Designing and building the **6 screens from PDF 2** (`Command Center`, `AI Workout Arena`, `Expedition Journey`, `Medical Telemetry`, `Workout Logs & History`, `Profile & Mission Settings`). They consume the typed headless hooks from `src/hooks/` and never need to write MediaPipe or telemetry math. | `src/components/`, `src/styles/`, `src/App.tsx` (after M0/M2/M4 hooks land) |
| **Documentation & Pitch** | **2 Documentation Members** | NASA Space Apps project submission page, 30-second/3-minute pitch deck, NASA Human Research Program (HRP) & ARED biomechanical citations, and live judge demo choreography (`docs/PROPOSAL.md`). | `docs/pitch/`, slide deck, submission forms |

---

## 2. Headless Hooks Contract for the 2 Frontend Teammates

So the **2 Frontend teammates** can build their components immediately in parallel without waiting for MediaPipe or Supabase internals, both Developers expose clean data contracts corresponding 1-to-1 with the **6 screens in PDF 2**:

1. **Screen 1 — Dashboard (Command Center):** `useDashboardSummary()`
   - Returns `{ missionDay, strengthRetentionPct, todaySchedule, statusIndicators: { isOfflineFirst, cameraReady, commsLinkStatus, queuedSyncCount }, quickLaunchExercise(exerciseId) }`.
2. **Screen 2 — AI Workout Arena:** `useWorkoutArena()`
   - Returns `{ canvasRef, videoRef, selectedExercise, selectExercise, repCount, targetReps, currentPhase, primaryAngleDeg, romPct, symmetryScorePct, activeFaultAlerts, sessionStatus, startSession, pauseSession, endAndSaveSession, triggerSimulatedRep(type: 'GOOD' | 'SHALLOW' | 'SPINE_FAULT') }`.
3. **Screen 3 — Expedition Journey:** `useExpeditionJourney()`
   - Returns `{ activeRoute, selectRoute, cumulativeDistanceKm, cardioKm, resistanceEquivalentKm, totalTonnageKg, progressPct, unlockedBadges, nextWaypoint }`.
4. **Screen 4 — Health & Musculoskeletal Analytics:** `useMedicalTelemetry()`
   - Returns `{ retentionSeries30d, volumeSeries30d, symmetryScoreAvg, kinematicConsistencyScore, exportFlightSurgeonReport() }`.
5. **Screen 5 — Workout Logs & History:** `useWorkoutHistory()`
   - Returns `{ sessions, searchQuery, setSearchQuery, selectedSnapshot, selectSnapshotForReplay, replayCanvasRef }`.
6. **Screen 6 — Profile & Mission Settings:** `useMissionProfile()`
   - Returns `{ astronautProfile, updateProfile, gravityProfile, setGravityProfile, commsStatus, toggleCommsWindow, flushSyncQueueNow, seed30DayDemoData, clearLocalCache }`.

---

## 3. Developer #2 Integration Track (`M3` + `M4`)

After `M0` is merged, Developer #2 can use branch `feat/dev2-telemetry-and-sync`, consuming the shared types and mission catalog. The approved specs and vertical task lists in `specs/003-progression-and-telemetry/` and `specs/004-offline-sync-store/` define the work. Keep changes within the Track B folders listed above, and verify each slice with tests and typecheck before updating its checklist.
