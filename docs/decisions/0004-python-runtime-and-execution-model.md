# 0004. Python runtime and execution boundary

- Status: proposed
- Date: 2026-11-16
- Project: simuforge
- Related: [ADR 0001](0001-proposed-architecture-direction.md), [POC 4 report](../../projects/simuforge/reports/poc-04/POC_04_PYTHON_RUNTIME_REPORT.md)
- Supersedes: None

## Context

The product specification places Python outside the initial vertical slice (MVP-0 to MVP-3) and requires a separate
increment, Phase 07. It states that Python acceptance criteria must be defined before implementation begins and that
resource limits must come from POC evidence, not guesses. POC 4 is the required validation activity and must confirm
worker isolation, restricted API access, cancellation or timeout, and error reporting before Phase 07 begins.

ADR 0001 proposes worker-based Python execution with restricted capabilities but is itself `proposed` and requires POC 4
evidence. The architecture document lists the execution model and the visual-scripting/Python boundary as open questions.

POC 4 was executed on 2026-11-16 with Pyodide 314.0.8 in a module Web Worker. It measured startup, execution, messaging,
interrupt, termination, restart, error reporting, output truncation, UI responsiveness, and capability reachability. The
full evidence is in `projects/simuforge/reports/poc-04/evidence/poc04-results.json` and the analysis is in the POC report.

## Decision

Adopt **Pyodide 314.0.8** as the Python runtime, executed in a **dedicated module Web Worker** with an asynchronous,
data-only message protocol.

The execution boundary is:

- The canonical project, graph, and world state stay on the main thread. The worker receives only the source to execute
  and an explicit, serializable snapshot of the data the published Python API allows it to read.
- The worker returns only serializable results, diagnostics, and requested actions. It never receives React, Babylon,
  store, or other host objects.
- Execution is request/response, not shared state. One invocation runs at a time per worker.
- Cancellation is interrupt-first through a `SharedArrayBuffer` interrupt buffer when the page is cross-origin
  isolated, with `worker.terminate()` and a fresh worker as the fallback for a wedged interpreter.
- The runtime is lazy-initialized on first use, self-hosted at a pinned version, and never installs packages at runtime.
- Capability hardening is defence in depth: network and storage globals are shadowed after initialization, and a strict
  CSP is applied in production. This is not claimed to be a complete sandbox.

The Python API surface, resource limits, node model, persistence schema, and acceptance criteria are separate decisions
recorded in the Phase 07 decision package. This ADR selects the runtime and the execution boundary only.

## Alternatives considered

| Alternative | Why not selected |
|---|---|
| Pyodide on the main thread | Blocks the UI; no hard cancellation; rejected by the specification's UI-responsiveness requirement. |
| Brython | Main-thread execution by default, partial CPython compatibility, weaker cancellation story. |
| Skulpt | Partial Python 3, limited standard library, weaker cancellation and error fidelity. |
| MicroPython (WASM) | Small and fast, but limited compatibility and a smaller ecosystem; higher long-term migration risk. |
| Remote execution service | Adds operational cost, privacy exposure, and network dependency; out of scope for a local-first Studio. |
| No Python in this release | Contradicts the product vision and the Phase 07 authorization. |

## Consequences

Easier:

- Full CPython semantics for user scripts, including familiar tracebacks and standard-library behavior.
- A clear, testable boundary: strings and serializable data only.
- UI responsiveness is preserved by construction.
- Cancellation has two proven paths (interrupt and terminate/restart).

Harder:

- A ~2.2 s lazy startup must be designed into the UX; the editor needs a loading/ready state.
- The Pyodide distribution (~14 MB core plus assets) must be self-hosted and version-pinned.
- `SharedArrayBuffer` interrupt requires cross-origin isolation (COOP/COEP) in deployment; without it, only
  terminate-based cancellation is available.
- Capability hardening is best-effort; CSP and message validation are mandatory, not optional.
- There is no reliable per-worker memory cap; memory exhaustion is handled by a watchdog and termination.
- Upgrading Pyodide requires re-running POC 4 evidence.

Must be maintained:

- The pinned runtime version and its notices.
- The message protocol, its session ids, and its size limits.
- The threat model and the capability-shadowing list.
- The published Python API as a versioned contract.

## Validation

- POC 4: 12/12 scenarios passed in Chromium 158.0.8127.18.
- Evidence: `projects/simuforge/reports/poc-04/evidence/poc04-results.json`.
- Report: `projects/simuforge/reports/poc-04/POC_04_PYTHON_RUNTIME_REPORT.md`.

## Open questions (for the Phase 07 decision package)

1. Exact Python API surface for v1.
2. Execution timeout, source-size, output-size, and memory-watchdog limits.
3. Python node model and graph scheduling semantics for asynchronous execution.
4. Persistence shape and schema-version strategy for Python sources.
5. Whether the Python editor is a separate authoring surface only (no graph conversion).
6. Acceptance criteria for Phase 07.

Until this ADR is accepted, the decision is not binding and no production Python runtime should be shipped.
