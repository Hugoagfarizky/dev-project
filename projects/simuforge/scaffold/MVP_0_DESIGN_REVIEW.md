# SimuForge - MVP-0 Design Review

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.1 - Review baseline with owner outcome |
| Date | 2026-11-06 |
| Status | Review complete; owner decisions recorded; implementation not authorized |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| POC baseline | POC-01 CLOSED (GO), `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Scope | Design review for the MVP-0 scaffold; no implementation |
| Language | English |

## 1. Purpose

This review checks whether the Main Simulation Studio design is coherent enough to drive an **MVP-0 scaffold**. It does not re-validate the design artifacts that were already checked and committed. It looks for decisions or ambiguities that would force the scaffold team to invent product behavior.

The review covers:

- Build, Program, and Simulate layout consistency.
- The unified Studio model and panel responsibilities.
- Visual hierarchy and legibility.
- Panel and viewport sizing at 1024 x 640 and 1440 x 900.
- Empty World, World Hierarchy, Inspector, Program dock, Monitor, and Console.
- Runtime-state and authored-versus-runtime behavior.
- POC-01 transform and camera policy.
- Phase gating for MVP-0.

## 2. Method and Evidence

### 2.1 Documents reviewed

- [Product Specification](../docs/PRODUCT_SPECIFICATION.md), especially §7.2 MVP-0 and §12 phase mapping.
- [ADR 0001](../../../docs/decisions/0001-proposed-architecture-direction.md), status `proposed`.
- [Architecture outline](../../../docs/architecture/ARCHITECTURE.md), status provisional.
- [POC-01 World Editor](../docs/POC_01_WORLD_EDITOR.md), especially §5-§11.
- [POC-01 Implementation Readiness](../docs/POC_01_IMPLEMENTATION_READINESS.md).
- [POC-01 Final Closure Record](../reports/poc-01/results/POC_01_FINAL_CLOSURE_RECORD.md).
- [SP-08 Final Spike Decision Report](../reports/poc-01/results/SP-08_FINAL_SPIKE_DECISION_REPORT.md).
- [Design Readiness Assessment](../design/DESIGN_READINESS_ASSESSMENT.md).
- [Main Studio UX Specification](../design/MAIN_STUDIO_UX_SPECIFICATION.md).
- [Workspace Layout Specification](../design/WORKSPACE_LAYOUT_SPECIFICATION.md).
- [Main User Flows](../design/MAIN_USER_FLOWS.md).
- [Design System Specification](../design/DESIGN_SYSTEM_SPECIFICATION.md).
- [Interaction Specification](../design/INTERACTION_SPECIFICATION.md).
- [UI Component Inventory](../design/UI_COMPONENT_INVENTORY.md).

### 2.2 Mockups reviewed

All mockups were opened in Chrome 156.0.8078.80 at a 1480 x 1020 window so the full fixed 1440 x 900 stage was visible:

- `../design/mockups/build-populated.html`
- `../design/mockups/build-empty.html`
- `../design/mockups/program-logic.html`
- `../design/mockups/program-python.html`
- `../design/mockups/simulate-running.html`
- `../design/mockups/design-system.html`

They were also opened at a 1024 x 700 window. As documented in the mockup README, the stage is fixed at 1440 x 900 and crops below that size. The 1024 review therefore combines the observed crop with the layout rules in the Workspace Layout Specification; it does not treat the cropped mockup as product behavior.

### 2.3 What this review did not repeat

The following were already validated in the design baseline and were not rerun in full:

- Every internal Markdown link and HTML target resolves.
- The mockups contain no JavaScript, external font, CDN asset, or build dependency.
- All 18 design artifacts exist and are non-empty.
- The mockups render in Chrome.

This review focuses on scaffold consequences, not document mechanics.

## 3. Verdict

**PASS WITH CONDITIONS - no blocking design defect found, but seven owner decisions must be recorded before implementation.**

The design is internally coherent and sufficient to describe the MVP-0 Studio. The viewport remains the dominant surface, the three layout presets preserve one shell, and the authored-versus-runtime boundary is legible. The transform and camera policies match POC-01.

At the time of this review, the scaffold was not ready to start until the Product Owner recorded seven decisions:

1. Project persistence model (OD-01).
2. Project file format (OD-02).
3. MVP-0 phase gating against target-state mockups (OD-03).
4. Undo/redo scope for MVP-0 (OD-04).
5. Stack and license approval (OD-05).
6. The 1024 x 640 height policy when Program and Console compete with the viewport (OD-06).
7. Project Hub inclusion in MVP-0 (OD-07).

These are decisions, not visual defects. They are recorded in [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md).

### 3.1 Owner outcome (2026-11-06)

The Project Owner approved OD-01 through OD-07 and accepted ACG-01 through ACG-04 on 2026-11-06. The review verdict remains **PASS WITH CONDITIONS** until the four gates and the implementation-dependent conditions are verified:

- OD-01..OD-07: approved. The acceptance record is in [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md) §6 and §7.
- ADR 0002 (technology stack) and ADR 0003 (persistence and project format): accepted on 2026-11-06.
- ACG-01 visual layout, ACG-02 contrast, ACG-03 input conflicts, and ACG-04 target-state accuracy: accepted as requirements; **not PASS**.
- C-01, C-02, C-05, C-06, and C-07: owner-accepted. C-03: owner-accepted with an open risk register. C-04: owner-accepted as a requirement; verification is pending until I-06.

Owner approval is not implementation authorization. **MVP-0 implementation is NOT AUTHORIZED.**

## 4. Review Results by Area

| Area | Result | Evidence and note |
| --- | --- | --- |
| Unified Studio shell | PASS | Build, Program, and Simulate use the same top bar, side docks, center viewport, Console, and status bar. No page introduces a second application shell. |
| Layout consistency | PASS | The 48 px top bar, 260/320 px side docks, 320 px Program dock, 200 px Console, and 24 px status bar are consistent across the specification and the 1440 mockups. |
| Viewport dominance | PASS | At 1440 x 900 the viewport remains the largest surface in Build and Program. Simulate keeps it visible with Monitor and Console open. |
| Visual hierarchy | PASS | Primary actions are text or text-plus-icon. Selection, focus, runtime state, and authored/runtime values use different treatments. |
| Empty World | PASS | `build-empty.html` shows zero entities, an editor overlay, empty Hierarchy, empty Inspector, and primitive actions. The overlay is not a modal. |
| World Hierarchy | PASS | The flat list matches the POC world model. Selection is shared with the viewport and Inspector. |
| Inspector | PASS | Transform is grouped; world translate/rotate and local scale are labelled; component/behavior sections are visually separate. |
| Primitive creation | PASS | Cube, Sphere, and Plane are the only POC entity types. No asset import is implied in Build. |
| Transform policy | PASS | No local/world toggle. The Inspector labels world position/rotation and local scale. POC defaults and validation are traceable. |
| Camera policy | PASS | The navigation hint matches Alt+LMB/MMB orbit, Shift+MMB/RMB pan, wheel zoom. Radius and beta clamps are specified. |
| Program dock | PASS | One dock, two tabs. Visual Logic and Python are parallel surfaces. Python is visibly phase-gated. |
| Runtime states | PASS | Editing, Preparing, Running, Paused, and Stopped are distinct. Simulate is a layout preset, not a runtime mode. |
| Monitor and Console | PASS | Both keep live collapsed headers. Simulate expands them without hiding the viewport. |
| Authored versus runtime | PASS | Runtime values are tinted and labelled; authored fields are read-only during a run; Stop restores authored state. |
| Phase gating in document | PASS | The UI Component Inventory and README phase table hide or label future surfaces. |
| Phase gating in mockups | CONDITIONAL | The mockups show target-state features from MVP-1 to Phase 07. They are valid review artifacts but must not be copied into the MVP-0 scaffold. See DR-02. |
| 1440 x 900 layout | PASS | All pages are legible at the review size. See §6. |
| 1024 x 640 layout | CONDITIONAL | The rules fit on paper, but the mockups cannot prove the compact layout because the stage is fixed at 1440. See DR-03. |
| Project persistence | CONDITIONAL | The design requires a Project Hub and recent projects; POC-01 only defines file export/import. See DR-01. |
| Undo/redo | CONDITIONAL | Design assumption A-13 implies authored undo at MVP-0; the product MVP-0 scope does not include it. See DR-04. |
| Accessibility baseline | PASS WITH GAP | Focus, labels, hit targets, and keyboard paths are specified. Tertiary text on raised surfaces is below 4.5:1. See DR-05. |
| Console/error feedback | PASS | Error rows, filters, source links, first-error expansion, and no-focus-theft rule are specified. |
| Status bar | PASS | Entity count, selection, tool, engine, and save state are present. Frame-time display must be gated to a real renderer/runtime measurement, not hard-coded. |

## 5. Issues

Severity reflects impact on the MVP-0 scaffold, not visual polish.

| ID | Severity | Issue | Impact on scaffold | Recommendation | Blocks start? |
| --- | --- | --- | --- | --- | --- |
| DR-01 | High | The design requires a Project Hub with recent projects and browser-local save, but POC-01 defines a JSON world file with no IndexedDB or local project store. The project document format is also undefined. | The scaffold team must invent storage, project identity, save/open semantics, and the project envelope. | Approve the persistence model in [MVP_0_SCAFFOLD_SPECIFICATION.md](MVP_0_SCAFFOLD_SPECIFICATION.md) §7: native IndexedDB for project records, `localStorage` for layout, and the POC world schema embedded in a versioned project envelope. | Yes |
| DR-02 | High | The mockups show components, Rigid Body, Behavior, Run transport, Monitor metrics, Visual Logic, and Python. These are target-state surfaces, not MVP-0 capabilities. | A scaffold built by copying a mockup would claim functionality that does not exist. | Treat the mockups as layout references only. Implement the MVP-0 gating matrix in the scaffold specification; hide Run/Stop, Components, Behavior, Monitor metrics, Program authoring, and Python. | Yes |
| DR-03 | Medium | The mockups are a fixed 1440 x 900 stage and crop at 1024. At 640 px height, an expanded 160 px Console plus a 200 px Program dock leaves less than the 300 px viewport minimum unless auto-collapse engages. | The compact layout has no visual proof and its height policy is easy to implement incorrectly. | Add real 1024 x 640 layout tests. Implement the documented priority: auto-collapse Asset Library, Monitor, then Program. In MVP-0 the Program surface is `Planned`, so it collapses instead of opening focus mode. Do not let the page scroll. | No, if the rule is implemented and tested |
| DR-04 | Medium | Design assumption A-13 lists MVP-0/MVP-2 as the point where authored world edits are undoable, but the Product Specification's MVP-0 acceptance criteria do not include undo, and POC-01 explicitly has no undo. | The scaffold could either omit an expected safety net or add an unbounded history feature. | Defer undo/redo from MVP-0. Require a confirmation for delete. Record the decision and revisit before MVP-1. | Yes, for scope |
| DR-05 | Medium | `--sf-text-tertiary` on `--sf-bg-raised` measures 4.38:1, below the WCAG 2.2 AA 4.5:1 threshold for normal text. | Metadata and helper text on raised cards may fail accessibility review. | Raise the tertiary token slightly or restrict it to panel/app surfaces. Re-measure in the scaffold's token check. | No, but fix before visual acceptance |
| DR-06 | Medium | Keyboard and pointer maps are specified but not validated in Chrome/Windows. C-04 remains open. | Browser or OS shortcuts may conflict with Studio commands. | Include a shortcut audit in the first scaffold increment; make conflicting shortcuts optional or remap them. | No, but before interaction acceptance |
| DR-07 | Low | The mockups use the Inter font name but do not bundle Inter; they fall back to Segoe UI on Windows. Icons are a local sprite, not a licensed production icon set. | Visual review is representative but not pixel-identical to the future product. | Keep the system font stack for MVP-0. Choose a licensed UI font and icon set before visual polish. | No |
| DR-08 | Low | The Build mockup shows a valid Visual Logic summary and a `60 fps` status value while the phase reference is MVP-1/MVP-2. | The values can be mistaken for MVP-0 behavior. | Label target-state mockups in review material; do not copy their runtime values into MVP-0. Status bar frame time must come from a real measurement or be omitted. | No |

## 6. Evaluation at 1440 x 900

| Check | Result | Observation |
| --- | --- | --- |
| Shell proportions | PASS | 260 px left, 320 px right, 320 px Program dock, 200 px Console. Viewport remains dominant. |
| Top bar density | PASS | Menus, project/save, preset, state, transport, and help fit without truncation. |
| Build hierarchy and assets | PASS | Hierarchy rows are readable; Asset Library cards are large enough for labels. |
| Build Inspector | PASS | Three-column transform fields fit at 320 px; world/local labels are legible. |
| Build empty overlay | PASS | 340 px card sits inside the 900 px center area without covering the viewport edges. |
| Program graph | PASS | Palette, three nodes, edges, validation bar, and tabs fit at 320 px dock height. |
| Python preview | PASS | File tabs, editor, API drawer, and phase-gate copy are legible. |
| Simulate Monitor | PASS | Metrics, watch section, and event area fit in the right dock; Console shows a useful log volume. |
| Simulate viewport | PASS | Runtime badge, authored ghost, and runtime arrow remain visible with Monitor and Console open. |
| Console | PASS | Filters, search, log rows, and status remain readable at 200 px. |
| Focus and selection | PASS | Selected row, viewport outline, and Inspector header agree. |

**Conclusion at 1440:** the design meets its reference size. No layout change is required for the scaffold.

## 7. Evaluation at 1024 x 640

The mockup stage cannot be resized, so this section evaluates the **rules**, not the cropped bitmap.

| Check | Result | Observation |
| --- | --- | --- |
| Width budget | PASS | Compact docks 220 + 280, center 480, two 1 px splitters = 982 px, inside 1024. |
| Top bar | PASS WITH RULE | Menus collapse to `Menu`; preset becomes icon-only; save status becomes an icon. Must be tested with long project names. |
| Left dock content | PASS WITH RULE | 220 px Hierarchy and Assets remain usable; search and row actions must not overflow. |
| Inspector width | PASS WITH RULE | 280 px fits three transform fields but leaves little room for long labels; labels must wrap or truncate with tooltips. |
| Height budget | CONDITIONAL | 640 - 48 top - 24 status = 568 px workspace. Console 160 + Program 200 leaves 208 px for the viewport. The 300 px viewport minimum requires the Program surface to auto-collapse. |
| Console height | PASS WITH RULE | 160 px at 640 shows roughly seven log rows. Filters must remain reachable. |
| Monitor height | PASS WITH RULE | 260 px minimum in the right dock is feasible only when Inspector yields; Monitor and Inspector must share the dock. |
| Empty overlay | PASS | 340 px card fits inside a 480 px center; side margins remain. |
| Program graph at 200 px | PASS WITH RULE | Palette and graph must scroll independently; node labels may truncate but selection must remain clear. |
| Page-level scroll | FAIL IF NAIVE | The shell must be a fixed grid with internal scroll regions. A page-level scrollbar is not acceptable. |
| Focus mode | NOT REQUIRED IN MVP-0 | The Program surface is `Planned` and auto-collapses before the viewport falls below 300 px. Focus mode becomes a requirement when Program authoring arrives. |

**Conclusion at 1024:** the design is feasible, but only if the scaffold implements the compact breakpoint, fixed shell, internal scrolling, auto-collapse, and the 300 px viewport floor. Focus mode is deferred with Program authoring. This is a test obligation, not a visual assumption.

## 8. PASS List

The following are accepted for scaffold planning without further design work:

1. One Studio shell with four regions, a global Console drawer, and a status bar.
2. Build, Program, and Simulate as layout presets, not runtime modes.
3. Viewport as the permanent center surface.
4. Left Hierarchy and Asset Library; right Inspector and Monitor.
5. Program dock with Visual Logic and Python as parallel tabs.
6. Empty World as an editor overlay with zero entities.
7. Shared single-selection model across viewport, Hierarchy, and Inspector.
8. POC-01 transform policy: world translate/rotate, local scale, quaternion truth, YXZ display, no local/world toggle.
9. POC-01 camera map and radius/beta clamps.
10. Authored-versus-runtime visual grammar and Stop semantics.
11. Collapsed headers for Program, Monitor, and Console.
12. Phase-gated capability table in the UI Component Inventory.
13. Dark theme first and semantic color tokens.
14. 1440 x 900 layout and visual hierarchy.
15. Console error filters, source links, and no-focus-theft rule.

## 9. Recommendations

### 9.1 Before scaffold implementation

1. Approve or reject the persistence model and project envelope (OD-01/OD-02).
2. Approve the MVP-0 gating matrix (OD-03).
3. Decide undo scope for MVP-0 (OD-04).
4. Approve the pinned stack and the license inventory (OD-05).
5. Accept the 1024 x 640 layout test obligation (OD-06).
6. Confirm Project Hub is in MVP-0 (OD-07).

### 9.2 During the first scaffold increment

1. Implement the shell with CSS grid and named tracks, not nested flex guesses.
2. Add a layout assertion test for 1024 x 640 and 1440 x 900.
3. Add a static import guard for `src/world/**`.
4. Add `tsc --noEmit`, `noUncheckedIndexedAccess`, and a Node test suite before UI work expands.
5. Add the shortcut audit and a keyboard-only smoke test.
6. Add the token contrast check to the build or test script.
7. Keep all phase-gated controls absent, not disabled, in MVP-0.

### 9.3 Do not do in MVP-0

- Do not copy target-state mockup sections into MVP-0.
- Do not build the Program graph, Python worker, physics, Monitor metrics, or runtime transport.
- Do not add drag-to-dock, floating panels, multi-select, hybrid 2D, or a light theme.
- Do not add a state-management, persistence, or UI-component dependency without a recorded justification.

## 10. Decisions Recorded with the Project Owner

All seven decisions were approved on 2026-11-06; see §3.1 and [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md) §6. The table preserves why each decision could not be inferred from the design alone.

| ID | Decision | Why it could not be inferred |
| --- | --- | --- |
| OD-01 | Persistence model: IndexedDB project records plus a versioned project envelope. | POC-01 only defines file export/import; the design requires recent projects. |
| OD-02 | Project file format and recovery export. | The POC world document and a project record are not the same document. |
| OD-03 | MVP-0 gating matrix and explicit hidden surfaces. | Mockups show later-phase features; scope must be written down. |
| OD-04 | Undo/redo is deferred from MVP-0; delete requires confirmation. | Design A-13 and product MVP-0 do not agree. |
| OD-05 | Pinned stack and license acceptance. | ADR 0001 remains proposed and does not select libraries; the MVP-0 stack is recorded in ADR 0002. |
| OD-06 | 1024 x 640 layout policy, including the auto-collapse order and the deferred focus mode. | The mockups cannot prove it; the height budget is tight. |
| OD-07 | Project Hub is in MVP-0. | The product MVP-0 list does not name it; design assumption A-01 does. |

The full options and recommendations are in [MVP_0_OWNER_DECISION_REQUEST.md](MVP_0_OWNER_DECISION_REQUEST.md).

## 11. Limitations of This Review

- No product or implementation code exists, so runtime behavior is assessed from specifications and static mockups.
- The 1024 x 640 evaluation is rule-based; the mockups are fixed at 1440 x 900.
- Accessibility is evaluated at token and interaction level, not by automated conformance testing.
- Performance is not measured. POC-01 explicitly has no performance baseline.
- Browser behavior is Chrome-only per the approved POC scope.

## 12. Traceability

| Review claim | Source |
| --- | --- |
| MVP-0 scope | Product Specification §7.2 |
| Phase gating | Design README §5; UI Component Inventory §14 |
| Shell geometry | Workspace Layout Specification §3 |
| Presets | Workspace Layout Specification §4 |
| Responsive rules | Workspace Layout Specification §7 |
| Transform policy | POC-01 World Editor §9; Design Readiness D-10 |
| Camera policy | Interaction Specification §5; Design Readiness D-11 |
| Runtime states | Design Readiness D-02 |
| Authored/runtime boundary | Design Readiness D-07/D-08 |
| Persistence gap | POC-01 World Editor §11.6; Main User Flows F-01/F-13/F-14 |
| Undo gap | Design Readiness A-13; Product Specification §7.2 |
| Contrast measurement | `../design/mockups/tokens.css`; this review §5 DR-05 |

## 13. Sign-off

This review recommends proceeding to **scaffold preparation**, not to implementation. The Project Owner approved the decision request and the four acceptance gates on 2026-11-06. The design review remains PASS WITH CONDITIONS until the gates and implementation-dependent conditions are verified.

| Role | Decision | Date |
| --- | --- | --- |
| Product Owner | **Approved OD-01..OD-07 and ACG-01..ACG-04; implementation not authorized** | 2026-11-06 |
| Engineering reviewer | Reviewed for documentation consistency | 2026-11-06 |
