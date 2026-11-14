# M0 / M1 Verification and Two-Axis Audit Handoff

Verified November 14, 2026, Asia/Shanghai. The initial clock check was 10:32 AM local, after the official 09:00 AM coding gate. M0 slices 1–3 and M1 slices 1–4 are complete. M2–M4 implementations remain outside this assignment.

## Final terminal results

`npm run test`

```text
RUN v4.1.12
Test Files  4 passed (4)
     Tests  11 passed (11)
```

`npm run typecheck`

```text
> tsc --noEmit
Exit code: 0 (no errors)
```

`npx --no-install vitest run --coverage`

```text
Statements : 95.02% (210/221)
Branches   : 94.02% (189/201)
Functions  : 100%   (37/37)
Lines      : 100%   (153/153)
```

Coverage measures executable `src/core/` implementation, excluding type-only declarations, synthetic fixture generators, and tests. This is 100% line/function coverage, not a claim of 100% branch or statement coverage. Remaining uncovered branches are catalog error diagnostics. The generated browsable report is `coverage/index.html`.

`npm run test:e2e`

```text
1 passed (9.7s)
```

The Chromium browser test checks the accessible Command Center heading, all four resistance exercises, and both route distances while blocking external services. No browser errors occurred. The screenshot at `test-results/command-center.png` was visually inspected: plain semantic HTML with no decorative styling.

`npm run build`

```text
vite v7.3.8
29 modules transformed
dist/index.html                  0.30 kB
dist/assets/index-BO5rP7ao.js    227.86 kB (71.26 kB gzip)
Exit code: 0
```

## Witnessed vertical RED → GREEN loops

| Slice | Observed RED | Verified GREEN behavior |
| --- | --- | --- |
| M0.1 | Catalog module missing | Version 1; four resistance and three cardio exercises; three gravity profiles; 4000/600 km routes |
| M0.2 | Lookup functions absent | Public lookups and descriptive schema rejection of invalid joint indices, angle bounds, cardio values, duplicate IDs, gravity values, and unordered milestones |
| M0.3 | App component missing | Catalog rendered in an unstyled semantic Command Center; server-rendered component test plus real browser verification |
| M1.1 | Kinematic math module missing | Known 45/90/180-degree angles, 33-point pelvis/torso normalization, translation/scale/aspect invariance, malformed input rejection |
| M1.2 | Frame analysis function absent | Flexion/extension ROM clamping, bilateral symmetry, trunk lean, visibility and fault flags across all four resistance exercises |
| M1.3 | Rep state-machine module missing | Ordered phases, repeated reps, pause preservation, stale/invalid/hidden frame rejection, jitter suppression, start-posture calibration |
| M1.4 | Missing depth alert | Faulted attempts, human-readable alerts, compact detached 33-point inflection snapshots, and session form accuracy |

Each slice was verified with its targeted tests and a clean typecheck before checking it off. Four additional audit regressions were each witnessed failing before their fixes: equal-depth worst-frame selection; an isolated depth outlier; a target-band boundary outlier; and an oversized replay payload.

## Independent two-axis review

The repository is not initialized as a Git repository. Two independent reviewers therefore examined the newly authored source directly against the approved specs and coding standards; no commit/diff baseline was available.

| Axis | Findings addressed | Final result |
| --- | --- | --- |
| Standards | Rounding alone did not guarantee the 2 KB snapshot limit | No remaining findings. The same private snapshot builder validates the complete worst-case payload and builds the eventual capture. Oversized inputs preserve state and report unavailable pose data. |
| Spec | Equal-depth holds could replay an earlier clean frame; one-frame depth outliers could qualify shallow reps | No remaining findings. Plateau ties retain worse form. Depth qualification requires two neighboring observations in the target band within the catalog hysteresis buffer. |

The review also confirmed that the specs supply no numeric daily-volume or gravity-readiness thresholds. Those unused, initially added values and required fields were removed; gravity profiles contain the approved IDs, names, and `gravityG` values only.

## Handoff behavior

- `src/core/types.ts` supplies shared contracts for Seams 1–6. Runtime implementation is limited to Seams 1–3.
- Exercise thresholds match the approved M0 table. Cardio distance multipliers and Earth load multipliers are identity mappings; route milestones are declarative demo content.
- A rep first observes the start posture, then needs two observations outside its start band. Target qualification and return-to-start completion each require adjacent observations. Null frames preserve state for pause/resume; stale timestamps and unavailable geometry cannot advance the rep.
- Faulted attempts increment `repCount` and `faultedRepCount`; `formAccuracyPct` is the percentage of completed attempts without faults. Depth is judged at completion, so normal descent/ascent frames do not create shallow-rep alerts.
- Snapshots store all 33 original image-space landmark objects rounded to three decimals, with inflection timestamp and rounded summary metrics. No video blobs or network services are used. Frames that cannot fit a complete snapshot within 2048 ASCII bytes are unavailable to the rep machine; coordinates are never cropped to force a fit.
- Live camera integration, six-screen hooks, persistence, and telemetry engines remain in their assigned later milestones. The current browser check verifies local rendering with external requests blocked; full offline app caching belongs to later delivery work.
- `package-lock.json` records installed dependencies. The latest installation audit reported zero vulnerabilities. Playwright browsers are stored locally in the ignored `.playwright-browsers/` directory.

Useful commands: `npm run dev`, `npm run test`, `npm run typecheck`, `npm run test:e2e`, `npm run build`. On a fresh checkout, install dependencies with `npm ci` and install Chromium into `.playwright-browsers/` before running E2E tests.
