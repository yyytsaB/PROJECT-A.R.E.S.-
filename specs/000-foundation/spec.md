# Feature Spec: M0 — Project Skeleton, Shared Types & Mission Catalog (`Seam 3`)

- **Status:** `APPROVED` (Nov 14, 2026)
- **Milestone Reference:** `ROADMAP.md` -> `M0`
- **Owner:** Developer #1 (You + ChatGPT Heavy Coder)
- **Resolved Fog Items:** `F1`, `F4`, `F5`

---

## 1. Problem Statement & Crew Outcome
Before Developer #1 (Vision & Kinematics), Developer #2 (Telemetry & Offline Sync), and the 2 Frontend teammates can work in parallel without merge conflicts, Project A.R.E.S. needs:
1. A clean Vite + React + TypeScript + Vitest + Playwright scaffold (`ponytail`-compliant, zero UI bloat).
2. A single shared contract file (`src/core/types.ts`) defining all domain types across the 6 seams.
3. A validated, declarative Mission & Exercise Catalog (`src/content/missionCatalog.json` + `Seam 3: ExerciseAndMissionCatalog`) defining the **4 ARED resistance exercises** (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), **3 cardio modalities** (`TREADMILL`, `CYCLE_ERGOMETER`, `ROWING`), **3 gravity profiles** (`MICROGRAVITY_0G`, `MOON_016G`, `MARS_038G`), and **2 planetary routes** (`VALLES_MARINERIS`, `OLYMPUS_MONS`).

## 2. Scope (Goals vs. Out of Scope)
- **In Scope (Goals):**
  - Lean `package.json`, `tsconfig.json`, `vite.config.ts`, and `vitest` configuration.
  - `src/core/types.ts` with complete TypeScript interfaces for Seams 1–6.
  - `src/content/missionCatalog.json` containing biomechanical angle thresholds and planetary expedition waypoints.
  - `src/core/catalog/missionCatalog.ts` + `.test.ts` implementing `Seam 3`.
  - Minimal plain semantic HTML testbench (`src/App.tsx`) rendering the catalog summary (`Wireframe Override` — no decorative CSS).
- **Out of Scope (Non-Goals):**
  - Decorative UI styling (owned by the 2 Frontend teammates).
  - Live webcam or kinematic math (deferred to `M1` & `M2`).

## 3. Ponytail Check (7-Rung Ladder of Laziness)
- **What existing modules / JSON data / native browser APIs are we reusing?**
  - Static JSON (`src/content/missionCatalog.json`) replaces hardcoded per-exercise classes or `switch` trees.
- **What unnecessary abstractions, classes, or third-party packages did we explicitly reject?**
  - Rejected schema libraries (Zod/Yup/Ajv) in favor of a concise 60-line pure TypeScript validator (`validateMissionCatalogSchema`). Rejected Redux/Zustand/Tailwind in the dev branch.

## 4. Confirmed Public Test Seams (`Seam 3: ExerciseAndMissionCatalog`)
```ts
// src/core/catalog/missionCatalog.ts
export function loadMissionCatalog(): MissionCatalog;
export function getExerciseById(id: ExerciseId): ExerciseDefinition;
export function getPlanetaryRouteById(id: PlanetaryRouteId): PlanetaryRoute;
export function getGravityProfileById(id: GravityProfileId): GravityProfile;
export function validateMissionCatalogSchema(rawJson: unknown): ValidationResult;
```

### Biomechanical Exercise Parameters in `src/content/missionCatalog.json`
| `id` | Joint Triplets (Left / Right MediaPipe Indices) | `startAngleDeg` (Extended) | `targetAngleDeg` (Inflection) | `hysteresisDeg` | `maxTrunkLeanDeg` | `symmetryToleranceDeg` | `defaultLoadKg` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`SQUAT`** | Hip–Knee–Ankle (`[23,25,27]` / `[24,26,28]`) | `170°` | `95°` | `10°` | `35°` | `12°` | `80 kg` |
| **`DEADLIFT`** | Shoulder–Hip–Knee (`[11,23,25]` / `[12,24,26]`) | `170°` | `100°` | `10°` | `45°` | `12°` | `100 kg` |
| **`OVERHEAD_PRESS`** | Shoulder–Elbow–Wrist (`[11,13,15]` / `[12,14,16]`) | `75°` | `165°` | `10°` | `20°` | `15°` | `40 kg` |
| **`BICEP_CURL`** | Shoulder–Elbow–Wrist (`[11,13,15]` / `[12,14,16]`) | `160°` | `50°` | `10°` | `18°` | `15°` | `20 kg` |

## 5. Acceptance Scenarios (Given / When / Then)
1. **Scenario 1 (Valid Catalog Load):**
   - **Given** `src/content/missionCatalog.json`, **When** `loadMissionCatalog()` is called, **Then** it returns all 4 ARED exercises, 3 cardio modalities, 3 gravity profiles (`0g`, `0.16g`, `0.38g`), and both planetary routes (`VALLES_MARINERIS` at `4000 km`, `OLYMPUS_MONS` at `600 km`).
2. **Scenario 2 (Invalid Schema Rejection):**
   - **Given** a malformed JSON object with an out-of-range MediaPipe landmark index (`35` instead of `0..32`) or `startAngleDeg === targetAngleDeg`, **When** `validateMissionCatalogSchema()` runs, **Then** it returns `{ valid: false, errors: [...] }` naming the offending field.
