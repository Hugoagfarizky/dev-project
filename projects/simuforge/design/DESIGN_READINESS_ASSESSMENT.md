# SimuForge - Design Readiness Assessment

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 - Draft for review |
| Date | 2026-11-05 |
| Status | Ready for scaffold preparation; not an implementation authorization |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Scope | Main Simulation Studio design baseline only |
| Language | English |

## 1. Verdict

**PASS - Ready for scaffold preparation, conditional.**

The design baseline is coherent, traceable, and reviewable. It defines one Studio, nine product panels plus non-panel surfaces, three layout presets, five runtime states, the authored-versus-runtime boundary, a token system, and static mockups for the main postures. It is mature enough to drive a separate scaffold task without inventing layout or interaction decisions during implementation.

It is **not** an authorization to implement the whole Studio. The scaffold must remain inside the phase gate described in the Product Specification and the UI Component Inventory. Program, Python, and the full Monitor are phase-gated surfaces; they must not appear as working features in an MVP-0 scaffold.

### 1.1 Conditions

| ID | Condition | Owner | Blocks |
| --- | --- | --- | --- |
| C-01 | Product Owner approves this design baseline and the phase scope of the scaffold. | Product Owner | Any implementation |
| C-02 | Scaffold is limited to MVP-0 surfaces unless a later increment is explicitly authorized. | Product Owner + Engineering | Scope |
| C-03 | POC-01 residual risks R-1..R-5 are carried into the implementation plan with owners; this design does not claim to close them. | Engineering | Technical readiness |
| C-04 | Keyboard and pointer maps are validated in the target Chrome build, including OS/browser shortcut conflicts. | Engineering | Interaction acceptance |
| C-05 | The scaffold task chooses its own framework and dependencies; this baseline does not select them. | Engineering | Architecture |
| C-06 | Project Hub is confirmed in MVP-0. If it is deferred, the entry flow and empty state must be revised first. | Product Owner | F-01 |
| C-07 | Light theme, floating panels, drag-to-dock, multi-select, and hybrid 2D/3D remain out of the first scaffold. | Product Owner | Scope |

A condition is not a design defect. It is a decision that must be made by the correct owner before the affected work starts.

## 2. What Was Assessed

### 2.1 Source baseline

- Product Specification, ADR 0001, Architecture, POC-01 World Editor, and POC-01 Implementation Readiness.
- POC-01 Final Closure Record and SP-08 Final Spike Decision Report.
- Repository workflow, documentation standards, and directory conventions.

### 2.2 Design deliverables

| Deliverable | File |
| --- | --- |
| Design index and scope | [`README.md`](README.md) |
| Main Studio UX Specification | [`MAIN_STUDIO_UX_SPECIFICATION.md`](MAIN_STUDIO_UX_SPECIFICATION.md) |
| Workspace Layout Specification | [`WORKSPACE_LAYOUT_SPECIFICATION.md`](WORKSPACE_LAYOUT_SPECIFICATION.md) |
| Main User Flows | [`MAIN_USER_FLOWS.md`](MAIN_USER_FLOWS.md) |
| Design System Specification | [`DESIGN_SYSTEM_SPECIFICATION.md`](DESIGN_SYSTEM_SPECIFICATION.md) |
| Interaction Specification | [`INTERACTION_SPECIFICATION.md`](INTERACTION_SPECIFICATION.md) |
| UI Component Inventory | [`UI_COMPONENT_INVENTORY.md`](UI_COMPONENT_INVENTORY.md) |
| Static review artifacts | [`mockups/`](mockups/) |

### 2.3 Validation performed

| Check | Result |
| --- | --- |
| Internal Markdown links resolve | Pass |
| HTML `href` and `src` targets resolve | Pass |
| HTML symbol and anchor references resolve | Pass |
| Every mockup renders in Chrome headless at the review size | Pass |
| Layout, icon rendering, Program dock height, and authored/runtime distinction inspected visually | Pass |
| No JavaScript, external font, CDN, or network asset in any mockup | Pass |
| No package manifest, lockfile, build config, or dependency added | Pass |
| No change under `projects/simuforge/reports/poc-01/` | Pass |
| No change to `projects/simuforge/docs/PRODUCT_SPECIFICATION.md` | Pass |
| Whitespace and conflict-marker check on staged content | Pass |

The mockups are evidence for review, not proof of accessibility conformance or production behavior. Those require implementation-time testing.

## 3. Coverage Matrix

| ID | Requirement | Where covered | Status |
| --- | --- | --- | --- |
| R-01 | One unified workspace with the required surfaces | UX Specification §5-6; Workspace Layout §2; all workspace mockups | Covered |
| R-02 | Layout, proportions, docking, resizing, collapse | Workspace Layout §3-7; Interaction §6; mockups show open and collapsed states | Covered |
| R-03 | Toolbar and contextual actions | UX Specification §6.1; Interaction §2.4; `build-populated.html` | Covered |
| R-04 | Selection across viewport, hierarchy, and Inspector | UX Specification §7.3; Interaction §4; Flow F-04 | Covered |
| R-05 | Empty World behavior | UX Specification §8; Flows F-02/F-03; `build-empty.html` | Covered |
| R-06 | Visual Logic and Python switching | UX Specification §9; Flows F-07/F-08; `program-logic.html`, `program-python.html` | Covered, Python phase-gated |
| R-07 | World to program to simulation relationship | UX Specification §4 and §9.4; Flows F-09-F-11; `simulate-running.html` | Covered |
| R-08 | Open, create, add, select, transform, run, stop, observe, save | Flows F-01-F-13 | Covered |
| R-09 | Color, typography, spacing, border, radius, elevation | Design System §3-7; `tokens.css`; `design-system.html` | Covered |
| R-10 | Iconography and button hierarchy | Design System §8-9; `design-system.html` | Covered |
| R-11 | Input and control states, panel states, feedback states | Design System §10-13; `design-system.html` | Covered |
| R-12 | Professional editor references, evaluated not copied | This document §7 | Covered |
| R-13 | Reviewable wireframes and mockups | `mockups/index.html` and five workspace/token pages | Covered |
| R-14 | Design-only constraint; no implementation or dependency | README §8; this document §11 | Covered |
| R-15 | Phase gating and no fake capability | UX Specification §11; UI Component Inventory §14; `Planned` chips | Covered |
| R-16 | Long-term hybrid 2D/3D room without committing MVP | UX Specification §2; Workspace Layout §5; README §8 | Covered structurally, deferred by design |

## 4. Design Decisions

These decisions are binding for the scaffold unless a change is recorded.

| ID | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| D-01 | Build, Program, and Simulate are layout presets, not runtime modes. | Users need to rearrange the workspace without changing simulation state. | Preset changes never mutate world data, selection, camera, or runtime state. |
| D-02 | Runtime state is Editing, Preparing, Running, Paused, Stopped. | One state machine avoids ambiguous labels such as "Play mode". | Transport, lock, runtime bar, and Monitor all read from this state. |
| D-03 | Fixed shell: 48 px top bar, optional 28 px runtime bar, 32 px panel headers, 32 px collapsed drawers, 24 px status bar. | Predictable geometry across panels and phases. | Scaffold should implement these as tokens, not ad hoc values. |
| D-04 | Left dock 260 px (200-360), right dock 320 px (260-420), center minimum 480 px. | Preserves a usable viewport while allowing dense tools. | At 1024 px, compact rules and collapse are required. |
| D-05 | One Program dock with Visual Logic and Python as parallel tabs. | Avoids implying interoperability or a single shared graph. | Switching tabs preserves each surface's own state; no automatic conversion. |
| D-06 | Monitor and Console keep live collapsed headers. | Awareness without forcing panels open. | Collapsed headers show a summary and expand control. |
| D-07 | Authored values and runtime values are visually and semantically distinct. | Prevents users from mistaking simulation output for saved world state. | Runtime sections are tinted and labelled; authored fields become read-only while running. |
| D-08 | Stop discards runtime state and restores the authored world. | Matches the product model and prevents accidental writes. | No "bake" or "apply runtime" action in MVP. |
| D-09 | No viewport right-click context menu. | Right-drag is reserved for panning; a context menu would conflict. | Contextual actions live in toolbars, panels, and keyboard shortcuts. |
| D-10 | Transform policy follows POC-01: world-space translate/rotate, local-space scale, quaternion truth, YXZ Euler display, no local/world toggle. | Preserves verified POC behavior and avoids re-litigating it in UI. | Inspector labels and gizmo must match; the scaffold may not introduce a toggle. |
| D-11 | Camera map follows POC-01: Alt+LMB/MMB orbit, Shift+MMB/RMB pan, wheel zoom, radius 0.5-500. | Verified behavior and existing muscle memory. | Navigation hints and tests must use this map. |
| D-12 | Capability gating is hide or `Planned`; never fake. | Protects trust and prevents dead controls. | Phase-gated controls are absent or visibly non-interactive. |
| D-13 | Project Hub is a separate surface, not a dock panel. | Opening and creating projects is a different task from editing a world. | Entry flow F-01 owns it; the Studio shell does not host it as a tab. |
| D-14 | Save is explicit; no autosave in MVP. | Users must understand when authored state is persisted. | Save state is visible in the top bar; unsaved changes are confirmed on exit. |
| D-15 | Dark theme first; light theme and high-contrast theme deferred. | The Studio is a long-session tool; dark is the reference. | Tokens are semantic so a light theme can be added later without renaming. |
| D-16 | Single selection through MVP-3; multi-select is reserved. | Matches product scope and avoids half-specified batch editing. | Ctrl/Shift click does not create a multi-selection yet. |
| D-17 | Layout state persists per browser profile. | Reduces repeated setup without introducing accounts. | No server-side layout sync; clearing storage resets the layout. |
| D-18 | Drag-to-dock and floating panels are deferred. | The fixed dock model is sufficient for the MVP and much cheaper to validate. | Panels can collapse and resize, but not detach. |

## 5. Assumptions

An assumption is a design choice made because the source documents do not settle the detail. It must be validated at the stated point.

| ID | Assumption | Why it is needed | Validate at |
| --- | --- | --- | --- |
| A-01 | Project Hub is part of MVP-0. | The Studio needs an entry surface that is not a dock panel. | MVP-0 planning |
| A-02 | Save is explicit and manual. | The product does not specify autosave; explicit save is safer for authored worlds. | MVP-0 |
| A-03 | The Monitor auto-opens once on the first run of a session, then respects the user's collapse choice. | Users should see feedback on first run without fighting the layout every time. | MVP-1 |
| A-04 | The Console auto-expands once on the first error, without stealing keyboard focus. | Errors must be discoverable without interrupting typing. | MVP-1 |
| A-05 | Live node tracing is post-MVP unless the runtime exposes stable instrumentation. | The design must not promise tracing the runtime cannot deliver. | MVP-2/MVP-3 |
| A-06 | Python is hidden or labelled `Planned` before Phase 07. | Prevents a non-functional editor from appearing in earlier phases. | Phase 07 gate |
| A-07 | Visual Logic and Python do not interoperate in the designed scope. | The architectural question remains open; the UI must not imply a conversion. | Architecture decision |
| A-08 | Layout state is stored per browser profile locally. | No account or cloud service is in scope. | MVP-0 |
| A-09 | World units are unitless world units; rotation is displayed in degrees; scale is a multiplier. | POC-01 uses this convention. | MVP-0 |
| A-10 | The 1440 x 900 stage is the reference review size; 1024 x 640 is the supported minimum. | Review consistency and a concrete target. | Scaffold layout tests |
| A-11 | Physics runs at a nominal 60 Hz with a fixed step; the UI reports observed values, not guarantees. | The Monitor needs meaningful units without over-promising performance. | MVP-1 |
| A-12 | The Studio is a single browser window; multi-window editing is out of scope. | Avoids cross-window state sync in the MVP. | MVP-0 |
| A-13 | Undo/redo covers authored world edits and graph edits, not runtime state. | Runtime changes are discarded on Stop, so they are not undoable. | MVP-0/MVP-2 |
| A-14 | Keyboard shortcuts are validated against Chrome and the host OS before they are documented as guaranteed. | Some combinations are reserved or intercepted. | Scaffold |
| A-15 | The graph palette is curated, not an exhaustive node catalog. | MVP-2 needs a small, legible set of nodes, not every possible action. | MVP-2 |

## 6. Open Questions

These do not block the first scaffold because they are outside MVP-0, but they must be decided before the relevant increment.

| ID | Question | Current design position | Decision needed by |
| --- | --- | --- | --- |
| Q-01 | Do Visual Logic and Python share a runtime model, or remain separate authoring surfaces? | Separate tabs; no conversion, no shared graph. | Before Phase 07 |
| Q-02 | When does hybrid 2D/3D become a real workspace? | Structural room only; MVP is 3D-first. | Post-MVP |
| Q-03 | Are floating panels and drag-to-dock ever needed? | Deferred; fixed docks are the baseline. | Post-MVP |
| Q-04 | Is multi-select required for a specific workflow? | Reserved but not enabled. | Before MVP-2 if batch graph editing is needed |
| Q-05 | Can the runtime expose live node tracing? | Monitor shows runtime events, not per-node traces. | MVP-3 |
| Q-06 | Is a light or high-contrast theme required? | Dark theme only. | Before accessibility sign-off |
| Q-07 | How is the glTF/GLB import guardrail surfaced? | Flow F-15 is specified; no import surface is drawn in the mockups. | Before import implementation |
| Q-08 | What is the undo depth and history model? | Authored edits are undoable; runtime is not. | MVP-0 architecture |

## 7. Reference Evaluation

The Studio borrows principles, not layouts. No reference editor was copied.

| Reference | Usability strength | Trade-off or failure mode | Adopted principle | Not adopted |
| --- | --- | --- | --- | --- |
| Unity Editor | Clear hierarchy-inspector-viewport triad; play-mode tint is learnable. | Dense chrome and many competing windows overwhelm newcomers. | Triad layout; visible runtime state; component sections. | Mode proliferation, floating windows by default, icon-only toolbars. |
| Unreal Editor | Strong Details panel and docking; runtime state is unmistakable. | Heavy chrome and multiple editors compete for attention. | Grouped properties; clear runtime lock; panel headers with actions. | Dense default layout, multiple simultaneous editors, Blueprint/Python coupling. |
| Godot | Simple scene tree, Inspector, and bottom output panel; good for small teams. | 2D/3D workspace split is opinionated and not needed in MVP. | Bottom dock for output and program; collapsible panels; direct play controls. | 2D/3D split, editor-owned script tabs as the only program surface. |
| Blender | Excellent viewport navigation, gizmo, and frame-selection muscle memory. | Modal, modifier-heavy shortcuts are hard to discover; right-click reliance conflicts with pan. | Axis colors, gizmo, frame selection, keyboard-first viewport. | Undiscoverable modifier chains, right-click menus in the viewport. |
| VS Code | Mature panel model, status bar, problems list, and output channel. | Editor-first layout does not fit a 3D world. | Collapsible docks, status bar, problem-to-source links, explicit save state. | Tab sprawl as the primary navigation, editor-centric shell. |
| Figma | Strong progressive disclosure and a compact right Inspector. | Infinite canvas and autosave assumptions do not transfer to simulation. | Contextual right panel, compact tokens, clear empty states. | Autosave as the only save model, canvas-first navigation. |
| Node-RED / Blueprints | Node graphs are legible when ports and validation are explicit. | Graph-only programming excludes text-first users and can hide errors. | Typed ports, palette, validation bar, node selection. | Graph as the only programming model; unbounded node sprawl. |

**Conclusion.** The Studio's identity is the combination of a 3D-first viewport, a persistent hierarchy and Inspector, a bottom Program dock, and an explicit authored-versus-runtime boundary. That combination is not a copy of any single reference.

## 8. Usability Risks

| ID | Risk | Severity | Mitigation in this baseline | Residual risk |
| --- | --- | --- | --- | --- |
| U-01 | Viewport is starved at 1024 x 640 when both docks and the Program dock are open. | High | Center minimum 480 px; compact docks; collapse; focus mode. | Users may still need to collapse a dock; test at minimum size. |
| U-02 | Users read Build/Program/Simulate as runtime modes. | High | Preset labels, separate state pill, runtime bar, and copy that distinguishes layout from state. | First-run onboarding must reinforce it. |
| U-03 | Users edit a runtime value expecting it to persist. | High | Runtime section is tinted and labelled; authored fields become read-only; Stop restores authored state. | Needs a clear Stop confirmation and a short first-run explanation. |
| U-04 | Visual Logic and Python appear to be two views of one program. | Medium | Separate tabs, explicit "parallel authoring surface" copy, no conversion action. | The architectural question remains open; documentation must stay explicit. |
| U-05 | Collapsed headers consume space and add visual noise. | Medium | Only three live headers (Program, Monitor, Console); each carries a useful summary. | At 1024 px, consider hiding low-value summaries. |
| U-06 | Monitor or Console steals attention during a run. | Medium | Auto-open once, no focus theft, collapse after acknowledgement. | Users may still miss a first error if the Console is collapsed; test notification behavior. |
| U-07 | The Empty World overlay feels like a blocking modal. | Low | It is an editor overlay, not a dialog; camera remains usable; it disappears after the first object. | Ensure it does not intercept camera gestures outside its card. |
| U-08 | Icon-only actions are ambiguous. | Medium | Text labels for primary actions; tooltips; 24 px targets; consistent icon set. | Icon comprehension needs usability testing. |
| U-09 | The runtime lock feels like a broken interface. | Medium | Lock chip, runtime bar explanation, disabled styling, and "Stop to edit" copy. | Some users will still try to edit; measure in testing. |
| U-10 | Graph validation errors are hard to locate. | Medium | Validation bar, node warning badge, Console reference, and cross-panel selection. | Large graphs need search and error navigation; not in MVP-2. |
| U-11 | The Python API shown in the mockup is mistaken for a contract. | High (Phase 07) | The page is labelled "Phase 07 preview" and the API drawer says names are illustrative. | The Phase 07 decision must publish the real API before implementation. |
| U-12 | Shortcuts conflict with Chrome or the OS. | Medium | Shortcuts are documented as optional where risky; menus remain sufficient; validate in scaffold. | Some users will remap or avoid shortcuts. |
| U-13 | Console volume makes the latest error hard to find. | Low | Severity filters, search, newest-at-bottom, source column, cross-links. | High-frequency logs need virtualization and pause-on-scroll. |
| U-14 | Phase-gated controls look broken rather than unavailable. | Medium | Hide or label `Planned`; never render an enabled control without capability. | Copy and tooltips must explain when the capability arrives. |

## 9. Accessibility Assessment

### 9.1 What the design supports

- Visible focus on every interactive element; a 2 px selection-colored halo.
- State communicated by text, shape, and color, not color alone.
- Minimum 24 px hit target; 28 px preferred; 32 px primary.
- Runtime and Console updates announced without stealing focus.
- Reduced-motion behavior for panel and drawer transitions.
- Semantic labels on icon-only buttons and inputs.
- Keyboard access to panels, fields, transport, and dialogs.

### 9.2 Gaps that require implementation work

| Gap | Why it matters | Required action |
| --- | --- | --- |
| 3D viewport is not operable by screen reader. | Selection and transform are inherently spatial. | Provide a keyboard-accessible hierarchy path and an Inspector-only workflow; document the limitation. |
| Graph authoring keyboard model is incomplete. | Visual Logic is a core surface. | Define keyboard node creation, connection, and traversal before MVP-2; test with keyboard only. |
| Canvas content lacks a text alternative. | Runtime scene state is visual. | Mirror selected object and runtime values in the Inspector and status bar. |
| Tertiary text contrast needs measurement. | `#78879E` on panel surfaces may be below 4.5:1 at small sizes. | Measure against WCAG 2.2 AA; adjust token if needed before sign-off. |
| 200% text zoom is not validated. | Dense tool layouts can break. | Test at 200% zoom and reflow; allow panel scroll rather than clipping. |
| Light/high-contrast theme is deferred. | Some users need it. | Keep semantic tokens; schedule a theme decision before accessibility sign-off. |
| Localization and RTL are not addressed. | Copy length and direction change layout. | Keep labels short; test with pseudo-localization before public release. |

## 10. Responsive Assessment

The Studio supports a minimum of **1024 x 640** at 100% browser zoom. Below that, the layout is not a supported target; the page may scroll or crop rather than reflow.

| Viewport | Expected behavior | Risk | Required validation |
| --- | --- | --- | --- |
| 1024 x 640 | Compact docks (left 200, right 260), center at least 480; Program dock 180-240; Console 120-160; some top-bar labels move into overflow. | High density; viewport and Program compete. | Test with both docks open, Program open, Console open, and Monitor expanded. |
| 1280 x 720 | Default docks; Program dock 320; Console 200; Monitor 260+. | Comfortable but tight vertically when Console and Program are both open. | Test all presets and the Focus mode escape. |
| 1440 x 900 | Reference layout used by the mockups. | Low. | Visual comparison with every mockup. |
| 1920 x 1080 | Docks stay at default widths; viewport grows; line lengths in Inspector and Monitor remain readable. | Excessively wide viewport or sparse panels. | Check that Inspector and Console do not stretch text lines beyond comfort. |
| 125% zoom at 1440 | Effective width 1152; compact rules apply. | Some labels may truncate. | Test top bar, panel headers, and status bar. |
| 150% zoom at 1440 | Effective width 960, below the supported minimum. | Layout is not guaranteed. | Document as unsupported, or add a future compact mode. |

## 11. Constraint Compliance

| Constraint | Evidence | Status |
| --- | --- | --- |
| Design only; no UI implementation | No application source, component library, or build configuration added. | Pass |
| No app scaffold | Only Markdown, CSS, and static HTML under `projects/simuforge/design/`. | Pass |
| No dependency installs | No `package.json`, lockfile, `node_modules`, CDN link, or external font. | Pass |
| No POC-01 changes | No file under `projects/simuforge/reports/poc-01/` modified. | Pass |
| No Product Specification changes | `projects/simuforge/docs/PRODUCT_SPECIFICATION.md` untouched. | Pass |
| Assumptions recorded, not hidden | Assumptions A-01..A-15 and open questions Q-01..Q-08 are listed above. | Pass |
| Long-term hybrid 2D/3D preserved | Structural room only; no MVP commitment. | Pass |
| Capability gating | `Planned` chips and phase table; no fake controls. | Pass |

## 12. Scaffold Gate

The scaffold task may start only when all of the following are true:

1. C-01 through C-07 are accepted by their owners.
2. The scaffold scope is written down as an increment, with a list of surfaces that are **not** in it.
3. The framework, storage, and test stack are chosen by the scaffold task, not inferred from this design.
4. The POC-01 transform and camera policies are treated as fixed inputs.
5. Acceptance tests exist for layout at 1024 x 640 and 1440 x 900, empty world, selection, transform commit/revert, runtime lock, and save state.
6. An accessibility plan exists for keyboard-only use and the viewport limitation is documented.

### 12.1 Recommended first scaffold slice

A safe first slice is the **MVP-0 shell**, not the whole Studio:

1. Implement the shell grid and dimension tokens exactly as specified.
2. Implement collapsible left and right docks, the Program strip, and the Console drawer with static content.
3. Implement the Project Hub and explicit save/open using local persistence.
4. Implement World Hierarchy, viewport, Inspector, primitive creation, selection, and transform with the POC-01 policy.
5. Implement the Console for editor messages and the status bar.
6. Leave Program authoring, Python, the full Monitor, and runtime transport hidden or `Planned`.

This slice proves the layout, the selection loop, and the save model without committing to a simulation runtime or a graph engine.

### 12.2 Do not start with

- the Visual Logic graph engine,
- the Python worker,
- live runtime metrics,
- drag-to-dock or floating panels,
- multi-select,
- hybrid 2D/3D,
- a light theme.

Each of these depends on a decision or a capability that is not yet proven.

## 13. Change Control and Next Review

A change to this baseline must record:

1. the decision or assumption it changes,
2. the reason,
3. the affected documents and mockups,
4. whether the scaffold gate is affected.

A design change does not modify the Product Specification. If a design change contradicts a product or technical decision, record a decision request instead.

**Next review triggers:**

- Product Owner rejects or amends a decision in §4.
- Engineering cannot satisfy the 1024 x 640 minimum without changing the shell.
- The POC-01 residual risks change the runtime contract.
- Phase 07 publishes a Python API.
- Accessibility testing finds a blocking contrast or keyboard issue.
- The project adopts a framework that cannot support the fixed dock model.

## 14. Traceability to POC-01 and the Product Specification

| Source decision | Design response | Evidence |
| --- | --- | --- |
| POC-01 transform policy | World-space translate/rotate, local-space scale, quaternion truth, YXZ Euler display, no toggle. | UX Specification §6.3; Interaction §5; Inspector in `build-populated.html` |
| POC-01 camera map | Alt+LMB/MMB orbit, Shift+MMB/RMB pan, wheel zoom, radius limits. | Interaction §5; navigation hint in every workspace mockup |
| Empty World rules | No entities until the user adds one; overlay is not an entity. | UX Specification §8; `build-empty.html` |
| Runtime state machine | Editing, Preparing, Running, Paused, Stopped; structural lock begins at Preparing. | UX Specification §4.3; Design System §3.3; `simulate-running.html` |
| Runtime versus authored values | Separate visual grammar; Stop restores authored state. | UX Specification §4.4 and §10.3; Inspector and Monitor in `simulate-running.html` |
| Phase mapping | Surfaces are gated by MVP-0 through Phase 07. | README §5; UI Component Inventory §14 |
| Import guardrail | Import flow is specified; the UI does not imply unrestricted import. | Flow F-15 |
| Browser matrix | Chrome-first; 1024 x 640 minimum; WebGL 2 assumed. | Design System §16; Workspace Layout §7; status bar copy |
| Residual risks R-1..R-5 | Carried as implementation risks; not claimed as closed. | C-03; this document §1.1 |

## 15. Sign-off

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product Owner | Pending | Pending review | - |
| Engineering lead | Pending | Pending review | - |
| Design/accessibility reviewer | Pending | Pending review | - |

The design baseline is complete for review. It is not approved for implementation until the sign-off above is recorded and the scaffold gate in §12 is satisfied.
