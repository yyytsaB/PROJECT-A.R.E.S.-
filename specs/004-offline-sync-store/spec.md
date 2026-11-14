# Feature Spec: M4 — Offline-First Store, 24-Min Comms Blackout Sync Queue & 30-Day Demo Seeder (`Seam 5`)

- **Status:** `APPROVED` (Nov 14, 2026)
- **Milestone Reference:** `ROADMAP.md` -> `M4`
- **Owner:** Developer #2 (Parallel Track — or ChatGPT)
- **Resolved Fog Items:** `F2`, `F3`, `F5`

---

## 1. Problem Statement & Crew Outcome
During a Mars transit, astronauts experience up to **24-minute one-way communication blackouts**. Project A.R.E.S. must store all workouts, session metrics, and flagged 33-point `KinematicSnapshot` records 100% locally first (`localStorage` / `IndexedDB` fallback), queue outbound telemetry packets during comms blackouts (`BLACKOUT_24MIN_DELAY`), and automatically batch-flush them when a high-bandwidth communication window opens (`WINDOW_OPEN`)—syncing to Supabase if configured or to a local Mission Control Ack log when offline. Additionally, to make the hackathon demo immediately compelling on first load, `Seam 5` provides a deterministic **30-Day Mars Mission Demo Seeder**.

## 2. Confirmed Public Test Seams (`Seam 5: OfflineTelemetryAndSyncStore`)
```ts
// src/core/storage/telemetryStore.ts
export function loadMissionStore(storage?: StorageLike, nowIso?: string): MissionStoreState;
export function recordCompletedWorkout(
  state: MissionStoreState,
  session: WorkoutSessionRecord,
  storage?: StorageLike
): MissionStoreState;
export function flushCommsSyncQueue(
  state: MissionStoreState,
  commsStatus: CommsLinkStatus,
  syncClient?: TelemetrySyncClient,
  nowIso?: string,
  storage?: StorageLike
): Promise<MissionStoreState>;
export function seedDemoMissionState(nowIso: string, storage?: StorageLike): MissionStoreState;
export function clearMissionStore(storage?: StorageLike, nowIso?: string): MissionStoreState;
```

## 3. Acceptance Scenarios (Given / When / Then)
1. **Scenario 1 (Offline Blackout Queueing):**
   - **Given** `commsStatus === 'BLACKOUT_24MIN_DELAY'`, **When** `recordCompletedWorkout` saves a completed Squat session, **Then** the session is persisted in `state.sessions`, a compressed telemetry envelope is appended to `state.syncQueue` with `status: 'QUEUED_BLACKOUT'`, and zero network requests are made.
2. **Scenario 2 (Comms Window Open Batch-Flush to Supabase / Mission Control):**
   - **Given** 3 queued sessions in `state.syncQueue` and `commsStatus === 'WINDOW_OPEN'`, **When** `flushCommsSyncQueue` is invoked, **Then** all 3 envelopes are transmitted in a single batch (to Supabase REST table `workout_logs` if `syncClient` is configured, or local Mission Control ack), `state.syncQueue` pending count drops to `0`, and `lastSyncedAtIso` updates.
3. **Scenario 3 (30-Day Mars Mission Demo Seeding):**
   - **Given** a fresh browser or a click on `"Seed 30-Day Mars Demo Data"`, **When** `seedDemoMissionState` runs, **Then** it populates 30 days of realistic ARED + cardio sessions, Valles Marineris traverse progress, and sample flagged `KinematicSnapshot` records so every chart and log screen is populated immediately.
