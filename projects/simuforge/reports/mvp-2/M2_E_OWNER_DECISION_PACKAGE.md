# SimuForge — M2-E Owner Decision Package

**Date:** 2026-11-16 (decisions recorded for approval)  
**Milestone:** M2-E — Persistence, Regression, and Closure  
**Status:** ALL FIVE DECISIONS APPROVED — PROJECT OWNER, 2026-11-16; CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-15)  
**Baseline:** `main` @ `13242e33038f74729bf39dc4173b9da0f3a03f77` (M2-D CLOSED — PASS)  
**Technical review:** `M2_E_TECHNICAL_REVIEW.md`

## 1. Purpose

This package records the M2-E decisions that cannot be settled technically. Five items, grouped to minimize approval cycles. No item is approved yet. M2-E implementation requires a separate explicit Project Owner authorization after these are settled.

## 2. Decisions

### D-M2E-01 — Graph field in ProjectDocument

**Context:** `ProjectDocument` currently has no graph field; `StudioState.graph` is in-memory only.

**Recommendation:** Add optional `graph?: Graph | null` to `ProjectDocument`. Backward compatible with existing projects (missing → null).

**Alternatives:** (a) Required field (breaks existing files); (b) separate storage key (adds complexity).

**Consequences:** Minimal schema change; no version bump needed (additive optional field).

### D-M2E-02 — Fix parseGraphDocument entity-list validation (carry-forward)

**Context:** `parseGraphDocument` validates with `{ entities: [] }`, rejecting graphs referencing real entities. This blocks save/reopen.

**Recommendation:** Fix as part of M2-E: validate graph against the project's actual entity list. Add an overload/parameter `validateGraph(graph, { entities })` call site in project validation.

**Alternatives:** (a) Keep broken (M2-E cannot deliver save/reopen); (b) Defer (blocks M2-E closure).

**Consequences:** Core M2-E fix; requires unit tests for valid/invalid entity refs.

### D-M2E-03 — Dirty tracking for graph edits

**Context:** `graph/set` does not call `markDirty`, so graph edits don't mark the project dirty.

**Recommendation:** Make `graph/set` call `markDirty`. This ensures save prompts and revision tracking work for graph changes.

**Alternatives:** (a) Keep graph edits non-dirty (users lose changes silently); (b) dirty only on structural changes (complex, error-prone).

**Consequences:** Consistent dirty tracking; may increase save frequency (acceptable).

### D-M2E-04 — Restore graph on project open

**Context:** `project/open` maps world entities but ignores `document.graph`, leaving `state.graph` null.

**Recommendation:** Restore `state.graph = document.graph ?? null` on open; reset runtime. If graph is invalid/missing, skip with a warning and keep world.

**Alternatives:** (a) Require graph (breaks old projects); (b) prompt user (adds UX complexity).

**Consequences:** Enables save/reopen round-trip; graceful degradation for corrupt/missing graphs.

### D-M2E-05 — Schema version

**Context:** Adding an optional field could warrant a version bump.

**Recommendation:** Keep `PROJECT_SCHEMA_VERSION = 1` (additive optional field is backward compatible). No migration needed.

**Alternatives:** (a) Bump to 2 (requires migration logic, adds complexity for no benefit).

**Consequences:** Simpler; existing v1 files remain valid.

## 3. Approval

All five items are PENDING — PROJECT OWNER. Implementation of M2-E remains NOT AUTHORIZED until these are settled and a separate explicit implementation authorization is granted.