# SP-05 Evidence Completion Procedure

This procedure prepares the user to capture genuine manual evidence for SimuForge POC-01 SP-05. It does not execute SP-05 and does not change SP-05 status from BLOCKED.

Harness: `projects/simuforge/reports/poc-01/harness/sp05.html`
Open it in Google Chrome.

Evidence destination: `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`

Create that directory before starting if it does not exist.

## Approval record

| Field | Value |
| --- | --- |
| Approver | Project Owner |
| Approval date | 2026-11-02 |
| Approved method | Direct Chrome DevTools Protocol (CDP) over native Node.js WebSocket, using `Input.dispatchMouseEvent` |
| Scope | SP-05 interaction evidence and the repository's SP-05 runner |
| Explicitly not authorised | Synthetic JavaScript `PointerEvent`s, direct transform assignment, invoking Babylon.js drag methods internally, or bypassing gizmo interaction |
| Evidence condition | Chrome must deliver the events as trusted browser input (`isTrusted: true`) |

This approval adds an automated capture method. It does not relax, replace, or redefine any T-01 through T-06 acceptance criterion, and it does not change the SP-05 status. SP-05 remains BLOCKED until the full T-01 through T-06 evidence exists and has been reviewed.

## Input provenance categories

The harness records how pointer input was produced. The four categories are not interchangeable.

| Method | Production path | `isTrusted` in the page | SP-05 eligibility |
| --- | --- | --- | --- |
| `physical_mouse` | A human operating a physical pointing device; the OS delivers the input to Chrome | `true` | Eligible (original manual procedure) |
| `cdp_trusted_input` | Chrome DevTools Protocol `Input.dispatchMouseEvent`; Chrome's input pipeline produces the DOM pointer events | `true` | Eligible (Project Owner approval, 2026-11-02) |
| `synthetic_input` | JavaScript constructs a `PointerEvent` and calls `dispatchEvent` | `false` | Rejected |
| `programmatic_transform` | Code writes `position`, `rotationQuaternion`, or `scaling` directly | not applicable | Rejected |

Browser-level trusted input and physical OS input are indistinguishable from inside the page: both arrive as trusted pointer events with `pointerType: "mouse"`. The harness therefore records a driver declaration rather than guessing. An approved driver sets:

```js
window.__simuforgeInputProvenance = {
  method: "cdp_trusted_input",
  driver: "simuforge-sp05-cdp-runner",
  sessionId: "<run id>"
};
```

The declaration is recorded verbatim. Any untrusted pointer event overrides the declaration and forces `synthetic_input`; the export is then not SP-05-eligible. A declaration alone cannot convert untrusted input into trusted input.

Every exported entry records `inputMethod`, `provenance`, `sp05Eligible`, `interactionManual`, `interactionAutomated`, `lastDrag`, and `dragCount`. `interactionManual` is now truthful: it is `true` only for `physical_mouse`. CDP interaction is always `interactionManual: false` and `interactionAutomated: true`.

## Automated evidence method (approved)

Runner: `projects/simuforge/reports/poc-01/harness/runner/`

Proof command (does not run the full suite):

```text
node run.js --cases proof --passes 2
```

Full-suite preparation command, for later review (not approved as a substitute for reviewing the evidence):

```text
node run.js --cases all --out projects/simuforge/reports/poc-01/results/sp-05-manual/evidence
```

The runner:

- Owns a dedicated Chrome instance and a dedicated temporary profile, so the page is never treated as occluded.
- Reloads the actual harness from disk before every case; no configuration is injected by a debugger.
- Recomputes handle coordinates from the live gizmo scene graph for every drag.
- Confirms the handle identity with a scene pick before pressing.
- Uses deterministic `Input.dispatchMouseEvent` sequences (hover, press, fixed-step moves, release).
- Captures before/after transform snapshots, screenshots, the harness export, and a sidecar audit record.
- Records every CDP event with its timestamp and parameters, plus the harness-observed drag lifecycle (`start`/`drag`/`end` counts), `isTrusted`, `pointerType`, start/end coordinates, target gizmo and axis, and the resulting transform delta.
- Fails the case on an untrusted event, a missing drag lifecycle, a cross-axis drag, an unexpected console error, or a provenance mismatch.
- Retries only transport/session failures (closed WebSocket, destroyed execution context, navigation). It never retries a failed assertion.

Proof artifacts are written under `projects/simuforge/reports/poc-01/results/sp-05-automated/proof/` with a `proof_` prefix and a `_passN` suffix. These are not official evidence. Official evidence keeps the filenames in the next section and belongs in `results/sp-05-manual/evidence/`.

## General rules

- Use Google Chrome only.
- Do not use Firefox.
- Manual runs: do not edit code or use the DevTools UI.
- Automated runs: only the repository's approved runner may use read-only CDP. Do not inject gizmo configuration through the debugger.
- Perform all gizmo drags with an actual mouse, or with the approved CDP runner. Do not use programmatic transforms as evidence.
- If a value cannot be captured, mark it unavailable; do not fabricate it.
- Reset the cube before each independent test case where specified.
- Save screenshots immediately after each required capture.
- Export JSON after each major test case or at the end, as specified.

## Harness controls

- Mode buttons: Translate, Rotate, Scale.
- Reset Transform: restores position `(0, 0.5, 0)`, quaternion `(0, 0, 0, 1)`, scale `(1, 1, 1)`.
- Capture State: records the current transform.
- Capture Baseline: stores the current transform as the T-05 baseline.
- Capture Final: stores the current transform as the T-05 final.
- Compare T-05: compares baseline and final with tolerance `1e-5`.
- Record Observation: records the current transform plus your note.
- Export JSON: downloads `sp-05_transform_log.json`.
- Evidence checklist: set a status for each test case.

## Required screenshots

Save screenshots with these exact filenames:

1. `sp-05_translate_x.png`
2. `sp-05_translate_y.png`
3. `sp-05_translate_z.png`
4. `sp-05_rotate_45.png`
5. `sp-05_rotate_world_x.png`
6. `sp-05_rotate_90_y_supplementary.png` (optional supplementary observation only)
6. `sp-05_scale_unrotated.png`
7. `sp-05_scale_rotated_45.png`
8. `sp-05_scale_rotated_90.png`
9. `sp-05_mode_switch.png`

If a screenshot cannot be captured, record the limitation in your notes.

## Screenshot capture procedure

Manual runs use the Windows snipping workflow:

1. Press `Win + Shift + S`.
2. Select the rectangular snip.
3. Drag to capture the full relevant Chrome harness area, including the canvas and Inspector.
4. Paste or save the image.
5. Save it with the exact required filename from the list above.
6. Save it to `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`.

Do not use DevTools or code editing for a manual run.

Automated runs capture the same viewport with CDP `Page.captureScreenshot` and write the same filenames, plus a sidecar audit record. The human still reviews the screenshots for axis alignment; the runner does not declare visual PASS.

## Required JSON exports

Save exported JSON files with these exact filenames:

1. `sp-05_translate_log.json`
2. `sp-05_rotate_log.json`
3. `sp-05_scale_unrotated_log.json`
4. `sp-05_scale_rotated_log.json`
5. `sp-05_mode_switch_log.json`
6. `sp-05_final_integrity_log.json`

If pointer coordinates are not captured by the harness for a drag, the exported JSON will mark them unavailable. Do not fabricate coordinates.

JSON export clarification:
- Export after the relevant test, not only at the end.
- The browser downloads `sp-05_transform_log.json`. Rename the downloaded file to the exact required filename listed above.
- Preserve the original JSON contents. Do not edit exported values.
- Never fabricate missing pointer coordinates or transform values. If a value is unavailable, leave it as recorded by the harness.

## Procedure

### Step 0 — Preparation

1. Open `projects/simuforge/reports/poc-01/harness/sp05.html` in Google Chrome.
2. Verify the Inspector shows:
   - Position: `0.000000, 0.500000, 0.000000`
   - Quaternion: `0.000000, 0.000000, 0.000000, 1.000000`
   - Scale: `1.000000, 1.000000, 1.000000`
   - Quaternion validation: VALID
   - Scale validation: VALID
3. Confirm the active mode is Translate.
4. Create the evidence directory: `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`.

### A-03 — World Translate and Rotate

#### T-01 World Translate

1. Click `Reset Transform`.
2. Apply a non-identity rotation of approximately 45° around Y (use Rotate mode, then return to Translate mode). The cube must not be at identity rotation when translation begins.
3. Select Translate mode.
4. Drag the X handle in one controlled motion.
5. Record the resulting position from the Inspector.
6. Capture screenshot `sp-05_translate_x.png`.
7. Repeat for Y handle: capture `sp-05_translate_y.png`.
8. Repeat for Z handle: capture `sp-05_translate_z.png`.
9. Click `Record Observation` and note which axis was dragged and the observed movement.
10. Click `Export JSON` and save as `sp-05_translate_log.json`.

Why this is meaningful: if the cube starts rotated, a world-space translate handle moves the cube along world X/Y/Z, while a local-space handle would move it along the cube's rotated axes. Starting from a rotated orientation makes the distinction observable.

Expected visual behavior: translation follows world X/Y/Z axes, not the cube's local (rotated) axes.

#### T-02 World Rotate

1. Click `Reset Transform`.
2. Rotate approximately 45° around world Y.
3. Capture the initial quaternion.
4. Select Rotate mode.
5. Rotate approximately 45° around world X (world-space axis).
6. Capture the resulting quaternion and screenshot `sp-05_rotate_world_x.png`.
7. Record the observed result.
8. Do not instruct the user to continue rotating around Y to 90° as part of this same test.

If a separate 90° Y rotation screenshot is captured, classify it as a supplementary observation (`sp-05_rotate_90_y_supplementary.png`), not evidence proving world-space rotation.

Expected visual behavior: rotation occurs around the selected world X axis. The quaternion must reflect world-space rotation. Do not claim a PASS based only on the displayed Euler angle; record quaternion components and compare them against the expected world-axis rotation.

### A-04 — Local Scale on rotated entities

#### T-03 Unrotated Local Scale

1. Click `Reset Transform`.
2. Select Scale mode.
3. Drag one individual axis handle.
4. Perform at least one non-uniform scale (for example, scale X more than Y and Z).
5. Capture screenshot `sp-05_scale_unrotated.png`.
6. Record resulting scale values.
7. Click `Record Observation`.
8. Click `Export JSON` and save as `sp-05_scale_unrotated_log.json`.

Expected visual behavior: scale stretches along the cube's local axes. On an unrotated cube, local axes coincide with world axes, so handles align with world X/Y/Z.

#### T-04 Rotated Local Scale

1. Click `Reset Transform`.
2. Select Rotate mode.
3. Rotate the cube approximately 45° around Y.
4. Select Scale mode.
5. Drag local X, Y, and Z handles.
6. Perform at least one non-uniform scale.
7. Capture screenshot `sp-05_scale_rotated_45.png`.
8. Record resulting scale values and handle directions.
9. Repeat at approximately 90° around Y if practical.
10. Capture screenshot `sp-05_scale_rotated_90.png`.
11. Click `Record Observation`.
12. Click `Export JSON` and save as `sp-05_scale_rotated_log.json`.

Expected visual behavior: scale handles follow the cube's local axes after rotation. This confirms local-axis scaling rather than world-axis scaling.

### T-05 — Mode switching

1. Click `Reset Transform`.
2. Click `Capture Baseline`.
3. Switch modes without dragging:
   - Translate → Rotate
   - Rotate → Scale
   - Scale → Translate
4. Click `Capture Final`.
5. Click `Compare T-05`.
6. Capture screenshot `sp-05_mode_switch.png`.
7. Record the comparison result (STABLE or CHANGED).
8. Click `Record Observation` with the comparison result.
9. Click `Export JSON` and save as `sp-05_mode_switch_log.json`.

Expected result: position, quaternion, and scale remain unchanged within tolerance `1e-5`.

### T-06 — Transform integrity

Perform a fresh, meaningful sequence of manual transformations after T-05. Do not reset the cube between these interactions and the T-06 capture.

1. Apply a non-identity rotation (approximately 45° around Y).
2. Translate the cube using world handles.
3. Apply a non-uniform scale (for example, scale X more than Y and Z).
4. Click `Capture State`.
5. Inspect the Inspector values:
   - Quaternion X, Y, Z, W are finite.
   - Quaternion length is within `1e-5` of 1.
   - Scale X, Y, Z are finite, positive, and >= `1e-3`.
6. Record the quaternion validation result: VALID or INVALID.
7. Record the scale validation result: VALID or INVALID.
8. If invalid, record the reason and the actual values. Do not normalize or clamp values.
9. Click `Record Observation` with the validation results.
10. Click `Export JSON` and save as `sp-05_final_integrity_log.json`.

## Evidence checklist

After completing all steps, set the checklist statuses in the harness and review them:

- T-01 World Translate: Evidence captured / Validation passed / Failed
- T-02 World Rotate: Evidence captured / Validation passed / Failed
- T-03 Unrotated Local Scale: Evidence captured / Validation passed / Failed
- T-04 Rotated Local Scale: Evidence captured / Validation passed / Failed
- T-05 Mode Switching: Evidence captured / Validation passed / Failed
- T-06 Transform Integrity: Evidence captured / Validation passed / Failed

Clarification:
- User-reported success is not equivalent to archived evidence.
- Evidence captured is not automatically validation passed.
- Validation passed must only be selected after reviewing the corresponding evidence.
- Failed or unavailable results must remain explicitly recorded. Do not replace them with success.

## What the harness can and cannot capture

Can capture:
- Current transform values.
- Quaternion length.
- Quaternion validation result.
- Scale validation result.
- Baseline/final comparison result.
- Timestamps.
- User observations.
- JSON export.
- Pointer start/end coordinates and the full pointer event sequence for each drag (including `isTrusted` and `pointerType`).
- The declared input method and its SP-05 eligibility.

May not reliably capture:
- Visual confirmation of axis alignment. This requires user review of screenshots.
- A distinction between a physical mouse and CDP-injected input from inside the page. Both are trusted; the declared method must be recorded and reviewed.

When a run is automated, the sidecar audit record is part of the evidence: it contains the CDP event sequence, the harness-observed drag lifecycle, and the before/after transform snapshots. Do not discard it.

## After evidence capture

Place all screenshots and JSON exports in:

`projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`

Do not modify historical SP-01 through SP-04 evidence.

Do not mark SP-05 as PASS until the evidence is reviewed. SP-05 remains BLOCKED until sufficient archived evidence exists.