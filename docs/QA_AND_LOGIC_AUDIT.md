# Part 3 — Logic and regression QA

Verified locally on November 14, 2026, on `feat/frontend-visual-integration`, based on main commit `dc78ed9`. Parts 1–3 remain local and uncommitted. The replaceable SVG assets and current visual presentation are retained for the later frontend revision.

## Scope

Reviewed the six public seams and their callers: catalog/kinematics, arena lifecycle and timer, onboarding/routine generation, telemetry calculations, mission persistence, queue synchronization, dashboard/journey, medical reports, history/replay, settings and navigation. Regression checks use the existing pure-core, headless-hook and browser DOM boundaries. No dependencies or remote services were added.

## Confirmed defects and fixes

| Defect | Resulting behavior | Regression evidence |
| --- | --- | --- |
| Seeded shallow reps used full-depth geometry, contradicting the saved depth fault. | New demo snapshots use 60% of the configured excursion; the recorded angle, symmetrical pose and depth fault agree. Historical user records are not rewritten. | `telemetryStore.test.ts`: replay analysis independently detects the depth fault in every seeded snapshot. |
| Cached snapshots could contain cardio IDs, invalid dimensions, coerced fault labels or fractional rep numbers; some crashed replay. Session sets/reps could also be fractional. | Loading rejects these invalid cache states using the existing clean-mission recovery path. Valid legacy snapshots without dimensions and valid explicit dimensions remain supported. | `telemetryStore.test.ts`: malformed-cache cases plus a valid dimensioned round trip. |
| Legacy snapshots with finite coordinates but degenerate torso geometry could throw during rendering. | Replay clears the previous image and displays an unavailable-geometry message without crashing. The legacy workout and queued telemetry remain available; original cache/byte-count fixtures are preserved. | `poseCanvasRenderer.test.ts` and the unchanged legacy cache hook test. |
| Restarting the arena or selecting another exercise discarded completed, unsaved reps. | The hook completes and saves the previous session once before resetting. Pause/resume still preserves the same session. Empty sessions remain absent from history; completed sessions are not saved twice. | `useWorkoutArena.test.tsx` and online/offline `session-reliability.spec.ts`. |
| Editing ARED load during a session retroactively changed all its recorded tonnage. | `useWorkoutArena.canConfigureLoad` locks the load during startup, running and pause; it becomes editable for the next session. | Online/offline E2E tests verify two one-rep sessions at 70 kg total 140 kg. |
| Seeding a new demo mission left the previous arena session running. | Seeding resets the arena and current replay before replacing mission data. Confirmed clear also resets the arena and leaves no sessions or queued summaries. | Online/offline E2E tests cover seed and clear during active workouts. |
| Finite numeric inputs could overflow computed workout totals into `Infinity`, which JSON serializes as `null`. | Session creation rejects nonfinite totals before persistence and avoids an unnecessary intermediate overflow in form-qualified distance. The team-defined formula is unchanged. | `telemetryEngine.test.ts`: overflow rejection and a representable large-value calculation. |

Each defect was reproduced with a failing regression before its fix. Existing tests and assertions were retained.

## Additional verified behavior

- A network failure retains queued summaries and exposes retry status. Manual retry preserves workouts/settings saved during the upload, then sends the new summaries; every session receives one acknowledgement. This scenario already worked and now has explicit hook regression coverage.
- Existing tests cover routine confirmation and stale-generation cancellation, automatic/manual recalibration, UTC reporting windows, history filtering/pagination, saved pose replay, JSON/CSV downloads, print invocation, local voice fallback and camera denial/startup cancellation.
- Browser tests initialize the real local MediaPipe runtime/model with a simulated browser camera. This is not physical-camera accuracy or stage-performance validation.
- A source-based comparison preserved all 325 original semantic attributes, protected elements and button/heading/output contents across the integration files.
- Repository scan found no prohibited assistant brand names outside ignored governance filename rules, no common secret patterns, and matching dependency manifest/lockfile entries. The bundled pose model digest still matches its recorded SHA-256.

## Required checks

| Command | Result |
| --- | --- |
| `npm run test` | PASS — 73 tests across 13 files, including Chromium hook tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 11 pure core modules and frontend hook boundary |
| `npm run build` | PASS — production bundle and local pose assets |
| `npm run test:e2e` | PASS — 16 Chromium E2E tests, including offline and keyboard coverage |

All five commands exited successfully with zero test, type, lint or build errors. The browser launcher emits its existing `NO_COLOR`/`FORCE_COLOR` environment warning.

## Remaining work

Part 4 remains the complete six-flow stage rehearsal, including actual laptop/tablet viewing, physical webcam conditions, installed local speech voices and the native print dialog. Automated print tests verify invocation and printable content; they do not save a PDF through the operating-system dialog.

Offline coverage means an already-loaded page disconnected from the network. There is no service worker or guaranteed cold-start offline navigation. Optional remote Supabase behavior is checked through an injected transport/HTTP responses; no live backend credentials or production database were used. Hosted deployment and external submission readiness remain separate from these local results.

Final teammate artwork and a full frontend revision are still pending. The current schematic maps, logo and badge are replaceable local assets. Scientific prototype notices and existing agency-source sections remain intact.
