# Static Production Deployment

## Historical M0–M2 baseline — November 14, 2026

| Check | Terminal result |
| --- | --- |
| `npm run test` | 7 test files passed; 20 tests passed |
| `npm run typecheck` | Exit code 0; no errors |
| `npm run build` | Exit code 0; 39 modules transformed |
| `npm run test:production` | 5 passed (16.9s) |
| `npm run test:e2e` | 5 passed (20.4s) |

These are historical baseline results, not the current test totals. The build emits separate application/CSS and MediaPipe assets, plus the local model and both WASM variants; sizes change with the checkout. The production tests verified asset sizes, WASM MIME types, successful real model initialization with a fake camera, and all three demo modes after camera/model/WASM failures. A pending camera prompt can be cancelled by a single demo click. Local checks alone do not establish the state of a hosted deployment, web-filter approval, or award eligibility.

For the current frontend/scientific-context pass, run all five required checks: unit/browser tests, strict typecheck, architecture lint, production build and the full E2E suite. See `SCIENTIFIC_AND_REPOSITORY_AUDIT.md` for current results, scope and limits.

## Build and verify

```sh
npm install
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run test:production
```

The production browser suite starts `vite preview` against the existing `dist/` directory. Run the build first. It checks the local model and both WASM variants, real model initialization with a fake camera, accessible scientific citations, blocked camera/model/runtime access, and all three keyboard-operated simulated rep controls.

## Vercel or Netlify

- Build command: `npm run build`.
- Published directory: `dist`.
- Runtime: Node 22.12+ or Node 24. Netlify is configured for Node 22.
- Framework: Vite; this prototype uses a single root page.
- Deploy the entire build, including `mediapipe/` and hashed `assets/` files.
- Serve `.wasm` files as `application/wasm`. The model must return its binary file, not an HTML fallback page.
- Keep the same origin for JS, model, and WASM assets. No runtime CDN or backend credentials are required.
- `prebuild` copies runtime files from the locked MediaPipe dependency; the versioned local `.task` model is copied by Vite.

`vercel.json` and `netlify.toml` contain the build/output settings. If an organization adds a Content Security Policy or blocks WebAssembly, camera startup may fail; the app must still offer the native simulated-rep buttons. If camera permission remains pending, choosing a demo should cancel that startup and begin the camera-free session.

After publishing, verify the real HTTPS URL in a clean browser, repeat all three demo modes, check the sources section, and check camera tracking on permitted hardware. Local production tests establish bundle readiness; they do not verify a provider account or a public deployment.

## Repository & recorded hosting target

- **GitHub Repository (`origin`):** `https://github.com/yyytsaB/PROJECT-A.R.E.S.-Nasa-Space-Apps-.git`
- **Recorded Vercel target:** `https://project-ares-nasa.vercel.app/`. Its current content could not be inspected during this audit. Verify the deployed commit and actual browser behavior before submission.

Offline-first means a loaded app can continue local workflows after disconnecting. Local model/WASM assets remove CDN dependencies, but there is no service worker or guaranteed uncached offline start/reload. Voice Coach needs an installed local-service voice. The comms toggle is manual; it does not implement a 24-minute delay or NASA connectivity.

## Web-filter request

Use the permanent deployed HTTPS URL in the FortiGuard rating form. Requested fields: **Web-based Applications** and **Company Name: N/A**. Submit with the team's requested 24-hour buffer when possible; neither classification nor turnaround is guaranteed. Source citations and hosting alone do not establish NASA award eligibility.
