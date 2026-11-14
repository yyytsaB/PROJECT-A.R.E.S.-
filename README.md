# PROJECT A.R.E.S.

**Astronaut Resistance & Exercise System** is a browser-based NASA Space Apps prototype for exercise coaching during long-duration spaceflight. It addresses the Human Research Program problem of maintaining muscle, bone, and exercise performance when real-time support from Earth is unavailable.

The implementation includes the exercise/mission catalog, pure kinematic analysis and rep counting, live MediaPipe pose tracking, simulated reps, timed workouts, local voice cues, skeletal fault replay, local history, planetary progress and telemetry exports. The responsive dark frontend preserves the semantic HTML and headless-hook contracts. No webcam video is recorded.

Strength retention is a team-defined workout-derived score, not a measurement of muscle mass, bone density or clinically validated strength retention. The 75% / 82% / 88% gravity goals and personalized routines are prototype settings, not NASA standards or medical clearance. Initial 30-day demo history is synthetic. JSON/CSV exports carry this context with them.

Offline operation means an already loaded app can continue recording workouts without Earth connectivity. Local model assets remove runtime CDN dependencies, but this prototype has no service worker and does not guarantee an uncached offline start or reload. The 24-minute blackout is a manually toggled scenario, not a timed signal-delay simulation. Local Mission Control acknowledgements do not contact NASA.

## Six-module architecture

| Module | Responsibility | Current status |
| --- | --- | --- |
| Command Center | Sample daily schedule, completion, launch, prototype gravity goals and measured JSON sizes | Available |
| Workout Arena | Live/simulated pose, timed reps, form feedback, optional local voice and visual overlay | Available |
| Expedition Journey | Cardio/resistance progress, milestone descriptions and locked/unlocked badges | Available |
| Medical Telemetry | Rolling retention, selectable chart window, Flight Surgeon JSON/CSV and browser print | Available |
| Workout Logs & History | Persistent history, date/search filters, pagination, details and skeletal fault replay | Available |
| Profile & Mission Settings | Body weight, baselines, field validation, save confirmation and protected local-data clearing | Available |

`src/core/` contains pure domain functions, `src/adapters/` handles the camera, canvas, storage and optional sync, `src/hooks/` exposes the six screen controllers, and `src/content/` holds catalogs and source citations. Hook contracts and persistence conventions are documented in [the integration guide](docs/TELEMETRY_AND_SYNC.md). The two developers own these interfaces; two frontend members own presentation, and two documentation members own the pitch and submission.

## Local setup

Use Node.js 22.12 or newer (Node 24 is also supported).

```sh
npm install
npm run dev
```

The development and build commands copy the matching MediaPipe WASM runtime from the installed package. The official Pose Landmarker Lite model is included locally; neither camera inference nor simulated workouts requires a runtime CDN or backend. Camera access requires permission and HTTPS or localhost. Use **Simulate Good Rep**, **Simulate Shallow Rep**, or **Simulate Spine Fault** if the camera or runtime is blocked.

## Checks and production build

```sh
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run test:production
```

Browser tests use Chromium. Before the first browser test, install it into the project's local browser directory:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.playwright-browsers"
npx playwright install chromium
```

`npm run build` produces `dist/`, including the local model and SIMD/non-SIMD runtimes. Deploy the entire directory. Vercel and Netlify settings are included; both use `npm run build` and publish `dist/`. See [deployment notes](docs/DEPLOYMENT.md) for production verification and the web-filter submission fields.

## Official NASA and partner sources

The app exposes the same references in an accessible **NASA Data & Space Agency Partner Sources** section. Full usage notes are in [the NASA data and submission guide](docs/NASA_DATA_AND_SUBMISSION_GUIDE.md).

- [NASA Human Research Roadmap](https://humanresearchroadmap.nasa.gov/) and [NASA astronaut health/exercise guidance](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/) provide the countermeasure context and 2.5-hour scheduled daily exercise reference.
- [NASA OSDR](https://science.nasa.gov/biological-physical/data/osdr/) and [NASA Life Sciences Portal / LSDA](https://nlsp.nasa.gov/) provide research context for the implemented telemetry. The custom retention formula and schema are team-defined; no participant records have been imported or used to validate them.
- [NASA PDS MGS MOLA](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) provides the topography archive reference. [NASA/JPL Mars dimensions](https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts/mars-at-a-glance/) support the catalog's approximate 4,000 km canyon length and 600 km volcano diameter. Game distances are not terrain-derived traverses.
- [CSA TBone](https://www.asc-csa.gc.ca/eng/sciences/tbone.asp) and [MARROW](https://www.asc-csa.gc.ca/eng/sciences/marrow.asp) provide bone and marrow research context.
- [ESA Mars500](https://www.esa.int/pt/articles/mars500-study-overview) and [EchoFinder-2](https://www.esa.int/ESA_Multimedia/Images/2026/01/Finding_the_echo) provide delayed-communication and autonomous-healthcare context. The 24-minute scenario is a project setting.
- [JAXA Kibo Zebrafish Muscle 2](https://humans-in-space.jaxa.jp/en/biz-lab/experiment/theme/detail/000854.html) provides anti-atrophy research context.
- The [official 2026 Space Apps announcement](https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/) identifies CSA, ESA, and JAXA as partners.

Scientific citations document actual resource use and research context. They do not establish agency endorsement or Global Award eligibility; the submitted project must identify its selected challenge, implementation, and sources accurately.
