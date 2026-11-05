# SimuForge — Workspace Layout Specification

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 — Draft for review |
| Date | 2026-11-05 |
| Status | Design baseline; no implementation authorized |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Related | [Main Studio UX](MAIN_STUDIO_UX_SPECIFICATION.md), [Interaction](INTERACTION_SPECIFICATION.md), [Design System](DESIGN_SYSTEM_SPECIFICATION.md) |

## 1. Layout Goals

1. Keep the world visible while the user inspects, programs, and observes.
2. Reach a useful Build workspace in one click from a blank project.
3. Never force all nine panels open at once.
4. Keep the runtime state visible without a modal.
5. Remain usable at 1024×640, the POC minimum.
6. Allow panel resizing, collapsing, and compatible movement without requiring a full docking framework in the first scaffold.
7. Leave structural room for a future 2D or hybrid viewport in the center work area.

## 2. Shell Structure

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR — 48 px                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ RUNTIME BAR — 28 px, only in Preparing / Running / Paused                     │
├──────────────────┬──────────────────────────────────────┬────────────────────┤
│ LEFT DOCK        │ CENTER WORK AREA                     │ RIGHT DOCK         │
│ default 260 px   │ flexible, minimum 480 px             │ default 320 px     │
│ min 200          │                                      │ min 260            │
│ max 360          │ ┌──────────────────────────────────┐ │ max 420            │
│                  │ │ VIEWPORT                         │ │                    │
│ ┌──────────────┐ │ │ flexible                         │ │ ┌────────────────┐ │
│ │ World        │ │ │                                  │ │ │ Inspector      │ │
│ │ Hierarchy    │ │ │ viewport toolbar overlay, 36 px  │ │ │ flexible       │ │
│ │              │ │ │                                  │ │ │                │ │
│ │              │ │ └──────────────────────────────────┘ │ │                │ │
│ │              │ │ ┌──────────────────────────────────┐ │ │                │ │
│ ├──────────────┤ │ │ PROGRAM DOCK — collapsed 32 px   │ │ ├────────────────┤ │
│ │ Asset        │ │ │ or 320 px default, max 60%       │ │ │ Simulation     │ │
│ │ Library      │ │ │ [Visual Logic] [Python]          │ │ │ Monitor        │ │
│ │              │ │ │                                  │ │ │ collapsed 32   │ │
│ └──────────────┘ │ └──────────────────────────────────┘ │ │ or 260 px      │ │
│                  │                                      │ └────────────────┘ │
├──────────────────┴──────────────────────────────────────┴────────────────────┤
│ CONSOLE DRAWER — 32 px collapsed / 200 px expanded, full width                │
├──────────────────────────────────────────────────────────────────────────────┤
│ STATUS BAR — 24 px                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

The diagram is schematic. In the real shell, the viewport and Program dock share the center column; the console spans the full window; the runtime bar collapses to zero height in Editing.

## 3. Dimension Tokens

| Element | Default | Min | Max | Notes |
| --- | --- | --- | --- | --- |
| Top bar | 48 px | — | — | Fixed; never scrolls |
| Runtime bar | 28 px | — | — | Conditional; absent in Editing/Stopped |
| Status bar | 24 px | — | — | Fixed; low-priority diagnostics |
| Left dock width | 260 px | 200 px | 360 px | Includes panel content, not splitter |
| Right dock width | 320 px | 260 px | 420 px | Includes panel content, not splitter |
| Center work area width | remaining | 480 px | — | Below 480, compact rules apply |
| Panel header | 32 px | — | — | Title, actions, lock chip |
| Tab strip | 32 px | — | — | Tabs share the header height where possible |
| Viewport toolbar | 36 px | — | — | Overlay or reserved strip; see §8 |
| Program dock height | 320 px | 180 px | 60% of center height | Collapsed is 32 px |
| Monitor height | 260 px | 180 px | 60% of right dock | Collapsed is 32 px |
| Console height | 200 px | 120 px | 40% of app height | Collapsed is 32 px |
| Splitter hit area | 4 px | — | — | 1 px visible line, 4 px pointer target |
| Dock collapsed rail | 44 px | — | — | Icon plus stacked label |
| Row height (hierarchy) | 26 px | — | — | Dense, keyboard-friendly |
| Row height (console) | 22 px | — | — | Monospace log rhythm |
| Control height | 28 px | 24 px | 32 px | 24 compact, 32 top-bar primary |
| Panel padding | 12 px | 8 px | 16 px | 8 compact, 12 default |

Widths and heights include content but exclude the 4 px splitter target. The splitter is visually 1 px so the shell does not accumulate thick gutters.

## 4. Layout Presets

A preset is a deterministic arrangement. It never changes runtime state, world data, selection, camera pose, or the contents of an editor.

### 4.1 Build

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar: Build active · Editing · Run                              │
├──────────────┬──────────────────────────────────┬──────────────────┤
│ Hierarchy    │ Viewport                         │ Inspector        │
│              │                                  │                  │
│              │                                  │ Transform        │
│              │                                  │ Components       │
├──────────────┤                                  │                  │
│ Assets       │                                  ├──────────────────┤
│ (open)       │                                  │ Monitor · idle   │
│              │                                  │ (collapsed)      │
│              │                                  │                  │
├──────────────┴──────────────────────────────────┴──────────────────┤
│ Console · collapsed                                                │
├────────────────────────────────────────────────────────────────────┤
│ Status bar                                                         │
└────────────────────────────────────────────────────────────────────┘
```

| Region | State |
| --- | --- |
| Left dock | Open, 260 px; Hierarchy flexible; Assets 220 px |
| Center | Viewport fills; Program dock collapsed to 32 px |
| Right dock | Open, 320 px; Inspector flexible; Monitor collapsed to 32 px |
| Console | Collapsed to 32 px |
| Runtime bar | Absent in Editing |
| Transport | Run enabled when the phase supports simulation; otherwise hidden |

Use this preset for world building and inspection. It is the default after creating or opening a project.

### 4.2 Program

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar: Program active · Editing · Run                            │
├──────────────┬──────────────────────────────────┬──────────────────┤
│ Hierarchy    │ Viewport                         │ Inspector        │
│              │                                  │ (node properties │
│              │                                  │  when selected)  │
├──────────────┤                                  │                  │
│ Assets       │                                  ├──────────────────┤
│ (collapsed)  ├──────────────────────────────────┤ Monitor · idle   │
│              │ Program dock — 320 px            │ (collapsed)      │
│              │ [Visual Logic] [Python]          │                  │
│              │ toolbar · canvas · validation    │                  │
│              │                                  │                  │
├──────────────┴──────────────────────────────────┴──────────────────┤
│ Console · collapsed; latest message visible                        │
├────────────────────────────────────────────────────────────────────┤
│ Status bar                                                         │
└────────────────────────────────────────────────────────────────────┘
```

| Region | State |
| --- | --- |
| Left dock | Open, 260 px; Assets collapsed by default |
| Center | Viewport flexible; Program dock 320 px |
| Right dock | Inspector open; Monitor collapsed |
| Console | Collapsed |
| Active program tab | Last active, or Visual Logic on first entry |

Use this preset when wiring behavior. The viewport remains visible so object references and spatial context are not lost.

### 4.3 Simulate

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar: Simulate active · Running · Pause Stop Reset               │
├──────────────────────────────────────────────────────────────────────┤
│ Runtime bar: Running · 00:12.4 · World editing locked · Monitor →   │
├──────────────┬──────────────────────────────────┬──────────────────┤
│ Hierarchy    │ Viewport · Runtime badge         │ Inspector        │
│ (selectable, │                                  │ Authored locked  │
│  locked)     │                                  │ Runtime values   │
│              │                                  ├──────────────────┤
│              │                                  │ Simulation Monitor│
│              │                                  │ 260+ px          │
│              │                                  │ metrics · watch  │
├──────────────┤                                  │ events           │
│ Assets       │                                  │                  │
│ (collapsed)  │                                  │                  │
├──────────────┴──────────────────────────────────┴──────────────────┤
│ Console · 200 px · All / Info / Warn / Error · search · logs        │
├────────────────────────────────────────────────────────────────────┤
│ Status bar                                                         │
└────────────────────────────────────────────────────────────────────┘
```

| Region | State |
| --- | --- |
| Left dock | Open, 260 px; Hierarchy visible; Assets collapsed |
| Center | Viewport fills; Program dock collapsed to 32 px with a lock summary |
| Right dock | Inspector 40%; Monitor 60%, minimum 260 px |
| Console | Expanded to 200 px |
| Runtime bar | Visible |

The Simulate preset is a prepared observation layout. It does not start a simulation. If the user selects Simulate while Editing, the layout changes and the transport remains available; the state pill still says `Editing`.

### 4.4 Focus mode

Focus mode is an explicit escape hatch for small screens or deep work. It is not a preset.

- The active Program panel occupies the center work area.
- Left and right docks collapse to rails; the console collapses to its header.
- A focus bar replaces the runtime bar position and shows `Visual Logic — Button → Force` plus `Exit focus`.
- The top bar remains, so Run/Stop and state stay visible.
- `Esc` exits focus when focus is not inside a text editor or a modal.
- The previous layout is restored exactly.

Focus mode is available for Visual Logic and Python only. It is not a general panel-maximize feature in the first scaffold.

## 5. Dock Model

### 5.1 Zones

| Zone | Accepts | Behavior |
| --- | --- | --- |
| Left dock | World Hierarchy, Asset Library | Vertical split, resizable, collapsible |
| Center work area | Viewport, Program dock, Focus mode | Viewport cannot be closed; Program dock can collapse |
| Right dock | Inspector, Simulation Monitor | Vertical split, resizable, collapsible |
| Console drawer | Console, optionally Monitor | Full-width bottom drawer, collapsible |

### 5.2 Panel compatibility matrix

| Panel | Left | Center | Right | Console drawer | Floating |
| --- | --- | --- | --- | --- | --- |
| World Hierarchy | Home | No | No | No | No |
| Asset Library | Home | No | No | No | No |
| Viewport | No | Home (permanent) | No | No | No |
| Inspector | No | No | Home | No | No |
| Visual Logic Editor | No | Program dock / focus | No | No | Deferred |
| Python Editor | No | Program dock / focus | No | No | Deferred |
| Simulation Monitor | No | No | Home | Compatible | Deferred |
| Console / Output | No | No | Compatible | Home | Deferred |

Constrained compatibility is a deliberate decision. Free docking adds state, testing, and accessibility cost without improving the MVP workflow. The first scaffold SHOULD implement the home zones, splitters, collapse, and the Build/Program/Simulate presets. Moving a panel between compatible zones MAY be delivered in Phase 02.

### 5.3 Moving a panel

Two mechanisms are specified:

1. **Menu move (initial):** the panel header overflow menu lists compatible destinations, for example `Move Monitor to Console drawer`.
2. **Drag move (Phase 02+):** drag the panel tab or header; compatible zones highlight; incompatible zones do not; a ghost preview follows the pointer; `Esc` cancels; dropping outside a valid zone returns the panel to its previous home.

A moved panel keeps its size, collapse state, active tab, and internal scroll. Moving the Monitor to the Console drawer turns the drawer into a tabbed surface; moving it back restores the right-dock split.

### 5.4 Stacking and tabs

- Panels in the same dock stack vertically with 4 px splitters.
- Panels with multiple documents (graphs, Python files, console filters) use an internal tab strip.
- The Program dock has a top-level tab strip for Visual Logic and Python.
- A tab can be reordered within its strip by drag (Phase 02+).
- Closing a document tab with unsaved changes asks Save / Discard / Cancel.
- The Viewport has no close control. The Inspector and Hierarchy cannot be closed, only collapsed.

### 5.5 Active panel and focus

- The active panel is the last panel that received pointer or keyboard focus.
- Its header title uses primary text; inactive headers use secondary text.
- Keyboard focus is shown with a 2 px focus ring, not only a color change.
- Clicking a panel's empty background focuses the panel without changing the world selection, except in the viewport where clicking empty space clears selection.

## 6. Resizing and Collapse

### 6.1 Splitters

- Visual: 1 px `border-subtle`.
- Hit target: 4 px, centered on the line.
- Hover: line becomes `border-strong`; cursor changes to `col-resize` or `row-resize`.
- Drag: live resize with no transition; the viewport canvas updates on the next animation frame.
- Double-click: restore the panel's default size.
- Keyboard: focus the splitter, use arrow keys by 8 px, `Shift`+arrow by 32 px, `Home`/`End` to min/max. `Enter` resets. The splitter exposes `role="separator"` and `aria-valuenow`.
- Constraint collision: when a drag would push the center below 480 px, the center stops shrinking and the dragged dock stops growing. The pointer may continue, but the layout does not.

### 6.2 Panel collapse

- Collapse control lives in the panel header.
- A collapsed panel keeps a 32 px header with its title, status summary, and expand control.
- Collapsed content is removed from the tab order.
- The panel keeps its previous size for restore.
- Collapsing the Inspector while an entity is selected preserves selection and shows the entity name in the collapsed header.

### 6.3 Dock collapse

- A side dock collapses to a 44 px rail.
- The rail shows the dock's panels as icons with vertical labels and a badge for errors or unsaved changes.
- Clicking an icon expands the dock to its previous width and focuses that panel.
- A dock with a locked runtime panel shows a small lock badge on the rail.

### 6.4 Collapsed headers as status surfaces

Collapsed panels are not dead strips. They report:

| Panel | Collapsed summary |
| --- | --- |
| Simulation Monitor | `Running · 00:12.4 · 60 fps` or `No active simulation` |
| Console | highest severity icon, count, and latest message |
| Program dock | active editor name, unsaved dot, validation error count |
| Inspector | selected entity name and type, or `No selection` |
| Hierarchy | entity count and selection |
| Asset Library | asset count |

This is how the Studio keeps nine panels discoverable without showing all nine at full size.

## 7. Responsive Behavior

### 7.1 Breakpoints

| Width | Class | Layout behavior |
| --- | --- | --- |
| ≥ 1440 px | Spacious | Default sizes; all primary panels can be open |
| 1200–1439 px | Standard | Left 240 px; right 300 px; program dock 280 px |
| 1024–1199 px | Compact | Left 220 px; right 280 px; program dock 200 px; menu labels collapse; Build preset keeps both side docks |
| 768–1023 px | Limited | One side dock at a time as an overlay drawer; console remains full width; persistent `Limited space` banner; editing is degraded and not part of the supported minimum |
| < 768 px | Unsupported | Read-only `Window too small` state with a size requirement; no editing claim |

The supported editing minimum is **1024×640**, matching POC-01. The Limited and Unsupported states exist to fail gracefully, not to promise mobile support.

### 7.2 Compact rules (1024–1199 px)

- The top bar collapses menus into a single `Menu` button.
- Build/Program/Simulate becomes icon-only with tooltips and an accessible label.
- Save status becomes an icon with a tooltip; the project name truncates with an ellipsis.
- Transport keeps icon buttons; the state pill remains text.
- The left dock defaults to 220 px and the right to 280 px.
- Assets collapse automatically when Program is selected.
- The Program dock defaults to 200 px; the viewport must remain at least 300 px tall when both are open. If not, the Program dock opens in focus mode.
- The Monitor collapsed header hides the FPS suffix before hiding state and time.

### 7.3 Height rules

- At 640 px height, the console default expanded height is 160 px, not 200 px.
- The runtime bar reduces the workspace height by 28 px; panels MUST NOT overflow or push the status bar off-screen.
- A panel that cannot fit its minimum height collapses automatically, lowest priority first: Asset Library, Monitor, Program dock. The Inspector and Hierarchy do not auto-collapse while they hold selection or focus.

### 7.4 Browser zoom

The layout supports 100–200% browser zoom. At 200%, the effective CSS viewport may fall below 1024 px and enter the Limited state. This is acceptable; the Studio must remain scroll-free at the page level and expose a clear way back.

## 8. Viewport Geometry

- The viewport canvas fills its container exactly. It MUST NOT be sized by CSS aspect ratio; it MUST track the container with a resize observer.
- The viewport toolbar is a 36 px overlay at the top of the canvas. It does not reduce the canvas height; it floats over a subtle gradient scrim so icons stay legible on bright scenes.
- The axis helper sits in the bottom-right corner, 56×56 px, with a 12 px inset.
- The navigation hint sits in the bottom-left, 12 px inset, and fades after first interaction in a session.
- The empty-world overlay is centered horizontally and vertically within the safe area, with a maximum width of 360 px.
- The runtime badge sits in the top-right of the canvas, 12 px inset, below the toolbar if the toolbar occupies that corner.
- The canvas MUST remain usable at 320 px height and 480 px width. Below that, show the `Viewport too small` overlay instead of a distorted canvas.

## 9. Layout State Contract

This is a design contract, not implementation code. It records what must be persistable and what must be derivable.

```ts
type Posture = "build" | "program" | "simulate";
type ProgramTab = "logic" | "python";
type DockId = "left" | "center" | "right" | "console";

interface PanelState {
  id: "hierarchy" | "assets" | "viewport" | "inspector" | "logic" | "python" | "monitor" | "console";
  collapsed: boolean;
  maximized: boolean;
}

interface WorkspaceLayout {
  posture: Posture;
  left: { width: number; collapsed: boolean; panels: PanelState[] };
  right: { width: number; collapsed: boolean; panels: PanelState[] };
  center: {
    programHeight: number;
    programCollapsed: boolean;
    activeProgramTab: ProgramTab;
    focusMode: boolean;
  };
  console: { height: number; collapsed: boolean; activeTab: "console" | "monitor" };
  activePanel: PanelState["id"];
}
```

Rules:

- Every numeric size is clamped to the ranges in §3 on load.
- Unknown panel IDs are ignored, not fatal.
- A corrupted layout falls back to the Build preset and shows a non-blocking notice.
- Layout is stored outside the authored project document.
- Presets replace only the layout fields above.

## 10. Layout Persistence

| Item | Persisted? | Scope | Notes |
| --- | --- | --- | --- |
| Dock widths and heights | Yes | Browser profile | Last used values |
| Collapse state | Yes | Browser profile | Per panel |
| Active program tab | Yes | Browser profile | `logic` or `python` |
| Focus mode | No | Session | Avoid reopening into a hidden-chrome state |
| Posture | Yes | Browser profile | Last selected preset |
| World selection | No | Session | Cleared on project open |
| Camera pose | No | Session | POC-01 treats camera as editor state |
| Console filters | Yes | Browser profile | Search text is not persisted |
| Monitor pinned entity | No | Session | Cleared on Stop |
| Graph/editor scroll | No | Session | Preserved within a session |

Persistence is best-effort. If storage is unavailable, the Studio uses defaults and shows one informational notice. It MUST NOT block editing.

## 11. Z-Index and Layering

| Layer | Z-index | Examples |
| --- | --- | --- |
| Base | 0 | Panels, canvas |
| In-panel sticky | 10 | Panel headers, console toolbar |
| Viewport overlay | 20 | Viewport toolbar, axis helper, empty overlay, runtime badge |
| Dropdown / menu | 30 | Project menu, view menu, asset category menu |
| Popover | 40 | Node search, color picker, tooltip panel |
| Modal scrim | 50 | Dialog scrim |
| Modal | 51 | Save, delete, unsaved changes |
| Toast | 60 | Save/export/runtime notices |
| Tooltip | 70 | Hover labels |

Toasts sit above the status bar, never over the transport. Modals never cover the entire app with an opaque background; the scrim is dark enough to focus attention but the runtime bar remains legible where possible.

## 12. Layout Accessibility

- The shell exposes landmarks: top bar (`banner`), left dock (`complementary`), center (`main`), right dock (`complementary`), console (`region` with `aria-label="Console"`), status bar (`contentinfo`).
- Tab order is top bar → left dock → center viewport → Program dock → right dock → console → status bar. The active panel may receive focus directly when the user clicks it.
- Splitters are keyboard operable and announce their size.
- Collapse/expand buttons announce state with `aria-expanded`.
- Tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"`, with arrow-key navigation.
- The viewport canvas is not the only way to reach an object. The Hierarchy provides an equivalent selection path.
- Page-level horizontal scrolling is forbidden. Panel content scrolls independently.
- At 200% zoom, controls must remain reachable; the layout may enter the Limited state.

## 13. Layout Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| L-01 | Build, Program, and Simulate produce the specified panel states | Visual inspection at 1440×900 and 1024×640 |
| L-02 | No preset ever changes runtime state, world data, selection, or camera | State inspection before/after preset switch |
| L-03 | The viewport canvas exactly fills its container after resize | Resize from 1024×640 to 1920×1080; no distortion or page scroll |
| L-04 | All splitters respect min/max constraints and are keyboard operable | Manual + automated focus test |
| L-05 | Collapsed panels report a live summary and remain discoverable | Visual inspection in all five runtime states |
| L-06 | At 1024×640, every primary panel is reachable without horizontal page scroll | Manual inspection |
| L-07 | At < 1024 px, the Limited/Unsupported state is clear and recoverable | Manual inspection |
| L-08 | Layout persistence restores sizes and collapse state, and falls back safely on corrupt data | Manual + storage injection test |
| L-09 | No panel overlaps the runtime bar, status bar, or transport | Visual inspection at 1024×640 and 1440×900 |
| L-10 | Focus mode restores the prior layout exactly | Manual inspection |
| L-11 | Empty world shows zero entities and the editor chrome is not listed in the Hierarchy | Manual + export inspection |
| L-12 | A 2 px focus ring is visible on every interactive control in dark theme | Keyboard-only inspection |
