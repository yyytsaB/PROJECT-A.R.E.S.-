# Live camera reliability and milestone celebration

Scope: presentation-ready live camera coaching (P0) and the earned-badge celebration (P1). Scoring thresholds, progression rules, sync behaviour and page layouts are unchanged.

## What changed and why

### Camera (P0)

| Problem found | Fix | Where |
| --- | --- | --- |
| Leaving the frame mid-rep, or pausing mid-rep and resuming standing, could complete a rep from stale landmarks; a person who left view left the machine stuck mid-rep. | Two rules. Frames showing no usable body for 500 ms or more abandon the rep in progress (`OCCLUSION_ABANDON_MS`, applied by the hook). A gap of more than 1.5 s with no frames at all (pause/resume, hidden tab, stalled device) does the same in the core (`MAX_OBSERVATION_GAP_MS`). Either way the next rep needs a fresh start position, and completed reps and snapshots are kept. A single dropped detection or a brief stall on a slower laptop does not cost a real rep. | `src/core/kinematics/repStateMachine.ts` (`abandonRepInProgress`), `src/hooks/useWorkoutArena.ts` |
| Every failure showed "Camera unavailable". | The adapter raises `CameraSetupError` with the most specific cause the platform exposes: permission denied, no camera, camera busy, insecure context, unsupported browser, model/WASM failure, or unknown. Each has an actionable message that keeps the simulation alternative. | `src/adapters/poseCameraAdapter.ts`, `src/hooks/useWorkoutArena.ts` |
| An unplugged camera or revoked permission froze tracking silently. | Track `ended` is reported once; the session moves to ERROR with an explanation, resources are released, and completed reps remain saveable once via End session. A hidden-tab return resumes a paused preview. | adapter + hook |
| Clicking Start webcam while the permission prompt was pending opened a second stream request. | A repeat prepare/start for the same feed reuses the pending request; Start then begins the workout as soon as the camera is ready. | `useWorkoutArena.ts` |
| Preparation showed one generic heading. | Real stages (permission → camera preview → pose model) with a hint after 8 s of an unanswered prompt; no invented percentages. | hook + `src/App.tsx` |
| READY showed nothing until Start. | READY now runs a non-counting preview: skeleton and framing guidance, timer at 00:00, no reps. | hook |
| "Spine aligned" could persist from an old frame. | Form reassurance only shows while running on a currently visible pose; no-person and missing-joint frames show framing guidance instead ("No person detected — step into the camera view", "Move back so your hips, knees and ankles are fully in view"). | hook + `App.tsx` |
| The overlay only matched the video when the stage was exactly 4:3. | The overlay bitmap is sized to the real camera frame, so it letterboxes exactly like the `object-fit: contain` video at any aspect ratio, zoom or viewport; strokes and labels scale with it. Replay transforms are unchanged. | hook + `src/adapters/poseCanvasRenderer.ts` |
| Simulated playback could lose a rep when the main thread stalled (seen under heavy test load). | The simulator advances its own clock by at most one ~30 Hz frame per read, so synthetic playback is not mistaken for an unobserved real-camera gap. | adapter |

Mirroring: video and landmarks are both drawn unmirrored, so they stay consistent. Video is processed locally and never recorded or uploaded; only video is requested (no microphone).

### Milestone celebration (P1)

* **Trigger:** `saveWorkout` compares the active route's unlocked milestones before and after an accepted, persisted save. Only newly crossed milestones are queued, in progression order, one celebration at a time. The decision lives in the telemetry hook (`useMilestoneCelebrations` in `src/hooks/useMissionTelemetry.ts`); presentation cannot affect earning.
* **Never replays:** persisted history is the baseline, so reloads, demo seeding, opening Journey, route changes, sync acknowledgements, duplicate saves and rejected saves never celebrate. Clear/seed cancels queued celebrations; a new mission can earn badges again. Because celebrations come from save events rather than stored flags, no extra durable acknowledgement is needed. The practical limit: if the browser crashes between a save and the animation, that one celebration is not shown later, but the badge itself is saved.
* **Presentation:** `src/components/MilestoneCelebration.tsx` and `src/styles/camera-milestones.css`. A non-modal card at app level (works on any page): a coin flip with two turns (0–700 ms), a front-facing settle with one halo burst (700–1000 ms), a readable hold, then a fade by 4.2 s. It uses CSS transforms/opacity only, and the reverse face shares the badge's hexagon so artwork is never mirrored. It has a polite live announcement, a dismiss button, no focus stealing, and pointer events only on the card. Reduced motion gives a 3.6 s opacity-only fade. A missing asset falls back to `/assets/mission-badge.svg`. A safety timeout removes the layer if animations never run. Badge art comes from the central `badgeAssets` mapping in `src/content/journeyPresentation.json` and is preloaded so offline sessions still show it.

## Presentation script (60–90 s)

**Before going on stage:**
- Open the site in the presentation browser and use it once while online: load the Arena and open Journey. This caches the pose model, WASM runtime and badge art for an offline-tolerant session.
- Run the demo setup below.

1. **Arena:** "The camera stays off until I choose to enable it." Select **Enable camera** and allow access. The stage steps show permission → camera preview → pose model.
2. **READY:** "This is a preview. The timer is 00:00 and nothing counts." Point at the skeleton. If a framing chip appears, step back until it clears.
3. Select **Start webcam**. Do 3–4 slow bodyweight squats (no load needed; the ARED load field is the logged value). Reps count on the return to standing, and phase, angle and ROM update live. Show one deliberately shallow squat: "Depth insufficient" is flagged and a snapshot is captured.
4. **Pause:** the timer freezes. **Resume:** the next rep needs a fresh start position, because unobserved movement never counts.
5. **End session:** the workout saves once. With the demo setup, it crosses 50 km and the **First Traverse** badge flips in.
6. Open **Journey**: First Traverse is unlocked. Open **Logs**: the session is the top row, with its flagged-rep replay.

**Simulator fallback (always say it is simulated):** select **Use simulation feed** → **Start simulator**. The tracking label reads SIMULATED POSE FEED; use **Simulate Good Rep / Shallow Rep / Spine Fault**, then **End session**. The milestone steps are identical.

## Demo setup near a real threshold (reversible)

This uses the existing rules and UI; no code path is special-cased and no threshold is lowered. It replaces local browser data, so export it first if you need it (Analytics → Export Flight Surgeon JSON).

1. Settings → **Clear Local Data** → **Confirm clear**.
2. Arena → **Log a cardio session** → Treadmill, **49 km** → Log. You are now 1 km short of First Traverse (50 km).
3. Any resistance set of at least 1 km of expedition distance crosses it. ARED distance is volume × form accuracy ÷ 250. Squat at the default 80 kg with 4 good reps gives 320 kg ≈ 1.28 km. Shallow or faulted reps lower form accuracy, so do one or two extra reps.

To reset afterwards: Settings → **Seed 30-Day Mars Demo Data** (or Clear Local Data again).

## Verification

### Automated (all passing after the final changes)

| Command | Result |
| --- | --- |
| `npm run test` | 15 files, 92 tests passed |
| `npm run typecheck` | passed |
| `npm run lint` | architecture lint passed |
| `npm run build` | passed |
| `npm run test:e2e` | 49 passed |
| `npm run test:production` | 5 passed |

**New coverage:**
- Interrupted reps for all four exercises: leave and re-enter, resume gap, and a continuous rep still counting.
- Failure classification and preparation stages.
- Track interruption.
- Pending-request reuse.
- Save-once after a disconnect.
- Stale-guidance clearing.
- Overlay sized to the source.
- Milestone boundaries (below, exactly at, above), multiple awards, duplicate saves, reload, seed, route change, rejected save and new mission.
- Celebration in the browser: accessibility, auto-removal, dismissal, reduced motion, missing asset, and prewarmed offline saving with a queued sync.

**Updated assertions:**
- Three tests that asserted the old generic denial text now assert the specific cause, which is a stricter check.
- The skip-link test now waits for the Logs heading before pressing Tab. This removes a render race that appeared under parallel load and does not loosen any assertion.

### Fake-camera measurements (Chromium's synthetic test pattern, not a person)

**Setup:** production build (`vite preview`), Chromium 159 headless with `--use-fake-device-for-media-stream`, 640×480 at 20 fps, on an Intel Core i3-1115G4 with 7.8 GB RAM under Windows 11.

| Measure | Result |
| --- | --- |
| Cold start: Enable camera → READY | 2.7–3.0 s (permission and preview under 1 s; model about 2 s) |
| Warm restart (10 cycles) | 1.1–1.7 s |
| Video frames presented | about 7.5/s while tracking (the source delivers 20/s; the main thread is busy with inference) |
| Inference (overlay updates) | about 7.6/s; each CPU inference call is a 50–105 ms main-thread task (about 65 ms average) |
| Memory after forced GC | 7.1 → 7.6 → 7.7 MB across 0, 10 and 20 start/end cycles (no growth trend) |
| Live tracks after End session | 0 |

On this CPU, live tracking is inference-bound at about 7–8 updates per second, below the ~30 Hz target. The pipeline handles this correctly: it analyses only fresh frames, with no backlog. A headed run with the browser window in the background measured much slower startup because Chrome throttles occluded windows, so keep the presentation window in front.

### Not done here: needs the presentation laptop and a participant

- A 10–15 minute real-webcam soak, plus 10 or more start/pause/resume/end cycles with a person in frame.
- Real body-tracking accuracy for squat, deadlift (bodyweight hip hinge), overhead press and bicep curl (unloaded or light): reps count once at the return, partial reps flag, and stepping out of frame never counts.
- Measured inference and video rates on the actual laptop and browser, warm and cold. If they are well below 15/s, try the MediaPipe GPU delegate with a CPU fallback and measure it before adopting it.
- The 16:9 and portrait webcams, browser zoom and the projector resolution, checked by eye.
