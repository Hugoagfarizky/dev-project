# SimuForge — MVP-2 Product Scope Proposal

**Date:** 2026-11-11  
**Status:** Discovery proposal; implementation NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`

## 1. Proposed MVP-2 goal

Deliver **Visual Scripting (Product Spec §7.4)** as the next verifiable increment: users can create a graph connecting a button event to a force action, save/reopen it, validate it, and execute it through a runtime independent of UI callbacks.

## 2. Recommended in scope

- Basic event nodes.
- Basic action nodes.
- Object references.
- Graph connections.
- Graph serialization and validation.
- Graph execution through a runtime independent of UI callbacks.
- Integration with the existing force/impulse runtime.
- Browser acceptance for the end-to-end button-to-force scenario.
- Save/reopen validation of graphs.

## 3. Explicitly deferred

- Python runtime and Python Editor.
- Robotics & Automation domain.
- Electrical & Electronic Systems domain.
- 2D simulation and hybrid 2D/3D.
- Advanced physics, joints, friction, restitution, CCD.
- Custom components and extension marketplace.
- Multi-user collaboration.
- Cloud publishing.

## 4. Candidate classification

### Recommended for MVP-2
- Visual scripting graph model.
- Graph validation and serialization.
- Graph execution runtime.
- Button event to force action integration.
- Browser acceptance.

### Deferred to later milestones
- Python runtime.
- Advanced physics.
- Custom components.
- Performance optimization beyond measurement.

### Requires research or proof of concept
- Visual scripting library selection (Rete.js/LiteGraph.js or custom).
- Graph execution scheduling and cancellation.
- Large graph performance.

### Not recommended now
- Robotics and electrical domains before visual scripting is stable.
- 2D/hybrid physics before 3D foundation is proven.
- Cloud collaboration.

## 5. Success definition

MVP-2 is successful when a user can create, save, reopen, validate, and execute a visual graph that applies force to a simulation object without depending solely on UI callbacks.