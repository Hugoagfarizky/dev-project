# SimuForge — M1-C Implementation Report

**Date:** 2026-11-11  
**Milestone:** M1-C — Rigid Body + Gravity + Integrator  
**Status:** IMPLEMENTED — all acceptance criteria pass with evidence; pending post-implementation closure audit / Owner acceptance  
**Authorization:** Project Owner authorized M1-C implementation only (M1-D, M1-E, M1-F remain NOT AUTHORIZED)  
**Commit:** (recorded after commit)

## 1. Scope and authorization

M1-C implements the milestone defined in the approved MVP-1 documentation:

- `MVP_1_TECHNICAL_PLAN.md` §5: “Rigid body + gravity”, scope “RigidBodyComponent, integrator, gravity application”, non-scope “collision, force”, acceptance “ball falls under gravity”.
- `MVP_1_DISCOVERY_AND_PLANNING.md` §7: M1-C = rigid body + gravity + integrator; depends on M1-A and M1-B.
- `MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`: M1-C decisions were “fixed timestep value, integrator approach”.

Explicitly **not** in M1-C: collision detection/response (M1-D), force/impulse and runtime logs (M1-E), full Play/Pause/Stop wiring and acceptance evidence (M1-F).

## 2. Owner decisions applied

The Project Owner approved the two decisions the roadmap reserved for M1-C on 2026-11-11:

| ID | Decision | Approved value |
|---|---|---|
| D-M1C-01 | Fixed timestep + accumulator | 1/60 s fixed step, simple accumulator; frame delta clamped to 0.25 s |
| D-M1C-02 | Integrator | Semi-implicit (symplectic) Euler: velocity first, then position |
| D-M1C-03 | Gravity | −9.81 m/s² on the Y axis |

These match the documented proposal in `M1_B_PROJECT_OWNER_DECISION_BRIEF.md` (Decision 6) and are recorded as an addendum in `MVP_1_OWNER_DECISIONS.md`.

## 3. Initial repository baseline

| Item | Value |
|---|---|
| Branch / HEAD | `main` @ `4e949ad` = `origin/main` |
| M1-B implementation commit | `230fb61` present on `origin/main` (verified ancestor) |
| M1-B closure audit | tracked in `4e949ad` |
| Known pre-existing changes | 3 modified MVP-0 reports + untracked root `package-lock.json` (left untouched) |
| Baseline tests | 87/87 pass |
| Baseline typecheck | **FAIL** — caused by unapproved uncommitted WIP, not by M1-B |

### Pre-flight anomaly and disposition

The working tree contained unapproved WIP not listed in the declared baseline:

- untracked `src/runtime/physics.ts`;
- `runtime/apply-transforms` hunks in `src/editor/commands.ts` and `src/editor/reducer.ts` that wrote runtime transforms directly into authored `state.project.world`.

That WIP violated the M1-B/ADR 0003 runtime-vs-authored separation and broke `tsc`. With Owner approval it was preserved intact on local branch `wip/m1c-physics-scratch` (`a566c98`) and `main` was restored to the clean M1-B baseline before implementation. The scratch branch was not pushed and is not part of the M1-C diff.

## 4. Implemented architecture

- **Pure runtime layer** (`src/runtime/**`, outside `src/world/**`):
  - `types.ts` — `RuntimeBody` / `RuntimeBodies` (runtime-only transform + velocity + gravity flag).
  - `physics.ts` — `createRuntimeBodies`, `stepBodies` (semi-implicit Euler), `advanceSimulation` (fixed-step accumulator), constants `FIXED_TIMESTEP_SECONDS = 1/60`, `GRAVITY_ACCELERATION_Y = -9.81`, `MAX_FRAME_DELTA_SECONDS = 0.25`.
- **Runtime state** (`src/editor/state.ts`): `RuntimeState` gains `bodies` and `accumulatorSeconds`. Both are in-memory only and never serialized.
- **Commands/reducer**: new `runtime/step { deltaSeconds }`; Play derives bodies from the snapshot; Pause/Resume freeze/continue; Reset re-derives bodies from the snapshot; Stop clears runtime state and returns to Editing. `project/new` and `project/open` reset runtime state via `createDefaultRuntimeState()`.
- **Runtime/authored isolation**: simulation writes only `runtime.bodies`. Authored `project.world` is never mutated while running. `selectRenderWorld` overlays runtime transforms for rendering only.
- **Renderer wiring**: `connectRendererToStore` renders `selectRenderWorld(state)` instead of raw authored world.
- **Simulation loop**: `useSimulationLoop` (UI hook) dispatches frame deltas only while `runtimeStatus === 'running'`; the reducer owns the accumulator and advances whole fixed steps.
- **No new dependencies; no schema version bump.**

## 5. Acceptance criteria matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | A ball with a rigid body responds to gravity | PASS | `test/runtime/physics.test.ts`: “stepBodies applies semi-implicit Euler gravity”, “a ball falls under gravity after 30 fixed steps”; `test/editor/runtime-physics.test.ts`: “store-driven play and 30 fixed steps make the ball fall deterministically” |
| 2 | Fixed timestep 1/60 s + simple accumulator | PASS | `advanceSimulation` constants; tests “consumes whole fixed steps”, “carries the sub-step remainder”, “clamps long frame deltas” |
| 3 | Semi-implicit Euler integrator | PASS | Test “uses the updated velocity for position (not explicit Euler)” |
| 4 | Gravity −9.81 m/s² | PASS | `GRAVITY_ACCELERATION_Y`; gravity tests; trajectory evidence JSON |
| 5 | Authored state is not mutated during simulation | PASS | “runtime/step advances runtime bodies without mutating authored state”; “selectRenderWorld overlays runtime transforms only outside editing” |
| 6 | Runtime state is never persisted (ADR 0003) | PASS | “serialized project excludes runtime physics state” |
| 7 | Play initializes runtime bodies from enabled rigid bodies | PASS | “runtime/play initializes runtime bodies from enabled rigid bodies” |
| 8 | Pause freezes progression | PASS | “runtime/step is a no-op while paused” |
| 9 | Resume continues from the paused position | PASS | “resume continues from the paused runtime position” |
| 10 | Reset restores the initial runtime state | PASS | “runtime/reset restores the runtime body and preserves running status” |
| 11 | Stop clears runtime state and returns to Editing | PASS | “runtime/stop clears runtime bodies and leaves authored state initial” |
| 12 | Disabled/absent rigid bodies do not simulate | PASS | “runtime/step is a no-op when no entity has a rigid body”; “disabled rigid bodies do not simulate” |
| 13 | Structural-edit gating preserved | PASS | “structural edits remain blocked while running after stepping”; existing M1-B runtime tests |
| 14 | Runtime stepping does not mark the project dirty | PASS | “runtime/step does not mark the project dirty” |
| 15 | Existing MVP-0 / M1-A / M1-B behavior preserved | PASS | Full suite 113/113; 87 baseline tests unchanged |
| 16 | Trajectory evidence produced | PASS | `reports/mvp-1/evidence/m1c-trajectory.json` (deterministic 60-step fall) |

## 6. Changed files

Source:

- `app/src/runtime/types.ts` (new)
- `app/src/runtime/physics.ts` (new)
- `app/src/editor/state.ts`
- `app/src/editor/commands.ts`
- `app/src/editor/reducer.ts`
- `app/src/editor/selectors.ts`
- `app/src/app/wiring.ts`
- `app/src/ui/hooks/useSimulationLoop.ts` (new)
- `app/src/ui/shell/StudioShell.tsx`

Tests and tooling:

- `app/test/runtime/physics.test.ts` (new, 12 tests)
- `app/test/editor/runtime-physics.test.ts` (new, 14 tests)
- `app/package.json` (test list + `evidence:m1c` script)
- `app/scripts/m1c-trajectory-evidence.mjs` (new)

Evidence and documentation:

- `reports/mvp-1/evidence/m1c-trajectory.json` (new)
- `reports/mvp-1/M1_C_IMPLEMENTATION_REPORT.md` (this report)
- `reports/mvp-1/MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`
- `reports/mvp-1/MVP_1_OWNER_DECISIONS.md` (dated addendum)
- `reports/mvp-0/PROJECT_HANDOFF.md`

No MVP-0 source, no root `package-lock.json`, and none of the three pre-existing modified MVP-0 reports were changed or staged.

## 7. Tests and validation

Toolchain: Node **v24.22.2** (pinned by `engines` and `check:node`). The host default was v24.21.0, so the official v24.22.2 Windows binary was downloaded to a temp directory and used to run the validation below. No repository file was changed to bypass the check.

| Command | Result |
|---|---|
| `node --experimental-strip-types --test <all 12 test files>` | **113/113 pass** (87 baseline + 26 new) |
| `tsc --noEmit` | PASS |
| `vite build` (production) | PASS (pre-existing chunk-size / dynamic-import warnings only) |
| `check:node` | PASS — “Node version OK: v24.22.2” |
| `check:boundaries` | PASS — 5 files scanned in `src/world` |
| `check:tokens` | PASS — all contrast pairs pass |
| `evidence:m1c` | PASS — wrote `m1c-trajectory.json` |

Test totals: **113 passing, 0 failing** (M1-B baseline: 87).

### Trajectory evidence summary

Ball starts at `y = 5` with an enabled rigid body, zero initial velocity, gravity enabled. After 60 fixed steps (1.0 s):

- `positionY = 0.01325`
- `velocityY = -9.81`
- authored `positionY` remains `5`

The discrete result matches the semi-implicit Euler closed form `y = y₀ − g·dt²·Σi` for 60 steps.

## 8. Regression evidence

- All 87 pre-existing tests pass unchanged; no existing test was weakened or modified.
- MVP-0 persistence/serialization tests pass; runtime physics is absent from serialized project JSON.
- M1-A component validation/serialization tests pass.
- M1-B lifecycle, reset/stop semantics, dirty-flag behavior, and structural-edit gating tests pass.
- `src/world/**` remains free of React/Babylon/DOM imports (boundary check).

## 9. Known limitations and residual risks

- **No collision (M1-D):** the ball falls through any floor; M1-D adds colliders/response.
- **No force/impulse (M1-E):** only initial authored velocity and gravity affect motion.
- **No authoring UI for rigid bodies:** attaching a rigid body remains a component-system/store capability; UI wiring is M1-F scope.
- **No browser/CDP visual evidence in M1-C:** evidence is deterministic unit/integration tests plus a generated trajectory JSON. Browser acceptance evidence is M1-F scope per the roadmap.
- **Angular velocity is not integrated:** no torque/rotation integration in M1-C.
- **Multiple enabled rigid bodies on one entity:** the first enabled `rigidBody` component is used; this matches the current component model and is documented for M1-D design.
- **Frame-delta clamp (0.25 s):** an implementation detail of the approved “simple accumulator” policy; prevents unbounded catch-up after a stall.
- **Performance not measured:** the renderer re-applies the overlaid world and computes diagnostics each frame; D-06 requires measurement, not a numeric target. No premature optimization was added.
- **Environment:** the host default Node (24.21.0) does not satisfy the pinned 24.22.2; validation used the official pinned binary from temp storage.

## 10. Scope boundary confirmation

- M1-C is implemented.
- **M1-D (collision) is NOT implemented.**
- **M1-E (force/impulse + runtime logs) is NOT implemented.**
- **M1-F (full reset/wiring/acceptance evidence) is NOT implemented.**
- No future-milestone functionality, no new dependency, and no persistence schema change entered the diff.
