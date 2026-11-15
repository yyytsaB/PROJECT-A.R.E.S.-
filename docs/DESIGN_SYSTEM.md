# Mission interface design

The team's Figma mission mockup is the visual reference. Existing hooks and catalog data remain authoritative for working behavior and scores.

## Visual contracts

| Primitive | Use |
|---|---|
| Canvas `#091d3a` → `#313946` | Fixed navy/slate ambient background with the exported transparent light overlay |
| Plus Jakarta Sans, 400–800 | Local body and heading font; 14px body and 36px/800 desktop page titles |
| Conthrax SemiBold | Local mission figures, progress ring and display accents |
| JetBrains Mono, 500–700 | Local telemetry/time and supporting numeric labels |
| Amber `#f6a623`, blue `#6ea8ff`, green `#3ddc97` | Primary actions, navigation and telemetry accents |
| White / muted `#c7d0e0` | Primary and supporting text |
| White alpha `.10` → `.035` → `.02`, 140-degree gradient | Transparent glass fill; no opaque panel color |
| 16px backdrop blur, white 20% border | Glass separation with inset highlights and soft drop shadow |
| 24px / 16px / 12px radius | Major cards, nested surfaces and controls |
| 264px / 72px / 40px / 24px | Desktop sidebar width, topbar height, main padding and card gap |
| 44px | Minimum primary control height; checkbox labels provide a larger target |

`src/styles/mission.css` retains the base and print layers; `src/styles/figma.css` supplies the reference typography, component surfaces, layouts and responsive overrides. Reduced motion disables transitions. Focus remains visible. Unsupported backdrop blur has an opaque fallback.

## Screens and navigation

Dashboard, Arena, Journey, Analytics, Logs, Settings, Profile, Onboarding and Sources each have their own `#/…` URL. Only the active screen is displayed. Headless hooks remain mounted so navigation preserves active workouts and mission state. Legacy heading hashes still open the corresponding screen.

The desktop shell uses a glass sidebar, topbar search, real queue/status indicators, notifications and crew profile. Below 1024px, navigation uses a native drawer with cyclic keyboard focus and Escape dismissal. Mobile layouts stack cards and retain local table scrolling. The three-step onboarding flow has its own branded rail and form layout.

Dashboard uses paired hero cards above status indicators, then the schedule and Ready card, with a separate strong glass launch panel beneath Ready. The panel stays at the viewport lower right until that reserved position is reached, then scrolls away. Arena puts the stage and session controls on the left and exercise/feedback cards on the right. Journey places route statistics above the map. Analytics pairs volume and symmetry below retention. Logs pairs the table with its selected detail panel. Settings and Profile have distinct card layouts.

## Integrity and accessibility

Actual local state drives every indicator. Synthetic history and prototype scores remain identified. Preserve existing labels, IDs, media, outputs, dialogs and accessible control names. Business calculations belong in the existing core and hooks; chrome contains presentation and interaction state only.

All assets and fonts are local and replaceable. Routes remain schematic game expeditions. Keep the team-defined goal and heuristic-score disclaimers, accessible reports and print readability. No clinical claims, new physiological model, remote font dependency or new UI package is part of this visual integration.

Dashboard reference measurements: panel headings 18px/700/28px; schedule titles 15px/600; times 14px/600 JetBrains Mono; launch title 18px/700/28px Conthrax with 0.14em tracking. Ready has three 166px-tall translucent tiles. Missing readiness/sleep data is displayed as unavailable; profile heart rate is explicitly identified as saved context. The local weekly template is illustrative. Semantic control names and the actual catalog/prescriptions remain stable.

`src/styles/reference-pages.css` applies the subsequent Arena, Journey and medical hierarchy corrections. Camera preparation is separate from a running workout; unavailable pre-rep accuracy remains explicit. Journey uses three route/contribution bars, a blue destination ring, selectable schematic waypoints and individual replaceable badge SVGs. Native SVG icons and the hexagonal badge silhouette were observed in the team reference.
