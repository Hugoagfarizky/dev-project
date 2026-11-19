# Phase 11 — Quality, Performance & Release: Validation Strategy

**Date:** 2026-11-19  
**Phase:** 11 — Quality, Performance & Release  
**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL

## 1. Full regression

- `npm run check` (Node, typecheck, boundaries, tokens).
- `npm test` — 100% pass; no new skipped tests without documented reason.
- `npm run build` — PASS.
- Playwright `--workers=1` — 100% pass on Chromium.
- Phase 10 E2E 2/2.

## 2. Cross-browser critical workflows

- Chrome and Edge (Chromium): full Playwright suite.
- Firefox: manual + targeted Playwright run; document COOP/COEP and SharedArrayBuffer gaps.

## 3. Performance benchmarks

Metrics to capture (no asserted numbers before measurement):

| Area | Metric |
|---|---|
| Viewport/render | Frame time, draw calls, mesh count, heap |
| Physics | Fixed-step cost per entity, worst-case step, accumulator remainder |
| Graph execution | Chain execution time vs node count |
| Python | Startup, execution, messaging, cancellation |
| Electrical | MNA solve time vs node count |
| Robotics | Joint/motor/sensor step cost |
| Extensions | Worker startup, hook round-trip, timeout |
| Memory | Heap growth over 10 min; cleanup on Stop/Reset; worker termination |

Method: in-repo harness; commit evidence; compare against baseline.

## 4. Memory and resource stability

- 10-minute run with no unbounded heap growth.
- Stop/Reset releases runtime bodies, workers, and Pyodide instance.
- No leaked event listeners or subscriptions.

## 5. Security boundary verification

- Worker message validation (invalid/stale messages ignored).
- Permission enforcement (read:world, write:components) at host call sites.
- Fuzz invalid project JSON and oversize files.
- Dependency/license audit; regenerate notices.
- Document non-guarantees (worker is not a sandbox).

## 6. Project save/reopen integrity

- Round-trip every domain: world, graph, Python, electrical, robotics, extensions.
- Corrupt/oversize/unsupported-version rejection.
- Storage unavailable and quota-exceeded paths.

## 7. Runtime and extension reliability

- Play/Pause/Stop/Reset across all domains and extension hooks.
- Worker crash/timeout recovery.
- Python timeout and cancellation.
- Graph failure pauses runtime; last valid state preserved.

## 8. Production build

- `npm run build` PASS.
- Static artifact serves correctly.
- COOP/COEP header guidance documented.

## 9. Documentation completeness

- Getting-started guide.
- Known limitations and release notes.
- Cross-browser compatibility matrix.
- Security boundary document.
- Release checklist.

## 10. Release readiness

- Version bump to 1.0.0.
- Tagged commit.
- Notices committed.
- Final acceptance report.

## 11. Acceptance criteria (measurable)

| # | Criterion | Gate |
|---|---|---|
| 1 | `npm run check` PASS | Blocker |
| 2 | `npm test` 100% pass | Blocker |
| 3 | `npm run build` PASS | Blocker |
| 4 | Playwright 100% on Chrome/Edge | Blocker |
| 5 | Firefox documented matrix | Must fix / Accepted limitation |
| 6 | No release-blocking security findings | Blocker |
| 7 | Save/reopen integrity all domains | Blocker |
| 8 | Performance baseline recorded | Must fix |
| 9 | Release documentation complete | Blocker |
| 10 | Final acceptance test passed | Blocker |

## 12. Priority classification

- **Release blocker:** criteria 1–7, 10.
- **Must fix:** criteria 8–9.
- **Accepted limitation:** Firefox gaps, bundle size (if within budget), POC-06 deferred.
- **Deferred enhancement:** 2D solver, hybrid 2D/3D implementation, ML, cloud.
