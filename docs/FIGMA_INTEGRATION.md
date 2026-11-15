# Mission mockup integration — 15 November 2026

The working application now follows the team's Figma screen structure and visual system. This revision replaces the long scroll interface with individual hash-routed screens and uses the reference's local fonts, transparent glass surfaces, ambient lighting, spacing, card hierarchy and desktop sidebar.

## Screen composition

- Dashboard: greeting and mission-day badge; retention ring and mission timeline; three status indicators; schedule and strong glass launch card.
- Arena: camera/skeleton viewport with session and simulator controls beneath; exercise configuration and form feedback at the right; timer in the page header. Video and canvas share the same viewport. Active tracking preserves a 4:3 coordinate surface so pose geometry is not stretched.
- Journey: expedition statistics and completion ring above the textured route map, followed by earned/locked badges. The two real catalog expeditions and their distances remain authoritative.
- Analytics: full-width retention chart, volume and symmetry cards, date window, accessible data table and existing report actions.
- Logs: compact session table beside the selected-session/replay panel. Full rep counts, volume and sync status are in Session Details; flagged row replay actions expand on demand. Search accepts both displayed exercise names and original catalog IDs.
- Settings: gravity/mission configuration, routine personalization and local data/comms cards.
- Profile: separate personal details, health metrics and Earth baselines, available from navigation and the crew avatar.
- Onboarding: standalone three-step screen with a branded progress rail and glass form.
- NASA Data Sources: separate references and catalog screen.

## Behavior and accessibility

The existing core, adapters and telemetry hooks still own business state. Switching screens keeps an active workout, canvas refs and in-memory mission state mounted. Browser Back/Forward, reload and legacy heading links resolve to the corresponding page. A visible page is restored without a new routing dependency.

The desktop sidebar becomes a native modal navigation drawer below 1024px. Its keyboard focus wraps within the drawer, Escape closes it, and closing restores the trigger. The original section picker remains available inside the drawer. Search supports keyboard selection and Ctrl/Cmd+K. The skip link focuses the current page without replacing its route.

Existing accessible control names, media/output elements and scientific disclaimers remain. Navigation tests now visit screens explicitly rather than assuming every section is visible simultaneously. Simulator, local camera runtime, voice option, timer, saved replay, badges, reporting windows, exports, comms and clear-data confirmation retain their behavioral assertions.

## Visual source and local assets

The measured mockup uses Plus Jakarta Sans, Conthrax and JetBrains Mono. Those files load locally from `public/assets/fonts/`. Glass cards use a transparent white gradient, a translucent border, 16px backdrop blur, inset highlights and a soft shadow. The navy-to-slate ambient canvas uses the exported transparent light overlay. Strong launch surfaces use the reference's blue radial/linear layers.

The app reflows at narrow widths rather than scaling a fixed desktop canvas. Content and prototype honesty take precedence over invented mockup values: no clinical floors, diagnostic BMI classifications, sleep/readiness measurements or encrypted-downlink claims are added. Route artwork remains schematic, not terrain-derived.

## Verification

| Check | Result |
|---|---|
| Unit and Chromium browser tests | 80 passed across 13 files |
| Strict TypeScript / architecture lint | Passed |
| Production build | Passed |
| Full Playwright E2E suite | 42 passed, including online/offline six-flow rehearsals |
| Production bundle browser tests | 5 passed, including real model initialization with a fake camera and matching video/canvas bounds |
| Responsive checks | All nine screens at 320/768/1440px; additional dashboard checks at 375/390/1024/1280px |
| Local typography/glass | Font availability, no remote asset requests, translucent fill and 16px blur verified in Chromium |
| New routing/keyboard regressions | Page isolation, browser history/reload, current-page skip target, visible rejected-save feedback, drawer focus/Escape, offline search, active workout/replay persistence |

The initial page-isolation, drawer focus, video-overlay alignment and current-page skip assertions failed before their fixes. The five required checks and production suite are rerun against the final visual batch before release.

A loaded app supports local workflows after disconnecting. There is no service worker or guaranteed uncached offline start/reload. Production camera checks use a fake camera; real-device framing, lighting and installed speaker/voice availability still need the team's stage rehearsal.

See `DESIGN_SYSTEM.md` and `public/assets/README.md` for the visual contracts and asset provenance. Vercel publishes main to the recorded production target; deployment status and the actual HTTPS pages must be verified after merging.

## Dashboard reference correction — 15 November 2026

The supplied schedule/Ready screenshot and rendered team Figma preview were rechecked before this revision. The Dashboard launch action is a separate strong-glass panel: at first it is pinned to the lower right, aligned with the Ready column, with a 24px viewport inset (16px on phones, respecting safe areas). Once its reserved location immediately below Ready enters view, it resumes normal flow and scrolls away. It appears only on the Dashboard. Resize/font changes remeasure its position; its real height reserves space to prevent a jump. Keyboard scrolling leaves room for the panel and print omits it.

Measured corrections include 18px/700 panel headings, page-title tracking of −0.025em, 15px/600 schedule titles, 14px JetBrains Mono times, rounded checkbox outlines, 36px blue icon tiles, the adaptation pill and info disclosures, 166px metric tiles, and the launch title's 18px Conthrax with 0.14em tracking. Fractional retention figures use smaller decimal text so the actual score fits inside the ring. Shared heading corrections apply across the existing screens.

The six schedule/calendar/info icons and launch chevron are native SVG shapes observed in the reference, bundled locally. Rowing is not a reference row; its tile uses a neutral R initial. Today's seven catalog exercises, demo times, real prescriptions and completion/launch behavior remain authoritative. No reference exercise load, workout duration or fictional health measurement was substituted.

View week opens the reference's seven-day microcycle as an explicitly illustrative template, not a personalized weekly prescription. Its content is stored in `src/content/weeklyTemplate.json`. The native modal mounts when opened, closes on Escape and restores focus. Existing clear-data confirmation behavior is preserved.

Ready now follows the reference's Readiness / Sleep / Resting HR tile layout. Readiness and sleep show unavailable markers because the app does not record them; resting heart rate comes from the saved profile, not a live sensor. The profile link remains available below the detached launch action.

All nine screens were inspected after the shared typography change. Intentional differences from the reference remain: original accessible headings and controls; the working seven-exercise catalog; 7/14/30-day reporting; real queue/storage figures; schematic route maps; prototype scoring and medical disclaimers; no unsupported body-region/clinical-floor, sleep or comms-latency claims; and no profile-photo upload feature. These are not claimed as full feature or pixel parity.

Regression coverage adds desktop/tablet/phone pin-and-release geometry, page isolation, week-dialog keyboard focus, saved-profile heart-rate accuracy, unavailable measurements and offline week access. The new launch and week-control assertions failed before implementation. An existing unit test also caught a dialog-order regression; mounting the week dialog only while open fixed it without weakening the existing assertion.

Arena, Journey and medical hierarchy received a further measured reference pass. See `ARENA_JOURNEY_ALIGNMENT.md` for the two-step camera consent/preparation flow, segmented exercise controls, interactive catalog waypoints, replaceable badge mapping, information hierarchy and intentional differences from fictional reference data.
