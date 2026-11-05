# SimuForge — Interaction Specification

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 — Draft for review |
| Date | 2026-11-05 |
| Status | Design baseline; no implementation authorized |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Related | [Main Studio UX](MAIN_STUDIO_UX_SPECIFICATION.md), [Workspace Layout](WORKSPACE_LAYOUT_SPECIFICATION.md), [User Flows](MAIN_USER_FLOWS.md), [Design System](DESIGN_SYSTEM_SPECIFICATION.md) |

## 1. Interaction Principles

1. **Direct manipulation first.** Selection, transform, resize, and drag act on the thing the user points at.
2. **One selection model.** The world entity selection is shared by every world-facing surface. Node and script selection is contextual to the Program dock.
3. **No accidental camera motion.** A plain left click selects; it never orbits. Camera navigation uses the POC-01 map.
4. **No hidden destructive action.** Delete, discard, replace, and stop-runtime consequences are explicit.
5. **Keyboard parity.** Every action available by pointer is reachable by keyboard, except free-form canvas drawing.
6. **Focus is visible and stable.** Panel focus, keyboard focus, and world selection are three different things and are shown differently.
7. **Runtime lock is reversible and explained.** Every disabled structural control states how to unlock it.

## 2. Pointer Model

### 2.1 Click and drag thresholds

| Gesture | Threshold | Result |
| --- | --- | --- |
| Click | Pointer down and up within 3 px | Select, activate, or toggle |
| Drag | More than 3 px before release | Transform, resize, pan, reorder, or connect |
| Double-click | Two clicks within 400 ms and 4 px | Rename in Hierarchy; open/expand in lists; frame in viewport if configured |
| Long press | Not used in MVP | Reserved for touch later |

A click that begins on a gizmo handle is a gizmo interaction, never a selection or camera interaction. A click that begins on a panel splitter is a resize, never a selection.

### 2.2 Viewport pointer map

| Action | Input | Notes |
| --- | --- | --- |
| Select entity | Left click on mesh | Replaces selection |
| Clear selection | Left click empty space | Inspector shows `Nothing selected` |
| Orbit camera | `Alt` + left drag, or middle drag | Left drag alone never orbits |
| Pan camera | `Shift` + middle drag, or right drag | Right click does not open a context menu |
| Zoom camera | Mouse wheel | Zoom toward cursor is optional; POC behavior is radius change |
| Frame selection | `F` | Centers the camera on the selected entity |
| Frame world | `Shift+F` | Fits all entities; empty world frames the origin |
| Move mode | `W` or toolbar | World-space translate |
| Rotate mode | `E` or toolbar | World-space rotate |
| Scale mode | `R` or toolbar | Local-space scale |
| Select mode | `Q` or toolbar | Hides the gizmo without changing the transform |
| Toggle grid | `G` | Editor-only; never serialized |
| Rename | `F2` or double-click in Hierarchy | Inline edit in Hierarchy |
| Delete | `Delete` or `Backspace` | Ignored while a text field has focus |

Camera constraints from POC-01:

- Radius clamps to 0.5–500 world units. This addresses residual risk R-5 (negative zoom).
- Beta clamps to 0.01–π−0.01 radians.
- Camera navigation never modifies world entities.
- Camera pose is editor state and is not serialized in MVP-0.
- The grid is editor-only, centered at the origin on the XZ plane at Y = 0.

### 2.3 Gizmo interaction

- Translate and rotate handles align to world axes.
- Scale handles align to the entity's local axes and rotate with the entity.
- There is no local/world toggle and no world-space scale. This is the approved POC-01 transform policy.
- The gizmo is visible only when an entity is selected and the viewport is hovered or focused.
- Dragging a handle takes precedence over camera movement and selection.
- Transform updates apply at most once per animation frame; Inspector values update live.
- On release, the final transform commits once and reconciles with the model.
- A click without movement does not modify the transform.
- A lost pointer capture cancels the drag and restores the last committed transform.
- During Running/Paused, the gizmo is hidden and transform tools are disabled.

### 2.4 Panel pointer map

| Surface | Left click | Right click | Double click | Drag |
| --- | --- | --- | --- | --- |
| Panel header | Focus panel | — | Toggle collapse | Move panel (Phase 02+) |
| Tab | Activate tab | Tab menu | Rename document (later) | Reorder tab (Phase 02+) |
| Splitter | Begin resize | Reset size | Reset size | Resize |
| Hierarchy row | Select | Context menu | Rename | Reorder only when hierarchy supports it (not MVP-0) |
| Asset card | Select/preview | Context menu | Add | Drag to viewport (Phase 02+) |
| Console row | Select/expand | Copy/context menu | Expand details | Select text |
| Inspector field | Edit | Context menu | Select word | Drag label to scrub numeric |
| Graph node | Select | Context menu | Open/rename | Move node |
| Graph port | Begin connection | — | — | Create edge |
| Graph canvas | Clear node selection | Context menu | Fit (optional) | Pan with Space or middle drag |

### 2.5 Context menus

- The viewport has **no** right-click context menu because right-drag is pan. Use the viewport toolbar, Inspector overflow, or keyboard.
- Hierarchy, Asset Library, Console, and the graph canvas MAY use a right-click context menu. The keyboard equivalent is `Shift+F10` or the Context Menu key.
- Context menus use the raised surface, elevation 2, 6 px radius, and the same command labels as the toolbar.
- A context menu never contains an action that is unavailable without a disabled explanation.

## 3. Keyboard Model

### 3.1 Global shortcuts

Shortcuts are active unless focus is inside a text input, numeric field, code editor, or modal that captures keys. `Ctrl+S`, `Ctrl+O`, and transport shortcuts remain active in fields only when they do not conflict with text editing; the implementation must define and test this precisely.

| Action | Shortcut | Notes |
| --- | --- | --- |
| Save | `Ctrl+S` | Overrides browser Save; saves authored state |
| Open project | `Ctrl+O` | Overrides browser Open File; confirm unsaved changes |
| New project | `Ctrl+Alt+N` | Avoids browser `Ctrl+N` |
| Undo | `Ctrl+Z` | Phase-dependent; hidden if unavailable |
| Redo | `Ctrl+Shift+Z` | Phase-dependent |
| Run / Resume | `Ctrl+Enter` | Editing → Running; Paused → Running |
| Pause / Resume | `Ctrl+Shift+Enter` | Running ↔ Paused |
| Stop | `Shift+F5` | Running/Paused/Preparing → Editing |
| Reset | `Ctrl+Shift+F5` | Running/Paused → Preparing |
| Toggle Console | `Ctrl + backtick` | Expands/collapses the drawer; does not clear logs |
| Toggle left dock | `[` | Only when focus is not in a text field |
| Toggle right dock | `]` | Only when focus is not in a text field |
| Focus previous/next panel | `Ctrl+Alt+Left/Right` | Optional; must not conflict with OS window switching; validate in scaffold |
| Show keyboard help | `?` | Only when focus is not in a text field; opens a searchable shortcut sheet |
| Close overlay / clear selection | `Esc` | See §3.6 priority |

`Ctrl+Alt+Left/Right` may be intercepted by some operating systems or window managers. It is an optional shortcut; the menu and panel headers must remain sufficient.

### 3.2 Viewport shortcuts

| Action | Shortcut |
| --- | --- |
| Select mode | `Q` |
| Move mode | `W` |
| Rotate mode | `E` |
| Scale mode | `R` |
| Frame selection | `F` |
| Frame world | `Shift+F` |
| Toggle grid | `G` |
| Rename selected | `F2` |
| Delete selected | `Delete` / `Backspace` |
| Orbit | `Alt` + left drag / middle drag |
| Pan | `Shift` + middle drag / right drag |
| Zoom | Wheel |

Single-letter shortcuts are disabled when focus is inside any text input, numeric field, code editor, search field, or open rename field.

### 3.3 Hierarchy shortcuts

| Action | Shortcut |
| --- | --- |
| Move selection up/down | `Up` / `Down` |
| Expand/collapse node | `Right` / `Left` (future tree) |
| Rename | `F2` |
| Delete | `Delete` / `Backspace` |
| Select | `Enter` or `Space` |
| Context menu | `Shift+F10` |

Multi-select with `Ctrl`/`Shift` is reserved but not enabled in MVP-0 through MVP-3.

### 3.4 Inspector shortcuts

| Action | Shortcut |
| --- | --- |
| Next/previous field | `Tab` / `Shift+Tab` |
| Commit value | `Enter` or blur |
| Revert value | `Esc` |
| Increment/decrement | `Arrow Up` / `Arrow Down` |
| Coarse increment | `Shift` + arrow |
| Reset row | `Alt+Backspace` when the field is focused (optional) |

Arrow keys inside a numeric field change the value, not the selection. `Esc` reverts the field before it clears world selection.

### 3.5 Program, Console, and dialog shortcuts

| Context | Action | Shortcut |
| --- | --- | --- |
| Program dock | Switch Visual Logic / Python | `Ctrl+Alt+1` / `Ctrl+Alt+2` (optional; validate) |
| Graph canvas | Pan | `Space` + drag or middle drag |
| Graph canvas | Zoom | Wheel |
| Graph canvas | Fit graph | `F` |
| Graph canvas | Delete selected node | `Delete` |
| Graph canvas | Duplicate selected node | `Ctrl+D` when available |
| Graph node | Open rename | `F2` |
| Console | Toggle drawer | `Ctrl + backtick` |
| Console | Clear | Toolbar only; no single-key clear |
| Dialog | Primary action | `Enter` |
| Dialog | Cancel | `Esc` |
| Dialog | Move focus | `Tab` / `Shift+Tab`, trapped |

### 3.6 Esc priority

`Esc` resolves one action per press, in this order:

1. Close an open menu, popover, tooltip, or context menu.
2. Cancel an in-progress drag, connection, resize, or inline edit.
3. Close a modal dialog (same as Cancel).
4. Exit focus mode.
5. Clear node/script selection in the Program dock.
6. Clear world selection.
7. Collapse the Console if it is expanded and focused.

`Esc` never stops the simulation, discards changes, or deletes an object.

### 3.7 Shortcut conflict policy

- The Studio overrides only `Ctrl+S` and `Ctrl+O` among common browser shortcuts.
- Browser-reserved shortcuts (`Ctrl+R`, `Ctrl+Shift+R`, `F5`, `Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `Ctrl+P`, `Ctrl+F`) are not overridden.
- The shortcut set MUST be audited in Chrome 156 during scaffold. Any conflict is recorded, and the shortcut is changed rather than blocking the browser.
- Shortcuts are shown in menus and tooltips so they are discoverable.
- The keyboard help sheet is generated from the same command registry as the menus to prevent drift.

## 4. Selection Model

### 4.1 World selection

- Zero or one world entity selected in MVP-0 through MVP-3.
- Selection is editor state, never serialized.
- Selecting in the viewport, Hierarchy, Monitor watch, or a Console/entity link updates the same selection.
- Clicking empty viewport space or `Esc` clears selection.
- Creating an entity selects it.
- Deleting the selected entity clears selection.
- Import clears selection deterministically.
- Opening a project starts with no selection.
- During runtime, selection is allowed; it drives the Runtime Inspector and Monitor watch.

### 4.2 Contextual selection in the Program dock

- Selecting a graph node or Python file is separate from world selection.
- The Inspector switches context to the node or script, but the world selection is retained in a muted state.
- Switching back to the viewport/Hierarchy restores the world context.
- A node's object reference can reveal/select the world entity.
- A world entity can reveal nodes that reference it (Phase 06+).

### 4.3 Selection visuals

| State | Visual |
| --- | --- |
| Hover | 1 px light outline or subtle emissive edge, no fill |
| Selected | 2 px sky outline; no thick glow |
| Selected + focused viewport | Gizmo visible |
| Runtime selected | Same outline; gizmo hidden; `Runtime` badge in viewport |
| Locked | Same selection; lock chip in panel headers |
| Multi-select (future) | Primary uses full outline; additional uses dashed or muted outline |

Selection must remain readable against the grid, bright materials, and dark objects. Outline width is in screen space, not world space.

## 5. Camera Interaction

- Editor camera is an `ArcRotateCamera` targeting the world origin by default.
- Orbit rotates around the current target; pan moves the target in the camera plane; zoom changes the radius.
- Radius 0.5–500 world units; beta 0.01–π−0.01 radians.
- Left drag alone never orbits. This preserves left click for selection.
- Camera navigation is available in every runtime state.
- Camera pose is editor state, not world data; it is not serialized in MVP-0.
- Framing an empty world targets the origin with a sensible default radius.
- The axis helper reflects camera orientation and is editor-only.
- No orthographic or 2D camera is claimed in MVP-0. The viewport menu reserves space for future scene modes but does not list an unavailable mode as active.

## 6. Panel Interaction

### 6.1 Focus

- Clicking a panel focuses it.
- Focusing a panel does not change world selection, except clicking empty viewport space.
- The active panel title uses primary text; inactive titles use secondary text.
- Keyboard focus is shown with a 2 px ring; panel focus alone is shown by header treatment.
- `Tab` moves within the focused panel. Moving between panels is done by `Ctrl+Alt+Left/Right` (optional), clicking, or the View menu.

### 6.2 Tabs

- Click activates; `Ctrl`+click does not open a split in MVP.
- Arrow keys move between tabs when the tab strip has focus.
- `Home`/`End` move to first/last tab.
- An unsaved document shows a dot; closing it prompts Save / Discard / Cancel.
- Switching tabs preserves scroll, cursor, graph viewport, and selection per tab.
- Tabs are reorderable by drag in Phase 02+; until then, the order is stable.

### 6.3 Collapse and expand

- Header chevron toggles collapse.
- Collapsed header remains interactive and shows a summary.
- Expanding restores the previous size, clamped to current constraints.
- Dock rail click expands the dock and focuses the clicked panel.
- A panel that holds keyboard focus and collapses moves focus to its header, not to the page body.

### 6.4 Maximize and focus mode

- Focus mode is available for Visual Logic and Python.
- Entering focus mode stores the complete layout state.
- Exiting restores it exactly, including collapse states and scroll.
- `Esc` exits when not in a text editor, menu, or modal.
- Focus mode does not stop the simulation or change selection.

### 6.5 Move panel

- The header overflow menu lists compatible destinations.
- Moving a panel preserves its internal state.
- A panel cannot be moved to an incompatible zone; the menu omits the option rather than disabling it without explanation.
- Drag-to-dock is Phase 02+ and follows §7.3.

## 7. Drag and Drop

### 7.1 Asset Library to viewport

- Initial scaffold: click/double-click or `Add` creates a primitive. Dragging is not required.
- Phase 02+: drag a primitive or asset card into the viewport. The viewport shows a valid drop indicator. On drop, the entity is created at the POC default transform unless the phase defines a placement rule.
- Dropping outside the viewport cancels with no world change.
- Dropping during Running/Paused is rejected with `Stop the simulation to add objects`.
- Dragging a material onto an entity (future) previews the target entity and applies on drop; it does not create a new entity.

### 7.2 Hierarchy reorder

- Reorder is not available in MVP-0 because the world model is a flat list and order has no simulation meaning.
- When parenting is introduced, drag reorder reparents with a visible insertion line and a cycle check.
- A drop that would create a cycle is rejected.

### 7.3 Panel docking

- Phase 02+ only.
- Drag a tab or header; compatible zones highlight with a 2 px selection border and a translucent drop preview.
- Incompatible zones do not highlight.
- `Esc` cancels and returns the panel to its previous home.
- Dropping in the center of a dock tab stack adds the panel as a tab; dropping on an edge splits the dock.
- Floating windows are out of scope.

### 7.4 Dialog and file drag

- Dragging a project or world file onto the Studio window opens the import/open confirmation; it never imports silently.
- Dragging text into a numeric field inserts text for validation; invalid text is rejected.
- Dragging a file onto the viewport during Running is rejected.

## 8. Inline Editing

### 8.1 Rename

- `F2` or double-click a Hierarchy row.
- The row becomes an input with the current name selected.
- `Enter` or blur commits; `Esc` reverts.
- Names are trimmed, limited to 128 characters, and may be duplicated; identity is the entity ID.
- Empty or whitespace-only names are rejected and the previous name restored.
- Rename updates Hierarchy, Inspector header, and serialized world in one action.
- Rename is disabled during runtime with a lock explanation.

### 8.2 Numeric commit

- The focused field commits on `Enter` or blur.
- `Esc` reverts to the last committed value.
- Starting a run commits the focused field or cancels an invalid edit; it never runs a half-typed value.
- Starting a save behaves the same way.
- Switching selection with an invalid edit reverts the field and shows a brief inline message.

## 9. Runtime Interaction

### 9.1 Lock timing

- Structural controls disable at the start of Preparing, not when Running begins.
- The runtime bar appears at Preparing.
- The lock applies to: Hierarchy add/delete/rename, Inspector authored fields, viewport gizmos and transform modes, Asset Library add, Program editing, import.
- The lock does not apply to: camera, selection, panel layout, Monitor, Console filters, tabs, Save, Help.
- Unlock happens only on return to Editing after Stop, cancel, or preparation failure.

### 9.2 Transport behavior

| Current state | Run | Pause | Resume | Stop | Reset | Cancel |
| --- | --- | --- | --- | --- | --- | --- |
| Editing | Enabled | Disabled | — | Disabled | Disabled | — |
| Preparing | Disabled | Disabled | — | Disabled | Disabled | Enabled |
| Running | Disabled | Enabled | — | Enabled | Enabled | — |
| Paused | Disabled | — | Enabled | Enabled | Enabled | — |
| Stopped | Enabled | Disabled | — | Disabled | Disabled | — |

A disabled transport control has a tooltip explaining why. The state pill is always visible.

### 9.3 Selection during runtime

- Selection is allowed.
- Inspector shows authored values locked plus Runtime values.
- Monitor watch follows selection unless pinned.
- Selecting a runtime entity does not unlock editing.
- On Stop, the same entity remains selected if it exists.

### 9.4 Save during runtime

- Save is enabled.
- It saves authored state only.
- The tooltip says `Saves the authored project, not runtime values`.
- A runtime that is mid-preparation does not block Save; the last committed authored snapshot is saved.

### 9.5 Stop confirmation

- Stop does not require confirmation: the authored project is safe and the action is reversible by running again.
- The toast explicitly says runtime state was discarded.
- If a future phase supports runtime recording/export, Stop may prompt to export the recording. That is out of scope now.

## 10. Feedback and Notification Rules

| Mechanism | Use | Do not use for |
| --- | --- | --- |
| Status bar | Last action, selection summary, entity count, engine diagnostics | Errors that need action |
| Runtime bar | State, elapsed time, lock explanation, Monitor link | General editor messages |
| Toast | Save/export/import success, stop confirmation, layout reset | Every object creation; errors that persist |
| Inline banner | Save failure, limited space, storage unavailable | Transient hover feedback |
| Panel badge | Error/warning count, unsaved dot, live runtime | Long explanatory text |
| Dialog | Destructive confirmation, unsaved changes, project creation | Run/stop, routine property edits |
| Console | Detailed logs, stack traces, source links | The only place an error is shown |
| Tooltip | Short labels and reasons | Interactive content |

- A toast appears bottom-right above the status bar, max 3 stacked, 4 s for success, persistent for actionable errors.
- A runtime error also updates the Console badge and the runtime bar. It does not open a modal.
- The first runtime error in a session auto-expands the Console once, without moving keyboard focus.
- Success toasts do not stack more than two; coalesce repeated saves.

## 11. Focus Management

### 11.1 Dialog focus

- Opening a dialog moves focus to the first meaningful control (name field, primary action, or close button).
- Focus is trapped inside the dialog.
- `Esc` cancels unless the dialog is a blocking destructive confirmation that requires an explicit choice.
- Closing restores focus to the invoking control.
- The scrim does not close the dialog on click unless the dialog is non-destructive and explicitly allows it.

### 11.2 Background updates

- Live Monitor values, Console logs, and runtime state updates MUST NOT move focus.
- New errors may expand a panel but MUST NOT focus it.
- A panel that becomes disabled while focused moves focus to its header or the nearest enabled control.
- If the focused control is removed (entity deleted, panel hidden), focus moves to the panel header or the viewport, in that order.

### 11.3 Screen reader announcements

- Runtime state transitions announce politely: `Simulation running`, `Simulation paused`, `Simulation stopped`.
- Errors announce assertively once per new error, not on every render.
- Save success announces politely.
- The Console is a live log region; filtering does not re-announce old rows.
- The viewport selection announces the entity name and type.

## 12. Unsaved Changes and Recovery

- Dirty state is set by any authored change: entity create/delete/rename, transform, component, graph, Python file, project name.
- Camera, selection, panel layout, console filters, and monitor pin do not set dirty state.
- `beforeunload` prompts when dirty.
- Opening another project, creating a new project, importing a world, or closing a document with unsaved changes uses Save / Discard / Cancel.
- Save commits the focused field and the active editor buffer before serialization.
- A failed save keeps the in-memory state and the dirty flag; it never clears the flag.
- No autosave in MVP-0. If added later, it must be visible and must not replace explicit save semantics.

## 13. Undo and Redo Policy

Undo/redo is **not in MVP-0**. The interaction model reserves it:

| Action | Undoable? |
| --- | --- |
| Create/delete entity | Yes, when undo ships |
| Rename | Yes |
| Transform via Inspector or gizmo | Yes |
| Component add/remove/edit | Yes |
| Graph node/edge edit | Yes |
| Python file edit | Editor-local undo, then project-level undo when integrated |
| Selection | No |
| Camera | No |
| Panel layout | No |
| Runtime state | No; stop the runtime first |
| Save/export/import | No |

Until undo ships, deletion requires a confirmation dialog: `Delete “Cube”? This cannot be undone.` After undo ships, deletion SHOULD become an undo toast with a 5 s window, with confirmation reserved for objects that carry components or child entities.

## 14. Error Handling and Recovery

| Situation | Interaction |
| --- | --- |
| Invalid numeric input | Inline message; value reverts; focus stays in field |
| Invalid graph | Run blocked; validation bar expands; first error revealed |
| Import failure | Dialog names the rule and actual file size; current world unchanged |
| Save failure | Persistent banner; Retry / Export copy / Details; dirty remains |
| WebGL failure | Viewport error state with Retry and diagnostics; rest of Studio remains usable where possible |
| Runtime crash | Runtime bar shows failure; Console opens; Monitor shows `Stopped unexpectedly`; authored project intact |
| Worker timeout (Python) | Error in Console and Python diagnostics; runtime reports failure according to Phase 07 contract |
| Storage unavailable | Informational banner; project remains editable in memory; save offers export |
| Lost layout data | Fall back to Build; non-blocking notice |

Recovery actions must be specific. `Try again` is acceptable only when the retry is safe and idempotent.

## 15. Loading and Progress

- Operations under 300 ms SHOULD NOT show a spinner; they may show a brief pressed state.
- Operations over 300 ms show a determinate progress bar if progress is known, otherwise an indeterminate spinner with a label.
- Preparing a simulation shows a cancel action.
- Import shows file size and validation step.
- Save shows a button spinner; it does not block the viewport.
- Skeletons match the final content shape to avoid layout shift.
- The app must not flash the Studio before a project is validated.

## 16. Touch and Trackpad

Touch-first interaction is not part of the MVP. Basic trackpad behavior:

- Two-finger scroll maps to wheel zoom only when the pointer is over the viewport and the platform does not reserve it; otherwise it scrolls the focused panel.
- Pinch zoom is not claimed in MVP-0.
- Middle-click emulation on trackpads is not required; `Alt`+drag remains the orbit path.
- Touch targets meet the 24 px minimum if a touch build is later attempted.

## 17. Interaction Acceptance Criteria

| ID | Criterion |
| --- | --- |
| I-01 | Left click selects and never orbits; orbit requires Alt+left, middle drag, or the specified input |
| I-02 | Gizmo drag does not change selection or camera, and a click without movement does not transform |
| I-03 | Transform edits commit on Enter/blur, revert on Esc, and reject invalid values with an inline reason |
| I-04 | Selection is consistent across viewport, Hierarchy, Inspector, Monitor watch, and reveal links |
| I-05 | Build/Program/Simulate never change runtime state, world data, selection, or camera |
| I-06 | Structural controls disable at Preparing and re-enable only in Editing |
| I-07 | Stop returns to authored values and explicitly announces that runtime state was discarded |
| I-08 | Esc follows the defined priority and never stops a runtime or deletes an object |
| I-09 | Shortcuts do not fire inside text/numeric/code fields except the documented safe exceptions |
| I-10 | Browser-reserved shortcuts are not overridden except Save/Open |
| I-11 | Dialogs trap focus, close on Esc where safe, and restore focus to the invoker |
| I-12 | Live updates never steal keyboard focus |
| I-13 | Every disabled control has a reason tooltip or an adjacent explanation |
| I-14 | The first runtime error auto-expands the Console once without focus theft |
| I-15 | No pointer interaction requires a right-click in the viewport |
| I-16 | Keyboard-only users can select an object, edit a transform, run, pause, stop, save, and switch panels |
