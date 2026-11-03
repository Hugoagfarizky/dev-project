# SP-06 Test Procedure Draft (Revision 2) — Camera Navigation

Status: **DRAFT — PROPOSED** (documentation only; not approved; SP-06 remains NO-GO)

Date: 2026-11-03 (Revision 2)
Scope: Design only. No harness, runner, or application code was created or modified. No SP-06 test was executed.

Sources: `POC_01_IMPLEMENTATION_READINESS.md` (§6.3 A-05/A-06, §7.7, §8.1–§8.3), `SP-06_READINESS_REVIEW.md`, `SP-06_TECHNICAL_REVIEW.md`, Babylon.js documentation (Camera Movement and Input System, verified 2026-11-03).

Revision 2 addresses all findings H1–H3, M1–M8, L1–L5 from `SP-06_TECHNICAL_REVIEW.md`.

## 1. Objective

Verify that `ArcRotateCamera` navigation (orbit, pan, zoom) works correctly in right-handed mode under the proposed input map, and that the default plain-left-drag rotate entry can be removed so left click is available for selection without breaking gizmo interaction.

## 2. Verified Babylon.js 9.32.1 API facts (from documentation)

(unchanged from Revision 1; all entries verified 2026-11-03)

- `ArcRotateCamera` exposes `alpha`, `beta`, `radius`, and `target` (a `Vector3`).
- Navigation routes through `camera.movement` (physics) and `camera.movement.input` (InputMapper).
- Default inputMap for ArcRotateCamera (first-match-wins, ordered):
  - `pointer`, `button: 0`, `ctrl` → `pan`
  - `pointer`, `button: 0` → `rotate`
  - `pointer`, `button: 2` → `pan`
  - `wheel`, any → `zoom`
  - `keyboard`, `+`/`-` (codes 187, 107, 189, 109) → `zoom`
  - `keyboard`, ctrl + nav key → `pan`
  - `keyboard`, alt + nav key → `zoom`
  - `keyboard`, nav key only → `rotate`
- Mutating the inputMap:
  - `setInteraction(source, conditions, interaction)` — mutates in place if matched entry is at least as specific; otherwise inserts a more-specific entry.
  - `addEntry(...)` — inserts at the correct specificity bucket.
  - `setInteractions(...)` (plural) — bulk update; returns count.
  - `getEntry(source, interaction)` — returns a live reference for property tweaks.
  - `getEntries(...)` — bulk lookup.
  - `resetInputMap()` — restores defaults.
  - Direct array manipulation (push/splice/replace) is supported.
- Omitted condition fields are wildcards; modifier matching is per-key (set to `false` to require absence).
- Speed: `speed`, `panSpeed`, `rotationXSpeed`, `rotationYSpeed`, `zoomSpeed`.
- Inertia: `panInertia`, `rotationInertia`, `zoomInertia` (0 = instant stop, 0.9 = legacy smooth glide, 1 = never decays).
- Framerate independence via `referenceFrameRate` (default 60) and helpers `getFrameIndependentDecay`, `getFrameIndependentInputScale`.
- Legacy flags (`useCtrlForPanning`, `panningMouseButton`, `useAltToZoom`, `inertia`, `panningInertia`) still work and re-sync the inputMap when written.
- `attachControl(canvas, true)` enables navigation.
- `detachControl()` disables navigation (cleanup).

PROPOSED (M7, M8): Removal of the plain-left-drag rotate entry will be done by direct array splice/filter of the matching `{ source: "pointer", button: 0, interaction: "rotate" }` entry. The exact removal API and its interaction with legacy-flag re-sync are **not yet validated** against Babylon 9.32.1. A small probe (analogous to the local Z probe) must validate: (a) the entry can be removed, (b) `getEntry("pointer", "rotate")` returns null afterwards, (c) `resetInputMap()` restores the default and `getEntry` returns the entry again, (d) no legacy-flag write reverts the edit. This probe is a prerequisite for execution approval.

PROPOSED (L3): Legacy flags must not be written after the input-map edit; all legacy-flag configuration (if any) must precede the edit, or legacy flags must be avoided entirely.

## 3. Proposed input map (PROPOSED)

Goal: left click is free for selection; orbit requires a modifier or right-drag.

| Source | Conditions | Interaction | Notes |
| --- | --- | --- | --- |
| `pointer` | `button: 0`, `ctrl` | `rotate` | Proposed: ctrl+left-drag orbits |
| `pointer` | `button: 0`, `alt` | `pan` | Proposed: alt+left-drag pans |
| `pointer` | `button: 2` | `pan` | Right-drag pans (default retained) |
| `wheel` | any | `zoom` | Wheel zoom (default retained) |
| `keyboard` | `+`/`-` | `zoom` | Default retained |
| `pointer` | `button: 0` (no modifier) | **removed** | Left click free for selection |

PROPOSED (M1): Modifier assignment is a product decision. Browser/OS shortcut conflicts must be verified on the target platform (Windows/Chrome): Alt+Left is back-navigation only for the arrow key (not mouse drag), but Alt+click and Alt+drag can interact with OS window management on some platforms; right-drag triggers the context menu unless `preventDefault` is handled (Babylon's `attachControl` handles `contextmenu`, but must be verified). Ctrl+click on a canvas is not a browser shortcut. These are MEDIUM risks to verify empirically.

PROPOSED: The key requirement is that plain left-drag no longer orbits.

## 4. Testable acceptance criteria

### A-05 (camera navigation in right-handed mode)

A-05-P1: Orbit changes `alpha` and/or `beta` by a non-zero amount when the orbit gesture is performed; `radius` and `target` are unchanged within tolerance.
A-05-P2: Vertical orbit changes `beta`; horizontal orbit changes `alpha`; neither produces an axis inversion. **Quantitative check (M3):** rightward drag must increase `alpha`; downward drag must increase `beta`. If the sign is opposite, FAIL (axis inversion).
A-05-P3: Pan changes `target.x/y/z`; `radius` is unchanged within tolerance.
A-05-P4: Zoom changes `radius`; `target` is unchanged within tolerance.
A-05-P5: Orbit, pan, and zoom all work after the input-map edit (left click no longer orbits).
A-05-P6: No console errors during navigation.

### A-06 (input-map edit)

A-06-P1: After removing the plain-left-drag rotate entry, a plain left-drag does not change `alpha` or `beta` (all deltas ≤ 1e-6).
A-06-P2: Left click on empty space / on the cube does not orbit (camera state unchanged within 1e-6).
A-06-P3 (HARD GATE): Gizmo drag on the cube still works after the input-map edit (transform changes; camera state unchanged during drag; no console errors). If this fails, SP-06 FAILS regardless of other results.
A-06-P4: `resetInputMap()` restores the default behavior (verified by re-enabling plain-left-drag rotate and confirming orbit returns).
A-06-P5 (scope clarification, H3): A-06 verifies that left click is **not captured by the camera**. Full left-click selection (selection UI, hit-testing, selection state) is out of SP-06 scope per §8.1 and is deferred to a later spike. SP-06 does not claim selection works; it claims only that the camera does not intercept left click.

## 5. Parameters to record

For every navigation gesture, record before and after:
- `alpha` (radians), `beta` (radians), `radius` (world units), `target` = (x, y, z)
- Gesture type, pointer coordinates, button, modifiers
- Timestamp (ISO 8601)
- Console errors/warnings
- Inertia settle delay used (see §6)

## 6. Test scenarios

All scenarios include a settle delay after the gesture: wait until `camera.movement` deltas are zero or a fixed timeout (PROPOSED: 500 ms) before recording the final state. Final values are post-settle.

### S-01 Baseline camera state
- Action: Load scene, record camera state, screenshot.
- Expected: alpha = π/4, beta = π/3, radius = 8, target = (0, 0.5, 0).
- PASS: recorded values match within `1e-6`; screenshot captured.

### S-02 Orbit horizontal
- Action: Orbit gesture horizontally.
- Expected: `alpha` changes by a measurable amount; `beta`, `radius`, `target` unchanged within tolerance.
- PASS: |Δalpha| > 0.05 rad with correct sign (rightward drag increases alpha); |Δbeta| ≤ 1e-6; |Δradius| ≤ 1e-6; |Δtarget| ≤ 1e-6.

### S-03 Orbit vertical
- Action: Orbit gesture vertically.
- Expected: `beta` changes; `alpha`, `radius`, `target` unchanged within tolerance.
- PASS: |Δbeta| > 0.05 rad with correct sign (downward drag increases beta); |Δalpha| ≤ 1e-6; |Δradius| ≤ 1e-6; |Δtarget| ≤ 1e-6.
- Edge: beta must remain finite (no NaN); clamp range verified.

### S-04 Pan horizontal
- Action: Pan gesture horizontally.
- Expected: `target` changes; `radius` unchanged.
- PASS: |Δtarget| > 0.05; |Δradius| ≤ 1e-6.

### S-05 Pan vertical
- Action: Pan gesture vertically.
- Expected: `target.y` changes; `radius` unchanged.
- PASS: |Δtarget.y| > 0.05; |Δradius| ≤ 1e-6.

### S-06 Zoom in
- Action: Zoom in (wheel up — direction to be verified against Babylon default; PROPOSED: wheel up zooms in).
- Expected: `radius` decreases; `target` unchanged.
- PASS: Δradius < −0.1; |Δtarget| ≤ 1e-6.

### S-07 Zoom out
- Action: Zoom out (wheel down).
- Expected: `radius` increases; `target` unchanged.
- PASS: Δradius > 0.1; |Δtarget| ≤ 1e-6.

### S-08 Left click without orbit (post-edit)
- Action: Plain left-drag after removing the rotate entry.
- Expected: `alpha`, `beta`, `radius`, `target` all unchanged within `1e-6`.
- PASS: all deltas ≤ 1e-6.

### S-09 Selection after input-map change
- Action: Left click on the cube after the edit.
- Expected: no orbit; camera state unchanged; camera does not capture the pointer.
- PASS: camera state unchanged within 1e-6; no console errors. (Selection UI verification deferred per A-06-P5.)

### S-10 Camera vs. gizmo interaction (HARD GATE)
- Action: Drag a gizmo handle with the camera attached, before and after the input-map edit.
- Expected: gizmo drag works; camera does not orbit during the drag; transform changes; camera state unchanged during drag.
- PASS: transform changes (gizmo drag succeeded); camera state unchanged within 1e-6 during drag; no console errors.
- FAIL condition: if gizmo drag fails or camera orbits during gizmo drag, SP-06 FAILS.

### S-11 Edge cases
- Orbit near beta = 0 and beta = π (pole behavior).
- Zoom to minimum and maximum radius.
- Pan with large deltas.
- PASS: no NaN, no crash, no console errors; values remain finite.

### S-12 Reset input map
- Action: Call `resetInputMap()`, then plain left-drag.
- Expected: plain left-drag orbits again (default restored).
- PASS: |Δalpha| or |Δbeta| > 0.05 on plain left-drag.

## 7. Required screenshots (PROPOSED filenames)

1. `sp-06_camera_baseline.png`
2. `sp-06_orbit_horizontal.png`
3. `sp-06_orbit_vertical.png`
4. `sp-06_pan_horizontal.png`
5. `sp-06_pan_vertical.png`
6. `sp-06_zoom_in.png`
7. `sp-06_zoom_out.png`
8. `sp-06_left_click_no_orbit.png`
9. `sp-06_gizmo_interaction.png`
10. `sp-06_edge_cases.png`

PROPOSED: filenames and count are proposed; final list requires approval.

## 8. Input log and JSON structure (PROPOSED)

```json
{
  "caseId": "SP-06",
  "runId": "<run id>",
  "babylonVersion": "9.32.1",
  "useRightHandedSystem": true,
  "browser": "Chrome/...",
  "camera": {
    "initial": { "alpha": 0, "beta": 0, "radius": 0, "target": [0,0,0] },
    "entries": [
      {
        "id": "S-02",
        "gesture": "orbit-horizontal",
        "inputMapState": "edited",
        "before": { "alpha": 0, "beta": 0, "radius": 0, "target": [0,0,0] },
        "after":  { "alpha": 0, "beta": 0, "radius": 0, "target": [0,0,0] },
        "delta":  { "alpha": 0, "beta": 0, "radius": 0, "target": [0,0,0] },
        "pointer": { "from": {"x":0,"y":0}, "to": {"x":0,"y":0}, "button": 0, "modifiers": {} },
        "settleDelayMs": 500,
        "timestamp": "ISO-8601",
        "consoleErrors": []
      }
    ],
    "final": { "alpha": 0, "beta": 0, "radius": 0, "target": [0,0,0] }
  },
  "console": { "errors": [], "warnings": [], "total": 0 },
  "result": "PASS|FAIL"
}
```

PROPOSED: schema is proposed; final schema requires approval.

## 9. Console log and environment evidence

- Record `console` errors/warnings and uncaught exceptions.
- Record environment: Babylon version, browser version, OS, right-handed mode, camera initial state.
- Record any input-map modification and its reversal (reset) for reproducibility.
- Record `detachControl()` cleanup on teardown.

## 10. Automation design (Node.js built-in + CDP only)

Reuse the SP-05 runner's proven approach:
- Own Chrome via `child_process.spawn` with a dedicated profile and port (e.g., 9224) and anti-throttling flags.
- Connect via native WebSocket (no external dependencies).
- Use `Input.dispatchMouseEvent` for orbit/pan/zoom gestures (trusted input).
- Read camera state via `Runtime.evaluate` of `camera.alpha`, `camera.beta`, `camera.radius`, `camera.target.x/y/z`.
- Edit input map via `Runtime.evaluate` of `camera.movement.input...` calls (verification of the edit, not read-only).
- Capture screenshots via `Page.captureScreenshot`.
- Record input log and console via existing listeners.
- No Playwright, Puppeteer, or new dependencies.

PROPOSED (M6): Whether camera navigation can be driven purely by CDP mouse events (without Playwright's higher-level helpers) is plausible but **unverified**; the SP-05 runner already drives gizmo drags this way, so the same approach should apply. This is a PROPOSED assumption to validate during implementation via a small probe (analogous to the local Z probe).

PROPOSED (M7, M8): Input-map removal and `getEntry`/`resetInputMap` behavior must be validated via a probe before automation relies on them.

## 11. Harness architecture (PROPOSED, H2)

The SP-06 harness should be a **separate** harness (or a clearly isolated section of an extended harness), not a modification of `sp05.html`'s transform logic. Recommended layering:

1. **Camera state diagnostics** (read-only): expose `alpha`, `beta`, `radius`, `target` in the Inspector and a `getCameraState()` function; log to an input log.
2. **Camera input controller**: apply and revert the proposed input map; provide `resetInputMap()` affordance; record the map state.
3. **Test scenarios** (S-01..S-12): each records before/after camera state, gesture, settle delay, console errors.
4. **Gizmo regression check** (S-10): verify transform gizmo drag still works after the input-map edit (hard gate).

Reusable from SP-05 runner: browser launch, CDP connect, console capture, screenshot, evidence store, trusted-input pipeline, artifact hashing.

New components needed: camera state reader, input-map editor, gesture sequencer (orbit/pan/zoom), settle-delay logic, camera-specific assertions.

## 12. Risks (Babylon 9.32.1)

| Risk | Notes | Mitigation |
| --- | --- | --- |
| `attachControl(canvas, true)` captures all pointer events; gizmo drag may be blocked | S-10 hard gate | Verify gizmo drag before and after edit |
| Input-map removal may be reverted by legacy flag writes | L3 | Avoid legacy flags after edit; document ordering |
| `resetInputMap()` factory availability | Documented | Verify against 9.32.1 in probe |
| Pole behavior (beta near 0/π) may produce NaN | S-11 | Finite-value check; record clamp range |
| Inertia may cause continued motion after gesture ends | M2 | Settle delay; record post-settle values |
| Right-handed coordinate sign in pan | M3 | Quantitative sign check |
| CDP trusted input vs. camera input handling | M6 | Empirical probe |
| Browser/OS shortcut conflicts | M1 | Verify on target platform |
| Wheel zoom direction | L4 | Verify against Babylon default |

## 13. Decisions requiring approval (all PROPOSED)

1. Input map modifier assignment (ctrl+left = orbit, alt+left = pan, or alternatives).
2. Whether to remove the rotate entry entirely or rebind it to a modifier.
3. Numeric tolerances (0.05 rad, 0.1 radius, 1e-6 invariants) — proposed internal thresholds; no documented tolerance exists.
4. Required screenshot filenames and count.
5. Input log JSON schema.
6. Whether SP-06 should be automated (CDP) or manual, and whether to reuse the SP-05 runner infrastructure.
7. Whether to create a dedicated SP-06 harness or extend `sp05.html`.
8. Whether left-click selection verification requires a selection mechanism (out of SP-06 scope per §8.1) — PROPOSED to verify only camera non-capture (A-06-P5).

## 14. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; this document is preparation only).
- No harness, runner, or application code was created or modified.
- No SP-06 test was executed.
- All decisions remain PROPOSED.