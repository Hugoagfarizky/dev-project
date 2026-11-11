# SimuForge — M2-B Implementation Plan

**Date:** 2026-11-11  
**Milestone:** M2-B — Graph Editor UI  
**Status:** PLANNING COMPLETE / PENDING IMPLEMENTATION AUTHORIZATION  
**Baseline:** M2-A CLOSED — PASS @ `2fb957bb378672198a1ed3a868f3a7be87e495a8`

## Proposed batches

### Batch 1 — Dependency and adapter foundation
- Add `@xyflow/react`.
- Create adapter between canonical graph and React Flow.
- Add unit tests for mapping and ID preservation.

### Batch 2 — Canvas and custom nodes
- Implement graph canvas in Logic Editor.
- Implement six custom node renderers.
- Add node palette.
- Add node creation/deletion and empty state.

### Batch 3 — Connections and Inspector configuration
- Implement port handles and connection validation.
- Add edge deletion.
- Add Inspector graph node configuration.

### Batch 4 — Validation diagnostics and responsive UX
- Surface validation diagnostics in Console and UI.
- Add selected node state and responsive behavior.
- Add browser smoke tests.

### Batch 5 — Browser acceptance and regression
- Add Playwright scenarios.
- Capture screenshots.
- Run full regression, typecheck, build, boundary, token, Node checks.

## Acceptance criteria

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

## Evidence required

- Adapter unit tests.
- Browser screenshots.
- Playwright JSON evidence.
- Regression results.

## Explicit exclusions

No graph execution, event dispatch, Apply Force/Impulse execution from graph nodes, cancellation tokens, Pause/Stop/Reset graph execution integration, Python, loops/branches/variables/math/delay nodes, IndexedDB graph persistence, project save/reopen graph integration, robotics, electrical systems, 2D/hybrid simulation, or unrelated Studio Shell redesign.