# Publication Readiness: Governance Exclusions, Scientific Sources, and Static Hosting

- **Status:** `APPROVED` — explicit publication-readiness request, November 14, 2026.
- **Owner:** Architecture & Verification Lead
- **Scope:** Prepare the current M0–M2 prototype for publication. Preserve local workflow files while excluding them from Git; replace assistant role labels with human team roles; add accessible official scientific citations; document accurate source usage and local setup; verify static production assets and camera-independent operation.
- **Public Test Seams:** Seam 6 browser DOM and camera/runtime boundary; existing application rendering test.
- **Implementation:** An unstyled sources section backed by static citation data; a root README; static-host settings; browser checks against `dist/`. Reuse existing simulators, camera error recovery, and native browser APIs.
- **Ponytail Check:** No new application dependencies, styling system, telemetry model, or scientific formula. Keep scientific references separate from claims about implemented dataset ingestion.
- **Acceptance:** All required governance exclusions are present and local files remain on disk; tracked content contains no named assistant labels outside `.gitignore`; official NASA/CSA/ESA/JAXA references are visible and accurately describe their use; production assets load locally; blocked camera/model/WASM paths preserve all three one-click demos; test/typecheck/build complete successfully.
- **Limits:** This preparation does not establish award eligibility, approval by an agency, or web-filter classification. Submission must identify the selected challenge and actual resource usage. Publishing, provider account configuration, and submission of external forms are separate from these readiness checks.
