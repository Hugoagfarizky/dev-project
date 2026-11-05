# SimuForge — Main Simulation Studio Design

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 — Draft for review |
| Date | 2026-11-05 |
| Status | Design baseline. Design only; no UI implementation is authorized. |
| Owner role | Product Owner, SimuForge |
| Project | simuforge |
| Baseline | POC-01 CLOSED (GO), commit `d4a02720412ed38ed089271f9f20378bfda46c28` |
| Supersedes | None |
| Language | English |

This directory is the design baseline for the **Main Simulation Studio** of SimuForge. It translates the approved product specification, ADR 0001, the POC-01 closure record, and the POC-01 implementation readiness into a coherent workspace that can be scaffolded in a separate task.

Nothing in this directory is application code. The HTML files under `mockups/` are static, dependency-free review artifacts. They are not a product build, a component library, or a scaffold.

## 1. What This Baseline Decides

- The Studio is one workspace with four regions: top bar, left dock, center work area, right dock, plus a global Console drawer and a status bar.
- **Build**, **Program**, and **Simulate** are workspace *layout presets*. They never change the runtime state by themselves.
- Runtime state is owned by the product state machine: **Editing**, **Preparing**, **Running**, **Paused**, **Stopped**.
- Panels are progressively disclosed. The default Build layout does not expand the programming dock or the Monitor; both keep a collapsed header.
- Visual Logic and Python are separate tabs in one Program dock. They are parallel authoring surfaces, not two views of one graph.
- The world stays empty until the user adds an object. The empty state is an editor overlay, never a world entity.
- Authoring values and runtime values are visually distinct. Stopping discards the runtime and returns the viewport to authored state.
- Structural editing is locked in Preparing, Running, and Paused. The lock is visible, explained, and reversible with Stop.
- Capability gating is explicit: a panel or control that has no working capability in a phase is hidden or labelled, never faked.

## 2. Deliverables

| Deliverable | Document | Status |
| --- | --- | --- |
| Main Studio UX Specification | [MAIN_STUDIO_UX_SPECIFICATION.md](MAIN_STUDIO_UX_SPECIFICATION.md) | Complete for review |
| Workspace Layout Specification | [WORKSPACE_LAYOUT_SPECIFICATION.md](WORKSPACE_LAYOUT_SPECIFICATION.md) | Complete for review |
| Main User Flows | [MAIN_USER_FLOWS.md](MAIN_USER_FLOWS.md) | Complete for review |
| Design System Specification | [DESIGN_SYSTEM_SPECIFICATION.md](DESIGN_SYSTEM_SPECIFICATION.md) | Complete for review |
| Interaction Specification | [INTERACTION_SPECIFICATION.md](INTERACTION_SPECIFICATION.md) | Complete for review |
| UI Component Inventory | [UI_COMPONENT_INVENTORY.md](UI_COMPONENT_INVENTORY.md) | Complete for review |
| Wireframes and mockups | [mockups/README.md](mockups/README.md) | Complete for review |
| Design Readiness Assessment | [DESIGN_READINESS_ASSESSMENT.md](DESIGN_READINESS_ASSESSMENT.md) | Complete for review |

## 3. Workspace at a Glance

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top bar 48 px: menus · project + save state · Build | Program | Simulate ·   │
│                 transport · help                                             │
├──────────────────┬──────────────────────────────────────┬────────────────────┤
│ World Hierarchy  │ 3D World Viewport                    │ Inspector          │
│                  │                                      │                    │
│                  │  viewport toolbar                    │                    │
│                  │                                      │                    │
├──────────────────┤                                      ├────────────────────┤
│ Asset Library    │                                      │ Simulation Monitor │
│                  │                                      │ (collapsible)      │
│                  ├──────────────────────────────────────┤                    │
│                  │ Program dock (collapsible)           │                    │
│                  │ Visual Logic | Python                │                    │
│                  │                                      │                    │
├──────────────────┴──────────────────────────────────────┴────────────────────┤
│ Console / Output drawer (collapsible)                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Status bar 24 px                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

The runtime bar (28 px) appears between the top bar and the workspace only in Preparing, Running, or Paused. It is not present in Editing.

## 4. Review Order

1. [MAIN_STUDIO_UX_SPECIFICATION.md](MAIN_STUDIO_UX_SPECIFICATION.md) — the mental model and panel responsibilities.
2. [WORKSPACE_LAYOUT_SPECIFICATION.md](WORKSPACE_LAYOUT_SPECIFICATION.md) — geometry, presets, docking, responsive behavior.
3. [MAIN_USER_FLOWS.md](MAIN_USER_FLOWS.md) — the end-to-end user journey.
4. [DESIGN_SYSTEM_SPECIFICATION.md](DESIGN_SYSTEM_SPECIFICATION.md) — tokens and component states.
5. [INTERACTION_SPECIFICATION.md](INTERACTION_SPECIFICATION.md) — pointer, keyboard, runtime, and feedback rules.
6. [UI_COMPONENT_INVENTORY.md](UI_COMPONENT_INVENTORY.md) — what must be built, and in which phase.
7. [mockups/README.md](mockups/README.md) — open the static wireframes in Chrome.
8. [DESIGN_READINESS_ASSESSMENT.md](DESIGN_READINESS_ASSESSMENT.md) — coverage, decisions, assumptions, risks, and the scaffold gate.

## 5. Phase Coverage

The design covers the whole Studio, but implementation is gated. The table states what the design expects to be visible in each increment. A capability that does not work in a phase is not rendered as an enabled control.

| Increment | Studio surfaces expected | Hidden or gated |
| --- | --- | --- |
| MVP-0 — Studio & World Foundation | Top bar (Build), World Hierarchy, Viewport, Inspector, Asset Library (primitives), Console (editor messages), status bar, project hub, save/open | Program dock, Python, Simulation Monitor, runtime transport (no simulation yet), component sections |
| MVP-1 — Components & Basic Physics | Above plus components, transport (Run/Pause/Stop/Reset), runtime bar, runtime Inspector section, Console (runtime logs) | Visual Logic, Python, full Monitor |
| MVP-2 — Visual Scripting | Above plus Program dock, Visual Logic tab, graph validation, logic logs | Python, advanced monitor metrics |
| MVP-3 — Integrated Demonstration & Monitoring | Above plus Simulation Monitor, runtime event list, last-run summary, cross-panel error links | Python, live execution trace if runtime instrumentation is not ready |
| Phase 07 — Python Runtime | Python tab, file tabs, Python errors, worker status, API reference drawer | — |
| Post-MVP | Hybrid 2D/3D surfaces, split editors, floating panels, multi-select, touch | — |

The phase mapping follows `PRODUCT_SPECIFICATION.md` §7 and §12 and `POC_01_IMPLEMENTATION_READINESS.md` §10.5. It does not add scope to any increment.

## 6. Normative Language

- **MUST** — required for the design to be considered implemented.
- **SHOULD** — the default; deviation needs a recorded reason.
- **MAY** — optional or deferred.

A requirement is a design requirement, not an authorization to implement it now.

## 7. Source Documents

| Source | Use in this baseline |
| --- | --- |
| [Product Specification](../docs/PRODUCT_SPECIFICATION.md) | Product vision, Studio panels, workflow, runtime rules, MVP increments, non-goals |
| [ADR 0001](../../../docs/decisions/0001-proposed-architecture-direction.md) | Editor/runtime separation, ECS direction, versioned project data |
| [POC-01 World Editor](../docs/POC_01_WORLD_EDITOR.md) | Workspace minimums, selection, camera, transform policy, empty-world rules |
| [POC-01 Implementation Readiness](../docs/POC_01_IMPLEMENTATION_READINESS.md) | Versions, transform policy, import guardrail, browser matrix, residual risks |
| [POC-01 Final Closure Record](../reports/poc-01/results/POC_01_FINAL_CLOSURE_RECORD.md) | GO decision and next-stage boundary |
| [SP-08 Final Spike Decision Report](../reports/poc-01/results/SP-08_FINAL_SPIKE_DECISION_REPORT.md) | Verified behavior and residual risks R-1..R-5 |

Where this baseline and a source document disagree, the source document wins for product and technical decisions. A disagreement must be recorded as an assumption in [DESIGN_READINESS_ASSESSMENT.md](DESIGN_READINESS_ASSESSMENT.md), not silently resolved.

## 8. Non-Goals

- No UI implementation, component library, build configuration, dependency, or scaffold.
- No change to POC-01 evidence, acceptance criteria, or closure records.
- No change to the Product Specification.
- No new product capability is claimed. Panels that depend on future increments are designed and phase-gated.
- No final decision on visual scripting and Python interoperability; the architectural open question remains open.
- No final decision on hybrid 2D/3D interaction; the Studio leaves structural room for it but the MVP remains 3D-first.
- No cloud, collaboration, marketplace, or account surfaces.

## 9. Change Control

A change to this baseline MUST record:

1. the decision or assumption it changes,
2. the reason,
3. the affected documents and mockups,
4. whether the change affects the scaffold gate.

Design changes do not modify the Product Specification. If a design change would contradict a product or technical decision, stop and record a decision request instead.
