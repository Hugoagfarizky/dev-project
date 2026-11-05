# SimuForge — Design System Specification

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

## 1. Design System Goals

1. Give the Studio a precise, professional dark interface with a clear hierarchy.
2. Keep the system small enough to implement without a component framework dependency.
3. Make authored, runtime, warning, and selection states unambiguous.
4. Support dense editor work without becoming illegible.
5. Remain extensible to a light theme and to future 2D/hybrid surfaces.
6. Define states, not just colors, so implementation can be tested.

The system is deliberately **not** a clone of any existing editor. The layout borrows proven patterns — docks, tabs, splitters, a graph canvas, a console — but the visual language is SimuForge's own: ink-blue surfaces, a forge-amber primary, a sky-blue selection, and warm/cool axis colors.

## 2. Token Architecture

```text
Primitive tokens        Semantic tokens              Component tokens
(raw values)       →    (role-based aliases)    →    (optional per component)
--sf-ink-800            --sf-bg-panel                --sf-button-primary-bg
--sf-slate-100          --sf-text-primary            --sf-panel-header-height
--sf-forge-500          --sf-accent
```

Rules:

- Components MUST use semantic tokens, not raw hex values.
- A semantic token MUST have one meaning across the Studio.
- Component tokens MAY be added when a component needs a local exception; they MUST reference semantic or primitive tokens.
- Runtime state colors MUST be paired with an icon and a text label. Color alone is not sufficient.
- A future light theme swaps semantic values; it does not rename semantic tokens.

## 3. Color

### 3.1 Primitive palette

| Token | Value | Usage |
| --- | --- | --- |
| `--sf-black-0` | `#070A0F` | Page outside the app frame, scrim edge |
| `--sf-ink-900` | `#0A0E14` | App background |
| `--sf-ink-850` | `#0E131B` | Viewport canvas, code background |
| `--sf-ink-800` | `#121823` | Panel background |
| `--sf-ink-750` | `#151D2A` | Input background, console row alternate |
| `--sf-ink-700` | `#192231` | Raised surface, cards |
| `--sf-ink-600` | `#202B3D` | Hover surface |
| `--sf-ink-500` | `#2A3648` | Active surface, selected row |
| `--sf-line-700` | `#243044` | Subtle divider |
| `--sf-line-600` | `#334158` | Strong border, input border |
| `--sf-line-500` | `#44536B` | Hover border, disabled emphasis |
| `--sf-slate-100` | `#E8EEF7` | Primary text |
| `--sf-slate-300` | `#A7B4C8` | Secondary text |
| `--sf-slate-500` | `#78879E` | Tertiary text, metadata |
| `--sf-slate-600` | `#5C6A80` | Icons on muted surfaces |
| `--sf-slate-700` | `#4F5C70` | Disabled text |
| `--sf-forge-500` | `#F08A4B` | Primary accent |
| `--sf-forge-400` | `#FF9D62` | Accent hover |
| `--sf-forge-600` | `#D97438` | Accent pressed |
| `--sf-forge-ink` | `#1A0F08` | Text on accent |
| `--sf-sky-500` | `#56B4FF` | Selection, focus, info |
| `--sf-green-500` | `#3DDC97` | Running, success |
| `--sf-amber-500` | `#F2C14E` | Warning, preparing, paused |
| `--sf-red-500` | `#FF6B6B` | Error, destructive, X axis |
| `--sf-axis-y` | `#78D96B` | Y axis |
| `--sf-axis-z` | `#5B9DFF` | Z axis |

### 3.2 Semantic tokens

| Token | Value | Meaning |
| --- | --- | --- |
| `--sf-bg-app` | `#0A0E14` | Application shell |
| `--sf-bg-canvas` | `#0E131B` | Viewport and code canvas |
| `--sf-bg-panel` | `#121823` | Panel body |
| `--sf-bg-input` | `#151D2A` | Text/number input |
| `--sf-bg-raised` | `#192231` | Cards, popovers, menus |
| `--sf-bg-hover` | `#202B3D` | Hover surface |
| `--sf-bg-active` | `#2A3648` | Pressed or selected surface |
| `--sf-bg-selection` | `rgba(86, 180, 255, 0.14)` | Selected row tint |
| `--sf-bg-overlay` | `rgba(7, 10, 15, 0.72)` | Modal scrim |
| `--sf-border-subtle` | `#243044` | Panel and row divider |
| `--sf-border-strong` | `#334158` | Input and control border |
| `--sf-border-focus` | `#56B4FF` | Focus ring |
| `--sf-text-primary` | `#E8EEF7` | Main text |
| `--sf-text-secondary` | `#A7B4C8` | Labels, secondary rows |
| `--sf-text-tertiary` | `#78879E` | Metadata, hints |
| `--sf-text-disabled` | `#4F5C70` | Disabled text |
| `--sf-text-inverse` | `#1A0F08` | Text on accent |
| `--sf-text-link` | `#56B4FF` | Links and reveal actions |
| `--sf-accent` | `#F08A4B` | Primary action |
| `--sf-accent-hover` | `#FF9D62` | Primary hover |
| `--sf-accent-pressed` | `#D97438` | Primary pressed |
| `--sf-on-accent` | `#1A0F08` | Text/icon on accent |
| `--sf-selection` | `#56B4FF` | Selection outline, active tab |
| `--sf-selection-muted` | `rgba(86, 180, 255, 0.14)` | Selection background |
| `--sf-success` | `#3DDC97` | Success, running |
| `--sf-warning` | `#F2C14E` | Warning, preparing, paused |
| `--sf-danger` | `#FF6B6B` | Error, destructive |
| `--sf-info` | `#56B4FF` | Informational |
| `--sf-grid-minor` | `rgba(167, 180, 200, 0.09)` | Viewport minor grid |
| `--sf-grid-major` | `rgba(167, 180, 200, 0.18)` | Viewport major grid |
| `--sf-grid-axis-x` | `rgba(255, 107, 107, 0.55)` | X grid axis |
| `--sf-grid-axis-y` | `rgba(120, 217, 107, 0.55)` | Y grid axis |
| `--sf-grid-axis-z` | `rgba(91, 157, 255, 0.55)` | Z grid axis |

### 3.3 Runtime state tokens

| State | Text/icon | Background tint | Label |
| --- | --- | --- | --- |
| Editing | `#A7B4C8` | `rgba(167, 180, 200, 0.10)` | Editing |
| Preparing | `#F2C14E` | `rgba(242, 193, 78, 0.12)` | Preparing |
| Running | `#3DDC97` | `rgba(61, 220, 151, 0.12)` | Running |
| Paused | `#F2C14E` | `rgba(242, 193, 78, 0.12)` | Paused |
| Stopped | `#78879E` | `rgba(120, 135, 158, 0.10)` | Stopped |

Preparing and Paused share amber but MUST differ by icon: spinner for Preparing, pause bars for Paused. Running and success share green but differ by context and icon.

### 3.4 Axis and semantic color rules

- X = red, Y = green, Z = blue. Axis labels `X`, `Y`, `Z` always accompany color in the gizmo and Inspector.
- Selection is sky blue, never forge amber. Amber is reserved for primary action and runtime warning/preparing/paused.
- Error red is never used for a primary action.
- Running green is never used for a success toast and a runtime state at the same time without a label; both carry an icon.
- Color-blind simulation is a review requirement; no state relies on hue alone.

### 3.5 Contrast validation

Measured with the WCAG 2.x relative-luminance formula. Ratios are for normal text unless noted.

| Foreground | Background | Ratio | Result |
| --- | --- | --- | --- |
| `#E8EEF7` primary | `#121823` panel | 15.10:1 | AAA |
| `#A7B4C8` secondary | `#121823` panel | 8.39:1 | AAA |
| `#78879E` tertiary | `#121823` panel | 4.83:1 | AA |
| `#4F5C70` disabled | `#121823` panel | 2.60:1 | Exempt (disabled) |
| `#F08A4B` accent | `#121823` panel | 7.08:1 | AAA |
| `#1A0F08` on accent | `#F08A4B` accent | 7.57:1 | AAA |
| `#56B4FF` selection | `#121823` panel | 7.86:1 | AAA |
| `#3DDC97` running | `#121823` panel | 9.97:1 | AAA |
| `#F2C14E` warning | `#121823` panel | 10.50:1 | AAA |
| `#FF6B6B` danger | `#121823` panel | 6.35:1 | AA |
| `#E8EEF7` primary | `#0E131B` canvas | 16.09:1 | AAA |
| `#A7B4C8` secondary | `#0E131B` canvas | 8.94:1 | AAA |
| `#78879E` tertiary | `#0E131B` canvas | 5.14:1 | AA |
| `#E8EEF7` primary | `#192231` raised | 13.83:1 | AAA |
| `#A7B4C8` secondary | `#192231` raised | 7.69:1 | AAA |
| `#E8EEF7` primary | `#202B3D` hover | 12.70:1 | AAA |

Implementation MUST re-measure if a token changes. 11 px text is not exempt from 4.5:1; tertiary text is allowed at 4.83:1 on panels but SHOULD not be used for critical instructions.

## 4. Typography

### 4.1 Families

| Token | Stack | Usage |
| --- | --- | --- |
| `--sf-font-ui` | `"Inter", "Segoe UI", system-ui, -apple-system, sans-serif` | All UI except code |
| `--sf-font-mono` | `"JetBrains Mono", "Cascadia Code", "Consolas", "SFMono-Regular", monospace` | Console, code, numeric diagnostics |
| `--sf-font-numeric` | `var(--sf-font-ui)` with `font-variant-numeric: tabular-nums` | Inspector numbers, Monitor metrics |

No font file is added by this design. Inter and JetBrains Mono are candidates; the fallback stack must be acceptable without them. License review is part of scaffold preparation.

### 4.2 Scale

| Token | Size / line height | Weight | Usage |
| --- | --- | --- | --- |
| `--sf-text-2xs` | 11 / 16 px | 500 | Uppercase section labels, badges, metadata |
| `--sf-text-xs` | 11 / 16 px | 400 | Dense hints, timestamps |
| `--sf-text-sm` | 12 / 18 px | 400/500 | Default UI, tree rows, buttons, console |
| `--sf-text-md` | 13 / 20 px | 400/500 | Panel titles, inputs, body |
| `--sf-text-lg` | 15 / 22 px | 500/600 | Section titles, dialog body emphasis |
| `--sf-text-xl` | 18 / 26 px | 600 | Dialog titles, empty-state titles |
| `--sf-text-2xl` | 24 / 32 px | 600 | Hub section titles |
| `--sf-text-3xl` | 32 / 40 px | 600 | Project Hub brand |

Rules:

- Default UI text is 12/18. Panel titles may use 13/20.
- Uppercase labels use `letter-spacing: 0.06em` and 11 px; never use uppercase for long text.
- Numeric fields, Monitor values, and console timestamps use tabular numerals.
- Body copy in dialogs SHOULD stay under 72 characters per line.
- Code uses 12/18 with a 4 px indent; the editor controls tab size.
- No text below 11 px in the Studio.
- Font weight 700 is not used in dense UI; 600 is the maximum heading weight.

## 5. Spacing and Sizing

### 5.1 Spacing scale

| Token | Value | Usage |
| --- | --- | --- |
| `--sf-space-0` | 0 | Flush |
| `--sf-space-0-5` | 2 px | Hairline gaps, badge padding |
| `--sf-space-1` | 4 px | Icon-to-label gap in dense rows |
| `--sf-space-1-5` | 6 px | Compact padding |
| `--sf-space-2` | 8 px | Default control gap, panel toolbar padding |
| `--sf-space-3` | 12 px | Panel padding, section gap |
| `--sf-space-4` | 16 px | Dialog padding, group gap |
| `--sf-space-5` | 20 px | Large group gap |
| `--sf-space-6` | 24 px | Section separation |
| `--sf-space-8` | 32 px | Empty-state padding |
| `--sf-space-10` | 40 px | Hub spacing |
| `--sf-space-12` | 48 px | Major layout spacing |
| `--sf-space-16` | 64 px | Hub hero spacing |

Use the scale; do not introduce arbitrary values except for the documented shell dimensions.

### 5.2 Control and row sizes

| Token | Value | Usage |
| --- | --- | --- |
| `--sf-control-xs` | 24 px | Compact icon button, badge row action |
| `--sf-control-sm` | 28 px | Default button, input, select |
| `--sf-control-md` | 32 px | Top-bar primary, dialog primary |
| `--sf-row-hierarchy` | 26 px | Hierarchy row |
| `--sf-row-list` | 28 px | Asset list, event list |
| `--sf-row-console` | 22 px | Console line |
| `--sf-icon-xs` | 12 px | Inline status |
| `--sf-icon-sm` | 14 px | Field icons |
| `--sf-icon-md` | 16 px | Default toolbar and row icon |
| `--sf-icon-lg` | 20 px | Panel title, top bar |
| `--sf-icon-xl` | 24 px | Empty state |
| `--sf-hit-min` | 24 px | Minimum pointer target |
| `--sf-hit-comfortable` | 28 px | Recommended pointer target |

## 6. Border and Radius

| Token | Value | Usage |
| --- | --- | --- |
| `--sf-border-width` | 1 px | Default border and divider |
| `--sf-border-width-strong` | 2 px | Focus ring, active tab underline |
| `--sf-radius-none` | 0 | Panels, dock edges |
| `--sf-radius-xs` | 2 px | Badges, tiny chips |
| `--sf-radius-sm` | 4 px | Buttons, inputs, rows, tabs |
| `--sf-radius-md` | 6 px | Cards, menus, popovers |
| `--sf-radius-lg` | 8 px | Dialogs, large cards |
| `--sf-radius-pill` | 999 px | State pills, badges |

Panels are square by design; this keeps dense docks visually stable. Floating surfaces use 6–8 px radius. Focus rings are 2 px with a 1 px offset.

## 7. Elevation

| Token | Value | Usage |
| --- | --- | --- |
| `--sf-elevation-0` | `none` | Panels, viewport, docked surfaces |
| `--sf-elevation-1` | `0 1px 2px rgba(0,0,0,0.24)` | Sticky header over content |
| `--sf-elevation-2` | `0 8px 24px rgba(0,0,0,0.42)` | Menus, popovers, dropdowns |
| `--sf-elevation-3` | `0 16px 48px rgba(0,0,0,0.55)` | Dialogs |
| `--sf-elevation-4` | `0 8px 24px rgba(0,0,0,0.45)` | Toasts |
| `--sf-scrim` | `rgba(7,10,15,0.72)` | Modal scrim |

Elevation is communicated by a combination of border, surface fill, and shadow. Heavy blur and glow are not used.

## 8. Iconography

- Grid: 16×16 px default; 20×20 in the top bar and panel headers; 24×24 in empty states.
- Stroke: 1.5 px at 16 px; 1.75 px at 20 px; rounded line caps and joins.
- Style: geometric line icons with a consistent corner radius. Filled icons are reserved for state dots and the play triangle.
- Color: inherits `currentColor`; disabled uses `--sf-text-disabled`.
- Icons never stand alone without an accessible label unless the meaning is universally unambiguous (play, pause, stop, close, chevrons).
- Icon-only buttons have a tooltip and `aria-label`.
- The icon family is a scaffold decision. A permissively licensed set such as Lucide is a candidate, but no dependency is added by this design.

Required glyph inventory:

| Group | Glyphs |
| --- | --- |
| Transport | play, pause, stop, reset, spinner/cancel |
| Modes | select/cursor, move, rotate, scale, grid, frame |
| Objects | cube, sphere, plane, component, asset, material |
| Panels | hierarchy, assets, inspector, logic, python, monitor, console |
| Actions | add, remove, duplicate, delete, rename, search, filter, save, open, export, import, settings, help |
| State | lock, unlock, warning, error, success, info, pin, eye, chevron, close, more |
| Layout | collapse, expand, maximize, restore, dock, split |
| Runtime | clock, gauge, activity, link, reveal, external |

## 9. Button Hierarchy

### 9.1 Variants

| Variant | Appearance | Usage | Limit |
| --- | --- | --- | --- |
| Primary | Accent fill, dark text, 28–32 px | One main action per surface: Run, Create project, Save in a dialog | One per view |
| Secondary | Raised surface, 1 px border, primary text | Add, Open, Done, Apply | Common |
| Ghost | Transparent, secondary text, hover surface | Toolbar toggles, panel actions, cancel | Common |
| Toggle | Ghost; active uses selection tint + accent icon | Gizmo mode, grid, filters, play/pause state | Grouped |
| Danger | Danger text and border; filled danger only in the final confirm | Delete, discard | Confirmation required |
| Icon-only | 24–28 px square | Transport, panel actions, close | Tooltip + label |
| Link | Text link with underline on hover | Reveal, learn more, documentation | Inline |

### 9.2 Sizes

| Size | Height | Padding | Text | Usage |
| --- | --- | --- | --- | --- |
| XS | 24 px | 6 px horizontal | 11/16 | Dense row actions |
| SM | 28 px | 8 px horizontal | 12/18 | Default |
| MD | 32 px | 12 px horizontal | 13/20 | Primary, dialogs |

### 9.3 States

| State | Treatment |
| --- | --- |
| Default | As variant |
| Hover | Surface +1 step; accent hover for primary; no layout shift |
| Active/pressed | Surface +2 steps; translate 0 1 px; 120 ms |
| Focus-visible | 2 px `--sf-selection` ring, 1 px offset |
| Selected/toggled | Selection tint, selection icon, `aria-pressed` |
| Disabled | 40% opacity, not-allowed cursor, tooltip states the reason |
| Loading | Spinner replaces leading icon; label stays; button is disabled |
| Danger confirm | Filled danger, white text, explicit object name |

### 9.4 Button copy

- Use verbs: `Run`, `Stop`, `Save`, `Add cube`, `Open project`, `Delete cube`.
- Do not use `OK` for destructive actions; use `Delete cube`.
- Do not use `Yes`/`No`; use the action and `Cancel`.
- Primary labels stay under three words where possible.

## 10. Inputs and Controls

### 10.1 Text input

| State | Border | Background | Text |
| --- | --- | --- | --- |
| Default | `--sf-border-strong` | `--sf-bg-input` | Primary |
| Hover | `--sf-line-500` | `--sf-bg-input` | Primary |
| Focus | `--sf-selection`, 1 px + 2 px ring | `--sf-bg-input` | Primary |
| Filled | `--sf-border-strong` | `--sf-bg-input` | Primary |
| Invalid | `--sf-danger` | `--sf-bg-input` | Primary + inline error |
| Read-only | `--sf-border-subtle` | `--sf-bg-panel` | Secondary + lock icon |
| Disabled | `--sf-border-subtle` | `--sf-bg-panel` | Disabled |

Height 28 px, padding 8 px, radius 4 px. Placeholder uses tertiary; it is not a label. Every input has a visible label or an accessible name. Error text appears below the field, not only as a border.

### 10.2 Numeric field

- Height 26–28 px; tabular numerals; right-aligned or decimal-aligned.
- The axis label (`X`, `Y`, `Z`) is a drag handle: horizontal drag scrubs the value.
- `Enter` or blur commits; `Esc` reverts; arrow keys increment by the step.
- Step: 0.1 for position/scale; 1 for rotation degrees.
- Invalid values show an inline message and revert; the field never silently clamps.
- A read-only runtime field uses a `Runtime` badge and no edit affordance.

### 10.3 Select, checkbox, radio, toggle

| Control | Usage | Selected state |
| --- | --- | --- |
| Select | Camera view, source filter, graph selector | Menu with 6 px radius, checkmark on current |
| Checkbox | Multi-option settings, filters | Accent check on selection |
| Radio | Mutually exclusive options | Accent dot |
| Toggle | Binary settings with immediate effect | Accent track, dark knob, clear label |
| Segmented control | Gizmo mode, severity filter, view mode | Selection tint + 2 px underline or raised segment |

Toggles must not be used for destructive or structural changes that need confirmation.

### 10.4 Slider

Used only for runtime parameters explicitly marked as runtime controls, and later for numeric ranges. Track 4 px, thumb 12 px, focus ring 2 px, current value shown as a numeric field beside it. A slider must not be the only way to set a precise value.

### 10.5 Search

- Height 28 px; leading search icon; optional `Esc` to clear; result count.
- Search is local to the panel unless labelled `Project search`.
- Empty result state names the query and offers `Clear search`.
- Search input does not trigger global keyboard shortcuts.

### 10.6 Code editor

- Background `--sf-bg-canvas`; gutter `--sf-bg-panel`.
- Font 12/18 mono; line height 18 px; 4 px indent guide.
- Selection tint uses `--sf-selection-muted`; active line uses a subtle `--sf-bg-hover`.
- Error squiggle uses danger; warning squiggle uses warning; info uses info.
- Minimap is optional; it must be hideable and must not be the only navigation.
- The editor must expose line/column and diagnostics in text, not color alone.

## 11. Panel States

| State | Visual | Behavior |
| --- | --- | --- |
| Active | Header title primary; active tab underline 2 px selection; focus ring when keyboard-focused | Receives panel-local shortcuts |
| Inactive | Header title secondary | Still visible and readable |
| Hover | Header background `--sf-bg-hover` | No selection change |
| Collapsed | 32 px header with summary | Content removed from tab order; expand control |
| Rail-collapsed | 44 px dock rail with icon and vertical label | Click expands and focuses |
| Maximized / focus | Occupies center; other docks rail-collapsed; focus bar visible | `Esc` restores |
| Locked (runtime) | `Locked` chip with lock icon; controls disabled; content readable | Tooltip explains how to unlock (Stop) |
| Loading | Skeleton or spinner in content area; header stays stable | No layout shift |
| Empty | Icon, title, short body, primary/secondary action | Action is relevant, not generic |
| Error | Inline error block with title, cause, recovery action, details disclosure | Does not replace the entire panel unless unusable |
| Disabled | Content dimmed, reason tooltip | Prefer hiding over permanent disabled state |

Panel headers use a 32 px height, 12 px horizontal padding, 1 px bottom border. The title is 13/20 at 500 weight. Actions sit on the right, 24 px icon buttons.

## 12. Data Display

### 12.1 Badges and chips

| Type | Usage | Example |
| --- | --- | --- |
| State pill | Runtime state | `● Running` |
| Type badge | Entity or asset type | `Cube`, `Sphere`, `Graph` |
| Source chip | Console source | `Runtime`, `Logic`, `Python` |
| Status chip | Read-only state | `Locked`, `Planned`, `Last run` |
| Count badge | Errors, warnings, unsaved | `3` |
| Axis chip | Transform space | `World`, `Local` |

Badges use 11/16, 2 px vertical padding, 6 px horizontal padding, 2 px radius, and an icon or text label. A colored dot alone is not a badge.

### 12.2 Tooltip

- Delay 400 ms; hide on pointer down or `Esc`.
- Max width 280 px; 12/18; 8 px padding; raised surface; elevation 2.
- Contains a short label or one sentence. Long explanations belong in a popover or help panel.
- Tooltips never contain interactive controls.

### 12.3 Tables and lists

- Row height 26–28 px; 1 px divider; hover surface; selected tint.
- Numeric columns right-aligned and tabular.
- Sort indicator is a chevron, not color alone.
- Empty state spans the table body.
- Virtualize lists over 200 rows; the Console and Hierarchy are the first candidates.

### 12.4 Metrics and sparklines

- Metric value uses 18/26 semibold tabular; label 11/16 tertiary.
- Units are a separate, smaller suffix, not part of the number string.
- Sparkline uses a 1.5 px line, no fill or a 10% fill; no axes unless space allows.
- Missing data shows `—` with a tooltip, never `0`.
- Color thresholds require a documented rule; do not color a metric red just because it is low.

## 13. Feedback States

### 13.1 Empty states

| Context | Title | Body | Primary | Secondary |
| --- | --- | --- | --- | --- |
| Empty world (viewport) | Empty world | Add a primitive to start building. The grid and camera are editor helpers, not world objects. | Cube / Sphere / Plane | Open Asset Library |
| Empty Hierarchy | No objects yet | Add a primitive to begin. Nothing is created automatically. | Add object | — |
| No selection | Nothing selected | Select an object in the viewport or World Hierarchy to inspect its properties. | — | — |
| No assets | No project assets yet | Imported models and materials will appear here. Primitives are always available. | Browse primitives | — |
| No logs | No output yet | Editor and runtime messages will appear here. | — | — |
| No simulation | No active simulation | Run the project to observe runtime state, performance, and events. | Run simulation | — |
| No search results | No matches for “{query}” | Try a different term or clear the filter. | Clear search | — |
| Empty graph | No logic yet | Add an event node to start, or create the demo graph. | Add event node | Create demo graph |
| Python unavailable | Python is planned for a later phase | The Python runtime is not part of the current increment. | Learn more | — |

Empty-state actions must be functional in the current phase. If an action is not available, omit it.

### 13.2 Loading states

| Context | Treatment |
| --- | --- |
| Project open | Hub card progress line + `Opening project…`; no Studio flash |
| Engine start | Viewport scrim + spinner + `Starting 3D engine…`; max 8 s before an error state |
| Import/export | Progress with bytes or steps; cancel only if safe |
| Preparing simulation | Runtime bar spinner + `Preparing simulation…`; Cancel allowed |
| Save | Button spinner; do not block the whole app |
| Panel content | Skeleton rows that match final layout; no spinner-only blank panel |

### 13.3 Error states

Every error block contains:

1. **What happened** — a plain-language title.
2. **Why** — the cause if known.
3. **What to do** — one primary recovery action.
4. **Details** — collapsible technical detail (code, schema version, stack).

Examples:

- `3D viewport unavailable` — `SimuForge needs WebGL 2 and hardware acceleration.` — `Retry` / `Open diagnostics`.
- `Project could not be saved` — `Your changes are still open in this tab.` — `Retry` / `Export copy`.
- `This file is too large` — `The file is 1.4 MiB. The current import limit is 1 MiB.` — `Choose another file`.
- `Simulation stopped unexpectedly` — `The runtime reported an error.` — `Open Console` / `Restart`.

### 13.4 Success states

| Event | Feedback |
| --- | --- |
| Project saved | Toast `Project saved` + top-bar `Saved` |
| World exported | Toast `World exported` |
| World imported | Toast `World imported` + updated entity count |
| Layout reset | Toast `Layout reset to Build` |
| Object added | Status bar last action; no toast for routine adds |
| Simulation started | Console line + runtime bar; no toast |
| Simulation stopped | Toast `Simulation stopped. Runtime state was discarded.` |

Success never uses confetti, sound, or a modal.

## 14. Motion

| Token | Value | Usage |
| --- | --- | --- |
| `--sf-duration-instant` | 0 ms | Panel resize, drag, numeric scrub |
| `--sf-duration-fast` | 120 ms | Hover, focus, button press |
| `--sf-duration-base` | 180 ms | Panel expand/collapse, tab switch |
| `--sf-duration-slow` | 240 ms | Dialog enter/exit, toast |
| `--sf-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and move |
| `--sf-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |
| `--sf-pulse` | 1600 ms ease-in-out infinite | Running state dot only |

Rules:

- No animation on data-driven viewport transforms; they must track the pointer.
- No animation on panel splitter drag.
- No layout animation that moves the viewport canvas during a drag.
- `prefers-reduced-motion: reduce` disables pulses, transitions, and skeleton shimmer; state changes remain instant and visible.
- Loading spinners remain because they communicate progress; they do not spin excessively.

## 15. Accessibility

- Target WCAG 2.2 AA for text and controls.
- Every interactive element is reachable by keyboard and has a visible focus ring.
- Icon-only controls have an accessible name and a tooltip.
- Tabs, trees, dialogs, menus, and splitters use the expected ARIA roles and keyboard model.
- Runtime state changes are announced politely; runtime errors assertively once, without repeating on every render.
- The Console uses `role="log"` and `aria-live="polite"`; a new error also updates a badge.
- Color is never the only indicator of axis, selection, severity, or runtime state.
- The viewport canvas has an accessible name and a text alternative path: the Hierarchy lists all objects, and the Inspector exposes properties.
- Animation respects reduced motion.
- Minimum pointer target is 24×24 px; 28×28 is preferred.
- Focus is trapped in modal dialogs and restored to the invoking control on close.
- Text can be zoomed to 200% without loss of content or horizontal page scroll; the layout may enter the Limited state.

## 16. Theming

- MVP ships dark theme only.
- Semantic tokens are theme-agnostic; a light theme would swap values, not component CSS.
- Runtime, axis, and semantic colors must be re-contrasted for a light theme; they are not assumed to work unchanged.
- No theme toggle is shown until a light theme is actually delivered.

## 17. Appendix — CSS Custom Properties

The following block is a design reference for the scaffold. It is not linked to an application build.

```css
:root {
  /* Surfaces */
  --sf-bg-app: #0A0E14;
  --sf-bg-canvas: #0E131B;
  --sf-bg-panel: #121823;
  --sf-bg-input: #151D2A;
  --sf-bg-raised: #192231;
  --sf-bg-hover: #202B3D;
  --sf-bg-active: #2A3648;
  --sf-bg-selection: rgba(86, 180, 255, 0.14);
  --sf-bg-overlay: rgba(7, 10, 15, 0.72);

  /* Borders */
  --sf-border-subtle: #243044;
  --sf-border-strong: #334158;
  --sf-border-focus: #56B4FF;

  /* Text */
  --sf-text-primary: #E8EEF7;
  --sf-text-secondary: #A7B4C8;
  --sf-text-tertiary: #78879E;
  --sf-text-disabled: #4F5C70;
  --sf-text-inverse: #1A0F08;
  --sf-text-link: #56B4FF;

  /* Brand and semantic */
  --sf-accent: #F08A4B;
  --sf-accent-hover: #FF9D62;
  --sf-accent-pressed: #D97438;
  --sf-on-accent: #1A0F08;
  --sf-selection: #56B4FF;
  --sf-selection-muted: rgba(86, 180, 255, 0.14);
  --sf-success: #3DDC97;
  --sf-warning: #F2C14E;
  --sf-danger: #FF6B6B;
  --sf-info: #56B4FF;

  /* Runtime */
  --sf-runtime-editing: #A7B4C8;
  --sf-runtime-preparing: #F2C14E;
  --sf-runtime-running: #3DDC97;
  --sf-runtime-paused: #F2C14E;
  --sf-runtime-stopped: #78879E;

  /* Axes and grid */
  --sf-axis-x: #FF6B6B;
  --sf-axis-y: #78D96B;
  --sf-axis-z: #5B9DFF;
  --sf-grid-minor: rgba(167, 180, 200, 0.09);
  --sf-grid-major: rgba(167, 180, 200, 0.18);
  --sf-grid-axis-x: rgba(255, 107, 107, 0.55);
  --sf-grid-axis-y: rgba(120, 217, 107, 0.55);
  --sf-grid-axis-z: rgba(91, 157, 255, 0.55);

  /* Typography */
  --sf-font-ui: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  --sf-font-mono: "JetBrains Mono", "Cascadia Code", "Consolas", "SFMono-Regular", monospace;
  --sf-text-2xs: 11px;
  --sf-text-xs: 11px;
  --sf-text-sm: 12px;
  --sf-text-md: 13px;
  --sf-text-lg: 15px;
  --sf-text-xl: 18px;
  --sf-text-2xl: 24px;
  --sf-text-3xl: 32px;

  /* Spacing */
  --sf-space-0: 0;
  --sf-space-0-5: 2px;
  --sf-space-1: 4px;
  --sf-space-1-5: 6px;
  --sf-space-2: 8px;
  --sf-space-3: 12px;
  --sf-space-4: 16px;
  --sf-space-5: 20px;
  --sf-space-6: 24px;
  --sf-space-8: 32px;
  --sf-space-10: 40px;
  --sf-space-12: 48px;
  --sf-space-16: 64px;

  /* Sizing */
  --sf-control-xs: 24px;
  --sf-control-sm: 28px;
  --sf-control-md: 32px;
  --sf-row-hierarchy: 26px;
  --sf-row-list: 28px;
  --sf-row-console: 22px;
  --sf-icon-xs: 12px;
  --sf-icon-sm: 14px;
  --sf-icon-md: 16px;
  --sf-icon-lg: 20px;
  --sf-icon-xl: 24px;
  --sf-hit-min: 24px;

  /* Radius */
  --sf-radius-none: 0;
  --sf-radius-xs: 2px;
  --sf-radius-sm: 4px;
  --sf-radius-md: 6px;
  --sf-radius-lg: 8px;
  --sf-radius-pill: 999px;

  /* Elevation */
  --sf-elevation-0: none;
  --sf-elevation-1: 0 1px 2px rgba(0, 0, 0, 0.24);
  --sf-elevation-2: 0 8px 24px rgba(0, 0, 0, 0.42);
  --sf-elevation-3: 0 16px 48px rgba(0, 0, 0, 0.55);
  --sf-elevation-4: 0 8px 24px rgba(0, 0, 0, 0.45);

  /* Motion */
  --sf-duration-instant: 0ms;
  --sf-duration-fast: 120ms;
  --sf-duration-base: 180ms;
  --sf-duration-slow: 240ms;
  --sf-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --sf-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --sf-pulse-duration: 1600ms;
}
```

## 18. Design System Acceptance Criteria

| ID | Criterion |
| --- | --- |
| DS-01 | A component uses semantic tokens; no raw hex values appear in component CSS |
| DS-02 | Primary, secondary, ghost, toggle, danger, icon-only, and link buttons have all specified states |
| DS-03 | Text/background pairs used for body copy meet 4.5:1; large text meets 3:1 |
| DS-04 | Every input has a visible label or accessible name, plus error, read-only, and disabled states |
| DS-05 | Runtime state is communicated by icon, text, and color, in that order of redundancy |
| DS-06 | Every panel has active, collapsed, locked, empty, loading, and error treatments |
| DS-07 | Empty, loading, error, and success copy follows the patterns in §13 |
| DS-08 | Focus rings are visible on all interactive controls in dark theme |
| DS-09 | Reduced-motion mode removes non-essential motion without hiding state changes |
| DS-10 | A light theme can be introduced by swapping semantic tokens, without rewriting components |
