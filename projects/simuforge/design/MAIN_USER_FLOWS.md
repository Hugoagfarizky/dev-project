# SimuForge — Main User Flows

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 — Draft for review |
| Date | 2026-11-05 |
| Status | Design baseline; no implementation authorized |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Related | [Main Studio UX](MAIN_STUDIO_UX_SPECIFICATION.md), [Workspace Layout](WORKSPACE_LAYOUT_SPECIFICATION.md), [Interaction](INTERACTION_SPECIFICATION.md) |

## 1. How to Read a Flow

Each flow states:

- **Goal** — what the user is trying to accomplish.
- **Entry points** — where the flow can start.
- **Preconditions** — required state.
- **Steps** — the user action and the UI response.
- **Success** — the state the user should see.
- **Failure and edge cases** — what happens when the happy path does not.

Panel names are canonical: World Hierarchy, 3D World Viewport, Inspector, Asset Library, Visual Logic Editor, Python Editor, Simulation Monitor, Console / Output.

Runtime states are canonical: Editing, Preparing, Running, Paused, Stopped.

## 2. Flow Map

```text
Project Hub
│
├─ F-01 Open project ───────────────┐
├─ F-02 New empty project ──────────┤
│                                   ▼
│                            ┌─────────────┐
│                            │   BUILD     │
│                            │             │
│              F-03 Add ◄────┤  Hierarchy  │
│              F-04 Select ◄─┤  Viewport   │
│              F-05/F-06 ────┤  Inspector  │
│              F-15 Import ──┤  Assets     │
│                            └──────┬──────┘
│                                   │ F-07 / F-08
│                            ┌──────▼──────┐
│                            │   PROGRAM   │
│                            │ Logic | Py  │
│                            └──────┬──────┘
│                                   │ F-09 Run
│                            ┌──────▼──────┐
│                            │  SIMULATE   │
│                            │ F-10 control│
│                            │ F-11 monitor│
│                            │ F-12 console│
│                            └──────┬──────┘
│                                   │ Stop
│                            ┌──────▼──────┐
└────────────────────────────┤   REVISE    │
                             └──────┬──────┘
                                    │ F-13 Save
                                    ▼
                               Saved project
```

## 3. F-01 — Open a Project

**Goal:** Continue work on an existing local project.
**Entry points:** Project Hub, project menu → Open, `Ctrl+O`.
**Preconditions:** At least one project exists in local storage, or the user has a valid project file.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Open SimuForge | Project Hub appears with brand, tagline, `New Project`, `Open File`, and a Recent Projects list | If no projects exist, the hub shows the first-project empty state |
| 2 | Click a recent project | Card enters a loading state; a progress line appears; the Studio is not shown until the project validates | Loading is cancellable only before parsing begins |
| 3 | Project validates | Studio opens in Build; World Hierarchy lists entities; viewport shows the authored world; Inspector shows `Nothing selected`; status bar reports entity count | Camera resets to the default framing in MVP-0; selection is empty |
| 4 | Project is corrupt or unsupported | Hub shows an error dialog: project name, failure reason, schema version if available, `Open another project`, `Show details` | The previous project, if any, remains intact |

**Success:** The authored world is visible and editable; the project name and `Saved` state appear in the top bar.
**Failure and edge cases:**

- Missing or unsupported schema version: no partial load.
- Storage unavailable: `Projects can't be read from this browser. Open a project file instead.`
- File too large: see F-15.
- User cancels file picker: returns to the hub unchanged.
- Opening a second project with unsaved changes: Save / Discard / Cancel dialog first.

## 4. F-02 — Create an Empty World

**Goal:** Start a new simulation from a genuinely empty world.
**Entry points:** Project Hub → `New Project`; project menu → `New`; `Ctrl+Alt+N`.
**Preconditions:** None.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Choose `New Project` | New Project dialog: project name field, helper `Starts with an empty world`, `Create`, `Cancel` | Default name `Untitled Simulation`; name is selected for typing |
| 2 | Enter a name and choose `Create` | Dialog closes; Studio opens in Build; the project is in Editing and dirty | Empty name is rejected with an inline message; whitespace is trimmed |
| 3 | Observe the Studio | Viewport shows grid, origin axes, and camera only; Hierarchy shows `Empty world`; Inspector shows `Nothing selected`; Asset Library shows Cube, Sphere, Plane; Monitor collapsed and idle; Console collapsed | No floor, cube, sphere, light, or sky is created |
| 4 | Hover the viewport empty state | Overlay explains: `Add a primitive to start building. The grid and camera are editor helpers, not world objects.` | Overlay does not block camera navigation |
| 5 | Dismiss or ignore the overlay | Overlay disappears after the first object is created or when the user starts navigating | It does not reappear unless the world becomes empty again |

**Success:** A named project with zero entities, an empty Hierarchy, an empty Inspector, and a visible editor grid.
**Failure and edge cases:**

- Storage quota exhausted while creating: project opens in memory; a persistent banner says it is not yet saved; Save offers Export.
- Name already exists: duplicates are allowed because identity is the project ID; the hub shows both with modified timestamps.
- User cancels: no project is created.

## 5. F-03 — Add a Primitive

**Goal:** Put the first object into the world.
**Entry points:** Top bar `Add`; viewport empty overlay; World Hierarchy empty state; Asset Library card.
**Preconditions:** Editing; world may be empty.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Click `Add` in the top bar | Menu opens with Cube, Sphere, Plane; each row shows a thumbnail/icon and default placement | `Add` is disabled outside Editing with the reason `Stop the simulation to add objects` |
| 2 | Choose `Cube` | Entity is created with POC defaults: position (0, 0.5, 0), identity rotation, scale 1; it becomes the sole selection | Default name `Cube`; numeric suffix if the name is in use |
| 3 | Observe the panels | Hierarchy adds a row and selects it; viewport renders the cube and selection outline; Inspector opens the entity properties; status bar updates entity count and last action `Created Cube` | Camera does not move unless framing is explicitly requested |
| 4 | Add another object from the Asset Library | Double-click or `Add` creates the object with the same defaults; drag-to-viewport is Phase 02+ | The new object becomes the sole selection |
| 5 | Add from the empty-world overlay | Same result; overlay disappears | The overlay is editor chrome and is not serialized |

**Success:** One or more world entities exist; all panels agree on the same world state.
**Failure and edge cases:**

- Entity creation fails validation: no row, no mesh, error toast with a retry action.
- Rapid repeated adds: each add is a separate entity; no debounce that drops intent.
- World becomes empty again after deletion: empty overlay returns; Hierarchy shows empty state.

## 6. F-04 — Select an Object and Inspect Properties

**Goal:** Understand what an object is and what it contains.
**Entry points:** Viewport click; Hierarchy row click; Console reveal; Monitor watch; node reference.
**Preconditions:** At least one entity exists.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Click an object in the viewport | Object receives a selection outline; gizmo appears if the viewport is active; Hierarchy highlights the row; Inspector shows the entity | Clicking an object must not orbit or pan |
| 2 | Click a different row in the Hierarchy | Selection moves; viewport highlight and gizmo follow; Inspector updates; previous highlight clears | Exactly one selection |
| 3 | Inspect the Inspector header | Shows entity name, type icon, and type label; overflow offers Rename, Duplicate (when available), Delete | ID is available under an info popover, read-only |
| 4 | Inspect sections | `Transform` is expanded; `Components` appears from MVP-1; `Metadata` is advanced/collapsed; `Runtime` appears only during Running/Paused | Empty sections are not rendered |
| 5 | Click empty viewport space or press `Esc` | Selection clears; viewport highlight and gizmo disappear; Inspector shows `Nothing selected` | `Esc` first clears selection if no overlay is open; see Esc priority |
| 6 | Select an object during Running | Same selection behavior; Inspector shows authored values locked plus a live Runtime section; gizmo is hidden | Selection remains an editor action |

**Success:** Selection is consistent across viewport, Hierarchy, Inspector, and runtime observation.
**Failure and edge cases:**

- Selected entity is deleted elsewhere: selection clears; Inspector returns to empty state.
- Clicking a gizmo handle: selection does not change.
- Clicking a panel header: panel focus changes, world selection does not.
- Hidden or future entity type: type label falls back to `Object`; the app does not crash.

## 7. F-05 — Change Transform in the Inspector

**Goal:** Set an exact position, rotation, or scale.
**Entry points:** Inspector → Transform.
**Preconditions:** Exactly one entity selected; Editing.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Inspect the Transform section | Position fields X/Y/Z, rotation fields X/Y/Z in degrees, scale fields X/Y/Z; each row has a reset action | Space badges: `World` for position and rotation, `Local` for scale. No local/world toggle exists |
| 2 | Click a numeric field | Field enters edit mode; value is selected; the label becomes a drag handle for scrubbing | Step 0.1 for position/scale; 1 for rotation |
| 3 | Type a value and press `Enter` | Value commits; viewport updates within the next frame; Hierarchy and status bar remain consistent | Blur also commits |
| 4 | Press `Esc` while editing | Field reverts to the last committed value; focus remains on the field | The world is not modified |
| 5 | Enter an invalid value | Inline message names the rule; the field reverts; the world is not modified | Invalid: non-numeric, NaN, infinite, zero scale, negative scale, scale below 1e-3 |
| 6 | Edit rotation near ±90° pitch | A small warning icon appears with a tooltip: `Euler angles are ambiguous near ±90° pitch. Rotation is stored as a quaternion.` | Display order is YXZ (yaw, pitch, roll); quaternion remains the source of truth |
| 7 | Use a reset action | That row returns to a defined default or the value at selection time; tooltip states which | Reset is one undoable action when undo exists; otherwise it is immediate |

**Success:** The authored transform changes; viewport, Inspector, and serialized world agree.
**Failure and edge cases:**

- One field edit must not silently alter other fields. Rotation display may change because of Euler conversion; stored quaternion stays equivalent.
- Scale is local. The Inspector MUST NOT present scale as world-space or silently convert it.
- Editing is disabled in Running/Paused; fields are read-only and a lock chip explains how to edit.
- Multi-field paste is not in MVP-0.

## 8. F-06 — Change Transform with a Gizmo

**Goal:** Move, rotate, or scale an object directly in the viewport.
**Entry points:** Viewport toolbar; `W`, `E`, `R`.
**Preconditions:** Exactly one entity selected; Editing; viewport hovered or focused.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Choose Move, Rotate, or Scale | Active mode is highlighted in the viewport toolbar; the gizmo changes | `W` = move, `E` = rotate, `R` = scale |
| 2 | Hover a handle | Handle highlights; cursor changes; a tooltip names the axis | Translate/rotate handles align to world axes; scale handles align to the entity's local axes |
| 3 | Drag a handle | Transform updates live at most once per animation frame; Inspector fields update live | Camera does not orbit; selection does not change |
| 4 | Release | Final value commits once; Inspector settles; status bar shows `Moved Cube` / `Rotated Cube` / `Scaled Cube` | A click without movement does not modify the transform |
| 5 | Switch mode | Gizmo swaps without changing the transform; values remain consistent | Mode switch must not introduce drift |
| 6 | Attempt a gizmo drag during Running | Gizmo is hidden; toolbar modes are disabled; tooltip says `Stop the simulation to transform objects` | Camera and selection still work |

**Success:** The transform changes exactly as dragged and all panels agree.
**Failure and edge cases:**

- Near-zero scale is rejected with an inline message and the value reverts.
- Negative scale is unsupported and rejected.
- Gizmo drag that begins outside the handle does not transform.
- Losing pointer capture cancels the drag and restores the last committed value.
- At extreme camera angles, selection and gizmo remain readable; if not, the user can Frame.

## 9. F-07 — Open the Visual Logic Editor

**Goal:** Author behavior for an object or system.
**Entry points:** Program preset; `Open Visual Logic` in the View menu; a Console error link; a behavior slot in the Inspector (MVP-2+).
**Preconditions:** MVP-2 capability present; Editing.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Choose Program or `Open Visual Logic` | Layout changes to Program; Program dock opens; Visual Logic tab is active; viewport remains visible | If the capability is not present, the entry point is hidden |
| 2 | Inspect the empty graph | Canvas shows grid and an empty state: `No logic yet` with `Add event node` and `Create demo graph` | Demo graph is optional and clearly labelled as a starting point |
| 3 | Add an event node | Node appears at the pointer or canvas center; node palette groups Events, Actions, Logic, Objects | Node properties appear in the Inspector |
| 4 | Add an action node | Second node appears; ports show compatible types | Incompatible ports do not highlight |
| 5 | Drag from an output port to a compatible input | Edge preview follows pointer; compatible ports highlight; on drop, the edge is created | Invalid drop produces no edge and a brief inline reason |
| 6 | Select a node | Node outline appears; Inspector shows node type, label, parameters, and connections; Hierarchy selection is unchanged | Selection is contextual: a node is not a world entity |
| 7 | Validate | Validation bar shows `0 errors` or a count; errors list with node links; Console receives a summary | Validation does not run the graph |
| 8 | Run the simulation | Program dock becomes read-only; validation must pass before Running | If invalid, the run is blocked and the first error is revealed |
| 9 | Switch to Python | Visual Logic state is preserved; Python tab becomes active | If Python is unavailable, the tab is hidden or `Planned` |

**Success:** A valid graph is connected, serializable, and visible in the Program dock.
**Failure and edge cases:**

- Invalid or incomplete graph: run is blocked; error bar expands; `Reveal node` focuses the first error.
- User closes the graph with unsaved changes: Save / Discard / Cancel.
- Capability not implemented: no fake canvas; the Program entry point is hidden.
- Very large graph: canvas remains responsive; minimap and fit controls are available; performance limits are a Phase 06 test.

## 10. F-08 — Open the Python Editor

**Goal:** Author Python behavior, or understand why it is not available.
**Entry points:** Program preset → Python tab; View menu → `Open Python`; Console Python error link (Phase 07).
**Preconditions:** Phase 07 capability present; Editing.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Choose the Python tab | Program dock switches to Python; file tabs and editor appear; viewport remains visible | Last active file and cursor are restored |
| 2 | Inspect the editor | Line numbers, syntax highlighting, diagnostics gutter, line/column status, API reference drawer | The API is not invented here; content comes from the approved Python API |
| 3 | Edit a file | Dirty dot appears on the file tab and Program dock header; Console does not receive every keystroke | Diagnostics update on a debounce or explicit validate |
| 4 | Run the simulation | Python becomes read-only; Python status chip shows `Running`; output is filtered under `Python` in the Console | Python execution isolation and limits are Phase 07 decisions |
| 5 | Stop | Python becomes editable; runtime output remains in the Console with a `Last run` marker | Authored file content is unchanged by the runtime |
| 6 | Open Python before Phase 07 | The tab is hidden, or shows `Python is planned for a later phase` with `Learn more`; no editable buffer is presented | The Studio must not pretend Python works |

**Success:** Python files are editable, saved with the project, and observable when the runtime exists.
**Failure and edge cases:**

- Python worker fails to start: status chip `Unavailable`; Console error; editor remains usable for authoring.
- Script timeout: Console error with timeout reason; runtime stops or reports the failure according to the Phase 07 contract.
- Unsaved file closed: Save / Discard / Cancel.
- Visual Logic and Python both exist: they remain separate sources; no automatic bridge is implied.

## 11. F-09 — Run the Simulation

**Goal:** Start a runtime instance from the current authored project.
**Entry points:** Top bar `Run`; `Ctrl+Enter`; Monitor empty state `Run simulation`.
**Preconditions:** Editing; run capability present; at least zero entities is valid, but the project must pass validation.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Click `Run` | Focused field commits; active graph/script buffer commits; project validation starts; transport enters Preparing | Run uses the current in-memory authored state, saved or not |
| 2 | Validation fails | Stay in Editing; runtime bar does not appear; validation surface opens the relevant panel; Console receives errors; first error is revealed | No runtime instance is created |
| 3 | Validation passes | Runtime bar appears: `Preparing simulation…`; Run disabled; Cancel available; panels show locked state | Structural controls disable immediately |
| 4 | Runtime is ready | State becomes Running; runtime bar shows `Running · 00:00.0 · World editing locked`; Monitor becomes live; Console appends `Simulation started` | First run in a project expands the Monitor once |
| 5 | Observe | Viewport shows runtime transforms; Inspector shows authored values locked plus Runtime section; Program dock is read-only | Camera and selection remain available |
| 6 | Preparation fails | Return to Editing; runtime bar disappears; error banner names the failure; `Open Console` action | Authored project is untouched |

**Success:** A runtime instance is advancing and the Studio clearly communicates that the authored world is locked.
**Failure and edge cases:**

- Empty world: the run is allowed only if the phase's simulation core accepts an empty world; otherwise a validation message says `Add an object or a behavior before running`.
- WebGL context lost: runtime pauses or stops with a clear error; no silent blank viewport.
- User closes the tab while running: browser prompt; runtime is not persisted.
- Save during run: allowed; saves authored state, not runtime values.
- Starting a second run while Preparing is impossible; Run is disabled.

## 12. F-10 — Pause, Resume, Reset, and Stop

**Goal:** Control the runtime without losing the authored project.
**Entry points:** Top bar transport; keyboard.
**Preconditions:** Preparing, Running, or Paused.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Click `Pause` | State becomes Paused; runtime bar turns amber; Monitor freezes values; viewport freezes; camera/selection still work | Program and world remain locked |
| 2 | Click `Resume` | State returns to Running from the same point; Monitor resumes | Run button label becomes `Resume` while paused |
| 3 | Click `Reset` from Running | State becomes Preparing; runtime rebuilds from the initial snapshot; then Running; Monitor time resets; Console marks `Simulation reset` | Authored state is untouched |
| 4 | Click `Reset` from Paused | State becomes Preparing, then Paused at the initial snapshot, per the product specification | The UI must not silently resume |
| 5 | Click `Stop` | Runtime is discarded; state becomes Editing; runtime bar disappears; viewport and Inspector return to authored values; Program becomes editable; Monitor shows `Last run`; toast explains runtime was discarded | Selection is preserved if valid |
| 6 | Close the project while running | Save / Discard / Cancel; if the user continues, runtime is discarded | No runtime persistence |

**Success:** The user can move predictably between runtime states and always return to the authored project with Stop.
**Failure and edge cases:**

- Stop during Preparing: runtime build is cancelled and discarded; return to Editing.
- Reset failure: return to Editing with an error; do not leave a half-built runtime.
- Pause during a long frame: input is queued and applied at the next safe boundary; the transport shows a busy state if needed.
- Keyboard focus in a numeric field: transport shortcuts still work unless the field is in an invalid edit; in that case the shortcut is ignored with no destructive action.

## 13. F-11 — Observe the Simulation Monitor

**Goal:** Understand what the simulation is doing right now.
**Entry points:** Right dock Monitor; runtime bar `Monitor →`; Simulate preset.
**Preconditions:** Running or Paused; MVP-3 for full metrics.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Run the simulation | Monitor expands once on first run; header shows state, elapsed time, frame rate | Subsequent user collapse is respected |
| 2 | Inspect summary tiles | State, simulation time, step rate, frame time/FPS, entity count, active behaviors | Metrics that are not available in the phase are not shown |
| 3 | Select an object in the viewport | Monitor watch shows that entity's runtime transform and phase-appropriate values | Selection updates the watch unless a pin is active |
| 4 | Pin the watch | Pin icon locks the entity; selecting another object does not change the watch | Pin clears on Stop |
| 5 | Inspect events | Event list shows warnings/errors with counts and reveal links | Clicking a row reveals the source; it does not steal focus on arrival |
| 6 | Stop | Monitor shows `Last run` summary with duration, peak entity count if available, and error count | Last-run data is read-only and cleared on the next run or explicit clear |
| 7 | No run yet | Monitor shows `No active simulation` with `Run simulation` | In Editing, the header can stay collapsed |

**Success:** The user can answer "is it running, how fast, what is selected, and did anything go wrong?" without leaving the viewport.
**Failure and edge cases:**

- Monitor data source unavailable: show `Metrics unavailable` with a reason, not zeros.
- Runtime crashes: Monitor shows `Stopped unexpectedly`; Console has the error; no fabricated final metrics.
- Very high log volume: Monitor aggregates counts; Console provides detail.
- Frame rate below target: display the measured value; do not color it as an error unless a phase-defined threshold exists.

## 14. F-12 — Read the Console and Navigate to the Source

**Goal:** Understand output and fix the cause.
**Entry points:** Console drawer; runtime bar error badge; Monitor event; validation bar.
**Preconditions:** None.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Click the Console header | Drawer expands to 200 px; toolbar and log list appear | Collapsed header already shows highest severity and latest message |
| 2 | Filter by severity | All / Info / Warn / Error; counts update; list filters without losing scroll position per filter | Filters are persisted; search text is not |
| 3 | Search | Matching text highlights; result count appears; no match shows `No matches for “…”` | Search is local to the Console |
| 4 | Filter by source | Editor / World / Runtime / Logic / Python | Unavailable sources are hidden or disabled with a reason |
| 5 | Click an entity or source link | Selection moves and the target panel reveals the object/node/line | Reveal is explicit; it may change panel focus |
| 6 | Inspect an error | Row expands to show message, code, timestamp, and details; copy action available | Stack traces are collapsed by default |
| 7 | Clear | Confirmation is not required for clearing logs; an undo is not available; the action is explicit | Filter state remains |
| 8 | First runtime error arrives | Console auto-expands once in the session, without stealing keyboard focus; badge and runtime bar update | Subsequent errors only badge unless the user has pinned it open |

**Success:** The user can identify, locate, and act on an error without opening a separate developer console.
**Failure and edge cases:**

- Log flood: virtualized list; auto-scroll pauses when the user scrolls up; `Jump to latest` appears.
- Console clear while an error is active: error count clears, but the runtime bar still reports the current runtime state.
- A log references a deleted entity: reveal shows `Object no longer exists`.
- Copy failure: show a non-blocking toast; keep the row selected.

## 15. F-13 — Save the Project

**Goal:** Persist authored work locally.
**Entry points:** Top bar Save; `Ctrl+S`; project menu; unsaved-changes dialog.
**Preconditions:** A project is open.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Press `Ctrl+S` on an unnamed project | Save dialog asks for a project name and location scope (`This browser`) | Default name from the project |
| 2 | Confirm | Save progress indicator; on success, dirty marker clears; toast `Project saved`; top bar shows `Saved` and time | Save writes authored state only |
| 3 | Press `Ctrl+S` on a named project | Saves in place; no dialog; brief saving state | Debounce repeated saves; do not lose the latest edit |
| 4 | Save during Running | Allowed; saves the authored project, not runtime values; tooltip explains | The runtime continues |
| 5 | Save fails | Persistent banner: `Project could not be saved. Your changes are still in this tab.` Actions: Retry, Export copy, Show details | Dirty state remains |
| 6 | Close with unsaved changes | Dialog: Save / Discard / Cancel; Save completes before close | Browser `beforeunload` prompt as a fallback |

**Success:** The authored project can be reopened with entities, transforms, components, graphs, and Python files preserved according to phase.
**Failure and edge cases:**

- Storage quota exceeded: do not discard in-memory state; offer export.
- Serialization validation fails: do not write a partial project; name the invalid field.
- Save while a field is mid-edit: commit the focused field first, or keep the previous committed value and tell the user; do not save an uncommitted transient value silently.
- Save while a graph is being dragged: commit the drag or cancel it before serialization.
- No autosave in MVP-0; the dirty indicator and beforeunload prompt are the safety net.

## 16. F-14 — Reopen a Saved Project

**Goal:** Confirm persistence and continue work.
**Entry points:** Project Hub recent list; `Ctrl+O`.
**Preconditions:** A saved project exists.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Open the project | Loading state; validation; Studio opens in Build | Layout is restored from browser preferences; world selection is empty |
| 2 | Inspect the world | Hierarchy and viewport show the same entities; transforms match the saved values; entity count matches | Camera pose is not restored in MVP-0 |
| 3 | Inspect behaviors | Graphs and Python files appear if the phase supports them | Broken references show validation errors, not silent loss |
| 4 | Run | Validation passes; the demonstration behaves as saved | Persistence of runtime state is not expected |

**Success:** No data loss in a normal save/reopen cycle; the world is editable immediately.
**Failure and edge cases:**

- Schema migration needed: show a migration notice; never partially migrate.
- Missing asset or behavior reference: load the world, mark missing references, and surface errors in Console.
- Corrupt project: no partial load; offer recovery from a previous export if one exists.

## 17. F-15 — Import a World File

**Goal:** Bring an existing world document into the Studio.
**Entry points:** Project Hub → Import; project menu → Import World.
**Preconditions:** A `.json` world document that follows the POC schema.

| Step | User action | UI response | State / notes |
| --- | --- | --- | --- |
| 1 | Choose a file | Pre-parse size check; files over 1,048,576 bytes are rejected with actual size and limit | 1 MiB is the provisional POC guardrail, not a product limit |
| 2 | File is empty | Reject with `This file is empty.` | Current world unchanged |
| 3 | File is malformed JSON | Reject with `This file is not valid JSON.` and a line/column when available | Current world unchanged |
| 4 | Schema version unsupported | Reject with `This project uses schema version {n}, which this build does not support.` | No partial import |
| 5 | Validation passes | Import progress; world replaces the current world only after all checks; selection clears; camera stays or frames the world | Failure leaves world, selection, camera, and renderer unchanged |
| 6 | Import into a project with unsaved changes | Confirm Replace / Cancel; Replace may offer Save first | Do not silently discard authored work |

**Success:** The imported world is visible and consistent across Hierarchy, viewport, and Inspector.
**Failure and edge cases:**

- Metadata too deep or too many nodes: reject with the specific rule; no stack overflow.
- Duplicate entity IDs: reject with the duplicate ID.
- File read failure: show the error; do not clear the current world.
- Import while running: disabled with `Stop the simulation to import a world`.

## 18. Novice Path and Expert Loop

### 18.1 First five minutes (novice)

1. Hub → `New Project` → name → Create.
2. Empty world overlay → `Cube`.
3. Cube is selected; Inspector shows Transform.
4. Change Position Y from 0.5 to 1.0; press Enter.
5. Open Asset Library → `Plane`; plane is selected.
6. Press `F` to frame, or click Cube in Hierarchy.
7. Choose Program → Visual Logic; add event and action nodes.
8. Run; observe Monitor and Console.
9. Stop; change a value; run again.
10. Save.

The novice path relies on selection continuity, the empty overlay, and the Inspector. It does not require knowing the docking model or keyboard shortcuts.

### 18.2 Expert loop (technical user)

```text
W → drag gizmo → Ctrl+Enter → observe → Ctrl+Shift+Enter (pause) → inspect →
Shift+F5 (stop) → edit → Ctrl+Enter → Ctrl+S
```

The expert loop relies on:

- stable transport shortcuts;
- the viewport not losing selection;
- the Monitor and Console remaining visible while collapsed;
- no modal interruption on run or stop;
- the Program dock preserving graph/script state.

Both paths use the same panels and state model. The difference is disclosure, not a separate mode.

## 19. Flow Acceptance Criteria

| ID | Criterion |
| --- | --- |
| F-AC-01 | A new project can reach an empty Studio with zero world entities in one creation flow |
| F-AC-02 | Creating a primitive selects it and updates Hierarchy, viewport, Inspector, and status bar |
| F-AC-03 | Selection from viewport, Hierarchy, Console, Monitor, and node references converges on the same entity |
| F-AC-04 | Inspector and gizmo transform edits agree within the POC tolerances and do not drift |
| F-AC-05 | Visual Logic can be opened, authored, validated, and preserved across tab switches |
| F-AC-06 | Python is either available and truthful about its runtime state, or clearly unavailable |
| F-AC-07 | Run blocks on validation failure and creates no runtime instance |
| F-AC-08 | Preparing, Running, Paused, and Stopped each show the specified UI and lock behavior |
| F-AC-09 | Stop returns to authored values and explicitly says the runtime was discarded |
| F-AC-10 | Monitor answers state, time, performance, selection, and error questions without blocking the viewport |
| F-AC-11 | Console errors can be traced to an entity, node, or Python line without a developer console |
| F-AC-12 | Save is available in every runtime state and never persists runtime values |
| F-AC-13 | Save/reopen preserves entities and transforms without data loss in the tested scenario |
| F-AC-14 | Import failure leaves the current world, selection, camera, and renderer unchanged |
| F-AC-15 | No flow requires all nine panels to be open at once |
