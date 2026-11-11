# SimuForge — Project Handoff (MVP-0 Closed)

**Date:** 2026-11-10  
**Status:** MVP-0 ACCEPTED (Project Owner sign-off, 2026-11-10)

## A. Repository baseline

- Repository: `D:\Github\dev-project` (remote: `https://github.com/Hugoagfarizky/dev-project.git`)
- Project path: `projects/simuforge`
- Branch: `main`
- HEAD / origin/main: `790398a` (after closure commit) — last known pre-closure HEAD `d9266f7`
- Working tree: clean except untracked root `package-lock.json` (do not touch)
- MVP-0 closure commit: `790398a` (docs: ACG-01 reconciliation + final acceptance audit)

## B. Project status

- **MVP-0: COMPLETED / ACCEPTED** (Project Owner, 2026-11-10).
- Acceptance: 26/26 M0-AC PASS; 4/4 ACG PASS (ACG-01 Owner signed off).
- F-1 through F-5: CLOSED.
- Definition of Done: all items satisfied.
- Evidence: `projects/simuforge/reports/mvp-0/evidence/` (ac03..ac21 result JSON + screenshots), `verify-mvp0-closure.cjs`.
- Final audit: `projects/simuforge/reports/mvp-0/MVP0_FINAL_ACCEPTANCE_AUDIT.md`.

## C. Owner decisions

- MVP-0 accepted. No authorization for MVP-1.
- Any further implementation requires explicit Project Owner authorization.
- Deferred observations (F-2, F-3, F-6, F-7) are non-blocking; handle in a future increment only if authorized.

## D. Technical baseline

- Node: v24.22.2; npm; Vite dev server (port 5174).
- Toolchain: TypeScript (strict), Vitest (71 tests), ESLint/boundary checks.
- Architecture: React + Babylon.js renderer, StudioStore (reducer), IndexedDB repository (`simuforge` DB, `projects` store, keyPath `project.id`, index `project.updatedAt`).
- ADRs: ADR 0002 (tech stack), ADR 0003 (persistence).
- Key constraints: world/** must not import Babylon/React/DOM; no autosave; camera/editor state not serialized.
- Testing: `npm test`, `npm run check:boundaries`, `npm run check:tokens`, `npm run check:node`, `npm run typecheck`, `npm run build`.

## E. Git workflow

- Every completed, validated change: commit and push immediately.
- Before commit: review `git status` + `git diff`; ensure only intended files; run relevant validation.
- If validation fails or scope widens: STOP, no commit/push.
- Never touch root `package-lock.json` (untracked artefact).

## F. Open issues (non-blocking)

- Cosmetic: console filter controls use native styling (F-2); console log fields concatenated (F-3).
- Minor: Ctrl+O does not confirm unsaved changes (F-6, spec §7.3).
- Minor: camera input-map modifier entries could be made explicit (F-7).
- Documentation: mojibake in `shortcuts/audit.md`; placeholder `Final commit: (this increment)`; stale R-1..R-5 status.

## G. Next action

**WAIT FOR PROJECT OWNER AUTHORIZATION FOR MVP-1.**

No further implementation until explicit authorization is granted.

> Superseded for M1-C only: the Project Owner authorized M1-C implementation on 2026-11-11 (see §H–§I). M1-D, M1-E, and M1-F still require explicit authorization.

## H. MVP-1 status (updated 2026-11-11)

- M1-A: CLOSED (PASS WITH CONDITIONS). Residual: unknown component type handling on load (OPEN/PROPOSED).
- M1-B: CLOSED (PASS). Runtime state machine + structural-edit gating.
- M1-C: IMPLEMENTED (pending post-implementation closure audit). Rigid body + gravity + fixed-step integrator.
- M1-D..M1-F: PLANNED, NOT AUTHORIZED.
- Owner decisions D-01..D-06 APPROVED; M1-C technical decisions D-M1C-01..D-M1C-03 APPROVED 2026-11-11.
- See `projects/simuforge/reports/mvp-1/` for all planning, implementation, and audit documents.

## I. M1-C implementation snapshot (2026-11-11)

- Scope: rigid body + gravity + fixed-step integrator only.
- Decisions: fixed timestep 1/60 s with a simple accumulator (frame delta clamped to 0.25 s), semi-implicit Euler, gravity −9.81 m/s².
- Implementation: pure `app/src/runtime/**` physics; runtime-only bodies in `StudioState.runtime`; `runtime/step` reducer command; `selectRenderWorld` render overlay; `useSimulationLoop` UI driver.
- Runtime/authored isolation preserved: authored `project.world` is never mutated while running; runtime state is never persisted (ADR 0003).
- Tests: 113/113 pass (87 M1-B baseline + 26 new).
- Validation: typecheck, production build, boundary, token, and Node 24.22.2 checks all pass.
- Evidence: `reports/mvp-1/evidence/m1c-trajectory.json`; report `reports/mvp-1/M1_C_IMPLEMENTATION_REPORT.md`.
- Not implemented: M1-D collision, M1-E force/impulse/logs, M1-F full wiring/acceptance evidence. All remain NOT AUTHORIZED.
- Note: unapproved uncommitted physics scratch WIP found at pre-flight is preserved on local branch `wip/m1c-physics-scratch` (`a566c98`); it is not part of `main` and was not pushed.
