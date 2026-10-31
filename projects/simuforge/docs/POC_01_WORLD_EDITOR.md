# SimuForge — POC-01 World Editor Specification

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 0.2 — Draft |
| Date | 2026-10-31 |
| Status | Specification only; POC not started |
| Owner role | Technical Lead, SimuForge |
| Project | simuforge |
| Related phase | Phase 01 — Studio Application Foundation; Phase 02 — World & Rendering Engine |
| Supersedes | None |

### Changelog

| Version | Date | Summary |
| --- | --- | --- |
| 0.1 | 2026-10-31 | Initial POC-01 specification. |
| 0.2 | 2026-10-31 | Adopted the approved hybrid transform policy: world-space translate, world-space rotate, local-space scale. Added transform policy ownership, the TRS/no-shear boundary, future world-space scale evaluation notes, and transform acceptance tests E-06 to E-15. |

This document specifies a proof of concept. It does not describe an implemented system, and nothing in it is evidence that the described behavior exists. Product behavior is defined in the [product specification](PRODUCT_SPECIFICATION.md); architecture is defined in the [architecture document](../../../docs/architecture/ARCHITECTURE.md); the proposed architectural direction is recorded in [ADR 0001](../../../docs/decisions/0001-proposed-architecture-direction.md) with status `proposed`.

## 1. POC Overview

POC-01 validates the smallest useful slice of the SimuForge Studio: an empty world, primitive object creation, selection, transform editing, and JSON round-trip persistence, built on a renderer-independent world model.

The POC answers two questions at once:

1. Can the candidate stack (React, TypeScript, Vite, Babylon.js) support a basic world editor at acceptable quality?
2. Does the proposed split between world data, editor state, rendering adapter, and workspace UI hold up in practice, or does it create friction that would be expensive to keep?

The POC is a technical prototype. It is not the final Simulation Studio, it does not implement simulation, and its visual design is disposable.

### 1.1 Relationship to the roadmap

The [product specification](PRODUCT_SPECIFICATION.md) maps POC 1 (World Editor) to Phase 01 and Phase 02, and requires it before Phase 02 is considered validated. This POC also produces evidence for MVP-0 (Studio and World Foundation), specifically the empty-world rule, primitive creation, selection, transform editing, hierarchy/viewport agreement, and local save/reopen.

The POC does not deliver MVP-0. It validates technology and architecture assumptions that MVP-0 would depend on. Its JSON export is a validation mechanism, not the Project & Persistence System from Phase 04.

### 1.2 Traceability

| POC objective | Product specification reference | Covered by |
| --- | --- | --- |
| Empty world by default | §3, §7.2 (MVP-0) | Group B |
| Primitive creation and deletion | §7.2 (MVP-0) | Group C |
| Selection consistency | §7.2 (MVP-0) | Group D |
| Transform editing | §7.2 (MVP-0) | Group E |
| Renderer-independent world model | §9, ADR 0001 principle 6 | Group F |
| JSON save and reopen | §7.2 (MVP-0), §11 (POC 1) | Group G |
| Studio shell and viewport | §5, §7.2 (MVP-0) | Group A |
| Performance baseline | §14 (open question on performance targets) | Group H |

## 2. Objectives

### 2.1 Technical validation

Determine whether the candidate technology and the proposed data architecture can support a basic world editor:

- A world model that contains no renderer types and can be validated and serialized without a browser or canvas.
- A rendering adapter that can rebuild the visible scene from world data alone.
- A JSON format that round-trips entity identity, names, types, and transforms without loss.
- Editor-only objects (camera, grid, selection outline, gizmos, navigation helpers) that never become world entities.
- Interaction performance and stability at 10, 50, and 100 primitives.

### 2.2 Studio workflow prototype

Create a lightweight Simulation Studio workspace that validates the basic editing workflow:

- Create an empty world and add primitives.
- Select entities from the viewport or the Hierarchy and keep both in sync.
- Inspect and edit transforms from the Inspector.
- Manipulate transforms with viewport gizmos.
- Delete and rename entities.
- Export and re-import the world.

### 2.3 Hypotheses under test

| ID | Hypothesis | Falsified if |
| --- | --- | --- |
| TH-01 | A renderer-independent world model is practical to maintain for editor-only features. | Editor features require reaching into Babylon objects, or the adapter grows into a second source of truth. |
| TH-02 | React can drive panel state and the Inspector without causing viewport jank at 100 entities. | Selection or Inspector edits drop frames or desynchronize the viewport. |
| TH-03 | Babylon.js can provide picking, camera navigation, gizmos, and selection feedback with acceptable effort. | Required interactions need custom implementations that exceed POC effort or break under normal use. |
| TH-04 | A strict JSON schema with a version field is sufficient for round-trip world persistence. | Valid worlds cannot round-trip, or malformed input cannot be rejected safely. |
| TH-05 | Editor-only state can be kept out of world data without leaking into serialization. | Camera, grid, selection, or gizmo state appears in exported world data. |
| TH-06 | A hybrid transform policy (world-space translate and rotate, local-space scale) can be expressed through Babylon.js gizmos without a custom transform implementation. | The adapter must reimplement gizmos, or mode switches or scale drags corrupt the stored TRS transform. |

## 3. Scope and Non-Goals

### 3.1 In scope

- A browser workspace with a top toolbar, left Hierarchy, center World View, right Inspector, and an optional bottom status area.
- Empty-world semantics: no user-created entities on startup.
- Primitive creation for cube, sphere, and plane.
- Entity rename and delete.
- Selection from viewport and Hierarchy with synchronized Inspector.
- Transform editing for position, rotation, and scale from both Inspector and gizmos, using world-space translate and rotate and local-space scale.
- A renderer-independent world model with schema validation.
- JSON export and import with schema versioning and safe rejection of malformed input.
- Editor camera navigation, grid visibility, selection feedback, and viewport resizing.
- Manual acceptance testing plus automated tests for the pure world model and serialization.
- Performance and stability measurement at 10, 50, and 100 entities.

### 3.2 Out of scope

The following are explicitly excluded. Their presence in the POC is a scope violation, not a bonus:

- Physics engine, collision detection, or simulation stepping.
- Visual scripting, node graphs, or behavior execution.
- Python runtime or any user-authored code execution.
- Electrical, electronic, or robotics simulation.
- Advanced materials, textures, shaders, or lighting editors.
- Terrain editing.
- External model import (glTF, GLB, OBJ) and asset libraries.
- Asset marketplace or extension marketplace.
- Custom components or custom simulation modules.
- Hybrid 2D/3D interaction or a 2D solver.
- Cloud persistence, accounts, collaboration, autosave, version history, or undo/redo.
- Multi-scene projects, prefabs, parenting hierarchies, or instancing.
- Final product UI design, theming, docking, or panel customization.
- Mobile or touch-first layouts.
- Accessibility conformance work beyond basic keyboard operation of the listed commands.

### 3.3 Scope guardrails

- No dependency may be added that exists only to serve an out-of-scope feature.
- No world entity type may be added beyond `cube`, `sphere`, and `plane`.
- No component system may be introduced. The POC world model is intentionally flat.
- No rendering feature may be added that changes world data semantics (for example, a light entity or a material entity).
- Any temptation to add simulation behavior is recorded as a follow-up question, not implemented.

## 4. Technology Candidates

### 4.1 Candidates under evaluation

| Role | Candidate | Version policy | License to verify | Alternative |
| --- | --- | --- | --- | --- |
| UI library | React | Latest stable at POC start; exact version recorded | MIT | Preact, Svelte (not evaluated) |
| Language | TypeScript | Latest stable; `strict` enabled | Apache-2.0 | JavaScript (not evaluated) |
| Build and dev server | Vite | Latest stable | MIT | No alternative evaluated |
| Rendering | Babylon.js | Latest stable `@babylonjs/core`; exact version recorded | Apache-2.0 | Three.js (MIT) |
| Unit testing | Built-in `node:test` for the pure model; no browser test runner by default | Node version recorded | Part of Node.js | Vitest (MIT), only if justified |

Exact versions must be pinned in the lockfile and recorded in the POC results before implementation begins. "Latest stable" is a starting instruction, not a decision.

### 4.2 Babylon.js as the primary rendering candidate

Babylon.js is the primary candidate for this POC because it provides the required viewport primitives in one package: an ArcRotateCamera, picking, transform gizmos, a grid, and scene graph management. The POC evaluates whether those features integrate cleanly with a renderer-independent world model and a React-based workspace.

This is not a final selection. Babylon.js may be rejected if any of the following occur:

- Right-handed scene configuration causes persistent transform or picking defects.
- Gizmo events cannot be reconciled with the world model without feedback loops.
- Bundle size or startup cost is unacceptable for the target environment.
- Licensing review finds an incompatible transitive dependency.

### 4.3 Three.js as a documented alternative

Three.js (MIT) is documented for comparison only. It is not implemented in this POC.

| Aspect | Babylon.js | Three.js |
| --- | --- | --- |
| Built-in gizmos | Yes, `GizmoManager` | Requires `TransformControls` addon |
| Built-in grid | Yes, `GridMaterial` or line helpers | Requires custom grid or `GridHelper` |
| Picking | Built-in scene picking | Built-in raycaster |
| Camera controls | `ArcRotateCamera` with orbit, pan, zoom | `OrbitControls` addon |
| TypeScript support | First-class | First-class via types package |
| License | Apache-2.0 | MIT |

Building both implementations requires a concrete evaluation need, such as a Babylon.js blocker that cannot be worked around. "Curiosity" is not a justification. If a second implementation is later approved, it reuses the same world model and acceptance criteria, and only the rendering adapter changes.

### 4.4 Technology decision status

No technology is selected by this document. The POC produces evidence; an ADR is required before any candidate becomes an accepted decision. Until then, all candidates remain provisional, consistent with [ADR 0001](../../../docs/decisions/0001-proposed-architecture-direction.md) and the [architecture document](../../../docs/architecture/ARCHITECTURE.md).

## 5. Workspace Layout

### 5.1 Regions

```text
+--------------------------------------------------------------------------+
| Top toolbar: New | Add Cube/Sphere/Plane | Translate/Rotate/Scale |        |
|              Grid toggle | Export | Import |                             |
+-------------+------------------------------------------+-----------------+
| Hierarchy   | World View                               | Inspector       |
|             |                                          |                 |
| - Entity A  |           (3D viewport canvas)           | Name            |
| - Entity B  |                                          | Transform       |
|             |                                          |  Position X/Y/Z |
|             |                                          |  Rotation X/Y/Z |
|             |                                          |  Scale X/Y/Z    |
|             |                                          |                 |
+-------------+------------------------------------------+-----------------+
| Status area: selection summary | entity count | last action | errors     |
+--------------------------------------------------------------------------+
```

| Region | Purpose | Minimum width | Notes |
| --- | --- | --- | --- |
| Top toolbar | World and view actions | Full width | Fixed height; no wrapping below 1024 px |
| Hierarchy | Entity list and selection | 220 px | Scrolls independently |
| World View | 3D viewport | 320 px | Fills remaining space |
| Inspector | Selected entity properties | 280 px | Scrolls independently |
| Status area | Feedback and error surface | Full width | Optional but recommended |

### 5.2 Layout behavior

- A three-column layout with a fixed-width left and right panel is sufficient. Resizable splitters are optional and not required.
- The layout must remain usable down to a 1024×640 application viewport. Below that, the POC may show a "viewport too small" notice rather than attempting a responsive redesign.
- Panel content scrolls independently. The page itself must not scroll horizontally.
- The viewport canvas must track its container size. The camera aspect ratio must update on every resize.
- Visual polish (colors, typography, icons, animations) is not evaluated beyond legibility and state clarity.

### 5.3 Status area

The status area reports:

- current selection (entity name or "No selection"),
- total entity count,
- last completed action (for example, "Created Cube"),
- import/export errors,
- renderer debug counts in a development build.

## 6. Interaction Specifications

### 6.1 Input map

| Action | Input | Notes |
| --- | --- | --- |
| Select entity | Left click in viewport or Hierarchy row | Replaces current selection |
| Clear selection | Left click empty viewport space, or `Esc` | Inspector shows empty state |
| Orbit camera | `Alt` + left drag, or middle drag | Left drag alone never orbits |
| Pan camera | `Shift` + middle drag, or right drag | Right click does not open a context menu in the viewport |
| Zoom camera | Mouse wheel | Zoom toward the cursor is optional |
| Frame selection | `F` | Centers the camera on the selected entity |
| Translate mode | `W` or toolbar button | Active mode is visibly indicated |
| Rotate mode | `E` or toolbar button | |
| Scale mode | `R` or toolbar button | |
| Delete selected | `Delete` or `Backspace` | Ignored while a text field has focus |
| Rename selected | `F2` or double click in Hierarchy | Inline edit |
| Cancel inline edit | `Esc` | Reverts to previous name |
| Commit inline edit | `Enter` or blur | Trims whitespace; empty names rejected |

Keyboard shortcuts are disabled while focus is inside a text input, a number input, or an open rename field.

### 6.2 Selection behavior

- Exactly zero or one entity is selected. Multi-select is out of scope.
- Selecting an entity in the viewport updates the Hierarchy highlight and the Inspector.
- Selecting an entity in the Hierarchy updates the viewport highlight, the gizmo target, and the Inspector.
- Clicking an entity must not start an orbit or pan.
- Clicking the transform gizmo must not change selection.
- A newly created entity becomes the sole selection.
- Deleting the selected entity clears the selection and shows the Inspector empty state.
- Deleting a non-selected entity leaves the current selection unchanged.
- After a successful import, selection is cleared deterministically.

Selection is editor state. It is never stored in the world model and never serialized.

### 6.3 Creation behavior

- Primitives are created from the toolbar (a single "Add" control with three options is sufficient).
- A created entity is appended to the world, rendered on the next frame, selected, and framed only if the camera would otherwise not show it (optional).
- Creation does not modify the camera unless framing is invoked.
- Creation does not add lights, ground planes, or other supporting objects.

### 6.4 Rename behavior

- Rename happens inline in the Hierarchy; an Inspector name field is optional.
- Names are trimmed. Empty or whitespace-only names are rejected and the previous name is restored.
- Names are limited to 128 characters.
- Duplicate names are allowed because entity identity is the ID, not the name. The UI must not imply uniqueness.
- Rename updates the Hierarchy, the Inspector header, and the serialized world in the same action.

### 6.5 Inspector transform editing

- Position and scale fields accept decimal numbers and use a step of 0.1.
- Rotation fields display degrees and use a step of 1.
- Values commit on `Enter` or blur. `Esc` reverts the focused field to its last committed value.
- Non-numeric input, `NaN`, infinite values, negative scale, zero scale, and scale below the provisional floor of `1e-3` are rejected with an inline message and the field reverts.
- Scale fields are local-space values. They describe the entity's size along its own axes, not along the world axes. The Inspector must not silently convert them to world-space values.
- One field edit must not silently alter other fields. Rotation display may change because of Euler conversion, but the stored quaternion must remain equivalent.
- The Inspector reads from the world model. It must not maintain an independent transform copy that can drift.

### 6.6 Gizmo behavior

- The gizmo attaches to the selected entity. Translate and rotate use world-space axes; scale uses the entity's local-space axes.
- The scale gizmo handles follow the entity's local orientation, so they rotate with a rotated entity. Translate and rotate handles stay aligned with the world axes.
- The gizmo is visible only when an entity is selected and the viewport has focus or the pointer is over the viewport.
- Dragging a gizmo handle takes precedence over camera movement and selection.
- During a drag, transform changes are applied to the world model at most once per animation frame so the Inspector updates live.
- On drag end, the final transform is committed once and reconciled with the model.
- A click without movement on a gizmo handle does not modify the transform.
- Gizmo interaction must not trigger a viewport selection change or a camera orbit.

### 6.7 Camera navigation

- The camera is an `ArcRotateCamera` targeting the world origin by default.
- Orbit rotates around the current target; pan moves the target in the camera plane; zoom changes the radius.
- Radius is clamped to a range that prevents the camera from entering the near plane or leaving meaningful world scale. Provisional range: 0.5 to 500 world units.
- Beta is clamped to avoid flipping over the poles. Provisional range: 0.01 to π − 0.01 radians.
- Camera navigation never moves or modifies world entities.
- Camera pose is editor state and is not serialized in this POC.

### 6.8 Grid and viewport helpers

- The grid is centered at the world origin on the XZ plane at Y = 0.
- The grid is visible by default and can be toggled from the toolbar.
- Grid visibility is editor state and is not serialized.
- Axis indicators or navigation helpers, if added, are editor-only.
- Selection feedback must remain readable against the grid at all camera angles.

### 6.9 Error surface

- Import and validation failures appear in the status area and, for malformed files, in a dismissible message that names the failing rule.
- Renderer errors are logged to the console and surfaced in the status area during development.
- The application must remain usable after any handled error; a failed import must not clear the current world.

## 7. Empty-World Requirements

A newly created world contains **zero** user-created entities.

The following are editor-only and must not be ordinary world entities:

- Editor camera.
- Editor grid.
- Selection outline or highlight.
- Transform gizmos.
- Viewport navigation helpers and axis indicators.

Rules:

- The Hierarchy is empty on a new world and shows an explicit empty state.
- The Inspector shows an empty state when nothing is selected.
- The exported world contains an empty `entities` array.
- The editor does not automatically create a floor, cube, sphere, light, or any other world content.
- Editor-only objects are created by the rendering adapter and are excluded from serialization by construction, not by a filter applied at export time.
- The world model has no representation for camera or grid objects. There is no `type` value for them.

A user may explicitly create a floor by adding a plane; the editor does not do it for them.

## 8. Primitive Object Requirements

### 8.1 Supported types

| Type | Geometry | Creation defaults | Notes |
| --- | --- | --- | --- |
| `cube` | 1×1×1 unit cube centered on its origin | Position (0, 0.5, 0); identity rotation; scale 1 | Rests on the grid plane |
| `sphere` | Diameter 1 (radius 0.5), 32 segments | Position (0, 0.5, 0); identity rotation; scale 1 | Rests on the grid plane |
| `plane` | 1×1 plane in the XZ plane, normal +Y | Position (0, 0, 0); identity rotation; scale 1 | Double-sided for this POC |

Geometry dimensions are fixed for the POC. Parametric size editing, materials, and textures are out of scope. Scale can change apparent dimensions.

### 8.2 Entity fields

Each created entity has:

- a stable entity ID,
- a display name,
- an object type,
- a transform,
- a metadata object reserved for future per-entity data.

### 8.3 Naming

- Default names are `Cube`, `Sphere`, and `Plane`.
- If the default name is already in use, append a numeric suffix: `Cube 2`, `Cube 3`, and so on.
- Names are not unique identifiers and may be duplicated after rename.
- Names are stored exactly as entered after trimming.

### 8.4 Creation lifecycle

1. Generate an entity ID with `crypto.randomUUID()`.
2. Build the entity with type defaults and an empty metadata object.
3. Append it to the world entity list.
4. Select it and update editor state.
5. Notify subscribers: the adapter creates the mesh, the Hierarchy adds a row, the Inspector renders the entity.

If any step after step 3 fails, the world must not be left with a partially rendered entity. The POC may satisfy this by creating the entity only after the adapter acknowledges the mesh, or by reconciling the adapter on the next world change. The chosen approach must be documented in the POC results.

### 8.5 Deletion lifecycle

1. Remove the entity from the world entity list.
2. If it was selected, clear selection and reset the Inspector.
3. Notify subscribers: the adapter disposes the mesh and its materials, and the Hierarchy removes the row.
4. Verify that the adapter's tracked mesh count equals the world entity count.

Deletion must not be undoable in this POC. The absence of undo is a documented limitation, not a defect.

### 8.6 Rename lifecycle

Renaming only changes the `name` field. It must not change the ID, transform, metadata, or mesh identity.

## 9. Transform System

### 9.1 Coordinate conventions

The world model defines these conventions explicitly:

- **Handedness:** right-handed.
- **Up axis:** +Y.
- **Forward:** -Z (the default camera looks toward -Z).
- **Units:** world units. The POC treats 1 unit as 1 meter provisionally; this is not a binding product decision.
- **Rotation storage:** unit quaternion `(x, y, z, w)`, normalized. The quaternion is the source of truth; Euler angles are never stored.
- **Rotation display:** Euler angles in degrees, composed in YXZ order (yaw around Y, then pitch around X, then roll around Z). The Inspector labels the fields X, Y, Z and must state the composition order in a tooltip or help text. Euler values are a display and editing convenience only.
- **Scale:** local-space size along the entity's own axes. Positive, finite, and not near zero per axis.
- **Transform model:** translation, rotation quaternion, and local scale (TRS). Shear and an arbitrary affine matrix are not part of POC-01.

POC-01 uses a **hybrid transform policy**:

| Transform | Coordinate space | Stored representation |
| --- | --- | --- |
| Translate | World | `position` |
| Rotate | World | `rotation` quaternion |
| Scale | Local | `scale` |

Entities are unparented in POC-01, so an entity's local axes are its world axes rotated by its own quaternion. `position` is a world-space translation, `rotation` is the world-space orientation, and `scale` is the local size. The transform is still a plain TRS transform; the hybrid policy describes how gizmos interpret and edit it, not a new data representation. There is no shear component and no general 4×4 matrix in the world model.

Babylon.js is configured with `scene.useRightHandedSystem = true` so the adapter does not mirror transforms. If this setting produces defects in picking, gizmos, or camera behavior, the alternative is an explicit conversion layer with its own tests. The decision and its consequences must be recorded in the POC results.

### 9.2 Transform schema

```ts
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface Transform {
  position: Vec3; // world-space translation, right-handed, Y-up
  rotation: Quat; // world-space orientation, unit quaternion
  scale: Vec3;    // local-space size along the entity's own axes
}
```

The fields above are the complete transform contract. POC-01 does not add a `shear` field, a matrix field, or a coordinate-space flag. Because entities are unparented, the stored transform is also the entity's world transform: `position` is already in world space and `scale` is applied before `rotation` in the standard TRS composition. The hybrid gizmo policy in §9.6 changes only how edits are produced and interpreted, never the stored schema.

Default transform:

```json
{
  "position": { "x": 0, "y": 0, "z": 0 },
  "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
  "scale": { "x": 1, "y": 1, "z": 1 }
}
```

Creation overrides the position for cube and sphere as described in §8.1.

### 9.3 Validation rules

- All components must be finite numbers.
- The quaternion must have a length greater than zero. Import normalizes it; the Inspector never displays an unnormalized value.
- Scale components must be finite, strictly positive, and at least `1e-3` in absolute value. Negative scale, zero scale, and near-zero scale are **not supported** in POC-01 and are rejected with `INVALID_TRANSFORM`. The `1e-3` floor is a provisional POC guardrail against degenerate geometry and division by near-zero values in transform math, not a measured product limit.
- Negative scale is explicitly unsupported, not merely unimplemented. The Inspector rejects it, the importer rejects it, and no gizmo affordance produces it. Mirrored rendering is therefore not a POC behavior. Revisiting the policy is recorded as Q-14 in §19.
- Rotation values from the Inspector are converted from degrees to radians, then composed into a quaternion. The conversion must be deterministic and unit tested.
- Euler display is derived from the stored quaternion. At gimbal lock (pitch near ±90°), the displayed X/Y/Z split may not be unique; the quaternion remains the source of truth. This behavior must be documented and tested.

### 9.4 Editing paths

| Path | Flow |
| --- | --- |
| Inspector | Field commit → Transform Controller validates and resolves the value in the field's coordinate space → `SetTransform` command → world update → adapter reconcile → Inspector reflects committed value |
| Gizmo | Drag event → Transform Controller applies the mode's coordinate space (world for translate and rotate, local for scale) → throttled `SetTransform` command → world update → adapter reconciles all entities except the dragged one → Inspector reads new value |
| Import | Validate document → replace world → adapter reconciles all entities → selection cleared |

### 9.5 Synchronization and feedback-loop prevention

Two-way synchronization is the highest-risk interaction in this POC and must be designed explicitly:

- The world model is the single source of truth for transforms. The Babylon mesh is a projection.
- The adapter compares incoming transforms with the mesh's current local transform using an epsilon of 1e-5 and skips no-op writes.
- While a gizmo drag is active, the adapter suppresses write-back to the mesh being dragged. The drag owns the visual transform until release.
- On drag end, the world model receives the final transform, and the adapter resumes normal reconciliation.
- Switching the gizmo mode re-attaches a different gizmo to the same entity. It is an editor-state change only: it must not dispatch `SetTransform`, normalize the quaternion, rewrite the scale, or change the mesh transform.
- The Inspector is a controlled view over the world model. It does not keep a parallel transform state between commits.
- Any detected oscillation, drift, or transform reset is a correctness failure, not a cosmetic issue.

### 9.6 Gizmo modes

| Mode | Gizmo | Space | Commit behavior |
| --- | --- | --- | --- |
| Translate | Position | World | Per-frame model updates; final commit on release |
| Rotate | Rotation | World | Per-frame model updates; final commit on release |
| Scale | Scale | Local | Per-frame model updates; final commit on release |

Rules:

- The scale gizmo is attached so its handles follow the entity's local axes. For a rotated entity, the scale handles rotate with it.
- There is no local/world toggle, no separate scale-space control, and no custom world-space scale implementation.
- World-space scale is not part of POC-01. A world-axis non-uniform scale on a rotated entity produces shear, which the TRS transform cannot represent (§9.8).
- Uniform-scale handles are optional. If present, they must also operate in local space.

### 9.7 Transform policy ownership

Transform policy is a product-editor decision, not a renderer feature.

| Layer | Responsibility for transforms |
| --- | --- |
| World model (`world/`) | Stores `position`, `rotation`, and `scale` as data. Validates, compares, and serializes them. Contains no coordinate-space policy, no Babylon.js type, and no React dependency. |
| Editor / Transform Controller (`editor/`) | Owns the hybrid policy: translation and rotation are interpreted and displayed in world space; scale is interpreted and displayed in local space. Resolves what a gizmo drag or Inspector commit means before it becomes a `SetTransform` command. |
| Renderer adapter (`renderer/`) | Translates the policy into Babylon.js configuration and interaction: world-oriented translate and rotate gizmos, a local-oriented scale gizmo, and projection of world data onto meshes. |
| Workspace UI (`ui/`) | Displays values and dispatches commands. It does not convert between coordinate spaces on its own. |

Babylon.js is a renderer. Its defaults, helpers, and limitations do not define the product's transform policy. If Babylon cannot express a policy directly, the adapter maps it to the closest supported interaction and records the limitation; the policy is not silently changed to match the renderer.

POC-01 does not introduce a generic transform-abstraction framework. The boundary is enforced by the module dependency rules in §10.2 and by the `SetTransform` command, which always carries a fully resolved TRS transform in the world model's representation.

### 9.8 Future extensibility: world-space scale

The architecture leaves room to evaluate world-space scale in a later phase. It does not support world-space scale today, and it does not guarantee that world-space scale can be added without structural change.

Any future proposal must evaluate, at minimum:

- **TRS versus affine matrix.** A world-axis non-uniform scale on a rotated entity produces shear. TRS cannot store shear. An affine matrix or a separate shear representation changes the transform contract, validation, Inspector editing, and serialization.
- **Shear.** Whether shear is representable, how it is authored, and how it is displayed without misleading Euler or scale values.
- **Physics and collision shapes.** Colliders commonly assume a rigid transform with positive scale. Shear and negative scale complicate collision detection, mass properties, and contact resolution.
- **Asset sharing and mesh geometry.** If geometry is shared between entities, per-entity non-uniform scale may require baking, instancing limits, or per-instance matrices.
- **Serialization.** A schema version bump, migration path, and round-trip tests for the richer representation.
- **Undo/redo.** History entries and commands must store the richer transform without losing precision or producing non-invertible states.
- **Renderer and simulation compatibility.** Babylon.js, physics, and any future simulation module must agree on the representation and its update semantics.

No decision is made here. POC-01 records the constraint and defers the evaluation to a separate decision with its own evidence.

## 10. World Data Architecture

### 10.1 Layer separation

```text
+-------------------------------------------------------------+
| Workspace UI (React)                                        |
| Toolbar, Hierarchy, Inspector, status area                  |
+------------------------------+------------------------------+
                               | commands / subscriptions
+------------------------------v------------------------------+
| Editor state and transform controller                       |
| selection, gizmo mode, grid visibility, camera, policy      |
+------------------------------+------------------------------+
                               | reads and writes world
+------------------------------v------------------------------+
| World data model (pure TypeScript)                          |
| entities, IDs, transforms, schema validation, serialization |
+------------------------------+------------------------------+
                               | world snapshots and changes
+------------------------------v------------------------------+
| Rendering adapter (Babylon.js)                              |
| meshes, materials, camera, grid, gizmos, picking, outline   |
+-------------------------------------------------------------+
```

### 10.2 Dependency rules

| Module | May depend on | Must not depend on |
| --- | --- | --- |
| `world/` | Standard library only | Babylon.js, React, DOM APIs, editor state |
| `editor/` | `world/` | Babylon.js, React components |
| `renderer/` | `world/`, Babylon.js | React, editor UI components |
| `ui/` | `editor/`, `world/` types, renderer interface | Babylon.js internals, direct renderer object access |
| `app/` | All of the above | Business logic beyond composition |

Proposed directory layout:

```text
src/
  world/        # schemas, validation, serialization, pure factories
  editor/       # editor state, commands, selection
  renderer/     # Babylon adapter and editor-only scene objects
  ui/           # React workspace and panels
  app/          # composition root and bootstrap
```

The world model must be testable in Node without a canvas. A static check must confirm that `src/world/**` contains no import of `@babylonjs/*`, `react`, or DOM globals.

Transform policy lives in `editor/`, as described in §9.7. The world model stores the transform contract but does not know whether a value was produced by a world-space or local-space interaction. The adapter applies the policy to Babylon.js; it does not own or redefine it.

### 10.3 Entity schema

```ts
type EntityId = string; // UUID v4
type EntityType = "cube" | "sphere" | "plane";
type GizmoMode = "translate" | "rotate" | "scale";

interface WorldEntity {
  id: EntityId;
  name: string;
  type: EntityType;
  transform: Transform;
  metadata: Record<string, unknown>;
}
```

`metadata` is a plain JSON object. POC-created entities use `{}`. The POC preserves it verbatim through save and load but does not interpret it. It is not a component system.

Entities are flat in this POC. There is no parent-child hierarchy, no scene graph in the world model, and no component array. The Hierarchy panel displays a flat list.

### 10.4 Entity IDs

- Generated with `crypto.randomUUID()`.
- Opaque, stable for the lifetime of the entity, and never reused.
- Validated on import as a non-empty string matching a UUID v4 pattern.
- Duplicate IDs in one document are rejected.
- IDs are not derived from names, indices, or mesh names.

### 10.5 World schema

```ts
interface World {
  entities: WorldEntity[];
}

interface WorldDocument {
  format: "simuforge.world";
  schemaVersion: 1;
  entities: WorldEntity[];
}
```

The runtime world contains only entities. The serialized document adds the format marker and schema version. A single conversion function maps between them, so the format metadata cannot drift into runtime logic.

### 10.6 Editor state schema

```ts
interface EditorState {
  selectedEntityId: EntityId | null;
  gizmoMode: GizmoMode;
  gridVisible: boolean;
  camera: {
    target: Vec3;
    alpha: number;
    beta: number;
    radius: number;
  } | null;
}
```

Editor state is not part of the world and is not serialized.

### 10.7 Selection ownership

- The editor store owns selection.
- The world model does not know which entity is selected.
- The adapter receives selection as a separate input and renders the outline and gizmo.
- UI components derive highlight and Inspector content from editor state plus world data.

### 10.8 Renderer adapter contract

```ts
interface WorldRenderer {
  mount(canvas: HTMLCanvasElement): void;
  setWorld(world: World): void;
  setSelection(id: EntityId | null): void;
  setGizmoMode(mode: GizmoMode): void;
  frameEntity(id: EntityId): void;
  onTransformChange(
    callback: (
      id: EntityId,
      transform: Transform,
      phase: "start" | "change" | "end"
    ) => void
  ): () => void;
  getDiagnostics(): { meshCount: number; drawCalls: number; fps: number };
  dispose(): void;
}
```

Adapter rules:

- It owns Babylon scene, engine, camera, grid, gizmos, and all meshes.
- It stores its own `Map<EntityId, Mesh>` for reconciliation. That map is never exposed to the world model or the UI.
- `setWorld` reconciles by ID: create missing meshes, update changed transforms, dispose removed meshes.
- The adapter must not mutate the world object it receives.
- Editor-only objects are created by the adapter and tagged internally as non-entities.
- `setGizmoMode` configures the corresponding gizmo for the policy in §9.6 (world for translate and rotate, local for scale) and must not write to the world model.
- `getDiagnostics` exists for acceptance testing and development builds, not as a product feature.

### 10.9 Default values

| Field | Default |
| --- | --- |
| World `entities` | `[]` |
| Transform position | `(0, 0, 0)` |
| Transform rotation | identity quaternion `(0, 0, 0, 1)` |
| Transform scale | `(1, 1, 1)` |
| Entity metadata | `{}` |
| Gizmo mode | `translate` |
| Grid visible | `true` |
| Selection | `null` |

Defaults are applied by creation commands and editor initialization. Import does not fill missing required fields with defaults; a missing required field is a validation error.

### 10.10 State flow

```text
User action -> command -> validate -> update world or editor state
           -> notify subscribers -> adapter reconcile + UI render
```

Commands are the only way to mutate state. The UI and adapter dispatch commands; they do not assign to world fields directly. Commands to implement:

- `CreateEntity(type)`
- `DeleteEntity(id)`
- `RenameEntity(id, name)`
- `SetTransform(id, transform)`
- `SetSelection(id | null)`
- `SetGizmoMode(mode)`
- `SetGridVisible(visible)`
- `ReplaceWorld(world)`

The specific state library is not selected by this document. A small custom store using `useSyncExternalStore` is an acceptable default; adding a state-management dependency requires justification. This is recorded in §19.

## 11. Serialization

### 11.1 Format

JSON, UTF-8, one document per file.

```json
{
  "format": "simuforge.world",
  "schemaVersion": 1,
  "entities": [
    {
      "id": "3f2c1a9e-8b4d-4c6f-9a1e-2d7b5c8e4f10",
      "name": "Cube",
      "type": "cube",
      "transform": {
        "position": { "x": 0, "y": 0.5, "z": 0 },
        "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
        "scale": { "x": 1, "y": 1, "z": 1 }
      },
      "metadata": {}
    }
  ]
}
```

### 11.2 Validation rules

| Rule | Failure behavior |
| --- | --- |
| Document is valid JSON | Reject with `INVALID_JSON` |
| Top-level value is an object | Reject with `INVALID_DOCUMENT` |
| `format` equals `simuforge.world` | Reject with `UNKNOWN_FORMAT` |
| `schemaVersion` is a supported integer | Reject with `UNSUPPORTED_SCHEMA_VERSION` |
| `entities` is an array | Reject with `INVALID_DOCUMENT` |
| Every entity has a valid ID | Reject with `INVALID_ENTITY_ID` |
| Entity IDs are unique | Reject with `DUPLICATE_ENTITY_ID` |
| `name` is a non-empty string of at most 128 characters | Reject with `INVALID_NAME` |
| `type` is `cube`, `sphere`, or `plane` | Reject with `UNKNOWN_ENTITY_TYPE` |
| Transform fields exist and are finite numbers | Reject with `INVALID_TRANSFORM` |
| Quaternion length is greater than zero | Reject with `INVALID_TRANSFORM` |
| Scale components are finite, positive, and at least `1e-3` | Reject with `INVALID_TRANSFORM` |
| `metadata` is a plain JSON object | Reject with `INVALID_METADATA` |

Validation returns a structured result:

```ts
type ImportResult =
  | { ok: true; world: World }
  | { ok: false; code: ImportErrorCode; message: string; path?: string };
```

The first failure stops validation and is reported with a path such as `entities[2].transform.scale.y`.

### 11.3 Atomicity

Import validates into a new world object first. The current world is replaced only if validation succeeds. A failed import leaves the current world, selection, camera, and renderer untouched.

### 11.4 Schema version policy

- Version `1` is the only supported version in this POC.
- A higher version is rejected with a message explaining that the file was created by a newer SimuForge build and cannot be loaded.
- Version `0`, negative versions, non-integers, and non-numbers are rejected as unsupported.
- No migration chain is implemented. Migration design belongs to the Project & Persistence System phase, informed by this POC's versioning evidence.
- The version field is mandatory. Missing versions are rejected, not defaulted.

### 11.5 Export and import UX

- Export downloads a `.world.json` file named from a fixed default or a user-provided name.
- Import uses a file picker and reads a single file.
- Import is all-or-nothing.
- A provisional import size cap must be enforced to avoid freezing the tab. The exact cap is set during implementation and recorded in the results; it must be based on a measured parse time, not an arbitrary guess presented as a product limit.
- No autosave, IndexedDB, cloud, or local storage persistence is implemented.

### 11.6 Exclusions

The exported document contains no:

- camera pose or camera settings,
- grid visibility or grid settings,
- selection or gizmo mode,
- UI layout or panel sizes,
- renderer settings, materials, lights, or environment,
- editor history or undo stack.

## 12. Test Plan

### 12.1 Test environment

Record before testing:

- operating system and version,
- CPU, GPU, and RAM,
- browser and exact version,
- display resolution and scaling,
- application build hash or commit,
- exact dependency versions,
- date and tester role.

Tests run in at least one Chromium-based browser (Chrome or Edge) and one Firefox version. Safari is optional and recorded if available.

### 12.2 Test scenes

| Scene | Contents | Purpose |
| --- | --- | --- |
| S0 | Empty world | Empty-world and layout tests |
| S1 | One cube, one sphere, one plane | Functional tests |
| S2 | Manual mixed scene, 10 entities | Sync and serialization tests |
| S3 | Deterministic grid of 10 primitives | Performance baseline |
| S4 | Deterministic grid of 50 primitives | Performance baseline |
| S5 | Deterministic grid of 100 primitives | Performance baseline |
| S6 | Generated create/delete cycles | Leak and stability tests |
| S7 | One rotated cube (45° Y), one 90° rotated cube, one non-uniformly scaled cube with a combined rotation | Local-space scale, mode-switch, and transform round-trip tests |

Performance scenes are generated by a seeded script so results are reproducible. The seed and generator settings are recorded.

### 12.3 Procedure and evidence

- Execute tests in the order of the acceptance groups.
- For each test, record PASS, FAIL, or BLOCKED and a short observation.
- Attach evidence: screenshot, exported JSON fixture, console log excerpt, or performance log.
- Automated model and serialization tests run in CI or locally without a browser; their output is attached as text.
- Manual viewport tests are performed by a human; automated assertions are added only where the cost is justified.
- A failed test is not deleted or reworded. It is recorded with its result and linked to a follow-up.

### 12.4 Result storage

During execution, results are appended to this document or stored in a sibling results document under `projects/simuforge/docs/`. The results document must include the environment sheet, the per-test result table, raw performance logs, and the evaluation score. It does not exist yet.

## 13. Acceptance Criteria

Each criterion has a test ID, description, procedure, expected result, validation method, and result field. The result field is filled during POC execution. None of these criteria has been executed.

### A. Workspace

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| A-01 | Workspace layout renders correctly | Open the POC at a 1440×900 application viewport with a new world. | Toolbar, Hierarchy, World View, Inspector, and status area are all visible and do not overlap. | Manual inspection; screenshot | PASS / FAIL / BLOCKED — evidence: |
| A-02 | Panels remain usable at the minimum size | Set the application viewport to 1024×640. Scroll each panel and use every toolbar control. | All regions remain visible; controls are reachable; panel content scrolls independently; no horizontal page scroll. | Manual; screenshot | PASS / FAIL / BLOCKED — evidence: |
| A-03 | Viewport resizes without breaking the canvas | Resize the window from 1024×640 to 1920×1080 in 10 steps and back. Observe the viewport and console. | The canvas exactly fills the World View region; aspect ratio stays correct (sphere remains round); no distortion, stretching, or console errors. | Manual; screenshot; console log | PASS / FAIL / BLOCKED — evidence: |

### B. Empty World

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| B-01 | A new world contains zero user-created entities | Start the application with a new world; read the Hierarchy and export the world. | Hierarchy shows an empty state; entity count is 0; exported JSON has `"entities": []`. | Manual; JSON inspection | PASS / FAIL / BLOCKED — evidence: |
| B-02 | Editor camera and grid are visible but not world entities | With an empty world, inspect the viewport, Hierarchy, and export. | Camera navigation and grid are visible in the viewport; neither appears in the Hierarchy or in exported JSON; no camera or grid entity type exists. | Manual; JSON inspection | PASS / FAIL / BLOCKED — evidence: |
| B-03 | No default floor or primitive is created | Create a new world and inspect viewport, Hierarchy, and export. | No floor, cube, sphere, light, or other world content is created automatically. | Manual; JSON inspection | PASS / FAIL / BLOCKED — evidence: |

### C. Object Creation

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| C-01 | Cube can be created | Use the Add control to create a cube. | One entity appears in the Hierarchy and the viewport; type is `cube`; position is (0, 0.5, 0); scale is 1; a unique ID exists. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| C-02 | Sphere can be created | Create a sphere. | One entity appears in both regions; type is `sphere`; visible radius matches the 1-unit diameter; defaults are applied. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| C-03 | Plane can be created | Create a plane. | One flat entity appears in both regions at Y = 0, oriented in the XZ plane, visible from above and below. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| C-04 | Entity identity is stable | Create several entities; record IDs from export; move, rotate, scale, and rename one; export again. | IDs are unchanged by transforms and rename; all IDs are unique; no ID is reused after deletion. | Export diff | PASS / FAIL / BLOCKED — evidence: |
| C-05 | Rename updates all relevant UI | Rename an entity inline in the Hierarchy; confirm with Enter. | Hierarchy and Inspector show the new name immediately; the exported document contains the new name; the old name disappears from the UI. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| C-06 | Delete removes the entity everywhere | Delete an entity using the toolbar, `Delete`, and the context action; verify after each. | The entity disappears from the viewport, Hierarchy, and export; entity count decreases by one; renderer mesh count equals entity count. | Manual; export; diagnostics | PASS / FAIL / BLOCKED — evidence: |

### D. Selection

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| D-01 | Selecting from the viewport updates Hierarchy and Inspector | Click a visible entity in the viewport. | The entity is highlighted in the viewport; its Hierarchy row is selected; the Inspector shows its properties. | Manual; screenshot | PASS / FAIL / BLOCKED — evidence: |
| D-02 | Selecting from Hierarchy updates viewport and Inspector | Click a different entity row in the Hierarchy. | The viewport highlights that entity and moves the gizmo to it; the previous highlight clears; the Inspector updates. | Manual; screenshot | PASS / FAIL / BLOCKED — evidence: |
| D-03 | Selection remains consistent after creation | Select an existing entity, then create a new primitive. | The new entity becomes the sole selection in viewport, Hierarchy, and Inspector. | Manual | PASS / FAIL / BLOCKED — evidence: |
| D-04 | Selection remains consistent after deletion | Delete the selected entity, then delete a non-selected entity. | Deleting the selected entity clears selection everywhere and shows the Inspector empty state; deleting a non-selected entity leaves the current selection unchanged. | Manual | PASS / FAIL / BLOCKED — evidence: |

### E. Transform

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| E-01 | Position can be edited from the Inspector | Select an entity; set Position X to 2.5; press Enter. | The entity moves to X = 2.5 on the next frame; Y and Z are unchanged; the value persists after deselection and reselection. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-02 | Rotation can be edited from the Inspector | Set Rotation Y to 90°; press Enter. | The entity rotates 90° around world Y; the displayed value remains 90°; the stored quaternion is normalized. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-03 | Scale can be edited from the Inspector | Set Scale Y to 2; press Enter. | The entity doubles in height about its origin; X and Z scales remain 1; the value persists. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-04 | Viewport gizmos respect the hybrid transform policy | For translate and rotate: activate the mode and drag a handle. For scale: rotate the entity first, then drag a scale handle. Release after each drag. | Translate moves along world axes; rotate turns around world axes; scale stretches along the entity's local axes. Each drag changes only the corresponding transform; the Inspector updates; the exported transform matches the final visual result. | Manual; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-05 | Inspector and viewport remain synchronized | Alternate 10 edits between Inspector and gizmo for position, rotation, and scale; include one continuous 5-second drag. | No oscillation, drift, or reset; Inspector and viewport agree within 1e-4 units and 0.1°; values do not snap back after drag release. | Manual; numeric comparison; export | PASS / FAIL / BLOCKED — evidence: |
| E-06 | Local-space scale on an unrotated entity | Select a cube with identity rotation; set Scale X to 2 in the Inspector; then drag the local X scale handle to approximately 3. | The cube stretches along its own X axis, which coincides with world X; Y and Z scales remain 1; the stored scale reads approximately (3, 1, 1); rotation stays identity. | Manual; Inspector values; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-07 | Local-space scale after a 45° rotation | Rotate a cube 45° around Y; set Scale X to 2; then drag the local X scale handle. | The cube stretches along its rotated local X axis, not along world X; the quaternion is unchanged by the scale edit; the exported scale is (2, 1, 1) and the quaternion still represents 45° around Y. | Manual; numeric comparison; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-08 | Local-space scale after a 90° rotation | Rotate a cube 90° around Y; set Scale Z to 2; then drag the local Z scale handle. | The cube stretches along its rotated local Z axis; the direction is consistent with the rotation convention in §9.1 and does not silently follow a world axis; translation and rotation are unchanged; the visual result matches the Inspector. | Manual; numeric comparison; export inspection | PASS / FAIL / BLOCKED — evidence: |
| E-09 | Non-uniform local scale on a rotated entity | Rotate a cube 30° around Y and 20° around X; set Scale to (2, 0.5, 1.5); export and re-import. | Each axis scales along the entity's own rotated axis; the mesh does not shear; the quaternion is unchanged; exported scale matches the Inspector; the re-imported entity has the same orientation and dimensions. | Manual; screenshot; export/import comparison | PASS / FAIL / BLOCKED — evidence: |
| E-10 | Switching gizmo modes does not change the transform | Select an entity with non-identity position, rotation, and scale; record the transform; switch Translate → Rotate → Scale → Translate without dragging; export. | Position, quaternion, and scale are unchanged within 1e-6 after every switch; the mesh does not jump; no `SetTransform` is dispatched by a mode switch. | Export diff; command log | PASS / FAIL / BLOCKED — evidence: |
| E-11 | Gizmo and Inspector agree during scale edits | With a rotated entity selected, drag a local scale handle for 5 seconds, then release; then type the resulting value in the Inspector. | Inspector values track the drag live; after release, the Inspector and world model agree within 1e-4; typing the same value produces the same visual change as the drag; no snap-back occurs. | Manual; numeric comparison | PASS / FAIL / BLOCKED — evidence: |
| E-12 | Transform survives serialization round-trip | Build a world with an identity entity, a 45°-rotated entity, a 90°-rotated entity, a non-uniformly scaled entity, and one entity combining rotation and non-uniform scale; export; import into a new session. | Position and scale match within 1e-6 per component; the quaternion matches within 1e-6 per component or as an equivalent unit quaternion (`q` and `-q` accepted); orientation and dimensions match; no shear appears. | Automated JSON comparison; manual screenshot | PASS / FAIL / BLOCKED — evidence: |
| E-13 | Near-zero scale is rejected | Set Scale X to `0.0001` in the Inspector; import a valid document with `scale.x = 0.0001`; attempt a gizmo drag that would shrink an axis below the floor. | The Inspector rejects the value with an inline message and reverts; import is rejected with `INVALID_TRANSFORM`; the drag stops at the minimum or is rejected without producing a degenerate transform; the application remains usable. | Manual; console log; import result | PASS / FAIL / BLOCKED — evidence: |
| E-14 | Negative scale policy is explicit and enforced | Set Scale Y to `-1` in the Inspector; import a valid document with `scale.y = -1`; look for any gizmo control that produces a negative scale. | The Inspector rejects `-1` with a message stating that negative scale is unsupported; import is rejected with `INVALID_TRANSFORM`; no gizmo affordance produces negative scale; §16.1 documents the limitation. This criterion verifies the unsupported policy, not mirrored rendering. | Manual; console log; documentation check | PASS / FAIL / BLOCKED — evidence: |
| E-15 | Quaternion remains valid after repeated transforms | Apply 200 alternating rotate, scale, translate, and mode-switch operations, including Inspector edits and at least 20 gizmo drags; export. | Every stored quaternion has finite components and a length within 1e-6 of 1; orientation remains equivalent to the applied rotations; no `NaN`, zero quaternion, or non-finite scale appears; the export validates successfully. | Automated assertion on exported JSON; numeric log | PASS / FAIL / BLOCKED — evidence: |

### F. Data Architecture

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| F-01 | World model is independent of Babylon.js instances | Inspect imports under `src/world/` and run the compiled model tests in Node with no DOM or Babylon loaded. | No Babylon.js, React, or DOM imports in the world model; schema, validation, and serialization tests pass without a canvas. | Static import check; unit test | PASS / FAIL / BLOCKED — evidence: |
| F-02 | Renderer can be reconstructed from world data | Export a 10-entity world; reload the application; import the file. | All 10 entities are recreated with matching IDs, names, types, and transforms (position and scale within 1e-6, rotation within 1e-6 per component); no duplicate meshes. | Export/import comparison; diagnostics | PASS / FAIL / BLOCKED — evidence: |
| F-03 | Editor-only objects are not serialized as world entities | Select an entity, orbit and zoom the camera, hide the grid, change the gizmo mode, then export. | Exported JSON contains only world entities; no camera, grid, selection, gizmo, or layout state is present. | JSON inspection | PASS / FAIL / BLOCKED — evidence: |

### G. Serialization

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| G-01 | Export and import preserve world data | Build a world with a cube, a sphere, and a plane; export; create a new world; import the file. | Entity count, IDs, names, types, and transforms are preserved; selection is cleared; no console errors. | Manual; automated JSON diff | PASS / FAIL / BLOCKED — evidence: |
| G-02 | Malformed data is handled safely | Import, in turn: invalid JSON syntax; missing `entities`; an entity missing `id`; duplicate IDs; zero scale; negative scale; near-zero scale; a string position component. | Each import is rejected with a specific error; the current world is unchanged after each attempt; the application remains usable. | Manual; console log | PASS / FAIL / BLOCKED — evidence: |
| G-03 | Unsupported schema versions produce an understandable error | Import a valid document with `schemaVersion: 999`, then one with `schemaVersion: "one"`, then one with no version. | Each is rejected with an "unsupported schema version" message that does not expose a stack trace; no partial world is loaded; the current world is unchanged. | Manual; console log | PASS / FAIL / BLOCKED — evidence: |
| G-04 | Unknown format is rejected | Import a document with `format: "something.else"`, then one with no `format`. | Both are rejected with an understandable format error; the current world is unchanged. | Manual | PASS / FAIL / BLOCKED — evidence: |

### H. Performance and Stability

| ID | Criterion | Test procedure | Expected result | Validation method | Result |
| --- | --- | --- | --- | --- | --- |
| H-01 | 10-object scene baseline | Load scene S3; record FPS for 60 s idle and 60 s orbiting; select entities and edit one transform; record interaction latencies. | No crash; the scene renders and remains interactive; FPS and latency values are recorded with the environment sheet. | Metrics capture; manual | PASS / FAIL / BLOCKED — evidence: |
| H-02 | 50-object scene baseline | Repeat the H-01 procedure with scene S4. | No crash; values are recorded; any visible degradation is described. | Metrics capture; manual | PASS / FAIL / BLOCKED — evidence: |
| H-03 | 100-object scene baseline | Repeat the H-01 procedure with scene S5. | No crash; values are recorded; selection, Inspector edits, and gizmo drags still complete without error. | Metrics capture; manual | PASS / FAIL / BLOCKED — evidence: |
| H-04 | Repeated creation and deletion | Run 200 create-then-delete cycles, mixed across all primitive types. | Entity count returns to baseline, renderer mesh count matches, no duplicate meshes remain, no unhandled errors; heap usage is recorded before and after and any non-plateauing trend is reported. | Diagnostics; memory capture | PASS / FAIL / BLOCKED — evidence: |
| H-05 | Viewport resize stress | Resize the viewport 50 times between 1024×640 and 1920×1080. | Canvas remains correctly sized; no WebGL context loss, stretching, or errors; interaction still works afterward. | Manual; console log | PASS / FAIL / BLOCKED — evidence: |
| H-06 | Stability soak | Run a 10-minute session alternating orbit, selection, Inspector edits, and gizmo drags. | No crash; no unhandled console errors; viewport, Inspector, model, and export remain consistent at the end. | Manual; console log; export | PASS / FAIL / BLOCKED — evidence: |

**Total acceptance criteria: 44** (A: 3, B: 3, C: 6, D: 4, E: 15, F: 3, G: 4, H: 6).

## 14. Performance Evaluation Plan

### 14.1 Metrics

| Metric | Definition | Collection |
| --- | --- | --- |
| Average FPS | Mean rendered frames per second over the sample window | Renderer diagnostics or `requestAnimationFrame` timestamps |
| Minimum FPS | Lowest 1-second average during the window | Same |
| p95 frame time | 95th percentile frame duration | Same |
| Selection latency | Time from click to the frame where Hierarchy and Inspector reflect the selection | `performance.now()` plus two animation frames |
| Inspector commit latency | Time from Enter/blur to the frame where the viewport reflects the transform | Same |
| Gizmo drag responsiveness | Frame time while dragging, reported as average and p95 | Frame timestamps during drag |
| Heap usage | JS heap after scene load and after cleanup | Browser performance tools; `performance.memory` where available |
| Mesh count | Adapter-tracked meshes | Renderer diagnostics |

### 14.2 Procedure

- Use scenes S3 (10), S4 (50), and S5 (100) generated with the same seed.
- Warm up for 10 seconds before each recording.
- Record 60 seconds idle and 60 seconds of continuous orbit at a fixed speed.
- Perform three selection and three Inspector-commit measurements per scene; report median and p95.
- For the 100-object scene, also record a 10-second gizmo drag.
- Capture heap before load, after load, and after deleting all entities.
- Repeat each measurement twice and report both runs if they differ by more than 10%.

### 14.3 No invented pass threshold

This document does not define a passing FPS or latency threshold. Baseline values must be collected first. After collection:

- Report actual observations for each scene and browser.
- Identify the scene size and interaction where degradation becomes user-visible.
- Recommend a realistic target for the MVP based on the measured hardware class and browser.
- Distinguish a POC acceptance criterion (measurement recorded, no crash, interaction completes) from a future product performance target (a number to be set after evidence).

### 14.4 Recording template

| Scene | Browser | Avg FPS | Min FPS | p95 frame (ms) | Selection (ms) | Inspector commit (ms) | Heap (MB) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S3 (10) | | | | | | | | |
| S4 (50) | | | | | | | | |
| S5 (100) | | | | | | | | |

## 15. Licensing and Security Considerations

### 15.1 Licensing

| Dependency | Expected license | Verified | Notes |
| --- | --- | --- | --- |
| React | MIT | No | Verify exact version and transitive dependencies |
| TypeScript | Apache-2.0 | No | Build-time only |
| Vite | MIT | No | Build-time only |
| Babylon.js | Apache-2.0 | No | Verify core package and any optional packages |
| Three.js (alternative only) | MIT | No | Not installed for this POC |

Requirements:

- Record exact versions and licenses of every direct and transitive dependency before implementation begins.
- Do not add a dependency with a copyleft license that would affect distribution without an explicit decision.
- Do not add optional Babylon packages without confirming their licenses.
- Preserve required license notices in the POC repository.
- A licensing failure is a critical evaluation override regardless of the numerical score.

### 15.2 Security

- The POC does not execute user-authored code. No `eval`, `new Function`, or dynamic script injection is permitted.
- Imported JSON is untrusted input. Parse with `JSON.parse`, validate against the schema, and never merge untrusted objects into application state directly.
- Entity names are rendered as text, not HTML. No `dangerouslySetInnerHTML` for names or error messages.
- Validation errors must not expose stack traces or internal paths to the user.
- Enforce an import size cap during implementation to limit denial-of-service through oversized files. The cap is based on measured parse cost and recorded in the results.
- Use a lockfile and run a dependency audit before implementation and before reporting results.
- Do not load remote fonts, scripts, or assets in the POC.
- The POC has no authentication, storage of personal data, or network persistence, so no data-protection surface is introduced.

### 15.3 Critical override

A security or licensing defect that cannot be mitigated stops the POC and overrides the score. Examples: an incompatible transitive license, execution of imported content as code, or a validation bypass that lets malformed data corrupt the current world.

## 16. Risks and Limitations

| ID | Risk or limitation | Impact | Mitigation | Re-evaluation trigger |
| --- | --- | --- | --- | --- |
| R-01 | Right-handed Babylon configuration conflicts with picking or gizmos | Transform or selection defects | Configure the scene as right-handed and test early; fall back to an explicit conversion layer with tests | Any reproducible transform mismatch |
| R-02 | Gizmo and Inspector create a feedback loop | Oscillation, drift, or lost edits | Single source of truth, epsilon comparison, suppress write-back during drag | E-05 fails or drift exceeds tolerance |
| R-03 | React re-renders cause viewport jank | Poor interaction at 100 entities | Keep renderer outside React render cycle; subscribe minimally; measure | H-03 shows interaction stalls |
| R-04 | Quaternion to Euler display is ambiguous at gimbal lock | Confusing Inspector values | Store quaternion; document YXZ display; test near ±90° pitch | Users cannot recover a transform from the Inspector |
| R-05 | Babylon.js bundle size and startup cost | Slow first load | Measure startup and bundle size; compare with the alternative if needed | Startup noticeably exceeds comparable editor shells |
| R-06 | Selection outline technique performs poorly or looks unclear | Weak feedback | Start with per-mesh outline; evaluate highlight layer if needed | Outline invisible at normal zoom or costs frames |
| R-07 | JSON import blocks the main thread on large files | Frozen UI | Size cap and measured parse time | Import of a permitted file freezes the tab |
| R-08 | Adapter and world drift out of sync | Wrong visuals or lost data | Reconcile by ID; diagnostics count; acceptance tests F-02 and H-04 | Diagnostics counts differ |
| R-09 | POC UI is mistaken for the final Studio design | Misaligned expectations | State clearly in the README and results that the UI is disposable | Product decisions cite POC layout |
| R-10 | Scope creep into physics or scripting | Delays validation of the core question | Enforce §3.2; record requests as questions | Any out-of-scope feature appears in the build |
| R-11 | No undo/redo | Accidental deletions are unrecoverable | Document as a limitation; confirm before deleting is optional | Users report data loss during testing |
| R-12 | Single-browser testing hides compatibility issues | False confidence | Test Chromium and Firefox at minimum | A required interaction fails in a supported browser |
| R-13 | Users interpret local-space scale as world-space scale | Unexpected stretch direction on a rotated entity | Label the scale mode as local in the toolbar or status area; document the policy; run E-07 and E-08 | Repeated user confusion or a product request for world-space scale |
| R-14 | Future world-space scale is assumed to be a small addition | Underestimated architecture change | Record the TRS and shear constraint in §9.8; require a separate decision with evidence | A roadmap item promises world-space scale without an evaluation |

### 16.1 Known limitations by design

- No undo, redo, autosave, or recovery.
- No hierarchy nesting or parenting.
- No materials, textures, lighting, or shadows.
- No snapping, grid increments, or numeric precision controls beyond field validation.
- No multi-select or box selection.
- No local/world gizmo toggle.
- No world-space scale. Scale editing follows the entity's local axes.
- No shear or arbitrary affine transform. The stored transform is TRS only.
- Negative scale is unsupported: the Inspector and importer reject it.
- No import of external models.
- No persistence beyond manual JSON export/import.
- No simulation of any kind.

## 17. Evaluation Framework

### 17.1 Criteria and weights

| Criterion | Weight | What is evaluated |
| --- | ---: | --- |
| Correctness | 25% | Creation, deletion, rename, selection, transforms, serialization, validation, and absence of data loss |
| Integration | 20% | React to editor state to world model to Babylon adapter flow; rebuild from data; event handling; resize |
| Performance | 15% | FPS and interaction latency at 10, 50, and 100 entities; memory behavior |
| Developer Experience | 15% | Setup time, type safety, debugging, iteration speed, clarity of the adapter boundary |
| Maintainability | 15% | Separation of layers, testability of the pure model, coupling, code clarity, upgrade risk |
| Licensing and Long-term Suitability | 10% | License compatibility, project health, release cadence, longevity, exit cost |

### 17.2 Scoring scale

Score each criterion from 1 to 5:

| Score | Meaning |
| ---: | --- |
| 5 | Exceeds the POC requirement with clear evidence and no significant caveats |
| 4 | Meets the requirement with minor caveats |
| 3 | Meets the requirement with notable gaps that need follow-up |
| 2 | Significant gaps; the approach needs rework before it can be relied on |
| 1 | Fails the requirement |

Scores require evidence. A score without a reference to a test ID, a measurement, or a documented observation is invalid.

### 17.3 Calculation and interpretation

```text
weighted score = sum(score_i x weight_i)
```

| Weighted score | Interpretation |
| --- | --- |
| 4.2 – 5.0 | Suitable |
| 3.5 – 4.19 | Suitable with conditions |
| 2.5 – 3.49 | Improve or evaluate alternatives |
| Below 2.5 | Reject |

Critical security, licensing, or correctness failures override the numerical score. A single critical failure means the candidate is not suitable, regardless of the weighted result.

### 17.4 Recommendation options

The POC concludes with exactly one recommendation:

- **Adopt for the next phase** — proceed with the candidate, recording remaining conditions.
- **Adopt with conditions** — proceed only after named conditions are met.
- **Evaluate an alternative** — the evidence justifies comparing Three.js or another candidate.
- **Reject the direction** — the approach cannot support the product; record why and what changes.

The recommendation is input to an ADR. It does not accept the architecture or the technology by itself.

### 17.5 Result template

| Criterion | Weight | Score (1–5) | Weighted | Evidence |
| --- | ---: | ---: | ---: | --- |
| Correctness | 25% | | | |
| Integration | 20% | | | |
| Performance | 15% | | | |
| Developer Experience | 15% | | | |
| Maintainability | 15% | | | |
| Licensing and Long-term Suitability | 10% | | | |
| **Total** | **100%** | | | |

## 18. Definition of Done

### 18.1 Documentation (this task)

- This specification exists and contains sections 1 through 19.
- Scope and non-goals are explicit and consistent with the product specification.
- Acceptance criteria are testable and have result fields.
- The world model is clearly separated from rendering, editor state, and UI.
- Editor-only elements are distinguished from world entities.
- No out-of-scope feature has entered the POC scope.
- The project README links to this specification.
- All documentation links resolve and `git diff --check` passes.
- No application code, dependency, or build configuration has been added.

### 18.2 POC execution

The POC is done when:

1. This specification is approved.
2. The implementation stays within §3.1 and contains no item from §3.2.
3. All 44 acceptance criteria are executed and recorded as PASS, FAIL, or BLOCKED with evidence.
4. Performance baselines for 10, 50, and 100 entities are recorded with the environment sheet.
5. Exact dependency versions and licenses are recorded and audited.
6. No critical security, licensing, or correctness failure remains.
7. The weighted score is calculated and the evidence table is complete.
8. A single recommendation is written using §17.4.
9. Limitations, unresolved questions, and follow-up work are documented.
10. The results are available as input to an ADR; no ADR is accepted as part of the POC.
11. No implementation code from the POC is promoted to product code without a separate decision.

## 19. Questions That Must Be Resolved Before Implementation

| ID | Question | Why it matters | Blocking? |
| --- | --- | --- | --- |
| Q-01 | Which exact versions of React, TypeScript, Vite, and Babylon.js will be used, and what are their verified licenses? | Reproducibility and licensing gate | Yes |
| Q-02 | Does Babylon.js right-handed mode work cleanly for picking, gizmos, and camera controls, or is a conversion layer required? | Affects the core transform contract | Yes — resolve by a short spike or at the start of implementation |
| Q-03 | Which selection feedback technique is used first: per-mesh outline, highlight layer, or bounding box? | Visual clarity and performance | No — choose one, record the fallback |
| Q-04 | Which state approach is used: a small custom store with `useSyncExternalStore`, or a state library? | Coupling and dependency budget | Yes |
| Q-05 | What is the import size cap, and what parse time justifies it? | Prevents a main-thread freeze | Yes — set from a measurement |
| Q-06 | Are duplicate entity names allowed, and does the UI need disambiguation? | Rename behavior and test expectations | No — this document proposes allowing duplicates with IDs as identity |
| Q-07 | Is the plane rendered double-sided, and does that affect picking? | Consistent creation behavior | No — this document proposes double-sided |
| Q-08 | How is the Euler YXZ display presented so users understand the composition order? | Rotation usability | No |
| Q-09 | Which browsers and hardware form the minimum test matrix? | Comparability of performance results | Yes |
| Q-10 | Where are POC results and evidence stored, and who signs off on the score? | Auditability | Yes |
| Q-11 | Is `node:test` sufficient for model tests, or is a browser test runner justified? | Dependency budget and coverage | No |
| Q-12 | Does the world model need a parent-child field reserved now, or is a flat entity list sufficient until MVP-1? | Avoids premature schema commitments | No — this document proposes flat |
| Q-13 | Should a later phase support world-space scale or shear, and would that require replacing TRS with an affine transform? | Determines whether the transform contract can remain TRS | No — explicitly deferred to §9.8; not supported in POC-01 |
| Q-14 | Should negative scale ever be supported, and what would it mean for lighting, culling, physics, and export? | Current policy is unsupported; a future policy needs its own decision | No — negative scale is rejected in POC-01 |
