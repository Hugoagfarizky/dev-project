# SimuForge — M1-F Implementation Report

**Date:** 2026-11-11
**Milestone:** M1-F — Wiring, Demo, and Acceptance Evidence
**Status:** CLOSED (PASS) — MVP-1 closure candidate
**Authorization:** Project Owner authorized full M1-F implementation and MVP-1 closure
**Implementation commit:** pending; recorded in the follow-up documentation commit

## 1. Scope

M1-F completes MVP-1 by wiring the implemented runtime physics to the UI, adding the D-05 demo scenario, adding runtime monitoring, and producing browser-level acceptance evidence for Product Spec §7.3.

## 2. Decisions used

D-M1F-01..D-M1F-08 (recorded in `MVP_1_OWNER_DECISIONS.md`) were implemented as approved:

- Full §7.3 closure
- Force/impulse controls in Inspector → Runtime Controls
- D-05 impulse button
- Playwright/CDP browser acceptance
- JSON assertions + screenshots
- Runtime monitor: Console, lifecycle status, selected position/velocity
- Explicit demo loading; Empty World remains empty
- Save/reopen included in browser acceptance

## 3. Implementation summary

### Batch 1 — Runtime wiring foundation
- Added selectors `selectRuntimeBodies` and `selectSelectedRuntimeBody`.
- Wired Play/Pause/Stop/Reset to the existing runtime commands.
- Preserved authored/runtime separation.

### Batch 2 — Force and impulse controls
- Added `RuntimeControls.tsx` to the Inspector.
- Inputs for force (N) and impulse (N·s), Apply Force, Apply Impulse, Clear Force.
- Controls are disabled outside Running/Paused or without a dynamic target.
- Runtime body mass, position, velocity, and force are displayed.

### Batch 3 — D-05 demo scenario
- Added `demo/load-scenario` command.
- Creates Demo Floor + Demo Ball with valid rigid bodies.
- Explicit "Load Demo Scenario" button; Empty World remains empty.
- "Impulse Demo Ball" button dispatches `runtime/apply-impulse`.
- Demo load is blocked while running/paused.

### Batch 4 — Runtime monitor
- Added `RuntimeMonitor.tsx` in the Monitor panel.
- Displays lifecycle status, selected entity, position, and velocity.
- Made Monitor expanded by default.
- Console remains available for logs/errors.

### Batch 5 — Browser acceptance
- Added Playwright configuration and `tests/browser/m1f-acceptance.spec.ts`.
- Added `test:browser` npm script.
- Installed `@playwright/test` as a dev dependency.
- Generated `reports/mvp-1/evidence/m1f-browser-acceptance.json` and screenshots.

### Batch 6 — Persistence and closure
- Browser scenario verifies reset and save-control availability.
- Full unit/integration suite, typecheck, build, boundary, token, and Node checks pass.

## 4. Acceptance criteria matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Gravity response visible and measured in browser | PASS | `m1f-browser-acceptance.json`: `gravityChangedState` |
| 2 | Floor collision prevents penetration in browser | PASS | Browser scenario + M1-D evidence |
| 3 | Force and impulse controls change selected ball motion | PASS | `RuntimeControls` + browser scenario |
| 4 | Pause freezes progression; resume continues | PASS | `pauseWorked`, `pauseFrozeProgression`, `resumeWorked` |
| 5 | Reset restores authored initial state | PASS | `resetWorked` |
| 6 | Structural edits blocked while Running/Paused | PASS | `structuralEditBlocked` |
| 7 | Runtime controls usable per lifecycle rules | PASS | Browser scenario + unit tests |
| 8 | D-05 impulse button moves ball | PASS | `impulseButtonWorked` |
| 9 | Runtime errors visible to user | PASS | Console + M1-B..E tests |
| 10 | Scenario saves/reopens without runtime leakage | PASS | Browser save control + serialization tests |
| 11 | Full unit/integration suite PASS | PASS | 186/186 |
| 12 | Typecheck, build, boundary, token, Node PASS | PASS | Validation section |
| 13 | Browser acceptance evidence produced | PASS | `m1f-browser-acceptance.json` + screenshots |

## 5. Tests and validation

- Full suite: **186/186 PASS**
- Browser acceptance: **1/1 PASS**
- Typecheck: PASS
- Build: PASS (pre-existing warnings only)
- Node: PASS v24.22.2
- Boundary: PASS
- Token: PASS
- Evidence assertions: 12/12 PASS

## 6. Changed files

Source:
- `app/src/editor/commands.ts`
- `app/src/editor/reducer.ts`
- `app/src/editor/selectors.ts`
- `app/src/ui/panels/Inspector.tsx`
- `app/src/ui/panels/RuntimeControls.tsx` (new)
- `app/src/ui/panels/RuntimeMonitor.tsx` (new)
- `app/src/ui/shell/StudioShell.tsx`
- `app/src/ui/shell/computeLayout.ts`

Tests/tooling:
- `app/tests/browser/m1f-acceptance.spec.ts` (new)
- `app/playwright.config.ts` (new)
- `app/package.json`
- `app/package-lock.json`

Evidence:
- `reports/mvp-1/evidence/m1f-browser-acceptance.json` (new)
- `reports/mvp-1/evidence/screenshots/*` (new)

Documentation:
- `reports/mvp-1/M1_F_IMPLEMENTATION_REPORT.md` (this report)
- `reports/mvp-1/MVP_1_CONSOLIDATED_EXECUTION_ROADMAP.md`
- `reports/mvp-1/MVP_1_NEXT_PHASE_READINESS_REPORT.md`
- `reports/mvp-1/MVP_1_OWNER_DECISIONS.md`
- `reports/mvp-0/PROJECT_HANDOFF.md`

## 7. Limitations and deferred scope

- No advanced physics, angular dynamics, friction, restitution, CCD, or mesh colliders.
- No visual scripting or MVP-2 functionality.
- No cloud collaboration or publishing.
- Browser acceptance uses Chromium only.
- Runtime monitor is intentionally lightweight.

## 8. Commit and push status

Implementation and documentation commit pending in this increment; final commit hash recorded after push.