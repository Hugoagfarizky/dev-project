# I-05 Remaining Limitations and Deferred Scope

**Blocking defects found during I-05:** None
**I-05 decision:** Complete

The items below are either explicitly deferred to later increments or are
observations from verification that do not affect the I-05 acceptance criteria.

## 1. Deferred to later increments

| Area | Deferred work | Owner |
| --- | --- | --- |
| Transform editing | Inspector numeric fields, commit/revert/invalid handling | I-06 |
| Gizmo editing | Preview/commit policy, world/local behavior, echo suppression | I-06 |
| Full keyboard floor | W/E/R, F, Shift+F, G, shortcut conflict audit (ACG-03) | I-06 |
| Persistence | Save, Open, New Project, Project Hub, dirty-state wiring | I-07 |
| Console and status bar | Real selection/entity counts, log sources, planned surfaces | I-08 |
| Accessibility and performance | Focus audit, keyboard audit, performance report | I-09 |
| Undo / multi-select | Out of MVP-0 scope | - |
| Layout extras | Dock dragging, floating panels | - |
| Assets | Drag/import, material editor, Hierarchy search/filter, top-bar Add | - |
| Runtime surfaces | Components, Behavior, Runtime, Simulation | - |

ACG-01 remains DEFERRED as recorded by the I-05 readiness audit. I-02 layout
tests and the 1024x640 screenshot cover the I-05 layout requirement only.

## 2. Observations

### LIM-I05-01 - Camera orbit gesture availability

Babylon 9.32.1's default camera input map binds pointer rotation to left drag.
The I-04 renderer intentionally restricts pointer buttons to `[1, 2]` so a plain
left drag is reserved for selection/gizmo interaction; the default map also has
no middle-button rotate entry. During harness development, right drag was
observed to pan and no synthetic gesture changed camera `alpha`/`beta`.

This is a pre-existing I-04 camera-input configuration. I-05 did not change
camera navigation, and the I-05 overlay check verifies pointer pass-through using
the working right-drag pan rather than orbit. If the documented "Alt+left or
middle drag" orbit is required, I-06 should add an explicit input-map entry and
verify it; this is recorded here so it is not lost.

### LIM-I05-02 - Static status bar

The status bar still displays `Selection: None`, `Entities: 0`,
`Tool: Translate`, `WebGL 2`, and `Save: Not saved`. Wiring these values is I-08
work. I-05 uses the Inspector, Hierarchy, and viewport diagnostics as the
authoritative surfaces.

### LIM-I05-03 - Opaque grid fill

The grid fill is opaque by design. When the camera is directly below the world,
the fill occludes primitives lying on the ground plane. The Plane's double-sided
render and picking were verified with the grid temporarily hidden in the Phase-1
probe, and the visible top-side behavior is shown in the screenshots. This is
visual occlusion, not a material or picking defect.

### LIM-I05-04 - Diagnostics count entity meshes only

`getDiagnostics().meshCount` counts entity meshes. The Babylon scene also
contains the editor-only `grid` and `grid-lines` meshes, so the raw scene mesh
count is higher by two. Acceptance checks compare the diagnostic count with the
entity count, which is the intended contract.

### LIM-I05-05 - Development-only favicon 404

The only error-level console entry is the Vite favicon 404
(`Failed to load resource: 404`). It is pre-existing, unrelated to I-05, and does
not indicate an application exception. No uncaught exceptions occurred.

### LIM-I05-06 - Build chunk warning

`npm run build` succeeds but reports that the main chunk is larger than 500 kB
after minification. This is the existing Babylon.js/React bundle size warning and
is not a build failure. Code splitting is I-09 performance work.
