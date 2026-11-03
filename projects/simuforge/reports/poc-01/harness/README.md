# SP-05 Interactive Harness

File: `sp05.html`

Open in Google Chrome. Uses Babylon.js 9.32.1, right-handed mode, the existing test cube and editor-only grid.

Features:
- Translate/Rotate/Scale gizmo modes.
- Gizmo coordinate-space policy: translate = world, rotate = world, scale = local.
- The policy is applied by `applyGizmoSpace()` after Babylon's lazy gizmo creation and re-applied on every `setMode()` call.
- Live Inspector (position, quaternion, Euler display, scale, quaternion length).
- Quaternion validation (finite components, length within 1e-5).
- Scale validation (finite, positive, >= 1e-3).
- T-05 baseline/final capture and comparison (tolerance 1e-5).
- Evidence checklist and JSON export.
- Explicit input provenance: `physical_mouse`, `cdp_trusted_input`, `synthetic_input`, `programmatic_transform`.
- Pointer trace: per-drag start/end coordinates, move count, `isTrusted`, `pointerType`, and event sequence.
- Read-only diagnostics at `window.__simuforgeDiagnostics` (`getSnapshot`, `getInputTrace`, `getGizmoTree`).

## Provenance

Before interacting, a driver declares its method:

```js
window.__simuforgeInputProvenance = {
  method: "cdp_trusted_input",
  driver: "simuforge-sp05-cdp-runner",
  sessionId: "<run id>"
};
```

Exported entries record `inputMethod`, `sp05Eligible`, `interactionManual`, `interactionAutomated`, `lastDrag`, and `dragCount`. `interactionManual` is `true` only for `physical_mouse`. Untrusted pointer events force `synthetic_input` and are marked ineligible.

For SP-05, `physical_mouse` and `cdp_trusted_input` are approved; `synthetic_input` and `programmatic_transform` are rejected. See the approved method in `../results/sp-05-manual/SP-05_EVIDENCE_PROCEDURE.md`.

## Automated runner

`runner/` contains the direct-CDP runner. It owns Chrome, reloads this harness from disk for every case, recomputes handles from the live gizmo scene, verifies each handle with a scene pick, and drives `Input.dispatchMouseEvent`. See `runner/README.md`.

No fabricated evidence is produced; all results require genuine interaction with the gizmos.
