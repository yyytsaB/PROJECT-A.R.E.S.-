# Implementation Tasks (Vertical TDD Slices): M0 — Project Skeleton & Mission Catalog

- **Spec Reference:** `./spec.md`
- **Owner:** Developer #1 + ChatGPT Heavy Coder

---

## Vertical Slices

- [x] **Slice 1 (Tracer Bullet): Scaffold Vite + React + TS + Vitest & Shared Contracts (`src/core/types.ts`)**
  - **Target Seam:** `Seam 3 — loadMissionCatalog & validateMissionCatalogSchema`
  - **Red Test Assertion:** `src/core/catalog/missionCatalog.test.ts` asserts `loadMissionCatalog()` returns a valid catalog with `schemaVersion: 1`, 4 resistance exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), and 2 planetary routes (`VALLES_MARINERIS` `4000 km`, `OLYMPUS_MONS` `600 km`).
  - **Files Touched:** `package.json`, `tsconfig.json`, `vite.config.ts`, `src/core/types.ts`, `src/content/missionCatalog.json`, `src/core/catalog/missionCatalog.ts`, `src/core/catalog/missionCatalog.test.ts`
  - **Verify Command:** `npx vitest run src/core/catalog/missionCatalog.test.ts`

- [x] **Slice 2: Lookup Helpers (`getExerciseById`, `getPlanetaryRouteById`, `getGravityProfileById`) & Schema Guard Diagnostics**
  - **Target Seam:** `Seam 3 — validateMissionCatalogSchema & lookup functions`
  - **Red Test Assertion:** Rejects invalid landmark indices (`< 0` or `> 32`), degenerate angle bounds (`startAngleDeg === targetAngleDeg`), and non-monotonic route milestone distances with descriptive error strings.
  - **Files Touched:** `src/core/catalog/missionCatalog.ts`, `src/core/catalog/missionCatalog.test.ts`
  - **Verify Command:** `npx vitest run src/core/catalog/missionCatalog.test.ts`

- [x] **Slice 3: Plain Semantic HTML Wireframe Harness (`src/App.tsx`)**
  - **Target Seam:** `Seam 3` rendered in headless semantic testbench
  - **Red Test Assertion:** Component/DOM test verifies `src/App.tsx` renders the Project A.R.E.S. Command Center header, lists the 4 ARED exercises and 2 planetary routes from `loadMissionCatalog()`, and has zero decorative CSS bloat.
  - **Files Touched:** `index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`
  - **Verify Command:** `npx vitest run && npm run typecheck`

---

## Milestone Completion Checklist

- [x] All vertical slices above are marked `[x]` with passing tests.
- [x] `npm run typecheck` passes with zero errors.
- [x] `ROADMAP.md` updated to mark `M0` complete (`[x]`), unlocking parallel work for Developer #2 on `M3`/`M4`.

Verification evidence: `docs/M0-M1-VERIFICATION.md` (November 14, 2026).
