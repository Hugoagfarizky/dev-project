# SimuForge — M1-F Implementation Plan

**Date:** 2026-11-11  
**Milestone:** M1-F — Wiring, Demo, and Acceptance Evidence  
**Status:** PLANNING PREPARED — implementation NOT AUTHORIZED  
**Authorization:** Project Owner authorized M1-E closure and M1-F discovery/planning only. M1-F implementation remains NOT AUTHORIZED.  
**Depends on:** M1-A CLOSED, M1-B CLOSED, M1-C CLOSED, M1-D IMPLEMENTED (pending closure acceptance), M1-E CLOSED

## 1. Purpose and boundaries

M1-F is the **closure milestone** for MVP-1. It does not add new physics. Its job is to connect the already-implemented runtime physics to the user-facing application, complete the D-05 demonstration, and produce browser-level acceptance evidence for Product Spec §7.3.

### In scope

- Wiring runtime commands to UI controls and inspector actions.
- Force/impulse application controls for the selected runtime body.
- The D-05 demo scenario: ball + rigid body + gravity + floor + impulse button.
- Runtime status, logs, and errors visible to the user.
- Browser/CDP acceptance execution for all §7.3 criteria.
- Save/reopen validation of the completed scenario.
- Final MVP-1 acceptance evidence and closure documentation.

### Out of scope

- New physics models, advanced forces, torque, angular dynamics, friction, restitution, CCD, or mesh colliders.
- Visual scripting, graph execution, or any MVP-2 functionality.
- MVP-3 monitoring dashboards beyond the existing console/error surfaces.
- New dependencies unless explicitly approved.
- Changes to ADR 0003 persistence or runtime/authored isolation.

### Hard constraints preserved

- Authored `project.world` is never mutated while running.
- Runtime state remains runtime-only and is never persisted.
- Structural edits remain blocked while Running or Paused.
- Runtime controls remain usable while Running or Paused where specified.
- No `git clean`, `git reset --hard`, `git stash`, `git add .`, or `git add -A`.

## 2. MVP-1 §7.3 acceptance criteria to close

The following Product Spec §7.3 criteria are the M1-F closure target:

1. A ball with a rigid body responds to gravity.
2. A floor can prevent the ball from passing through it.
3. Applying a force or impulse changes the ball's motion.
4. Pause freezes simulation progression.
5. Resume continues from the paused state.
6. Reset returns the simulation to its initial state.
7. Structural edits are blocked while running.
8. Runtime controls explicitly marked as editable remain usable.

M1-F must demonstrate each criterion in a browser-level run, not only in unit tests.

## 3. Current readiness baseline

Already available and not to be reopened:

- M1-B runtime state machine, snapshot/restore, structural gating, failure recovery.
- M1-C fixed-step rigid body, gravity, semi-implicit Euler integrator.
- M1-D primitive colliders and plane-contact response.
- M1-E persistent force, instantaneous impulse, mass-aware acceleration, runtime logs, and Console integration.
- Existing UI shell: TopBar Play/Pause/Stop/Reset, ConsoleDrawer, Inspector, viewport render overlay, simulation loop.
- Existing persistence/serialization and dirty-state tracking.

Gaps requiring M1-F work:

- No UI control currently dispatches `runtime/apply-force`, `runtime/apply-impulse`, or `runtime/clear-force`.
- No dedicated force/impulse input surface.
- No D-05 impulse button scenario.
- No browser/CDP acceptance harness or browser evidence.
- No end-to-end save/reopen validation of a running scenario.

## 4. Proposed implementation batches

### Batch 1 — Runtime wiring foundation

Goal: make runtime state and commands consistently consumable by UI without changing physics.

Work:

- Add selectors for runtime bodies, selected body, force/velocity, and editable-control eligibility.
- Centralize dispatch helpers for Play/Pause/Stop/Reset and force/impulse/clear.
- Ensure disabled-state logic for runtime buttons is consistent across TopBar and any new panels.
- Add unit tests for new selectors and helpers.

Expected output:

- Stable UI-facing runtime API.
- No behavior change to physics.

### Batch 2 — Force and impulse controls

Goal: expose M1-E capabilities through the UI.

Work:

- Add a Runtime/Physics section to the Inspector or a dedicated panel.
- Target the selected entity only when it has an enabled dynamic rigid body.
- Provide vector inputs for force (N) and impulse (N·s).
- Provide Apply Force, Apply Impulse, and Clear Force actions.
- Disable force/impulse controls in Editing or when no valid dynamic target exists.
- Surface validation/runtime failures through the existing Console.

Expected output:

- User can apply force and impulse to a selected body.
- Invalid targets and inputs are rejected with visible warnings/errors.

### Batch 3 — D-05 demo scenario

Goal: satisfy the approved demo decision.

Work:

- Add a reproducible "Ball + Floor + Impulse Button" scenario or starter command.
- Wire a button control to dispatch `runtime/apply-impulse` to the ball.
- Ensure the scenario can be created from an empty project or loaded as a sample.
- Add reset behavior that restores the authored demo state.

Expected output:

- Triggering the button moves the ball.
- Collision and reset behave correctly in the complete scenario.

### Batch 4 — Console, monitor, and error visibility

Goal: make runtime state and failures observable.

Work:

- Ensure ConsoleDrawer displays runtime info/warn/error entries with source and code.
- Add lightweight runtime readouts if needed: status, body velocity, force, accumulator.
- Ensure internal failures pause and display `runtime.lastError`.

Expected output:

- Runtime errors are visible.
- Pause/resume/reset status is unambiguous.

### Batch 5 — Browser/CDP acceptance harness

Goal: execute and capture browser-level evidence.

Work:

- Add or reuse a browser test harness (CDP/Playwright-style) for the Vite app.
- Script the §7.3 scenarios.
- Capture screenshots and/or a short recording.
- Generate a structured evidence JSON with assertion results.

Expected output:

- Reproducible browser acceptance run.
- Evidence artifacts under `reports/mvp-1/evidence/`.

### Batch 6 — Persistence and closure

Goal: validate save/reopen and close MVP-1.

Work:

- Verify the completed scenario saves and reopens without runtime state leakage.
- Verify authored transforms remain unchanged by simulation.
- Run full unit/integration suite, typecheck, build, boundary, token, Node checks.
- Produce final acceptance audit and closure report.
- Request Owner closure.

Expected output:

- MVP-1 closure documentation and evidence.

## 5. Measurable acceptance criteria for M1-F

M1-F is complete only when all of the following pass:

1. Gravity response is visible and measured in-browser.
2. Floor collision prevents penetration in-browser.
3. Force and impulse controls change the selected ball's motion.
4. Pause freezes progression; resume continues from paused state.
5. Reset restores authored initial state.
6. Structural edits are blocked while Running/Paused.
7. Runtime controls remain usable when permitted.
8. The D-05 impulse button moves the ball in the complete scenario.
9. Runtime errors are visible to the user.
10. The scenario can be saved and reopened without runtime-state leakage.
11. Full unit/integration suite passes.
12. Typecheck, build, boundary, token, and Node checks pass.
13. Browser acceptance evidence is produced and all assertions pass.

## 6. Testing strategy

- Unit tests: selectors, disabled-state logic, dispatch helpers, reducer cases already covered.
- Integration tests: store-driven force/impulse and D-05 scenario; save/reopen round-trip.
- Browser tests: CDP/Playwright scenarios for §7.3; screenshots and assertions.
- Regression: existing M1-B..E suites must remain green.

## 7. Evidence to be produced

- `reports/mvp-1/evidence/m1f-browser-acceptance.json`
- Browser screenshots for gravity, collision, force, impulse, pause/resume, reset, structural gating, and D-05 button.
- Optional short recording of the complete scenario.
- Final acceptance audit and closure report.

## 8. Technical risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope creep into MVP-2 visual scripting | Keep M1-F limited to wiring, demo, acceptance; no graph execution |
| UI complexity from force vectors | Use simple numeric inputs and selected-target gating |
| Browser test flakiness | Use deterministic fixed-step timing and explicit waits |
| Runtime state leaking into persistence | Reuse existing serialization boundaries and add round-trip tests |
| D-05 button ambiguity | Define one canonical impulse target/value in the demo scenario |
| Performance at scale | Reuse M1-C measurement approach; no new mandatory numeric target |
| Accidental physics changes | Keep M1-F changes in UI/integration/tests/docs only |

## 9. Owner decision package (pending)

The following decisions are required before M1-F implementation. Recommendations are provided; the Project Owner must approve or reject each.

### D-M1F-01 — M1-F scope

- **Question:** Should M1-F close all Product Spec §7.3 criteria, or only wiring plus evidence?
- **Recommendation:** Close all §7.3 criteria.
- **Consequence:** Larger scope but completes MVP-1; otherwise MVP-1 remains incomplete.

### D-M1F-02 — Force/impulse UI location

- **Question:** Where should force/impulse controls live?
- **Options:** Inspector section; dedicated Runtime panel; demo-only button.
- **Recommendation:** Dedicated Runtime/Physics panel plus Inspector summary.
- **Consequence:** Better discoverability and keeps authoring UI separate.

### D-M1F-03 — D-05 demo button

- **Question:** Should the approved D-05 impulse button be implemented in M1-F?
- **Recommendation:** Yes.
- **Consequence:** Required to satisfy the approved D-05 demo decision.

### D-M1F-04 — Browser acceptance tooling

- **Question:** Which browser automation tool should be used?
- **Options:** CDP-based scripts; Playwright; existing harness if present.
- **Recommendation:** Use the simplest available CDP/Playwright harness already compatible with the Vite app; document the choice.
- **Consequence:** Tooling choice affects test maintenance and CI.

### D-M1F-05 — Evidence format

- **Question:** What evidence artifacts are required?
- **Recommendation:** JSON assertion report plus screenshots; optional short recording.
- **Consequence:** Screenshots add manual review value but require stable UI.

### D-M1F-06 — Runtime monitor scope

- **Question:** Should M1-F add a runtime monitor panel beyond the console?
- **Recommendation:** No; use the existing ConsoleDrawer plus small readouts.
- **Consequence:** Avoids MVP-3 scope creep.

### D-M1F-07 — Default demo scene

- **Question:** Should M1-F add an automatic default demo scene?
- **Recommendation:** Provide an explicit "Create demo scenario" action, not an automatic default.
- **Consequence:** Keeps empty projects clean while making the demo reproducible.

### D-M1F-08 — Save/reopen acceptance

- **Question:** Should save/reopen be part of M1-F browser acceptance?
- **Recommendation:** Yes.
- **Consequence:** Validates ADR 0003 isolation end-to-end.

## 10. Closure criteria for M1-F

M1-F may be proposed for closure only when:

1. All §7.3 browser acceptance criteria pass.
2. D-05 demo scenario works end-to-end.
3. Full test suite, typecheck, build, boundary, token, and Node checks pass.
4. Evidence artifacts are complete and reproducible.
5. Documentation is updated and consistent.
6. No M1-F scope violations occurred.
7. Project Owner explicitly approves closure.

## 11. Status

M1-F planning is prepared and ready for Project Owner review. No implementation, UI change, browser acceptance run, or demo button work has been performed. Awaiting Owner authorization before implementation.