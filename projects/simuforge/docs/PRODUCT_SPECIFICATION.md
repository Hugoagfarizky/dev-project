# SimuForge — Product Specification

## Document Metadata

| Field | Value |
| --- | --- |
| Version | 0.2 — Draft |
| Date | 2026-10-31 |
| Status | Concept definition |
| Owner role | Product Owner, SimuForge |
| Supersedes | 0.1 — Draft (2026-10-31) |
| Language | English |
| Product name | SimuForge |
| Tagline | Build. Program. Simulate. |
| Product type | Browser-based programmable simulation sandbox |

### Changelog

| Version | Date | Summary |
| --- | --- | --- |
| 0.2 | 2026-10-31 | Translated into English; split the MVP into independently verifiable increments with acceptance criteria; moved Python out of the initial vertical slice; defined the MVP 2D boundary; replaced the architecture section with a summary that refers to the architecture document and ADR 0001; mapped the POCs to development phases; added metadata and changelog; clarified runtime state transitions and domain scope. |
| 0.1 | 2026-10-31 | Initial draft. |

This document defines product behavior, capabilities, boundaries, and requirements. Architecture and technical design are documented in [`docs/architecture/ARCHITECTURE.md`](../../../docs/architecture/ARCHITECTURE.md) and in Architecture Decision Records under [`docs/decisions/`](../../../docs/decisions/README.md).

## 1. Product Vision

SimuForge is a programmable simulation platform that lets users build virtual environments, create objects and systems, program their behavior, and run interactive simulations.

Users can combine 2D and 3D environments, use either visual scripting or Python, and connect simulation components together.

SimuForge focuses on building and testing simulations, not on making games.

## 2. Target Users

SimuForge is intended for:

- Beginners who want to learn simulation and programming.
- Students and learners.
- Developers and programmers.
- Enthusiasts of mechanical and physics experiments.
- Users who want to build robotic system simulations.
- Users who want to learn electrical and electronic systems.

## 3. Core Product Principles

1. **Empty by Default:** A new project starts with an empty world.
2. **Programmable:** Object and system behavior can be programmed.
3. **Hybrid 2D/3D:** 2D and 3D can be used within one project. This is a long-term vision; the MVP is 3D-first (see §7.1).
4. **Modular:** Systems are built from components and modules that can be extended.
5. **Simulation First:** Core features must support building, controlling, and observing simulations.
6. **Progressive Complexity:** Users can start with simple simulations and grow into more complex systems.

## 4. Core Product Pillars

### 4.1 World Creation

Create simulation environments, objects, materials, lighting, and world structure.

### 4.2 Object & Component System

Create objects from primitives, assets, or custom objects. Objects can carry components that define their characteristics and behavior.

### 4.3 Programmable Behavior

Author logic using visual scripting and Python.

### 4.4 Simulation Engine

Run physics, motion, interaction, and simulation processes.

### 4.5 Simulation Domains

Planned simulation domains:

- Physics & Mechanics
- Robotics & Automation
- Electrical & Electronic Systems

Robotics & Automation and Electrical & Electronic Systems are product domains. They are not commitments for the initial MVP; see §7.3 and §12.

### 4.6 Extensibility

Support Custom Components and Custom Simulation Modules through an API and an extension system.

## 5. Simulation Studio

The Studio is the main workspace and provides the following panels:

- World View
- Hierarchy
- Inspector
- Asset Library
- Logic Editor
- Python Editor
- Simulation Monitor
- Console

Panels must be customizable and arrangeable to suit the user's needs.

## 6. Simulation Workflow

The primary user flow:

1. Create a new project.
2. Build the world and objects.
3. Add components.
4. Author behavior with visual scripting or Python.
5. Configure simulation parameters.
6. Run the simulation.
7. Observe results in the Simulation Monitor.
8. Stop or reset the simulation.
9. Make changes and test again.

### Runtime Rules

- While a simulation is running, world structure, scripts, and configuration are locked.
- Controls explicitly marked as runtime controls remain editable.
- Users must pause or stop before making structural changes.
- The runtime must expose explicit states: Editing, Preparing, Running, Paused, and Stopped.

### Runtime State Transitions

| State | Meaning | Allowed transitions |
| --- | --- | --- |
| Editing | Authoring state. Structural edits and configuration changes are allowed. | Preparing when the user starts the simulation. |
| Preparing | Runtime is being created from the authored project; validation and initialization happen here. Structural edits are blocked. | Running when preparation succeeds; Editing if preparation fails. |
| Running | Simulation is advancing. Structural edits are blocked; runtime controls remain available. | Paused, Stopped, or a reset that re-enters Preparing. |
| Paused | Simulation is frozen at its current runtime state. Structural edits are still blocked. | Running to continue, Stopped, or a reset that re-enters Preparing. |
| Stopped | The runtime has ended and is discarded. | Editing, where the authored project state is available again. |

Additional rules:

- Editor state (the authored project) and runtime state (a simulation instance) are separate. Stopping discards the runtime instance and returns the user to the authored project in Editing.
- Reset reinitializes the runtime from the initial snapshot: from Running or Paused it re-enters Preparing, then returns to Running; when reset from Paused, it returns to Paused at the initial snapshot.
- Structurally editing the project is only possible in Editing.

## 7. MVP Scope — Build, Program, Run

The MVP must prove that a user can build a simple simulation from scratch and run it. To keep the work verifiable, the MVP is divided into four increments: MVP-0 to MVP-3.

### 7.1 Dimensional Boundary

- The MVP is **3D-first**.
- Basic 2D support is **not delivered by the MVP**; it is not part of the initial vertical slice.
- A separate 2D simulation solver and a cross-dimensional physics bridge are deferred.
- Full hybrid 2D/3D interaction remains a long-term goal and is documented as an open question in §14.
- POC 6 (Hybrid 2D/3D) remains a required validation activity before the long-term design is finalized (see §11).
- Nothing in this specification should be read as claiming that 2D simulation is already delivered.

### 7.2 MVP-0 — Studio & World Foundation

Included:

- Browser-based Studio shell.
- Create an empty project.
- Basic 3D viewport.
- Editor camera and grid.
- Create primitive objects.
- Select and transform objects.
- Basic hierarchy and Inspector.
- Save and reopen a project locally.

Acceptance criteria:

- A new project starts without world objects.
- Editor-only camera and grid are not serialized as world entities.
- A user can create, select, move, rotate, and scale a primitive.
- Hierarchy and viewport reflect the same world state.
- A saved project can be reopened with its objects and transforms preserved.
- No data loss occurs during a normal save/reopen cycle in the tested scenario.

### 7.3 MVP-1 — Components & Basic Physics

Included:

- Basic component system.
- Rigid body component.
- Gravity.
- Collision.
- Force or impulse application.
- Play, pause, stop, and reset.

Acceptance criteria:

- A ball with a rigid body responds to gravity.
- A floor can prevent the ball from passing through it.
- Applying a force or impulse changes the ball's motion.
- Pause freezes simulation progression.
- Resume continues from the paused state.
- Reset returns the simulation to its initial state.
- Structural edits are blocked while running.
- Runtime controls explicitly marked as editable remain usable.

### 7.4 MVP-2 — Visual Scripting

Included:

- Basic event nodes.
- Basic action nodes.
- Object references.
- Graph connections.
- Graph serialization and validation.
- Execution through a runtime independent of UI callbacks.

Acceptance criteria:

- A user can create a graph connecting a button event to a force action.
- The graph can be saved and reopened.
- Invalid or incomplete graphs produce understandable validation errors.
- Triggering the event applies the configured force to the target object.
- Graph execution does not depend solely on editor UI callbacks.

### 7.5 MVP-3 — Integrated Demonstration & Monitoring

Included:

- Complete floor, ball, and button scenario.
- Simulation Monitor.
- Basic runtime logs and errors.
- End-to-end validation.

Acceptance criteria:

- A user can create the demonstration from an empty project.
- Triggering the button moves the ball.
- Collision with the floor behaves correctly.
- Pause, resume, and reset work in the complete scenario.
- Runtime errors are visible to the user.
- The demonstration can be saved and reopened.

### 7.6 Excluded from the Initial MVP

- Advanced engineering simulation.
- Full robotics simulation.
- Full electrical circuit simulation.
- Complex mechanical assembly solver.
- Cloud collaboration.
- Public project publishing.
- Extension marketplace.
- Advanced multi-user functionality.
- Python integration in the initial vertical slice (see §8).
- A 2D solver and hybrid 2D/3D interaction (see §7.1).

These capabilities may be considered in later phases.

### 7.7 MVP Demonstration Scenario

The end-to-end scenario validated by MVP-3:

1. The user creates an empty project.
2. The user creates a floor and a ball.
3. The user adds a physics component to the ball.
4. The user creates a button.
5. The user connects the button event to a visual graph.
6. The event applies a force to the ball.
7. The user runs the simulation.
8. The ball moves and interacts with the floor.

## 8. Python Runtime (Planned, After the Initial Slice)

Python remains part of the product vision (see §4.3) and of the long-term programming experience. It is **not** part of the initial vertical slice (MVP-0 to MVP-3).

- Python support is a separate increment, validated after the initial visual-scripting workflow works end to end.
- Python Editor is a Studio panel in the long-term design, but it is not required for the initial MVP increments.
- Acceptance criteria for Python must be defined before implementation begins and must cover:
  - controlled API access,
  - worker isolation,
  - execution cancellation or timeout,
  - error reporting,
  - resource limits,
  - UI responsiveness during execution.
- Final resource limits must not be invented in advance; they will be established by POC evidence.

POC 4 (Python Runtime) is the validation activity for this increment (see §11).

## 9. Architecture Summary

Product behavior is specified here. Architecture structure and technical design are owned by [`docs/architecture/ARCHITECTURE.md`](../../../docs/architecture/ARCHITECTURE.md) and must not be duplicated in this document.

The proposed architectural direction is a modular monolith composed of seven cooperating components, communicating through events and data channels. The direction and the technical principles that still require validation are recorded in [ADR 0001](../../../docs/decisions/0001-proposed-architecture-direction.md), which has status `proposed` and is not an approved design.

Technology choices remain provisional. No library or runtime is selected by this specification.

## 10. Technology Candidates

The following are **research candidates only**. They are not selected, not approved, and not commitments. Final selection requires POC evidence and an ADR.

| Area | Candidate |
| --- | --- |
| Frontend | React + TypeScript + Vite |
| 3D Rendering | Babylon.js |
| Physics | Rapier 2D + Rapier 3D |
| Visual Scripting | Rete.js / LiteGraph.js |
| Python Runtime | Pyodide in Web Worker |
| Local Persistence | IndexedDB / Dexie.js |
| 3D Asset Format | GLB / glTF |

Final selection must consider performance, integration, maintainability, licensing, and security.

## 11. Development Validation

Before primary technologies are adopted, run the following POCs separately:

1. World Editor
2. Physics Runtime
3. Visual Scripting
4. Python Runtime
5. Integrated Simulation
6. Hybrid 2D/3D

Each POC must produce:

- purpose and constraints,
- test cases,
- test results,
- performance observations,
- limitations,
- licensing and security review,
- evaluation score,
- recommendation.

A POC that only demonstrates a simple demo is not sufficient evidence.

### POC to Phase Mapping

| POC | Product development phase | Purpose and gate |
| --- | --- | --- |
| 1. World Editor | Phase 01 — Studio Application Foundation; Phase 02 — World & Rendering Engine | Validate the editor shell, viewport, scene graph, and project serialization before Phase 02 is considered validated. |
| 2. Physics Runtime | Phase 05 — Physics & Simulation Core | Validate time stepping, collision, force application, pause, and reset before Phase 05 is considered validated. |
| 3. Visual Scripting | Phase 06 — Visual Scripting | Validate the graph data model, validation, serialization, and execution runtime before Phase 06 is considered validated. |
| 4. Python Runtime | Phase 07 — Python Runtime | Validate worker isolation, restricted API access, cancellation or timeout, and error reporting before Phase 07 begins. |
| 5. Integrated Simulation | Integration gate across Phases 01–06, before Phase 07 | Validate cross-module communication and the end-to-end vertical slice. |
| 6. Hybrid 2D/3D | Post-MVP; before the long-term design is finalized (informs Phases 08–11) | Validate 2D/3D coexistence and interaction, which are deferred beyond the MVP. |

## 12. Product Development Strategy

Development proceeds in phases:

| Phase | Name |
| --- | --- |
| 00 | Repository & Engineering Foundation |
| 01 | Studio Application Foundation |
| 02 | World & Rendering Engine |
| 03 | Object & Component System |
| 04 | Project & Persistence System |
| 05 | Physics & Simulation Core |
| 06 | Visual Scripting |
| 07 | Python Runtime |
| 08 | Electrical & Electronics |
| 09 | Robotics & Automation |
| 10 | Extensibility |
| 11 | Quality, Performance & Release |

Each phase must pass validation before the next phase begins.

### MVP Increment to Phase Mapping

| Increment | Product development phases |
| --- | --- |
| MVP-0 — Studio & World Foundation | Phases 01–04 |
| MVP-1 — Components & Basic Physics | Phases 03 and 05 |
| MVP-2 — Visual Scripting | Phase 06 |
| MVP-3 — Integrated Demonstration & Monitoring | Integration across Phases 01–06 |

Increments overlap phases because they validate slices of the product rather than phases in isolation: MVP-1 uses the component system delivered by Phase 03 while validating the simulation core from Phase 05, and MVP-3 is an integration increment that exercises Phases 01–06 end to end. MVP-0 depends on the repository foundation in Phase 00 and must precede MVP-1.

Electrical & Electronics (Phase 08) and Robotics & Automation (Phase 09) are post-MVP product domains. They are not part of the initial MVP commitments.

## 13. Non-Goals

SimuForge is not intended to be:

- a general-purpose game engine,
- a game publishing platform,
- a complete replacement for professional engineering simulation software at the MVP stage,
- a social media platform,
- a cloud collaboration platform at the early stage.

## 14. Open Questions

The following are not final decisions:

- Should the initial experience prioritize visual scripting or Python?
- How should 2D and 3D coordinate spaces, solvers, and interactions be unified? This is deferred beyond the MVP; POC 6 must inform the answer.
- How much physical realism is required for the MVP?
- How should the API for Custom Components be designed?
- How should permissions and isolation for Custom Simulation Modules work?
- What resource limits should apply to Python execution? These must be established by POC 4 evidence.
- What performance targets are realistic for browsers and user devices?
- What format should be used for project export and import?
- What acceptance thresholds should each future phase use beyond the MVP criteria in §7?

## 15. Current Status

This document is the basis for discussion and planning, not a final specification.

Implementation may begin only after:

- the MVP scope is approved,
- the base architecture is reviewed,
- the POC plan is approved,
- acceptance criteria for each phase are defined.

None of these conditions have been met yet. No implementation, proof of concept, or benchmark exists.
