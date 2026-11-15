# Mission interface design

## Purpose and audience

Help crew operators review their prototype exercise program, record a locally coached session, and inspect progress on a laptop or tablet without an Earth connection. The visual reference is the team's Figma mission mockup; the existing application remains the source of truth for behavior and data.

## Principles

1. Actual local state drives every operational indicator. Synthetic history and prototype scores remain explicitly identified.
2. The next exercise action and retention ring carry primary emphasis. Navy surfaces and amber accents express the mission identity.
3. Reflow the interface at narrow widths; never scale a fixed desktop canvas. Preserve readable text and touch controls.
4. Preserve semantic names, labels, headings, outputs, media, dialogs, and existing hook boundaries.
5. Keep artwork local and replaceable. Route imagery is a game illustration, not imported terrain or navigation data.

Success means the operator can identify the active scenario and next workout, launch the simulator, save a session, inspect a flagged snapshot, and manage the queue without losing context.

## Token spine

The existing vanilla CSS stack is retained in `src/styles/mission.css`.

| Primitive | Semantic / component use |
|---|---|
| Navy 950 `#08142b`, navy 900 `#0c1b36`, navy 800 `#132748` | Canvas, sidebar, panel elevation |
| Amber `#ffb323` | Primary action, active navigation, retention ring |
| Blue `#82b7ff`, emerald `#70e3ba` | Secondary telemetry and positive form feedback |
| White `#f6f8fc`, muted `#b9c7db` | Primary and supporting text |
| 4 / 8 / 12 / 16 / 24 / 32px | Shared spacing scale |
| 8 / 12 / 20px | Controls, nested surfaces, major cards |
| 44px | Minimum control/touch target; checkboxes have a padded label target |
| 14 / 16 / 24 / 36px | Supporting, body, section, page typography |

Existing color aliases remain compatible with print styling. Focus uses a visible amber outline; numeric readouts use tabular figures. Transitions list specific properties and are disabled under reduced motion. Native dialog focus containment is retained.

## Surface contracts

- Dashboard: retention and mission progress, real status strip, personalized schedule, local cache/queue details.
- Arena: large skeletal stage, honest camera/simulator state, manual load, existing simulator and session controls.
- Journey: existing two routes, schematic local artwork, distances, next milestone, locked/earned badge descriptions.
- Medical and Logs: existing accessible tables and exports; local horizontal table scrolling; selected details clear with filters.
- Settings: discoverable health metrics, routine calibration, baselines, explicit comms controls and protected clearing.
- Onboarding: three-step flow with the existing field associations, live BMI and reviewed routine confirmation.

Clinical validation, new physiological models, cloud delivery promises, a new routing framework, and extra UI dependencies are outside this visual integration.
