# Static Production Deployment

## Verified locally — November 14, 2026

| Check | Terminal result |
| --- | --- |
| `npm run test` | 7 test files passed; 20 tests passed |
| `npm run typecheck` | Exit code 0; no errors |
| `npm run build` | Exit code 0; 39 modules transformed |
| `npm run test:production` | 5 passed (16.9s) |
| `npm run test:e2e` | 5 passed (20.4s) |

The build emits a separate 136.11 kB MediaPipe chunk and a 250.74 kB application chunk, plus the local model and both WASM variants. The production tests verified asset sizes, WASM MIME types, successful real model initialization with a fake camera, and all three demo modes after camera/model/WASM failures. A pending camera prompt can be cancelled by a single demo click. No public URL, provider deployment, web-filter approval, or award eligibility has been established by these local checks.

## Build and verify

```sh
npm install
npm run test
npm run typecheck
npm run build
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

## Repository & Live Production URL

- **GitHub Repository (`origin`):** `https://github.com/yyytsaB/PROJECT-A.R.E.S.-Nasa-Space-Apps-.git`
- **Live Production Deployment (Vercel):** `https://project-ares-nasa.vercel.app/`

## Web-filter request

Use the permanent deployed HTTPS URL in the FortiGuard rating form. Requested fields: **Web-based Applications** and **Company Name: N/A**. Submit with the team's requested 24-hour buffer when possible; neither classification nor turnaround is guaranteed. Source citations and hosting alone do not establish NASA award eligibility.
