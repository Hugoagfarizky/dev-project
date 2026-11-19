# Phase 11 — Benchmark Report

**Date:** 2026-11-19  
**Environment:** Node v24.22.2, win32 x64, 16 CPUs, 16088 MB RAM.

## 1. Method

In-repo harness `app/scripts/benchmark.mjs` (Node, `--experimental-strip-types`), 5 warmup +
50–200 iterations per measurement, median/p95 reported. Raw results:
`reports/phase-11/evidence/benchmark-results.json`.

## 2. Results

| Measurement | n | Median (ms) | p95 (ms) |
|---|---|---|---|
| physics.createRuntimeBodies | 10 | 0.0043 | 0.0196 |
| physics.stepBodies | 10 | 0.0142 | 0.0400 |
| physics.createRuntimeBodies | 100 | 0.0116 | 0.1802 |
| physics.stepBodies | 100 | 0.0502 | 0.1224 |
| physics.createRuntimeBodies | 500 | 0.0703 | 0.3403 |
| physics.stepBodies | 500 | 0.1784 | 0.4212 |
| project.validateProjectDocument | 10/100/500 | 0.0005 | 0.0005–0.0017 |
| graph.buildExecutionPlan | 5 | 0.0062 | 0.0083 |
| graph.executeChain | 5 | 0.0054 | 0.0098 |
| graph.buildExecutionPlan | 50 | 0.0619 | 0.1687 |
| graph.executeChain | 50 | 0.0261 | 0.0479 |
| extensions.validateExtensionDocument | 5 entries | 0.0094 | 0.0165 |

## 3. Targets / recommendations

- Physics step scales linearly and stays well under a 16.67 ms frame budget even at 500 bodies.
- Graph execution is sub-millisecond for typical chains.
- No optimization was required; no measured bottleneck exceeded budget. No code changes made for performance.
- Bundle size warning (>500 KiB) retained as accepted limitation (low-risk split not applied; Pyodide already lazy).

## 4. Browser/render/Python/electrical/robotics/extension-worker

Browser render (Babylon) and Python startup are not measured by this harness (require browser/Pyodide).
Qualitative: Python lazy-startup ~2.2 s documented in ADR 0004. No change made.
