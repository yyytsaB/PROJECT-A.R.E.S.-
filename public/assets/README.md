# Replaceable mission artwork

These local assets belong to the prototype interface. They are not official agency marks or scientific terrain products.

- `ares-mark.svg`: team mockup logo, embedded as a self-contained SVG image and also used as the favicon.
- `mars-surface.jpg`: decorative red-rock texture exported from the team's Figma preview; not imported Mars terrain or a scientifically accurate map.
- `valles-marineris-route.svg`: schematic game expedition illustration.
- `olympus-mons-route.svg`: schematic game expedition illustration.
- `mission-badge.svg`: shared milestone illustration; unlocked/locked styling is applied by the UI.

Teammate artwork can replace these files at the same paths. Keep each SVG's viewBox, local references and descriptive image alt text in the screen components. Keep the route captions identifying schematic, non-terrain-derived artwork. If filenames change, update the asset mapping in `src/components/MissionVisuals.tsx` and the favicon/badge preload in `index.html`.

Both route images load at startup so switching routes on an already loaded mission works after disconnecting. No image service, remote font, or additional dependency is required.

The logo and texture were exported from the [team's mission mockup](https://www.figma.com/make/Ztf5NQe7wMI5HFzqa6cWUO/Design-NASA-Fitness-Mission-App). The texture was identified there as Unsplash image `photo-1650208312823-4a676f114aff`. Original route geometry and milestone distances remain schematic catalog data. System fonts are retained; no externally licensed mockup font is bundled.
