# Implementation Tasks (Vertical TDD Slices): M4 — Offline-First Store, Comms Sync Queue & Demo Seeder

- **Spec Reference:** `./spec.md`
- **Owner:** Developer #2 (Parallel Track — or ChatGPT)

---

## Vertical Slices

- [ ] **Slice 1 (Tracer Bullet): `loadMissionStore`, `clearMissionStore` & Safe Storage Fallback (`Seam 5`)**
  - **Target Seam:** `Seam 5 — loadMissionStore & clearMissionStore`
  - **Red Test Assertion:** Verifies clean default astronaut profile initialization, recovery from corrupted JSON in `localStorage`, and graceful fallback when `storage.setItem` throws `QuotaExceededError` or `SecurityError`.
  - **Files Touched:** `src/core/storage/telemetryStore.ts`, `src/core/storage/telemetryStore.test.ts`
  - **Verify Command:** `npx vitest run src/core/storage/telemetryStore.test.ts`

- [ ] **Slice 2: `recordCompletedWorkout` & `flushCommsSyncQueue` (`BLACKOUT_24MIN_DELAY` vs. `WINDOW_OPEN`)**
  - **Target Seam:** `Seam 5 — recordCompletedWorkout & flushCommsSyncQueue`
  - **Red Test Assertion:** Verifies sessions recorded during `BLACKOUT_24MIN_DELAY` stay queued in `syncQueue`, and calling `flushCommsSyncQueue` with `WINDOW_OPEN` flushes the batch via the injected `TelemetrySyncClient` (or local Mission Control ack) and marks sessions `'SYNCED'`.
  - **Files Touched:** `src/core/storage/telemetryStore.ts`, `src/adapters/supabaseSyncAdapter.ts`, `src/core/storage/telemetryStore.test.ts`
  - **Verify Command:** `npx vitest run src/core/storage/telemetryStore.test.ts`

- [ ] **Slice 3: `seedDemoMissionState` (30-Day Mars History) & Headless Telemetry Hooks (`src/hooks/useMissionTelemetry.ts`)**
  - **Target Seam:** `Seam 5 — seedDemoMissionState` & headless screen hooks
  - **Red Test Assertion:** Verifies `seedDemoMissionState` populates 30 days of workouts + sample `KinematicSnapshot` records, and the headless hooks (`useDashboardSummary`, `useExpeditionJourney`, `useMedicalTelemetry`, `useWorkoutHistory`, `useMissionProfile`) expose all 6 screens' state for the Frontend team.
  - **Files Touched:** `src/core/storage/telemetryStore.ts`, `src/hooks/useMissionTelemetry.ts`, `src/core/storage/telemetryStore.test.ts`
  - **Verify Command:** `npx vitest run && npm run typecheck`

---

## Milestone Completion Checklist

- [ ] All vertical slices above are marked `[x]` with passing tests.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `ROADMAP.md` updated to mark `M4` complete (`[x]`).
