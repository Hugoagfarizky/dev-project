# SimuForge — Security Boundary

## Web Workers are defense-in-depth, not a sandbox

Python (Pyodide) and extension modules run in dedicated Web Workers. This keeps the Studio UI
responsive and bounds each invocation by timeout/termination, but it is **not** a hardened
security boundary. Worker code can reach worker globals and, depending on the page, network
APIs. Only install trusted project-local extensions and run trusted Python scripts.

## Guarantees

- Canonical project/graph/world state stays on the main thread.
- Workers receive only serializable snapshots and source strings.
- Workers return only serializable results, diagnostics, and requested actions.
- Capability checks (permissions) are enforced host-side, not by worker declarations.
- Worker messages are versioned and re-validated before use.
- Hung workers are terminated and reported.

## Non-guarantees

- No reliable per-worker memory cap (memory exhaustion handled by watchdog + termination).
- No complete prevention of network/storage access from worker code.
- Capability hardening (shadowing globals, CSP) is best-effort.
- Extension source is evaluated with `new Function`; it is not sandboxed.

## Project data

- Project files are untrusted input; validated before any state replacement.
- No `eval`/`Function`/dynamic import on file content.
- Names are rendered as text, not HTML.
- Local data is not encrypted; anyone with browser-profile access can read it.
- Export is the only durable backup.

## Dependencies

- Licenses: MIT, ISC, BSD-3-Clause, Apache-2.0 (see THIRD_PARTY_NOTICES.md).
- MPL-2.0 packages are build-time only.
- No GPL/AGPL/SSPL.
