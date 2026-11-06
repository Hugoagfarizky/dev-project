# SimuForge - MVP-0 Implementation Plan

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 - Proposed for approval |
| Date | 2026-11-05 |
| Status | Proposed; not started |
| Owner role | Engineering Lead, SimuForge |
| Project | simuforge |
| Applies to | [MVP-0 Scaffold Specification](MVP_0_SCAFFOLD_SPECIFICATION.md) |
| Architecture | [MVP-0 Architecture Proposal](MVP_0_ARCHITECTURE_PROPOSAL.md) |
| Dependencies | [MVP-0 Dependency and License Inventory](MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md) |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| Language | English |

## 1. Purpose and Gate

This plan breaks the MVP-0 scaffold into independently reviewable increments. It does not authorize the first increment.

Implementation may start only when:

1. The Product Owner approves [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md), including OD-01 through OD-07.
2. C-01 through C-07 are accepted by their named owners.
3. The scaffold specification is approved as the scope baseline.
4. The dependency and license inventory is accepted.
5. The repository is clean and the design baseline commit is unchanged.

If any of these is false, the plan stays a plan.

## 2. Working Rules

- One increment per change. Do not mix increments in one review.
- Every increment ends with `npm run typecheck`, `npm test`, and `npm run build` passing on the supported Node and Chrome versions.
- No increment may enable an MVP-1+ surface, even temporarily.
- No increment may change POC-01 evidence or the Product Specification.
- No dependency is added to an increment without updating the inventory and the notices file in the same change.
- A failing validation stops the increment. It is not worked around by disabling a test.
- Evidence is recorded in the repository, not only in chat.
- Every acceptance criterion has a named test or a recorded manual check.

## 3. Increment Overview

| ID | Increment | Size | Depends on | Primary acceptance |
| --- | --- | --- | --- | --- |
| I-01 | Toolchain and empty application | S | Approval | Build, typecheck, boundary check |
| I-02 | Studio shell and layout contract | M | I-01 | M0-AC-01, 02, 03, 04 |
| I-03 | World, project, store, and command core | L | I-01 | M0-AC-23, 24 |
| I-04 | Renderer adapter and viewport | L | I-02, I-03 | M0-AC-03, 07, 09, 10, 11 |
| I-05 | Primitives, Hierarchy, selection, Inspector identity | M | I-03, I-04 | M0-AC-05, 06, 07, 12 |
| I-06 | Transform editing and keyboard floor | L | I-05 | M0-AC-08, 09, 10, 21 |
| I-07 | Persistence and Project Hub | L | I-03, I-05 | M0-AC-13 to 17 |
| I-08 | Console, status bar, and planned surfaces | M | I-02, I-03, I-04 | M0-AC-18, 19, 20 |
| I-09 | Accessibility, performance, and acceptance evidence | M | I-01 to I-08 | M0-AC-22, 25, 26, full suite |

Sizes are relative review effort, not calendar estimates. I-03, I-04, I-06, and I-07 are the highest-risk increments and should not be combined.

## 4. Increment Details

### I-01 - Toolchain and empty application

**Goal:** a reproducible, empty application that builds and fails fast on an unsupported environment.

**Work:**

- Create `projects/simuforge/app/` with `package.json`, exact pins, `engines`, and `.node-version`.
- Record ADR 0002 (stack selection) before the first dependency install.
- Add `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, and `noUnusedLocals`.
- Add `vite.config.ts`, `index.html`, and a minimal `src/main.tsx` that renders a static placeholder.
- Add `src/styles/tokens.css` copied from the approved design tokens, plus `reset.css`. Resolve the known 4.38:1 tertiary-on-raised pair by adjusting the token or restricting its use on raised surfaces, and record the measured ratio.
- Add `scripts/check-boundaries.mjs` using the TypeScript compiler API.
- Add `scripts/check-tokens.mjs` to recompute contrast ratios from token values and fail below 4.5:1 for normal text.
- Add the license notices generation step and commit `THIRD_PARTY_NOTICES.md`.
- Add `npm` scripts: `dev`, `build`, `preview`, `typecheck`, `test`, `check:boundaries`, `check:tokens`, `check`.
- Add a single `node:test` smoke test proving the test runner executes.
- Add a dependency-version guard that fails when Node does not satisfy `engines`.

**Tests:**

- `npm ci` from the committed lockfile.
- `npm run typecheck` with no `any` escapes.
- `npm test` executes at least one test.
- `npm run build` produces a production bundle.
- The boundary script rejects a deliberately bad import in a temporary fixture.
- The token script fails on a deliberately lowered contrast fixture.

**Exit criteria:**

- The empty app loads in Chrome 156 without a console error.
- The production bundle contains no development-only test hook.
- The lockfile and notices file are committed.
- The resolved package list matches the inventory; deviations are explained.

**Risks:** Vite 8 native binaries; Node version drift; TypeScript test execution strategy.

### I-02 - Studio shell and layout contract

**Goal:** the fixed shell, panel geometry, collapse behavior, and responsive rules, with static content only.

**Work:**

- Implement `StudioShell`, `TopBar`, `StatusBar`, `Splitter`, and panel containers as a CSS grid.
- Implement dimension tokens from the workspace specification.
- Implement Build, Program, and Simulate as layout presets that only change tracks and visibility.
- Implement collapsible regions with 32 px headers and restored sizes.
- Implement the internal scroll regions and forbid page-level scroll.
- Implement the 1024-1199 px compact breakpoint and the `Window too small` state below 1024 x 640.
- Implement the auto-collapse priority for Asset Library, Monitor, and Program; enforce a 300 px viewport minimum.
- Add a pure `computeLayout` function for testable geometry.
- Render `Planned` strips for Program and Monitor. No graph, metrics, or transport.

**Tests:**

- Unit tests for `computeLayout` at 1024 x 640, 1024 x 768, 1280 x 720, 1440 x 900, and 1920 x 1080.
- CDP bounds test at 1024 x 640 and 1440 x 900: every region inside the viewport, no overlap, no page scroll.
- Collapse/expand restores the previous size.
- Below-minimum state appears and the shell does not attempt a broken layout.
- Preset switching changes layout only.

**Exit criteria:**

- M0-AC-01, M0-AC-02, and the layout half of M0-AC-04 pass.
- No page-level scrollbar at either reference size.
- Focus order matches visual order.
- Full-size and compact screenshots are recorded.

**Risks:** CSS grid track math; fixed mockup assumptions leaking into the shell; height competition at 640 px.

### I-03 - World, project, store, and command core

**Goal:** the pure domain and state foundation, with no UI or Babylon dependency.

**Work:**

- Implement `world/types.ts`, `defaults.ts`, `transform.ts`, `validation.ts`, `serialization.ts`.
- Port POC-01 transform rules: right-handed, +Y up, quaternion truth, YXZ display, TRS composition, positive scale.
- Implement `project/types.ts`, `validation.ts`, `serialization.ts` for `simuforge.project` v1.
- Implement `editor/state.ts`, `commands.ts`, `reducer.ts`, `store.ts`, `selectors.ts`, `useStore.ts`, `dirty.ts`.
- Implement the command union and reducer invariants.
- Implement `console/types.ts`, `logBuffer.ts`, and `filters.ts`.
- Implement an injected ID factory and clock.
- Add the boundary check to the default `check` script.

**Tests:**

- Transform defaults, normalization, YXZ round-trip, gimbal-lock boundary, TRS order.
- Validation: duplicate IDs, empty names, bad types, non-finite values, zero and negative scale, malformed metadata.
- World round-trip: empty, three primitives, unknown fields ignored, missing field rejected, tolerance 1e-6.
- Project: valid envelope, wrong format, missing metadata, newer schema, corrupt JSON, nested path in errors.
- Reducer: delete-selected clears selection; open resets editor; editor commands do not dirty; authored commands dirty once; invalid transform rejected.
- Store: snapshot identity is stable until a change; subscribers are not notified on no-op; unsubscribe works.
- Logs: cap, severity filter, search, clear keeps filters.

**Exit criteria:**

- M0-AC-23 and M0-AC-24 pass.
- `world/` and `project/` import no Babylon, React, or DOM global.
- Domain tests run without a browser.
- No UI file contains a world rule.

**Risks:** over-generalizing the project envelope; letting editor concerns leak into `world/`; TypeScript type-stripping limits in tests.

### I-04 - Renderer adapter and viewport

**Goal:** a working Babylon viewport that reflects the world snapshot and reports user intent as events.

**Work:**

- Implement `RendererPort` and `BabylonRenderer`.
- Create the engine with WebGL 2, right-handed scene, +Y up.
- Implement the grid, default camera, and resize handling.
- Implement mesh creation, reconciliation, and disposal by entity ID.
- Implement picking with a click-versus-drag threshold.
- Implement the selection outline.
- Implement translate, rotate, and scale gizmos with world/world/local behavior.
- Implement camera clamps: radius 0.5-500, beta 0.01 to `pi - 0.01`.
- Implement context-loss handling and `WebGlFallback`.
- Implement `ViewportHost` and `app/wiring.ts`.
- Expose read-only diagnostics: engine version, WebGL version, mesh count, entity count.

**Tests:**

- Engine initializes and reports WebGL 2 in Chrome 156.
- Empty world renders grid and no meshes.
- Create three entities; tracked mesh count equals entity count.
- Delete one entity; mesh is disposed and count decreases.
- Picking returns the correct ID and `null` on empty space.
- Plain left drag does not orbit.
- Camera orbit, pan, zoom, and clamps.
- Gizmo translate/rotate are world-space; scale is local on a rotated entity.
- Unmount disposes all meshes and the engine; no console error.

**Exit criteria:**

- M0-AC-03, M0-AC-09, M0-AC-10, M0-AC-11, and the viewport half of M0-AC-07 pass.
- Mesh count equals entity count after create/delete cycles.
- No uncaught error and no unexpected console error.

**Risks:** Babylon subpath import side effects; gizmo/store echo; context loss; disposal leaks.

### I-05 - Primitives, Hierarchy, selection, and Inspector identity

**Goal:** the authored object loop: create, see, select, rename, delete.

**Work:**

- Implement the Asset Library primitive actions for Cube, Sphere, and Plane.
- Implement the Empty World overlay with the three primitive actions.
- Implement `WorldHierarchy` with a flat list, selection, rename, and delete.
- Implement the Inspector shell: identity, type, read-only ID, name, transform section placeholder.
- Wire selection across viewport, Hierarchy, and Inspector.
- Implement delete confirmation because undo is deferred.
- Implement the `No selection` Inspector state with an Add Cube action.
- Implement F2 rename and Delete request with confirmation.

**Tests:**

- New project shows zero entities, empty Hierarchy, empty Inspector, and the overlay.
- Each primitive uses the specified default transform and a unique UUID.
- Viewport click updates Hierarchy and Inspector.
- Hierarchy click updates the viewport outline and Inspector.
- Empty-space click clears selection.
- Rename updates both surfaces and does not change ID or transform.
- Delete requires confirmation; cancel keeps the entity; confirm clears selection.
- Deleting the selected entity resets the Inspector.

**Exit criteria:**

- M0-AC-05, M0-AC-06, M0-AC-07, and M0-AC-12 pass.
- The Hierarchy cannot display an entity that is not in the world.
- No component, behavior, or runtime section is rendered.

**Risks:** selection race between adapter and store; rename focus loss; duplicate names.

### I-06 - Transform editing and keyboard floor

**Goal:** authored transform editing from the Inspector and gizmos under the POC-01 policy.

**Work:**

- Implement `TransformSection` and `NumericField`.
- Commit on Enter and blur; revert on Esc; reject invalid values inline.
- Wire gizmo preview to at most one `transform/set` per animation frame.
- Apply the active-drag echo suppression.
- Implement W/E/R, F, Shift+F, G, and the documented shortcut set.
- Implement frame selection and frame world.
- Ensure mode switches dispatch no transform command.
- Add the shortcut conflict audit in Chrome 156 on Windows.
- Record any browser/OS conflict and remap or mark it optional.

**Tests:**

- Inspector position, rotation, and scale edits update the mesh.
- Esc reverts to the value before editing.
- Invalid input leaves the world unchanged and shows a reason.
- Gizmo drag updates the Inspector and marks the project dirty once per change.
- Translate and rotate follow world axes; scale follows local axes on a rotated entity.
- Switching modes does not change the stored quaternion or scale.
- Click without movement does not modify the transform.
- Keyboard shortcuts work with focus in the viewport, Hierarchy, and Inspector.
- `Ctrl+S` while a field is focused commits or blocks on invalid input.

**Exit criteria:**

- M0-AC-08, M0-AC-09, M0-AC-10, and M0-AC-21 pass.
- The shortcut audit is recorded with the tested Chrome and OS versions.
- No local/world toggle exists.

**Risks:** numeric parsing and locale; per-frame React churn; gimbal-lock display; keyboard conflicts.

### I-07 - Persistence and Project Hub

**Goal:** create, save, reopen, and recover local projects without data loss.

**Work:**

- Record ADR 0003 (local project persistence and file format) before the first persistence code.
- Implement `ProjectRepository`, `IndexedDbProjectRepository`, `MemoryProjectRepository`, and `LayoutStorage`.
- Implement the `simuforge` database, `projects` store, and `updatedAt` index.
- Implement layout persistence and last-project persistence as best effort.
- Implement the save state machine and revision capture.
- Implement the open state machine and atomic replacement.
- Implement project file export and import with the 1 MiB guard.
- Implement the Project Hub with recent projects, empty, loading, and error states.
- Implement New Project, Back to Hub, Save, Open, and unsaved-change prompts.
- Implement Save failure with Retry and Export Copy.
- Implement `STORAGE_*`, `PROJECT_*`, and `FILE_*` error mapping.
- Implement the storage-unavailable banner and file fallback.

**Tests:**

- Save writes one validated record; dirty clears only on success.
- Edit during save leaves the project dirty.
- Save failure keeps the project and the dirty flag.
- Reopen restores IDs, names, types, and transforms within 1e-6.
- Hub lists newest first and shows the empty state.
- Corrupt, unsupported, and oversized files are rejected without changing the current project.
- Missing project ID produces a named error.
- Unsaved changes prompt Save, Discard, and Cancel correctly.
- Layout state survives reload; corrupt layout falls back to defaults.
- IndexedDB-unavailable path uses the read-only memory fallback and the file fallback; local save is disabled and the banner explains why.

**Exit criteria:**

- M0-AC-13, M0-AC-14, M0-AC-15, M0-AC-16, and M0-AC-17 pass.
- No autosave exists.
- No editor state is written into the project document.
- No POC-01 file is modified.

**Risks:** IndexedDB transaction timing; quota simulation; stale revision; file API differences.

### I-08 - Console, status bar, and planned surfaces

**Goal:** complete the MVP-0 feedback surfaces without implying unavailable capability.

**Work:**

- Implement `ConsoleDrawer`, `ConsoleRow`, and filters.
- Implement startup, editor, render, and import log sources.
- Implement first-error auto-expand without focus theft.
- Implement clear, severity filter, and search.
- Implement status bar: selection, entity count, active tool, WebGL status, save state.
- Implement Program and Monitor `Planned` strips with no fabricated values.
- Remove or hide Run, Pause, Stop, Reset, Components, Behavior, Runtime, and Python authoring.
- Ensure hidden surfaces are absent from the DOM and the tab order.
- Implement the status-bar engine indicator from real diagnostics only.
- Do not display a frame-rate value unless it comes from the measurement harness.

**Tests:**

- Each log source appends a row with code, severity, and timestamp.
- First error expands the Console once; the second does not steal focus.
- Filter and search behave; clear keeps filters.
- Status bar reflects selection and count changes.
- Program and Monitor show `Planned` and have no interactive authoring control.
- No MVP-1+ surface exists in the DOM.
- Frame time is absent or measured, never hard-coded.

**Exit criteria:**

- M0-AC-18, M0-AC-19, and M0-AC-20 pass.
- A DOM audit finds no hidden but focusable MVP-1+ control.
- No `60 fps` literal exists in production UI text.

**Risks:** log flood; focus theft; accidental enablement of a gated control; test hooks leaking into production.

### I-09 - Accessibility, performance, and acceptance evidence

**Goal:** verify the whole increment against the acceptance criteria and record reproducible evidence.

**Work:**

- Complete the keyboard-only pass and focus-order audit.
- Verify the tertiary-on-raised contrast resolution from I-01 and record the final measured ratio; adjust again if the token or its usage changed.
- Verify dialogs trap focus, close on Esc, and restore focus.
- Verify reduced-motion behavior.
- Implement the performance sampler and the S0/S3/S4/S5 scenes.
- Run the full acceptance suite at 1024 x 640 and 1440 x 900.
- Record screenshots, metrics, hardware, Chrome version, and commit.
- Update the risk register with R-1..R-5 status.
- Write the MVP-0 acceptance report under `projects/simuforge/reports/mvp-0/`.

**Tests:**

- Full `npm run check`, `npm test`, and `npm run build`.
- CDP layout suite at both reference sizes.
- Keyboard smoke test without a pointer.
- Performance measurement at 0, 10, 50, and 100 entities.
- Final DOM and network audit: no external request, no gated surface, no test hook in production.

**Exit criteria:**

- All M0-AC criteria pass or have an owner-approved exception.
- Evidence is committed.
- The working tree contains no out-of-scope change.
- The Product Owner accepts the increment.

**Risks:** late discovery of a layout defect; performance regression; accessibility gap found after feature work.

## 5. Acceptance Mapping

| Criterion | Increment | Evidence |
| --- | --- | --- |
| M0-AC-01 | I-02 | CDP bounds test and screenshot at 1440 x 900 |
| M0-AC-02 | I-02 | CDP bounds test and screenshot at 1024 x 640; no page scroll |
| M0-AC-03 | I-02, I-04 | Canvas bounds and resize test at 1024-1920 px |
| M0-AC-04 | I-02, I-07 | Preset switch test with world, selection, camera, and dirty state unchanged |
| M0-AC-05 | I-05 | Empty project test and screenshot |
| M0-AC-06 | I-05 | Primitive default and UUID test |
| M0-AC-07 | I-04, I-05 | Cross-surface selection test |
| M0-AC-08 | I-06 | Inspector commit, revert, and invalid-input test |
| M0-AC-09 | I-04, I-06 | Gizmo world/local test on a rotated entity |
| M0-AC-10 | I-06 | Mode-switch transform equality test |
| M0-AC-11 | I-04 | Camera and click-versus-drag test |
| M0-AC-12 | I-05 | Rename and confirmed-delete test |
| M0-AC-13 | I-07 | Save state machine test |
| M0-AC-14 | I-07 | Save/reopen round-trip test |
| M0-AC-15 | I-07 | Hub list and state test |
| M0-AC-16 | I-07 | Corrupt/unsupported project rejection test |
| M0-AC-17 | I-07 | Forced save failure test |
| M0-AC-18 | I-08 | Console source and severity test |
| M0-AC-19 | I-08 | Planned-surface DOM assertion |
| M0-AC-20 | I-08 | Inspector section DOM assertion |
| M0-AC-21 | I-06 | Shortcut suite and conflict audit |
| M0-AC-22 | I-09 | Keyboard and focus audit |
| M0-AC-23 | I-01, I-03 | Boundary check in `npm run check` |
| M0-AC-24 | I-03 | Round-trip unit suite |
| M0-AC-25 | I-09 | Console-clean load check |
| M0-AC-26 | I-09 | Performance report |

## 6. Verification Commands

```text
npm ci
npm run check          # typecheck + boundaries + tokens
npm test
npm run build
npm run preview
node scripts/cdp-smoke.mjs --size 1024x640
node scripts/cdp-smoke.mjs --size 1440x900
```

A command that cannot run is reported as not run. It is never reported as passing.

## 7. Evidence Structure

```text
projects/simuforge/reports/mvp-0/
  README.md
  acceptance/
    M0-AC-01.md
    ...
    M0-AC-26.md
  layout/
    1024x640-build.png
    1024x640-program.png
    1024x640-simulate.png
    1440x900-build.png
    1440x900-program.png
    1440x900-simulate.png
  performance/
    baseline.json
    baseline.md
  shortcuts/
    audit.md
  risk/
    R-1..R-5-status.md
```

Evidence records the commit, Node, npm, Chrome, OS, display scale, and hardware.

## 8. Risk and Rollback

| Risk | Trigger | Response |
| --- | --- | --- |
| Renderer adapter blocks progress | Babylon integration fails a POC-verified behavior | Stop; compare against POC-01 evidence; do not patch around it |
| Store causes render loops | React warns about unstable snapshots | Stop; fix selector/snapshot contract before adding UI |
| Layout cannot meet 1024 x 640 | Viewport falls below 300 px or page scrolls | Stop; invoke OD-06 decision; do not ship a broken compact mode |
| Persistence corrupts data | Round-trip test fails | Stop; keep file export; do not ship local save |
| Scope creep | A gated surface appears | Revert the change; re-read the gating matrix |
| Dependency change | A new package is needed | Update inventory and notices first; do not install silently |

Rollback is per increment. Each increment is a separate commit and can be reverted without affecting earlier increments, except where a later increment depends on its interfaces.

## 9. Definition of Done for the Plan

The plan is complete when all nine increments pass their exit criteria, the acceptance report is committed, and the Product Owner accepts MVP-0. The plan itself is done when approved; it is not evidence that implementation has started.

## 10. Traceability

| Plan claim | Source |
| --- | --- |
| Increment order and scope | MVP-0 Scaffold Specification §2, §11 |
| Architecture seams | MVP-0 Architecture Proposal §4-§8 |
| Dependency pins | MVP-0 Dependency and License Inventory §4 |
| Layout rules | Workspace Layout Specification §3, §7 |
| Transform and camera policy | POC-01 World Editor §6.7, §9 |
| Storage contract | MVP-0 Scaffold Specification §7 |
| Phase gating | UI Component Inventory §14; Design Readiness D-12 |
| Residual risks | SP-08 §5 (R-1..R-5) |
| Testing rules | Engineering Standards, Testing |

## 11. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product Owner | Pending | - |
| Engineering reviewer | Pending | - |
