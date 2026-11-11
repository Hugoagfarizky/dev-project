# SimuForge — M1-E Implementation Report

**Date:** 2026-11-11  
**Milestone:** M1-E — Force & Impulse + runtime logs  
**Status:** CLOSED (PASS) — official Project Owner closure 2026-11-11; all acceptance criteria pass with evidence  
**Authorization:** Project Owner authorized M1-E implementation and official closure (M1-F remains NOT AUTHORIZED)  
**Implementation commit:** `fe5eae3` (implementation + acceptance evidence)  
**Documentation commit:** `a6a0aaa` (implementation commit hash record); closure documentation commit pending

## 1. Authorization and scope

Authorized scope, derived from the approved MVP-1 documentation:

- `MVP_1_TECHNICAL_PLAN.md` §5: “apply force/impulse, Console runtime logs”; non-scope “advanced forces”; acceptance “force changes motion”; evidence “evidence”.
- `MVP_1_DISCOVERY_AND_PLANNING.md` §7: M1-E = force/impulse application + runtime logs; dependency M1-C, M1-D.
- `MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`: M1-E force semantics were reserved for Owner approval.
- Product specification §7.3: “Applying a force or impulse changes the ball’s motion.”

Explicitly **not** in M1-E:

- M1-F wiring, demo acceptance, browser/CDP evidence, or authoring UI.
- Advanced forces (fields, drag, springs, force-at-point/torque).
- Angular dynamics, friction, restitution, or dynamic-vs-dynamic collision response.
- Persistence schema changes.

## 2. Initial repository baseline

| Item | Value |
|---|---|
| Branch / HEAD | `main` @ `f6481366540af2abe63c59e7bd00ed9397383043` |
| Remote | `origin/main` at the same commit |
| Baseline tests | 143/143 PASS |
| Baseline typecheck / build / boundary / token / Node checks | PASS |
| Known pre-existing changes | 3 modified MVP-0 reports + untracked root `package-lock.json` (left untouched) |
| Preserved local branch | `wip/m1c-physics-scratch` @ `a566c98` (not merged, reset, or modified) |

## 3. Owner decisions used

### Previously approved decisions preserved

| ID | Decision |
|---|---|
| D-01 | In-house physics; no new physics library |
| D-03 | Primitive colliders: sphere, box, plane |
| D-04 | Structural editing only in Editing; Running and Paused lock structural edits |
| D-M1C-01 | Fixed timestep 1/60 s + simple accumulator; frame delta clamped to 0.25 s |
| D-M1C-02 | Semi-implicit Euler |
| D-M1C-03 | Gravity −9.81 m/s² on Y |
| D-M1D-01 | Plane contacts, fully inelastic; restitution 0, friction 0, no angular response |

### M1-E decisions approved 2026-11-11

| ID | Area | Approved decision |
|---|---|---|
| D-M1E-01 | Force model | Persistent world-space force in newtons; applied every fixed step until `clearForce`, Reset, or Stop; repeated applications accumulate |
| D-M1E-02 | Impulse model | Instantaneous world-space momentum impulse in newton-seconds; `delta-v = impulse / mass`; no angular response |
| D-M1E-03 | Lifecycle, target, and logging | Accept in Running and Paused; reject Editing with `warn`; only dynamic sphere/box bodies; success logs `info`; invalid input/target logs `warn` with no state change; internal failure logs `error` and pauses |
| D-M1E-04 | UI scope | Runtime commands/API and logs only; no force/impulse UI; M1-F owns wiring, demo, and browser acceptance |

The decisions are recorded in `MVP_1_OWNER_DECISIONS.md`. No previously approved M1-B/C/D behavior was reopened.

## 4. Implemented architecture

### Runtime body model (`src/runtime/types.ts`)

`RuntimeBody` now carries:

- `mass`: authored mass in kg, captured at Play and used for force/impulse.
- `force`: runtime-only accumulated force in newtons. It is applied every fixed step and never persisted (ADR 0003).

Both fields are runtime-only. Authored `RigidBodyComponent.mass` remains the source value.

### Force and impulse physics (`src/runtime/physics.ts`)

- `createRuntimeBodies` captures authored mass, initializes the force accumulator to zero, and rejects non-finite or non-positive mass with `FORCE_INVALID_MASS`.
- `applyForce` adds a world-space force in newtons to a dynamic body’s accumulator. The input bodies are not mutated.
- `applyImpulse` applies an instantaneous world-space impulse in newton-seconds: `velocity += impulse / mass`. Position is unchanged at application time.
- `clearForce` clears one dynamic body or all bodies when no target is specified.
- `stepBodies` applies force acceleration before gravity in the existing semi-implicit Euler order:

  ```text
  acceleration = force / mass + (0, gravityY, 0) if useGravity
  velocity += acceleration * dt
  position += velocity * dt
  ```

  Plane contact resolution remains unchanged from M1-D.
- Force is applied at the center of mass; no torque or angular response is added.

### Reducer commands (`src/editor/commands.ts`, `src/editor/reducer.ts`)

New runtime commands:

- `runtime/apply-force` with `{ entityId, force: Vec3 }`
- `runtime/apply-impulse` with `{ entityId, impulse: Vec3 }`
- `runtime/clear-force` with optional `{ entityId }` (omit to clear all)

Lifecycle behavior:

- **Editing:** rejected with `RUNTIME_NOT_ACTIVE` at `warn`; runtime state is unchanged.
- **Running:** accepted; force is stored for subsequent fixed steps; impulse changes velocity immediately.
- **Paused:** accepted; force is stored for the next resumed step; impulse changes velocity immediately while remaining paused.
- **Reset:** recreates runtime bodies from the snapshot, clearing force and restoring authored velocity/position; Running/Paused status is preserved.
- **Stop:** clears runtime state and returns to Editing.

### Console logging

All entries use `source: RUNTIME` and the existing 500-entry cap.

| Situation | Severity | Code |
|---|---|---|
| Force applied | `info` | `FORCE_APPLIED` |
| Impulse applied | `info` | `IMPULSE_APPLIED` |
| Force cleared | `info` | `FORCE_CLEARED` |
| Operation attempted in Editing | `warn` | `RUNTIME_NOT_ACTIVE` |
| Non-finite force/impulse | `warn` | `FORCE_INVALID_INPUT` / `IMPULSE_INVALID_INPUT` |
| Unknown or static target | `warn` | `FORCE_INVALID_TARGET` / `IMPULSE_INVALID_TARGET` |
| Invalid runtime mass | `error` | `FORCE_INVALID_MASS` / `IMPULSE_INVALID_MASS` |
| Non-finite force/velocity state | `error` | `FORCE_INVALID_STATE` / `IMPULSE_INVALID_STATE` |

Validation warnings do not set `runtime.lastError` and do not change runtime status. Internal errors pause the simulation, preserve the last runtime state, set `runtime.lastError`, and append an error entry.

### Runtime/authored isolation (ADR 0003)

- Force/impulse writes only `runtime.bodies`.
- Authored `project.world` transforms and components are never mutated while running.
- Runtime force/mass/velocity state is absent from serialized project JSON.
- The project does not become dirty from force/impulse operations.
- `selectRenderWorld` continues to overlay runtime transforms for rendering only.

## 5. Acceptance criteria matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Force is a world-space value in newtons | PASS | `test/runtime/force.test.ts`: “a persistent force accelerates a body across fixed steps”; evidence `m1e-force-impulse.json` |
| 2 | Force persists across fixed steps until cleared | PASS | Same test; `forcePersistsAcrossSteps` evidence assertion |
| 3 | Repeated force applications accumulate | PASS | “applyForce accumulates force without mutating its input bodies”; editor “runtime/apply-force accumulates repeated applications” |
| 4 | Force acceleration is `F / mass` | PASS | “force acceleration scales inversely with mass” |
| 5 | Mass affects acceleration inversely | PASS | Same test; light/heavy mass evidence |
| 6 | Impulse is a world-space momentum value in N·s | PASS | “applyImpulse changes velocity immediately by impulse over mass and leaves position unchanged” |
| 7 | Impulse changes velocity immediately by `J / mass` | PASS | Same test; `impulseImmediateVelocity` evidence assertion |
| 8 | Impulse does not move the body at application time | PASS | Same test; `impulseImmediatePositionUnchanged` evidence assertion |
| 9 | Impulse is instantaneous and is not reapplied each step | PASS | “impulse is instantaneous and is not reapplied on subsequent steps” |
| 10 | Force combines correctly with gravity | PASS | “force combines with gravity and can cancel it exactly” |
| 11 | Force interacts correctly with plane contact | PASS | “downward force on a resting body is absorbed by plane contact”; “an upward force can lift a body off a plane”; editor integration test |
| 12 | Force can be applied while Running | PASS | Editor “runtime/apply-force while running stores a persistent force and logs info” |
| 13 | Force/impulse can be applied while Paused | PASS | Editor “runtime/apply-force while paused…” and “runtime/apply-impulse while paused…” |
| 14 | Force/impulse are rejected while Editing with a warning | PASS | Editor “force and impulse are rejected while editing with warnings and no runtime mutation” |
| 15 | `clearForce` stops persistent acceleration | PASS | “clearForce stops persistent acceleration without changing velocity”; editor “runtime/clear-force stops persistent acceleration…” |
| 16 | `clearForce` supports one target or all bodies | PASS | “clearForce clears every runtime force when no target is specified”; editor all-force test |
| 17 | Reset clears force/impulse state and restores authored values | PASS | Editor “runtime/reset clears force and impulse state and restores authored values” |
| 18 | Stop clears runtime force state and returns to Editing | PASS | Editor “runtime/stop clears force and impulse state and returns to editing” |
| 19 | Non-finite input is rejected safely without partial state | PASS | Pure and editor invalid force/impulse tests |
| 20 | Unknown and static-plane targets are rejected safely | PASS | Pure and editor target tests |
| 21 | Invalid mass fails safely | PASS | Pure invalid-mass tests; editor “play with an invalid authored mass reports a diagnostic and stays editing” |
| 22 | Internal force/impulse failure pauses and preserves the last runtime state | PASS | Editor internal force/impulse failure tests |
| 23 | Authored state is not mutated and the project is not dirtied | PASS | Editor “force and impulse do not mutate authored state or mark the project dirty” |
| 24 | Runtime force state is not serialized | PASS | Editor “serialized project excludes runtime force state” |
| 25 | Console severity/source/codes are consistent | PASS | Editor logging assertions across success, warning, and error cases |
| 26 | Force/impulse behavior is deterministic | PASS | “force and impulse simulation is deterministic for identical inputs” |
| 27 | M1-B/M1-C/M1-D behavior is preserved | PASS | Full suite 186/186; all 143 baseline tests pass unchanged |
| 28 | Reproducible force/impulse evidence is produced | PASS | `reports/mvp-1/evidence/m1e-force-impulse.json` |
| 29 | No force/impulse UI or M1-F scope is introduced | PASS | Source diff contains runtime commands/physics/tests/docs only |

## 6. Tests and validation evidence

Toolchain: Node **v24.22.2** (pinned by `engines` and `check:node`). The host default is v24.21.0, so the official v24.22.2 Windows binary in the approved temp directory was prepended to `PATH` for the validation run. No repository file was changed to bypass the check.

| Command | Result |
|---|---|
| `node --experimental-strip-types --test test/runtime/force.test.ts` | **20/20 PASS** |
| `node --experimental-strip-types --test test/editor/runtime-force.test.ts` | **23/23 PASS** |
| `npm test` | **186/186 PASS** (143 baseline + 43 new) |
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm run build` (`tsc --noEmit && vite build`) | PASS (pre-existing chunk-size and ineffective-dynamic-import warnings only) |
| `npm run check:node` | PASS — “Node version OK: v24.22.2” |
| `npm run check:boundaries` | PASS — 5 files scanned in `src/world` |
| `npm run check:tokens` | PASS — all contrast pairs pass |
| `npm run evidence:m1e` | PASS — wrote `m1e-force-impulse.json` |

### Force/impulse evidence summary

- A 2 kg body with a persistent 10 N force and no gravity reaches `v = 5 m/s` and `y = 7.541666667` after 60 fixed steps (1.0 s).
- A 4 kg body under the same force reaches `v = 2.5 m/s`, confirming inverse mass scaling.
- A 10 N·s impulse on a 2 kg body immediately changes velocity by `5 m/s` without changing position; after 60 steps the velocity is still `5 m/s` and `y = 10`.
- A 19.62 N upward force exactly cancels gravity on a 2 kg body (`v = 0`, `y = 5`).
- A downward force on a body resting on a plane keeps it at the surface (`y = 0.5`, `v = 0`) while the force remains active.
- Clearing force stops further acceleration while preserving the current velocity.
- All evidence assertions pass; authored positions remain unchanged.

## 7. Changed files

Source:

- `app/src/runtime/types.ts` — `RuntimeBody.mass`, `RuntimeBody.force`
- `app/src/runtime/physics.ts` — mass capture/validation, force/impulse/clear operations, force integration, failure codes
- `app/src/editor/commands.ts` — `runtime/apply-force`, `runtime/apply-impulse`, `runtime/clear-force`
- `app/src/editor/reducer.ts` — lifecycle handling, success/warning/error logging, no-partial-commit behavior

Tests and tooling:

- `app/test/runtime/force.test.ts` (new, 20 tests)
- `app/test/editor/runtime-force.test.ts` (new, 23 tests)
- `app/package.json` — test list + `evidence:m1e` script
- `app/scripts/m1e-force-evidence.mjs` (new)

Evidence and documentation:

- `reports/mvp-1/evidence/m1e-force-impulse.json` (new)
- `reports/mvp-1/M1_E_IMPLEMENTATION_REPORT.md` (this report)
- `reports/mvp-1/MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`
- `reports/mvp-1/MVP_1_OWNER_DECISIONS.md`
- `reports/mvp-1/MVP_1_NEXT_PHASE_READINESS_REPORT.md`
- `reports/mvp-0/PROJECT_HANDOFF.md`

No MVP-0 source, no root `package-lock.json`, and none of the three pre-existing modified MVP-0 reports were changed or staged.

## 8. Known limitations

- **No force/impulse UI in M1-E.** The capability is exposed through runtime commands/store dispatch only. Buttons, panels, and demo wiring are M1-F scope.
- **No browser/CDP acceptance evidence.** M1-E evidence is deterministic unit/integration tests plus generated JSON; browser acceptance remains M1-F.
- **Center-of-mass force only.** No force-at-point, torque, or angular impulse. This is consistent with the approved M1-D no-angular-response contract.
- **No advanced forces.** Force fields, drag, springs, and force curves are out of scope.
- **No friction or restitution.** Inherited from D-M1D-01.
- **No dynamic-vs-dynamic collision.** Inherited from D-M1D-01.
- **Force accumulation is unbounded.** Repeated applications can produce very large forces; non-finite results fail safely and pause rather than committing partial state.
- **Invalid authored mass now fails Play.** This is a defensive extension of the existing collider-validation behavior; valid authored mass is unchanged.
- **Multiple enabled rigid bodies on one entity:** the first enabled `rigidBody` component is still used (existing M1-C behavior).
- **No force visualization or runtime monitor readout.** Not part of M1-E.

## 9. Deferred functionality

- M1-F: full authoring/runtime UI wiring, D-05 demo impulse button, browser acceptance evidence, and full §7.3 acceptance closure.
- Advanced rigid-body simulation, angular dynamics, friction/restitution, dynamic-vs-dynamic response, CCD, mesh colliders, and force visualization.

## 10. Commit and push status

| Item | Status |
|---|---|
| Implementation commit | `fe5eae3` — implementation + acceptance evidence |
| Push to `origin/main` | completed; remote HEAD verified after the report-update commit |

This table is updated by the follow-up hash-update commit after the implementation commit is created and pushed.

## 11. Scope boundary confirmation

- M1-E is **IMPLEMENTED** within the approved force/impulse contract and passes all acceptance criteria with evidence.
- M1-E is pending Project Owner closure acceptance; it is not marked CLOSED by this report.
- **M1-F is NOT implemented and remains NOT AUTHORIZED.**
- No future-milestone functionality, no new dependency, no UI wiring, and no persistence schema change entered the diff.
