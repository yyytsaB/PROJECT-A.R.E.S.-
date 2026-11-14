# Feature Spec: Honest Demo Diagnostics, Voice Coach & Gravity Scenarios

- **Status:** IMPLEMENTED — approved user scope, verified November 14, 2026.
- **Dependencies:** Completed M0–M4; existing six public test seams.
- **Owner:** Development team.

## Intent and scope
Make replay, offline telemetry, and mission scenarios understandable during the demo, in this order: diagnostics and measured bytes; optional voice; prototype gravity goals. Preserve the historical strength score, offline operation, and unstyled semantic testbench. No medical clearance, NASA-endorsed exercise thresholds, fabricated video/DSN comparisons, raw video, new packages, or decorative styling.

## Approach and reuse
Extend existing KinematicMath, telemetry, catalog, headless hooks, and accessible browser surfaces. Reuse configured angles, hysteresis, fault labels, snapshots, and simulator. Native TextEncoder measures UTF-8 JSON; native speech synthesis provides optional browser output. Static scenario goals belong in the catalog. Separate browser speech side effects from the pure core. No service framework, extra state manager, or dependency is necessary (Ponytail check).

## Public seams and contracts
- **Seam 1 — KinematicMath:** `describeSnapshotDiagnostic(snapshot: KinematicSnapshot, exercise: ResistanceExerciseDefinition): string`. Direction-aware target deficit, hysteresis tolerance, estimated/configured wording, readable faults. Shared existing fault labels.
- **Seam 4 — ProgressionAndTelemetryEngine:** `measureMissionPayloads(state: MissionStoreState): { queuedPayloadBytes: number; retainedSnapshotBytes: number }`. Measure `JSON.stringify(state.syncQueue)` and the flattened locally retained snapshots array, including JSON array delimiters. These are local serialized data sizes, excluding transport overhead and Supabase field mapping. Empty arrays each occupy two bytes.
- **Seam 4 — Scenario copy:** `describeGravityScenario(score: number, gravity: GravityProfile): string` formats the selected goal comparison at one-decimal display precision.
- **Seam 3 — ExerciseAndMissionCatalog:** gravity profiles gain `prototypeGoalPct` (75, 82, 88). Goals are team-defined demo settings, not NASA or clinical standards.
- **Seam 6 — PoseCameraAndE2EHarness:** browser UI and `useWorkoutArena` expose voice toggle/status; both replay locations display selected diagnostics; mission hooks expose measured bytes and scenario comparison.

## Acceptance scenarios
1. Given flexion or extension snapshots, when described, then the shortfall follows movement direction. At or beyond the configured target band, say “Target reached”; preserve independent spine/asymmetry faults. Display beneath current and saved replay canvases only when selected.
2. Given queued summary envelopes and locally retained snapshots, when state changes, then exact serialized UTF-8 byte counts update. UI shows one decimal KB (1 KB = 1,000 bytes), queue count, and that snapshots remain local. Do not label these as measured network traffic.
3. Given voice off by default, when enabled, prefer a local-service voice and identify whether local output is active. If no local voice exists, keep speech inactive with an explanatory status (no remote dependency). Handle delayed voice availability, unavailable/throwing speech APIs, and retain visible alerts.
4. Given voice enabled during a running session, speak newly entering fault alerts and incremented rep counts using measured peak symmetry, once per transition. Fault warnings take priority; cancel stale speech. Pause, stop, exercise/mode/session switches, toggle off, error, and unmount cancel speech immediately. Enabling/resuming does not replay old events.
5. Given a selected gravity profile, render its scenario name, historical score, prototype goal and signed margin in percentage points. Switching gravity changes the goal comparison only. Explicitly label the goals team-defined and nonclinical; include below, met, and exceeded states.

## Verification
One failing test then minimal implementation per slice. Vitest pure and real-browser hook/UI tests cover direction, UTF-8, transitions, and unavailable speech. Playwright verifies integrated offline simulator journeys. Finish with `npm run test`, `npm run typecheck`, `npm run build`, and two-axis review against this spec and coding standards.
