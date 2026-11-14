# M3/M4 telemetry and sync integration

`MissionTelemetryProvider` wraps the semantic testbench in `src/App.tsx`. Frontend screens under that provider share `useDashboardSummary` (alias `useDashboardTelemetry`), `useExpeditionJourney`, `useMedicalTelemetry` (alias `useMedicalAnalytics`), `useWorkoutHistory`, and `useMissionProfile`. `useMissionTelemetry` exposes the shared state and workout-saving action.

## Formula conventions

- Raw resistance tonnage is `sets × reps × loadKg`. Form-qualified expedition volume is raw tonnage multiplied by `formAccuracyPct / 100`; each 250 qualified kg advances 1 km. Cardio uses the catalog distance multiplier. Route percentage caps at 100 while cumulative distance remains available beyond completion.
- Effective ARED load is `loadKg × exercise.earthLoadMultiplier`. ARED simulates resistance independently of environmental gravity, so the same configured resistance stays effective in microgravity, Moon and Mars profiles. Gravity is preserved on each session; there is no additional undocumented gravity multiplier.
- Retention uses the mean of resistance-session effective-load/that-exercise-Earth-1RM ratios, capped at 1, weighted 70%, plus mean resistance-session form accuracy weighted 30%. Cardio cannot inflate strength retention. No resistance sessions yields 0, meaning no observations.
- The medical window is the current UTC date and preceding 29 UTC dates, ending at the injected `nowIso`. Future records are excluded. Each daily point uses its own rolling 30-day window and therefore may include history preceding the visible chart. Tonnage, symmetry averages and fault counts in the current report use the current window. A snapshot contributes once to each distinct fault it contains.
- Session input snapshots are detached and rounded to three decimal places, preserving frame dimensions for aspect-correct replay. The existing camera seam rejects observations exceeding its 2 KB snapshot budget.

## Persistence and comms

Browser persistence uses `ares.mission.v1` in local storage. `createSafeStorage` keeps a per-instance memory mirror and stops reading stale persistent data after a quota/security failure. Memory-only data lasts for the current page lifetime. The core receives storage and timestamps as arguments and never accesses browser globals or a singleton store.

Fresh browsers get the deterministic 30-day Mars demo (60 ARED/cardio sessions). Clearing the cache writes an empty mission, so reload does not reseed it. Explicit seeding replaces the current mission with the same deterministic demo for the supplied timestamp.

Every save persists full local session/snapshot data and a summary envelope. Duplicate session IDs are ignored. Blackout mode performs no transmission. Open windows automatically send one batch; without configured Supabase, they append local Mission Control acknowledgements. Failed batches remain queued and expose a retry message. Retry with **Flush sync queue now**, or close/reopen the window. Acknowledgements produce the `SYNCED` history status; session records themselves remain immutable.

An upload merges acknowledgements into the latest mission state, preserving concurrent workouts and profile changes. Clearing or reseeding invalidates pending results. New queues resume after an earlier upload settles; failed uploads do not spin in a retry loop.

## Optional Supabase

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, then restart Vite. Both must be present; otherwise local acknowledgements are used. Never put a service-role key in browser configuration.

The REST adapter posts to `/rest/v1/workout_logs?on_conflict=id` with merge-duplicate semantics and a 15-second timeout. Provision a table with these columns and appropriate access policies for your deployment:

| Column | Value / expected type |
| --- | --- |
| `id` | Unique text session ID / primary key, required for safe retries |
| `user_id` | Text astronaut profile ID (the demo uses `ares-crew-1`) |
| `exercise_type` | Catalog exercise ID, text |
| `reps_counted` | Total reps across sets, integer |
| `form_accuracy` | Percentage, numeric |
| `volume_kg` | Raw tonnage, numeric |
| `date` | Completion time, timestamptz |

No table, policies, accounts or remote data are created by this branch. Supabase behavior is verified through an injected HTTP boundary; a live deployment needs its own credentials and access policies.

## Verification

Run `npm run test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. For a fresh machine, install the Chromium browser to `.playwright-browsers` as configured in Vite/Playwright. The M3/M4 seam tests cover the spec's formulas, report escaping, corrupt storage, quota/security fallback, batch acknowledgement/failure, deterministic seeding, persistence, replay, and in-flight mission replacement. Existing Arena and NASA-source regression checks remain enabled.
