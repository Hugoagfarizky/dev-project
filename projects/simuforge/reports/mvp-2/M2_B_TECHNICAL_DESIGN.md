# SimuForge — M2-B Technical Design Proposal

**Date:** 2026-11-11  
**Milestone:** M2-B — Graph Editor UI  
**Status:** PLANNING COMPLETE / PENDING IMPLEMENTATION AUTHORIZATION  
**Baseline:** M2-A CLOSED — PASS @ `2fb957bb378672198a1ed3a868f3a7be87e495a8`

## 1. Canonical graph architecture findings

M2-A provides a SimuForge-owned graph domain under `app/src/graph`:

- `types.ts`: canonical `Graph`, `GraphNode`, `GraphEdge`, diagnostics, validation context, serialization result.
- `nodes.ts`: six approved node types and their execution ports.
- `validation.ts`: deterministic validation and stable diagnostic codes.
- `serialization.ts`: canonical JSON serialization/deserialization.

Key findings:
- Node types are discriminated by `config.kind`, which must match `node.type`.
- Node IDs and edge IDs are explicit strings.
- Ports are derived from node type, not stored as mutable UI state.
- Edges connect `sourceNodeId/sourcePortId` to `targetNodeId/targetPortId`.
- Graph validation requires an injected `GraphValidationContext` containing entities and rigidBody components.
- Cycles are rejected.
- Validation does not mutate input.
- Serialization validates format, schema version, and graph validity.

This model is suitable for React Flow integration through an adapter.

## 2. React Flow compatibility assessment

Checked package: `@xyflow/react` version `12.12.1`.

- Peer dependencies support React >= 17 and React DOM >= 17.
- The project uses React `19.3.1`, so the package is compatible at the declared peer range.
- Vite and TypeScript are compatible with a normal React component integration.
- React Flow requires its CSS import for correct rendering.
- React Flow supports controlled nodes/edges, custom node types, connection validation, viewport controls, and selection.

Recommendation: use React Flow as a presentation/editor dependency only, behind a SimuForge adapter. Do not persist its internal state as the canonical graph.

## 3. Canonical model adapter design

### Source of truth

SimuForge canonical graph state remains the only authoritative source. React Flow receives derived editor nodes and edges.

### Conversion

- Canonical node -> editor node:
  - `id`: canonical node id
  - `type`: canonical node type
  - `position`: canonical node position or default position
  - `data`: canonical node plus validation state
- Canonical edge -> editor edge:
  - `id`: canonical edge id
  - `source`: source node id
  - `sourceHandle`: source port id
  - `target`: target node id
  - `targetHandle`: target port id

### Edit translation

Editor interactions produce canonical graph mutations:
- Add node: create canonical node with generated ID and default position.
- Move node: update canonical node position.
- Connect: create canonical edge after validation.
- Disconnect: remove canonical edge.
- Delete: remove canonical node/edge.
- Configuration edit: update canonical node config, then revalidate.

React Flow transient state such as viewport, selection, and drag state must remain editor-only.

## 4. Six-node UI proposal

1. On Start
   - Source node with one execution output.
2. Manual Trigger
   - Source node with one execution output.
3. On Plane Contact
   - Source node with target entity reference and one execution output.
4. Apply Force
   - Action node with execution input/output and force vector summary.
5. Apply Impulse
   - Action node with execution input/output and impulse vector summary.
6. Clear Force
   - Action node with execution input/output and target summary.

Each node displays:
- Title and type label.
- Port handles.
- Configuration summary.
- Validation error/warning state.
- Selected state.

## 5. Studio Shell integration proposal

Recommended placement:
- Logic Editor panel becomes the graph canvas host.
- Node palette can be a compact panel or section within the Logic Editor.
- Inspector gains a Graph Node Configuration section when a graph node is selected.
- Validation diagnostics can be shown in the Console and/or a compact graph status area.
- TopBar Play/Pause/Stop/Reset remain unchanged.

Default presets should keep the graph editor accessible in the Program preset and collapsed elsewhere if needed.

## 6. State ownership and editing behavior

- Canonical graph state should be stored in the Studio state as a project-level graph document or entity-scoped graph, depending on the eventual M2-E persistence design. For M2-B, use an in-memory graph document in Studio state.
- React Flow nodes/edges are derived in the component layer.
- Validation runs after node creation, connection changes, configuration changes, and before future save/execution.
- Invalid connections should be prevented where possible and otherwise reported as diagnostics.
- Graph edits are structural authoring operations and should be blocked while running or paused, consistent with M1-B.

## 7. Validation UX design

- Validation diagnostics should include code, severity, message, nodeId, edgeId, and field.
- The UI should highlight invalid nodes/edges.
- The Console should display graph diagnostics.
- Invalid graph state should not silently repair data.
- Configuration errors should be shown in the Inspector.

## 8. Implementation batches

### Batch 1 — Dependency and foundation
- Add React Flow dependency.
- Create adapter module.
- Add graph editor component shell.
- Add unit tests for adapter mapping.

### Batch 2 — Custom nodes and palette
- Implement six custom node renderers.
- Add node palette.
- Add node creation and deletion.

### Batch 3 — Connections and inspector
- Implement port handles and connection validation.
- Add graph node configuration in Inspector.
- Add edge deletion.

### Batch 4 — Validation diagnostics and UX
- Integrate validation diagnostics into UI.
- Add empty state and selected node state.
- Add responsive behavior.

### Batch 5 — Browser acceptance and regression
- Add Playwright scenarios.
- Capture screenshots.
- Run full regression and build.

## 9. Acceptance criteria

M2-B is complete when:
1. Logic Editor hosts a React Flow graph canvas.
2. All six approved node types can be created and rendered.
3. Nodes can be moved, selected, and deleted.
4. Ports can be connected and disconnected with validation.
5. Canonical graph remains the source of truth.
6. React Flow internal state is not persisted as authoritative data.
7. Invalid connections are prevented or reported.
8. Node configuration can be edited through the Inspector.
9. Validation diagnostics are visible.
10. Empty graph state is handled.
11. Existing Studio Shell and MVP-1 functionality remain intact.
12. Unit/integration tests pass.
13. Browser acceptance evidence is produced.

## 10. Risks and unresolved decisions

- Graph state ownership and persistence integration are not yet finalized; M2-E will address persistence.
- Undo/redo may be deferred if it expands scope.
- React Flow CSS and responsive layout require careful integration.
- Large graph performance must be measured before mandatory targets.
- Object reference editing UX needs refinement during implementation.