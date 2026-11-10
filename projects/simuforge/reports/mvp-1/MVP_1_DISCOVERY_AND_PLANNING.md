# SimuForge — MVP-1 Discovery & Planning

**Date:** 2026-11-10  
**Status:** Discovery only — MVP-1 implementation is NOT AUTHORIZED  
**Baseline:** `main` @ `7a8597a` (MVP-0 accepted, 2026-11-10)

## 1. Executive summary

MVP-0 is closed and accepted (26/26 M0-AC, 4/4 ACG, F-1..F-5 closed). The codebase provides a solid foundation: empty-world authoring, primitive creation, transform editing (Inspector + gizmos), camera, selection, persistence (IndexedDB), Project Hub, and keyboard shortcuts. MVP-1 per the product spec (§7.3) targets **Components & Basic Physics**: a basic component system, rigid body, gravity, collision, force/impulse, and Play/Pause/Stop/Reset. No physics or component code exists yet; MVP-1 is a greenfield increment on top of the MVP-0 foundation. This document proposes scope, milestones, acceptance criteria, validation strategy, risks, and open decisions. It does not authorize implementation.

## 2. Verified MVP-0 baseline

- Repository `D:\Github\dev-project`, branch `main`, HEAD = `origin/main` = `7a8597a`.
- Working tree clean except untracked root `package-lock.json`.
- Toolchain: Node v24.22.2, Vite, TypeScript strict, Vitest (71 tests), ESLint/boundary checks.
- Key ADRs: ADR 0002 (tech stack), ADR 0003 (persistence).
- Handoff: `projects/simuforge/reports/mvp-0/PROJECT_HANDOFF.md`.
- Final audit: `projects/simuforge/reports/mvp-0/MVP0_FINAL_ACCEPTANCE_AUDIT.md`.

## 3. Current capability inventory

Available (MVP-0):
- Empty world + grid + camera (ArcRotate, clamped).
- Primitives: Cube, Sphere, Plane with POC-01 defaults + UUIDs.
- Selection (viewport + Hierarchy), transform (Inspector + gizmos, world translate/rotate, local scale), commit to model.
- Rename/delete with confirmation; Hierarchy.
- Persistence: IndexedDB (`simuforge`, `projects`, keyPath `project.id`, index `project.updatedAt`), save/open/import/export, Project Hub (sort + empty/loading/error).
- Keyboard shortcuts (W/E/R/F/Shift+F/G/F2/Delete/Esc, Ctrl+S/O/Alt+N), focus management.
- Console, Program/Monitor surfaces marked `Planned`.
- Boundary/static guards, round-trip serialization tests.

Not available:
- No component system, no runtime state, no physics, no simulation loop, no Play/Pause/Stop/Reset.
- No rigid body, gravity, collision, force/impulse.
- Monitor shows `Planned` only.

## 4. Deferred work and technical debt (MVP-0)

- F-2: console filter controls native styling (cosmetic).
- F-3: console log fields concatenated (cosmetic).
- F-6: Ctrl+O does not confirm unsaved changes (minor).
- F-7: camera input-map modifier entries could be made explicit (cosmetic).
- Documentation: mojibake in `shortcuts/audit.md`, placeholder commit, stale R-1..R-5.

None blocks MVP-1.

## 5. Candidate MVP-1 scope (product spec §7.3)

Must-have:
- Basic component system (attach components to entities).
- Rigid body component (mass, gravity flag, collider).
- Gravity application.
- Collision (at least plane vs sphere/box).
- Force/impulse application.
- Play, Pause, Stop, Reset runtime controls.
- Structural edits blocked while running; runtime-marked controls remain usable.

Should-have:
- Runtime state machine (Editing/Running/Paused) wired to UI (state pill, toolbar).
- Basic runtime logs/errors in Console.
- Reset returns simulation to initial state (snapshot restore).

Could-have:
- Simple monitor readout (position/velocity).
- Multiple colliders.

Out of scope (product spec §7.6 + MVP-0 boundaries):
- Advanced physics, robotics, electrical, multi-user, cloud, Python, 2D solver, hybrid 2D/3D, visual scripting (MVP-2), integrated demo (MVP-3).

## 6. Prioritization rationale

- Must-haves directly satisfy §7.3 acceptance criteria and are the smallest slice that makes the product demonstrable.
- Component system first: everything else depends on it.
- Runtime state machine next: gates Play/Pause/Stop/Reset and structural-edit blocking.
- Physics (gravity → collision → force) builds incrementally and is independently testable.
- Should-haves improve usability but are not required for the ball-floor-button scenario (MVP-3).

## 7. Proposed milestones (not authorized)

| Milestone | Increments | Depends on |
|---|---|---|
| M1-A | Component system + entity-component storage + serialization | MVP-0 foundation |
| M1-B | Runtime state machine (Editing/Running/Paused) + UI controls + structural-edit gating | M1-A |
| M1-C | Rigid body + gravity + integrator | M1-A, M1-B |
| M1-D | Collision detection (plane/sphere/box) + response | M1-C |
| M1-E | Force/impulse application + runtime logs | M1-C, M1-D |
| M1-F | Reset (snapshot restore) + Play/Pause/Stop wiring + acceptance evidence | M1-B..E |

## 8. Acceptance criteria (proposed, Owner to approve)

- A ball with a rigid body responds to gravity.
- A floor prevents the ball from passing through.
- Applying force/impulse changes motion.
- Pause freezes progression; resume continues; reset restores initial state.
- Structural edits blocked while running; runtime-marked controls usable.
- Graph/runtime independent of editor UI callbacks (per §7.4 direction, if scripting included).
- Save/reopen preserves components and runtime state appropriately (editor state not serialized per ADR 0003).

## 9. Validation and evidence strategy

- Unit tests for component storage, runtime state machine, integrator, collision.
- Browser harness (CDP) for Play/Pause/Stop/Reset and structural-edit gating.
- Evidence JSON + screenshots under `reports/mvp-1/evidence/`.
- Regression: existing 71 tests + new tests; `npm test`, boundary/token/node checks.
- No user data touched (fresh Chrome profiles).

## 10. Risks and dependencies

- Physics correctness vs. determinism (floating point) — mitigate with fixed timestep.
- Performance at 100 entities with physics — measure, no premature targets.
- Runtime state vs. editor state separation (ADR 0003: editor state not serialized) — ensure runtime snapshot is editor-state, not persisted.
- Scope creep into MVP-2 (scripting) — keep MVP-1 limited to §7.3.
- Regression risk to MVP-0 transform/persistence — run full suite each increment.

## 11. Open decisions for Project Owner

Owner decisions recorded 2026-11-10 (see `MVP_1_OWNER_DECISIONS.md`): D-01 in-house physics, D-02 attached component list, D-03 primitive colliders, D-04 lifecycle locking, D-05 ball-floor-button demo, D-06 measure without numeric target — all APPROVED.

Remaining open (detail-level, PROPOSED):
1. Physics integrator details (fixed timestep value, solver iterations).
2. Component data contract (exact schema, validation rules).
3. Collider size representation and scaling interaction.
4. Runtime snapshot contents and restore granularity.
5. Performance measurement thresholds.
6. Authorization to begin M1-A (not yet granted).

## 12. Explicit statement

**MVP-1 implementation is NOT AUTHORIZED.** This document is a proposal for Project Owner decision. No source, config, test, or evidence changes were made during discovery. No commit or push performed.
