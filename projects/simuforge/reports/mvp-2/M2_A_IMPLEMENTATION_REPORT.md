# SimuForge — M2-A Implementation Report

**Date:** 2026-11-11  
**Milestone:** M2-A — Graph Data Model and Validation  
**Status:** IMPLEMENTED / READY FOR PROJECT OWNER ACCEPTANCE  
**Authorization:** Project Owner authorized M2-A implementation only (M2-B and later remain NOT AUTHORIZED)  
**Implementation commit:** pending; recorded in the follow-up documentation commit

## 1. Scope

M2-A implements the canonical visual scripting graph data model, node/port definitions, connection rules, validation, and serialization. It does not implement graph UI, execution, persistence integration, demo scenarios, or deferred node types.

## 2. Canonical graph model

- Graph format: `simuforge.graph`
- Schema version: `1`
- Files:
  - `app/src/graph/types.ts`
  - `app/src/graph/nodes.ts`
  - `app/src/graph/validation.ts`
  - `app/src/graph/serialization.ts`

The graph domain has no React, React Flow, Babylon, DOM, runtime execution, or IndexedDB dependencies.

## 3. Initial node set

1. On Start
2. Manual Trigger
3. On Plane Contact
4. Apply Force
5. Apply Impulse
6. Clear Force

Node configurations use discriminated unions and explicit target entity references. Apply Force and Apply Impulse require finite vectors. Clear Force requires only a target.

## 4. Ports and connections

- Ports are execution ports only in M2-A.
- Each node declares its input/output execution ports.
- Edges connect an output port to an input port.
- Port direction and kind compatibility are validated.
- Duplicate connections are rejected.
- Graph cycles are rejected because loops are deferred.

## 5. Validation rules

Stable diagnostic codes cover:
- Missing/empty graph id or name
- Duplicate node ids
- Unsupported node types
- Invalid node configuration
- Missing/invalid target entity
- Static plane targets for force/impulse
- Non-finite force/impulse vectors
- Missing/empty edge id
- Duplicate edge ids
- Missing source/target node
- Missing source/target port
- Port direction mismatch
- Port kind mismatch
- Duplicate connections
- Unsupported cycles

Validation does not mutate input and avoids exceptions for ordinary invalid authored graph data.

Object references are validated through an injected `GraphValidationContext` containing entities and their rigidBody components.

## 6. Serialization

- `serializeGraphDocument` produces canonical JSON.
- `parseGraphDocument` validates JSON, format, schema version, and graph validity.
- Malformed or unsupported input is rejected safely.

No IndexedDB or project persistence integration was added.

## 7. Tests

- `app/test/graph/graph.test.ts`: 12 tests
- Full suite: 198/198 PASS (186 baseline + 12 new)
- Typecheck: PASS
- Build: PASS
- Boundary check: PASS

## 8. Known limitations

- No React Flow adapter yet (M2-B).
- No graph execution runtime (M2-C).
- No project persistence integration (M2-E).
- No deferred node types.
- Cycle detection rejects all cycles; loop semantics are deferred.
- Object reference validation currently checks entity existence and enabled rigidBody, not full runtime suitability.

## 9. Scope exclusion confirmation

No graph UI, execution engine, demo, browser visual scripting workflow, persistence integration, Python, robotics, electrical systems, 2D/hybrid simulation, or deferred node types were implemented.