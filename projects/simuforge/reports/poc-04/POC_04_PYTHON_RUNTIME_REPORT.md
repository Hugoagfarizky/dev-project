# POC 4 — Python Runtime Validation Report

**Date:** 2026-11-16  
**Project:** SimuForge  
**Gate:** Phase 07 — Python Runtime (product specification §8 and §11)  
**Status:** POC EXECUTED — EVIDENCE COMPLETE — RECOMMENDATION PROPOSED (not an accepted decision)  
**Evidence:** [`evidence/poc04-results.json`](evidence/poc04-results.json)  
**Harness:** [`harness/`](harness/README.md)  
**Browser:** Chromium 158.0.8127.18 (headless)  
**Runtime tested:** Pyodide 314.0.8 (pinned, jsDelivr distribution proxied same-origin)

## 1. Purpose and constraints

The product specification requires POC 4 to validate **worker isolation, restricted API access, cancellation or
timeout, and error reporting before Phase 07 begins**, and states that **resource limits must come from POC evidence,
not guesses**. ADR 0001 additionally requires POC 4 to measure startup, execution, and messaging costs and to support a
threat-model review.

Constraints taken from the specification and design documents:

- User-authored Python is untrusted code.
- Worker isolation alone is not a security boundary.
- Canonical graph data must stay independent of the Python runtime.
- The Studio UI must stay responsive during execution.
- Python must not reach unrestricted browser APIs or application internals.
- The Python API is not a contract until the Phase 07 decision publishes it.
- No production feature work is authorized by this POC.

## 2. Test cases and results

All 12 scenarios passed. Each scenario records explicit assertions in the evidence file.

| # | Scenario | Result | Key measurements |
|---|---|---|---|
| 1 | Initialization | PASS | worker module load 144 ms; interpreter init 2 061 ms; total 2 211 ms |
| 2 | Simple execution | PASS | `sum(range(200000))` → `19999900000`; 10 ms |
| 3 | Messaging round-trip | PASS | 20 samples; average 1.01 ms; max 2.05 ms |
| 4 | Syntax error reporting | PASS | `SyntaxError` with traceback and source lines; 29 ms |
| 5 | Runtime error reporting | PASS | `ZeroDivisionError`; traceback includes `<exec>`, line 1; 3 ms |
| 6 | Capability probe | PASS (DOM absent) | `window`/`document` absent; `fetch`, `XMLHttpRequest`, `WebSocket`, `indexedDB`, `caches`, `importScripts` present |
| 7 | Capability lockdown | PASS | six network/storage globals shadowed; Python still executed `6 * 7` → `42` |
| 8 | Memory observation | PASS (measurement only) | `performance.memory` stayed at 10 000 000 bytes across allocation/free — not a usable Pyodide memory signal |
| 9 | UI responsiveness | PASS | 148 frames rendered, max frame gap 16.67 ms during a 2 451 ms Python busy loop |
| 10 | Interrupt (`SharedArrayBuffer`) | PASS | infinite loop stopped in 333 ms; `KeyboardInterrupt`; worker survived and returned `6` |
| 11 | Hard cancellation (`terminate`) | PASS | worker stopped; restart 2 088 ms; `2 + 2` → `4` |
| 12 | Output truncation | PASS | 200 000-character result capped at 65 536 characters with `truncated: true` |

Isolation: `crossOriginIsolated: true`, `SharedArrayBuffer` available. The interrupt buffer was attached successfully.

## 3. Performance observations

| Measurement | Observed | Implication |
|---|---|---|
| Cold startup (module load + interpreter init) | ~2.2 s | Must be lazy and shown as a loading state; not suitable for per-trigger creation |
| Warm restart after terminate | ~2.1 s | Hard cancellation is safe but costly; prefer interrupt first |
| Simple execution | ~10 ms | Message overhead dominates trivial work |
| Messaging round-trip | ~1 ms average | Fine-grained per-frame calls are feasible but should be batched |
| Interrupt stop | ~333 ms | Acceptable for a user-visible "stop"; must be paired with a timeout |
| Terminate stop | ~315 ms + restart | Last-resort path for a wedged interpreter |
| UI frame gap during 2.45 s busy loop | 16.67 ms max | Main thread stayed responsive; worker isolation meets the UI requirement |
| Output cap | 65 536 chars | Prevents message-channel flooding; needs a documented contract |

These numbers are Chromium-only, on one machine, with the Pyodide distribution served through a local proxy backed by a
CDN. They are evidence for order-of-magnitude decisions, not production SLOs.

## 4. Security review and threat model

The POC confirms the ADR 0001 warning: **a Web Worker is an isolation mechanism, not a capability boundary.** Python in
the worker had no DOM, but it did have `fetch`, `XMLHttpRequest`, `WebSocket`, `indexedDB`, `caches`, and
`importScripts`. Shadowing those globals after initialization removed network and storage access while Python kept
running.

| Threat | Evidence | Mitigation required |
|---|---|---|
| CPU exhaustion / infinite loop | Interrupt stopped a `while True` loop in 333 ms; terminate also worked | Per-invocation timeout; interrupt first, terminate and restart as fallback |
| Memory exhaustion | No usable memory signal from `performance.memory` | Watchdog + terminate; treat memory as a best-effort limit; document that a hard cap is unavailable in-browser |
| Network exfiltration | `fetch`, `XMLHttpRequest`, `WebSocket` reachable by default | Shadow globals after init; add strict CSP (`connect-src 'none'`) as defence in depth; self-host assets |
| Storage access | `indexedDB`, `caches` reachable by default | Shadow globals; do not expose project data through storage APIs |
| Forged protocol messages | `js.postMessage` remains reachable | Validate every message (type, session id, size); never trust worker-originated control data |
| Access to app internals | No host objects are exposed; only strings cross the boundary | Keep the boundary data-only; never pass React/Babylon/store objects |
| Malicious project import | Source is inert until Play | Do not auto-run on open/import; warn on import; run only on explicit Play |
| Output flood | 200 000-character result truncated | Cap result, console lines, and message size |
| Supply-chain substitution | Pinned Pyodide version | Self-host the exact distribution; verify integrity; no runtime package installation |
| Escape via `eval`/`Function`/dynamic import | Not fully blocked by shadowing | Treat shadowing as defence in depth; rely on CSP and the absence of host capabilities |

Residual risks that must be accepted explicitly:

1. `location`, `navigator`, and `postMessage` remain reachable; they leak origin metadata and allow message injection.
2. `eval`, `Function`, and dynamic `import()` are not removed by property shadowing.
3. There is no reliable per-worker memory cap.
4. A worker with network access can exfiltrate any data placed in its scope; the design must never place secrets there.

## 5. Licensing review

| Component | License | Consequence |
|---|---|---|
| Pyodide | MPL-2.0 | File-level copyleft. Distributing the unmodified distribution is compatible; modifications to MPL-covered files must be published. |
| CPython (inside Pyodide) | PSF-2.0 | Permissive; keep notices. |
| Pyodide-bundled packages | Mixed, per package | Generate third-party notices before release; do not install packages at runtime. |
| jsDelivr CDN | Service, not a dependency | Convenient for the POC; production should self-host the pinned assets. |

No license conflict was found for self-hosting the unmodified Pyodide distribution.

## 6. Candidate evaluation

Only Pyodide was executed. The other candidates were assessed from their documented characteristics and are labelled as
desk research. Scores are 1 (poor) to 5 (strong) for this product's needs.

| Criterion | Pyodide | Brython | Skulpt | MicroPython (WASM) |
|---|---|---|---|---|
| Python compatibility | 5 (CPython 3.14) | 3 | 2 | 2 |
| Worker isolation fit | 4 | 2 (main thread by default) | 2 | 4 |
| Cancellation / timeout | 5 (interrupt + terminate) | 2 | 2 | 3 |
| Startup cost | 2 (~2.2 s) | 4 | 4 | 4 |
| Download size | 2 (~14 MB core package, more with assets) | 4 | 4 | 5 |
| Capability restriction | 4 (worker + shadowing) | 2 | 2 | 3 |
| Maturity / ecosystem | 5 | 3 | 3 | 3 |
| Integration effort | 4 | 2 | 2 | 3 |
| **Overall** | **Recommended** | Not selected | Not selected | Not selected |

Pyodide is recommended because it provides full CPython semantics, proven interrupt/terminate behavior, and the lowest
long-term compatibility risk. Its startup and size costs are acceptable for a lazy-loaded editor runtime and are visible
to the user as a loading state.

## 7. Limitations

- Chromium only; Firefox and Safari were not tested.
- Pyodide 314.0.8 only; the versioning scheme and asset layout must be pinned and re-validated on upgrade.
- The POC used a same-origin proxy to a CDN. Production must self-host the distribution.
- No package installation (`numpy`, `pandas`, etc.) was tested; the recommendation is to disallow runtime installation.
- No memory cap was demonstrated; `performance.memory` does not represent the Wasm heap.
- No multi-threaded or shared-memory Python was tested.
- No determinism or replay testing was performed.
- Capability lockdown is best-effort property shadowing; it is not a hardened sandbox.
- The POC does not define the Python API, node model, persistence schema, or graph scheduling semantics; those are the
  Phase 07 decisions.

## 8. Recommendation

Adopt **Pyodide 314.0.8 in a dedicated module Web Worker**, lazy-initialized, self-hosted, with:

- an async request/response protocol over `postMessage`, data-only, with session ids and message validation;
- a per-invocation timeout (proposed 1 000 ms), interrupt-first cancellation, and terminate/restart as the fallback;
- capability shadowing after initialization plus strict CSP as defence in depth;
- no runtime package installation;
- a 64 KiB source cap and a 64 KiB output cap (to be confirmed by the Owner);
- a published, minimal Python API limited to existing simulation capabilities;
- a separate Python authoring surface, not a conversion of the visual graph.

The exact API, limits, persistence schema, node model, and acceptance criteria are consolidated in
[`../phase-07/PHASE_07_DECISION_PACKAGE.md`](../phase-07/PHASE_07_DECISION_PACKAGE.md) and require explicit Project Owner
approval before implementation begins.
