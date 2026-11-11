# SimuForge — M1-D Implementation Report

**Date:** 2026-11-11  
**Milestone:** M1-D — Collision System  
**Status:** IMPLEMENTED — all acceptance criteria pass with evidence  
**Authorization:** Project Owner authorized M1-C closure documentation and M1-D implementation only (M1-E and M1-F remain NOT AUTHORIZED)  
**Implementation commit:** `b539306` (implementation + acceptance evidence)

## 1. M1-C closure status

M1-C is recorded as **CLOSED (implementation-complete)** based on its reported implementation and validation evidence. This closure is a documentation decision, not a new independent audit.

| Item | Recorded value |
|---|---|
| M1-C implementation commit | `ebc8c21` |
| M1-C report hash-update commit | `40342c0` |
| Acceptance criteria | 16/16 PASS (`M1_C_IMPLEMENTATION_REPORT.md`) |
| Full test suite at closure | 113/113 PASS |
| Typecheck / build / boundary / token / Node checks | PASS |
| Trajectory evidence | `reports/mvp-1/evidence/m1c-trajectory.json` |
| Remote state | both commits present on `origin/main` |

The original M1-C report and trajectory evidence are preserved unchanged. No M1-C source behavior was modified to improve accepted behavior; M1-D only extends the runtime layer.

## 2. M1-D authorization and scope

Authorized scope, derived from the approved MVP-1 documentation:

- `MVP_1_TECHNICAL_PLAN.md` §5: “primitive colliders (sphere/box/plane), response”; non-scope “mesh collision, CCD”; acceptance “floor stops ball”; evidence “contact evidence”.
- `MVP_1_DISCOVERY_AND_PLANNING.md` §7: M1-D = collision detection (plane/sphere/box) + response; dependency M1-C.
- `MVP_1_OWNER_DECISIONS.md` D-03: primitive colliders only.
- `MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`: the collision response algorithm was reserved for Owner approval.

Explicitly **not** in M1-D: force/impulse and runtime logs (M1-E), full authoring UI and browser acceptance evidence (M1-F), mesh collision, CCD, advanced rigid-body simulation, friction/restitution models, and dynamic-vs-dynamic collision response.

## 3. Initial repository baseline

| Item | Value |
|---|---|
| Branch / HEAD | `main` @ `40342c004f2a3005286254e3c1e37df0a1d33483` |
| Remote | `origin/main` at the same commit |
| M1-C commits on `origin/main` | `ebc8c21` (implementation), `40342c0` (report hash update) |
| Baseline tests | 113/113 PASS |
| Baseline typecheck / build / boundary / token / Node checks | PASS |
| Existing M1-C closure document | none; closure recorded in the roadmap and handoff from reported evidence |
| Known pre-existing changes | 3 modified MVP-0 reports + untracked root `package-lock.json` (left untouched) |
| Preserved local branch | `wip/m1c-physics-scratch` @ `a566c98` (not merged, reset, or modified) |

## 4. Owner decisions used

### Previously approved

| ID | Decision |
|---|---|
| D-01 | In-house physics; no new physics library |
| D-03 | Primitive colliders: sphere, box, plane |
| D-04 | Structural editing only in Editing; Running and Paused lock structural edits |
| D-M1C-01 | Fixed timestep 1/60 s + simple accumulator; frame delta clamped to 0.25 s |
| D-M1C-02 | Semi-implicit Euler |
| D-M1C-03 | Gravity −9.81 m/s² on Y |

### M1-D decision approved 2026-11-11

| ID | Decision | Approved value |
|---|---|---|
| D-M1D-01 | Collision response contract | Plane contacts, fully inelastic |

D-M1D-01 resolves the response algorithm reserved by the roadmap. The approved contract is:

- Dynamic sphere/box colliders collide with **static infinite plane** colliders.
- Sphere collider size is the **radius**.
- Box collider size is the **full extents** (half-extents are derived as `size / 2`).
- A plane collider is a **horizontal plane at the body position with a +Y normal**; plane rotation and scale are ignored.
- Response is **positional penetration correction plus removal of the inbound normal velocity**.
- **Restitution 0, friction 0, no angular response.**
- **Dynamic-vs-dynamic collisions are deferred.**
- Collider sizes are world-space; authored transform scale is not applied to colliders in M1-D.

The decision is recorded in `MVP_1_OWNER_DECISIONS.md` as an addendum. No other physical behavior was invented.

## 5. Implemented architecture

### Runtime collider model (`src/runtime/types.ts`)

`RuntimeBody` now carries a `RuntimeCollider`:

- `{ kind: 'sphere'; radius }`
- `{ kind: 'box'; halfExtents }`
- `{ kind: 'plane' }`

Colliders are derived from the authored `RigidBodyComponent` at Play and are never persisted. Plane bodies are retained in runtime state so dynamic bodies can collide with them, but they are never integrated.

### Collision processing (`src/runtime/physics.ts`)

- `createRuntimeBodies` derives collider geometry and validates sphere/box sizes.
- `stepBodies` integrates dynamic sphere/box bodies with the existing semi-implicit Euler step, leaves plane bodies static, then resolves plane contacts.
- `resolvePlaneCollisions` processes planes in deterministic entity-id order:
  - detects penetration from the body's lowest Y point (`position.y − radius` or `position.y − halfExtents.y`);
  - corrects the body to `planeY + radius` or `planeY + halfExtents.y`;
  - removes downward normal velocity;
  - leaves horizontal velocity untouched (friction 0);
  - never applies an upward impulse (restitution 0).
- `advanceSimulation` keeps the existing fixed-step accumulator and catches collision failures. On failure it returns the **last valid bodies and accumulator** plus a `SimulationFailure` diagnostic instead of committing partial state.
- Failure codes: `COLLISION_INVALID_STATE`, `COLLISION_INVALID_COLLIDER`, `RUNTIME_STEP_FAILED`.

### Reducer integration (`src/editor/reducer.ts`)

- `runtime/step` integrates collision processing through the existing `advanceSimulation` call.
- On a collision failure, the reducer pauses (`status: 'paused'`), preserves the last valid bodies/accumulator, sets `runtime.lastError`, and appends an error entry to the Console (`source: RUNTIME`).
- `runtime/play` and `runtime/reset` also handle collider-derivation failures: Play stays in Editing with a diagnostic; Reset pauses and preserves the last valid state.
- The existing M1-B structural-edit gate, snapshot/reset/stop semantics, and dirty-revision rule are unchanged.
- No new dependency, command, schema version, or persisted field was added.

### Runtime/authored isolation (ADR 0003)

- Collision writes only `runtime.bodies`.
- Authored `project.world` transforms and components are never mutated while running.
- Runtime collision state is absent from serialized project JSON.
- `selectRenderWorld` continues to overlay runtime transforms for rendering only.

## 6. Acceptance criteria matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Sphere, box, and plane colliders are derived from authored rigid bodies | PASS | `test/runtime/collision.test.ts`: “createRuntimeBodies derives sphere radius, box half-extents, and plane colliders” |
| 2 | Sphere collider size is the radius | PASS | Same test; sphere rests at `planeY + 0.5` |
| 3 | Box collider size is full extents | PASS | Same test: size `{2,1,2}` → half-extents `{1,0.5,1}` |
| 4 | Plane is a static infinite horizontal plane at the body position | PASS | “plane bodies are static under gravity”; “plane rotation and scale do not change the collision height” |
| 5 | A floor prevents a falling sphere from passing through it (spec §7.3) | PASS | “a falling sphere rests on a plane at radius height…”; editor test “play and fixed steps stop the ball on the floor…” |
| 6 | A floor prevents a falling box from passing through it | PASS | “a falling box rests on a plane at half-height” |
| 7 | Penetration is corrected positionally | PASS | “a body starting below the plane is corrected to the surface” |
| 8 | Inbound normal velocity is removed; restitution is zero | PASS | “contact has no restitution and never produces upward velocity”; “a resting body remains at rest…” |
| 9 | Friction is zero; horizontal velocity is preserved | PASS | “horizontal velocity is preserved on contact (zero friction)” |
| 10 | No angular response is applied | PASS | `angularVelocity` is not read or written by the collision layer; no rotation integration was added |
| 11 | Plane bodies do not move even with gravity or authored velocity | PASS | “plane bodies are static under gravity” |
| 12 | Multiple planes resolve deterministically to the highest surface | PASS | “multiple planes resolve to the highest surface deterministically” |
| 13 | Collision integrates with the fixed-step runtime | PASS | `advanceSimulation` calls `stepBodies` per fixed step; all collision tests use `FIXED_TIMESTEP_SECONDS` |
| 14 | Collision is deterministic across identical fixed-step runs | PASS | “collision resolution is deterministic for identical inputs”; “store-driven collision is deterministic across identical runs” |
| 15 | Authored state is not mutated during collision | PASS | Editor test “play and fixed steps stop the ball on the floor without mutating authored state”; pure test “stepBodies does not mutate its input bodies…” |
| 16 | Runtime collision state is never persisted and does not dirty the project | PASS | “serialized project excludes runtime collision state”; “runtime/step does not mark the project dirty after a collision” |
| 17 | Reset restores the pre-collision runtime state | PASS | “runtime/reset restores the pre-collision runtime body” |
| 18 | Stop clears runtime collision state and returns to Editing | PASS | “runtime/stop clears runtime collision state and restores authored state” |
| 19 | Pause freezes a resting body; Resume continues safely | PASS | “pause after contact freezes the resting body”; “resume after contact keeps the body resting on the floor” |
| 20 | Structural-edit gating is preserved after collision | PASS | “structural edits remain blocked after a collision” |
| 21 | Collision failure pauses safely, preserves the last valid state, and logs diagnostics | PASS | “collision failure pauses safely…”; “stop recovers from a collision failure”; “play with an invalid authored collider reports a diagnostic and stays editing” |
| 22 | Dynamic-vs-dynamic collision is explicitly deferred and does not affect M1-D acceptance | PASS | “dynamic bodies do not collide with each other in M1-D”; limitation documented in §9 |
| 23 | Existing M1-A/M1-B/M1-C behavior is preserved | PASS | Full suite 143/143; all 113 baseline tests pass unchanged |
| 24 | Contact evidence is produced | PASS | `reports/mvp-1/evidence/m1d-contact.json` (sphere and box contact, deterministic) |

## 7. Tests and validation evidence

Toolchain: Node **v24.22.2** (pinned by `engines` and `check:node`). The host default is v24.21.0, so the official v24.22.2 Windows binary in the approved temp directory was prepended to `PATH` for the validation run. No repository file was changed to bypass the check.

| Command | Result |
|---|---|
| `node --experimental-strip-types --test test/runtime/collision.test.ts test/editor/runtime-collision.test.ts` | **30/30 PASS** (17 runtime + 13 editor) |
| `npm test` | **143/143 PASS** (113 baseline + 30 new) |
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm run build` (`tsc --noEmit && vite build`) | PASS (pre-existing chunk-size and ineffective-dynamic-import warnings only) |
| `npm run check:node` | PASS — “Node version OK: v24.22.2” |
| `npm run check:boundaries` | PASS — 5 files scanned in `src/world` |
| `npm run check:tokens` | PASS — all contrast pairs pass |
| `npm run evidence:m1d` | PASS — wrote `m1d-contact.json` |

### Contact evidence summary

Sphere (radius 0.5) and box (size `{2,1,2}`) each start at `y = 5` above a plane at `y = 0`. After 120 fixed steps (2.0 s):

- sphere final `positionY = 0.5`, `velocityY = 0`;
- box final `positionY = 0.5`, `velocityY = 0`;
- first contact at frame 57 for both;
- authored `positionY` remains `5`;
- no rebound, no horizontal velocity change, and no dynamic-vs-dynamic response.

## 8. Changed files

Source:

- `app/src/runtime/types.ts` — `RuntimeCollider`, `RuntimeBody.collider`
- `app/src/runtime/physics.ts` — collider derivation, static planes, contact resolution, failure result
- `app/src/editor/reducer.ts` — collision failure handling in `runtime/step`, `runtime/play`, `runtime/reset`

Tests and tooling:

- `app/test/runtime/collision.test.ts` (new, 17 tests)
- `app/test/editor/runtime-collision.test.ts` (new, 13 tests)
- `app/package.json` — test list + `evidence:m1d` script
- `app/scripts/m1d-contact-evidence.mjs` (new)

Evidence and documentation:

- `reports/mvp-1/evidence/m1d-contact.json` (new)
- `reports/mvp-1/M1_D_IMPLEMENTATION_REPORT.md` (this report)
- `reports/mvp-1/MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`
- `reports/mvp-1/MVP_1_NEXT_PHASE_READINESS_REPORT.md`
- `reports/mvp-1/MVP_1_OWNER_DECISIONS.md`
- `reports/mvp-0/PROJECT_HANDOFF.md`

No MVP-0 source, no root `package-lock.json`, and none of the three pre-existing modified MVP-0 reports were changed or staged.

## 9. Known limitations

- **Dynamic-vs-dynamic collisions are deferred.** Only dynamic sphere/box vs static plane contacts are resolved.
- **Planes are horizontal only.** Plane rotation and scale are ignored; the plane is an infinite half-space at the body's Y position with a +Y normal.
- **Dynamic collider scale is ignored.** Sphere radius and box half-extents are world-space values from the authored collider; authored transform scale is not applied.
- **Box rotation is ignored.** Box-plane contact uses only the vertical half-extent.
- **No friction, restitution, or angular response.** These behaviors were explicitly excluded by D-M1D-01.
- **No CCD.** A plane is a half-space, so bodies cannot tunnel through it; fast dynamic bodies can still pass through each other because dynamic-vs-dynamic collision is deferred.
- **Invalid collider geometry fails safely.** Non-positive or non-finite sphere/box sizes produce `COLLISION_INVALID_COLLIDER` and pause with a diagnostic rather than silently simulating.
- **Multiple enabled rigid bodies on one entity:** the first enabled `rigidBody` component is still used (existing M1-C behavior).
- **No browser/CDP evidence in M1-D.** Evidence is deterministic unit/integration tests plus generated contact JSON. Browser acceptance evidence remains M1-F scope.
- **Performance not measured.** D-06 requires measurement, not a numeric target; no premature optimization was added.

## 10. Deferred functionality

- M1-E: force/impulse application and runtime logs (other than collision failure diagnostics).
- M1-F: full authoring UI, Play/Pause/Stop/Reset acceptance wiring, and browser acceptance evidence.
- Advanced rigid-body simulation, dynamic-vs-dynamic response, CCD, mesh colliders, friction/restitution, and angular dynamics.

## 11. Commit and push status

| Item | Status |
|---|---|
| Implementation commit | `b539306` |
| Report hash-update commit | the follow-up documentation commit containing this update |
| Push to `origin/main` | after the follow-up documentation commit; verified against remote HEAD |

This table is updated by the follow-up hash-update commit after the implementation commit is created and pushed.

## 12. Scope boundary confirmation

- M1-C is **CLOSED** based on its reported evidence.
- M1-D is **IMPLEMENTED** within the approved plane-contact, fully inelastic contract.
- **M1-E (force/impulse + runtime logs) is NOT implemented and remains NOT AUTHORIZED.**
- **M1-F (full reset/wiring/acceptance evidence) is NOT implemented and remains NOT AUTHORIZED.**
- No future-milestone functionality, no new dependency, and no persistence schema change entered the diff.
