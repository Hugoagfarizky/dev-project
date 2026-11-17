# Phase 07 — Python Runtime: Consolidated Decision Package

**Date:** 2026-11-16  
**Phase:** 07 — Python Runtime (next official phase after MVP-3)  
**Status:** APPROVED — IMPLEMENTED — CLOSED — PASS (Project Owner accepted 2026-11-17)  
**Closure record:** [`PHASE_07_CLOSURE_REPORT.md`](PHASE_07_CLOSURE_REPORT.md)  
**Gate evidence:** [`../poc-04/POC_04_PYTHON_RUNTIME_REPORT.md`](../poc-04/POC_04_PYTHON_RUNTIME_REPORT.md)  
**ADR:** [`../../../../docs/decisions/0004-python-runtime-and-execution-model.md`](../../../../docs/decisions/0004-python-runtime-and-execution-model.md)

> This document is the historical decision package that preceded implementation. Its decisions were
> approved, the phase was implemented at commit `26a16ef`, and Phase 07 was closed as **CLOSED — PASS**
> on 2026-11-17. Statements below describing work as blocked, not started, or awaiting Owner action
> are retained as historical context only.

## 1. Why this package exists

The product specification confirms Phase 07 as the next phase, but it also sets three pre-implementation gates:

1. **POC 4 must validate worker isolation, restricted API access, cancellation or timeout, and error reporting before
   Phase 07 begins** (specification §11).
2. **Acceptance criteria for Python must be defined before implementation begins** (specification §8).
3. **Final resource limits must not be invented in advance; they will be established by POC evidence** (specification
   §8).

POC 4 has now been executed (12/12 scenarios passed). The evidence answers the runtime questions. The remaining items —
the published Python API, the limits derived from the evidence, the node model, the persistence shape, and the
acceptance criteria — are product/security decisions. They are consolidated here as one decision request, as authorized.

**No production source, dependency, or configuration has been changed.** Implementing before these decisions would
invent undocumented behavior, which the authorization explicitly forbids.

## 2. POC 4 evidence summary

| Finding | Evidence |
|---|---|
| Pyodide 314.0.8 runs in a module Web Worker | 12/12 scenarios passed, Chromium 158.0.8127.18 |
| Cold startup | 2 211 ms total (144 ms module load + 2 061 ms interpreter init) |
| Warm restart after terminate | 2 088 ms |
| Simple execution | 10 ms for `sum(range(200000))` |
| Messaging round-trip | 1.01 ms average (20 samples) |
| UI responsiveness | 148 frames, 16.67 ms max frame gap during a 2 451 ms Python busy loop |
| Interrupt | infinite loop stopped in 333 ms; worker survived |
| Terminate | worker stopped; restart succeeded |
| Error reporting | `SyntaxError` and `ZeroDivisionError` with tracebacks and line numbers |
| Output cap | 200 000-character result truncated to 65 536 characters |
| Capability probe | DOM absent; `fetch`, `XMLHttpRequest`, `WebSocket`, `indexedDB`, `caches`, `importScripts` reachable |
| Capability lockdown | six network/storage globals shadowed; Python still executed |
| Memory | `performance.memory` does not represent the Pyodide Wasm heap; no usable hard cap demonstrated |

## 3. Decisions requiring Project Owner approval

### D-P07-01 — Python runtime selection

**Recommendation:** Adopt **Pyodide 314.0.8** in a dedicated **module Web Worker**, lazy-initialized, self-hosted at a
pinned version, with no runtime package installation.

**Why:** full CPython semantics, proven interrupt/terminate behavior, strong error fidelity, and the lowest long-term
compatibility risk. Startup and size are acceptable for a lazy-loaded editor runtime.

**Alternatives:** Brython, Skulpt, MicroPython (WASM), remote execution, no Python. All rejected in the POC report §6.

**Consequence:** ~14 MB core distribution plus assets must be self-hosted; startup needs a loading state.

---

### D-P07-02 — Cancellation, timeout, and restart policy

**Recommendation:**

- One invocation at a time per worker.
- Hard timeout **1 000 ms** per invocation (configurable constant, not user-editable in v1).
- On timeout: write the interrupt buffer first; if the call does not stop within **250 ms**, terminate the worker.
- Restart lazily on the next invocation; at most **3 restarts per minute** to avoid thrash.
- `Stop` and `Reset` cancel the active call immediately (interrupt, then terminate after 250 ms) and discard its queued
  actions.
- `Pause` does not abort an active call; its result is queued and applied only after resume.
- A cancelled or timed-out call produces a Console diagnostic with code `PYTHON_TIMEOUT` or `PYTHON_CANCELLED`.

**Evidence:** interrupt stopped an infinite loop in 333 ms; terminate plus restart took ~2.1 s; UI stayed responsive.

**Alternatives:** terminate-only (simpler, but a 2.1 s restart on every timeout); no timeout (rejected — a hung script
would wedge the queue).

---

### D-P07-03 — Python API v1 (published contract)

**Recommendation:** Publish this minimal, data-only API. No DOM, network, file, audio, input, or application internals.

```python
from simuforge import world, simulation

entity = world.get("Ball")          # by name; raises LookupError if missing
entity.id                           # str, read-only
entity.name                         # str, read-only
entity.position                     # (x, y, z) tuple, read-only snapshot
entity.velocity                     # (x, y, z) tuple, read-only snapshot
entity.apply_force((0.0, 4.0, 0.0)) # Newtons
entity.apply_impulse((0.0, 1.0, 0.0)) # N*s
entity.clear_forces()

simulation.time                     # seconds since Play
simulation.dt                       # fixed timestep in seconds

world.log("message")                # Console entry, source "PYTHON"
```

**Explicitly excluded from v1:** `input`, `play_sound`, entity creation/deletion, component mutation, arbitrary asset
access, package installation, and any Python-to-JavaScript bridge (`js`, `pyodide`, `micropip`). The runtime installs an
import hook that rejects those modules, plus network-capable standard-library modules (`urllib`, `http`, `socket`,
`ssl`, `ftplib`).

**Data boundary:** the worker receives a serializable snapshot of the entities the script may read and returns a list of
declarative actions (`apply_force`, `apply_impulse`, `clear_forces`, `log`). The main thread validates and applies them
through the existing M1-E APIs. The worker never receives host objects.

**Alternatives:** the mockup's `input.on_pressed` / `world.play_sound` API (no input or audio system exists); exposing
raw world state (violates the boundary); no API beyond `print` (not useful).

---

### D-P07-04 — Graph integration and asynchronous scheduling

**Recommendation:** Add one graph node type, **`runPython`**, with execution input/output ports and a `scriptId` config.
Python source lives in standalone project scripts (Python tab), never inline in a graph node.

Execution semantics:

- The execution plan remains deterministic and topological.
- `runPython` suspends the chain until the worker returns, times out, or is cancelled.
- The simulation keeps stepping while the chain is suspended; the script sees the snapshot taken when the node started.
- Returned actions are applied atomically, in order, when the call completes; a failed call applies nothing.
- A failed or timed-out Python node stops the chain with a `GRAPH_EXECUTION_FAILED` diagnostic, matching M2-C.
- The existing six node types and their behavior are unchanged.

**Alternatives:**

- Standalone scripts with Python-specific `on_start` / `on_contact` decorators: duplicates the graph trigger model and
  creates two scheduling systems.
- Fire-and-forget Python calls: breaks ordering and atomicity.
- Inline Python source in nodes: mixes authoring surfaces and complicates validation.

**Note:** the design documents say visual scripting and Python are separate authoring surfaces and that cross-language
interoperability is an open question. This recommendation keeps them separate at authoring time and joins them only
through a reference node at execution time.

---

### D-P07-05 — Persistence shape and compatibility

**Recommendation:** Add an optional, additive `python` field to `ProjectDocument`; keep `schemaVersion: 1`.

```json
{
  "format": "simuforge.project",
  "schemaVersion": 1,
  "python": {
    "scripts": [
      { "id": "py-<uuid>", "name": "launch.py", "source": "..." }
    ]
  }
}
```

- Missing `python` = no scripts; existing projects open unchanged.
- Invalid Python data must not block opening: strip the invalid script, keep the project, and surface a warning in
  `ProjectValidationResult.warnings` plus a Console `PYTHON_INVALID` warning (same pattern as M2-E graphs).
- Script ids must be unique; names must be unique and non-empty; source must be ≤ 64 KiB.
- `runPython` nodes must reference an existing script id; a missing reference is a validation error.
- Save/reopen must round-trip scripts and node references.

**Alternatives:** bump `schemaVersion` to 2 (requires a migration for no functional gain); store scripts inside graph
nodes (duplicates source and breaks the separate surface).

---

### D-P07-06 — Resource limits

Derived from POC evidence, not invented:

| Limit | Proposed value | Basis |
|---|---|---|
| Execution timeout | 1 000 ms | Simple work took 10 ms; 1 s is generous and keeps the queue responsive |
| Interrupt grace before terminate | 250 ms | Interrupt stopped a loop in 333 ms end-to-end |
| Source size | 64 KiB per script | Prevents pathological parse/transfer costs; aligns with output cap |
| Output size | 64 KiB per invocation | Verified truncation at 65 536 characters |
| Console lines per invocation | 200 | Prevents console flooding |
| Worker restarts | 3 per minute | Avoids restart thrash after repeated timeouts |
| Memory | No hard cap in v1; watchdog + terminate | POC found no reliable Wasm-heap measurement; a hard cap would be invented |

**Open question for the Owner:** whether to accept "no hard memory cap" in v1. If a hard cap is required, a dedicated
memory POC is needed before implementation.

---

### D-P07-07 — Python editor UX

**Recommendation:** A dedicated **Python** tab in the Program preset, matching the existing design documents:

- file tabs, create/rename/delete, dirty state;
- a minimal built-in code editor (textarea plus line-number gutter) for v1 — **no new editor dependency**;
- diagnostics list with line/column parsed from tracebacks;
- API reference drawer generated from the approved API manifest;
- runtime chip: `Unavailable`, `Loading`, `Ready`, `Running`, `Timeout`, `Error`;
- Console output filtered with a `PYTHON` source chip;
- the editor is read-only while the simulation is running;
- the tab remains hidden/`Planned` until the runtime is available.

**Alternatives:** add CodeMirror/Monaco (new dependency; deferred); no editor (contradicts the design).

---

### D-P07-08 — Acceptance criteria for Phase 07

**Recommendation:** Approve the following criteria as the Phase 07 definition of done:

1. The Python tab shows `Planned`/`Unavailable` before the runtime is ready and `Loading` during lazy startup.
2. A user can create, rename, edit, and delete a Python script; the source persists across save and reopen.
3. A `runPython` node referencing a script executes on a graph trigger and can read entity position/velocity and apply
   force, impulse, or clear-force actions.
4. Python syntax and runtime errors appear in the Console with source `PYTHON` and a line number; the simulation state
   is not corrupted and the chain stops according to the existing failure contract.
5. An infinite-loop script is interrupted within 1.5 s; the UI remains responsive; the runtime recovers for the next
   call.
6. `Stop` and `Reset` cancel an active call and discard queued actions; `Pause` does not apply a Python result until
   resume.
7. A source larger than 64 KiB is rejected with a validation message; an output larger than 64 KiB is truncated with a
   warning.
8. Projects without `python` data open and run unchanged; invalid Python data warns and does not block opening.
9. The existing six node types, visual graph execution, physics lifecycle, and project persistence behave unchanged.
10. Full MVP-0 through MVP-3 regression, `npm test`, `npm run check`, and `npm run build` pass.
11. Browser acceptance covers: script authoring, run, error, timeout, cancellation, save/reopen, and backward
    compatibility.

## 4. Proposed implementation sequence after approval

| Order | Work package | Depends on |
|---|---|---|
| 1 | Python project model, validation, persistence (`python?`, scripts) | D-P07-05 |
| 2 | Worker runtime, protocol, limits, capability lockdown | D-P07-01, D-P07-02, D-P07-06 |
| 3 | Python API v1 (snapshot in, actions out, import hook) | D-P07-03 |
| 4 | `runPython` node, async chain scheduling, lifecycle integration | D-P07-04 |
| 5 | Python editor, diagnostics, API drawer, Console routing | D-P07-07 |
| 6 | Unit/integration tests, browser acceptance, full regression | D-P07-08 |

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Pyodide startup feels slow | Lazy init on first Python use; explicit loading state; never create a worker per trigger |
| Worker is not a security boundary | Capability shadowing + strict CSP + data-only protocol + message validation |
| Forged worker messages | Session ids, message schema validation, ignore unknown fields |
| No hard memory cap | Watchdog + terminate; document the limitation; require a memory POC if a hard cap is mandated |
| Async chain complicates determinism | Snapshot at node start; atomic action application; document snapshot-determinism |
| Pyodide upgrade breaks behavior | Pin the version; re-run POC 4 on upgrade |
| Scope creep into audio/input/robotics | v1 API is limited to existing simulation capabilities |

## 6. What is blocked

Until the Owner approves D-P07-01 through D-P07-08 (or amends them), the following cannot start without inventing
undocumented behavior: the Python project model, worker runtime, API, `runPython` node, editor, persistence, and
acceptance tests.

## 7. Requested Owner action

Approve, reject, or amend each decision above in one response. On approval, implementation proceeds in the sequence in
§4 and reports READY FOR PROJECT OWNER ACCEPTANCE; closure still requires a separate explicit Owner acceptance.
