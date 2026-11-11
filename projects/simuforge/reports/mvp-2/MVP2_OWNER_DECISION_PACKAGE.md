# SimuForge — MVP-2 Owner Decision Package

**Date:** 2026-11-11  
**Status:** APPROVED — implementation NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`

## Approved decisions

### D-M2-01 — Visual Scripting scope
**Status:** APPROVED.  
Adopt the full Product Spec §7.4 visual scripting direction through phased MVP-2 delivery. MVP-2 must be divided into independently verifiable milestones. This approval is not authorization to implement all of §7.4 immediately.

### D-M2-02 — Graph editor library
**Status:** APPROVED.  
Use React Flow (`@xyflow/react`) for the graph editor UI.

Architectural constraints:
- SimuForge owns its canonical graph data model and schema.
- SimuForge owns graph validation and execution semantics.
- React Flow is a presentation/editor dependency, not the canonical project data format.
- Do not persist React Flow's internal representation as the authoritative project graph.
- Define an explicit adapter/boundary between the application graph model and editor UI.

### D-M2-03 — Execution and cancellation model
**Status:** APPROVED.  
- Event-triggered, sequential graph execution.
- Use cancellation tokens or an equivalent explicit cancellation mechanism.
- Stop and Reset cancel active graph execution.
- Pause suspends graph progression consistently with the existing simulation lifecycle.
- Runtime errors are reported to the Console.
- Failed execution must not leave inconsistent or partially committed runtime state.

The final design must define behavior for cancellation, repeated events, invalid graph state, and runtime failures before implementation.

### D-M2-04 — Initial basic node set
**Status:** APPROVED.  
Six initial nodes:
1. On Start
2. Manual Trigger
3. On Plane Contact
4. Apply Force
5. Apply Impulse
6. Clear Force

Loops, branches, variables, math nodes, and delay nodes are deferred beyond the initial MVP-2 node set. The graph model should remain extensible without prematurely implementing deferred node types.

### D-M2-05 — Python
**Status:** APPROVED.  
Python scripting/runtime is deferred until after MVP-2. Do not introduce a Python runtime or Python execution dependency into MVP-2.

### D-M2-06 — Robotics and Electrical Systems
**Status:** APPROVED.  
Robotics & Automation and Electrical & Electronic Systems are deferred beyond MVP-2.

### D-M2-07 — 2D and hybrid simulation
**Status:** APPROVED.  
2D solver and hybrid 2D/3D simulation are deferred beyond MVP-2. MVP-2 builds on the existing 3D simulation foundation.

### D-M2-08 — Performance targets
**Status:** APPROVED.  
Measure performance before establishing mandatory numerical performance targets. Record reproducible performance measurements and relevant test conditions. Do not invent or impose arbitrary numeric acceptance thresholds.

## Scope boundary

These decisions approve MVP-2 planning and architecture direction only. MVP-2 implementation remains NOT AUTHORIZED. No milestone may start until explicit Project Owner authorization.