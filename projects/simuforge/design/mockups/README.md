# SimuForge — Main Studio Mockups

Static, dependency-free review artifacts for the Main Simulation Studio. Nothing in this directory is application code. The pages do not load a framework, a font, a script, or a network asset; they are HTML and CSS only.

## 1. Open the Mockups

1. Open `index.html` in Chrome. The reference viewport is **1440 × 900**.
2. Open a workspace page from the gallery, or open it directly:
   - `build-populated.html`
   - `build-empty.html`
   - `program-logic.html`
   - `program-python.html`
   - `simulate-running.html`
   - `design-system.html`
3. Set the browser zoom to 100%. The stage is a fixed 1440 × 900 canvas so proportions can be compared across pages.

The pages are intentionally not responsive below the 1024 × 640 Studio minimum. A narrow browser window will crop the stage rather than reflow it; that is a review constraint, not a product behavior.

## 2. Inventory

| Page | Posture | What it demonstrates | Phase reference |
| --- | --- | --- | --- |
| `build-populated.html` | Build, Editing | Default layout: Hierarchy and Assets, viewport, Inspector, collapsed Program and Monitor, collapsed Console. Selection and world-space gizmo. | MVP-1 / MVP-2 |
| `build-empty.html` | Build, Editing | Empty World: no entities, editor overlay, Add primitive actions, empty Hierarchy and Inspector. | MVP-0 |
| `program-logic.html` | Program, Editing | Program dock open on Visual Logic: palette, node graph, validation bar, Inspector summary. Python tab is gated. | MVP-2 |
| `program-python.html` | Program, Editing | Python tab as a Phase 07 preview: file tabs, code, API drawer, explicit “runtime not connected” state. | Phase 07 |
| `simulate-running.html` | Simulate, Running | Runtime bar, editing lock, authored-vs-runtime values, expanded Monitor, expanded Console, collapsed Program. | MVP-3 |
| `design-system.html` | Reference | Tokens for color, type, spacing, radius, elevation, icons, buttons, inputs, panels, and feedback states. | All |

`index.html` is the gallery. `tokens.css` is the token source used by every page. `mockup.css` contains only review-artifact styling.

## 3. What the Mockups Are For

Use them to review:

- **Proportion and hierarchy** — whether the viewport remains the dominant surface in each posture.
- **Progressive disclosure** — whether collapsed Program, Monitor, and Console headers preserve awareness without forcing panels open.
- **State legibility** — whether Editing, Running, locked editing, authored values, and runtime values are distinguishable at a glance.
- **Capability gating** — whether future surfaces are labelled `Planned` rather than faked.
- **Consistency** — whether the same component looks and behaves the same across Build, Program, and Simulate.

Do not use them to review:

- pixel-perfect production styling,
- real 3D rendering, physics, or graph execution,
- responsive layout below 1024 × 640,
- accessibility conformance by automation,
- final copy, icon library, or font licensing.

## 4. Fidelity Rules

- The stage is a **static wireframe with production-intent tokens**, not a high-fidelity visual comp.
- The viewport scene is an SVG illustration. It communicates selection, authored position, runtime position, and the transform gizmo; it is not a renderer.
- The node graph is positioned HTML with an SVG edge overlay. It demonstrates hierarchy and selection, not graph layout behavior.
- The Python code is illustrative. API names and signatures are not a contract until the Phase 07 decision.
- Disabled controls are visually disabled and are not wired. `Planned` chips mark capability that does not exist yet.
- Hover and focus are shown as static states on the design-system page; they are not interactive in the workspace pages.

## 5. Source of Truth

| Question | Read |
| --- | --- |
| Why the Studio is structured this way | [`../MAIN_STUDIO_UX_SPECIFICATION.md`](../MAIN_STUDIO_UX_SPECIFICATION.md) |
| Exact geometry, presets, docking, collapse | [`../WORKSPACE_LAYOUT_SPECIFICATION.md`](../WORKSPACE_LAYOUT_SPECIFICATION.md) |
| End-to-end flows and acceptance criteria | [`../MAIN_USER_FLOWS.md`](../MAIN_USER_FLOWS.md) |
| Tokens and component states | [`../DESIGN_SYSTEM_SPECIFICATION.md`](../DESIGN_SYSTEM_SPECIFICATION.md) |
| Pointer, keyboard, runtime, focus rules | [`../INTERACTION_SPECIFICATION.md`](../INTERACTION_SPECIFICATION.md) |
| Component IDs and phase gating | [`../UI_COMPONENT_INVENTORY.md`](../UI_COMPONENT_INVENTORY.md) |
| Readiness verdict and scaffold gate | [`../DESIGN_READINESS_ASSESSMENT.md`](../DESIGN_READINESS_ASSESSMENT.md) |

If a mockup and a specification disagree, the specification wins. Record the disagreement in the readiness assessment; do not silently adjust the mockup.

## 6. Review Checklist

- [ ] Each page opens in Chrome with no console errors and no network requests.
- [ ] The stage is 1440 × 900 and the shell regions match the documented proportions.
- [ ] Build shows the viewport as the dominant surface; Program and Monitor are collapsed.
- [ ] Empty World has zero entities and the overlay is clearly an editor affordance.
- [ ] Program has one dock with two tabs; Python is visibly gated in the Visual Logic page.
- [ ] Simulate shows the runtime bar, a visible editing lock, and a clear authored-vs-runtime distinction.
- [ ] The Console is reachable in every posture and does not steal focus.
- [ ] No control implies a capability that is not designed or phase-gated.
- [ ] Text remains legible at 100% zoom; status and metadata do not compete with primary content.
- [ ] The token page matches `tokens.css` and the design system specification.

## 7. Maintenance

When a design token changes, update `tokens.css` first, then the token page, then any page that depends on the changed value. When a layout rule changes, update the Workspace Layout Specification before the mockup. When a page is added, add it to `index.html` and to the inventory table above.

No build command is required. There is no package manifest, no lockfile, and no dependency to install.
