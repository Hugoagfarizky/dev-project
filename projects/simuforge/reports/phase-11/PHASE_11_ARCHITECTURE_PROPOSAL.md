# Phase 11 — Quality, Performance & Release: Architecture Proposal

**Date:** 2026-11-19  
**Phase:** 11 — Quality, Performance & Release  
**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL

## 1. Scope of this proposal

Phase 11 does not propose changes to the SimuForge core architecture (modular monolith, ECS-style
world model, fixed timestep, worker-based Python/extensions, versioned project format). Those are
settled by ADR 0001–0004 and the closed phases.

This proposal covers only release-engineering, validation, and security-boundary documentation
additions required for v1.0.

## 2. No core architecture changes

- No new component or domain is added.
- No change to the project schema (remains v1; `extensions` optional).
- No change to the worker protocol versions.
- No change to the rendering boundary (Babylon behind `RendererPort`).

## 3. Proposed additions (documentation and tooling only)

| Addition | Purpose | Risk |
|---|---|---|
| Benchmark harness (Node + browser micro-benchmarks) | Establish measured baselines | Low |
| Release checklist document | Gate release | Low |
| Cross-browser compatibility matrix | Document supported browsers | Low |
| Security boundary document | Document worker limits honestly | Low |
| POC-06 feasibility spike (optional) | Validate 2D/3D coexistence cost | Low–Medium |
| Notices generation (already scripted) | License compliance | Low |

## 4. Deployment model

Static bundle only (Vite output). No backend, no cloud, no service. Hosting is a static file
server or local disk. COOP/COEP headers are required for full Python interrupt capability;
without them, terminate-based cancellation remains available.

## 5. Rollback and recovery

- Release artifact is immutable and tagged.
- Rollback = redeploy previous tagged artifact.
- User data is local; no server-side migration. Schema remains v1.
- Export/import remains the user-facing recovery path.

## 6. Conclusion

No architectural decision is reopened. Phase 11 is a hardening, measurement, and release-preparation
phase on top of the existing architecture.
