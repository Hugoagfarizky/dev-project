# SimuForge — MVP-1 Owner Decisions (Final)

**Date recorded:** 2026-11-10  
**Authority:** Project Owner (final)  
**Scope:** Architecture direction and MVP-1 scope approval  
**Status:** APPROVED (6 decisions)

## Approved decisions

| ID | Area | Approved decision |
|---|---|---|
| D-01 | Physics | In-house physics; no new physics library |
| D-02 | Component architecture | Attached component list (not ECS) |
| D-03 | Collision | Primitive colliders: sphere, box, plane |
| D-04 | Simulation lifecycle | Structural editing only in Editing; Running and Paused lock structural edits |
| D-05 | Demo | Ball + rigid body + gravity + floor + impulse button |
| D-06 | Performance | Measure 10/50/100 objects; no mandatory numeric target |

## Scope of approval

- Approval applies to architecture direction and MVP-1 scope only.
- Discovery and review are complete.
- MVP-1 implementation is NOT AUTHORIZED.
- M1-A implementation is NOT AUTHORIZED.

## Not yet decided (detail-level, PROPOSED)

- Physics integrator details (fixed timestep value, solver iterations).
- Component data contract (exact schema, validation rules).
- Collider size representation and scaling interaction.
- Runtime snapshot contents and restore granularity.
- Performance measurement thresholds.
- Demo acceptance evidence format.

These remain PROPOSED in the technical plan and require further design/authorization.

## Traceability

- Discovery: `projects/simuforge/reports/mvp-1/MVP_1_DISCOVERY_AND_PLANNING.md`
- Review: `projects/simuforge/reports/mvp-1/MVP_1_DISCOVERY_REVIEW.md`
- Decision brief: `projects/simuforge/reports/mvp-1/MVP_1_PROJECT_OWNER_DECISION_BRIEF.md`
- Technical plan: `projects/simuforge/reports/mvp-1/MVP_1_TECHNICAL_PLAN.md`
- MVP-0 baseline: `projects/simuforge/reports/mvp-0/PROJECT_HANDOFF.md`

## Statement

MVP-0 remains ACCEPTED and CLOSED. MVP-1 implementation is NOT AUTHORIZED. Planning documents updated to reflect APPROVED status for D-01..D-06.

## Addendum — M1-C technical decisions (2026-11-11)

**Authority:** Project Owner, M1-C implementation authorization.

| ID | Area | Approved decision |
|---|---|---|
| D-M1C-01 | Fixed timestep | 1/60 s fixed step with a simple accumulator; frame delta clamped to 0.25 s |
| D-M1C-02 | Integrator | Semi-implicit (symplectic) Euler: velocity first, then position |
| D-M1C-03 | Gravity | −9.81 m/s² on the Y axis |

Scope: these decisions authorize M1-C implementation only. M1-D, M1-E, and M1-F remain NOT AUTHORIZED.

The “not yet decided” list above is preserved as the historical record of 2026-11-10; the M1-C integrator/timestep items are resolved by this addendum.

## Addendum — M1-D collision decision (2026-11-11)

**Authority:** Project Owner, M1-C closure and M1-D implementation authorization.

| ID | Area | Approved decision |
|---|---|---|
| D-M1D-01 | Collision response | Plane contacts, fully inelastic: dynamic sphere/box vs static infinite plane; positional penetration correction + removal of inbound normal velocity; restitution 0, friction 0, no angular response; dynamic-vs-dynamic collisions deferred |

Approved collider semantics:

- Sphere collider size is the radius.
- Box collider size is the full extents; half-extents are `size / 2`.
- A plane collider is a horizontal infinite plane at the body position with a +Y normal; plane rotation and scale are ignored.
- Collider sizes are world-space; authored transform scale is not applied to colliders in M1-D.

Scope: this decision authorizes M1-D implementation only. M1-E and M1-F remain NOT AUTHORIZED. The “not yet decided” list above is preserved as the historical record of 2026-11-10; the M1-D response item is resolved by this addendum.

## Addendum — M1-E force/impulse decisions (2026-11-11)

**Authority:** Project Owner, M1-E implementation authorization.

| ID | Area | Approved decision |
|---|---|---|
| D-M1E-01 | Force model | Persistent world-space force in newtons; applied every fixed step until `clearForce`, Reset, or Stop; repeated applications accumulate |
| D-M1E-02 | Impulse model | Instantaneous world-space momentum impulse in newton-seconds; `delta-v = impulse / mass`; no angular response |
| D-M1E-03 | Lifecycle, target, and logging | Accept in Running and Paused; reject Editing with `warn`; only dynamic sphere/box bodies; success logs `info`; invalid input/target logs `warn` with no state change; internal failure logs `error` and pauses |
| D-M1E-04 | UI scope | Runtime commands/API and logs only; no force/impulse UI; M1-F owns wiring, demo, and browser acceptance |

Approved force/impulse semantics:

- Force is applied at the center of mass; no torque or angular dynamics.
- Force acceleration is `F / mass`, combined with gravity in the existing semi-implicit Euler step.
- Impulse changes velocity immediately by `J / mass` and does not change position at application time.
- Runtime force/mass/velocity state is never persisted (ADR 0003); authored `project.world` is not mutated.

Scope: this decision authorizes M1-E implementation only. M1-F remains NOT AUTHORIZED. The “not yet decided” list above is preserved as the historical record of 2026-11-10; the force/impulse item is resolved by this addendum.

## Addendum — M1-F owner decisions (2026-11-11)

**Authority:** Project Owner, M1-F planning and readiness authorization. Implementation remains NOT AUTHORIZED until a separate explicit authorization.

| ID | Area | Approved decision |
|---|---|---|
| D-M1F-01 | M1-F scope | Full Product Spec §7.3 closure |
| D-M1F-02 | Force/impulse UI location | Inspector → Runtime Controls |
| D-M1F-03 | D-05 demo button | Implement the D-05 impulse button |
| D-M1F-04 | Browser acceptance tooling | Playwright/CDP, with compatibility verification before use |
| D-M1F-05 | Evidence format | JSON assertions + browser screenshots |
| D-M1F-06 | Runtime monitor scope | Console, lifecycle status, and selected object position/velocity |
| D-M1F-07 | Demo scenario loading | Explicit user action; Empty World remains empty |
| D-M1F-08 | Save/reopen acceptance | Included in browser acceptance |

Scope: these decisions authorize M1-F planning and readiness only. M1-F implementation is still NOT AUTHORIZED. The planning document is `M1_F_IMPLEMENTATION_PLAN.md`.
