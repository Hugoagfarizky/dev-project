# SP-05 CDP Runner

Automated, direct-CDP execution of the SP-05 harness. No third-party dependencies.

## Requirements

- Node.js 22 or newer (global `WebSocket` and `fetch`).
- Google Chrome installed. The runner looks in the standard Windows locations, or uses `CHROME_PATH`.
- A free CDP port. The default is `9223`; the runner refuses to share an existing browser session.
- Windows: Chrome is terminated with `taskkill /PID <pid> /T /F` at the end of a run.

## Usage

```text
node run.js --cases proof --passes 2
node run.js --cases t01,t02,t04 --passes 1 --out <dir>
node run.js --cases all --out <dir>          # full suite; do not run yet
```

Options:

| Option | Meaning |
| --- | --- |
| `--cases proof` | T-01, T-02, T-04 with proof-mode scope |
| `--cases all` | T-01 through T-06 |
| `--cases t01,...` | explicit case IDs |
| `--passes n` | repeat every selected case `n` times; each repetition reloads from disk |
| `--out dir` | evidence directory (default: `results/sp-05-automated/proof` or `.../full`) |
| `--port n` | CDP port for the owned Chrome instance (default `9223`) |
| `--attach` | attach to an existing Chrome on `--port` instead of launching |
| `--continue-on-fail` | do not stop after the first failing case |
| `--keep-browser` | leave the launched Chrome running |
| `--window-size WxH` | default `1400x1000` |

`--cases proof` writes `proof_`-prefixed filenames with a `_passN` suffix. Other selections use the official SP-05 filenames; point `--out` at the official evidence directory only when the full suite is authorised.

## What the runner does per case

1. Reloads `../sp05.html` from disk with cache disabled.
2. Waits for the harness diagnostics and Inspector to be ready.
3. Declares `window.__simuforgeInputProvenance = { method: "cdp_trusted_input", ... }`.
4. Clears the harness log and resets the transform through the harness buttons.
5. Discovers handles from the live gizmo scene graph and verifies each with `scene.pick`.
6. Drives the drag with `Input.dispatchMouseEvent` (hover, press, fixed-step moves, release).
7. Reconciles the CDP event sequence with the harness-observed pointer trace.
8. Reads the Babylon drag lifecycle counts and captures before/after transforms.
9. Captures the required screenshot(s).
10. Clicks `Record Observation`, exports the harness JSON through download interception, and validates every provenance field.
11. Writes a sidecar audit record and a `run_summary.json`.

## Evidence layout

For a proof run:

```text
results/sp-05-automated/proof/
├── run_summary.json
├── proof_sp-05_translate_x_pass1.png
├── proof_sp-05_translate_log_pass1.json
├── proof_sp-05_translate_audit_pass1.json
├── ... (pass 2)
```

The harness export keeps the original `sp-05_*` filenames; proof artifacts add `proof_` and `_passN`. The sidecar audit record contains the CDP events, harness drag trace, lifecycle counts, handle discovery, space checks, before/after snapshots, assertions, environment, console summary, and artifact hashes.

## Assertion and retry policy

- Assertions are recorded, never thrown away. A failed assertion fails the case and, by default, stops the run.
- Only transport/session failures are retried (closed WebSocket, destroyed execution context, navigation, timeout). A retry reloads the page and repeats the case once.
- Logical failures (missing handle, wrong axis, untrusted event, cross-axis activity, unexpected console error, provenance mismatch) are never retried.
- Programmatic transforms, synthetic events, direct gizmo method calls, and debugger injection are not used.

## Scope and status

The runner prepares T-01 through T-06 but does not replace human review. Screenshots still require review for visual axis alignment. SP-05 remains BLOCKED until the full T-01 through T-06 evidence is captured and reviewed. Do not start SP-06.
