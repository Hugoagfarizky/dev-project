# I-05 Implementation Report

**Increment:** I-05 - Primitives, Hierarchy, selection, and Inspector identity
**Status:** Complete
**Starting commit:** `cd33065` (authorized HEAD)
**Final code commit before evidence:** `9a57cde`
**Evidence commit:** the commit that adds this directory

## 1. Objective

Deliver the authored-object loop end to end: **Create -> See -> Select -> Rename
-> Delete**, with the same world state reflected in the viewport, the World
Hierarchy, and the Inspector, and with evidence for M0-AC-05, M0-AC-06,
M0-AC-07, and M0-AC-12.

## 2. Scope delivered

### 2.1 Renderer conformance (Phase 1, commit `4eacb0f`)

File: `app/src/renderer/BabylonRenderer.ts`

- No world light is created; editor primitives are visible without lighting.
- Grid is an unlit emissive fill (`GRID_EXTENT = 50`, `y = -0.003`) plus an
  unlit line grid at `y = -0.002`; both are non-pickable and both follow
  `applyGridVisible`.
- Cube, Sphere, and Plane use a `StandardMaterial` with
  `disableLighting = true` and an emissive color.
- Plane uses `MeshBuilder.CreateGround` (XZ plane, +Y normal, 1x1) and
  `backFaceCulling = false`, so it renders and picks from above and below.
- Cube and Sphere remain single-sided, preserving I-04 behavior.
- Material and grid resources are disposed with their meshes.
- Entity mesh reconciliation creates, updates, and disposes only the meshes that
  differ from the world snapshot.
- `getDiagnostics()` keeps reporting WebGL version, mesh count, entity count, and
  context-loss state.

### 2.2 Editor and store semantics (Phase 2, commit `ab11fc5`)

Files:

- `app/src/editor/reducer.ts`
- `app/src/editor/selectors.ts`
- `app/src/ui/hooks/useStore.ts`
- `app/test/editor/reducer.test.ts`
- `app/test/editor/store.test.ts`

Behavior:

- **Structural sharing** replaces the previous deep clone for non-project
  commands. Selection, gizmo, grid, preset, camera, save-status, and log updates
  preserve the untouched `project` / `world` / `entities` references.
- **Stable snapshots:** a no-op command returns the same state object, so the
  store does not notify subscribers.
- **Create:** appends an entity, assigns a unique UUID, uses the default
  transform (Cube/Sphere `y = 0.5`, Plane `y = 0`), auto-selects the new entity,
  and marks the project dirty once.
- **Default names:** `Cube`, `Sphere`, `Plane`, then numeric suffixes
  (`Cube 2`, `Cube 3`, ...). Used names are skipped; renamed names can free a
  suffix for later creation.
- **Rename:** trims whitespace, rejects empty/whitespace-only names, enforces a
  128-character maximum after trimming, preserves ID/type/transform, allows
  duplicate names, and is a no-op when the normalized name is unchanged.
- **Delete:** removes the entity, clears selection only when the deleted entity
  was selected, preserves a valid selection otherwise, and rejects selection of
  a deleted ID.
- **Camera:** compares pose fields and returns the same state for an identical
  pose. Camera updates never replace domain references.
- **Selectors:** `selectEntities`, `selectSelectedEntityId`,
  `selectSelectedEntity`, `selectIsWorldEmpty`, and related selectors return
  stable references for unchanged state.
- **`useStudioStore`:** caches the selected value per store snapshot, satisfying
  the `useSyncExternalStore` snapshot contract for derived selectors.

### 2.3 UI foundation (Phase 3, commit `0ddff08`)

Files:

- `app/src/ui/common/Button.tsx`
- `app/src/ui/common/Dialog.tsx`
- `app/src/ui/common/InlineRename.tsx`
- `app/src/ui/hooks/useStudioShortcuts.ts`
- `app/src/styles/shell.css` (shared foundation styles)

Behavior:

- `Button` provides primary/secondary/ghost/danger variants in two sizes.
- `Dialog` is modal, labelled, traps Tab focus, closes on Escape, closes on
  overlay click, restores focus on close, and auto-focuses **Cancel** for
  destructive actions.
- `InlineRename` focuses and selects the current name, commits on Enter or blur,
  cancels on Escape, trims input, rejects empty values, and caps input at 128
  characters.
- `useStudioShortcuts` implements the I-05 keyboard floor:
  - `F2` starts rename for the selected entity.
  - `Delete` opens the delete confirmation for the selected entity.
  - `Escape` cancels an open dialog.
  - Shortcuts are ignored while focus is in `input`, `textarea`, or a
    `contenteditable` element, and while rename/dialog UI is open.

### 2.4 UI integration (Phase 4, commit `9a57cde`)

Files:

- `app/src/ui/panels/primitives.ts`
- `app/src/ui/panels/AssetLibrary.tsx`
- `app/src/ui/panels/WorldHierarchy.tsx`
- `app/src/ui/panels/Inspector.tsx`
- `app/src/ui/viewport/EmptyWorldOverlay.tsx`
- `app/src/ui/shell/StudioShell.tsx`
- `app/src/ui/viewport/ViewportHost.tsx`
- `app/src/styles/shell.css` (panel, dialog, overlay styles)

Behavior:

- **Asset Library:** Cube, Sphere, and Plane actions dispatch
  `entity/create`; a live count shows the number of entities.
- **World Hierarchy:** flat list in world order, selected row styling, click to
  select, double-click or the rename icon to rename inline, and a delete icon
  that opens the confirmation dialog.
- **Inspector:**
  - No selection: "No selection", a hint, and an **Add Cube** action.
  - Selection: Identity section (Name, Type, read-only ID) and a read-only
    Transform placeholder (Position, Rotation, Scale).
  - No Components, Behavior, Runtime, or Simulation sections.
  - No transform editing inputs.
- **Empty World overlay:** appears when the world has zero entities, lists Add
  Cube / Add Sphere / Add Plane, and does not block viewport pointer input
  outside the card.
- **Cross-surface selection:** viewport pick, Hierarchy click, and new-entity
  creation all update the store, the highlight, the Hierarchy row, and the
  Inspector header/body from one snapshot.
- **Rename/delete wiring:** `StudioShell` owns rename and delete-target UI state,
  keeps it valid as entities change, and routes the dialog confirm to
  `entity/delete`.
- **ViewportHost:** renders the empty-world overlay, hides it on error/context
  loss, and updates diagnostics only when values change. The diagnostics
  subscription is registered after the renderer wiring so the displayed mesh
  count always reflects the snapshot that was just applied.

### 2.5 Preserved behavior (Phase 5)

- Build / Program / Simulate presets still switch layout and are stored as UI
  state; they do not change the world, selection, or live camera.
- Responsive layout is verified at 1440x900 and 1024x640; the 1024x640 layout
  keeps the viewport, Hierarchy, and Inspector usable with no page overflow.
- Canvas, engine, and scene identities survive resize and context restoration.
- Context-loss fallback and in-place restoration continue to work.
- The renderer mesh count equals the entity count after create/delete cycles.

## 3. Commit groups

| Group | Commit | Content |
| --- | --- | --- |
| 1 | `4eacb0f` | Renderer unlit primitives/grid and XZ double-sided plane |
| 2 | `ab11fc5` | Editor reducer, selectors, store hook, editor tests |
| 3 | `0ddff08` | Button, Dialog, InlineRename, shortcuts, shared CSS |
| 4 | `9a57cde` | Hierarchy, Inspector, Asset Library, overlay, shell wiring, viewport diagnostics |
| 5 | evidence commit | This report, acceptance matrix, browser results, screenshots, harness scripts |

## 4. Verification summary

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` | 68/68 pass |
| `npm run check` | Pass (Node version, typecheck, boundaries, token contrast) |
| `npm run build` | Pass (existing chunk-size warning only) |
| Renderer conformance harness | 14/14 pass |
| I-04 regression harness | 26/26 pass |
| I-05 browser acceptance harness | 51/51 pass |
| Unexpected console errors | None (only the pre-existing Vite favicon 404) |

Detailed evidence is in `I-05_ACCEPTANCE_MATRIX.md`,
`I-05_BROWSER_VERIFICATION.md`, and `evidence/i05-result.json`.

## 5. Scope exclusions honored

Not implemented in I-05:

- Transform editing, the full keyboard floor, and gizmo drag (I-06).
- Persistence, New Project, Project Hub, Save, Open (I-07).
- Console/status-bar behavior and planned surfaces (I-08).
- Accessibility, performance, and the final audit (I-09).
- Undo, multi-select, dock dragging, floating panels, asset drag/import.
- Components, Behavior, Runtime, Simulation, material editor, Hierarchy
  search/filter, and a top-bar Add action.

ACG-01 remains deferred as recorded in the readiness audit.

## 6. Known limitations

See `I-05_REMAINING_LIMITATIONS.md`. No limitation blocks I-05 acceptance.
