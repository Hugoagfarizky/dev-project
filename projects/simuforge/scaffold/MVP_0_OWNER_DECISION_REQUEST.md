# SimuForge - MVP-0 Owner Decision Request

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 1.0 - Request for decision |
| Date | 2026-11-05 |
| Status | Open; no decision recorded |
| Requested from | Product Owner, SimuForge |
| Prepared by | Engineering, SimuForge |
| Project | simuforge |
| Design baseline | `e722c03b1049b9fd34bad15c22693e9865761235` |
| POC baseline | POC-01 CLOSED (GO) |
| Language | English |

## 1. Why This Request Exists

The design baseline is coherent, but four areas are not decided to the level the scaffold needs: persistence, phase gating, the compact layout policy, and undo scope. Two further items are scope confirmations: the Project Hub and the exclusion list. One item is the stack and license approval.

Without these decisions the scaffold team would have to invent product behavior. That is not acceptable for a change that creates durable user data and a public file format.

**No implementation starts until this request is answered.** A partial answer unblocks only the increments that do not depend on the unanswered items; see §5.

## 2. Decision Summary

| ID | Decision | Recommendation | Blocks |
| --- | --- | --- | --- |
| OD-01 | Persistence model | Native IndexedDB project records plus `localStorage` layout state | I-07, Project Hub |
| OD-02 | Project file format | `.simuforge.json` envelope v1 embedding the POC world v1 document | I-07, file open/save |
| OD-03 | MVP-0 gating matrix | Strict gating: gated controls absent or `Planned`, never enabled no-ops | I-02, I-08 |
| OD-04 | Undo/redo scope | Defer undo/redo from MVP-0; delete requires confirmation | I-05, I-06 |
| OD-05 | Stack and licenses | Approve the POC-validated pinned set and the license inventory | I-01 onward |
| OD-06 | 1024 x 640 layout policy | Supported minimum with auto-collapse, 300 px viewport floor, and a `Window too small` state below 1024 | I-02, I-09 |
| OD-07 | Project Hub in MVP-0 | Include the Project Hub in MVP-0 | I-07 |

Each decision has a recommended option. A recommendation is not an approval.

## 3. Detailed Decisions

### OD-01 - Persistence model

**Question:** where do authored projects live in MVP-0?

**Context:** the design requires a Project Hub with recent projects and browser-local save. POC-01 defines a JSON world export/import, not a project store. The Product Specification §7.2 requires "Save and reopen a project locally" but does not name a storage mechanism.

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | IndexedDB database `simuforge`, `projects` store keyed by `id` with an `updatedAt` index; `localStorage` for layout and last project; file export/import remains available | Project Hub recents, offline, no backend, no storage dependency |
| B | File export/import only; no browser project records | Project Hub cannot list recent projects; F-01 and F-13/F-14 need revision |
| C | Server or cloud project storage | Requires backend, identity, and privacy work; outside MVP-0 |

**Recommendation:** A.

**Rationale:**

- It satisfies the design's Project Hub and recent-project requirement without a backend.
- IndexedDB is a platform API; no storage dependency is added.
- The project document stays portable through the same envelope used for files.
- Failure modes are explicit: unavailable storage degrades to file open/save with a banner.

**If not approved:** I-07 stops. The Project Hub cannot be built as specified. If B or C is chosen, the entry flow, empty state, and scaffold specification must be revised before implementation.

**Recorded as:** ADR 0003, created before I-07.

### OD-02 - Project file format

**Question:** what is the durable project document?

**Context:** POC-01 defines `simuforge.world` v1 with `entities[]`, but a project also needs identity, name, and timestamps. Writing a second entity schema would break round-trip compatibility. Writing editor state into the world document would leak editor concerns into durable data.

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | `.simuforge.json` with `format: "simuforge.project"`, `schemaVersion: 1`, a `project` metadata object, and a nested `world` document in `simuforge.world` v1 | Reuses the validated world schema; one file per project; explicit versioning |
| B | A flat world document with extra top-level project fields | Mixes project and world concerns; the POC schema changes |
| C | Two files: project metadata plus a separate world file | More failure modes, more UI, more ambiguity about atomic save |

**Recommended shape:**

```json
{
  "format": "simuforge.project",
  "schemaVersion": 1,
  "project": {
    "id": "3f2c1a9e-8b4d-4c6f-9a1e-2d7b5c8e4f10",
    "name": "Button & Ball",
    "createdAt": "2026-11-05T08:00:00.000Z",
    "updatedAt": "2026-11-05T08:30:00.000Z"
  },
  "world": {
    "format": "simuforge.world",
    "schemaVersion": 1,
    "entities": []
  }
}
```

**Recommendation:** A.

**Rationale:**

- It preserves the POC-01 world contract exactly.
- Project identity and timestamps are explicit.
- Unknown fields are ignored on read and not written on save.
- A newer `schemaVersion` is rejected with a clear message. MVP-0 has no migration chain; migrations are a later, deliberate task.

**If not approved:** I-07 stops. A different envelope must be specified and validated before save is implemented.

**Recorded as:** ADR 0003, created before I-07.

### OD-03 - MVP-0 gating matrix

**Question:** how are surfaces that exist in the design but not in MVP-0 presented?

**Context:** the mockups are target-state artifacts. They show Components, Rigid Body, Behavior, Run transport, Monitor metrics, Visual Logic, and Python. The Product Specification places most of these after MVP-0. A scaffold that copies the mockups would imply capability that does not exist.

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | Gated surfaces are absent or replaced by a non-interactive `Planned` strip with an explanation; no enabled no-op control | Honest UI; phase boundaries are visible |
| B | Render the full target-state controls in a disabled state | The UI implies imminent capability, creates focus and accessibility noise, and invites accidental enablement |
| C | Build partial Program/Monitor surfaces now | Expands MVP-0 beyond the approved scope and its acceptance criteria |

**Recommended matrix:**

| Surface | MVP-0 |
| --- | --- |
| Top bar transport (Run/Pause/Stop/Reset) | Hidden |
| Simulation menu | Hidden |
| Runtime bar | Hidden |
| Inspector Components, Behavior, Runtime | Hidden |
| Program dock | 32 px `Planned` surface, no canvas |
| Python | Named in planned copy only; no tab that accepts input |
| Simulation Monitor | Collapsed `Planned` strip; no metrics |
| Console | Visible for editor/app/render/import messages only |

**Recommendation:** A.

**Rationale:**

- The scaffold must not claim a runtime it does not have.
- Absent controls are simpler to test than disabled ones and cannot be tabbed into.
- A `Planned` strip preserves the layout shape without fabricating values.

**If not approved:** I-02 and I-08 cannot fix the visual contract. If B or C is chosen, the scaffold specification and acceptance criteria must change first.

### OD-04 - Undo/redo scope

**Question:** does MVP-0 include authored undo/redo?

**Context:** Design assumption A-13 says authored world edits are undoable at MVP-0/MVP-2. Open question Q-08 asks for the undo depth and history model, needed by "MVP-0 architecture". The Product Specification §7.2 does not list undo in MVP-0, and POC-01 explicitly has no undo. The two baselines disagree.

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | Defer undo/redo from MVP-0. Delete requires confirmation. Record the limitation and revisit before MVP-1 | Matches the product MVP-0 list and POC-01; adds one safety dialog |
| B | Implement authored undo/redo in MVP-0 | Adds a command history, coalescing rules, memory bounds, and new acceptance criteria; expands scope |
| C | Disable delete in MVP-0 | Removes a required authored operation and breaks the object lifecycle |

**Recommendation:** A.

**Rationale:**

- The product MVP-0 acceptance criteria do not require undo.
- POC-01 proved the world operations without undo; adding history is a separate feature with its own correctness risk.
- Confirmation is a bounded, testable safety measure for the one destructive action.
- A-13 and Q-08 remain open for MVP-1 rather than being silently overridden.

**If not approved:** Choose B and add an increment with history, coalescing, and tests before I-05. Choose C and revise the MVP-0 scope. Either way, the specification must change before implementation.

### OD-05 - Stack and license approval

**Question:** may the scaffold use the proposed pinned stack and accept its licenses?

**Context:** C-05 assigns the framework and dependency choice to the scaffold task. ADR 0001 is `proposed` and does not select libraries. POC-01 validated a specific set. The full inventory is in [MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md](MVP_0_DEPENDENCY_AND_LICENSE_INVENTORY.md).

**Proposed stack:**

| Item | Version | License |
| --- | --- | --- |
| Node.js | 24.22.2 LTS (Maintenance LTS) | MIT |
| npm | 11.19.1 | Artistic-2.0 |
| React / React DOM | 19.3.1 | MIT |
| TypeScript | 6.0.3 | Apache-2.0 |
| Vite | 8.3.5 | MIT |
| `@vitejs/plugin-react` | 6.1.2 | MIT |
| `@babylonjs/core` | 9.32.1 | Apache-2.0 |
| `@types/react`, `@types/react-dom` | 19.3.0 | MIT |
| `@types/node` | 24.19.2 | MIT |

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | Approve the POC-validated pinned set and the license inventory | Reproducible build; POC evidence remains valid |
| B | Adopt the newest releases available on 2026-11-05: Vite 8.3.6, plugin-react 6.2.1, Babylon 9.34.0, TypeScript 7.0.2 | Release-day packages and a compiler migration; POC evidence no longer matches |
| C | Choose a different framework or renderer | Requires a new POC and invalidates the POC-01 closure as the technical basis |

**Recommendation:** A.

**Rationale:**

- The set is the one POC-01 actually exercised.
- Node 24.22.2 is Maintenance LTS and remains supported to 2028-04-30. Node 26.13.0 is Active LTS, but moving the runtime is a separate change after the scaffold baseline is green.
- Every direct package is pinned; the lockfile controls transitive resolution.
- The license surface is MIT, ISC, BSD-3-Clause, and Apache-2.0, with MPL-2.0 limited to build-time native tooling.
- No release-day upgrade is adopted without its own review.

**If not approved:** I-01 stops. No package is installed. If B is chosen, the dependency inventory and POC assumptions must be revised first. If C is chosen, a new POC is required.

**Recorded as:** ADR 0002, created before I-01.

### OD-06 - 1024 x 640 layout policy

**Question:** what is the supported minimum, and what happens when Program and Console compete with the viewport?

**Context:** the mockups are a fixed 1440 x 900 stage and crop below that size. The layout specification gives a 1024 minimum, but at 640 px height an expanded Console and Program dock can leave less than the 300 px viewport minimum.

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | Support 1024 x 640 and above. At 1024-1199 px use 220/280 px docks. Auto-collapse Asset Library, Monitor, then Program to preserve a 300 px viewport. Console collapses before the viewport falls below 300 px. Below 1024 show `Window too small`. Defer the 768-1023 limited overlay to Phase 02 | Matches the design minimum and keeps the viewport usable |
| B | Support 768-1023 now with a limited overlay | Expands scope and requires a separate layout design and tests |
| C | Raise the minimum to 1280 x 720 | Simplifies layout but contradicts the design baseline and excludes smaller laptops |

**Recommendation:** A.

**Rationale:**

- It preserves the approved minimum.
- Auto-collapse is already the documented priority.
- Program focus mode is not needed in MVP-0 because Program has no authoring surface yet.
- The `Window too small` state is honest and easy to test.

**If not approved:** I-02 cannot fix the compact contract. If C is chosen, the design baseline must be revised. If B is chosen, a new layout design and acceptance tests are required.

### OD-07 - Project Hub in MVP-0

**Question:** is the Project Hub part of MVP-0?

**Context:** design assumption A-01 says the Project Hub is part of MVP-0, and the design README phase table lists "project hub" in MVP-0. The Product Specification §7.2 lists "Create an empty project" and "Save and reopen a project locally" but does not name a Project Hub. C-06 requires the Product Owner to confirm it; if deferred, the entry flow and empty state must be revised first.

**Options:**

| Option | Description | Consequence |
| --- | --- | --- |
| A (recommended) | Include the Project Hub: new project, open file, recent projects, empty/loading/error states | Matches A-01 and the design table; needs OD-01 and OD-02 |
| B | No Hub. Open a project file or start a new empty project directly in the Studio | Simpler, but removes recents and changes F-01/F-02; the design entry flow must be revised |
| C | Defer the Hub to MVP-1 and start every session empty | Contradicts A-01; requires a revised entry flow and a temporary save model |

**Recommendation:** A.

**Rationale:**

- It is already assumed by the design and needed for the recent-project behavior.
- It gives save/open a clear entry surface instead of hiding it in a menu.
- The extra scope is bounded: one surface, one list, one dialog set, with OD-01 as its only dependency.

**If not approved:** I-07 changes. The Project Hub specification, F-01/F-02, and the empty state must be revised before implementation.

## 4. C-01 to C-07 Evaluation

These are the exact conditions from [Design Readiness Assessment](../design/DESIGN_READINESS_ASSESSMENT.md) §1.1. None is approved by this document.

| ID | Requirement | Current status | Evidence | Impact if unmet | Recommendation |
| --- | --- | --- | --- | --- | --- |
| C-01 | Product Owner approves the design baseline and the phase scope of the scaffold | **Not met.** Design readiness is "PASS - conditional"; owner sign-off is pending | Design Readiness §1, §13; this request | No implementation can start | Approve the design baseline and this request together |
| C-02 | Scaffold is limited to MVP-0 surfaces unless a later increment is explicitly authorized | **Not formally accepted.** The scope and exclusions are written in Scaffold Specification §2, but the owner has not accepted them | Scaffold Specification §2; gating matrix §2.3 | Scope creep and false capability claims | Approve OD-03 and the exclusion list |
| C-03 | POC-01 residual risks R-1..R-5 are carried into the implementation plan with owners; the design does not claim to close them | **Partially met.** Implementation Plan §8.1 carries R-1..R-5 with role owners; named individuals are not assigned | Implementation Plan §8.1; SP-08 §5 | Technical readiness cannot be signed off | Approve the plan; assign named engineers in I-01 |
| C-04 | Keyboard and pointer maps are validated in the target Chrome build, including OS/browser shortcut conflicts | **Not met.** No shortcut audit has been performed | Scaffold Specification §6.3; Implementation Plan I-06 | Interaction acceptance cannot pass | Keep as an I-06 exit criterion; record the audit |
| C-05 | The scaffold task chooses its own framework and dependencies; the design baseline does not select them | **Proposed, not approved.** The stack and inventory are complete | Dependency Inventory; Architecture Proposal §12 | No dependency may be installed | Approve OD-05 |
| C-06 | Project Hub is confirmed in MVP-0. If deferred, the entry flow and empty state are revised first | **Not confirmed.** A-01 and the design phase table include it; the product MVP-0 list does not name it | Design Readiness A-01; Design README phase table; Product Specification §7.2 | F-01 entry flow is undefined | Approve OD-07 |
| C-07 | Light theme, floating panels, drag-to-dock, multi-select, and hybrid 2D/3D remain out of the first scaffold | **Respected but not formally accepted.** The exclusions are written; no implementation exists to verify | Scaffold Specification §2.2 | Scope creep | Confirm the exclusions with OD-03 |

### 4.1 Status legend

- **Met:** the condition is satisfied and recorded.
- **Partially met:** the artifact exists, but an owner or verification step is missing.
- **Not met:** the condition has not been satisfied.
- **Not formally accepted:** the work is written, but the responsible owner has not approved it.

## 5. What Each Answer Unblocks

All rows assume C-01 is approved. Without C-01, no increment starts, regardless of the other answers.

| Answer state | Unblocked work |
| --- | --- |
| All OD approved, C-01..C-07 accepted | I-01 may start after ADR 0002 is recorded. ADR 0003 is recorded before I-07. |
| OD-05 only | ADR 0002 drafting only; no increment starts |
| OD-05 and OD-03 | I-01 and I-02 only; I-03 depends on OD-02 for the project envelope |
| OD-01, OD-02, OD-03, OD-05, OD-06, OD-07 | I-01 through I-09 in order, subject to C-04 and C-03 completion |
| OD-04 rejected in favour of undo | A new increment and revised acceptance criteria are required before I-05 |
| OD-06 rejected in favour of a higher minimum | The layout specification and mockup assumptions must be revised first |
| OD-07 rejected | The entry flow, F-01/F-02, and the scaffold specification must be revised first |

## 6. Decision Record

The Product Owner completes this table. A blank cell is not an approval.

| ID | Decision (Approve / Approve with changes / Reject / Defer) | Name and role | Date | Notes |
| --- | --- | --- | --- | --- |
| OD-01 |  |  |  |  |
| OD-02 |  |  |  |  |
| OD-03 |  |  |  |  |
| OD-04 |  |  |  |  |
| OD-05 |  |  |  |  |
| OD-06 |  |  |  |  |
| OD-07 |  |  |  |  |

## 7. Approval Block

| Role | Decision | Name | Date |
| --- | --- | --- | --- |
| Product Owner | Pending |  |  |
| Engineering Lead | Pending |  |  |
| Design reviewer | Pending |  |  |

## 8. Stop Rule

If any of the following occurs, implementation stops and returns to this request:

- A decision is answered in a way that changes the scope baseline.
- A new surface is requested that is not in MVP-0.
- The persistence or file format changes.
- A dependency outside the approved inventory is required.
- The 1024 x 640 layout cannot meet the stated viewport floor.
- A POC-01 transform or camera behavior cannot be reproduced.

## 9. Traceability

| Item | Source |
| --- | --- |
| C-01 to C-07 definitions | Design Readiness Assessment §1.1 |
| Scaffold gate | Design Readiness Assessment §12 |
| MVP-0 scope | Product Specification §7.2 |
| Project Hub assumption | Design Readiness A-01; Design README phase table |
| Undo assumption | Design Readiness A-13, Q-08; POC-01 World Editor §8.5 |
| Persistence gap | POC-01 World Editor §11.6; Main User Flows F-01/F-13/F-14 |
| Transform and camera policy | POC-01 World Editor §6.7, §9 |
| Phase gating | UI Component Inventory §14; Design Readiness D-12 |
| Stack proposal | Dependency and License Inventory §4 |
| Residual risks | SP-08 §5 |
| Layout minimum | Workspace Layout Specification §7 |

## 10. Final Note

Approving this request approves a **specification and a plan**, not an implementation. The first code change is a separate review with its own diff, tests, and evidence.
