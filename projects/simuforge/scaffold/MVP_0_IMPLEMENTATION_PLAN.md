# SimuForge - MVP-0 Implementation Plan

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 2.0 - Approved plan; implementation not authorized |
| Date | 2026-11-06 |
| Status | Approved; not started; implementation NOT AUTHORIZED |
| Owner role | Engineering Lead, SimuForge |
| Project | simuforge |
| Applies to | [MVP-0 Scaffold Specification](MVP_0_SCAFFOLD_SPECIFICATION.md) |
| Architecture | [MVP-0 Architecture Proposal](MVP_0_ARCHITECTURE_PROPOSAL.md) |
| Dependencies | [MVP-0 Dependency and License Inventory](MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md) |
| Related ADRs | [ADR 0002](../../../docs/decisions/0002-mvp-0-technology-stack.md), [ADR 0003](../../../docs/decisions/0003-mvp-0-persistence-and-project-format.md) |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| Language | English |

## 1. Purpose and Gate

This plan breaks the MVP-0 scaffold into independently reviewable increments. It does not authorize the first increment.

The decision prerequisites are satisfied:

1. The Product Owner approved OD-01 through OD-07 on 2026-11-06.
2. C-01 through C-07 are accepted by their named owners; test-dependent conditions remain pending verification.
3. The scaffold specification is approved as the scope baseline.
4. The dependency and license inventory is approved through OD-05 and ADR 0002.
5. ADR 0002 (technology stack) and ADR 0003 (persistence and project format) are accepted.

Implementation may start only when **all** of the following are true:

1. The Project Owner gives explicit implementation authorization for I-01.
2. The repository is clean and the design baseline commit is unchanged.
3. No condition in the [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md) stop rule is active.

If any of these is false, the plan stays a plan. **MVP-0 implementation is NOT AUTHORIZED.**

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

- Create `projects/simuforge/app/` with `package.json`, exact pins, `engines`, and `.node-version` in accordance with [ADR 0002](../../../docs/decisions/0002-mvp-0-technology-stack.md) (accepted 2026-11-06).
- Add `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, and `noUnusedLocals`.
- Add `vite.config.ts`, `index.html`, and a minimal `src/main.tsx` that renders a static placeholder.
- Add `src/styles/tokens.css` copied from the approved design tokens, plus `reset.css`. Resolve the known 4.38:1 tertiary-on-raised pair by adjusting the token or restricting its use on raised surfaces, and record the measured ratio (ACG-02).
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

### I-01 implementation evidence (2026-11-06)

Status: **COMPLETE for the authorized I-01 scope.** C-05 technical completion is satisfied by the committed lockfile and generated notices; C-02, C-03, C-04, C-06, and C-07 remain pending their own increments and are not marked complete.

Files created:

- `projects/simuforge/app/.gitignore`
- `projects/simuforge/app/.node-version`
- `projects/simuforge/app/THIRD_PARTY_NOTICES.md`
- `projects/simuforge/app/index.html`
- `projects/simuforge/app/package.json`
- `projects/simuforge/app/package-lock.json`
- `projects/simuforge/app/tsconfig.json`
- `projects/simuforge/app/vite.config.ts`
- `projects/simuforge/app/scripts/check-boundaries.mjs`
- `projects/simuforge/app/scripts/check-node.mjs`
- `projects/simuforge/app/scripts/check-tokens.mjs`
- `projects/simuforge/app/scripts/generate-notices.mjs`
- `projects/simuforge/app/src/App.tsx`
- `projects/simuforge/app/src/main.tsx`
- `projects/simuforge/app/src/styles/reset.css`
- `projects/simuforge/app/src/styles/tokens.css`
- `projects/simuforge/app/src/vite-env.d.ts`
- `projects/simuforge/app/test/smoke.test.mjs`

Runtime and toolchain:

- Node.js: `v24.22.2` from `D:\Programs\node-v24.22.2-win-x64\node.exe`
- npm: `11.19.1` from `D:\Programs\node-v24.22.2-win-x64\npm.cmd`
- Lockfile: version 3, SHA-256 `D137DA46DE39F56184E5AE6BA13E3CF397B94C336342BDA33F18356910DE8146`
- Installed package count: 26, including 9 direct dependencies and 17 transitive runtime/build packages
- `npm audit`: 0 vulnerabilities

Validation results:

- `npm ci`: PASS (26 packages added, audited 27 packages)
- `npm run check:node`: PASS (`Node version OK: v24.22.2`)
- `npm run typecheck`: PASS (`tsc --noEmit`)
- `npm run check:boundaries`: PASS (no `src/world` files present in I-01; script rejects forbidden imports in a temporary fixture)
- `npm run check:tokens`: PASS (tertiary on raised measured `4.80:1`)
- `npm test`: PASS (1 test passed)
- `npm run build`: PASS (Vite production bundle; 17 modules transformed)
- Dev server: PASS (`http://localhost:5173/` returned HTTP 200)
- Chrome 156.0.8078.80 headless render: PASS (React root rendered `<main class="sf-empty-app">`; no application console errors; only Chrome GPU cache errors caused by the local C: disk condition)
- `git diff --check`: PASS

ACG-02 I-01 evidence:

- Known defect: tertiary text on `--sf-bg-raised` originally measured `4.38:1`.
- Fix applied in `projects/simuforge/app/src/styles/tokens.css`: `--sf-text-tertiary` changed from `#78879E` to `#7F8EA5`; `--sf-slate-500` changed to the same value.
- Measured result: `4.80:1` on `--sf-bg-raised` (`#192231`), `5.35:1` on `--sf-bg-panel`, and `5.60:1` on `--sf-bg-canvas`.
- `check-tokens` fails on a deliberately lowered tertiary value and passes on the committed value.
- Final ACG-02 verification remains scheduled for I-09.

Deferred work and limitations:

- No Studio Shell, Project Hub, viewport, renderer initialization, persistence, state store, command system, or future increment work was implemented.
- No `src/world` module exists yet; the boundary checker is present and will enforce the rule when I-03 creates that module.
- Chrome runtime evidence was collected with headless Chrome 156.0.8078.80; interactive CDP layout and accessibility checks remain I-02 and I-09 work.
- The C: drive has zero free space, so Chrome's GPU cache emitted disk-full errors unrelated to the application. The application bundle and React root rendered successfully.

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
- ACG-01 passes: the 1024 x 640 layout is visually inspected in Chrome 156 and the screenshots are recorded, not only computed.

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
- Add the shortcut conflict audit in Chrome 156 on Windows (ACG-03).
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
- ACG-03 passes: the shortcut conflict audit is recorded with the tested Chrome and OS versions.
- No local/world toggle exists.

**Risks:** numeric parsing and locale; per-frame React churn; gimbal-lock display; keyboard conflicts.

### I-07 - Persistence and Project Hub

**Goal:** create, save, reopen, and recover local projects without data loss.

**Work:**

- Follow [ADR 0003](../../../docs/decisions/0003-mvp-0-persistence-and-project-format.md) (accepted 2026-11-06) for the persistence contract.
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
- Implement Program and Monitor `Planned` strips with no fabricated values (ACG-04).
- Remove or hide Run, Pause, Stop, Reset, Components, Behavior, Runtime, and Python authoring.
- Ensure hidden surfaces are absent from the DOM and the tab order.
- Implement the status-bar engine indicator from real diagnostics only.
- Do not display a frame-rate value unless it comes from the measurement harness (ACG-04).

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
- ACG-04 passes: no fabricated frame rate or functional-looking Visual Logic summary is present.

**Risks:** log flood; focus theft; accidental enablement of a gated control; test hooks leaking into production.

### I-09 - Accessibility, performance, and acceptance evidence

**Goal:** verify the whole increment against the acceptance criteria and record reproducible evidence.

**Work:**

- Complete the keyboard-only pass and focus-order audit.
- Verify the tertiary-on-raised contrast resolution from I-01 and record the final measured ratio; adjust again if the token or its usage changed (ACG-02).
- Verify dialogs trap focus, close on Esc, and restore focus.
- Verify reduced-motion behavior.
- Implement the performance sampler and the S0/S3/S4/S5 scenes.
- Run the full acceptance suite at 1024 x 640 and 1440 x 900.
- Perform the final visual inspection of all three presets at 1024 x 640 and record the screenshots (ACG-01).
- Re-run the shortcut conflict audit against the final shortcut map (ACG-03).
- Audit the production DOM and text for fabricated frame rates and Visual Logic summaries (ACG-04).
- Record screenshots, metrics, hardware, Chrome version, and commit.
- Update the risk register with R-1..R-5 status and verification point.
- Write the MVP-0 acceptance report under `projects/simuforge/reports/mvp-0/`.

**Tests:**

- Full `npm run check`, `npm test`, and `npm run build`.
- CDP layout suite at both reference sizes.
- Keyboard smoke test without a pointer.
- Performance measurement at 0, 10, 50, and 100 entities.
- Final DOM and network audit: no external request, no gated surface, no test hook in production.
- Gate evidence for ACG-01, ACG-02, ACG-03, and ACG-04 is present and reproducible.

**Exit criteria:**

- All M0-AC criteria pass or have an owner-approved exception.
- ACG-01 through ACG-04 pass and their evidence is recorded.
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

### 5.1 Acceptance gate mapping

The four gates accepted by the Project Owner on 2026-11-06 are mapped here. They are additional requirements; the M0-AC mapping above does not replace them.

| Gate | Acceptance criterion | Validation method | Implementing stage | Final evidence |
| --- | --- | --- | --- | --- |
| ACG-01 | At 1024 x 640 in Chrome 156, all three presets are visually usable: no overlap, no page scroll, viewport at least 300 px, documented auto-collapse result | Visual inspection and screenshots at 1024 x 640; CDP bounds assertions as supporting evidence | I-02 | I-09 `layout/1024x640-*.png` |
| ACG-02 | Normal text using the tertiary token on raised surfaces measures at least 4.5:1 | Compute effective colors; measure the ratio; run `check-tokens`; record the fix | I-01 | I-09 accessibility evidence |
| ACG-03 | Keyboard and pointer shortcuts have no unrecorded conflict in Chrome 156 on Windows | Enumerate and exercise the shortcut map; probe reserved combinations; record conflicts and remaps | I-06 | I-09 `shortcuts/audit.md` |
| ACG-04 | No `60 fps` literal or functional-looking Visual Logic summary appears in the MVP-0 production UI | Search source and production bundle; audit rendered DOM and screenshots | I-08 | I-09 final DOM audit |

A gate is PASS only when its evidence is committed. A gate that was not exercised is reported as not run.

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

### 8.1 POC-01 residual risks (C-03)

These risks are carried forward from POC-01. C-03 is owner-accepted, but the risks are not closed. Each row names an owner role, the mitigation already required by the plan, and the verification point that must be recorded before the risk can be marked closed.

| Risk | Owner role | Mitigation | Verification point | Status |
| --- | --- | --- | --- | --- |
| R-1 Euler display ambiguity at gimbal lock | Engineering - renderer/Inspector | Quaternion is the source of truth; YXZ Euler is display-only; boundary tests near +/-90 degrees; no local/world toggle | I-06 transform tests and Inspector review; I-09 risk register | Open |
| R-2 Serialization round-trip not validated | Engineering - world/project | Pure validator and serializer; envelope tests; file round-trip tests | I-03 unit round-trip; I-07 save/open round-trip; I-09 risk register | Open |
| R-3 No performance baseline | Engineering - app | Measure S0/S3/S4/S5 at 0/10/50/100 entities; report p50 and p95; no target claimed before measurement | I-09 performance report; I-09 risk register | Open |
| R-4 Chrome-only scope | Product Owner | Record Chrome 156 as the acceptance target; make no cross-browser claim; state the limitation in the acceptance report | I-09 acceptance report and risk register | Accepted limitation |
| R-5 Negative or invalid zoom radius | Engineering - renderer | Clamp radius to 0.5-500 in the camera controller; unit and browser tests | I-04 camera test; I-09 risk register | Open |

A risk is closed only when its verification point has recorded evidence. Owner acceptance of C-03 does not close R-1 through R-5.

## 9. Definition of Done for the Plan

The plan is complete when all nine increments pass their exit criteria, the acceptance report is committed, and the Product Owner accepts MVP-0. The plan itself is done when approved; it is not evidence that implementation has started.

## 10. Traceability

| Plan claim | Source |
| --- | --- |
| Increment order and scope | MVP-0 Scaffold Specification §2, §11 |
| Architecture seams | MVP-0 Architecture Proposal §4-§8 |
| Dependency pins | ADR 0002; MVP-0 Dependency and License Inventory §4 |
| Persistence and project format | ADR 0003; MVP-0 Scaffold Specification §7 |
| Layout rules | Workspace Layout Specification §3, §7 |
| Transform and camera policy | POC-01 World Editor §6.7, §9 |
| Storage contract | ADR 0003; MVP-0 Scaffold Specification §7 |
| Phase gating | UI Component Inventory §14; Design Readiness D-12 |
| Residual risks | SP-08 §5 (R-1..R-5); Architecture Proposal §14.1 |
| Acceptance gates | MVP-0 Scaffold Specification §11.1; MVP-0 Owner Decision Request §4.2 |
| Testing rules | Engineering Standards, Testing |

## 11. Approval

The Project Owner approved this plan on 2026-11-06. Approval is not implementation authorization; see §1.

| Role | Decision | Date |
| --- | --- | --- |
| Product Owner | **Approved; implementation not authorized** | 2026-11-06 |
| Engineering reviewer | Reviewed for documentation consistency | 2026-11-06 |
