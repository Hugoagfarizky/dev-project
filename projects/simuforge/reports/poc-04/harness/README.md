# POC 4 — Python runtime harness

This folder is the reproducible harness for POC 4 (Python Runtime), the gate for Phase 07 in the
[product specification](../../../docs/PRODUCT_SPECIFICATION.md). It is not part of the Studio application and is not
bundled into the production build.

## What it does

The runner:

1. serves this folder over HTTP with `Cross-Origin-Opener-Policy: same-origin` and
   `Cross-Origin-Embedder-Policy: credentialless`, which enables `SharedArrayBuffer` and the Pyodide interrupt buffer;
2. proxies a pinned Pyodide distribution from jsDelivr under `/pyodide/` so the runtime is same-origin;
3. launches headless Chromium through the app's Playwright install;
4. exercises initialization, execution, messaging, syntax/runtime errors, capability probing and lockdown, memory
   observation, UI responsiveness, interrupt, hard termination, restart, and output truncation;
5. writes `../evidence/poc04-results.json` and four screenshots.

## Prerequisites

- Node 24 (the repository's documented Node version)
- The app's Playwright install and Chromium browser
  (`projects/simuforge/app/node_modules`, installed by the app's `npm install` and `npx playwright install chromium`)
- Network access for the pinned Pyodide assets on first run. The runner proxies them through the local server; no
  browser CORS configuration is required.

## Run

From the repository root:

```powershell
node projects/simuforge/reports/poc-04/harness/run-poc.mjs
```

The runner prints the evidence path and the aggregate result. Exit code is 0 even when scenarios fail; inspect
`allPassed` in the evidence file.

## Pinned versions

- Pyodide `314.0.8` (MPL-2.0), from `https://cdn.jsdelivr.net/pyodide/v314.0.8/full/`
- Chromium from the app's Playwright version

## Notes

- The harness uses a module worker. Pyodide 314 does not support classic workers.
- The capability-lockdown scenario shadows `fetch`, `XMLHttpRequest`, `WebSocket`, `indexedDB`, `caches`, and
  `importScripts` on the worker global. This is a defence-in-depth measure, not a hardened sandbox; see the POC report
  for residual risks.
- `performance.memory` does not represent Pyodide's Wasm heap. The memory scenario records that limitation rather than
  claiming a working memory cap.
