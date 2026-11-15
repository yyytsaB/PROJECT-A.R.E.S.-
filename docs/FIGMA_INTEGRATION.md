# Mission mockup integration — 15 November 2026

The working application now follows the team's Figma screen structure and visual system. This revision replaces the long scroll interface with individual hash-routed screens and uses the reference's local fonts, transparent glass surfaces, ambient lighting, spacing, card hierarchy and desktop sidebar.

## Screen composition

- Dashboard: greeting and mission-day badge; retention ring and mission timeline; three status indicators; schedule and strong glass launch card.
- Arena: camera/skeleton viewport with session and simulator controls beneath; exercise configuration and form feedback at the right; timer in the page header. Video and canvas share the same viewport. Active tracking preserves a 4:3 coordinate surface so pose geometry is not stretched.
- Journey: expedition statistics and completion ring above the textured route map, followed by earned/locked badges. The two real catalog expeditions and their distances remain authoritative.
- Analytics: full-width retention chart, volume and symmetry cards, date window, accessible data table and existing report actions.
- Logs: compact session table beside the selected-session/replay panel. Full rep counts, volume and sync status are in Session Details; flagged row replay actions expand on demand.
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
| Full Playwright E2E suite | 31 passed, including online/offline six-flow rehearsals |
| Production bundle browser tests | 5 passed, including real model initialization with a fake camera and matching video/canvas bounds |
| Responsive checks | All nine screens at 320/768/1440px; additional dashboard checks at 375/390/1024/1280px |
| Local typography/glass | Font availability, no remote asset requests, translucent fill and 16px blur verified in Chromium |
| New routing/keyboard regressions | Page isolation, browser history/reload, current-page skip target, visible rejected-save feedback, drawer focus/Escape, offline search, active workout/replay persistence |

The initial page-isolation, drawer focus, video-overlay alignment and current-page skip assertions failed before their fixes. The five required checks and production suite are rerun against the final visual batch before release.

A loaded app supports local workflows after disconnecting. There is no service worker or guaranteed uncached offline start/reload. Production camera checks use a fake camera; real-device framing, lighting and installed speaker/voice availability still need the team's stage rehearsal.

See `DESIGN_SYSTEM.md` and `public/assets/README.md` for the visual contracts and asset provenance. Vercel publishes main to the recorded production target; deployment status and the actual HTTPS pages must be verified after merging.
