# AGENTS.md — Project A.R.E.S. (Astronaut Resistance & Exercise System)

> **Read First:** This file is the master traffic controller for all AI coding agents (Antigravity, Claude Opus 5.5, ChatGPT / GPT Sol, Codex, Cursor) working on **Project A.R.E.S.** for the **NASA Space Apps Challenge (Nov 14–15 Sprint)**. Keep this file concise and follow its routing and hard gates strictly.

---

## 1. Project Snapshot, Team Split & Commands

- **Project:** **PROJECT A.R.E.S. (Astronaut Resistance & Exercise System)** — An offline-first, AI-driven fitness coach, gamified planetary progression engine, and medical telemetry system designed to mitigate musculoskeletal degradation and psychological burnout during long-duration spaceflight (e.g., 3-year Mars transit with 24-minute one-way comms blackouts).
- **6-Person Hackathon Team Split (CRITICAL SCOPE RULE):**
  - **2 Documentation Members:** Pitch deck, NASA Human Research Program (HRP) alignment, demo script, and submission narrative (`docs/PROPOSAL.md`).
  - **2 Frontend & Wireframe Members:** Designing and building the final Vite + React dark-mode UI, neon progression rings, Valles Marineris / Olympus Mons visual map, and telemetry charts.
  - **2 Development Members (Lead Dev #1 + Dev #2, with ChatGPT handling heavy coding):** Building the **100% tested Pure Domain Core (`src/core/`)**, **MediaPipe Pose & Offline/Supabase Sync Adapters (`src/adapters/`)**, **Headless React Hooks (`src/hooks/`)**, and a **minimal unstyled semantic HTML testbench** so the Frontend team can drop their UI straight on top with zero merge conflicts.
- **Tech Stack:** React + TypeScript (Vite), Google MediaPipe Pose Landmarker (`@mediapipe/tasks-vision`, 33-point 3D skeletal landmarks at 30+ FPS in-browser), Pure TypeScript Kinematic & Telemetry Core (`src/core/`), Static Mission & Exercise Catalog (`src/content/missionCatalog.json`), Offline-First Persistence (`localStorage` / `IndexedDB` + Comms-Window Batch Sync Queue with optional Supabase adapter), Vitest (unit/integration), Playwright (E2E).
- **Commands:**
  - **Unit / Integration Tests (Fast Seam Loop):** `npm run test` (or `npx vitest run <path>`)
  - **E2E Browser Tests:** `npm run test:e2e` (or `npx playwright test`)
  - **Typecheck & Lint:** `npm run typecheck && npm run lint`
  - **Dev Server:** `npm run dev`

---

## 2. Progressive Context Routing (Where to Look Before Acting)

Never guess domain math, exercise thresholds, or module boundaries. Read only what you need for your current phase:

| When You Need To... | Read This File First | Invoke Skill |
| :--- | :--- | :--- |
| Understand A.R.E.S. domain terms, 33-point pose math, & **confirmed test seams** | `CONTEXT.md` | — |
| Check project phase, active milestone, or resolved **Fog** items (`F1–F5`) | `ROADMAP.md` | `.agents/skills/wayfinder/SKILL.md` |
| Write or update a feature specification (`specs/NNN-<slug>/spec.md`) | `specs/TEMPLATE-spec.md` | `.agents/skills/superpowers-sdd/SKILL.md` |
| Break an approved spec into vertical TDD slices (`specs/NNN-<slug>/tasks.md`) | `specs/TEMPLATE-tasks.md` | `.agents/skills/superpowers-sdd/SKILL.md` |
| Write failing tests & minimal implementation code (Red -> Green) | `docs/CODING_STANDARDS.md` | `.agents/skills/tdd/SKILL.md` + `.agents/skills/ponytail/SKILL.md` |
| Coordinate parallel tasks across the 2 Developers, 2 Frontend, & 2 Docs members | `docs/TEAMMATE_ONBOARDING.md` | — |
| Verify browser flows & deterministic 33-point pose simulation | `CONTEXT.md` (Seam 6) | `.agents/skills/e2e-testing/SKILL.md` |
| Audit completed work against the Spec and Coding Standards | `specs/NNN-<slug>/spec.md` | `.agents/skills/code-review/SKILL.md` |
| Debug a failing test, MediaPipe loop issue, or regression | `CONTEXT.md` | `.agents/skills/diagnosing-bugs/SKILL.md` |

---

## 3. Mandatory Engineering Hard Gates (SDD + TDD + Ponytail)

### Gate 0: Official Hackathon Coding Start Time (`Nov 14, 09:00 AM`)
- **ZERO CODE BEFORE 09:00 AM:** To strictly comply with NASA Space Apps Challenge rules and avoid disqualification, **do NOT scaffold `package.json`, install dependencies, initialize `.git` commits, or write any code under `src/` or `tests/` before Nov 14 at 09:00 AM local time**. Only pre-hackathon ideation, team role alignment, and architecture notes are permitted prior to 09:00 AM.

### Gate 1: Clear the Fog Before Writing Specs (`wayfinder` + `grilling`)
- Check `ROADMAP.md` for the active milestone. (`F1–F5` are confirmed and locked in `CONTEXT.md` Section 4.)

### Gate 2: No Production Code Without an Approved Spec & Task List (`superpowers-sdd`)
- Never write or modify application code under `src/` unless an approved `specs/NNN-<feature>/spec.md` and `specs/NNN-<feature>/tasks.md` exist for the active milestone (`M0–M4` specs and tasks are pre-authored and approved under `specs/000..004/`).
- Every `spec.md` must explicitly name the **Public Test Seams** from `CONTEXT.md` and pass the **Ponytail Check** (no unnecessary abstractions or packages).

### Gate 3: Vertical-Slice TDD at Confirmed Seams Only (`tdd`)
- Work **one vertical slice `[ ]` at a time** from `specs/NNN-<feature>/tasks.md`.
- **RED:** Write ONE failing test against a confirmed public seam in `CONTEXT.md`. Run `npx vitest run` and witness it fail for the expected reason.
- **GREEN:** Write the minimum code required to pass the test, strictly following the **Ponytail 7-Rung Ladder of Laziness** (reuse existing code, prefer static JSON over branching logic, prefer pure functions over classes).
- **VERIFY:** Run tests + `npm run typecheck`. Mark `[x]` in `tasks.md` only after reading clean terminal output.

### Gate 4: Project A.R.E.S. Hackathon Non-Negotiables
1. **Headless Architecture & Wireframe-Only Testbench (Zero UI Collision):**
   - **Frontend & UI styling are owned by the 2 Frontend teammates.** Developers must expose all business logic through pure functions (`src/core/`), adapters (`src/adapters/`), and clean headless React hooks (`src/hooks/`).
   - Any developer testbench UI (`src/App.tsx` until Frontend merges) must use **plain semantic HTML only** (no decorative CSS frameworks, no complex layouts) so the Frontend team can bind their components directly to our hooks and types without merge conflicts.
2. **100% Offline-First Operation (Mars 24-Minute Comms Blackout Resilience):**
   - Pose estimation (`@mediapipe/tasks-vision`), rep counting, progression math, and session persistence (`localStorage` / `IndexedDB`) must work **100% offline with zero internet or backend dependency**.
   - Supabase integration is strictly an **optional batch-sync sink** triggered when a simulated or real high-bandwidth communication window opens (`WINDOW_OPEN`); missing Supabase credentials or offline Wi-Fi during the hackathon pitch must never throw errors or block a feature.
3. **Kinematic Snapshot Replay Over Heavy Video Blobs:**
   - Never record or store raw `.mp4`/`.webm` webcam video blobs in storage. Flagged improper reps are captured as lightweight **33-point `KinematicSnapshot` JSON bursts** (~1.5 KB) and replayed on a 2D `<canvas>` skeletal viewer.
4. **Live-Demo Fallbacks & Pre-Seeded 30-Day Telemetry:**
   - Every camera workout flow must support both **Live Webcam MediaPipe Pose** and a **1-Click Simulated Pose / Manual Demo Trigger** (in case hackathon stage lighting or webcam positioning is constrained), plus a **1-Click Seed 30-Day Mars Mission History** action so progression charts and Valles Marineris milestones are populated immediately for judges.
