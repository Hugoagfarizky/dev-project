# 0001. Proposed architecture direction for SimuForge

- Status: proposed
- Date: 2026-10-31
- Project: simuforge

## Context

SimuForge is in the concept definition stage. The [product specification](../../projects/simuforge/docs/PRODUCT_SPECIFICATION.md) defines the MVP increments and their acceptance criteria, and the [architecture document](../architecture/ARCHITECTURE.md) records a provisional component outline. Neither document selects a technology stack, and no code, test, or POC exists yet.

The project needs a recorded architectural direction so that implementation decisions have a reference point, without implying that the direction has been validated. Recording it as `proposed` keeps it open to change while making the assumptions explicit and reviewable.

This ADR does not select libraries, frameworks, runtimes, or storage engines. Those remain research candidates in the product specification and require POC evidence plus a separate ADR.

## Decision

The proposed architectural direction is a **modular monolith** with seven components, matching the naming in the architecture document:

- Studio Application
- World Engine
- Programming Engine
- Simulation Core
- Simulation Modules
- Project & Data System
- Extension Layer

The monolith is proposed because the product is a single browser application with tightly coupled editing and simulation concerns, and because a distributed or service-based architecture would add operational cost without validated benefit at this stage.

The following technical principles are **proposed for validation**. Each one is a hypothesis to be tested by the POCs identified in the product specification, not an approved decision.

### 1. Entity-Component System

- **Context:** Worlds contain heterogeneous objects whose capabilities differ per object, and the editor and runtime must share one world model.
- **Proposed approach:** Entities are identifiers, components hold data, and systems operate over components. The editor and runtime read the same world model.
- **Alternatives considered:** Class-inheritance object model; scene graph with per-node scripts; a hybrid where only simulation-relevant state is componentized.
- **Benefits:** Composition instead of deep hierarchies; predictable serialization; easier reuse of the same model by editor and runtime; systems can be tested in isolation.
- **Trade-offs and risks:** Indirection makes debugging harder; component ordering and lifecycle rules must be defined; a full ECS may be heavier than the MVP needs; schema evolution affects stored projects.
- **Validation still required:** POC 2 and MVP-1 must confirm that the model stays understandable and fast enough for the target devices, and that Inspector binding does not require excessive boilerplate.

### 2. Fixed Timestep Simulation

- **Context:** Simulation results should be stable and repeatable, and pause, resume, and reset must behave predictably.
- **Proposed approach:** Advance simulation in fixed steps decoupled from rendering, with an explicit catch-up policy and optional render interpolation.
- **Alternatives considered:** Variable timestep driven by frame delta; clamped variable timestep; fixed timestep with sub-stepping.
- **Benefits:** Stable physics behavior, reproducible test scenarios, clear pause and reset semantics.
- **Trade-offs and risks:** Catch-up loops can stall a slow device; interpolation adds complexity; step size affects both fidelity and cost; behavior may differ from expectations set by frame-rate-driven demos.
- **Validation still required:** POC 2 must measure stability, cost, and catch-up behavior, and establish a step size and maximum catch-up budget before MVP-1 is accepted.

### 3. Separation of Editor and Runtime State

- **Context:** The runtime rules lock structural edits while a simulation runs, and stopping must return the user to the authored project.
- **Proposed approach:** The authored project state is the source of truth. Starting a simulation builds a separate runtime instance from a snapshot; runtime controls are the only editable inputs; stopping discards the runtime instance.
- **Alternatives considered:** One mutable state with guard flags; forking the whole project per run; undo-based rollback.
- **Benefits:** Clear ownership of state; reset is well defined; authoring data cannot be corrupted by a running simulation; easier debugging and testing of the runtime boundary.
- **Trade-offs and risks:** Memory duplication for large worlds; synchronization bugs if data is shared by reference; extra indirection when inspecting runtime values.
- **Validation still required:** MVP-1 acceptance criteria for pause, resume, reset, and blocked structural edits; POC 5 must confirm the boundary holds across modules.

### 4. Worker-Based Python Execution with Restricted Capabilities

- **Context:** User-authored Python is untrusted code and must not freeze the Studio or reach capabilities it was not granted.
- **Proposed approach:** Execute Python in a Web Worker with a capability-limited API, an explicit message protocol, and cancellation or timeout support.
- **Alternatives considered:** Interpreter on the main thread; sandboxed iframe; remote execution service; no Python in the first release.
- **Benefits:** Keeps the UI responsive; a hung program can be terminated; the API surface is explicit and auditable.
- **Trade-offs and risks:** Worker isolation is not a complete security boundary by itself; message serialization costs; startup and memory overhead of an in-browser interpreter; temptation to widen the API beyond what is safe.
- **Validation still required:** POC 4 must measure startup, execution, and messaging costs, verify cancellation and error reporting, and support a threat-model review. Resource limits must come from POC evidence, not from guesses.

### 5. Event and Data Channels Between Modules

- **Context:** Seven components must cooperate without becoming tightly coupled, and the Extension Layer needs stable contracts.
- **Proposed approach:** Modules communicate through typed events and data channels with explicit ownership and documented ordering, rather than direct cross-module mutation.
- **Alternatives considered:** Direct method calls between modules; shared mutable global state; a network-style message bus.
- **Benefits:** Decoupling; testable boundaries; a natural extension point for third-party modules; easier tracing of cross-module behavior.
- **Trade-offs and risks:** Indirection obscures control flow; event ordering and reentrancy must be specified; debugging is harder without tracing; overuse can turn simple calls into event spaghetti.
- **Validation still required:** POC 5 must confirm that the contract supports the end-to-end scenario without ordering bugs, and that tracing remains usable.

### 6. Versioned Project Data and Migrations

- **Context:** Projects are stored locally and their schema will change as the product evolves.
- **Proposed approach:** Every saved project records a schema version. Loading runs an ordered migration chain, and migrations are tested like production code.
- **Alternatives considered:** No versioning, with best-effort loading; export/import converters only; a database-managed schema.
- **Benefits:** Older projects remain loadable; schema evolution is explicit; bug reports can name a version.
- **Trade-offs and risks:** Every schema change adds migration code and tests; a failed migration can lose user data; storage limits in the browser constrain retained history.
- **Validation still required:** MVP-0 save/reopen acceptance criteria plus an explicit migration test fixture; POC 1 must confirm serialization round-trips preserve the world model.

## Consequences

If this direction is adopted after validation:

- **Easier:** incremental delivery of MVP-0 to MVP-3, isolated testing of systems, predictable reset, and a stable extension contract.
- **Harder:** more explicit contracts up front, ongoing migration maintenance, and more indirection to trace during debugging.
- **Must be maintained:** documented module boundaries, migration tests, POC evidence for each principle, and an updated ADR whenever a principle changes.

Until this ADR is accepted, none of the above is binding. If a principle is rejected, a superseding ADR must record the replacement rather than editing this one.

## Validation Plan

| Principle | Validated by |
| --- | --- |
| Entity-Component System | POC 2, MVP-1 |
| Fixed timestep simulation | POC 2 |
| Editor and runtime state separation | MVP-1, POC 5 |
| Worker-based Python execution | POC 4 |
| Event and data channels | POC 5 |
| Versioned project data and migrations | MVP-0, POC 1 |

## References

- [SimuForge product specification](../../projects/simuforge/docs/PRODUCT_SPECIFICATION.md)
- [Architecture](../architecture/ARCHITECTURE.md)
- [How ADRs are written](README.md)
