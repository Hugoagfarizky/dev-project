# Phase 10 — Extensibility: Decision Package

**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL  
**Date:** 2026-11-18

## Decision register

### D-P10-01 — Extension scope boundary

- **Context:** Phase 10 must be bounded to avoid scope creep into marketplace/cloud.
- **Options:** A: Local-first extension system (custom components + modules); B: Full marketplace.
- **Recommended:** A.
- **Rationale:** Bounded, reuses existing architecture, lower risk, consistent with ADR 0001.
- **Consequences:** Marketplace and cloud distribution remain deferred.

### D-P10-02 — Extension runtime model

- **Context:** Extensions may contain code; must not freeze Studio or breach security.
- **Options:** A: Web Worker isolation (reuse Python worker pattern); B: Main-thread sandboxed eval.
- **Recommended:** A.
- **Rationale:** Consistent with ADR 0001 principle 4 and Phase 07 worker approach.
- **Consequences:** Serialization overhead; startup cost; best-effort isolation, not hardened sandbox.

### D-P10-03 — Extension API surface

- **Context:** Extensions need stable contracts.
- **Options:** A: Minimal API (component registration, tick hook, event emit/subscribe); B: Full engine API.
- **Recommended:** A.
- **Rationale:** Stable, auditable, lower risk. Full API deferred.
- **Consequences:** Extension capabilities limited to declared hooks.

### D-P10-04 — Custom component persistence

- **Context:** Custom components must persist in projects.
- **Options:** A: Store component type + config in project.world (schema v1); B: Separate extension data section.
- **Recommended:** A.
- **Rationale:** Reuses existing component serialization (Phase 08). Backward compatible.
- **Consequences:** Older readers ignore unknown component types with warnings.

### D-P10-05 — Extension storage

- **Context:** Where extensions are stored.
- **Options:** A: Project-local (embedded in project or sidecar); B: Global browser storage.
- **Recommended:** A for v1 (project-local), with optional global registry later.
- **Rationale:** Portability, no cross-project leakage.
- **Consequences:** Extensions must be re-installed per project unless shared.

### D-P10-06 — Permission model

- **Context:** Extensions may need capabilities.
- **Options:** A: Declarative permission manifest (read world, write components, run simulation hooks); B: Full access.
- **Recommended:** A.
- **Rationale:** Least privilege, auditable.
- **Consequences:** Extensions cannot access undeclared capabilities.

### D-P10-07 — Testing depth

- **Recommended:** Unit + integration + E2E smoke + full regression.
- **Rationale:** Consistent with Phase 08/09 approach.

## Classification

- **Established by ADR 0001:** modular monolith, ECS, fixed timestep, editor/runtime separation, worker-based execution, event/data channels, versioned data. Not reopened.
- **Within existing architecture:** component registry extension, validation framework, runtime state slices, tabbed UI, graph node registration.
- **New decisions requiring approval:** D-P10-01..07.

## Risks

- Security: worker isolation is defense-in-depth, not a sandbox.
- API stability: minimal v1 API limits future breakage.
- Backward compatibility: unknown component types must not break project loading.
