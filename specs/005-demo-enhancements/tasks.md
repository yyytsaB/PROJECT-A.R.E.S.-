# Demo Enhancement Tasks — ordered Red → Green → Verify

Approved scope: [spec.md](./spec.md). Each slice requires its targeted test plus `npm run typecheck` before completion.

- [x] **Slice 1 — Direction-aware snapshot diagnostic (Seam 1).**
  - Red: flexion 125° vs 95° says 30° short; extension reverses direction; target band and other faults remain accurate.
  - Files: `src/core/kinematics/kinematicMath{,.test}.ts`, shared fault labels.
  - Verify: `npx vitest run src/core/kinematics/kinematicMath.test.ts`.
- [x] **Slice 2 — Current and saved replay copy (Seam 6).**
  - Red: selecting each replay exposes estimated angle/configured target text beneath its canvas.
  - Files: `src/App.tsx`, browser UI integration test.
  - Verify: `npx vitest run src/hooks/demoEnhancements.test.tsx`.
- [x] **Slice 3 — Measured serialized bytes (Seam 4).**
  - Red: exact UTF-8 counts include multibyte IDs, empty arrays, and retained snapshots independent of the queue.
  - Files: `src/core/telemetry/telemetryEngine{,.test}.ts`.
  - Verify: `npx vitest run src/core/telemetry/telemetryEngine.test.ts`.
- [x] **Slice 4 — Queue/storage byte display (Seams 4–6).**
  - Red: UI displays queued summaries and measured KB; flush clears queue bytes without removing snapshot bytes.
  - Files: `src/hooks/useMissionTelemetry.ts`, `src/App.tsx`, browser UI integration test.
  - Verify: `npx vitest run src/hooks/demoEnhancements.test.tsx`.
- [x] **Slice 5 — Optional local voice and graceful fallback (Seam 6).**
  - Red: voice starts off; enabling identifies local voice, delayed discovery works, unavailable/remote-only/throwing services remain nonblocking.
  - Files: browser speech adapter/hook, `useWorkoutArena.ts`, `App.tsx`, browser integration tests.
  - Verify: `npx vitest run src/hooks/useWorkoutArena.test.tsx src/hooks/demoEnhancements.test.tsx`.
- [x] **Slice 6 — Transition speech and immediate cancellation (Seam 6).**
  - Red: simulator speaks rep/fault transitions once with measured symmetry; pause, stop, switch, disable, and unmount cancel speech without replaying old events.
  - Files: voice adapter/hook and arena integration, browser integration tests.
  - Verify: `npx vitest run src/hooks/useWorkoutArena.test.tsx`.
- [x] **Slice 7 — Honest live gravity scenario goals (Seams 3, 4, 6).**
  - Red: changing gravity updates 75/82/88 goals and margin without changing historical score; no clinical labels.
  - Files: catalog/types/validation, telemetry hooks, `App.tsx`, browser integration test.
  - Verify: `npx vitest run src/hooks/demoEnhancements.test.tsx src/core/catalog/missionCatalog.test.ts`.

## Completion
- [x] **Review fix — Fault warning lifecycle (Seam 6).** Red: a completed rep waits for warning `onend`; cancellations discard pending announcements. Native interruptions recover and stale speech errors cannot stop newer feedback. Verify: `npm run test -- src/hooks/useWorkoutArena.test.tsx` plus typecheck.
- [x] Full tests, typecheck, and build pass.
- [x] Browser journey verified and two-axis review addressed.
- [x] Roadmap updated.

## Verification evidence — November 14, 2026

Each slice witnessed its expected RED before production implementation, then passed its focused test and typecheck. The review regressions likewise failed before their fixes.

```text
npm run test        Test Files 11 passed (11); Tests 39 passed (39)
npm run typecheck   tsc --noEmit; exit 0
npm run build       46 modules transformed; built in 3.20s; exit 0
npm run test:e2e    7 passed (39.1s)
```

Standards review: no remaining actionable findings. Spec review: no remaining actionable findings after fixing warning priority and native speech interruption recovery. Speech tests simulate the browser/OS speech boundary; installed local voices and audible output still depend on the demo machine. The E2E suite also initializes the actual local MediaPipe runtime/model, verifies permission-denied fallback and keyboard voice toggle, and blocks external services during the new demo journey. Playwright emitted only environment color-setting notices.
