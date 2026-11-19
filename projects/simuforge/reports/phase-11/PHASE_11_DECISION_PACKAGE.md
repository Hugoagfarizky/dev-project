# Phase 11 — Quality, Performance & Release: Decision Package

**Date:** 2026-11-19  
**Phase:** 11 — Quality, Performance & Release  
**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL  
**Baseline:** Phase 10 CLOSED (2026-11-19), commit `d42120c`

## Decisions requiring approval: D-P11-01..D-P11-08

---

### D-P11-01 — Release target and scope

- **Context:** Phase 11 is the final phase; release scope must be bounded.
- **Options:** (A) Release the current feature set as v1.0 (recommended); (B) Add a final feature sprint.
- **Recommended:** (A) Release the current feature set.
- **Rationale:** All roadmap phases 00–10 are closed. No new domains should be added without product justification.
- **Trade-offs:** Deferred capabilities (2D solver, hybrid 2D/3D, ML, cloud) remain post-release.
- **Impact:** Defines the release boundary.

### D-P11-02 — Definition of Done

- **Context:** A measurable DoD is required for release.
- **Recommended:** Release candidate qualifies when all of the following hold:
  1. `npm run check` PASS.
  2. `npm test` 100% pass (no skipped/known failures except documented flakes).
  3. `npm run build` PASS.
  4. Playwright critical workflows 100% pass on Chrome and Edge.
  5. Firefox: documented pass/fail matrix; no release-blocking failures.
  6. No release-blocking security findings.
  7. Project save/reopen round-trip verified for every domain including extensions.
  8. Release documentation complete (getting-started, known limitations, release notes).
  9. Notices generated and committed.
  10. Final acceptance test passed.
- **Trade-offs:** Strict gate may delay release; accepted.

### D-P11-03 — Performance benchmark approach

- **Context:** No formal benchmark baseline exists.
- **Recommended:** Add a lightweight, in-repo benchmark harness (Node scripts + browser micro-benchmarks) measuring the metrics in the validation strategy. Commit results as evidence. No external benchmark service.
- **Rationale:** Reproducible, local-first, consistent with ADR 0002 (no new dependencies unless justified).
- **Trade-offs:** Less sophisticated than Lighthouse/Playwright perf; acceptable for v1.

### D-P11-04 — Cross-browser support matrix

- **Context:** Only Chromium has been exercised.
- **Recommended:** Chrome and Edge are release-supported (Chromium). Firefox is best-effort with a documented compatibility matrix; Firefox-specific failures (COOP/COEP for SharedArrayBuffer) are accepted limitations, not blockers, unless they break core workflows.
- **Trade-offs:** Firefox users may see reduced Python cancellation capability.

### D-P11-05 — POC-06 Hybrid 2D/3D handling

- **Context:** POC-06 is required before long-term design finalization but not performed.
- **Options:** (A) Include a limited feasibility spike in Phase 11 (recommended); (B) Defer entirely to post-release.
- **Recommended:** (A) Limited feasibility spike (render coexistence cost, interaction constraints) as a technical validation item, not a product feature. Not a release blocker unless it reveals a structural conflict.
- **Rationale:** Satisfies the spec's validation requirement without scope creep; surfaces architectural risk early.
- **Trade-offs:** Adds ~1 milestone of work; bounded and optional.
- **Impact:** POC-06 becomes "validated for feasibility" rather than "implemented".

### D-P11-06 — Bundle size strategy

- **Context:** Main bundle exceeds 500 KiB.
- **Recommended:** Evaluate code-splitting (dynamic imports) feasibility; apply only low-risk splits (e.g., Python/Pyodide already lazy). Do not block release on bundle size unless it exceeds a measured, device-tested budget.
- **Rationale:** Premature optimization risk; measurement first.
- **Trade-offs:** Large initial download for low-end devices; documented.

### D-P11-07 — Release artifact and versioning

- **Context:** No versioning/release artifact process exists.
- **Recommended:** Bump to `1.0.0`, generate `THIRD_PARTY_NOTICES.md` from lockfile, produce a static build artifact + source archive, tag the commit. No npm publish (local-first app).
- **Trade-offs:** Manual process; acceptable for v1.

### D-P11-08 — ADR handling

- **Context:** ADR 0001–0004 are accepted/proposed.
- **Recommended:** Do not reopen ADRs. Phase 11 may add a new ADR 0005 for release engineering decisions if needed.
- **Rationale:** Stability over churn.
