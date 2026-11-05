# SimuForge — UI Component Inventory

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 — Draft for review |
| Date | 2026-11-05 |
| Status | Design baseline; no implementation authorized |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Related | [Design System](DESIGN_SYSTEM_SPECIFICATION.md), [Interaction](INTERACTION_SPECIFICATION.md), [Main Studio UX](MAIN_STUDIO_UX_SPECIFICATION.md) |

## 1. How to Read This Inventory

- **ID** — stable reference for design review and scaffold planning.
- **Phase** — the first increment in which the component is expected to be visible. `MVP-0` through `MVP-3` follow the product specification; `Phase 07` is Python; `Post-MVP` is explicitly deferred.
- **States** — the minimum state set that must be designed and tested. A component may have more states; it may not have fewer.
- **Phase-gated** components are hidden or clearly marked `Planned` until their phase. They are not rendered as enabled, non-functional controls.

Phase labels describe visibility, not implementation order inside a phase.

## 2. Shell and Navigation

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| SH-01 | AppShell | Root layout with top bar, docks, console, status bar | Default, limited-space, unsupported, loading | MVP-0 | Owns layout and focus landmarks |
| SH-02 | TopBar | Project identity, presets, transport, save state | Default, compact, runtime | MVP-0 | Transport appears in MVP-1 |
| SH-03 | MenuBar | File, Edit, View, Simulation, Help | Default, open menu, compact `Menu` | MVP-0 | Menu contents phase-gated |
| SH-04 | ProjectSwitcher | Project name, dirty state, project menu | Saved, dirty, saving, error | MVP-0 | Truncates in compact |
| SH-05 | WorkspacePresetControl | Build / Program / Simulate | Default, active, compact icon-only | MVP-0 (Build), MVP-1 (Simulate), MVP-2 (Program) | Layout only |
| SH-06 | RuntimeStatePill | Show Editing/Preparing/Running/Paused/Stopped | Five states, compact | MVP-1 | Icon + label + color |
| SH-07 | TransportControls | Run, Pause/Resume, Stop, Reset, Cancel | State matrix in Interaction §9.2 | MVP-1 | Disabled reasons required |
| SH-08 | RuntimeBar | State, elapsed time, lock explanation, Monitor link | Preparing, Running, Paused | MVP-1 | 28 px; absent in Editing |
| SH-09 | StatusBar | Selection, entity count, tool, engine, FPS, last action | Default, compact, warning | MVP-0 | Low-priority diagnostics |
| SH-10 | Dock | Left, right, center, console containers | Open, collapsed, rail, compact | MVP-0 | Constrained panel compatibility |
| SH-11 | DockRail | 44 px collapsed dock with icons | Default, badge, lock | MVP-0 | Click expands and focuses |
| SH-12 | Panel | Standard panel frame | Active, inactive, collapsed, locked, loading, empty, error, disabled | MVP-0 | Square corners |
| SH-13 | PanelHeader | Title, status, actions, lock | Default, hover, active, collapsed, locked | MVP-0 | 32 px |
| SH-14 | PanelCollapseControl | Collapse/expand a panel | Collapsed, expanded | MVP-0 | `aria-expanded` |
| SH-15 | TabStrip | Tabs for documents and program editors | Default, overflow, keyboard-focused | MVP-0 (console), MVP-2 (program) | Arrow-key model |
| SH-16 | Tab | One document or panel tab | Default, hover, active, dirty, locked, overflow | MVP-0 | Dirty dot |
| SH-17 | Splitter | Resize docks and panels | Idle, hover, dragging, keyboard-focused, min/max | MVP-0 | 4 px hit target |
| SH-18 | PanelOverflowMenu | Move panel, reset size, close document | Closed, open | MVP-0 | Compatible destinations only |
| SH-19 | FocusModeBar | Exit focus and show editor context | Default | MVP-2 | Program editors only |
| SH-20 | ToastRegion | Stack of transient messages | Info, success, warning, error | MVP-0 | Max 3 |
| SH-21 | DialogHost | Modal layer and focus trap | Open, closing, blocking | MVP-0 | Restores focus |
| SH-22 | Tooltip | Short labels and disabled reasons | Closed, opening, open | MVP-0 | 400 ms delay |
| SH-23 | ContextMenu | Pointer/keyboard actions in non-viewport panels | Closed, open, keyboard-positioned | MVP-0 | Not in viewport |
| SH-24 | KeyboardHelpSheet | Searchable shortcut reference | Closed, open, search | MVP-0 (basic) | Generated from command registry later |

## 3. Project Hub

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| PH-01 | ProjectHub | Entry surface before the Studio | First use, recent list, loading, storage error | MVP-0 | Not a dock panel |
| PH-02 | BrandLockup | SimuForge mark, name, tagline | Full, compact | MVP-0 | No dependency on a logo asset |
| PH-03 | ProjectCard | Recent project summary | Default, hover, loading, error, missing | MVP-0 | Name, modified time, entity count |
| PH-04 | RecentProjectList | Recent projects | Populated, empty, loading | MVP-0 | Local storage scope |
| PH-05 | NewProjectDialog | Name and create an empty project | Default, invalid name, creating, error | MVP-0 | States `Starts with an empty world` |
| PH-06 | EmptyHub | First-project state | Default | MVP-0 | Primary `New project` |
| PH-07 | StorageNotice | Explain local storage availability | Info, warning, error | MVP-0 | Never blocks editing if possible |
| PH-08 | ImportEntry | Open/import a world file | Default, drag-over, error | MVP-0 | 1 MiB guardrail |
| PH-09 | ProjectMenu | New, Open, Save, Save As, Import, Export, Close | Default, disabled items with reasons | MVP-0 | Save always authored |

## 4. World Hierarchy

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| WH-01 | HierarchyPanel | Entity list and selection | Default, empty, filtered, locked, loading | MVP-0 | Flat list in MVP-0 |
| WH-02 | HierarchyToolbar | Search, filter, add, overflow | Default, compact, locked | MVP-0 | Add disabled at runtime |
| WH-03 | HierarchySearch | Filter entities by name/type | Default, focus, no results | MVP-0 | Local to panel |
| WH-04 | EntityRow | One world entity | Default, hover, selected, focused, renaming, locked, error badge | MVP-0 | 26 px row |
| WH-05 | EntityTypeIcon | Cube/sphere/plane and future types | Per type, selected, disabled | MVP-0 | Tooltip with type name |
| WH-06 | InlineRenameField | Rename an entity in place | Editing, invalid, committing, locked | MVP-0 | `F2`, Enter/Esc |
| WH-07 | EmptyHierarchy | Zero-entity state | Default | MVP-0 | Add action |
| WH-08 | HierarchyLockChip | Runtime lock indicator | Locked | MVP-1 | Header chip |
| WH-09 | EntityBadge | Component/behavior/error badges | Component, logic, warning, error | MVP-1+ | Count and tooltip |

## 5. 3D World Viewport

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| VP-01 | ViewportPanel | Center work area and canvas host | Default, focused, runtime, error, too small | MVP-0 | Canvas fills container |
| VP-02 | ViewportCanvas | Babylon.js rendering surface | Ready, initializing, context-lost, unsupported | MVP-0 | Resize observer |
| VP-03 | ViewportToolbar | Select/move/rotate/scale, grid, frame, camera | Default, compact, locked | MVP-0 | 36 px overlay |
| VP-04 | GizmoModeGroup | Segmented transform modes | Select, move, rotate, scale, disabled | MVP-0 | Q/W/E/R |
| VP-05 | TransformSpaceIndicator | Read-only space badge | World (move/rotate), Local (scale) | MVP-0 | No toggle |
| VP-06 | GridToggle | Toggle editor grid | On, off, disabled | MVP-0 | Editor-only |
| VP-07 | FrameControl | Frame selection / world | Enabled, disabled (no selection) | MVP-0 | F / Shift+F |
| VP-08 | CameraViewMenu | Reserved for future view modes | Perspective (current) | Post-MVP | Do not list unavailable modes as active |
| VP-09 | AxisHelper | Camera-orientation axis gizmo | Default | MVP-0 | Editor-only |
| VP-10 | NavigationHint | One-line camera help | Visible, dismissed | MVP-0 | Fades after first use |
| VP-11 | EmptyWorldOverlay | Explain empty world and add primitives | Default, dismissed | MVP-0 | Editor chrome |
| VP-12 | RuntimeBadge | Viewport runtime indicator | Running, paused | MVP-1 | Top-right |
| VP-13 | SelectionOutline | Hover and selected outline | Hover, selected, runtime-selected | MVP-0 | Screen-space width |
| VP-14 | WebGLErrorState | WebGL 2 unavailable | Error, retry, diagnostics | MVP-0 | Clear recovery |
| VP-15 | ViewportTooSmall | Canvas below usable size | Default | MVP-0 | Avoids distortion |
| VP-16 | DropIndicator | Valid asset drop target | Valid, invalid, hovering | Post-MVP | Drag-to-add deferred |

## 6. Inspector

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| IN-01 | InspectorPanel | Contextual property surface | Entity, node, script, empty, locked, loading | MVP-0 | One property surface |
| IN-02 | InspectorHeader | Context title and actions | Entity, node, script, empty, locked | MVP-0 | Overflow menu |
| IN-03 | SelectionIdentity | Name, type, ID disclosure | Default, renaming, locked | MVP-0 | ID read-only |
| IN-04 | TransformSection | Position/rotation/scale | Expanded, collapsed, locked, invalid | MVP-0 | Reset per row |
| IN-05 | Vector3Field | X/Y/Z group with axis labels | Default, mixed, disabled, read-only | MVP-0 | Tabular numerals |
| IN-06 | NumericField | Single numeric value | Default, hover, focus, invalid, read-only, disabled | MVP-0 | Commit/revert rules |
| IN-07 | AxisDragHandle | Scrub a value by dragging the axis label | Hover, dragging | MVP-0 | Step aware |
| IN-08 | SpaceBadge | Show World or Local | World, Local | MVP-0 | Read-only; no toggle |
| IN-09 | TransformReset | Reset a row or all | Row, all, disabled | MVP-0 | Tooltip states target |
| IN-10 | GimbalWarning | Euler ambiguity near ±90° pitch | Hidden, warning tooltip | MVP-0 | Quaternion truth |
| IN-11 | ComponentsSection | List of components | Empty, populated, locked | MVP-1 | Add/remove |
| IN-12 | ComponentCard | One component and its fields | Expanded, collapsed, disabled, runtime-control | MVP-1 | Enable toggle |
| IN-13 | AddComponentMenu | Add a component | Closed, open, no results | MVP-1 | Phase-gated list |
| IN-14 | RuntimeSection | Live runtime values | Running, paused, stopped, unavailable | MVP-1 | Read-only, distinct treatment |
| IN-15 | ReadOnlyField | Locked authored or runtime value | Authored-locked, runtime, unavailable | MVP-1 | Lock icon + label |
| IN-16 | EmptyInspector | No selection | Default | MVP-0 | Explains how to select |
| IN-17 | NodePropertiesSection | Node label, parameters, connections | Default, invalid, locked | MVP-2 | Reuses Inspector shell |
| IN-18 | ScriptPropertiesSection | Python file scope and runtime status | Default, unavailable, locked | Phase 07 | No invented API |
| IN-19 | MetadataDisclosure | Advanced metadata, read-only or raw | Collapsed, expanded | Post-MVP | Not MVP-0 UI |

## 7. Asset Library

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| AL-01 | AssetLibraryPanel | Browsable assets | Default, empty, filtered, locked | MVP-0 | Primitives first |
| AL-02 | AssetToolbar | Search, category, view toggle | Default, compact | MVP-0 | Add disabled at runtime |
| AL-03 | AssetCategoryTabs | Primitives, Project, Materials | Active, inactive, planned | MVP-0 (primitives), later | Planned categories labelled |
| AL-04 | AssetCard | One asset with preview and add action | Default, hover, selected, dragging, disabled, planned | MVP-0 | Cube/sphere/plane |
| AL-05 | AssetGrid / AssetList | Layout for asset cards | Grid, list, empty, loading | MVP-0 | View toggle optional |
| AL-06 | EmptyAssets | No project assets | Default | MVP-0 | Primitives remain available |
| AL-07 | PlannedBadge | Mark a future category | Default | MVP-0 | Never looks clickable |
| AL-08 | DragGhost | Preview while dragging an asset | Valid, invalid | Post-MVP | Drag-to-viewport deferred |

## 8. Program Dock — Visual Logic

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| PR-01 | ProgramDock | Hosts Visual Logic and Python | Collapsed, open, focus, locked, error | MVP-2 | Center-bottom |
| PR-02 | ProgramTabs | Visual Logic / Python | Active, inactive, dirty, planned, locked | MVP-2 | Python phase-gated |
| PR-03 | GraphToolbar | Add node, search, fit, zoom, validate | Default, compact, locked | MVP-2 | Selection-aware |
| PR-04 | GraphSelector | Choose a graph in the project | Single, multiple, empty | MVP-2 | Breadcrumb/dropdown |
| PR-05 | NodePalette | Searchable node catalog | Open, filtered, empty, disabled | MVP-2 | Groups by category |
| PR-06 | GraphCanvas | Node graph surface | Empty, populated, panning, zoomed, locked | MVP-2 | Grid + minimap |
| PR-07 | GraphNode | One behavior node | Default, hover, selected, invalid, warning, executing, locked | MVP-2 | Header + ports + inline values |
| PR-08 | NodePort | Typed input/output connection point | Default, hover, compatible, incompatible, connected | MVP-2 | Typed color + label |
| PR-09 | GraphEdge | Connection between ports | Default, hover, selected, invalid, executing | MVP-2 | Curve + arrow |
| PR-10 | Minimap | Graph overview | Visible, hidden, dragging | Phase 06+ | Optional |
| PR-11 | GraphZoomControls | Zoom in/out/fit | Default | MVP-2 | Keyboard accessible |
| PR-12 | ValidationBar | Graph validation summary | Valid, warning, error, collapsed | MVP-2 | Local to graph |
| PR-13 | ValidationItem | One validation message | Error, warning, info | MVP-2 | Reveal node |
| PR-14 | EmptyGraph | No nodes | Default | MVP-2 | Add event node |
| PR-15 | GraphLockOverlay | Read-only runtime treatment | Running, paused | MVP-2 | Does not hide graph |
| PR-16 | ExecutionTraceLegend | Explain live node/edge highlight | Hidden, visible | Post-MVP | Only if tracing exists |

## 9. Program Dock — Python

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| PY-01 | PythonEditor | Code authoring surface | Ready, editing, diagnostics, running, locked, unavailable | Phase 07 | No fake API |
| PY-02 | PythonFileTabs | Open Python files | Active, dirty, locked, overflow | Phase 07 | Preserve cursor |
| PY-03 | CodeGutter | Line numbers and fold markers | Default, active line, error line | Phase 07 | Text alternative for diagnostics |
| PY-04 | DiagnosticsGutter | Error/warning markers | Error, warning, info | Phase 07 | Paired with status list |
| PY-05 | CodeStatusBar | Line/column, indentation, runtime status | Default, error, running | Phase 07 | Tabular numerals |
| PY-06 | APIReferenceDrawer | Approved API reference | Closed, open, search, unavailable | Phase 07 | Generated from API |
| PY-07 | PythonUnavailable | Explain Phase 07 gating | Default | MVP-0–MVP-3 | No editable buffer |
| PY-08 | PythonRuntimeChip | Worker state | Unavailable, ready, running, timeout, error | Phase 07 | Icon + text |

## 10. Simulation Monitor

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| MO-01 | MonitorPanel | Runtime observation | Collapsed, expanded, empty, live, last-run, error | MVP-3 | Right dock |
| MO-02 | MonitorHeader | State, time, FPS summary | Idle, preparing, running, paused, last-run, error | MVP-3 | Live when collapsed |
| MO-03 | RuntimeSummary | Metric tiles | Live, paused, unavailable | MVP-3 | No fabricated values |
| MO-04 | MetricTile | One metric | Normal, warning, unavailable | MVP-3 | Label + value + unit |
| MO-05 | Sparkline | Recent trend | Live, paused, unavailable, empty | MVP-3 | No axes by default |
| MO-06 | WatchedEntity | Selected/pinned entity runtime values | Follow selection, pinned, none | MVP-3 | Read-only |
| MO-07 | WatchPin | Pin the watched entity | Pinned, unpinned, disabled | MVP-3 | Clears on Stop |
| MO-08 | EventList | Runtime warnings/errors | Empty, populated, overflow | MVP-3 | Reveal source |
| MO-09 | EventRow | One event | Info, warning, error, selected | MVP-3 | Timestamp + link |
| MO-10 | EmptyMonitor | No active simulation | Default | MVP-3 | Run action |
| MO-11 | LastRunSummary | Results after Stop | Collapsed, expanded, empty | MVP-3 | Read-only |
| MO-12 | MonitorErrorState | Metrics unavailable or crash | Unavailable, crashed | MVP-3 | Reason + action |

## 11. Console / Output

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| CO-01 | ConsoleDrawer | Full-width output drawer | Collapsed, expanded, focus, dragging | MVP-0 | 32 px collapsed |
| CO-02 | ConsoleHeader | Severity summary and actions | Idle, info, warning, error | MVP-0 | Latest message preview |
| CO-03 | SeverityFilter | All / Info / Warn / Error | Active, inactive, count | MVP-0 | Segmented control |
| CO-04 | SourceFilter | Editor / World / Runtime / Logic / Python | Active, inactive, unavailable | MVP-0+ | Hidden sources omitted |
| CO-05 | ConsoleSearch | Search output | Default, match, no match | MVP-0 | Local to console |
| CO-06 | LogList | Virtualized log rows | Empty, populated, auto-scroll paused | MVP-0 | `role=log` |
| CO-07 | LogRow | One message | Info, warning, error, selected, linked | MVP-0 | 22 px dense row |
| CO-08 | LogDetail | Expanded message and details | Collapsed, expanded, copied | MVP-0 | Stack trace disclosure |
| CO-09 | EmptyConsole | No output | Default | MVP-0 | Clear explanation |
| CO-10 | ErrorBadge | Error/warning count | Error, warning, mixed, zero | MVP-0 | Header and dock rail |
| CO-11 | AutoScrollToggle | Follow new logs | On, off, paused-by-scroll | MVP-0 | `Jump to latest` |
| CO-12 | ClearConsoleAction | Clear logs | Enabled, disabled | MVP-0 | No confirmation |

## 12. Controls and Feedback

| ID | Component | Purpose | Variants / states | Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| FB-01 | Button | Primary/secondary/ghost/danger/link | Default, hover, active, focus, disabled, loading | MVP-0 | One primary per view |
| FB-02 | IconButton | Compact icon action | Default, hover, active, focus, disabled, selected | MVP-0 | Tooltip + label |
| FB-03 | ToggleButton | Persistent on/off action | Off, on, disabled | MVP-0 | `aria-pressed` |
| FB-04 | SegmentedControl | Mutually exclusive compact options | Default, selected, focus, disabled | MVP-0 | Gizmo mode, filters |
| FB-05 | TextInput | Single-line text | Default, hover, focus, invalid, read-only, disabled | MVP-0 | Visible label |
| FB-06 | NumericInput | Numeric value with step | Default, focus, invalid, read-only, disabled | MVP-0 | Commit/revert |
| FB-07 | Select | Choose one option | Closed, open, focus, disabled | MVP-0 | 6 px menu |
| FB-08 | Checkbox | Independent boolean | Unchecked, checked, mixed, focus, disabled | MVP-0 | Label clickable |
| FB-09 | RadioGroup | Exclusive choice | Unselected, selected, focus, disabled | MVP-0 | Arrow-key model |
| FB-10 | ToggleSwitch | Immediate boolean setting | Off, on, focus, disabled | MVP-0 | Not for destructive actions |
| FB-11 | Slider | Runtime parameter or range | Default, dragging, focus, disabled | MVP-1 | Numeric companion |
| FB-12 | SearchInput | Local search | Default, focus, filled, no results | MVP-0 | Esc clears |
| FB-13 | Badge | Count or short status | Neutral, info, success, warning, danger | MVP-0 | Text, not color alone |
| FB-14 | Chip | Source, type, or filter token | Default, selected, removable | MVP-0 | 2 px radius |
| FB-15 | StatePill | Runtime state | Five states | MVP-1 | Icon + label |
| FB-16 | Popover | Anchored secondary content | Closed, open, focus | MVP-0 | Not a modal |
| FB-17 | Menu | Command list | Closed, open, keyboard, disabled item | MVP-0 | Same labels as toolbar |
| FB-18 | Dialog | Focused decision surface | Open, closing, blocking, error | MVP-0 | Focus trap |
| FB-19 | ConfirmDialog | Destructive confirmation | Default, destructive, loading | MVP-0 | Names the object |
| FB-20 | Banner | Persistent page/panel message | Info, warning, error, dismissible | MVP-0 | Recovery action |
| FB-21 | Toast | Transient result | Success, info, warning, error | MVP-0 | Max 3 |
| FB-22 | ProgressBar | Determinate or indeterminate progress | Indeterminate, determinate, complete | MVP-0 | Label required |
| FB-23 | Spinner | Short indeterminate activity | Small, medium | MVP-0 | Reduced-motion safe |
| FB-24 | Skeleton | Content placeholder | Row, card, panel | MVP-0 | Matches final shape |
| FB-25 | EmptyState | Explain an empty surface | Default, with action, compact | MVP-0 | Functional actions only |
| FB-26 | InlineError | Field or panel error | Error, warning | MVP-0 | Cause + recovery |
| FB-27 | Kbd | Shortcut hint | Default | MVP-0 | Monospace |
| FB-28 | LockChip | Runtime lock indicator | Locked, unlocked | MVP-1 | Tooltip explains |
| FB-29 | CountBadge | Count on rail or tab | Zero, one, many, overflow | MVP-0 | 99+ |
| FB-30 | Disclosure | Expand/collapse a section | Collapsed, expanded, disabled | MVP-0 | `aria-expanded` |
| FB-31 | Card | Raised content container | Default, hover, selected, disabled | MVP-0 | 6 px radius |
| FB-32 | Divider | Horizontal/vertical separation | Default, inset | MVP-0 | 1 px |
| FB-33 | ScrollArea | Independently scrolling region | Default, scrollbar hover, overflow | MVP-0 | No page scroll |
| FB-34 | ColorSwatch | Future material color | Default, selected, disabled | Post-MVP | Not in MVP-0 |
| FB-35 | SplitButton | Primary action with options | Closed, open, disabled | Post-MVP | Not required now |
| FB-36 | CommandPalette | Search all commands | Closed, open, no results | Post-MVP | Deferred to avoid shortcut conflict |

## 13. Key Component Anatomy

### 13.1 Panel (SH-12)

```text
┌──────────────────────────────────────────────┐
│ [icon] Title            [status] [⋯] [⌄]     │  32 px header
├──────────────────────────────────────────────┤
│                                              │
│  content, scrolls independently              │
│                                              │
└──────────────────────────────────────────────┘
```

| State | Header | Content | Actions |
| --- | --- | --- | --- |
| Active | Primary title, selection underline on tab | Interactive | Enabled |
| Inactive | Secondary title | Interactive | Enabled |
| Collapsed | Summary visible | Hidden, removed from tab order | Expand |
| Locked | `Locked` chip | Readable, fields disabled | Stop-related only |
| Loading | Title stable | Skeleton/spinner | Cancel if safe |
| Empty | Title stable | Empty state | Relevant action |
| Error | Title + error badge | Error block | Retry/Details |

### 13.2 Entity Row (WH-04)

```text
[type icon]  Ball                         [physics] [logic] [⚠]
             ^ name, 12/18                ^ badges, 11/16
```

| State | Background | Text | Extra |
| --- | --- | --- | --- |
| Default | Transparent | Secondary | — |
| Hover | `--sf-bg-hover` | Primary | Row actions appear |
| Selected | `--sf-bg-selection` | Primary | 2 px left selection bar |
| Focused | Selected + focus ring | Primary | Keyboard only |
| Renaming | Input replaces name | Primary | Commit/cancel |
| Locked | Transparent selected tint | Primary | Lock chip in header, no row actions |
| Error | Transparent | Primary | Error badge with tooltip |

### 13.3 Numeric Field (IN-06)

```text
[ X ] [   1.250 ] [unit]
  ^drag   ^value   ^optional
```

| State | Border | Background | Behavior |
| --- | --- | --- | --- |
| Default | Strong | Input | Click to edit |
| Hover | Stronger | Input | Cursor text |
| Focus | Selection + ring | Input | Select all or place caret |
| Invalid | Danger | Input | Inline message, revert on commit |
| Read-only | Subtle | Panel | No caret, lock icon |
| Disabled | Subtle | Panel | No focus, reason tooltip |

### 13.4 Runtime State Pill (SH-06)

```text
[● Running]   [◌ Preparing]   [⏸ Paused]   [■ Stopped]   [○ Editing]
```

| State | Icon | Text | Background |
| --- | --- | --- | --- |
| Editing | Hollow circle | Editing | Neutral tint |
| Preparing | Spinner | Preparing | Amber tint |
| Running | Filled dot / pulse | Running | Green tint |
| Paused | Pause bars | Paused | Amber tint |
| Stopped | Square | Stopped | Neutral tint |

The pill never relies on color alone. The label is always present except in a documented compact mode that keeps an accessible name.

### 13.5 Runtime Bar (SH-08)

```text
[🔒] Simulation running · 00:12.4 · World editing locked     [Open Monitor]
```

| State | Message | Action |
| --- | --- | --- |
| Preparing | `Preparing simulation…` | `Cancel` |
| Running | `Simulation running · 00:12.4 · World editing locked` | `Open Monitor` |
| Paused | `Simulation paused · 00:12.4 · World editing locked` | `Open Monitor` |

The bar does not show generic editor messages. It is a runtime-specific surface.

### 13.6 Graph Node (PR-07)

```text
┌─────────────────────────────┐
│ ⚡ On Button Pressed    [⚠] │
├─────────────────────────────┤
│ out  pressed ────────►      │
└─────────────────────────────┘
```

| State | Border | Header | Ports |
| --- | --- | --- | --- |
| Default | Strong | Raised | Enabled |
| Hover | Selection muted | Raised | Highlight compatible on drag |
| Selected | Selection 2 px | Raised | Enabled |
| Invalid | Danger | Raised + warning icon | Enabled |
| Executing | Running 2 px | Running tint | Enabled if tracing |
| Locked | Subtle | Panel | Non-interactive |
| Disabled | Subtle | Panel | Dimmed, reason tooltip |

Node properties are edited in the Inspector. The node itself shows only the label, type icon, validation badge, and inline summary.

### 13.7 Log Row (CO-07)

```text
12:04:31.208  ⚠  Runtime   Ball has no Rigid Body.        [Ball]
```

| State | Treatment |
| --- | --- |
| Info | Info icon, secondary text |
| Warning | Warning icon, primary text, warning tint on hover |
| Error | Error icon, primary text, danger tint on hover |
| Selected | Selection tint, detail opens |
| Linked | Source chip is a link with focus ring |
| No source | Source chip omitted |

Timestamps use tabular numerals and a monospace font. The row does not use a colored background by default; severity is carried by icon, label, and detail.

### 13.8 Empty State (FB-25)

```text
        [24 px icon]
        Title (18/26, 600)
        One or two lines of explanation (12/18, secondary)
        [Primary action]  [Secondary action]
```

- Maximum width 360 px.
- Centered in the available panel content, not in the whole app.
- One primary action maximum.
- The action must work in the current phase.
- Empty states do not use illustrations that imply a capability that does not exist.

### 13.9 Asset Card (AL-04)

```text
┌────────────────┐
│                │
│   [preview]    │
│                │
├────────────────┤
│ Cube           │
│ Primitive      │
└────────────────┘
```

| State | Treatment |
| --- | --- |
| Default | Raised card, secondary label |
| Hover | Lighter surface, `Add` action visible |
| Selected | Selection border |
| Dragging | Ghost at 70% opacity; source dimmed |
| Disabled | Dimmed, reason tooltip |
| Planned | `Planned` badge, no add action |

### 13.10 Metric Tile (MO-04)

```text
FPS
60
frame time 16.7 ms
```

| State | Treatment |
| --- | --- |
| Normal | Primary value, tertiary label |
| Warning | Warning icon + label, not color alone |
| Unavailable | `—`, tooltip with reason |
| Paused | Value frozen; `Paused` chip in header |

## 14. Component Phase Summary

| Phase | Components introduced |
| --- | --- |
| MVP-0 | Shell, docks, panels, hierarchy, viewport, inspector transform, assets primitives, console, project hub, save/open, feedback primitives |
| MVP-1 | Runtime state pill, transport, runtime bar, components, runtime Inspector, read-only fields, lock chips, runtime console source |
| MVP-2 | Program dock, Visual Logic toolbar/canvas/nodes/ports/edges, validation, graph lock overlay |
| MVP-3 | Simulation Monitor, metrics, watch, event list, last-run summary, monitor error state |
| Phase 07 | Python editor, file tabs, diagnostics, API reference, runtime chip |
| Post-MVP | Execution trace legend, drag-to-dock, asset drag, minimap refinement, command palette, split button, color swatch, 2D/hybrid viewport controls |

## 15. Components Explicitly Deferred

| Component | Why deferred |
| --- | --- |
| Floating panel windows | Docking complexity, accessibility, and MVP value |
| Multi-select toolbar | Single selection is sufficient through MVP-3 |
| Command palette | Shortcut conflict and discovery can be solved with menus first |
| Light theme toggle | No light theme delivered |
| 2D viewport switcher | 2D is post-MVP and requires POC 6 |
| Asset import pipeline UI | Phase 02+; no asset loader in POC-01 |
| Material editor | Not in MVP scope |
| Collaboration cursors / presence | Out of product scope for early stage |
| Marketplace / extensions browser | Out of MVP scope |
| Touch gesture layer | Desktop-first MVP |

## 16. Component Quality Checklist

A component is design-complete when:

1. Its purpose and boundary are stated.
2. Its default, hover, active, focus, disabled, and error states are defined.
3. Its empty and loading states are defined where it holds content.
4. Its keyboard behavior and focus order are stated.
5. Its accessible name, role, and state are stated.
6. Its runtime lock behavior is stated.
7. Its phase is stated.
8. Its copy follows the design system.
9. It uses semantic tokens.
10. It has at least one acceptance criterion in the relevant specification.
