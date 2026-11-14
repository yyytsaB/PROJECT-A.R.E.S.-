# Part 4 — Stage rehearsal QA

Local software verification on November 14, 2026, on `feat/frontend-visual-integration`. The complete six-flow rehearsal passed online at 1440px and after network disconnection at 1024px. Native print-dialog verification remains a manual check because desktop window inspection was stopped by its browser URL-verification guard. Final artwork and the full frontend revision remain pending.

## Repeatable rehearsal

Run `npm run test:e2e -- tests/e2e/stage-walkthrough.spec.ts --workers=1`. Each run uses isolated browser storage and synthetic data. It creates screenshots and downloaded reports under the ignored `test-results/` directory; another Playwright run replaces that directory.

| Flow | Verified in both network states |
| --- | --- |
| Mission onboarding | Three steps; 180 cm / 81 kg produces BMI 25; pre-flight vitals, all four Earth baselines and a limitation; actual processing message observed; seven-item preview and explicit confirmation. |
| Command Center | Personalized rationale; 0g/0.16g/0.38g scenario goals of 75/82/88%; primary launch starts Squat. Goals retain prototype disclaimers. |
| Workout Arena | Good/shallow/spine-fault simulations; visible skeleton pixels, positive feedback, depth/spine alerts; running MM:SS timer, paused timer stability, resume and save; current replay and angle diagnostic. |
| Expedition Journey | Both local route graphics; unlocked and locked badge descriptions and all-badge toggle. A synthetic 55 km cardio entry crosses the first 50 km milestone on both game routes. |
| Medical and history | 7/14/30 table windows; 240 kg from three 80 kg reps; actual JSON/CSV downloads with two sessions and prototype notices; print invocation, browser-rendered PDF, history Details and saved flagged-rep replay. |
| Settings and comms | Updated height and BMI; manual plan freeze and recalibration; automatic updates; four queued sessions acknowledged by the local demo path; reseed 60 sessions; keyboard dialog navigation, Escape cancellation and confirmed clear. |

Both journeys assert zero uncaught page errors and no document-level horizontal overflow. Existing E2E coverage also checks 768px/390px layouts, keyboard focus, camera denial, local runtime initialization and interrupted sessions.

## Print defect fixed during rehearsal

The first PDF inspection found black print text on retained dark notification/schedule panels and pale chart labels on white. A failing browser regression measured text contrast below 4.5:1. Print-only styles now use light surfaces and dark text/accents for notifications, schedules, forms, captions, badges and SVG axis labels. The screen theme and semantic HTML contracts remain unchanged.

The regression checks notifications, a schedule label, the chart caption and an SVG axis label. Browser-produced A4 pages were rendered for visual inspection. The current Print / Save as PDF action prints the application page; it is not a dedicated condensed clinical report. JSON/CSV retain the full 30-day reporting contract.

## Verification

All five required commands pass with zero test, type, architecture-lint or build errors:

- `npm run test`: 73 tests across 13 files, including Chromium hook tests.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run test:e2e`: 19 tests, including both complete rehearsals and the print regression.

All 325 original semantic attributes, protected elements and control/heading/output contents remain present. The repository hygiene scan reports no common secret patterns or prohibited assistant brand names, and dependency manifest/lockfile entries still match. No new dependency was added. Parts 1–4 changes remain local and uncommitted.

## Manual stage-device checks still needed

1. Open the local app and click **Print / Save as PDF**. Confirm the native preview opens, choose **Save as PDF**, and inspect the saved copy. Automation verified print invocation and browser PDF rendering, but could not inspect this native dialog.
2. Toggle Voice Coach and listen to a simulator rep on the actual stage speakers. This machine exposed and selected the local Microsoft David voice during both rehearsals; audible output was not independently confirmed.
3. If the presentation uses a physical webcam, rehearse actual framing, lighting and device performance. Automated model initialization uses a simulated browser camera and does not establish physical-camera accuracy or frame rate.

Offline verification covers an already-loaded page with its local images decoded before disconnection. There is no service worker or guaranteed cold-start offline navigation. Comms acknowledgements in this rehearsal use the local demo path; live Supabase deployment and external submission remain separate checks. No NASA/clinical clearance is claimed.
