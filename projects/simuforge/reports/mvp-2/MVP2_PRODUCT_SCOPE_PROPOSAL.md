# SimuForge — MVP-2 Product Scope Proposal

**Date:** 2026-11-11  
**Status:** APPROVED planning scope; implementation NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`

## 1. Approved MVP-2 goal

Deliver Visual Scripting (Product Spec §7.4) as the next verifiable increment on top of MVP-1, using phased milestones and browser-level acceptance.

## 2. Approved in scope

- Basic event nodes and basic action nodes.
- Object references.
- Graph connections.
- Graph serialization and validation.
- Execution through a runtime independent of UI callbacks.
- Six initial nodes: On Start, Manual Trigger, On Plane Contact, Apply Force, Apply Impulse, Clear Force.
- React Flow (`@xyflow/react`) as the graph editor presentation dependency, behind a SimuForge-owned adapter.
- Integration with the existing force/impulse runtime.
- Browser acceptance for the end-to-end button-to-force scenario.
- Save/reopen validation of graphs.

## 3. Explicitly deferred

- Python runtime and Python Editor.
- Robotics & Automation domain.
- Electrical & Electronic Systems domain.
- 2D simulation and hybrid 2D/3D.
- Advanced physics, joints, friction, restitution, CCD.
- Loops, branches, variables, math nodes, and delay nodes.
- Custom components and extension marketplace.
- Multi-user collaboration and cloud publishing.

## 4. Library and data ownership

- SimuForge owns the canonical graph data model, schema, validation, and execution semantics.
- React Flow is a presentation/editor dependency, not the canonical project data format.
- Do not persist React Flow's internal representation as the authoritative project graph.

## 5. Success definition

MVP-2 is successful when a user can create, save, reopen, validate, and execute a visual graph that applies force to a simulation object without depending solely on UI callbacks.