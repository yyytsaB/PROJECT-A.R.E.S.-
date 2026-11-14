# Feature Spec: M3 — Planetary Expedition Engine, Strength Retention % & Flight Surgeon Telemetry (`Seam 4`)

- **Status:** `APPROVED` (Nov 14, 2026)
- **Milestone Reference:** `ROADMAP.md` -> `M3`
- **Owner:** Developer #2 (Telemetry & Offline Sync Lead)
- **Resolved Fog Items:** `F4`, `F5`

---

## 1. Problem Statement & Crew Outcome
To combat multi-year psychological isolation and provide actionable medical telemetry for Earth flight surgeons (Screens 1, 3, and 4 in PDF 2), Project A.R.E.S. needs pure deterministic functions (`Seam 4: ProgressionAndTelemetryEngine`) that:
1. Convert stationary cardio distance (`km`) and form-qualified ARED resistance volume (`250 kg lifted = 1.0 km`) into virtual planetary expedition progress along **Valles Marineris (`4,000 km`)** and **Olympus Mons (`600 km`)**, unlocking crew milestone badges.
2. Compute the rolling 30-day **Earth-Baseline Strength Retention %** (`70%` effective load vs. pre-launch Earth 1RM baseline + `30%` mean form accuracy) across target gravity environments (`Microgravity 0g`, `Moon 0.16g`, `Mars 0.38g`).
3. Generate a structured, downloadable **Flight Surgeon Telemetry Report** (JSON & CSV summary string).

## 2. Confirmed Public Test Seams (`Seam 4: ProgressionAndTelemetryEngine`)
```ts
// src/core/telemetry/telemetryEngine.ts
export function computeSessionRecord(input: CompletedWorkoutInput, profile: AstronautProfile): WorkoutSessionRecord;
export function computeExpeditionProgress(sessions: readonly WorkoutSessionRecord[], route: PlanetaryRoute): ExpeditionProgressReport;
export function computeMedicalTelemetry(sessions: readonly WorkoutSessionRecord[], profile: AstronautProfile, nowIso: string): MedicalTelemetryReport;
export function buildFlightSurgeonReport(
  telemetry: MedicalTelemetryReport,
  profile: AstronautProfile,
  syncSummary: SyncQueueSummary,
  exportedAtIso: string
): FlightSurgeonReport;
```

## 3. Acceptance Scenarios (Given / When / Then)
1. **Scenario 1 (Tonnage + Cardio -> Planetary Expedition Distance & Badges):**
   - **Given** workouts totaling `15 km` of treadmill/cycle distance and `10,000 kg` of form-qualified ARED resistance volume (`10,000 / 250 = 40 km`), **When** `computeExpeditionProgress` runs for `VALLES_MARINERIS`, **Then** `cumulativeDistanceKm` equals `55.0 km`, `progressPct` is `1.375%`, and any milestone badge at `<= 55 km` is marked unlocked.
2. **Scenario 2 (30-Day Earth-Baseline Strength Retention %):**
   - **Given** an astronaut profile with Earth 1RM baselines and 30 days of workout records, **When** `computeMedicalTelemetry` runs, **Then** it outputs the daily retention series, cumulative volume load, bilateral symmetry consistency score, and overall `strengthRetentionPct` following the locked `70/30` formula.
3. **Scenario 3 (Flight Surgeon Telemetry Export):**
   - **Given** a `MedicalTelemetryReport` and `AstronautProfile`, **When** `buildFlightSurgeonReport` is called, **Then** it returns both a structured JSON payload and a valid CSV summary containing session metrics, flagged fault counts, and retention status.
