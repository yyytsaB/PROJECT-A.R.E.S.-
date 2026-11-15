# Mockup source alignment

The November 15 revision uses the supplied `MOCKUP.zip` React export as the visual reference. Its eight page components, `Shell.tsx`, `ui.tsx`, `PresentationCanvas.tsx`, and `index.css` were read and the export was rendered locally for comparison. It supplies actual page structure, typography, glass tokens, logo crop, icon geometry and assets; it supersedes screenshot estimates in earlier alignment reports. The reference app was kept outside this repository. Its store, demo scoring, configuration scripts and governance files were not imported.

## Corrected differences

| Area | Changes based on the source |
| --- | --- |
| Shared shell | Preserve the 1440px desktop proportions when enlarging to wide screens; sticky translucent header; 15px main navigation; corrected logo crop, brand tracking, crew tile and search sizing. |
| Type and glass | Conthrax's supplied single face covers its declared weight range without synthetic bold; 11px tracked eyebrows, 36px page titles, 16px subtitles, source card highlights, fields and spacing. Plus Jakarta Sans and JetBrains Mono remain local. |
| Dashboard | Full-size ring geometry, 14px bar labels, notice icon tile, grouped system icons, and disclaimer aligned beneath the bar stack. The detached launch retains its requested pin-until-home behavior, including enlarged desktop coordinates. |
| Arena | Source stage/control proportions and permission panel, compact selector alternative, clearer typography and inline secondary readouts. Permission remains a deliberate Enable camera action; preparing a source leaves the timer idle. |
| Journey | Fixed 340px destination column with a 120px ring, compact truthful volume/session totals, 21:9 desktop terrain, source image color treatment, and larger badge descriptions. Conversion explanation moves into the map caption. The destination percentage is rounded for legibility; the route progress and distance retain their actual values. |
| Analytics | Chart axes show actual reporting dates and numeric units, with readable tick labels; retention uses an orange area fade and volume uses blue bars. The contextual disclaimer, real totals, symmetry ring, table and exports remain. |
| Logs | Search/date filters sit inside the table card; fixed 380px detail column at desktop; selected session uses six metric tiles, status/date hierarchy, issue section and saved skeletal replay. Narrow layouts stack the panels. |
| Settings | Full-width stacked configuration cards, vertical gravity options, source-style switch, separate recalibration inset and real cache/queue/sync tiles. |
| Profile | Personal details and Earth baselines occupy the left column; health metrics form the tall right column. Source icon tiles, portrait placeholder, field grouping and calculated BMI treatment use existing profile controls. |
| Onboarding | Centered 1152px layout with 320px left rail, glass form, three step segments, BMI row, paired pressure fields and primary next action. The reference Earth backdrop and Orbitron faces are local. Existing accessible input names, wizard controls and routine confirmation remain. |

## Deliberate differences from the static mockup

Existing headings, button names, identifiers, explicit roles, media elements, outputs and accessible control names remain the integration contract. The additional onboarding/profile/research destinations and simulator, ARED-load, cue and replay controls stay available. This makes some cards taller than the purely illustrative reference. Profile photo upload and historical weight tracking are not implemented by this visual revision.

Data comes from existing headless hooks. There are no copied fictional 47.3km/100km routes, 250t goals, physiological readiness/sleep scores, clinical floors, regional load distributions, ETA, communication countdowns or 8GB station quota. Mission settings retain their real behavior and scientific disclaimers. The cache tiles show measured serialized JSON sizes. The six catalog-backed badge SVGs remain replaceable.

At tablet and phone sizes the working app retains native responsive reflow and accessible target sizes. It does not shrink a 1440px desktop artboard onto a tablet or uniformly scale a 390px mobile artboard. Desktop enlargement starts above the reference width. Browser zoom continues to reduce the effective viewport and trigger reflow.

## Verification

The agreed browser DOM seam covers the added wide-desktop test. It first failed against the previous narrow sidebar, then passed with presentation scaling and corrected dock coordinates. The final browser check also caught a glass positioning rule displacing the Arena timer; a phone/desktop regression test failed before the lower-specificity glass rule restored its intended position. The existing print contrast check now samples the actual date-axis caption instead of the removed EARLIER placeholder; its contrast requirement is unchanged. The production real-model test also runs at 1920px and checks exact video/overlay bounds.

Final checks: 80 unit/Chromium tests, 44 E2E tests, strict typecheck, architecture lint, production build and 5 production-bundle tests. E2E includes online/offline stage rehearsals, camera denial and preview cleanup, keyboard navigation, route switching, history replay, report export, printing and phone/tablet reflow. Desktop visual comparison uses the locally rendered supplied export; reference and working-app captures are retained outside the repository.
