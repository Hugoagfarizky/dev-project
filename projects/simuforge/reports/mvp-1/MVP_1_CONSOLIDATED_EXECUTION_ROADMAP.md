# SimuForge — MVP-1 Consolidated Execution Roadmap

**Date:** 2026-11-11  
**Status:** M1-A, M1-B, M1-C CLOSED; M1-D IMPLEMENTED (pending closure acceptance); M1-E..M1-F PLANNED / NOT AUTHORIZED

## MVP-1 objective

Deliver Components & Basic Physics per product spec §7.3: basic component system, rigid body, gravity, collision, force/impulse, Play/Pause/Stop/Reset.

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1-A | CLOSED (PASS WITH CONDITIONS) | Component system foundation; residual: unknown component type handling on load |
| M1-B | CLOSED (PASS) | Runtime state machine + structural-edit gating; audit `M1_B_POST_IMPLEMENTATION_CLOSURE_AUDIT.md` |
| M1-C | CLOSED (PASS) | Rigid body + gravity + fixed-step integrator; 16/16 criteria, 113/113 tests, evidence `evidence/m1c-trajectory.json`; report `M1_C_IMPLEMENTATION_REPORT.md` |
| M1-D | IMPLEMENTED (PENDING CLOSURE ACCEPTANCE) | Primitive colliders (sphere/box/plane) + plane-contact response; report `M1_D_IMPLEMENTATION_REPORT.md` |
| M1-E | PLANNED / NOT AUTHORIZED | Force/impulse + runtime logs |
| M1-F | PLANNED / NOT AUTHORIZED | Reset + wiring + acceptance evidence |

### M1-C closure record (2026-11-11)

M1-C is closed as **implementation-complete** from its reported evidence: 16/16 acceptance criteria PASS, 113/113 tests PASS, typecheck/build/boundary/token/Node checks PASS, trajectory evidence PASS, implementation `ebc8c21` and report update `40342c0` on `origin/main`. This is a documentation closure, not a new independent audit. The original M1-C report and evidence are preserved unchanged.

### M1-D implementation record (2026-11-11)

M1-D implements the approved D-M1D-01 contract: dynamic sphere/box colliders vs static infinite planes, positional penetration correction, removal of inbound normal velocity, restitution 0, friction 0, no angular response, dynamic-vs-dynamic collisions deferred. The fixed-step runtime, snapshot/reset/stop semantics, structural-edit gating, runtime/authored isolation, and persistence boundaries are preserved. Evidence: `evidence/m1d-contact.json`; 143/143 tests pass.

## Dependency map

M1-A (done) → M1-B (done) → M1-C (done) → M1-D (implemented) → M1-E → M1-F

M1-B gates all physics work. M1-C and M1-D are sequential (collision needs rigid body). M1-E depends on M1-C/D. M1-F depends on M1-B..E.

## Critical path

M1-A (done) → M1-B (done) → M1-C (done) → M1-D (implemented) → M1-E → M1-F.

## Decisions required from Project Owner

- M1-B: six decisions in `M1_B_PROJECT_OWNER_DECISION_BRIEF.md` (snapshot semantics, Play/Pause/Stop/Reset, gating, runtime store, failure recovery, integrator details). APPROVED.
- M1-C: APPROVED 2026-11-11 — fixed timestep 1/60 s + simple accumulator (frame delta clamped to 0.25 s), semi-implicit Euler, gravity −9.81 m/s².
- M1-D: APPROVED 2026-11-11 — D-M1D-01 plane contacts, fully inelastic: dynamic sphere/box vs static infinite plane; positional correction + inbound normal velocity removal; restitution 0, friction 0, no angular response; dynamic-vs-dynamic deferred.
- M1-E: force application semantics. NOT APPROVED / NOT AUTHORIZED.
- M1-F: acceptance evidence format. NOT APPROVED / NOT AUTHORIZED.

## Technical risks

- Runtime state vs authored state separation (ADR 0003).
- Transform suppression during simulation (gizmo/Inspector).
- Performance at 100 entities with physics (measure, no premature target).
- Scope creep into MVP-2 (visual scripting) or MVP-3 (integrated demo).

## Suggested implementation order

M1-A (done) → M1-B (done) → M1-C (done) → M1-D (implemented) → M1-E → M1-F. Each milestone: design → implement → test → evidence → closure audit → Owner authorization for next.

## Opportunities for batching

- M1-B design + M1-C integrator design can be reviewed together (physics boundary depends on runtime state).
- Unit tests for component/rigid-body/collision can be written in parallel with implementation of each milestone.

## Suggested milestone closure gates

Each milestone requires: acceptance criteria PASS with evidence, full test suite pass, boundary/token/node checks pass, audit report, Owner authorization for next milestone.
