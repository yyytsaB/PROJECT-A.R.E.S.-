# Implementation Tasks (Vertical TDD Slices): M3 — Planetary Expedition & Medical Telemetry Engine

- **Spec Reference:** `./spec.md`
- **Owner:** Developer #2 (Telemetry & Offline Sync Lead)

---

## Vertical Slices

- [ ] **Slice 1 (Tracer Bullet): `computeSessionRecord` & `computeExpeditionProgress` (`250 kg = 1.0 km` Formula)**
  - **Target Seam:** `Seam 4 — computeSessionRecord & computeExpeditionProgress`
  - **Red Test Assertion:** Verifies `sets * reps * loadKg` volume calculation, `250 kg = 1.0 km` expedition conversion + cardio `1:1 km` addition, waypoint progress ring percentage, and milestone badge unlocking on `VALLES_MARINERIS` and `OLYMPUS_MONS`.
  - **Files Touched:** `src/core/telemetry/telemetryEngine.ts`, `src/core/telemetry/telemetryEngine.test.ts`
  - **Verify Command:** `npx vitest run src/core/telemetry/telemetryEngine.test.ts`

- [ ] **Slice 2: `computeMedicalTelemetry` — 30-Day Earth-Baseline Strength Retention % & Symmetry Series**
  - **Target Seam:** `Seam 4 — computeMedicalTelemetry`
  - **Red Test Assertion:** Verifies rolling 30-day `strengthRetentionPct` (`0.70 * loadRatio + 0.30 * formAccuracyRatio`), gravity profile scaling (`0g`, `0.16g`, `0.38g`), and 30-day chart series generation.
  - **Files Touched:** `src/core/telemetry/telemetryEngine.ts`, `src/core/telemetry/telemetryEngine.test.ts`
  - **Verify Command:** `npx vitest run src/core/telemetry/telemetryEngine.test.ts`

- [ ] **Slice 3: `buildFlightSurgeonReport` — Deterministic JSON & CSV Export Payload**
  - **Target Seam:** `Seam 4 — buildFlightSurgeonReport`
  - **Red Test Assertion:** Verifies the generated Flight Surgeon report includes astronaut baseline data, 30-day retention %, total tonnage, flagged improper rep count, and properly escaped CSV lines.
  - **Files Touched:** `src/core/telemetry/telemetryEngine.ts`, `src/core/telemetry/telemetryEngine.test.ts`
  - **Verify Command:** `npx vitest run src/core/telemetry/telemetryEngine.test.ts && npm run typecheck`

---

## Milestone Completion Checklist

- [ ] All vertical slices above are marked `[x]` with passing tests.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `ROADMAP.md` updated to mark `M3` complete (`[x]`).
