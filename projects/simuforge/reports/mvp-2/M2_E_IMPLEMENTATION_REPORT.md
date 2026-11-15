# SimuForge — M2-E Implementation Report

**Date:** 2026-11-16 (implementation and verification)  
**Milestone:** M2-E — Persistence, Regression, and Closure  
**Status:** IMPLEMENTED / READY FOR OWNER ACCEPTANCE (not closed; closure requires explicit Project Owner acceptance)  
**Authorization:** Project Owner explicitly authorized M2-E implementation on 2026-11-16 (D-M2E-01..D-M2E-05 approved)  
**Implementation baseline:** `main` @ `130eea58f328252e481ec0ad301a68674a132289`  
**Final HEAD:** (recorded after push)

## 1. Scope

M2-E implements persistence of the canonical visual-scripting graph inside the project document: save/reopen round-trip, dirty tracking for graph edits, invalid-document recovery, full regression, final browser acceptance and evidence. In-session + persistence. No new node types, physics, or M2-D rework.

## 2. Implementation summary

- **Types:** `ProjectDocument.graph?: Graph | null` (optional, backward compatible) in `src/project/types.ts`; `ProjectValidationResult` gains optional `warnings`.
- **Validation:** `validateProjectDocument` validates graph against the project's actual entities; invalid graph is stripped (not fatal) and reported via warnings (fixes M2-E carry-forward issue).
- **Serialization:** `serializeProjectDocument` includes graph (if present); `parseProjectDocument` propagates validation.
- **Reducer:** `graph/set` calls `markDirty`; `project/new` sets `graph: null`; `project/open` restores `state.graph` from document, validates against entities, skips invalid graph with a warning (Console `GRAPH_INVALID`), never marks dirty (hydration).
- **Save flow:** `handleSave` syncs `state.graph` into `state.project` before serializing.
- **Import flow:** `handleImportFile` logs graph warnings from parse result.
- **Browser spec:** `app/tests/browser/m2e-persistence.spec.ts` (2 scenarios: save & reopen preserves graph + execution; responsive layout).
- **Evidence:** `reports/mvp-2/evidence/m2e-acceptance.json` (2/2 passed, 13 assertions), screenshots `m2e-*`.

## 3. Acceptance criteria status

All 10 proposed criteria PASS (see M2-E technical review §7). Browser evidence: 2/2 scenarios passed.

## 4. Tests and validation

| Check | Result |
|---|---|
| `npm test` | 250/250 PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run check` | PASS |
| M2-E Playwright | 2/2 PASS |
| M1-F regression | 1/1 PASS |
| M2-B regression | 6/6 PASS |
| M2-C regression | 7/7 PASS |
| M2-D regression | 5/5 PASS |

## 5. Files changed

New:
- `app/tests/browser/m2e-persistence.spec.ts`
- `reports/mvp-2/evidence/m2e-acceptance.json` + screenshots
- `reports/mvp-2/M2_E_IMPLEMENTATION_REPORT.md`

Modified:
- `app/src/project/types.ts`
- `app/src/project/validation.ts`
- `app/src/project/serialization.ts`
- `app/src/editor/reducer.ts`
- `app/src/ui/shell/StudioShell.tsx`
- `reports/mvp-2/M2_E_TECHNICAL_REVIEW.md`
- `reports/mvp-2/M2_E_OWNER_DECISION_PACKAGE.md`
- `reports/mvp-2/MVP2_CONSOLIDATED_ROADMAP.md`
- `reports/mvp-2/MVP2_READINESS_REPORT.md`
- `reports/mvp-0/PROJECT_HANDOFF.md`

## 6. Known limitations

- No advanced migration framework (additive optional field only).
- Save/reopen uses existing IndexedDB infrastructure; no new storage abstraction.

## 7. Status

M2-E is IMPLEMENTED / READY FOR OWNER ACCEPTANCE. Not closed. Closure requires explicit Project Owner acceptance. M2-E is the final MVP-2 milestone.