# SimuForge — MVP-2 Owner Decision Package

**Date:** 2026-11-11  
**Status:** Pending Project Owner review; implementation NOT AUTHORIZED

## Required decisions before MVP-2 implementation

### D-M2-01 — MVP-2 scope
- Question: Should MVP-2 implement full Product Spec §7.4 visual scripting?
- Recommendation: Yes, limited to basic event/action nodes, object references, connections, serialization, validation, and UI-independent execution.
- Consequence: Defines the next verifiable increment.

### D-M2-02 — Visual scripting library
- Question: Use Rete.js, LiteGraph.js, or a custom graph model?
- Recommendation: Start with a custom minimal graph data model and validation; defer heavy library selection until POC 3 evidence.
- Consequence: Lower initial risk, but may require later migration.

### D-M2-03 — Graph execution model
- Question: How should graph execution be scheduled and cancelled?
- Recommendation: Event-driven execution with explicit cancellation/timeout, independent of UI callbacks.
- Consequence: Requires new runtime subsystem.

### D-M2-04 — Node scope
- Question: Which basic nodes are required for MVP-2?
- Recommendation: ButtonPressed event, ApplyForce action, object reference, and literal value nodes.
- Consequence: Keeps MVP-2 small and testable.

### D-M2-05 — Python timing
- Question: Should Python be included in MVP-2?
- Recommendation: No; keep Python as a later increment after visual scripting works end to end.
- Consequence: Preserves MVP-2 focus.

### D-M2-06 — Robotics and electrical domains
- Question: Should domain simulation begin in MVP-2?
- Recommendation: No; defer to post-MVP-2.
- Consequence: Avoids overloading MVP-2.

### D-M2-07 — 2D and hybrid simulation
- Question: Should 2D be included in MVP-2?
- Recommendation: No; remains deferred pending POC 6.
- Consequence: Maintains 3D-first MVP boundary.

### D-M2-08 — Performance target
- Question: Should MVP-2 define mandatory performance numbers?
- Recommendation: Measure first; no mandatory numeric target yet, consistent with D-06.
- Consequence: Avoids premature optimization.