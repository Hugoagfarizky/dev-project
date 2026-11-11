# SimuForge — MVP-1 Consolidated Execution Roadmap

**Date:** 2026-11-11  
**Status:** M1-A and M1-B CLOSED; M1-C IMPLEMENTED (pending closure audit); M1-D..M1-F PLANNED / NOT AUTHORIZED

## MVP-1 objective

Deliver Components & Basic Physics per product spec §7.3: basic component system, rigid body, gravity, collision, force/impulse, Play/Pause/Stop/Reset.

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1-A | CLOSED (PASS WITH CONDITIONS) | Component system foundation; residual: unknown component type handling on load |
| M1-B | CLOSED (PASS) | Runtime state machine + structural-edit gating; audit `M1_B_POST_IMPLEMENTATION_CLOSURE_AUDIT.md` |
| M1-C | IMPLEMENTED (PENDING CLOSURE AUDIT) | Rigid body + gravity + fixed-step integrator; report `M1_C_IMPLEMENTATION_REPORT.md` |
| M1-D | PLANNED / NOT AUTHORIZED | Primitive collision (sphere/box/plane) + response |
| M1-E | PLANNED / NOT AUTHORIZED | Force/impulse + runtime logs |
| M1-F | PLANNED / NOT AUTHORIZED | Reset + wiring + acceptance evidence |

## Dependency map

M1-A (done) → M1-B → M1-C → M1-D → M1-E → M1-F

M1-B gates all physics work. M1-C and M1-D are sequential (collision needs rigid body). M1-E depends on M1-C/D. M1-F depends on M1-B..E.

## Critical path

M1-A (done) → M1-B → M1-C → M1-D → M1-E → M1-F.

## Decisions required from Project Owner

- M1-B: six decisions in `M1_B_PROJECT_OWNER_DECISION_BRIEF.md` (snapshot semantics, Play/Pause/Stop/Reset, gating, runtime store, failure recovery, integrator details).
- M1-C: APPROVED 2026-11-11 — fixed timestep 1/60 s + simple accumulator (frame delta clamped to 0.25 s), semi-implicit Euler, gravity −9.81 m/s².
- M1-D: collision response algorithm.
- M1-E: force application semantics.
- M1-F: acceptance evidence format.

## Technical risks

- Runtime state vs authored state separation (ADR 0003).
- Transform suppression during simulation (gizmo/Inspector).
- Performance at 100 entities with physics (measure, no premature target).
- Scope creep into MVP-2 (visual scripting) or MVP-3 (integrated demo).

## Suggested implementation order

M1-A (done) → M1-B → M1-C → M1-D → M1-E → M1-F. Each milestone: design → implement → test → evidence → closure audit → Owner authorization for next.

## Opportunities for batching

- M1-B design + M1-C integrator design can be reviewed together (physics boundary depends on runtime state).
- Unit tests for component/rigid-body/collision can be written in parallel with implementation of each milestone.

## Suggested milestone closure gates

Each milestone requires: acceptance criteria PASS with evidence, full test suite pass, boundary/token/node checks pass, audit report, Owner authorization for next milestone.
