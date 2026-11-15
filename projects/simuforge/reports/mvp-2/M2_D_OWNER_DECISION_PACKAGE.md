# SimuForge — M2-D Owner Decision Package

**Date:** 2026-11-15 (decisions recorded for approval)  
**Milestone:** M2-D — End-to-End Demo and Browser Acceptance  
**Status:** ALL ITEMS PENDING — PROJECT OWNER DECISION REQUIRED; implementation NOT AUTHORIZED  
**Baseline:** `main` @ `0ebaccd1e8a5130f0192c4a07a24d2c90b6b2889` (M2-C CLOSED — PASS)  
**Technical review:** `M2_D_TECHNICAL_REVIEW.md`  
**Decision groups:** previously approved MVP-2 decisions are D-M2-01..D-M2-08; M2-C decisions are D-M2C-01..D-M2C-09; M2-D decisions are D-M2D-01..D-M2D-05. The three groups are distinct and must not be conflated.

## 1. Purpose

This package records the M2-D behaviour and scope decisions that cannot be settled technically. For each item it preserves the context, recommendation, alternatives, and trade-offs, then records the official Project Owner decision and approval date.

No item is approved yet. M2-D implementation requires a separate explicit Project Owner authorization after these decisions are settled.

## 2. Decisions

### D-M2D-01 — Canonical end-to-end demo scenario definition

**Context:** M2-D must prove the MVP-2 visual scripting system works end to end. The product spec §7.7 describes a floor + ball + button scenario; the implemented triggers are On Start, Manual Trigger, On Plane Contact. A canonical, repeatable demo scenario is needed so browser assertions and screenshots are stable.

**Recommendation:** Define three core demo paths:
1. On Start → Apply Impulse (ball moves horizontally).
2. Manual Trigger → Apply Force (sustained acceleration, repeated).
3. On Plane Contact → Apply Impulse (bounce on rising edge).

**Alternatives:** (a) Single scenario only (simpler evidence, less coverage); (b) Add a fourth "Clear Force" scenario (more coverage, more maintenance).

**Trade-offs:** Three scenarios cover all six nodes across triggers/actions with minimal redundancy; a fourth adds Clear Force coverage but increases flakiness risk.

**Consequences:** Drives the browser spec scenarios and screenshot set.

### D-M2D-02 — One-click "Load Demo Graph" (in-memory)

**Context:** Today graphs must be authored by hand in the browser (NodePalette + connect + inspector). A one-click loader would make the demo trivially repeatable and reduce flakiness, but it adds UI/runtime integration code and a new code path.

**Recommendation:** Add an in-memory "Load Demo Graph" button (test id `load-demo-graph`) that creates a canonical graph matching D-M2D-01 and dispatches `graph/set`. No persistence (M2-E). Reuse `createCanonicalNode`.

**Alternatives:** (a) Manual authoring only (no new code, but slower/flakier tests); (b) Load graph from a bundled JSON via `parseGraphDocument` (exercises serialization but depends on the M2-E carry-forward entity-list issue).

**Trade-offs:** (a) keeps scope minimal but hurts demo reproducibility; (b) exercises real parsing but couples M2-D to an M2-E defect. Recommendation balances reproducibility and scope.

**Consequences:** If approved, M2-D includes a small UI addition; if rejected, M2-D browser tests author graphs manually (as M2-C did).

### D-M2D-03 — Console visibility in the Program preset

**Context:** In the Program preset the Console is collapsed to a strip. The execution status line is always visible in the Program panel. M2-D wants users to see RUNTIME messages.

**Recommendation:** Keep the execution status line as the primary feedback (always visible). Optionally auto-expand the Console strip when a graph execution completes or fails, without changing the default collapsed state for other workflows. Do not change the default preset layout.

**Alternatives:** (a) Always expand Console in Program preset (more visible feedback, costs ~160 px of canvas height); (b) Rely on status line only (minimal change, less message detail).

**Trade-offs:** (a) richer feedback but layout regression risk at 1024×640; (b) minimal but hides detailed Console codes. Recommendation keeps layout safe while exposing detail on demand.

### D-M2D-04 — Save/reopen scope

**Context:** Product spec §7.5 lists "The demonstration can be saved and reopened" as an MVP-3 acceptance criterion. Persistence is M2-E (not authorized). M2-D must not silently absorb M2-E.

**Recommendation:** M2-D demonstrates in-session only. Save/reopen is explicitly deferred to M2-E and documented as a known M2-D limitation. M2-D does not modify persistence, serialization, or storage.

**Alternatives:** (a) Implement minimal save/reopen in M2-D (scope creep, duplicates M2-E); (b) Defer (clean boundary, matches authorization).

**Trade-offs:** (a) satisfies the literal MVP-3 criterion now but breaks milestone boundaries and authorization; (b) keeps boundaries clean.

### D-M2D-05 — Browser evidence and reproducibility conventions

**Context:** M2-C established an evidence convention (JSON schema, screenshots, viewports, browser version). M2-D should reuse it for consistency.

**Recommendation:** Reuse the M2-C evidence schema and conventions: `reports/mvp-2/evidence/m2d-acceptance.json`, screenshots under `reports/mvp-2/evidence/screenshots/` with `m2d-` prefix, viewports 1024×640 and 1440×900, Chromium, Playwright webServer on 5173. New spec `app/tests/browser/m2d-end-to-end.spec.ts`. Run M1-F, M2-B, M2-C regressions.

**Alternatives:** None material; consistency is strongly preferred.

## 3. Approval

All five items are PENDING — PROJECT OWNER. None is approved. Implementation of M2-D remains NOT AUTHORIZED until these decisions are settled and a separate explicit implementation authorization is granted.

Cross-milestone note: the M2-E `parseGraphDocument` carry-forward issue is unaffected by M2-D planning and is not addressed here.