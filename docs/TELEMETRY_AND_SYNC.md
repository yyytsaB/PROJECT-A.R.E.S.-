# M3–M6 telemetry, sync and frontend integration

`MissionTelemetryProvider` wraps the semantic frontend in `src/App.tsx`. Frontend screens under that provider share `useDashboardSummary` (alias `useDashboardTelemetry`), `useExpeditionJourney`, `useMedicalTelemetry` (alias `useMedicalAnalytics`), `useWorkoutHistory`, and `useMissionProfile`. `useMissionTelemetry` exposes the shared state and workout-saving action.

## Formula conventions

- Raw resistance tonnage is `sets × reps × loadKg`. Form-qualified expedition volume is raw tonnage multiplied by `formAccuracyPct / 100`; each 250 qualified kg advances 1 km. Cardio uses the catalog distance multiplier. Route percentage caps at 100 while cumulative distance remains available beyond completion.
- Effective ARED load is `loadKg × exercise.earthLoadMultiplier`. ARED simulates resistance independently of environmental gravity, so the same configured resistance stays effective in microgravity, Moon and Mars profiles. Gravity is preserved on each session; there is no additional undocumented gravity multiplier.
- Retention uses the mean of resistance-session effective-load/that-exercise-Earth-1RM ratios, capped at 1, weighted 70%, plus mean resistance-session form accuracy weighted 30%. Cardio cannot inflate strength retention. No resistance sessions yields 0, meaning no observations.
- The score is a team-defined heuristic, not measured muscle retention, bone density or clinical strength testing. JSON exports include an additive `prototypeNotice` object and CSV includes corresponding notice rows. The shared `src/content/prototypeNotice.json` also supplies visible metric, synthetic-data and comms explanations; existing report fields and metric calculations are unchanged.
- The medical window is the current UTC date and preceding 29 UTC dates, ending at the injected `nowIso`. Future records are excluded. Each daily point uses its own rolling 30-day window and therefore may include history preceding the visible chart. Tonnage, symmetry averages and fault counts in the current report use the current window. A snapshot contributes once to each distinct fault it contains.
- Session input snapshots are detached and rounded to three decimal places, preserving frame dimensions for aspect-correct replay. The existing camera seam rejects observations exceeding its 2 KB snapshot budget.

## Persistence and comms

Browser persistence uses `ares.mission.v1` in local storage. `createSafeStorage` keeps a per-instance memory mirror and stops reading stale persistent data after a quota/security failure. Memory-only data lasts for the current page lifetime. The core receives storage and timestamps as arguments and never accesses browser globals or a singleton store.

An already loaded app can continue local workflows while disconnected. There is no service worker or guaranteed uncached offline start/reload. Blackout mode is manually selected rather than timed; it does not simulate physical latency. Local Mission Control acknowledgements are simulated local records, with no NASA endpoint involved.

Fresh browsers get the deterministic 30-day Mars demo (60 ARED/cardio sessions). Clearing the cache writes an empty mission, so reload does not reseed it. Explicit seeding replaces the current mission with the same deterministic demo for the supplied timestamp.

Every save persists full local session/snapshot data and a summary envelope. Duplicate session IDs are ignored. Blackout mode performs no transmission. Open windows automatically send one batch; without configured Supabase, they append local Mission Control acknowledgements. Failed batches remain queued and expose a retry message. Retry with **Flush sync queue now**, or close/reopen the window. Acknowledgements produce the `SYNCED` history status; session records themselves remain immutable.

An upload merges acknowledgements into the latest mission state, preserving concurrent workouts and profile changes. Clearing or reseeding invalidates pending results. New queues resume after an earlier upload settles; failed uploads do not spin in a retry loop.

## Demo diagnostics and local voice

`describeSnapshotDiagnostic` compares the estimated primary joint angle with the configured exercise target in its flexion/extension direction. “Target reached” includes the configured hysteresis tolerance; it does not clear independent spine or symmetry faults, validate technique clinically, or identify a NASA-prescribed angle.

`useMissionTelemetry` exposes `queuedPayloadBytes` and `retainedSnapshotBytes`: UTF-8 lengths of the serialized summary queue and flattened retained snapshot array. Empty JSON arrays occupy two bytes; the UI rounds to one decimal KB (1,000 bytes). These measure local JSON representations, not actual network traffic, protocol overhead, or the Supabase adapter's mapped request body. Synchronization removes queued summaries but retains local snapshots. No video baseline or DSN savings is asserted.

Gravity profiles have team-defined `prototypeGoalPct` values of 75 (microgravity), 82 (Moon), and 88 (Mars). `useDashboardSummary().gravityScenarioDescription` compares the historical score with the selected goal. Changing gravity does not recalculate historical performance. Goals are demo settings, not NASA standards, landing/EVA clearance, or medical load prescriptions.

`useWorkoutArena` exposes `voiceCoachEnabled`, `voiceCoachStatus`, and `setVoiceCoachEnabled`. Voice Coach is off by default, uses local-service browser/OS voices only, and stays silent if none is available. New fault alerts and completed reps can speak; frame updates do not repeat announcements. Fault warnings finish before completion feedback, with at most one pending rep announcement (the latest). Pause, end, restart, exercise/mode switch, disable, error and unmount cancel speech and discard pending feedback. Visible alerts remain available. Actual voice availability depends on the browser and installed OS voices; verify the demo laptop without networking before the pitch.

## M5 frontend contracts

The implementation follows the detailed M5 checklist in `specs/006-m5-alignment-demo-polish/`. A separate four-page teammate document was not supplied with that checklist. Frontend styling now wraps the existing semantic HTML with all six sections available; screens continue to bind directly to the same hooks.

| Hook / helper | Added contract |
| --- | --- |
| `useWorkoutArena` | `elapsedSeconds`, `formFeedback`, `voiceEnabled` / `setVoiceEnabled`, `visualOverlayEnabled` / `setVisualOverlayEnabled`. Voice is initially off; overlay initially on. Existing voice names remain aliases. `onCompleted(state, durationSec)` retains the original state argument and adds elapsed running seconds. |
| `formatDurationMmSs` | Formats finite nonnegative seconds as MM:SS, flooring fractional seconds; minutes may exceed 59. |
| `useWorkoutHistory` | `dateRange` / `setDateRange` (ALL, LAST_7_DAYS, LAST_14_DAYS, LAST_30_DAYS), `page` / `setPage`, `totalPages`, `totalSessions`, `selectedSession` / `selectSession`. Page size is 10, default ALL/page 1. Paged `sessions` include `formStatus` and `formattedDuration`. Search/date changes reset page and details; dataset changes clamp page. |
| `getSessionFormStatus` | GREEN: at least 90% form and no captured fault flags; YELLOW: at least 75%; RED: lower. These are prototype form labels, not health clearance. |
| `useMedicalTelemetry` | `dateWindowDays` / `setDateWindowDays` (7/14/30), `retentionSeries`, `volumeSeries`, `visibleVolumeKg`, `exportConfirmationMessage`. Existing 30-day series remain available. `exportFlightSurgeonReport('pdf')` opens browser print/Save as PDF; JSON/CSV retain the full 30-day report. |
| `useExpeditionJourney` | `showAllBadges` / `setShowAllBadges`, visible `badges` with `description` and `isUnlocked`; existing `unlockedBadges` retained. |
| `useMissionTelemetry` | `localCacheBytes` measures UTF-8 JSON for the mission cache only, alongside queue/snapshot bytes. This is not browser storage quota or actual network traffic. |
| `useMissionProfile` | `profileFieldValue`, `setProfileField`, `fieldErrors`, `applyProfile`, `profileConfirmationMessage`, `clearConfirmationPending`, `cancelClearLocalData`, `confirmClearLocalData`. Calling this hook's `clearLocalCache` requests confirmation; only the confirmed action clears data. |
| `useDashboardSummary` | `todaySchedule` includes sample `scheduledTime` and `completed`; `setScheduleCompletion` persists manual checkboxes; `initiateTodaysSession` calls the provided launch callback for the first unfinished resistance exercise (first resistance exercise if all are complete). |
| `useAppNavigation` | `pages`, `activePage`, `setActivePage`; section links, initial hash and browser history synchronize titles and the active link. A skip link focuses the main content. |
| `useMissionOnboarding` | 3-step onboarding wizard (`step`, `nextStep`, `previousStep`, `fieldValue`, `setField`, `errors`, `bmi`, `setLimitation`, `setMission`, `setGravity`, `generateRoutine`, `isBuilding`, `preview`, `confirmRoutine`, `confirmation`). |
| `calculateBmi` / `generatePersonalizedRoutine` | Pure BMI calculation (`kg/m²` rounded to 1 decimal) and deterministic rule-based prototype routine generator (`PersonalizedRoutinePlan`) with 15% limitation moderation and per-exercise rationale. |
| `useMissionProfile` (M6 additions) | `bmi`, `recalibrateRoutine`, `setAutoAdjustRoutine`, `setInjuryLimitations`, `setMissionType`, and validation for height, resting heart rate, systolic/diastolic blood pressure, injury notes, and mission duration. |

Durations count running wall time only, retaining fractional remainders across pauses. Stopping saves whole seconds; starting or changing exercise resets the timer. Camera frames do not drive timer renders. Positive form feedback appears only with visible analysis and no active fault alerts; textual alerts remain available when audio or the overlay is disabled.

The schema-version-1 loader preserves older missions by supplying missing durations as zero, body weight as 78 kg, and daily completion from saved workouts. Explicit invalid values are rejected. Seeded ARED durations are 45–180 seconds and cardio durations 600–900 seconds. Body weight must be finite and positive and does not change the locked ARED resistance/retention formula. CSV appends `duration_sec` and includes `body_weight_kg`.

History and analytics windows use UTC days ending at the current/injected timestamp, including offset timestamps normalized to UTC. Cropping a chart does not redefine the rolling 30-day score. Daily checkboxes persist under `scheduleCompletion` by UTC day; manual completion never creates a workout or changes performance metrics. Schedule times and gravity goals are team-defined demo settings.

Profile fields preserve the previous behavior of persisting valid edits immediately. Invalid edits stay visible with field errors without entering the mission store; Save / Apply validates all editable fields and confirms the saved profile. Clear Local Data uses a native accessible dialog with Cancel/Confirm, resets the arena and empties this app's mission cache. It does not erase unrelated browser data.

## Optional Supabase setup

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
