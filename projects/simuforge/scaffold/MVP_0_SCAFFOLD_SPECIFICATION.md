# SimuForge - MVP-0 Scaffold Specification

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 - Proposed for approval |
| Date | 2026-11-05 |
| Status | Proposed; not an implementation authorization |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Supersedes | None |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| POC baseline | POC-01 CLOSED (GO) |
| Language | English |

## 1. Purpose and Authorization

This document defines the **MVP-0 scaffold** that may be created after the Product Owner approves [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md). It is a specification, not code.

MVP-0 is the **Studio and World Foundation** increment from the [Product Specification](../docs/PRODUCT_SPECIFICATION.md) §7.2. It proves that a user can open the Studio, create an empty world, add primitives, select and transform them, and save and reopen the authored project.

Nothing in this document authorizes:

- Visual Logic graph authoring or execution.
- Python editing or execution.
- Physics, collision, simulation stepping, or runtime transport.
- Robotics, automation, or hybrid 2D/3D.
- Floating panels, drag-to-dock, multi-select, or live tracing.
- Any change to POC-01 evidence or the Product Specification.

## 2. MVP-0 Scope

### 2.1 Included

| Area | MVP-0 behavior |
| --- | --- |
| Studio shell | Top bar, left dock, center viewport, right Inspector, Console drawer, status bar, splitters, collapse |
| Layout presets | Build, Program, and Simulate; presets change layout only, never runtime state; Program and Monitor remain `Planned` placeholders |
| Project Hub | New project, open project file, recent project list, loading/error/empty states |
| World Hierarchy | Flat entity list, selection, rename, delete, visibility-independent list |
| Empty World | Zero entities, editor grid and camera only, overlay with primitive actions |
| 3D Viewport | Babylon.js canvas, right-handed scene, grid, camera, picking, selection outline, gizmos |
| Primitive creation | Cube, Sphere, Plane only, with POC defaults |
| Object selection | Single selection shared by viewport, Hierarchy, and Inspector |
| Inspector | Entity identity, Transform, metadata summary; no components or runtime sections |
| Transform editing | Position, rotation, scale from Inspector and gizmos under POC policy |
| Save and open | Browser-local project records plus a versioned project file; explicit save, no autosave |
| Program dock | Initial 32 px surface with a `Planned` state; no graph or Python authoring |
| Console | Collapsible editor-message log with severity, source, timestamp, and clear/filter basics |
| Status bar | Selection, entity count, active transform tool, WebGL status, save state |

### 2.2 Explicitly excluded

| Excluded capability | MVP-0 treatment |
| --- | --- |
| Run / Pause / Stop / Reset | Hidden. The runtime state pill may read `Editing`. |
| Runtime bar | Hidden. |
| Components | Hidden. No component section, no Rigid Body. |
| Physics and simulation | Hidden. |
| Visual Logic canvas | Not rendered. Program surface shows `Planned`. |
| Python editor | Not rendered. Python is named as Phase 07 in planned copy only. |
| Simulation Monitor metrics | A collapsed `Planned` strip may reserve the right-dock space; no metrics. |
| Asset import, glTF/GLB, materials | Hidden. |
| Undo / redo | Deferred. Delete requires confirmation. |
| Multi-select | Not enabled. |
| Drag-to-dock, floating panels | Not implemented. |
| Hybrid 2D | Not implemented. |
| Light theme | Not implemented. |
| Cloud, accounts, collaboration, autosave | Not implemented. |

### 2.3 Phase-gating matrix

A control that has no MVP-0 capability MUST be absent or visibly non-interactive with a `Planned` explanation. It MUST NOT be an enabled control that does nothing.

| Surface | MVP-0 | Rule |
| --- | --- | --- |
| Top bar project/save | Visible | New, Open, Save, Back to Hub |
| Top bar preset | Visible | Build, Program, Simulate are layout presets |
| Top bar transport | Hidden | No Run/Pause/Stop/Reset |
| Simulation menu | Hidden | Do not render an empty or disabled menu |
| Runtime bar | Hidden | Absent in Editing |
| World Hierarchy | Visible | Create/select/rename/delete |
| Asset Library | Visible | Cube, Sphere, Plane |
| Viewport | Visible | Camera, grid, picking, selection, gizmos |
| Inspector transform | Visible | Authored position, rotation, scale |
| Inspector Components | Hidden | Do not render an empty section |
| Inspector Behavior | Hidden | Do not render an empty section |
| Inspector Runtime | Hidden | Do not render an empty section |
| Program dock | `Planned` surface | 32 px strip in Build; planned state when expanded |
| Python | Named only | No tab that accepts input |
| Simulation Monitor | `Planned` strip | No metrics, no live header |
| Console | Visible | Editor messages only |
| Status bar | Visible | No simulation claims |

## 3. Layout Contract

### 3.1 Geometry

| Element | Default | Minimum | Maximum |
| --- | --- | --- | --- |
| Top bar | 48 px | - | - |
| Status bar | 24 px | - | - |
| Left dock | 260 px | 200 px | 360 px |
| Right dock | 320 px | 260 px | 420 px |
| Center minimum width | - | 480 px | - |
| Program dock height | 320 px | 180 px | 60% of center height |
| Console height | 200 px | 120 px | 40% of app height |
| Collapsed drawer | 32 px | - | - |
| Splitter | 1 px visible, 4 px hit area | - | - |

The runtime bar is absent in MVP-0. The shell is a fixed CSS grid; the page itself MUST NOT scroll. Each panel scrolls internally.

### 3.2 Presets

| Preset | Left dock | Center | Right dock | Console |
| --- | --- | --- | --- | --- |
| Build | Hierarchy + Assets | Viewport + 32 px Program strip | Inspector + 32 px Monitor strip | 32 px |
| Program | Hierarchy; Assets collapsed | Viewport + planned Program surface (320 px; 200 px below 760 px height) | Inspector + 32 px Monitor strip | 32 px |
| Simulate | Hierarchy; Assets collapsed | Viewport + 32 px Program strip | Inspector + 32 px Monitor `Planned` strip | 200 px expanded |

Program and Simulate remain **layout presets**. They do not create runtime state, because MVP-0 has no runtime. Selecting Simulate MUST NOT display runtime metrics or a live badge.

MVP-0 adaptation: the target-state Simulate preset splits the right dock 40% Inspector and 60% Monitor with a live Monitor. MVP-0 has neither a runtime nor metrics, so the Monitor is a 32 px `Planned` strip and the Inspector keeps the dock. The target split is restored when the Monitor becomes functional. This is deliberate phase gating, not a layout defect.

### 3.3 Responsive rules

- Supported editing range: **1024 x 640 and above**.
- At 1024-1199 px width: left 220 px, right 280 px; top-bar labels collapse into menus; preset labels become icons with accessible names.
- At heights below 760 px: Program dock default height is 200 px when it is not collapsed; Console default expanded height is 160 px.
- If a panel cannot meet its minimum and preserve a 300 px viewport, auto-collapse in this order: Asset Library, Monitor, Program. Console collapses before the viewport is allowed to fall below 300 px.
- Program focus mode is defined for later phases. In MVP-0 the Program surface is planned and cannot open a graph, so it auto-collapses instead of opening focus mode and must not force the viewport below 300 px.
- Below 1024 px: show a non-blocking `Window too small` state with the supported minimum. Do not promise the 768-1023 limited overlay in MVP-0; it is deferred to Phase 02.
- Browser zoom 100-200% is supported only while the effective CSS viewport remains at least 1024 x 640; below that, the size state applies.

### 3.4 Collapse behavior

- A collapsed panel keeps its 32 px header, title, short state, and expand control.
- Collapsed content leaves the tab order.
- Panel sizes are restored after expansion.
- Inspector collapsed header shows the selected entity name or `No selection`.
- Hierarchy collapsed header shows entity count and selection.
- Asset Library collapsed header shows primitive count.
- Console collapsed header shows latest editor message and highest severity.
- Program and Monitor planned strips show `Planned`; they do not show fabricated graph or metric summaries.

## 4. Project Hub

### 4.1 Entry

The Project Hub is a separate surface, not a dock panel. It appears before the Studio and can be reached from the project menu (`Back to Hub`). The exact menu placement is a scaffold detail; the entry flow is F-01/F-02.

### 4.2 Content

| Region | Content |
| --- | --- |
| Brand | SimuForge mark and short tagline |
| Primary actions | `New Project`, `Open Project File` |
| Recent projects | Records read from browser storage, newest first, with name, modified time, and entity count |
| Empty state | Explanation and `New Project` |
| Loading state | Progress indicator while a project is read and validated |
| Error state | Named failure, reason, `Try another project`, `Show details` |

No templates, marketplace, cloud, account, or sample scene is shown.

### 4.3 New project

1. The user selects `New Project`.
2. A dialog asks for a name, default `Untitled Simulation`.
3. Empty and whitespace-only names are rejected.
4. On create, the Studio opens in Build with zero entities and a dirty project.
5. The project is not written to browser storage until the first explicit Save.
6. Duplicate names are allowed; project identity is the ID.

### 4.4 Open project

1. `Open Project` reads a project record from IndexedDB or a project file.
2. The record is parsed and validated before any Studio state changes.
3. A valid project opens in Build with an empty selection.
4. Camera pose is not restored in MVP-0.
5. An invalid project shows an error and leaves the current project intact.
6. Opening with unsaved changes asks Save / Discard / Cancel first.

### 4.5 Project file

The project file is UTF-8 JSON with the extension `.simuforge.json`.

```json
{
  "format": "simuforge.project",
  "schemaVersion": 1,
  "project": {
    "id": "3f2c1a9e-8b4d-4c6f-9a1e-2d7b5c8e4f10",
    "name": "Button & Ball",
    "createdAt": "2026-11-05T08:00:00.000Z",
    "updatedAt": "2026-11-05T08:30:00.000Z"
  },
  "world": {
    "format": "simuforge.world",
    "schemaVersion": 1,
    "entities": []
  }
}
```

Rules:

- `format` MUST equal `simuforge.project`.
- `schemaVersion` MUST be `1` in MVP-0.
- `project.id` MUST be a UUID v4 string.
- `project.name` MUST be 1-128 characters after trimming.
- Timestamps MUST be ISO 8601 strings.
- `world` MUST validate against the POC-01 world schema.
- Unknown top-level fields are ignored on read and are not written on save.
- A missing required field is an error; it is not defaulted.
- There is no migration chain in MVP-0. A newer schema version is rejected with a clear message.

The nested world document remains the POC-01 `simuforge.world` v1 format. This preserves round-trip compatibility and avoids inventing a new entity schema.

## 5. World Model and Serialization

### 5.1 Entity model

MVP-0 uses the POC-01 model without extension:

```ts
type EntityId = string; // UUID v4
type EntityType = "cube" | "sphere" | "plane";

interface WorldEntity {
  id: EntityId;
  name: string;
  type: EntityType;
  transform: Transform;
  metadata: Record<string, unknown>;
}

interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}
```

Entities are flat. There is no parent-child hierarchy, component array, material, light, or script field.

### 5.2 Defaults

| Field | Default |
| --- | --- |
| World entities | `[]` |
| Cube position | `(0, 0.5, 0)` |
| Sphere position | `(0, 0.5, 0)` |
| Plane position | `(0, 0, 0)` |
| Rotation | identity quaternion `(0, 0, 0, 1)` |
| Scale | `(1, 1, 1)` |
| Metadata | `{}` |
| Gizmo mode | `translate` |
| Grid visible | `true` |
| Selection | `null` |

### 5.3 Validation

MVP-0 reuses the POC-01 rules:

- IDs are UUID v4 and unique within the document.
- Names are 1-128 characters.
- Types are `cube`, `sphere`, or `plane`.
- All transform components are finite.
- Quaternion length is greater than zero; import normalizes it.
- Scale is finite, positive, and at least `1e-3` per axis.
- Negative and near-zero scale are rejected.
- Metadata is a plain JSON object.
- Validation returns the first error with a path such as `entities[2].transform.scale.y`.
- World replacement is atomic: validation completes before the current world changes.

### 5.4 Editor state

Editor state is not serialized with the project:

```ts
interface EditorState {
  selectedEntityId: EntityId | null;
  gizmoMode: "translate" | "rotate" | "scale";
  gridVisible: boolean;
  camera: CameraPose | null;
  activePreset: "build" | "program" | "simulate";
}
```

Selection, camera, gizmo mode, grid visibility, panel sizes, and Console filters do not set the dirty flag.

### 5.5 Transform policy

MVP-0 MUST follow POC-01:

- Translate is world-space.
- Rotate is world-space.
- Scale is local-space.
- The stored transform is TRS; the quaternion is the source of truth.
- Euler values are displayed in YXZ order and are not stored.
- There is no local/world toggle.
- No world-space scale, shear, negative scale, or affine matrix.

### 5.6 Camera policy

- `ArcRotateCamera` targets the origin by default.
- Alt + left drag or middle drag orbits.
- Shift + middle drag or right drag pans.
- Wheel changes radius.
- Plain left click selects; it never orbits.
- Radius clamps to 0.5-500 world units.
- Beta clamps to 0.01 to `pi - 0.01` radians.
- No viewport right-click menu.
- Camera pose is editor state and is not serialized.

## 6. Interaction Contract

### 6.1 Selection

- Clicking an entity in the viewport selects it.
- Clicking a Hierarchy row selects it.
- Clicking empty viewport space clears selection.
- Selection updates the outline, gizmo, Hierarchy row, and Inspector in the same frame.
- Exactly one entity is selected in MVP-0.
- Deleting the selected entity clears selection.

### 6.2 Transform

- Inspector commit happens on Enter or blur; Esc reverts the field.
- Invalid values are rejected inline and do not mutate the world.
- Gizmo updates apply at most once per animation frame.
- A click without movement does not modify the transform.
- Mode switches do not dispatch a transform command.
- Scale handles follow the entity's local axes.
- Delete requires a confirmation dialog in MVP-0 because undo is deferred.

### 6.3 Keyboard floor

MVP-0 MUST provide:

- `Ctrl+S` Save.
- `Ctrl+O` Open.
- `Ctrl+Alt+N` New project.
- `F` frame selection; `Shift+F` frame world.
- `W`, `E`, `R` translate, rotate, scale.
- `G` toggle grid.
- `F2` rename selected.
- `Delete` request delete with confirmation.
- `Esc` close overlay, revert field, or clear selection in that priority.
- Visible focus ring on every interactive control.
- Panel splitters reachable by keyboard where implemented.

Shortcut conflicts MUST be audited in Chrome 156 on Windows before the shortcut is documented as guaranteed.

## 7. Persistence Contract

### 7.1 Browser storage

| Data | Store | Key | Persisted |
| --- | --- | --- | --- |
| Project records | IndexedDB | `simuforge` database, `projects` object store, key path `id` | Yes |
| Layout state | `localStorage` | `simuforge.layout.v1` | Yes |
| Last project | `localStorage` | `simuforge.last-project.v1` | Yes |
| Console logs | Memory only | - | No |
| Selection, camera, gizmo mode | Memory only | - | No |
| Runtime state | N/A in MVP-0 | - | No |

The project record stored in IndexedDB is the project envelope from §4.5. The `projects` store has an `updatedAt` index for the Project Hub recent list.

### 7.2 Save state machine

```text
Clean --edit--> Dirty --Save--> Saving --success--> Clean
                                  |
                                  +--failure--> SaveFailed (dirty remains)
```

Rules:

- Save writes the whole validated project envelope in one IndexedDB transaction.
- The UI does not clear the dirty flag until the transaction succeeds.
- Save while a field is focused first commits the field; if the field is invalid, Save is blocked with the inline reason.
- Save does not serialize editor state.
- A failed save keeps the in-memory project and offers Retry and Export Copy.
- No autosave.

### 7.3 Open state machine

```text
Idle --Open--> Reading --> Validating --> Ready
                    |            |
                    +--error-----+--> Error (current project unchanged)
```

- Reading and validation happen before the Studio replaces any state.
- A corrupt or unsupported project does not partially load.
- Opening a project with unsaved changes requires Save / Discard / Cancel.

### 7.4 Storage failures

| Failure | User-visible result | Recovery |
| --- | --- | --- |
| IndexedDB unavailable | Banner: projects cannot be read from this browser | Open a project file; local save is disabled and Export Copy remains available |
| Quota exceeded | Banner: project could not be saved; changes remain in this tab | Retry, delete old projects, or export copy |
| Project not found | Hub error | Choose another project |
| Project corrupt | Hub error with code and path | Open another project or file |
| File too large | Rejection with actual size and 1 MiB limit | Choose another file |
| Invalid file | Rejection with named error | Choose another file |

The 1 MiB limit is the POC-01 provisional file guardrail, applied to project-file reads in MVP-0. It is not a product limit.

## 8. Console Contract

MVP-0 Console sources are:

- `APP` - startup, storage, project lifecycle.
- `EDITOR` - world edits, validation, transform rejection.
- `RENDER` - WebGL/engine failures.
- `IMPORT` - project file read/validation.

Each row shows timestamp, severity, source, message, and optional code. Errors expand to details. The Console:

- starts collapsed;
- expands on the first error in a session without stealing keyboard focus;
- keeps filters All / Info / Warn / Error;
- supports search and clear;
- does not show runtime, logic, or Python sources in MVP-0;
- does not claim that a log was persisted across reloads.

## 9. Error and Feedback Contract

| Situation | Surface | Required content |
| --- | --- | --- |
| Empty world | Viewport overlay | `Start with one object`; Cube, Sphere, Plane |
| No selection | Inspector | `Nothing selected`; Add Cube action |
| Invalid transform | Inspector inline | Field name, reason, previous value retained |
| Invalid project | Hub dialog | Project name if known, error code, path, `Open another project` |
| Save failure | Persistent banner | `Project could not be saved`; Retry, Export Copy |
| Storage unavailable | Banner | Read-only explanation and file fallback |
| WebGL 2 unavailable | Viewport overlay | Clear requirement; no blank canvas |
| Unexpected error | Console error + non-blocking toast | Error code, no stack by default |

No error is swallowed. No empty `catch` block is permitted. Unexpected errors are logged before they are shown.

## 10. Accessibility Floor

- Every icon-only control has an accessible name and a tooltip.
- Focus is visible with a 2 px selection-colored ring.
- Status is not communicated by color alone.
- Minimum hit target is 24 x 24 px; 28 px preferred.
- Collapsed content is removed from the tab order.
- Dialogs trap focus, close on `Esc`, and restore focus to the opener.
- The viewport is not screen-reader operable; the Hierarchy and Inspector provide the keyboard-accessible path.
- `prefers-reduced-motion` disables non-essential transitions.
- Tertiary text on raised surfaces must be re-measured; the current token is 4.38:1. Either adjust the token or do not use it for normal text on raised surfaces.

## 11. Acceptance Criteria

| ID | Criterion |
| --- | --- |
| M0-AC-01 | The Studio opens at 1440 x 900 with all MVP-0 regions visible and no overlap. |
| M0-AC-02 | The Studio opens at 1024 x 640 with no page-level scroll; panels scroll internally. |
| M0-AC-03 | The viewport canvas fills its container and remains undistorted across 1024-1920 px widths. |
| M0-AC-04 | Build, Program, and Simulate change layout only; world, selection, camera, and dirty state are unchanged. |
| M0-AC-05 | A new project starts with zero entities, empty Hierarchy, empty Inspector, grid, and camera. |
| M0-AC-06 | Cube, Sphere, and Plane are created with the specified defaults and unique UUIDs. |
| M0-AC-07 | Hierarchy, viewport, and Inspector show the same selection after viewport and Hierarchy clicks. |
| M0-AC-08 | Inspector position, rotation, and scale commits update the viewport; Esc reverts; invalid values are rejected. |
| M0-AC-09 | Translate and rotate gizmos operate in world space; scale operates in local space, including on a rotated entity. |
| M0-AC-10 | Switching gizmo modes does not change the stored transform. |
| M0-AC-11 | Plain left click selects; left drag does not orbit; camera map and clamps match the specification. |
| M0-AC-12 | Rename updates Hierarchy and Inspector; delete requires confirmation and clears selection. |
| M0-AC-13 | Save writes one validated project record; the dirty flag clears only after success. |
| M0-AC-14 | Reopening a saved project restores IDs, names, types, and transforms within 1e-6. |
| M0-AC-15 | Project Hub lists saved projects newest first and shows empty, loading, and error states. |
| M0-AC-16 | A corrupt or unsupported project is rejected without changing the current project. |
| M0-AC-17 | Save failure keeps the project in memory, keeps the dirty flag, and offers Retry and Export Copy. |
| M0-AC-18 | The Console logs editor/storage/import errors with severity, source, code, and timestamp. |
| M0-AC-19 | The Program and Monitor surfaces show `Planned`; no graph, Python editor, runtime metric, or transport is enabled. |
| M0-AC-20 | No component, behavior, runtime, or simulation section is rendered in the Inspector. |
| M0-AC-21 | `Ctrl+S`, `Ctrl+O`, `F`, `W`, `E`, `R`, `G`, `F2`, and `Esc` behave as specified; conflicts are recorded. |
| M0-AC-22 | Keyboard focus is visible; collapsed content is not tabbable; dialogs restore focus. |
| M0-AC-23 | A static guard confirms `src/world/**` imports no Babylon, React, or DOM globals. |
| M0-AC-24 | World and project serialization round-trip tests pass without a browser. |
| M0-AC-25 | The application loads with no uncaught error or unexpected Console error in the tested Chrome build. |
| M0-AC-26 | Performance at 10, 50, and 100 entities is measured and recorded; no numeric target is claimed before measurement. |

## 12. Definition of Done

MVP-0 is done when:

1. M0-AC-01 through M0-AC-26 pass with recorded evidence.
2. The project can be created, saved, reopened, and edited without data loss in the tested scenario.
3. No MVP-1+ surface is enabled or implied.
4. The dependency lockfile and license inventory are generated and reviewed.
5. No page-level scroll appears at 1024 x 640 or 1440 x 900.
6. The shortcut audit is recorded.
7. The residual risks R-1..R-5 have owners and status.
8. The Product Owner accepts the increment.

## 13. Traceability

| Requirement | Source |
| --- | --- |
| MVP-0 included scope | Product Specification §7.2 |
| Empty world, primitives, selection, transform | Product Specification §7.2; POC-01 World Editor §7-§9 |
| Save and reopen | Product Specification §7.2; POC-01 World Editor §11 |
| Shell, panels, presets | Design README; Workspace Layout Specification |
| Project Hub | Design README §5; Main User Flows F-01/F-02/F-13/F-14 |
| Program dock and Console surfaces | UI Component Inventory; MVP-0 phase row |
| Transform policy | POC-01 World Editor §9; Design Readiness D-10 |
| Camera policy | Interaction Specification §5; Design Readiness D-11 |
| Phase gating | Design Readiness D-12; UI Component Inventory §14 |
| Storage gap decision | POC-01 World Editor §11.6; this document §7 |
| Undo deferral | Design Readiness A-13; this document §2.2 |

## 14. Approval

This specification is not active until the Product Owner approves the decisions in [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md).

| Role | Decision | Date |
| --- | --- | --- |
| Product Owner | Pending | - |
| Engineering reviewer | Pending | - |
