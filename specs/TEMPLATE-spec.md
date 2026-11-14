# Feature Spec: [Milestone ID — Feature Name]

- **Status:** `DRAFT` | `APPROVED` | `IMPLEMENTED`
- **Milestone Reference:** `ROADMAP.md` -> `[M0 / M1 / M2 / M3 / M4]`
- **Owner:** `[Dev #1 (You + ChatGPT) | Dev #2]`
- **Resolved Fog Items:** `[List F1, F2, etc. from ROADMAP.md]`

---

## 1. Problem Statement & Astronaut/Crew Outcome
Describe what operational capability this milestone unlocks for astronauts during deep-space comms blackouts and how it feeds the 6 modules in `docs/PROPOSAL.md`.

## 2. Scope (Goals vs. Out of Scope)
- **In Scope (Goals):**
  - ...
- **Out of Scope (Non-Goals — including decorative Frontend UI owned by the 2 UI teammates):**
  - ...

## 3. Ponytail Check (7-Rung Ladder of Laziness)
- **What existing modules / JSON data (`src/content/missionCatalog.json`) / native browser APIs are we reusing?**
  - ...
- **What unnecessary abstractions, classes, or third-party packages did we explicitly reject?**
  - ...

## 4. Confirmed Public Test Seams
Reference the exact seam(s) from `CONTEXT.md` that this feature exposes and tests:
- **Primary Seam(s):** `[e.g., Seam 1: KinematicMath, Seam 2: RepAndFormStateMachine]`
- **Public Signatures / Interfaces:**
```ts
// Exact exported function signatures or data contracts (no implementation details)
```

## 5. Acceptance Scenarios (Given / When / Then)
1. **Scenario 1 (Core Happy Path):**
   - **Given** ...
   - **When** ...
   - **Then** ...
2. **Scenario 2 (Biomechanical Fault / Comms Blackout Edge Case):**
   - **Given** ...
   - **When** ...
   - **Then** ...
3. **Scenario 3 (Deterministic Simulation / Offline Fallback):**
   - **Given** ...
   - **When** ...
   - **Then** ...

## 6. Testing & Verification Decisions
- **Unit / Integration Tests (`npx vitest run`):** Which pure behaviors and edge cases are tested at the seam?
- **E2E Browser Tests (`npx playwright test`):** Does this milestone add or update a critical journey in `Seam 6`?
