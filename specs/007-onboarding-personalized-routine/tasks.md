# M6 Vertical TDD Tasks

Approved scope: [spec.md](./spec.md). Work in order; check each slice only after its expected RED, minimal GREEN, focused tests and typecheck output.

- [x] **1. BMI seam.** Red: 78kg/175cm = 25.5; invalid inputs rejected. Files: telemetry engine/types and appended unit test. Verify: `npm run test -- src/core/telemetry/telemetryEngine.test.ts`.
- [x] **2. Compatible profile/storage defaults.** Red: old missions retain sessions and receive all defaults; invalid new fields rejected; implicit-default JSON bytes remain accurate. Files: profile defaults, types, storage validation/serialization, new M6 tests. Verify: `npm run test` and original-test prefix/hash check.
- [x] **3. Deterministic prototype routine.** Red: complete seven-item plan, Earth baseline/history calibration, 15% applicable limitation moderation, scenario/history rationale and deterministic ID. Files: telemetry engine, static routine content and appended unit test. Verify: `npm run test -- src/core/telemetry/telemetryEngine.test.ts`.
- [x] **4. Persisted plan and adjustments.** Red: dashboard initialization, manual recalibration, auto-on notification/recompute, auto-off target stability and reload persistence. Files: mission hooks and Chromium tests. Verify: `npm run test -- src/hooks/m6OnboardingRoutine.test.tsx`.
- [x] **5. Onboarding wizard and preview.** Red: step validation/back navigation, live BMI, visible processing delay, preview and confirmed save; drafts/stale previews cannot persist. Files: onboarding headless hook, semantic section, App/navigation, Chromium tests. Verify: `npm run test -- src/hooks/m6OnboardingRoutine.test.tsx`.
- [x] **6. Health settings and dashboard rationale.** Red: live BMI and field errors, health updates/recalibration/toggle, exact routine label/prescriptions/notification in UI. Files: profile hook, semantic health fields and App, Chromium tests. Verify: `npm run test`.
- [x] **7. Lint and browser journey.** Red: missing lint command then meaningful native architecture checker. Add offline keyboard-accessible onboarding/recalibration E2E; verify no original tests changed. Verify: `npm run lint`, `npm run test:e2e`.

## Completion
- [x] Unit/browser tests, typecheck, lint, build and E2E pass.
- [x] Spec and standards audits resolved.
- [x] Context, public hook docs and roadmap updated with final evidence.
