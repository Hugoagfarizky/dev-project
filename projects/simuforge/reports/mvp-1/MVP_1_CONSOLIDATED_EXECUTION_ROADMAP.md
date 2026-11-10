# SimuForge — MVP-1 Consolidated Execution Roadmap

**Date:** 2026-11-10  
**Status:** Planning only — MVP-1 implementation NOT AUTHORIZED (M1-A closed; M1-B..M1-F not authorized)

## MVP-1 objective

Deliver Components & Basic Physics per product spec §7.3: basic component system, rigid body, gravity, collision, force/impulse, Play/Pause/Stop/Reset.

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1-A | CLOSED (PASS WITH CONDITIONS) | Component system foundation; residual: unknown component type handling on load |
| M1-B | PLANNED / NOT AUTHORIZED | Runtime state machine + structural-edit gating |
| M1-C | PLANNED | Rigid body + gravity + integrator |
| M1-D | PLANNED | Primitive collision (sphere/box/plane) + response |
| M1-E | PLANNED | Force/impulse + runtime logs |
| M1-F | PLANNED | Reset + wiring + acceptance evidence |

## Dependency map

M1-A (done) → M1-B → M1-C → M1-D → M1-E → M1-F

M1-B gates all physics work. M1-C and M1-D are sequential (collision needs rigid body). M1-E depends on M1-C/D. M1-F depends on M1-B..E.

## Critical path

M1-A (done) → M1-B → M1-C → M1-D → M1-E → M1-F.

## Decisions required from Project Owner

- M1-B: six decisions in `M1_B_PROJECT_OWNER_DECISION_BRIEF.md` (snapshot semantics, Play/Pause/Stop/Reset, gating, runtime store, failure recovery, integrator details).
- M1-C: fixed timestep value, integrator approach.
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
