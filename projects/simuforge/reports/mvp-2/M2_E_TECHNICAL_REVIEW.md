# SimuForge — M2-E Technical Review (Consolidated Fast-Track)

**Date:** 2026-11-16 (planning)  
**Milestone:** M2-E — Persistence, Regression, and Closure  
**Status:** PLANNING COMPLETE — NOT STARTED / NOT AUTHORIZED FOR IMPLEMENTATION  
**Authorization:** Planning only. M2-E implementation is NOT AUTHORIZED.  
**Baseline:** `main` @ `13242e33038f74729bf39dc4173b9da0f3a03f77` (M2-D CLOSED — PASS)  
**Companion:** `M2_E_OWNER_DECISION_PACKAGE.md` (D-M2E-01..D-M2E-05 PENDING — PROJECT OWNER)

## 1. Executive summary

M2-A through M2-D are closed/accepted. The canonical graph model, editor, execution runtime, and end-to-end browser demo are complete. What remains for MVP-2 (M2-E) is **persistence of the canonical graph inside the project document**, **save/reopen round-trip**, **dirty tracking for graph edits**, **invalid-document recovery**, **full regression**, **final browser acceptance**, and **MVP-2 closure**.

M2-E is the final MVP-2 milestone. Its core technical work is small and well-bounded: add an optional `graph` field to `ProjectDocument`, serialize/deserialize it, validate it against the project's actual entity list (fixing the known `parseGraphDocument` carry-forward issue), mark graph edits dirty, and restore the graph on open. Everything else is verification and closure.

## 2. Existing capability inventory (verified)

- **Project persistence:** `ProjectDocument` (`src/project/types.ts`), `serializeProjectDocument`/`parseProjectDocument` (`src/project/serialization.ts`), `validateProjectDocument` (`src/project/validation.ts`), `IndexedDbProjectRepository` (keyPath `project.id`, DB_VERSION 2).
- **World serialization:** `serializeWorldDocument`/`parseWorldDocument` (pattern to mirror for graph).
- **Graph serialization:** `serializeGraphDocument`/`parseGraphDocument` (`src/graph/serialization.ts`); `validateGraph(graph, context)` requires `GraphValidationContext` with entities.
- **Studio state:** `StudioState.graph?: Graph | null` (in-memory, not persisted). `project/new`, `project/open`, `graph/set` reducer cases. `graph/set` does NOT call `markDirty` (gap).
- **Save flow:** `handleSave` in `StudioShell.tsx` serializes `state.project` via `serializeProjectDocument`. `project/save-succeeded` updates `savedRevision`.
- **Open flow:** `handleOpenProject` dispatches `project/open`, which maps world entities but does NOT restore `state.graph` (gap).
- **Brownfield tests:** `test/project/project.test.ts`, `test/graph/graph.test.ts`, `test/graph/adapter.test.ts`. IndexedDB tests exist.

## 3. M2-E carry-forward issue (the core fix)

`parseGraphDocument` calls `validateGraph(graph, { entities: [] })`, so any graph whose action nodes reference real entities fails validation (`GRAPH_MISSING_TARGET_ENTITY` / `GRAPH_INVALID_TARGET_ENTITY`). M2-E must validate against the actual entity list of the project. This is the single most important M2-E code change.

## 4. Scope

**In scope:**
- Add optional `graph?: Graph | null` to `ProjectDocument` (and to `ProjectDocument` serialization/validation).
- Serialize/deserialize graph within project document (reuse `serializeGraphDocument`/`parseGraphDocument` shape, or inline).
- Fix `parseGraphDocument` to accept an entity list (or add a project-level validation that validates graph against `value.world.entities`).
- `graph/set` marks project dirty (`markDirty`).
- `project/open` restores `state.graph` from document (and resets runtime).
- `project/new` sets `graph: null`.
- Save flow includes graph (already via `state.project` once graph is part of project).
- Handle missing/invalid graph on open: skip graph, log warning, keep world; do not crash.
- Handle schema-version compatibility (additive optional field; keep version 1).
- Browser acceptance: save → reopen → graph intact → execution works.
- Regression: M1-F, M2-A..M2-D.
- Final browser evidence + closure docs.

**Out of scope:**
- New node types, physics, Python, robotics/electrical, hybrid 2D.
- M2-C/M2-D rework.
- Advanced migration framework (only additive optional field).

## 5. Consolidated owner decisions (D-M2E-01..D-M2E-05)

See `M2_E_OWNER_DECISION_PACKAGE.md`. Five genuine decisions, all with recommendations. Grouped to minimize approval cycles.

## 6. Work packages (execution order)

| WP | Content | Depends on | Exit criteria |
|---|---|---|---|
| WP1 | Add `graph?` to `ProjectDocument` types + `ProjectValidationResult` | — | Typecheck PASS |
| WP2 | `serializeProjectDocument` includes graph; `parseProjectDocument` validates graph against world entities (fix carry-forward) | WP1 | Unit tests round-trip |
| WP3 | `project/new` sets `graph: null`; `project/open` restores `state.graph`; `graph/set` calls `markDirty` | WP1 | Reducer tests |
| WP4 | Save flow already serializes `state.project`; ensure `state.graph` is synced into `state.project` before save (or store graph in project). Decide: store graph in `state.project` vs separate `state.graph`. Recommendation: keep `state.graph` separate (M2-B design) but sync into project on save and restore on open. | WP1, WP3 | Integration tests |
| WP5 | Invalid-document recovery: malformed/invalid graph on open → skip graph, log warning, world loads | WP2, WP3 | Tests |
| WP6 | Unit + integration tests: round-trip, dirty tracking, invalid graph recovery, schema compat | WP1–WP5 | `npm test` PASS |
| WP7 | Browser acceptance: save → reopen → graph intact → execute; evidence | WP1–WP6 | Playwright PASS |
| WP8 | Regression: M1-F, M2-A..M2-D | WP6 | All pass |
| WP9 | Closure docs + evidence | WP7, WP8 | Docs consistent |

## 7. Acceptance criteria (proposed, 10 criteria)

| # | Criterion | Type |
|---|---|---|
| 1 | Project document can contain a canonical graph | Unit |
| 2 | Serializing and parsing a project with a graph round-trips the graph | Unit |
| 3 | Graph is validated against the project's actual entities on parse | Unit |
| 4 | `graph/set` marks the project dirty | Unit |
| 5 | `project/open` restores `state.graph` from the document | Integration |
| 6 | Invalid graph on open is skipped with a warning; world still loads | Integration |
| 7 | Save → reopen → graph intact → execution works | Browser |
| 8 | No regression to M1-F, M2-A..M2-D | Regression |
| 9 | Responsive behavior at 1024×640 and 1440×900 | Browser |
| 10 | MVP-2 closure documentation complete | Documentation |

## 8. Test strategy

- Unit: extend `test/project/project.test.ts` (round-trip with graph, invalid graph recovery, schema compat); extend `test/graph/serialization.test.ts` or add `test/graph/persistence.test.ts`.
- Integration: extend `test/editor/graph-execution.test.ts` or new `test/editor/persistence.test.ts` (dirty tracking on graph/set, open restores graph).
- Browser: new `app/tests/browser/m2e-persistence.spec.ts` (save → reopen → graph intact → execute), reuse M2-D helpers + evidence schema. Evidence: `reports/mvp-2/evidence/m2e-acceptance.json`.
- Regression: run M1-F, M2-B, M2-C, M2-D specs.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Breaking existing project files (no graph field) | Make `graph` optional; parser treats missing as null |
| `parseGraphDocument` entity-list fix changes validation semantics | Validate against actual entities; add unit tests for both valid and invalid refs |
| Dirty tracking over/under-firing | markDirty on graph/set; verify with tests |
| IndexedDB schema version | No DB schema change needed (graph is inside project document) |
| Scope creep into save/reopen UX | Keep minimal: reuse existing Save/Open UI |

## 10. Definition of Done

- All work packages WP1–WP9 complete.
- `npm test`, `npm run check`, `npm run build` PASS.
- M2-E browser acceptance PASS with evidence.
- M1-F, M2-A..M2-D regressions PASS.
- Closure docs consistent.
- M2-E CLOSED — PASS after Owner acceptance.

## 11. Readiness verdict

**READY FOR OWNER DECISIONS.** Implementation NOT AUTHORIZED. Five decisions D-M2E-01..D-M2E-05 pending Project Owner approval; after approval, a single explicit implementation authorization suffices.