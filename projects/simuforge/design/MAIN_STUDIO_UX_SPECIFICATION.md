# SimuForge — Main Studio UX Specification

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 — Draft for review |
| Date | 2026-11-05 |
| Status | Design baseline; no implementation authorized |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Related | [Workspace Layout](WORKSPACE_LAYOUT_SPECIFICATION.md), [User Flows](MAIN_USER_FLOWS.md), [Design System](DESIGN_SYSTEM_SPECIFICATION.md), [Interaction](INTERACTION_SPECIFICATION.md) |

## 1. Purpose

This document defines the mental model, panel responsibilities, and cross-panel behavior of the SimuForge Main Simulation Studio. It answers three questions:

1. What does the user see, and why is it in that place?
2. How do world building, programming, and simulation observation stay connected without competing for space?
3. How does the Studio make the authored project and the runtime instance impossible to confuse?

Layout geometry is in [WORKSPACE_LAYOUT_SPECIFICATION.md](WORKSPACE_LAYOUT_SPECIFICATION.md). Exact pointer and keyboard behavior is in [INTERACTION_SPECIFICATION.md](INTERACTION_SPECIFICATION.md).

## 2. Design Intent

SimuForge is a **production workspace for simulations**, not a game editor and not a scene viewer. The Studio must make the loop below feel like one continuous activity:

```text
        ┌──────────────┐
        │    BUILD     │  create and arrange the world
        └──────┬───────┘
               │ selection carries context
        ┌──────▼───────┐
        │   PROGRAM    │  give objects and systems behavior
        └──────┬───────┘
               │ run uses the current authored state
        ┌──────▼───────┐
        │   SIMULATE   │  run, pause, observe, inspect, stop
        └──────┬───────┘
               │ stop returns to the authored world
        ┌──────▼───────┐
        │    REVISE    │  edit and run again
        └──────────────┘
```

The Studio is **3D-first**. The layout must not hard-code assumptions that prevent a 2D or hybrid surface later, but it does not claim 2D support now.

## 3. Design Principles

### P-01 — One Studio, three postures

Build, Program, and Simulate are postures of the same workspace, not separate applications. They share selection, project state, console, and runtime status.

### P-02 — Empty means empty

A new project contains zero world objects. The grid, editor camera, selection outline, gizmos, and axis helper are editor chrome. They are never serialized as entities and never appear in the World Hierarchy.

### P-03 — Observe without obstruction

Runtime observation must be visible without hiding the world or the program. The Monitor and Console use collapsible headers that keep live status visible while collapsed. Observation never requires a modal that blocks the viewport.

### P-04 — Selection is the connective tissue

One selection travels across the viewport, World Hierarchy, Inspector, Program dock, Monitor, and Console. Selecting a referenced object from a node, a monitor row, or a log line reveals it everywhere.

### P-05 — Authored and runtime are different states

The authored project is the source of truth. A run is a separate runtime instance built from a snapshot. The UI must label runtime values, never edit them in place, and visibly return to authored values on Stop.

### P-06 — Progressive disclosure over density

Not every panel is open at once. Primary context is always visible; secondary context expands on demand. A collapsed panel still reports enough status to know whether it needs attention.

### P-07 — No fake controls

A control that cannot work in the current phase or state is hidden, disabled with a reason, or replaced by an explanatory empty state. The Studio never presents a dead button as if it were functional.

### P-08 — Editing is direct, feedback is immediate

Creation, selection, transform, rename, and panel changes respond on the next frame. Long operations expose progress and a cancel path where the runtime allows it.

### P-09 — The interface recedes

Chrome uses a restrained dark palette, compact type, and quiet borders. Accent is reserved for the primary action, selection, and runtime state. Color is never the only carrier of meaning.

### P-10 — Structure for a hybrid future

The shell separates **world**, **program**, and **observation** concerns. A future 2D viewport or hybrid scene view can occupy the center work area without redesigning the shell. No 2D capability is implied by this baseline.

## 4. Mental Model

### 4.1 Object model shown to the user

```text
Project
└── World (authored)
    ├── Entity (identity + name + type + transform)
    │   ├── Components        (MVP-1 and later)
    │   └── Behavior sources  (visual graph or Python script, later)
    └── World settings        (later; not an entity)

Runtime instance
└── Snapshot of the authored world + live state
```

The user edits the **authored world**. Running creates a **runtime instance**. Stopping discards it. This follows ADR 0001's proposed separation of editor and runtime state and the runtime rules in `PRODUCT_SPECIFICATION.md` §6.

### 4.2 Workspace postures

| Posture | Purpose | Changes layout? | Changes runtime state? |
| --- | --- | --- | --- |
| Build | Arrange the world, inspect objects, add primitives | Yes | No |
| Program | Author visual logic or Python with more vertical space | Yes | No |
| Simulate | Observe the runtime with Monitor and Console space | Yes | No |

A posture is a **layout preset**. It must never be described as "entering play mode" or "leaving edit mode". Runtime state is controlled only by the transport.

### 4.3 Runtime states and UI response

| State | Meaning | Transport | Structure | Observation | Exit |
| --- | --- | --- | --- | --- | --- |
| Editing | Authoring the project | Run enabled | Editable | Monitor shows empty or last-run summary | Run |
| Preparing | Building and validating the runtime | Cancel enabled; others disabled | Locked | Progress in runtime bar and Monitor | Running on success; Editing on failure or cancel |
| Running | Simulation advancing | Pause, Stop, Reset enabled | Locked | Live Monitor and Console | Paused, Stopped, or Reset → Preparing |
| Paused | Runtime frozen | Resume, Stop, Reset enabled | Locked | Frozen values; camera and selection still work | Running, Stopped, or Reset → Preparing → Paused |
| Stopped | Runtime discarded; authored state active | Run enabled | Editable | Last-run summary until the next run or explicit clear | Editing |

Rules that the UI MUST enforce:

- Structural edits are available only in Editing.
- Camera navigation, selection, panel resizing, tab switching, Console filtering, and Monitor inspection remain available in Running and Paused.
- Save is available in every state and always saves the **authored** project, never runtime values.
- Stop never modifies the authored project.
- Reset re-enters Preparing. From Paused, it returns to Paused at the initial snapshot, per the product specification.
- The runtime bar is visible in Preparing, Running, and Paused, and absent in Editing and Stopped.

### 4.4 Authored versus runtime values

| Surface | Editing | Running / Paused |
| --- | --- | --- |
| Viewport | Authored transforms | Runtime transforms, read-only; gizmos hidden |
| Inspector transform | Editable | Authored values locked; a separate **Runtime** section shows live values |
| World Hierarchy | Editable names and structure | Selection only; add, delete, rename disabled |
| Program dock | Editable | Read-only; active execution indicators only if tracing exists |
| Monitor | Empty or last-run summary | Live runtime metrics and watched entity |
| Console | Editor and validation messages | Runtime, script, and editor messages |
| Save | Saves authored project | Saves authored project; runtime is never serialized |

The runtime Inspector MUST use a different treatment from authored fields: a `Runtime` badge, a read-only surface, and a short explanation. It MUST NOT look like an editable field that happens to be disabled.

## 5. Workspace Anatomy

The Studio has nine product panels plus three non-panel surfaces.

### 5.1 Product panels

| # | Panel | Primary responsibility | Default home | Default in Build | Phase |
| --- | --- | --- | --- | --- | --- |
| 1 | Top Navigation / Toolbar | Project, menus, layout preset, transport, save state | Shell | Visible | MVP-0 (transport from MVP-1) |
| 2 | World Hierarchy | Object list, selection, naming, structure | Left dock, top | Visible | MVP-0 |
| 3 | 3D World Viewport | World view, camera, selection, gizmos | Center | Visible | MVP-0 |
| 4 | Inspector / Properties | Contextual properties for the selection | Right dock, top | Visible | MVP-0 (components from MVP-1) |
| 5 | Asset Library | Primitives and project assets | Left dock, bottom | Visible | MVP-0 (primitives only) |
| 6 | Visual Logic Editor | Graph authoring and validation | Program dock | Hidden | MVP-2 |
| 7 | Python Editor | Python authoring and runtime feedback | Program dock | Hidden | Phase 07 |
| 8 | Simulation Monitor | Runtime state, metrics, watched entity, events | Right dock, bottom | Collapsed | MVP-3 |
| 9 | Console / Output | Editor, runtime, script, and validation messages | Global bottom drawer | Collapsed | MVP-0 |

### 5.2 Non-panel surfaces

| Surface | Responsibility | When visible |
| --- | --- | --- |
| Project Hub | New project, recent projects, open/import | Before the Studio or from the project menu |
| Runtime bar | State, elapsed time, lock explanation, Monitor link | Preparing, Running, Paused |
| Status bar | Selection summary, entity count, active tool, engine, frame time, last action | Always in the Studio |

The Project Hub is a surface, not a tenth panel. It never appears inside the docking system.

## 6. Panel Responsibilities and Boundaries

### 6.1 Top bar

**Owns:** project identity, save state, menus, workspace preset, transport, global help.

**Shows:** brand mark, menu bar, project name and dirty state, Build/Program/Simulate preset, runtime state pill, Run/Pause/Stop/Reset, save status, help.

**Does not:** edit object properties, list objects, or display logs.

**Behavior:** the transport is always visible. The state pill and transport controls form one group. In compact widths, menus collapse before transport does.

### 6.2 World Hierarchy

**Owns:** the authoritative visible list of world entities, entity selection, entity naming.

**Shows:** search, filter, add action, entity rows with type icon, name, and phase-appropriate badges. Empty state when the world has no entities.

**Does not:** show editor camera, grid, gizmos, or lights that do not exist as entities. It must not invent a "Scene" root that implies a parent-child structure the world model does not have in MVP-0.

**Runtime:** rows remain selectable. Add, delete, rename, and reorder are disabled with a lock explanation. The header shows a `Locked` chip.

### 6.3 3D World Viewport

**Owns:** the visual world, editor camera, grid, selection feedback, gizmo interaction, viewport-local view controls.

**Shows:** canvas, viewport toolbar, axis helper, navigation hint, selection outline, gizmo, empty-world overlay, runtime badge.

**Does not:** own world data, serialize its camera or grid, or provide a right-click context menu (right-drag is pan).

**Runtime:** camera, selection, and framing remain available. Gizmos and transform tools are hidden or disabled. A `Runtime` badge appears. Structural drop targets reject drops.

### 6.4 Inspector

**Owns:** properties of the current selection and contextual read-only runtime values.

**Shows:** entity identity, transform, components, metadata (advanced, later); node properties when a logic node is selected; script properties when a Python file is selected; a clear empty state when nothing is selected.

**Does not:** maintain a second copy of transform data. It reads and writes through the store. It does not show world settings when nothing is selected.

**Runtime:** authored fields are read-only, with a lock explanation; a separate Runtime section shows live values. Component enable toggles are locked unless explicitly marked as runtime controls.

### 6.5 Asset Library

**Owns:** available objects the user can add.

**Shows:** search, categories, primitive cards (Cube, Sphere, Plane), project assets when the phase supports them, empty states, planned labels.

**Does not:** modify an existing entity. It creates new entities or (later) applies materials.

**Runtime:** adding is disabled. Browsing remains available.

### 6.6 Visual Logic Editor

**Owns:** graph authoring, graph validation display, graph navigation.

**Shows:** program tabs, graph selector, node palette, canvas, nodes, ports, edges, minimap, validation bar, empty graph state.

**Does not:** become the global Inspector. Selecting a node shows its properties in the Inspector, preserving one property surface.

**Runtime:** read-only. If execution tracing is available, active nodes and edges are highlighted with the runtime accent and a legend. If tracing is not available, the panel MUST say so rather than showing a static fake highlight.

### 6.7 Python Editor

**Owns:** Python file authoring, file navigation, diagnostics, and Python-specific output routing.

**Shows:** file tabs, code editor, line/column status, diagnostics, API reference drawer, runtime status, unavailable state before Phase 07.

**Does not:** claim that visual graphs and Python are interchangeable. The two tabs are parallel authoring surfaces. Cross-language interoperability remains an architectural open question.

**Runtime:** read-only while the runtime is active. Python output is filtered in the Console with a `Python` source chip. Before Phase 07, the tab is hidden or clearly marked `Planned`; it is never presented as a working editor.

### 6.8 Simulation Monitor

**Owns:** runtime observation.

**Shows:** runtime state, elapsed simulation time, step rate, frame time/FPS, entity count, active behaviors, watched entity values, event counts, last-run summary, empty state.

**Does not:** edit the world or the runtime. It may request a selection or reveal a source, but it never mutates simulation state.

**Collapsed:** the 32 px header shows `Running · 00:12.4 · 60 fps`; the header is a live status surface, not a dead strip.

### 6.9 Console / Output

**Owns:** chronological messages from the editor, world, runtime, logic, and Python.

**Shows:** severity filters, search, source filter, log rows, timestamps, entity/script links, empty state, error count.

**Does not:** replace graph validation. Graph validation stays local to the Program dock, with a summary echoed to the Console.

**Collapsed:** the 32 px drawer header shows the highest severity, count, and latest message. It auto-expands on the first runtime error in a session, without stealing keyboard focus.

## 7. Information Architecture and Navigation

### 7.1 Entry and exit

```text
Project Hub
├── New Empty Project ──────────────► Studio (Build, Empty World)
├── Open Recent ────────────────────► Loading ──► Studio (Build)
├── Open from File ─────────────────► Validate ──► Studio (Build)
└── Import World ───────────────────► Validate ──► Studio (Build, imported world)
```

The Studio returns to the Project Hub through the project menu. If there are unsaved changes, the user is asked to Save, Discard, or Cancel.

### 7.2 Primary navigation

The user moves between postures through the top-bar preset control:

- **Build** — hierarchy, viewport, inspector; assets visible; program dock collapsed to its 32 px header; monitor collapsed; console collapsed.
- **Program** — assets collapsed; program dock open; monitor collapsed with live summary; console available as a collapsed drawer.
- **Simulate** — program dock collapsed with a locked summary; monitor expanded; console expanded to a working height; hierarchy and inspector remain available.

Presets are starting points. A user change to panel size, collapse, or active tab becomes the current layout and is persisted. Selecting a preset resets only the affected panels, not the world, selection, camera, or runtime.

### 7.3 Selection flow

```text
Viewport click ─┐
Hierarchy click ├──► single selection ──► Inspector
Monitor row ────┤                      ├──► viewport highlight + gizmo (Editing)
Console link ───┤                      ├──► hierarchy highlight
Node reference ─┘                      └──► monitor watch
```

Rules:

- Exactly zero or one entity is selected in MVP-0 through MVP-3.
- Selection is editor state, never serialized.
- Creating an entity selects it.
- Deleting the selected entity clears selection.
- Clicking empty viewport space clears selection.
- During runtime, selecting an entity updates the Runtime Inspector and the Monitor watch.
- Selecting from a reference reveals the target in the viewport and hierarchy; it does not silently frame the camera unless the user chooses **Frame**.
- Multi-select is a post-MVP extension; the visual language reserves a `Primary` and `Additional` selection treatment but does not claim it.

### 7.4 Cross-panel reveal actions

A contextual **Reveal** action is available wherever another panel can show the same subject:

| From | To | Action label |
| --- | --- | --- |
| Console error with entity | Viewport / Hierarchy | Reveal object |
| Console error with graph node | Visual Logic Editor | Reveal node |
| Console error with Python line | Python Editor | Reveal line |
| Inspector entity reference | Viewport / Hierarchy | Reveal object |
| Logic node object reference | Viewport / Hierarchy / Inspector | Select object |
| Monitor watched entity | Viewport / Hierarchy / Inspector | Select object |
| Hierarchy row | Viewport | Frame selection |
| Graph node | Inspector | Show properties |

Reveal changes selection and panel focus only when the user invokes it. It MUST NOT steal focus on a background event.

### 7.5 Panel focus

The focused panel has a visible keyboard focus ring and an active header treatment. Focus follows the user's click. Tabbing enters the panel's internal controls in reading order. The viewport receives focus only when clicked or when the user invokes **Focus viewport** from the View menu.

## 8. Empty World

The Empty World state is a first-class design state, not an error.

### 8.1 Rules

- The world has zero entities.
- The viewport shows the grid, origin axes, and editor camera. No floor, cube, sphere, light, or sky object is created.
- The World Hierarchy shows an empty state with a creation action.
- The Inspector shows a no-selection state.
- The Asset Library shows the three primitives.
- The Monitor shows `No active simulation`.
- The Console may show `No output yet` or an informational editor message.
- The status bar shows `Entities 0` and `No selection`.
- Export produces an empty `entities` array.

### 8.2 Viewport overlay

The empty-world overlay is a small, dismissible-on-interaction card anchored near the center of the viewport. It is editor chrome, not a world object.

```text
┌─────────────────────────────────────┐
│  Empty world                        │
│  Add a primitive to start building. │
│  The grid and camera are editor     │
│  helpers, not world objects.        │
│                                     │
│  [ Cube ] [ Sphere ] [ Plane ]      │
│  Open Asset Library                 │
└─────────────────────────────────────┘
```

The overlay MUST disappear after the first object is created. It MUST NOT block camera navigation. It MUST NOT appear in screenshots of an exported world because it is not part of the world.

## 9. Programming Surface Model

### 9.1 One dock, two authoring tabs

The Program dock contains two top-level tabs:

1. **Visual Logic**
2. **Python**

Only one is visible at a time. Both preserve their own state when switched:

- graph viewport, zoom, and selection;
- open files, cursor, scroll, and undo stack;
- validation result and console filter context.

Switching tabs does not run, save, or validate the other tab.

### 9.2 Visual Logic scope

The Visual Logic tab contains:

- a graph selector when a project has more than one graph;
- an **Add node** control and a searchable node palette;
- a canvas with pan, zoom, fit, and minimap;
- nodes with typed ports, inline values, and validation badges;
- a validation bar that summarizes errors and warnings;
- an empty graph state with a first-node action.

Node properties are edited in the Inspector, not in a second floating inspector.

### 9.3 Python scope

The Python tab contains:

- a file tab strip and file list;
- a code editor with syntax highlighting, line numbers, diagnostics, and search;
- a status strip with line/column, indentation, and runtime availability;
- an API reference drawer whose content is generated from the approved Python API in Phase 07;
- a runtime status chip (`Unavailable`, `Ready`, `Running`, `Timed out`, `Error`).

Before Phase 07, the Python tab is either hidden or shown as a disabled `Planned` tab with an explanation. It MUST NOT accept edits that cannot be executed or saved.

### 9.4 Relationship between the two

The design treats visual logic and Python as **parallel behavior sources**. It does not assume:

- that a graph is a view over Python, or vice versa;
- that both can edit the same behavior in one session;
- that a graph can call a Python function or a script can call a node without an explicit, designed bridge.

Those are architectural questions. The Studio leaves room for a future bridge but does not draw one in this baseline.

## 10. Runtime Observation Model

### 10.1 What the user can observe

| Observation | Surface | Phase |
| --- | --- | --- |
| Runtime state and elapsed time | Top bar, runtime bar, Monitor | MVP-1 |
| Live entity transform | Inspector Runtime section, Monitor watch | MVP-1/MVP-3 |
| Frame time / FPS | Status bar, Monitor | MVP-3 |
| Entity count and active behaviors | Status bar, Monitor | MVP-3 |
| Logs and errors | Console | MVP-0/MVP-1 |
| Graph validation errors | Program dock validation bar + Console | MVP-2 |
| Python errors and timeouts | Console + Python diagnostics | Phase 07 |
| Node/edge execution trace | Program dock | Post-MVP unless runtime instrumentation is delivered |

### 10.2 Monitoring without stealing focus

- The Monitor may update live without moving focus.
- A new error may expand the Console, but MUST NOT move keyboard focus into it.
- A runtime warning updates the Console badge and the runtime bar; it does not open a modal.
- Selecting an entity while running updates the Monitor watch only if the user has not pinned a different entity.
- Pinning is an explicit action. A pinned watch survives selection changes and is cleared when the runtime stops.

### 10.3 Stop and return to authored state

On Stop:

1. The runtime instance is discarded.
2. The viewport returns to authored transforms.
3. The Inspector returns to authored values.
4. The Program dock becomes editable.
5. The Monitor shows the last-run summary with a `Last run` badge.
6. The Console keeps its logs and appends `Simulation stopped`.
7. Selection is preserved if the entity still exists.
8. A toast explains: `Simulation stopped. Runtime state was discarded.`

This transition is a known source of confusion. The UI MUST make it explicit; it MUST NOT silently snap objects back.

## 11. Progressive Capability Gating

The design inventory is broader than any single increment. The following rules prevent the Studio from looking unfinished or dishonest:

| Situation | Treatment |
| --- | --- |
| Capability exists and works | Normal enabled control |
| Capability exists but is unavailable in the current runtime state | Disabled with a reason tooltip and a lock indicator |
| Capability belongs to a later phase | Hidden, or shown in a clearly labelled `Planned` state that cannot be mistaken for working UI |
| Capability is unavailable in the current browser | Error state with recovery guidance |
| Data is not available yet | Empty state, never fabricated values |

Mockups may show future panels for review. Production builds MUST follow the phase table in [UI_COMPONENT_INVENTORY.md](UI_COMPONENT_INVENTORY.md).

## 12. Design Decisions

| ID | Decision | Rationale | Consequence |
| --- | --- | --- | --- |
| D-01 | Build/Program/Simulate are layout presets, not runtime modes | Prevents the common "play mode" confusion and keeps one mental model | The transport is the only runtime control; presets can change while stopped or running |
| D-02 | Four-region shell with a global Console drawer | Keeps the world visible while programming and observing | Console is full-width; Program dock is center-width, with a focus mode for deep work |
| D-03 | Monitor is a collapsible right-dock panel with a live collapsed header | Observation stays available without forcing a permanent chart panel | Runtime status must be summarized in 32 px |
| D-04 | Program dock is a bottom center panel, not a replacement for the viewport | Users need to see the world while wiring behavior | At narrow widths, focus mode is the escape hatch |
| D-05 | Visual Logic and Python are tabs, not simultaneous split views | Avoids implying interoperability and saves space | Split view is deferred |
| D-06 | Node properties live in the Inspector | One property surface; consistent selection model | Inspector must be context-aware |
| D-07 | No right-click context menu in the viewport | Right-drag is pan; a context menu would conflict | Context actions live in the toolbar, Inspector overflow, or keyboard |
| D-08 | Save always saves authored state, in every runtime state | Preserves the editor/runtime boundary | Save is not disabled during a run; tooltip explains |
| D-09 | Delete without undo requires confirmation in MVP-0 | POC has no undo; accidental deletion would be unrecoverable | When undo ships, switch to an undo toast |
| D-10 | Layout persistence is per browser profile, not per project | Layout is a workspace preference, not authored content | Project files do not carry panel geometry |
| D-11 | Docking is constrained to compatible zones | Full free docking adds complexity without MVP value | Panels can move via a menu; drag-to-dock is Phase 02+ |
| D-12 | Empty world overlay is editor chrome | Keeps the empty-world rule intact | It never serializes and disappears after first creation |
| D-13 | Runtime values get a separate Inspector section | Authored and runtime values must not be confused | More vertical content; section is collapsible |
| D-14 | Capability gating hides unfinished controls | Avoids fake functionality | Phase builds have fewer controls, not broken ones |
| D-15 | Dark theme first; light theme deferred | Professional editor default and POC scope | Tokens are semantic so a light theme remains possible |
| D-16 | 1024×640 is the minimum supported editing viewport | Matches POC and avoids a false mobile promise | Below 1024, a limited-space state is shown |

## 13. Assumptions

These are design assumptions, not product decisions. Each must be validated before the relevant implementation phase.

| ID | Assumption | Why it matters | Validate by |
| --- | --- | --- | --- |
| A-01 | The Project Hub is part of the Phase 01/04 experience, not a separate product surface | The user needs a place to create/open projects | Scaffold planning and MVP-0 acceptance |
| A-02 | Explicit Save is enough for MVP-0; autosave is deferred | Avoids inventing persistence behavior | Product review before MVP-0 |
| A-03 | Single selection is sufficient through MVP-3 | Matches POC and MVP scope | MVP-1/MVP-2 planning |
| A-04 | The Monitor opens on the first run, then respects the user's collapse | Observation is discoverable without being forced | Usability test U-03 |
| A-05 | The Console expands on the first error but does not steal focus | Errors must be visible without interrupting | Usability test U-06 |
| A-06 | Live node tracing is post-MVP unless the runtime exposes it cheaply | Avoids promising instrumentation that does not exist | Phase 06 technical review |
| A-07 | Python is hidden or `Planned` until Phase 07 | Python is not in the initial slice | Phase 07 planning |
| A-08 | Layout presets persist per browser profile | Layout is not authored project data | Scaffold planning |
| A-09 | Drag-to-dock and floating panels are Phase 02+ | Full docking is expensive and not required for MVP-0 | Scaffold planning |
| A-10 | The viewport remains perspective-only in MVP-0 | POC validated ArcRotateCamera only | Phase 02 planning |
| A-11 | Units are "world units" and degrees, not physical units | POC did not define a unit system | Product review before physics |
| A-12 | Save during a run saves authored state | Follows editor/runtime separation | MVP-1 acceptance |
| A-13 | Project camera pose and selection are not serialized in MVP-0 | POC treats them as editor state | MVP-0 acceptance; revisit later |
| A-14 | Chrome-only is acceptable for the design baseline | POC-01 approved Chrome-only scope | Re-evaluate if browser scope changes |
| A-15 | A graph's node properties can be represented by the same Inspector shell as entity properties | Avoids duplicate inspectors | Phase 06 design review |

## 14. Open Design Questions

| ID | Question | Current treatment | Needed before |
| --- | --- | --- | --- |
| QD-01 | Should a project be able to open with a restored camera pose and selection? | Not in MVP-0; default camera and no selection | MVP-0 review |
| QD-02 | Should visual logic and Python share a behavior-source registry? | Not assumed; separate tabs | Phase 06/07 architecture |
| QD-03 | Should the Monitor support multiple pinned entities? | Single pin in baseline | MVP-3 review |
| QD-04 | Should the Program dock support a side-by-side graph and console? | No; Console is a global drawer | Phase 06 usability |
| QD-05 | Should the Studio support a light theme? | Deferred; semantic tokens only | Post-MVP |
| QD-06 | Should panel layout be shareable/exportable? | No; per-profile persistence | Post-MVP |
| QD-07 | Should the Project Hub support templates? | No; empty world is the default | Post-MVP |
| QD-08 | How should hybrid 2D/3D be presented in the viewport switcher? | Reserved space; no 2D surface claimed | POC 6 / post-MVP |

## 15. Traceability

| Source requirement | Design response |
| --- | --- |
| `PRODUCT_SPECIFICATION.md` §5 — eight Studio panels, customizable and arrangeable | Nine panel specifications plus Project Hub, runtime bar, and status bar; dock model in [WORKSPACE_LAYOUT_SPECIFICATION.md](WORKSPACE_LAYOUT_SPECIFICATION.md) |
| §6 — workflow and runtime rules | Posture model, runtime state table, lock behavior, and flows F-09 to F-12 |
| §7.2 — MVP-0 acceptance criteria | Empty world, primitive creation, selection, transform, hierarchy/viewport agreement, save/reopen in [MAIN_USER_FLOWS.md](MAIN_USER_FLOWS.md) |
| §7.4 — MVP-2 visual scripting | Program dock, graph validation, execution feedback in §9 and [UI_COMPONENT_INVENTORY.md](UI_COMPONENT_INVENTORY.md) |
| §7.5 — MVP-3 monitoring | Monitor, Console, error visibility in §10 |
| §8 — Python after the initial slice | Python tab phase-gated; no interoperability claim |
| §7.1 — 3D-first, hybrid long-term | Shell separates world/program/observation; no 2D claim |
| ADR 0001 — editor/runtime separation | Authored/runtime model in §4.4 and §10.3 |
| POC-01 transform policy | Inspector space badges, no local/world toggle, local scale, quaternion truth in [DESIGN_SYSTEM_SPECIFICATION.md](DESIGN_SYSTEM_SPECIFICATION.md) and [INTERACTION_SPECIFICATION.md](INTERACTION_SPECIFICATION.md) |
| POC-01 camera map | Alt+LMB/MMB orbit, Shift+MMB/RMB pan, wheel zoom, clamps in [INTERACTION_SPECIFICATION.md](INTERACTION_SPECIFICATION.md) |
| POC-01 empty-world rule | §8 and F-02/F-03 |
| POC-01 1 MiB import guardrail | Import flow and error copy in [MAIN_USER_FLOWS.md](MAIN_USER_FLOWS.md) |
| POC-01 residual risk R-1 (gimbal lock) | YXZ display, quaternion truth, gimbal warning in Inspector |
| POC-01 residual risk R-5 (negative zoom) | Radius clamp 0.5–500 in the camera interaction contract |

## 16. Acceptance Criteria for This Specification

This specification is satisfied when:

1. A reviewer can identify every one of the nine panels and its default home.
2. Build, Program, and Simulate are unambiguously layout presets, not runtime states.
3. The five runtime states have defined UI responses and transitions.
4. The Empty World state is explicit and contains no default world object.
5. Visual Logic and Python switching preserves state and does not imply interoperability.
6. The authored/runtime distinction is visible in the viewport, Inspector, Monitor, and Save behavior.
7. Every panel has a stated responsibility and a stated boundary.
8. Every phase-gated capability has a hiding or labelling rule.
9. Every design decision and assumption is recorded with a validation path.
10. The traceability table covers the product and POC constraints that shape the Studio.
