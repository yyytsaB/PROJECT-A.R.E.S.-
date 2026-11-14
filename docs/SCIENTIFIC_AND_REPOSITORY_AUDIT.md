# Scientific Context and Repository Hygiene Audit

Date: November 14, 2026. Scope: Part 2 of the frontend integration and QA plan, on `feat/frontend-visual-integration`, based on `dc78ed9`. Part 1 visual changes remain present and uncommitted. This audit does not establish clinical validation, agency endorsement, award eligibility or the state of a hosted deployment.

## Findings corrected

| Finding | Correction and verification |
| --- | --- |
| Downloaded telemetry omitted the prototype context visible in the app | Shared `src/content/prototypeNotice.json` now accompanies JSON as an additive `prototypeNotice` object and CSV as notice rows. Existing fields/calculations remain unchanged. A failing Seam 4 regression passed after the fix; browser tests read both actual offline downloads and verify visible print context. |
| The score glossary implied measured strength/volume retention and a range above 100% | Clarified the `0..100%` workout-derived heuristic. The implementation uses load/Earth-1RM ratios and recorded form, without directly measuring muscle, bone or clinical strength retention. |
| The proposal implied demonstrated injury prevention, motivation benefits and rehabilitation suitability | Rewrote those as design hypotheses or possible future applications needing validation. Clarified the prototype status, estimated camera geometry, synthetic demo history and recorded-vitals context. |
| “24-minute blackout” could be read as physical latency simulation or NASA contact | Added visible/report/documentation context identifying the manual demo toggle and local simulated acknowledgements. No countdown or actual NASA service is claimed. |
| Documentation described the previous unstyled frontend, older build sizes and ambiguous deployment verification | Updated the frontend description, labeled old test totals as historical, removed fixed current bundle-size claims and separated local build evidence from hosted verification. |
| Environment exclusions covered only one environment filename | Retained every original ignore rule and added `.env`/`.env.*`, with a non-secret `.env.example` exception. Existing governance/workflow exclusions remain effective; no ignored files are tracked. |
| Some source descriptions called delivered telemetry “planned” | Distinguished the implemented telemetry from research context and future scientific validation. Updated MARROW references to the official CSA hostname that was readable during this pass. |
| Eligibility wording omitted the selected challenge's Resources qualification | Matched the organizer clarification and recorded that official challenge selection/current submission requirements remain unverified. |

## Primary-source checks

| Source | Supported context and limits |
| --- | --- |
| [NASA astronaut health care](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/) | Scheduled daily ISS exercise supports the project motivation; it does not prescribe this app's session targets. |
| [NASA/JPL Mars facts](https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts/mars-at-a-glance/), [Moon facts](https://science.nasa.gov/moon/facts/) and [Moon-to-Mars architecture paper](https://ntrs.nasa.gov/citations/20250009282) | Approximate geography/environment context. The 600 km Olympus game distance corresponds to diameter, not a measured climb. Scenario goals and ARED load conversion remain project choices. |
| [NASA communications analysis](https://ntrs.nasa.gov/citations/20220013418) and [ESA Mars500](https://www.esa.int/pt/articles/mars500-study-overview) | Delay and disruption are distinct; Mars500 used a 20-minute delay. The app's manual 24-minute scenario is not a scientific maximum or an agency medical protocol. |
| [NASA OSDR](https://science.nasa.gov/biological-physical/data/osdr/), [HRR](https://humanresearchroadmap.nasa.gov/) and [PDS MOLA](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) | Research and geographic references. OSDR/ALSDA is distinct from LSDA. Code inspection found no participant-data or terrain-raster ingestion, and no data-based validation of the score. |
| [CSA TBone](https://www.asc-csa.gc.ca/eng/sciences/tbone.asp) and [MARROW](https://www.asc-csa.gc.ca/eng/sciences/marrow.asp) | Bone and marrow/blood-cell research context, without imported participant measurements. |
| [ESA EchoFinder-2](https://www.esa.int/ESA_Multimedia/Images/2026/01/Finding_the_echo) and [JAXA Zebrafish Muscle 2](https://humans-in-space.jaxa.jp/en/biz-lab/experiment/theme/detail/000854.html) | Autonomous ultrasound and animal muscle research context, not validation of the app's human exercise thresholds. The ESA link redirects to its current media page. |
| [2026 partner announcement](https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/) | Official search-indexed content lists CSA/ESA/JAXA; direct retrieval returned 502. No affiliation or endorsement is inferred. |
| [Organizer resource clarification](https://github.com/nasa/spaceapps/discussions/1827) | Includes the selected challenge's Resources requirement and citation obligations. Reading it does not establish this team's eligibility or completion of submission requirements. |

Retrieval limits: the NLSP landing page exposed no readable application content; current official event pages returned 502; the recorded hosted app was not accessible through the inspection tool; FortiGuard returned 403. These are unverified external states, not passed checks. No external form or submission was sent.

## Repository checks

- Scanned all tracked and nonignored candidate text files for prohibited named-assistant labels and common private-key, GitHub-token and AWS-key patterns. No matches outside the intentional ignore-rule file were found. This is a bounded pattern scan, not a comprehensive secret-security certification.
- No ignored files are tracked. Governance directories/files, workflow documents, browser bundles, dependencies, build/test output and local environment files remain excluded. A template environment file can remain trackable.
- Manifest dependency declarations match the lockfile. No application dependency was added. Both production-only and complete `npm audit` runs reported zero known vulnerabilities at audit time.
- The local pose model is 5,777,746 bytes with SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`, matching its documented checksum. Source/version/license references remain in `public/mediapipe/README.md`.
- Local SVG placeholders have descriptive alternative text and a replacement guide. They do not reuse agency marks or claim scientific terrain derivation.
- Code inspection confirms local inference without video recording, summary-only optional Supabase requests, retained local snapshots and local-service-only voice selection. Camera/runtime assets still need loading, and installed browser/OS capabilities affect availability.
- The original 325 semantic attributes, protected elements and control/heading/output contents remain present. No hook or formula was moved into presentation components.

## Verification and remaining stages

All five required checks pass: **67 unit/Chromium tests across 13 files**, strict typecheck, architecture lint, production build and **12 E2E tests**. `git diff --check` passes. The new E2E flow checks actual JSON/CSV downloads after disconnecting and prototype notice visibility under print media.

Part 3 remains the expanded regression QA pass. Part 4 remains the complete six-flow live-stage rehearsal, including real device voice/camera behavior and print-dialog handling. Cold offline starts/reloads are not guaranteed because no service worker is implemented. The current Supabase configuration, selected official challenge, hosted commit and final submission need external verification before corresponding claims can be made.
