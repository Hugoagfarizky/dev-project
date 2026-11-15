# SimuForge — M2-D Implementation Report

**Date:** 2026-11-15 (implementation and verification)  
**Milestone:** M2-D — End-to-End Demo and Browser Acceptance  
**Status:** IMPLEMENTED / READY FOR OWNER ACCEPTANCE (not closed; closure requires explicit Project Owner acceptance)  
**Authorization:** Project Owner explicitly authorized M2-D implementation on 2026-11-15 (D-M2D-01..D-M2D-05 approved)  
**Implementation baseline:** `main` @ `221911534d0487242100897f37626662c84a35bd`  
**Final HEAD:** (recorded after push)

## 1. Scope

M2-D implements the integrated, demonstrable, repeatable end-to-end experience proving the MVP-2 visual scripting system works as a product. In-session only; no persistence (M2-E deferred).

## 2. Implementation summary

- **Load Demo Graph button** in `app/src/ui/graph/GraphEditor.tsx` (test id `load-demo-graph`): builds a canonical in-memory graph from the demo scenario entities (Demo Ball + Demo Floor) and dispatches `graph/set`. Replaces the active graph only when explicitly triggered. Disabled when demo entities are absent. No auto-load on startup. No persistence.
- **Canonical demo graph** (D-M2D-01): On Start → Apply Impulse (x=6); Manual Trigger → Apply Force (x=4); On Plane Contact (target floor) → Apply Impulse (y=5).
- **Console auto-expand** in `app/src/ui/shell/StudioShell.tsx`: expands the Console after graph execution completes/fails, without overriding an explicit user collapse; preserves default Program preset layout; no regression at 1024×640 or 1440×900.
- **Browser spec** `app/tests/browser/m2d-end-to-end.spec.ts`: 5 scenarios (D1 end-to-end impulse, D2 manual force, D3 contact bounce, D4 invalid graph recovery, responsive layout) + M1-F/M2-B/M2-C regression.
- **Evidence** `reports/mvp-2/evidence/m2d-acceptance.json`: 5/5 scenarios passed, 33 assertions, Chromium 158.0.8127.18; screenshots under `reports/mvp-2/evidence/screenshots/` with `m2d-` prefix.

## 3. Acceptance criteria status

All 12 proposed criteria PASS (see M2-D technical review §8). Browser evidence: 5/5 scenarios passed.

## 4. Tests and validation

| Check | Result |
|---|---|
| `npm test` | 250/250 PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run check` | PASS |
| M2-D Playwright | 5/5 PASS |
| M1-F regression | 1/1 PASS |
| M2-B regression | 6/6 PASS |
| M2-C regression | 7/7 PASS |

## 5. Files changed

New:
- `app/src/ui/graph/GraphEditor.tsx` (Load Demo Graph button + handler)
- `app/src/ui/shell/StudioShell.tsx` (Console auto-expand)
- `app/tests/browser/m2d-end-to-end.spec.ts`
- `reports/mvp-2/evidence/m2d-acceptance.json` + screenshots
- `reports/mvp-2/M2_D_IMPLEMENTATION_REPORT.md`

Modified:
- `reports/mvp-2/M2_D_TECHNICAL_REVIEW.md`
- `reports/mvp-2/M2_D_OWNER_DECISION_PACKAGE.md`
- `reports/mvp-2/MVP2_CONSOLIDATED_ROADMAP.md`
- `reports/mvp-2/MVP2_READINESS_REPORT.md`
- `reports/mvp-0/PROJECT_HANDOFF.md`

## 6. Known limitations

- In-session only; save/reopen deferred to M2-E.
- `parseGraphDocument` M2-E carry-forward unchanged.
- Contact bounce timing depends on physics step; assertion uses position threshold.

## 7. Status

M2-D is IMPLEMENTED / READY FOR OWNER ACCEPTANCE. Not closed. M2-E remains NOT STARTED / NOT AUTHORIZED.