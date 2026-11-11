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

> Superseded for M1-C, M1-D, and M1-E only: the Project Owner authorized M1-C implementation on 2026-11-11, M1-C closure plus M1-D implementation on 2026-11-11, and M1-E implementation on 2026-11-11 (see §H–§K). M1-F still requires explicit authorization.

## H. MVP-1 status (updated 2026-11-11)

- M1-A: CLOSED (PASS WITH CONDITIONS). Residual: unknown component type handling on load (OPEN/PROPOSED).
- M1-B: CLOSED (PASS). Runtime state machine + structural-edit gating.
- M1-C: CLOSED (PASS). Rigid body + gravity + fixed-step integrator; 16/16 criteria, 113/113 tests at closure.
- M1-D: IMPLEMENTED (pending closure acceptance). Primitive colliders (sphere/box/plane) + fully inelastic plane-contact response; 143/143 tests.
- M1-E: IMPLEMENTED (pending closure acceptance). Persistent force + instantaneous impulse + runtime logs; 186/186 tests; evidence `evidence/m1e-force-impulse.json`.
- M1-F: NOT AUTHORIZED.
- Owner decisions D-01..D-06 APPROVED; M1-C technical decisions D-M1C-01..D-M1C-03 APPROVED 2026-11-11; M1-D collision decision D-M1D-01 APPROVED 2026-11-11; M1-E force/impulse decisions D-M1E-01..D-M1E-04 APPROVED 2026-11-11.
- See `projects/simuforge/reports/mvp-1/` for all planning, implementation, and audit documents.

## I. M1-C implementation snapshot (2026-11-11)

- Scope: rigid body + gravity + fixed-step integrator only.
- Decisions: fixed timestep 1/60 s with a simple accumulator (frame delta clamped to 0.25 s), semi-implicit Euler, gravity −9.81 m/s².
- Implementation: pure `app/src/runtime/**` physics; runtime-only bodies in `StudioState.runtime`; `runtime/step` reducer command; `selectRenderWorld` render overlay; `useSimulationLoop` UI driver.
- Runtime/authored isolation preserved: authored `project.world` is never mutated while running; runtime state is never persisted (ADR 0003).
- Tests: 113/113 pass (87 M1-B baseline + 26 new).
- Validation: typecheck, production build, boundary, token, and Node 24.22.2 checks all pass.
- Evidence: `reports/mvp-1/evidence/m1c-trajectory.json`; report `reports/mvp-1/M1_C_IMPLEMENTATION_REPORT.md`.
- Not implemented at M1-C time: M1-D collision, M1-E force/impulse/logs, M1-F full wiring/acceptance evidence. M1-D was subsequently implemented; M1-E was subsequently implemented; M1-F remains NOT AUTHORIZED.
- Note: unapproved uncommitted physics scratch WIP found at pre-flight is preserved on local branch `wip/m1c-physics-scratch` (`a566c98`); it is not part of `main` and was not pushed.

## J. M1-D implementation snapshot (2026-11-11)

- Scope: primitive colliders (sphere/box/plane) + collision response; no force/impulse, authoring UI, mesh collision, or CCD.
- Decision: D-M1D-01 — plane contacts, fully inelastic. Dynamic sphere/box vs static infinite plane; positional penetration correction + inbound normal velocity removal; restitution 0, friction 0, no angular response; dynamic-vs-dynamic collisions deferred.
- Collider semantics: sphere size = radius; box size = full extents; plane = horizontal +Y plane at the body position, rotation/scale ignored; collider sizes are world-space and transform scale is not applied.
- Implementation: `RuntimeCollider` in `app/src/runtime/types.ts`; collider derivation, static planes, and contact resolution in `app/src/runtime/physics.ts`; failure handling in `app/src/editor/reducer.ts`.
- Failure contract preserved: collision failure pauses safely, preserves the last valid bodies/accumulator, sets `runtime.lastError`, and logs a `RUNTIME` error.
- Runtime/authored isolation preserved: collision writes only `runtime.bodies`; authored state is not mutated; runtime collision state is not persisted; the project does not become dirty.
- Tests: 143/143 pass (113 M1-C baseline + 30 new: 17 runtime + 13 editor).
- Validation: typecheck, production build, boundary, token, and Node 24.22.2 checks all pass.
- Evidence: `reports/mvp-1/evidence/m1d-contact.json`; report `reports/mvp-1/M1_D_IMPLEMENTATION_REPORT.md`.
- Not implemented: M1-E force/impulse/logs, M1-F full wiring/acceptance evidence. Both remain NOT AUTHORIZED.

## K. M1-E implementation snapshot (2026-11-11)

- Scope: force/impulse application + runtime logs only; no force/impulse UI, authoring wiring, browser acceptance, advanced forces, or angular response.
- Decisions: D-M1E-01 persistent world-space force in newtons until `clearForce`/Reset/Stop; D-M1E-02 instantaneous momentum impulse in N·s (`delta-v = impulse / mass`); D-M1E-03 Running/Paused acceptance, Editing rejection, dynamic sphere/box targets only, `info`/`warn`/`error` logging; D-M1E-04 runtime/API only.
- Implementation: `RuntimeBody.mass` and `RuntimeBody.force` in `app/src/runtime/types.ts`; `applyForce`, `applyImpulse`, `clearForce`, mass validation, and force integration in `app/src/runtime/physics.ts`; `runtime/apply-force`, `runtime/apply-impulse`, and `runtime/clear-force` commands in `app/src/editor/commands.ts`; lifecycle, logging, and no-partial-commit handling in `app/src/editor/reducer.ts`.
- Lifecycle: force/impulse are accepted while Running or Paused; Editing is rejected with `RUNTIME_NOT_ACTIVE` at `warn`. Validation warnings leave runtime state unchanged; internal failures pause, set `runtime.lastError`, and log an error.
- Runtime/authored isolation preserved: force/impulse writes only `runtime.bodies`; authored state is not mutated; runtime force/mass/velocity state is not persisted; the project does not become dirty.
- Tests: 186/186 pass (143 M1-D baseline + 43 new: 20 runtime + 23 editor).
- Validation: typecheck, production build, boundary, token, and Node 24.22.2 checks all pass.
- Evidence: `reports/mvp-1/evidence/m1e-force-impulse.json`; report `reports/mvp-1/M1_E_IMPLEMENTATION_REPORT.md`.
- Not implemented: M1-F full wiring/demo/browser acceptance evidence. M1-F remains NOT AUTHORIZED.
