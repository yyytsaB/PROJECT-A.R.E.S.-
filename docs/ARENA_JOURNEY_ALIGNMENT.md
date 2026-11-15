# Arena, Journey and medical reference alignment

The supplied screenshots and the rendered team Figma Make preview are the visual references. The uploaded `.fig` archive includes a canvas binary, a thumbnail and two raster assets; its thumbnail shows onboarding and it does not supply the Make app's React/TypeScript source. The archive was left unchanged. Arena, Journey and Analytics were inspected in the running Make preview before implementation.

## Arena

The first view now presents the reference's centered camera icon, **Allow camera access** heading, processing explanation and **Enable camera / Use simulation feed** actions. There is no automatic browser permission request. Enabling a feed prepares it in `READY`; it does not start the workout timer. The existing **Start webcam** and **Start simulator** actions still support direct launch and now reuse a matching prepared feed. A simulated rep remains a one-click launch path.

Permission denial and missing camera/model resources produce the existing recoverable alert in the camera panel. An unanswered request can be replaced by simulation. Preparing another feed aborts the previous attempt; the adapter closes a late-arriving stream. Leaving Arena closes an unstarted preview or pending preparation without saving a workout. Running and paused workouts retain their existing page-switch behavior. Exercise changes preserve a ready camera preview and reset the exercise state; load remains configurable before starting.

The measured reference uses a 360px desktop control column, 16px stage padding, 20px side-card padding, 24px spacing, a 20px permission heading, 14px permission copy/actions, and four exercise choices in a two-column segmented surface. Those are reflected in the local interface. The existing native Exercise selector remains a compact alternative in the card header, and the real ARED load control remains available.

Form feedback now has a prominent state banner, three score tiles, secondary session/phase/ROM readings, and a correction-alert section. Accuracy is unavailable before a completed rep rather than the reference's initial fictional 100%. All existing media refs, outputs, control names, simulation, voice and replay behavior remain. The idle permission surface hides stale skeletal frames, while active video and canvas retain matching 4:3 bounds.

## Expedition Journey

The page follows the reference's mission-day header, wide progress card, blue destination ring, full-width terrain illustration, selectable waypoint detail card and separate Crew Milestone Badges panel. Progress labels and numeric values have distinct weight, type and color. The reference's real source texture and native icon geometry remain local. The six primary navigation symbols also use the observed native SVG shapes rather than the previous approximations.

The working catalog is authoritative: Valles Marineris is a 4,000 km game route and Olympus Mons is a 600 km game route, each with three milestone goals. The interface shows actual distance, ARED-equivalent distance, cardio contribution, tonnage, session count and remaining distance. It does not copy the Make preview's fictional 100 km route, 250 t target, 50-session target or ETA. The three bars use the same real route distance as their denominator. Leg numbers follow the actual unlocked milestones.

Waypoint buttons expose the catalog's names, distances and locked/unlocked state. Selecting a locked waypoint shows its goal without changing expedition progress or unlocking its badge. Route changes reset the detail selection and work after disconnecting. Marker positions and line geometry are schematic presentation, not geographical coordinates or a measured terrain traverse.

Six independent badge SVG placeholders use the reference's hexagonal silhouette and native footprint/mountain/target motifs. Replace them at `public/assets/badges/` using the mapping in `src/content/journeyPresentation.json`. Keep their 64×64 viewBox and local paths. Existing badge descriptions, unlock rules, counts and View all badges behavior remain authoritative. All six SVGs preload locally for offline switching.

## Medical information hierarchy

The third supplied screenshot's ungrouped notes and metrics are now organized into a visible prototype-context callout, date/filter toolbar, volume and symmetry summaries, chart headings with current values, and a separate correction-count panel. Original disclaimers, 7/14/30-day choices, accessible table, outputs and JSON/CSV/print actions remain. No clinical floor, muscle/bone measurement, invented joint distribution or extra physiological score was imported from the preview.

## Verification

New public browser tests cover permission-panel entry, denial fallback, feed preparation before timer start, exercise tile/native-selector synchronization, ready-preview reuse and release, unanswered permissions, catalog waypoint selection, offline route changes and replaceable badge loading. The relevant assertions failed before their implementations.

The full verification set is `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`, plus `npm run test:production`. The production test now exercises the prepare/start camera flow with a fake camera and checks matching video/canvas bounds. Real device framing and lighting still require stage rehearsal. A loaded app works offline; an uncached offline startup is not guaranteed.

Animations, 3D effects and smooth-scrolling changes are outside this revision. Existing reduced-motion and visible keyboard-focus behavior remain.
