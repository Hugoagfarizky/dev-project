# SimuForge — M2-D Technical Review

**Date:** 2026-11-15 (planning)  
**Milestone:** M2-D — End-to-End Demo and Browser Acceptance  
**Status:** ALL FIVE DECISIONS APPROVED — PROJECT OWNER, 2026-11-15; PLANNING COMPLETE — READY FOR IMPLEMENTATION AUTHORIZATION PENDING (not authorized)  
**Authorization:** Planning only. M2-D implementation is NOT AUTHORIZED.  
**Baseline:** `main` @ `0ebaccd1e8a5130f0192c4a07a24d2c90b6b2889` (M2-C CLOSED — PASS, Project Owner accepted 2026-11-15)  
**Companion documents:** `M2_D_OWNER_DECISION_PACKAGE.md` (D-M2D-01..D-M2D-05 PENDING — PROJECT OWNER), `MVP2_CONSOLIDATED_ROADMAP.md`, `MVP2_READINESS_REPORT.md`, `reports/mvp-0/PROJECT_HANDOFF.md`

## 1. Executive summary

M2-A, M2-B, and M2-C are complete and closed/accepted. The canonical graph model, the React Flow presentation editor, and the graph execution runtime (triggers, queue, contact events, failure handling, Console, status line, highlight) are all in place and verified. What M2-D must deliver is the **integrated, demonstrable, repeatable end-to-end experience** that proves the MVP-2 visual scripting system works as a product: a user can build a world, author a graph, run it, observe the simulation respond, inspect status/Console, recover from invalid graphs, and repeat — all under browser acceptance with evidence.

M2-D is therefore an **integration, demonstration, and browser-acceptance milestone**, not a new capability milestone. It must not introduce new node types, physics, or persistence. Its main risks are demo reproducibility, Console visibility in the Program preset, and scope creep into M2-E persistence.

## 2. Existing capability inventory (verified against source)

Already implemented and reusable:

- **M2-A canonical graph model**: `src/graph/types.ts`, `nodes.ts`, `validation.ts`, `serialization.ts`, `adapter.ts`. Six approved node types, ports, validation diagnostics, serialization. 12+ graph tests.
- **M2-B GraphEditor**: `src/ui/graph/GraphEditor.tsx`, `GraphNodeRenderer.tsx`, `NodePalette.tsx`, `GraphNodeInspector.tsx`. Add/move/delete/connect nodes, canonical validation, diagnostics, empty state, responsive layout. 6 browser scenarios.
- **M2-C execution runtime**: `src/runtime/graphExecution.ts`, contact boundary in `physics.ts`, lifecycle/queue/session in `reducer.ts`, status line + Manual Trigger button + highlight in `GraphEditor.tsx`, `RUNTIME` Console filter. 41 new tests; browser 7/7.
- **MVP-1 simulation**: entities (cube/sphere/plane), rigidBody components, fixed-step physics, gravity, plane collisions, force/impulse/clear-force, snapshot/restore, pause/resume/reset/stop, Runtime Monitor (position/velocity), Console.
- **Demo scenario loader**: `demo/load-scenario` creates “Demo Floor” (plane) + “Demo Ball” (sphere, gravity) and selects the ball. `impulse-demo-ball` button applies a 10 m/s y impulse. Test ids `load-demo-scenario`, `impulse-demo-ball`.
- **Browser harness**: Playwright (`tests/browser/`), `webServer` auto-starts Vite on 5173, evidence JSON + screenshots under `reports/mvp-2/evidence/`.

## 3. End-to-end workflow trace

| Step | Supported? | Mechanism |
|---|---|---|
| Open/create project | Yes | Studio shell loads empty project; Project Hub; demo scenario loader |
| Create/access world with entities | Yes | `entity/create` or `demo/load-scenario` |
| Configure physics components | Yes | Inspector (rigidBody) + demo scenario |
| Open Program panel | Yes | Preset switch to `program` |
| Construct valid graph | Yes | NodePalette + connect + inspector config (M2-B) |
| Execute graph through runtime | Yes | Play → On Start; Manual Trigger; contact triggers (M2-C) |
| Observe simulation response | Yes | Viewport motion + Runtime Monitor (position/velocity) |
| Inspect status + Console | Yes | Execution status line + ConsoleDrawer (RUNTIME filter) |
| Recover from invalid graphs / failures | Yes | Play allowed; execution skipped with warning; physics continues; failure stops chain; error auto-pauses |
| Repeat demonstration | Yes | Stop/Reset + rebuild graph; in-memory state |

**No missing integration point blocks a demo.** The only friction is that graphs must be authored by hand in the browser (no one-click demo graph) and the Console is collapsed by default in the Program preset. Whether to add a curated demo-graph loader and/or auto-expand the Console is the subject of D-M2D-01..03.

## 4. Existing node capabilities (six approved nodes)

| Node | Trigger/Action | Meaningful demo use |
|---|---|---|
| On Start | Trigger | Fires impulse/force at Play (verified) |
| Manual Trigger | Trigger | User-driven force/impulse (verified) |
| On Plane Contact | Trigger | Ball-floor impact → force/impulse (verified by unit/integration; no browser scenario yet) |
| Apply Force | Action | Persistent force (verified) |
| Apply Impulse | Action | Instantaneous velocity change (verified) |
| Clear Force | Action | Removes accumulator (verified) |

Meaningful deterministic combinations: On Start → Apply Impulse (motion); Manual Trigger → Apply Force (sustained acceleration); On Plane Contact → Apply Impulse (bounce); Manual Trigger → Apply Impulse (repeated); invalid target → skip + warning.

No new node types required.

## 5. Proposed M2-D demo scenarios

Select a minimal set of four browser scenarios that collectively prove the MVP-2 story. Reuse the M2-C scenario helpers and evidence schema.

| ID | Scenario | Initial world | Graph | User actions | Expected result | Assertions | Screenshot |
|---|---|---|---|---|---|---|---|
| D1 | End-to-end: On Start → impulse → visible motion | Demo floor + ball | onStart → applyImpulse (x=6) | Play | Ball velocity x ≈ 6; position x increases; status completed; highlight observed | 7 (reuse M2-C S1) | `m2d-end-to-end.png` |
| D2 | Manual Trigger → force + Console/status feedback | Demo floor + ball | manualTrigger → applyForce (x=4) | Play, click Manual Trigger twice | Velocity x ≈ 8; status completed twice; Console shows 2 GRAPH_TRIGGERED | 6 | `m2d-manual-force.png` |
| D3 | On Plane Contact → impulse (bounce) | Ball y=0.4 over floor | onPlaneContact (target floor) → applyImpulse (y=+5) | Play, wait for contact | Rising edge fires once; velocity y becomes +5; no re-fire while resting | 5 | `m2d-contact-bounce.png` |
| D4 | Invalid graph + recovery + monitoring | Demo floor + ball | onStart → applyForce (target ghost) | Play, observe skip, then Stop, fix target, Play | Status skipped + warning; physics still advances; after fix, impulse applied | 6 | `m2d-invalid-recovery.png` |

Plus a responsive-layout scenario (reuse M2-C layout assertions) at 1024×640 and 1440×900, and M1-F/M2-B/M2-C regression runs.

**Out of scope for M2-D (deferred):** save/reopen (M2-E), Python, new nodes, persistence.

## 6. Browser acceptance architecture

Reuse existing infrastructure:
- Playwright config (`playwright.config.ts`): `testDir: ./tests/browser`, webServer auto-start Vite on 5173, Chromium.
- Evidence convention: `reports/mvp-2/evidence/m2d-acceptance.json` with `milestone`, `generatedAt`, `browser`, `scenarios[]` (name, status, viewport, assertions, screenshots), `allPassed`.
- Screenshot dir: `reports/mvp-2/evidence/screenshots/`, prefix `m2d-`.
- Viewports: 1024×640 and 1440×900.
- Reusable helpers: `openProgram`, `loadDemoBall`, `addNode`, `selectNode`, `setTarget`, `setNumberField`, `connect`, `monitorValue`, `watchHighlight`, `check`, `screenshot` (from M2-B/M2-C specs).

**Proposed spec:** `app/tests/browser/m2d-end-to-end.spec.ts` (new file) with 5 scenarios + layout + (optionally) a Console-visibility assertion.

**Console visibility:** In the Program preset the Console is collapsed to a strip. The M2-D demo should either (a) assert the status line (always visible in the Program panel) as the primary feedback, and optionally expand the Console strip to assert RUNTIME messages, or (b) switch to the Simulate preset for Console assertions. Recommendation: primary feedback via status line (D1–D4), plus one optional Console-expand assertion in D2 if D-M2D-03 is approved.

## 7. Scope and dependency analysis

**Already implemented and reusable:** M2-A, M2-B, M2-C, MVP-1 simulation, demo scenario loader, browser harness, evidence schema.

**Potential M2-D work (only if Owner approves):**
- A curated one-click "Load Demo" that creates both the world entities **and** a canonical graph (in-memory, no persistence) — D-M2D-02.
- Console auto-expand or Console-visible-in-Program option — D-M2D-03.
- The end-to-end browser spec + evidence generation (D-M2D-05).

**Deferred / out of scope:**
- M2-E persistence (save/reopen). M2-D demonstrates in-session only.
- Python, new node types, loops/branches/variables/math/delay, robotics/electrical, hybrid 2D, advanced physics.

**M2-E carry-forward issue:** `parseGraphDocument` validates with `{ entities: [] }`, rejecting graphs containing entity references. Does **not** affect M2-D scenarios (M2-D is in-session, no save/reopen). Documented dependency; no fix in M2-D.

## 8. Acceptance criteria (proposed, 12 criteria)

| # | Criterion | Type |
|---|---|---|
| 1 | A user can create the demonstration from an empty project (load demo scenario) | Browser |
| 2 | A graph can be authored (add/connect/configure all six node types) in the Program panel | Browser |
| 3 | On Start trigger produces observable simulation motion end to end | Browser |
| 4 | Manual Trigger produces observable simulation motion and updates Console/status | Browser |
| 5 | On Plane Contact trigger fires on rising edge and produces observable motion | Browser |
| 6 | Invalid graph skips execution with warning while simulation remains usable | Browser |
| 7 | Execution status line and Console messages are accurate and visible | Browser |
| 8 | Pause/resume/stop/reset work in the complete scenario | Browser |
| 9 | Runtime errors are visible to the user | Browser |
| 10 | Demonstration is repeatable (reset + rebuild + rerun) | Browser |
| 11 | Responsive behavior at 1024×640 and 1440×900 | Browser |
| 12 | No regression to M1-F, M2-B, M2-C | Regression |

## 9. Owner decision package

See `M2_D_OWNER_DECISION_PACKAGE.md`. All five decisions D-M2D-01..D-M2D-05 are APPROVED — PROJECT OWNER, 2026-11-15 (D-M2D-03 with clarification). No item remains pending.

## 10. Risk and readiness assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Demo reproducibility across runs | High | Deterministic graph (node ids sorted); fixed-step physics; seeded demo loader |
| Console collapsed by default in Program preset | Medium | Status line is primary feedback; optional auto-expand (D-M2D-03) |
| One-click demo graph scope creep | Medium | Keep it in-memory, no persistence; Owner decision D-M2D-02 |
| Contact scenario timing in browser | Medium | Use rising-edge + velocity assertion; wait for contact with timeout |
| Evidence screenshot staleness | Low | Regenerate on final run only |
| M2-E dependency | Low | Documented; M2-D does not touch persistence |

**Readiness verdict: READY FOR IMPLEMENTATION AUTHORIZATION (pending separate explicit Project Owner authorization).** Decisions D-M2D-01..D-M2D-05 approved 2026-11-15. Implementation NOT AUTHORIZED.

## 11. Proposed file changes (planning only)

New:
- `reports/mvp-2/M2_D_TECHNICAL_REVIEW.md`
- `reports/mvp-2/M2_D_OWNER_DECISION_PACKAGE.md`

Modified:
- `reports/mvp-2/MVP2_CONSOLIDATED_ROADMAP.md` (M2-D section)
- `reports/mvp-2/MVP2_READINESS_REPORT.md` (M2-D section)
- `reports/mvp-0/PROJECT_HANDOFF.md` (M2-D planning increment)

No source, test, dependency, or evidence changes.

## 12. Validation

Planning-only: documentation consistency check; no `npm test`/build required (no code change). Verify diff contains only planning docs.