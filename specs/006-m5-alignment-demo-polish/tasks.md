# M5 Vertical TDD Tasks

Spec: [spec.md](./spec.md). Each slice: one failing public-seam test → minimal implementation → targeted tests and `npm run typecheck` before checking completion.

- [x] **1. Persisted durations (Seams 4/5).** Red: default 0, 45 → 00:45, invalid duration rejected, legacy data retained, demo duration 45–900. Files: types, telemetry engine, storage/validation, tests. Verify: `npm run test -- src/core/telemetry/telemetryEngine.test.ts src/core/storage/telemetryStore.test.ts`.
- [x] **2. Arena timer and cues (Seam 6).** Red: running 2.5s + paused time + running .5s yields 3s, completion saves duration; positive visible form feedback, voice alias and visual overlay defaults/toggles. Files: arena hook, App, browser tests. Verify: `npm run test -- src/hooks/useWorkoutArena.test.tsx src/hooks/m5Alignment.test.tsx`.
- [x] **3. History/status/details (Seams 4/6).** Red: date/search filters, page boundaries, status thresholds, selected metrics/duration, replay diagnostic remain correct. Files: history hook, telemetry helpers, App, browser tests. Verify: `npm run test -- src/hooks/m5Alignment.test.tsx src/hooks/demoEnhancements.test.tsx`.
- [x] **4. Analytics/export (Seam 6).** Red: 7/14/30 visible rows and volume totals, JSON/CSV confirmation, print action, unchanged rolling score. Files: medical hook, App, browser tests. Verify: `npm run test -- src/hooks/m5Alignment.test.tsx`.
- [x] **5. Profile weight and milestone descriptions (Seams 3/5/6).** Red: legacy 78kg, positive validation, catalog descriptions and locked/unlocked badge toggle. Files: catalog/types/storage, journey hook, App, tests. Verify: `npm run test -- src/core/catalog/missionCatalog.test.ts src/core/storage/telemetryStore.test.ts src/hooks/m5Alignment.test.tsx`.
- [x] **6. Cache bytes and profile confirmations (Seams 4/6).** Red: exact local JSON bytes, field validation, Save / Apply message and Cancel/Confirm clearing workflow. Files: telemetry/profile hooks, App, affected existing tests. Verify: `npm run test`.
- [x] **7. Schedule and launch (Seams 3/5/6).** Red: scheduled times, persisted daily checkboxes, completed workouts check their row, primary launch picks unfinished resistance exercise. Files: catalog/store/dashboard, App, tests. Verify: `npm run test -- src/hooks/m5Alignment.test.tsx src/core/catalog/missionCatalog.test.ts src/core/storage/telemetryStore.test.ts`.
- [x] **8. Accessible navigation (Seam 6).** Red: section selection updates title/active link; keyboard skip focuses main. Files: navigation hook, App, browser/E2E tests. Verify: `npm run test -- src/hooks/m5Alignment.test.tsx` and `npm run test:e2e`.

## Completion
- [x] All tests, typecheck, build and E2E pass.
- [x] Spec and standards reviews resolved.
- [x] Public hook docs, context and roadmap updated with evidence.

## Verification — November 14, 2026

Every slice witnessed its expected RED, then passed focused tests and typecheck. Existing assertions were preserved; test fixtures gained required schema fields, byte assertions retain their earlier queue/snapshot expectations alongside the new cache field, and clear-data journeys now explicitly confirm the requested new warning.

Review regressions likewise failed before their fixes: timezone-offset analytics volume now buckets by UTC, native section/hash history (including Back to root Dashboard) synchronizes title/active state, and empty profile-error placeholders no longer expose spurious alert roles. The unchanged camera-denial assertion passes.

```text
npm run test        Test Files 12 passed (12); Tests 56 passed (56)
npm run typecheck   tsc --noEmit; exit 0
npm run build       47 modules transformed; built in 4.48s; exit 0
npm run test:e2e    8 passed (44.9s)
```

Standards audit: 0 remaining actionable findings. Spec audit: 0 remaining actionable findings. Browser coverage includes keyboard skip focus, direct links/Back/Forward, profile errors and native clear confirmation, daily schedule persistence, launch and saved duration, history/details, analytics/export, camera-denied simulation fallback and actual local MediaPipe initialization. Speech remains local-service-only; real audible voice availability depends on installed browser/OS voices. Print tests verify dialog initiation rather than claiming a PDF file was saved. Playwright emitted only environment color-setting notices.
