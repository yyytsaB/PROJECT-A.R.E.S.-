# Replaceable mission artwork

These small original SVG placeholders belong to the prototype. They are not official agency marks or scientific terrain products.

- `ares-mark.svg`: project emblem, also used as the favicon.
- `valles-marineris-route.svg`: schematic game expedition illustration.
- `olympus-mons-route.svg`: schematic game expedition illustration.
- `mission-badge.svg`: shared milestone illustration; unlocked/locked styling is applied by the UI.

Teammate artwork can replace these files at the same paths. Keep each SVG's viewBox, local references and descriptive image alt text in the screen components. Keep the route captions identifying schematic, non-terrain-derived artwork. If filenames change, update the asset mapping in `src/components/MissionVisuals.tsx` and the favicon/badge preload in `index.html`.

Both route images load at startup so switching routes on an already loaded mission works after disconnecting. No image service, remote font, or additional dependency is required.
