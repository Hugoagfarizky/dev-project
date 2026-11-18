# Phase 10 — Extensibility: Planning Report

**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL  
**Date:** 2026-11-18  
**Phase:** 10 — Extensibility  
**Baseline:** Phase 09 CLOSED — PASS (commit `a943aa90b9b6e88e8e659069cd66c5e60d799e29`)

## 1. Purpose

Phase 10 introduces an extension system enabling custom components and custom simulation modules
through a stable API. It is the final product-domain phase before quality/performance/release (Phase 11).

This is a planning document only. No implementation is authorized yet.

## 2. Objectives

1. Define a stable Extension API for custom components and custom simulation modules.
2. Provide an extension registration/discovery mechanism.
3. Enable third-party (user-authored) components to participate in the component registry,
   Inspector, serialization, and runtime lifecycle.
4. Enable custom simulation modules to hook into the fixed-timestep runtime.
5. Preserve all closed-phase behavior and backward compatibility.

## 3. Scope and boundaries

**In scope:**
- Extension manifest format and registration API.
- Custom component type registration (metadata, defaults, validation, serialization).
- Custom simulation module hooks (per-tick update, event handlers).
- Extension permission/isolation model (best-effort, consistent with Python worker approach).
- Extension lifecycle (load, enable, disable, unload) in Studio.
- Extension storage (project-local extensions).
- UI: extension manager panel, custom component appearance in palette/Inspector.

**Out of scope (deferred):**
- Extension marketplace / cloud distribution.
- Remote/untrusted code execution as a service.
- Full sandboxing (defense-in-depth only, per ADR 0001).
- Advanced physics plugins.
- Modifying existing ADR decisions.

## 4. User-facing capabilities

- Install/load a local extension (manifest + code).
- Custom components appear in the component palette and Inspector.
- Custom components serialize and persist in projects.
- Custom simulation modules run during simulation ticks.
- Enable/disable extensions per project.
- View extension status and diagnostics in Console (source: EXTENSION).

## 5. Dependencies

- Phase 09 closed (robotics foundation, component registry pattern).
- Component registry (`src/world/components.ts`).
- Validation framework (`src/world/validation.ts`).
- Runtime lifecycle (Play/Pause/Stop/Reset).
- Graph execution engine (optional hook points).
- Python runtime (optional: extensions may be Python-based or TS-based).

## 6. Reusable existing functionality

- Component registry and `createComponent`/`getComponentDefinition` (Phase 08).
- Serialization deep-clone of components.
- Validation framework (structural + type-specific).
- Runtime state slices and lifecycle.
- Console logging with source filtering.
- Tabbed Program dock (StudioShell) for extension manager UI.
- Web Worker pattern (Python) for isolation.

## 7. Missing functionality

- No extension manifest schema.
- No extension loader/registry.
- No custom component registration API.
- No custom simulation module hook interface.
- No extension permission model.
- No extension storage format.
- No extension manager UI.

## 8. Why Phase 10

Extensibility is the final product-domain phase (Phase 10) per the roadmap. It builds on all
completed domains (physics, graph, Python, electrical, robotics) and provides the stable
extension contract (ADR 0001, Extension Layer) that was proposed but not yet implemented.

## 9. Overall direction

Bounded, local-first extension system. Reuse proven patterns. Defense-in-depth isolation.
No marketplace or cloud. Incremental milestones P10-0 through P10-5.

Companion documents:
- `PHASE_10_DECISION_PACKAGE.md`
- `PHASE_10_ARCHITECTURE_PROPOSAL.md`
- `PHASE_10_MILESTONE_MATRIX.md`
- `PHASE_10_VALIDATION_STRATEGY.md`
