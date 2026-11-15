# Replaceable mission artwork

These local assets belong to the prototype interface. They are not official agency marks or scientific terrain products.

- `ares-mark.svg`: team mockup logo, embedded as a self-contained SVG image in the app chrome.
- `favicon-32.png`, `favicon-192.png`, `/favicon.ico` and `/apple-touch-icon.png`: browser and home-screen icons, resized from the team's square ARES logo.
- `mission-ambient.png`: transparent light overlay exported from the team mockup; used behind the glass cards.
- `fonts/plus-jakarta-sans-latin.woff2`: Plus Jakarta Sans Latin variable font from the Google Fonts stylesheet used by the mockup.
- `fonts/jetbrains-mono-latin.woff2`: JetBrains Mono Latin variable font from that stylesheet.
- `fonts/conthrax-semibold.otf`: Conthrax SemiBold exported from the mockup's observed font assets.
- `mars-surface.jpg`: decorative red-rock texture exported from the team's Figma preview; not imported Mars terrain or a scientifically accurate map.
- `valles-marineris-route.svg`: schematic game expedition illustration.
- `olympus-mons-route.svg`: schematic game expedition illustration.
- `mission-badge.svg`: shared milestone illustration; unlocked/locked styling is applied by the UI.

Teammate artwork can replace these files at the same paths. Keep each SVG's viewBox, local references and descriptive image alt text in the screen components. Keep the route captions identifying schematic, non-terrain-derived artwork. If filenames change, update the asset mapping in `src/components/MissionVisuals.tsx` and the favicon links and badge preloads in `index.html`.

Both route images load at startup so switching routes on an already loaded mission works after disconnecting. No image service, remote font, or additional dependency is required.

The logo and texture were exported from the [team's mission mockup](https://www.figma.com/make/Ztf5NQe7wMI5HFzqa6cWUO/Design-NASA-Fitness-Mission-App). The texture was identified there as Unsplash image `photo-1650208312823-4a676f114aff`. Original route geometry and milestone distances remain schematic catalog data. The reference fonts are bundled locally and preloaded in `index.html`; no font CDN is contacted at runtime. Preserve font provenance when replacing these files.

`icons/{sparkles,calendar-days,dumbbell,footprints,bike,info}.svg` preserve the native SVG paths observed in the team's Dashboard preview, with local blue/amber/muted strokes. The launch chevron uses the same observed SVG path inline. These assets support the reference schedule; the additional Rowing catalog entry uses a neutral initial rather than invented reference artwork.

`badges/{first-traverse,canyon-midpoint,canyon-complete,base-camp,upper-slope,caldera}.svg` are independent replaceable placeholders using the reference's orange hexagonal silhouette and native footprint/mountain/target icon paths. Keep their 64×64 viewBox, or update `src/content/journeyPresentation.json` when replacing paths. All six preload locally for offline use. Unlock rules and descriptions come from the mission catalog, not artwork.

`icons/{camera,scan-line,timer,shield-check,map-pin,trophy,award}.svg` preserve native icon geometry observed in the Arena/Journey preview. The two route SVG files now supply a minimal dotted schematic line, with catalog-backed interactive HTML waypoint markers above it. The terrain texture is decorative source artwork, not a Mars terrain dataset; neither route map is to scale.


The supplied React mockup export is the source of the logo image crop and the onboarding Earth photo URL. `onboarding-earth.jpg` is a local copy of its decorative Unsplash image (`photo-1451187580459-43490279c0fa`), not a scientific visualization or mission record. Orbitron SemiBold/Bold are local Google Fonts files, used only in onboarding to match the export; their OFL license is retained at `fonts/orbitron-OFL.txt`. Runtime font and image loading requires no third-party connection.
