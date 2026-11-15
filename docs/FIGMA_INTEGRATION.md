# Mission mockup integration — 15 November 2026

The team's Figma mission design is integrated into the existing working application. Navy surfaces, amber navigation/actions and retention ring, the team logo, local red-rock texture, mission progress, status indicators, schedule cards and coaching stage now share one visual system. Analytics, history, onboarding and settings use the same type, form, table and surface styles.

## Preserved behavior

- Existing section navigation remains a single-page interface. A sticky section picker provides access on phones without a modal drawer; starting today's workout also navigates to the Arena.
- Existing accessible labels, IDs, roles, output/canvas/video/dialog elements and button/heading text remain present. A source comparison against the previous App found all 178 extracted protected contracts retained. This is a source preservation check, not a claim of full accessibility conformance.
- Domain logic stays in the core and headless hooks. Dashboard mission progress uses the saved duration and local history; progress display is capped at 100%.
- Simulator controls, local camera assets, timer, voice option, saved replay, two catalog routes, badge descriptions, 7/14/30-day windows, exports, comms toggle and clear-data confirmation remain available.
- Prototype disclaimers and NASA Data Sources remain intact. The interface does not import the mockup's clinical floors, diagnostic BMI categories, invented sleep/readiness metrics or encrypted-downlink promise.
- All artwork is local. The decorative texture is not Mars terrain data. System fonts avoid remote font dependencies.

## Verification

| Check | Result |
|---|---|
| Unit and Chromium browser tests | 80 passed across 13 files |
| Strict TypeScript | Passed |
| Architecture lint | Passed |
| Production build | Passed |
| Full Playwright E2E suite | 25 passed, including the existing online/offline stage rehearsals |
| Production bundle browser tests | 5 passed, including local model initialization and blocked camera/model/WASM fallbacks |
| Responsive regression | 320/375/768/1280/1440px; document scroll width does not exceed client width |
| New behavioral regressions | Launch navigates to Arena; saved mission duration drives progress; empty filters hide unrelated details/replay |

The new progress and launch behavior were verified with failing assertions before their implementation. Existing E2E tests were retained without weakening their assertions. The production tests use Chromium's fake camera; real-device lighting, camera framing and installed voice availability still need the team's stage rehearsal.

See `DESIGN_SYSTEM.md` for visual contracts and `public/assets/README.md` for asset provenance and replacement instructions. Vercel publishes the main branch to the existing production URL; verify the published deployment after merging.
