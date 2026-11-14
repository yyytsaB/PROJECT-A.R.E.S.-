# CODING_STANDARDS.md — Project A.R.E.S. Engineering, Offline-First & Headless UI Standards

> **Used by:** Developer #1 (Vision & Kinematics Lead), Developer #2 (Telemetry & Offline Sync Lead), and the Architecture & Verification Lead.

---

## 1. The Ponytail Rule (7-Rung Ladder of Laziness)

Before adding any file, class, hook, or npm dependency, verify you have stopped at the highest applicable rung:
1. **YAGNI:** If the active `spec.md` doesn't require it, don't write it.
2. **Reuse:** Use existing modules in `src/core/`, `src/adapters/`, and `src/hooks/`.
3. **Data over Code:** All 4 ARED exercises (`SQUAT`, `DEADLIFT`, `OVERHEAD_PRESS`, `BICEP_CURL`), joint triplets, angle thresholds, cardio equivalents, gravity profiles, and planetary expedition milestones belong in `src/content/missionCatalog.json`, NEVER hardcoded in `if/else` trees or React components.
4. **Web Platform First:** Use native `localStorage` / `IndexedDB`, `<canvas>`, `requestAnimationFrame`, `fetch`, and native `Blob` download for Flight Surgeon JSON/CSV exports.
5. **Zero Unapproved Dependencies:** Do not add Redux, Zustand, Axios, Moment/Dayjs, or heavy UI component libraries. Only Vite, React, TypeScript, `@mediapipe/tasks-vision`, optional `@supabase/supabase-js` (or native `fetch` to Supabase REST), Vitest, and Playwright are permitted.
6. **Pure Functions Over Classes:** Domain logic in `src/core/` must be stateless, pure exported functions (`<= 250` lines per file).
7. **Minimal Green Code:** Write only what is required to pass the current vertical-slice test.

---

## 2. Architecture & Performance Boundaries

### A. Pure Core vs. Browser Side-Effects
- **`src/core/**` must have ZERO imports from `react`, `react-dom`, `@mediapipe/tasks-vision`, `@supabase/supabase-js`, `window`, `document`, or `localStorage`.**
- Pass timestamps (`timestampMs: number` or `nowIso: string`), storage adapters, and configuration in as arguments so every function in `src/core/` is 100% deterministic in unit tests.

### B. 30+ FPS MediaPipe Pose & `<canvas>` Render Loop
- **Lazy-load MediaPipe:** Load `@mediapipe/tasks-vision` (`PoseLandmarker`) dynamically only when the Workout Arena camera is started, never blocking initial page load.
- **No `setState` in the Render Loop:** Draw the 33-point skeletal wireframe, joint-angle arcs, and ROM gauge directly onto an `<HTMLCanvasElement>` via `requestAnimationFrame`. Only update React state when `RepPhase` transitions (`IDLE -> ECCENTRIC -> INFLECTION -> CONCENTRIC -> COMPLETED`), when a new rep completes, or when a `FormFaultFlag` changes.
- **Deterministic Pose Simulation Fallback:** Every camera view must accept injected `RawPoseFrame` sequences (`window.__ARES_TEST_POSE_FRAMES__` or 1-click Demo Simulator buttons: `"Simulate Good Rep"`, `"Simulate Shallow Rep"`, `"Simulate Spine Misaligned Rep"`) so live hackathon demos and Playwright tests never fail if lighting or webcam framing is difficult on stage.

### C. 100% Offline-First & 24-Minute Mars Comms Blackout Resilience
- **Local Store is Primary:** Every completed workout session and `KinematicSnapshot` saves immediately to local storage (`localStorage` / `IndexedDB` via `Seam 5`).
- **Batch-Sync Queue (`CommsLinkStatus`):**
  - In `BLACKOUT_24MIN_DELAY` mode (default deep-space transit state), completed sessions are queued in `syncQueue[]` as compressed summary envelopes.
  - When switched to `WINDOW_OPEN`, the adapter flushes `syncQueue[]` to Supabase (if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured) or marks them synced in the local Mission Control telemetry log—never throwing an unhandled network error if offline.
- **Lightweight Kinematic Snapshots (`<= 2 KB`):** Never store `.mp4` or `.webm` video blobs. Flagged improper reps save only the 33-point landmark frame (`KinematicSnapshot`) at inflection for 2D `<canvas>` wireframe replay.

---

## 3. Headless Hook Boundary for the 2 Frontend Teammates (Zero Merge Conflicts)

1. **Strict Separation of Logic and UI:**
   - The 2 developers own `src/core/**`, `src/adapters/**`, and `src/hooks/**`.
   - The 2 Frontend teammates own the visual presentation, CSS/dark-mode styling, charts, and layout components.
2. **Developer Testbench (`src/App.tsx`):**
   - Until the Frontend teammates merge their UI screens, `src/App.tsx` must remain a **plain semantic HTML wireframe testbench** (`<section>`, `<button>`, `<select>`, `<canvas>`, `<output>`, `<table>`) with `data-testid` / accessible `aria-label` attributes verifying all 6 screens from PDF 2.
   - Do not add decorative CSS frameworks or layout bloat in developer branches.
