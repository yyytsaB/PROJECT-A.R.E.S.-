# Implementation Tasks (Vertical TDD Slices): [Milestone ID — Feature Name]

- **Spec Reference:** `./spec.md`
- **Rules:**
  1. Work **one vertical slice at a time** from top to bottom.
  2. Follow **Red -> Green -> Verify**: write the failing test at the confirmed seam first, run `npx vitest run` to witness `RED`, write the minimal `ponytail`-compliant code to turn it `GREEN`, run `npm run typecheck`, then mark `[x]`.
  3. Never write all tests upfront (no horizontal slicing).
  4. Keep `src/core/**` 100% pure TypeScript with zero React/DOM imports.

---

## Vertical Slices

- [ ] **Slice 1 (Tracer Bullet): [Short behavior description]**
  - **Target Seam:** `[e.g., Seam 1 — normalizePose33 & computeJointAngleDeg]`
  - **Red Test Assertion:** `[What independent literal output is asserted on what 33-point fixture input?]`
  - **Files Touched:** `[e.g., src/core/kinematics/kinematicMath.test.ts, src/core/kinematics/kinematicMath.ts]`
  - **Verify Command:** `npx vitest run src/core/kinematics/kinematicMath.test.ts`

- [ ] **Slice 2: [Next observable behavior / edge case]**
  - **Target Seam:** `...`
  - **Red Test Assertion:** `...`
  - **Files Touched:** `...`
  - **Verify Command:** `...`

- [ ] **Slice 3: [Next observable behavior / adapter or headless hook integration]**
  - **Target Seam:** `...`
  - **Red Test Assertion:** `...`
  - **Files Touched:** `...`
  - **Verify Command:** `...`

---

## Milestone Completion Checklist

- [ ] All vertical slices above are marked `[x]` with passing tests.
- [ ] `npm run typecheck && npm run lint` passes with zero errors.
- [ ] `code-review` skill executed against `./spec.md` and `docs/CODING_STANDARDS.md`.
- [ ] `ROADMAP.md` updated to mark this milestone complete.
