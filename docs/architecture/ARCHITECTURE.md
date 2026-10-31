# Architecture

Architecture documentation is owned per project. There is no single architecture for this repository: `dev-project` is a workspace, and each project under `projects/` maintains its own architecture document describing its modules, boundaries, data flow, and constraints.

Rules for project architecture documents:

- They describe the system as it exists, and label anything not yet built as proposed.
- They are updated in the same change as the code they describe.
- Decisions that are expensive to reverse are recorded as ADRs in [`../decisions/README.md`](../decisions/README.md).

## SimuForge — provisional outline

Status: **provisional, not validated.** This is a high-level decomposition only. It is subject to change, and no component below should be treated as a committed design or an existing implementation. Validation happens through a proof of concept before any production work begins.

Product scope and requirements are defined in the [SimuForge product specification](../../projects/simuforge/docs/PRODUCT_SPECIFICATION.md). The current architectural direction is recorded in [ADR 0001](../decisions/0001-proposed-architecture-direction.md) with status `proposed`.

### Studio Application

The browser-based authoring surface. Hosts the scene view, inspectors, asset organization, and the programming editors. It is a client of the engines below and holds no simulation authority of its own.

### World Engine

Owns the state of a world: entities, components, spatial layout, and scene composition. Provides the model the simulation acts on and the studio edits.

### Programming Engine

Compiles and interprets user-authored behaviors — visual scripts and Python — into executable logic. Defines the interface between user programs and the simulation, including the capabilities those programs are allowed to use.

### Simulation Core

Advances the world over time: scheduling, time stepping, and the ordering guarantees that make a simulation reproducible.

### Simulation Modules

Optional, composable capabilities layered on the core, such as physics, sensors, and domain-specific rules. Modules extend the simulation without changing the core.

### Project & Data System

Persists projects: documents, assets, program sources, and simulation state. Defines versioning and the boundary between local and remote storage.

### Extension Layer

The contract for adding objects, behaviors, modules, and integrations without modifying the core. Intended to keep the platform open to third-party and future first-party additions.

### Open questions

Deferred until a proof of concept:

- Execution model for user programs (main thread, worker, or isolated runtime).
- Determinism and replay requirements, and their effect on time stepping.
- Data format and versioning strategy for projects.
- Boundary between visual scripting and Python, and how the two interoperate.
- Scope of the extension layer for a first release.

No technology choices are recorded here. Validated decisions will be documented as ADRs.
