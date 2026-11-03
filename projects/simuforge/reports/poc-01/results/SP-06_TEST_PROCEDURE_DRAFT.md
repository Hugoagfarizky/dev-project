# SP-06 Test Procedure Draft — Camera Navigation

Status: **DRAFT — PROPOSED** (documentation only; not approved; SP-06 remains NO-GO)

Date: 2026-11-03
Scope: Design only. No harness, runner, or application code was created or modified. No SP-06 test was executed.

Sources: `POC_01_IMPLEMENTATION_READINESS.md` (§6.3 A-05/A-06, §7.7, §8.2 SP-06), `SP-06_READINESS_REVIEW.md`, Babylon.js documentation (Camera Movement and Input System, verified 2026-11-03).

## 1. Objective

Verify that `ArcRotateCamera` navigation (orbit, pan, zoom) works correctly in right-handed mode under the proposed input map, and that the default plain-left-drag rotate entry can be removed so left click is available for selection without breaking gizmo interaction.

## 2. Verified Babylon.js 9.32.1 API facts (from documentation)

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

PROPOSED: Removal of the plain-left-drag rotate entry will be done by direct array splice/filter of the matching `{ source: "pointer", button: 0, interaction: "rotate" }` entry (or an equivalent `setInteraction`/`addEntry` sequence). The exact removal API and its interaction with legacy-flag re-sync are **not yet validated** against Babylon 9.32.1 and are marked PROPOSED.

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

PROPOSED: The exact modifier assignment (ctrl vs alt) is a product decision and may change. The key requirement is that plain left-drag no longer orbits.

## 4. Testable acceptance criteria

### A-05 (camera navigation in right-handed mode)

A-05-P1: Orbit changes `alpha` and/or `beta` by a non-zero amount when the orbit gesture is performed; `radius` and `target` are unchanged within tolerance.
A-05-P2: Vertical orbit changes `beta`; horizontal orbit changes `alpha`; neither produces an axis inversion (verified against a known camera pose and screenshot).
A-05-P3: Pan changes `target.x/y/z`; `radius` is unchanged within tolerance.
A-05-P4: Zoom changes `radius`; `target` is unchanged within tolerance.
A-05-P5: Orbit, pan, and zoom all work after the input-map edit (left click no longer orbits).
A-05-P6: No console errors during navigation.

### A-06 (input-map edit)

A-06-P1: After removing the plain-left-drag rotate entry, a plain left-drag does not change `alpha` or `beta`.
A-06-P2: Left click on empty space / on the cube does not orbit (camera state unchanged).
A-06-P3: Gizmo drag on the cube still works after the input-map edit (no regression).
A-06-P4: `resetInputMap()` restores the default behavior (verified by re-enabling plain-left-drag rotate and confirming orbit returns).

## 5. Parameters to record

For every navigation gesture, record before and after:
- `alpha` (radians)
- `beta` (radians)
- `radius` (world units)
- `target` = (x, y, z)
- Gesture type, pointer coordinates, button, modifiers
- Timestamp (ISO 8601)
- Console errors/warnings

## 6. Test scenarios

### S-01 Baseline camera state
- Action: Load scene, record camera state, screenshot.
- Expected: alpha = π/4, beta = π/3, radius = 8, target = (0, 0.5, 0).
- PASS: recorded values match within `1e-6`; screenshot captured.

### S-02 Orbit horizontal
- Action: Orbit gesture (proposed ctrl+left-drag or right-drag) horizontally.
- Expected: `alpha` changes by a measurable amount; `beta`, `radius`, `target` unchanged within tolerance.
- PASS: |Δalpha| > 0.05 rad; |Δbeta| ≤ 1e-6; |Δradius| ≤ 1e-6; |Δtarget| ≤ 1e-6.

### S-03 Orbit vertical
- Action: Orbit gesture vertically.
- Expected: `beta` changes; `alpha`, `radius`, `target` unchanged within tolerance.
- PASS: |Δbeta| > 0.05 rad; |Δalpha| ≤ 1e-6; |Δradius| ≤ 1e-6; |Δtarget| ≤ 1e-6.
- Edge: beta must remain within Babylon's clamp range (verify no NaN).

### S-04 Pan horizontal
- Action: Pan gesture horizontally.
- Expected: `target.x` (or `target.z`, depending on axis) changes; `radius` unchanged.
- PASS: |Δtarget| > 0.05; |Δradius| ≤ 1e-6.

### S-05 Pan vertical
- Action: Pan gesture vertically.
- Expected: `target.y` changes; `radius` unchanged.
- PASS: |Δtarget.y| > 0.05; |Δradius| ≤ 1e-6.

### S-06 Zoom in
- Action: Zoom in (wheel up).
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
- Expected: no orbit; camera state unchanged; selection path is free (no camera capture).
- PASS: camera state unchanged; no console errors. (Selection UI is out of scope; only camera non-capture is verified.)

### S-10 Camera vs. gizmo interaction
- Action: Drag a gizmo handle with the camera attached.
- Expected: gizmo drag works; camera does not orbit during the drag.
- PASS: transform changes; camera state unchanged during drag; no console errors.

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

## 10. Automation design (Node.js built-in + CDP only)

Reuse the SP-05 runner's proven approach:
- Own Chrome via `child_process.spawn` with a dedicated profile and port (e.g., 9224) and anti-throttling flags.
- Connect via native WebSocket (no external dependencies).
- Use `Input.dispatchMouseEvent` for orbit/pan/zoom gestures (trusted input).
- Read camera state via `Runtime.evaluate` of `camera.alpha`, `camera.beta`, `camera.radius`, `camera.target.x/y/z`.
- Edit input map via `Runtime.evaluate` of `camera.movement.input...` calls (read-only verification of the edit).
- Capture screenshots via `Page.captureScreenshot`.
- Record input log and console via existing listeners.
- No Playwright, Puppeteer, or new dependencies.

PROPOSED: Whether camera navigation can be driven purely by CDP mouse events (without Playwright's higher-level helpers) is plausible but **unverified**; the SP-05 runner already drives gizmo drags this way, so the same approach should apply. This is a PROPOSED assumption to validate during implementation.

## 11. Risks (Babylon 9.32.1)

| Risk | Notes |
| --- | --- |
| `attachControl(canvas, true)` captures all pointer events; gizmo drag may be blocked | Verify gizmo drag still works with camera attached (S-10) |
| Input-map removal may be reverted by legacy flag writes | Make input-map edits after any legacy flag assignment, or avoid legacy flags |
| `resetInputMap()` factory availability | Documented; verify against 9.32.1 |
| Pole behavior (beta near 0/π) may produce NaN | Edge-case test S-11 |
| Inertia may cause continued motion after gesture ends | Record final state after inertia settles; add settle delay |
| Right-handed coordinate sign in pan | Verify target changes in expected direction |
| CDP trusted input vs. camera input handling | Camera input handlers read DOM pointer events; CDP events are trusted and should be processed identically (same as SP-05) |

## 12. Decisions requiring approval (all PROPOSED)

1. Input map modifier assignment (ctrl+left = orbit, alt+left = pan, or alternatives).
2. Whether to remove the rotate entry entirely or rebind it to a modifier.
3. Numeric tolerances (0.05 rad, 0.1 radius, 1e-6 invariants) — proposed; no documented tolerance exists.
4. Required screenshot filenames and count.
5. Input log JSON schema.
6. Whether SP-06 should be automated (CDP) or manual, and whether to reuse the SP-05 runner infrastructure.
7. Whether to create a dedicated SP-06 harness or extend `sp05.html`.
8. Whether left-click selection verification requires a selection mechanism (out of SP-06 scope per §8.1) — PROPOSED to verify only camera non-capture.

## 13. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; this document is preparation only).
- No harness, runner, or application code was created or modified.
- No SP-06 test was executed.