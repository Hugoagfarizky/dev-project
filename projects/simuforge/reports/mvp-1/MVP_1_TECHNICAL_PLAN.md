# SimuForge — MVP-1 Technical Plan (M1-A..M1-F)

**Date:** 2026-11-10  
**Status:** Planning only — MVP-1 implementation NOT AUTHORIZED  
**Approved decisions:** D-01..D-06 (see `MVP_1_OWNER_DECISIONS.md`)  
**Baseline:** `main` @ `7a8597a` (MVP-0 accepted)

## 1. Component model (D-02 attached list)

- `WorldEntity` gains optional `components?: Component[]`.
- `Component` base: `{ id: string; type: string; enabled: boolean }`.
- `RigidBodyComponent`: `{ type: 'rigidBody'; mass: number; useGravity: boolean; collider: { kind: 'sphere'|'box'|'plane'; size: Vec3 | number }; velocity: Vec3; angularVelocity: Vec3 }`.
- Component ids are UUIDs (reuse existing generator).
- Component ownership: one entity owns its component list; no cross-entity references in MVP-1.
- Lifecycle: `component/add`, `component/remove`, `component/set` store dispatches; reducer validates.
- Domain layer (`src/world/**`) must not import Babylon/React/DOM (M0-AC-23). Component data model lives in world module; physics integration lives in renderer/runtime layer.

## 2. Serialization and persistence

- Components are part of `WorldEntity` → persisted in `ProjectDocument` envelope (ADR 0003).
- Schema version remains 1 unless Owner approves a bump. Adding optional `components` field is backward-compatible (undefined = no components).
- Unknown component types on load: preserve in metadata or reject with validation error (recommend: reject with `INVALID_METADATA` to avoid silent data loss; Owner to confirm).
- Runtime state (velocity during play) is NOT persisted; initial values (mass, collider) are persisted.
- Round-trip tests (M0-AC-24) extended to cover components.

## 3. Physics integration boundary

- Physics module (new, outside `src/world/**`) owns: integrator, collision detection, force application.
- Reads authored state (transform, components) from store; writes runtime state via store dispatch or a dedicated runtime store.
- Separation: authored state (persisted) vs runtime state (in-memory, resettable).
- Transform commits from gizmo/Inspector must be suppressed or queued while Running (D-04).
- Renderer applies runtime transforms to meshes during simulation.

## 4. M1-A technical plan (component system)

- Objective: attach/list/remove/validate components on entities; serialize/deserialize; unit tests.
- Scope: component data model, reducer commands, validation, serialization round-trip.
- Non-scope: no physics, no runtime, no UI beyond Inspector readout.
- Dependencies: MVP-0 foundation.
- Acceptance: add/remove component via store; persists and reloads; invalid component rejected; existing 71 tests pass.
- Tests: component lifecycle, validation, serialization, duplicate identity, regression.
- Evidence: unit tests only (no browser needed for M1-A).

## 5. M1-B..M1-F milestone plan

| Milestone | Objective | Scope | Non-scope | Dependencies | Acceptance | Test strategy | Evidence |
|---|---|---|---|---|---|---|---|
| M1-A | Component system | data model, reducer, validation, serialization | physics, runtime, UI | MVP-0 | add/remove/validate/persist components | unit tests | test results |
| M1-B | Runtime state machine | Editing/Running/Paused, Play/Pause/Stop/Reset, structural-edit gating, UI controls | physics | M1-A | state transitions, gating | unit + CDP | screenshots + JSON |
| M1-C | Rigid body + gravity | RigidBodyComponent, integrator, gravity application | collision, force | M1-A, M1-B | ball falls under gravity | unit + CDP | trajectory evidence |
| M1-D | Collision | primitive colliders (sphere/box/plane), response | mesh collision, CCD | M1-C | floor stops ball | unit + CDP | contact evidence |
| M1-E | Force/impulse + logs | apply force/impulse, Console runtime logs | advanced forces | M1-C, M1-D | force changes motion | unit + CDP | evidence |
| M1-F | Reset + wiring + acceptance | snapshot restore, Play/Pause/Stop wiring, acceptance evidence | MVP-2/3 scope | M1-B..E | full §7.3 criteria | full suite + CDP | full evidence set |

## 6. M1-A readiness reassessment

| # | Condition | Status | Evidence | Blocking? | Resolution |
|---|---|---|---|---|---|
| 1 | Physics approach | APPROVED (D-01) | Owner decision | No | in-house |
| 2 | Component model | APPROVED (D-02) | Owner decision | No | attached list |
| 3 | Collision scope | APPROVED (D-03) | Owner decision | No | primitives |
| 4 | Demo scope | APPROVED (D-05) | Owner decision | No | ball-floor-button |
| 5 | Performance targets | APPROVED (D-06) | Owner decision | No | measure only |
| 6 | M1-A authorization | NOT AUTHORIZED | — | Yes | Owner must authorize |

**Verdict: READY WITH CONDITIONS** — conditions 1–5 resolved; condition 6 (M1-A authorization) remains the gate.

## 7. Explicit statement

MVP-1 implementation is NOT AUTHORIZED. This is a planning document. No source, config, test, or evidence changes made beyond documentation. No commit/push performed in this step (commit performed per task instruction for planning docs).
