# POC-01 Spike Results

## SP-01 — Engine Initialization

### Action
Created a minimal Babylon.js page (disposable spike code, not part of the repository) that:
- Creates a canvas and a `BABYLON.Engine` with `preserveDrawingBuffer` and `stencil`.
- Reads `BABYLON.Engine.Version` and `engine.webGLVersion`.
- Queries `WEBGL_debug_renderer_info` for unmasked renderer/vendor.
- Creates a `Scene`, `ArcRotateCamera`, `HemisphericLight`, and a cube.
- Runs the render loop and triggers `engine.resize()`.

Served locally and loaded in Google Chrome 156.0.8078.76 in headless mode. Captured the rendered DOM and a screenshot.

### Expected observation
Engine starts, canvas clears, render loop runs, `webGLVersion` is 2; resize does not break the canvas.

### Actual result
- Canvas client size at init: 762 × 484.
- Babylon.js version reported: 9.33.0 (CDN latest).
- `engine.webGLVersion`: 2.
- WebGL 2 available: yes.
- Unmasked renderer: `ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)`.
- Unmasked vendor: `Google Inc. (Intel)`.
- Hardware acceleration: enabled (GPU renderer; not SwiftShader/CPU).
- Engine initialization: OK (`engine initialized OK`).
- Post-init resize: OK (762 × 484; no error).
- Console errors/warnings: none observed in the captured DOM dump.

### Status
PASS

### Evidence
- Screenshot: `screenshots/sp-01_20261101_chrome_1280x720.png`
- DOM dump: `results/sp-01_dom_dump.html`

### Issue references
- `POC01-001` (version mismatch — see `issues.md`). Resolved by pinning to Babylon.js 9.32.1; regression recorded below.
- `POC01-002` (GPU selection — see `issues.md`).

## SP-01 Regression — Babylon.js 9.32.1 (pinned)

### Action
Re-ran the SP-01 engine-initialization checks using the official Babylon.js CDN versioned URL `https://cdn.babylonjs.com/v9.32.1/babylon.js` (disposable spike code, not part of the repository). Same procedure as SP-01: engine init, render loop, WebGL 2, canvas render, resize, console errors.

### Actual result
- Canvas client size at init: 762 × 484.
- Babylon.js version reported: **9.32.1** (pinned).
- `engine.webGLVersion`: 2.
- WebGL 2 available: yes.
- Unmasked renderer: `ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)`.
- Unmasked vendor: `Google Inc. (Intel)`.
- Hardware acceleration: enabled (GPU renderer).
- Engine initialization: OK (`engine initialized OK`).
- Post-init resize: OK (762 × 484; no error).
- Console errors/warnings: none observed.

### Status
PASS

### Evidence
- Screenshot: `screenshots/sp-01_20261101_chrome_1280x720_pinned9321.png`
- DOM dump: `results/sp-01_dom_dump_pinned9321.html`

## SP-02 — Right-Handed Coordinate Verification

### Action
Created a disposable Babylon.js 9.32.1 scene with `scene.useRightHandedSystem = true` set before any content. Added asymmetric markers: red box on +X, green box on +Y, blue box on -Z (forward), and a white origin cube. Used a fixed ArcRotateCamera (alpha=π/4, beta=π/3, radius=8, target (0,0,0)). Captured a screenshot and a DOM dump with numeric camera parameters. Executed in Google Chrome 156.0.8078.76 in headless mode.

### Expected observation
+X appears right, +Y appears up, and the forward direction is -Z from the default camera view.

### Actual numeric results
- `useRightHandedSystem`: true
- Camera alpha: 0.7853981633974483
- Camera beta: 1.0471975511965976
- Camera radius: 8
- Camera target: (0, 0, 0)
- Camera position: (4.8990, 4.0000, 4.8990)
- Camera upVector: (0, 1, 0)
- Test vector +X: (1, 0, 0)
- Test vector -Z (forward): (0, 0, -1)
- WebGL 2: available; engine init and resize OK.
- Console errors/warnings: none.

### Visual verification status
The screenshot `screenshots/sp-02_axes.png` was captured, but visual confirmation of axis directions was **not** performed by the executor because only headless capture was available. Visual verification is pending user review. The numeric evidence is consistent with the documented right-handed convention, but the go/no-go criterion "right-handed axes match the world convention visually" remains pending visual review.

### Status
PARTIAL — numeric coordinate consistency confirmed; visual verification pending user review.

### Evidence
- Screenshot: `screenshots/sp-02_axes.png`
- Numeric log: `results/sp-02_coordinates.json`
- DOM dump: `results/sp-02_coordinates.html`

## SP-03 — Create One Test Cube

### Action
Created a disposable Babylon.js 9.32.1 scene with `useRightHandedSystem = true` set before content. Added an editor-only grid helper (not a world entity) and exactly one test cube: 1×1×1, position (0, 0.5, 0), `StandardMaterial` with `disableLighting = true`, emissive color for visibility, and no world light entity (`scene.lights.length === 0`). Used the same fixed camera pose as SP-02. Captured screenshot and runtime log.

### Expected observation
Cube rests on the grid plane, is visible, and has no light dependency.

### Actual result
- Babylon.js version: 9.32.1
- `useRightHandedSystem`: true
- Light count: 0 (no world light entity)
- Cube name: testCube
- Cube position: (0, 0.5, 0)
- Cube scaling: (1, 1, 1) → dimensions 1×1×1
- Cube bottom Y: 0.0 (rests on grid plane)
- Material `disableLighting`: true
- Material has texture: false
- Mesh count including editor grid: 2
- Console errors/warnings: none
- Engine init and resize: OK

### Visual verification status
Screenshot `screenshots/sp-03_cube.png` captured. Visual confirmation of the cube resting on the grid plane and rendering visibly without lighting is pending user review (headless capture only).

### Status
PARTIAL — numeric/runtime configuration verified; visual verification pending user review.

### Evidence
- Screenshot: `screenshots/sp-03_cube.png`
- Scene log: `results/sp-03_scene.json`
- Console log: `results/sp-03_console.log` (local-only; `*.log` is gitignored)
- DOM dump: `results/sp-03_dom_dump.html`

## SP-04 — Picking Verification

### Test interpretation (recorded, not an official criteria change)
- Camera views: front (+Z side), side (+X side), top (+Y side), target near cube center (0, 0.5, 0).
- Tolerance for picked-point plausibility: 0.001 world units against cube bounds X[-0.5,0.5], Y[0,1], Z[-0.5,0.5].
- Empty-space pick uses screen coordinate (10, 10).
- Editor grid set `isPickable = false` to avoid false world-object selection.
- Picking executed via `scene.pick` in headless Chrome (automated, not interactive user clicks).

### Action
For each of front, side, and top views, in both original and 180°-orbit states: set the camera, render, pick the canvas center (cube) and a corner (empty space), log mesh name, hit boolean, and picked point. Captured screenshots and a picking log.

### Results

| View | Orbit 180° | Camera position | Cube hit | Mesh | Picked point | Plausible | Empty hit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| front | no | (0.00, 0.50, 8.00) | true | testCube | (0.00, 0.50, 0.50) | true | false |
| front | yes | (0.00, 0.50, -8.00) | true | testCube | (0.00, 0.50, -0.50) | true | false |
| side | no | (8.00, 0.50, 0.00) | true | testCube | (0.50, 0.50, 0.00) | true | false |
| side | yes | (-8.00, 0.50, 0.00) | true | testCube | (-0.50, 0.50, 0.00) | true | false |
| top | no | (0.80, 8.46, 0.00) | true | testCube | (0.05, 0.50, 0.50) | true | false |
| top | yes | (-0.80, 8.46, 0.00) | true | testCube | (-0.05, 0.50, 0.50) | true | false |

- All cube picks returned mesh name exactly `testCube`.
- All picked points were within 0.001 of the cube surface bounds.
- All empty-space picks returned no hit; no false selection from the editor grid.
- Results remained correct after 180° orbit.
- Console errors/warnings: none.

### Status
PASS (automated). Visual verification of the picking screenshots is pending user review.

### Evidence
- Screenshots: `screenshots/sp-04_front.png`, `screenshots/sp-04_side.png`, `screenshots/sp-04_top.png`, `screenshots/sp-04_after_180_orbit.png`
- Picking log: `results/sp-04_picking.json`
- Console log: `results/sp-04_console.log` (local-only; `*.log` is gitignored)
- DOM dump: `results/sp-04_dom_dump_front.html`

## SP-05 — Transform Gizmos (full automated suite executed; BLOCKED pending review)

### Status
BLOCKED. The gizmo configuration defect is repaired. The full T-01 through T-06 suite was executed on 2026-11-03 with the approved direct-CDP runner: 256/256 assertions passed across six cases, with no retries and no provenance violations. No SP-05 acceptance criterion has been upgraded to PASS. A-03 and A-04 remain unverified pending human review of the screenshots and acceptance of the evidence.

### Verified repair
Babylon's `GizmoManager` creates each gizmo lazily on the first `*GizmoEnabled = true` assignment. The harness previously read `gizmoManager.gizmos.positionGizmo`, `rotationGizmo`, and `scaleGizmo` immediately after construction, when all three were `null`, so the world/world/local assignments were dead code and Babylon's local default applied to every gizmo.

The harness now defines `applyGizmoSpace()`, which is called after the three enable assignments in `setMode()` and on every mode change. It applies:
- Position gizmo: world orientation (`updateGizmoRotationToMatchAttachedMesh = false`).
- Rotation gizmo: world orientation.
- Scale gizmo: local orientation (`updateGizmoRotationToMatchAttachedMesh = true`).

The diagnostics snapshot exposes `positionSpaceWorld`, `rotationSpaceWorld`, `scaleSpaceLocal`, and the raw update flags, so the applied state can be verified after a reload rather than inferred from source.

### Provenance repair
The hardcoded `interactionManual: true` has been removed. The harness records a declared method (`physical_mouse`, `cdp_trusted_input`, `synthetic_input`, `programmatic_transform`), forces `synthetic_input` for any untrusted pointer event, and records `inputMethod`, `sp05Eligible`, `interactionManual`, `interactionAutomated`, `lastDrag`, and `dragCount` in every entry and in the export. `interactionManual` is true only for `physical_mouse`. The Project Owner approved `cdp_trusted_input` on 2026-11-02; see `SP-05_EVIDENCE_PROCEDURE.md`.

### Automated proof (2026-11-03)
Runner: `projects/simuforge/reports/poc-01/harness/runner/`. Command: `node run.js --cases proof --passes 2`.

| Case | Checks | Result | Key observation |
| --- | --- | --- | --- |
| T-01 World translate | 37/37 | PASS | Cube rotated 40.8814° around world Y; world X drag moved `(0.902087, 0, 0)`; handle direction matched world X exactly. |
| T-02 World rotate | 35/35 | PASS | World X rotation delta axis `(1, 0, 0)`, angle 43.9206°; the rotated local X was `(0.756066, 0, -0.654495)`, so local-space rotation is excluded. |
| T-04 Local scale | 41/41 | PASS | Scale `(1, 1, 1) → (1.203411, 1, 1)`; handle direction matched the local X axis in world; Y and Z unchanged. |

Both passes produced identical transform values. Every drag reported lifecycle `start=1`, `drag=24`, `end=1`, `allTrusted=true`, `pointerType="mouse"`, with no cross-axis activity. All exported entries report `inputMethod="cdp_trusted_input"`, `sp05Eligible=true`, `interactionManual=false`, `interactionAutomated=true`; no synthetic input was observed and no console errors were recorded.

Proof artifacts (not official evidence): `projects/simuforge/reports/poc-01/results/sp-05-automated/proof/`.

### Full suite execution (2026-11-03)
Runner: `node run.js --cases all --out projects/simuforge/reports/poc-01/results/sp-05-manual/evidence`. Run ID `2026-11-03T09-16-00-842Z-25efe7`.

| Case | Checks | Result | Key observation |
| --- | --- | --- | --- |
| T-01 World translate | 59/59 | PASS | Setup 40.8814° world Y; world X/Y/Z deltas `(0.902087, 0, 0)`, `(0, 0.817648, 0)`, `(0, 0, 0.858875)`; handles matched world axes. |
| T-02 World rotate | 35/35 | PASS | World X delta axis `(1, 0, 0)` at 43.9206°; rotated local X was `(0.756066, 0, -0.654495)`. |
| T-03 Unrotated local scale | 26/26 | PASS | Local X `(1, 1, 1) → (1.214723, 1, 1)`; Y/Z unchanged. |
| T-04 Rotated local scale | 61/61 | PASS | Local X `(1, 1, 1) → (1.203411, 1, 1)`; supplementary local Y at ~87.45° `1 → 1.134295`. |
| T-05 Mode switching | 26/26 | PASS | Harness comparison STABLE; zero drags. |
| T-06 Transform integrity | 49/49 | PASS | Quaternion normalized, scale finite and positive; transform not back at initial. |

All 14 drags recorded lifecycle `start=1`, `drag=24`, `end=1`, `allTrusted=true`, `pointerType="mouse"`. Every entry reports `inputMethod="cdp_trusted_input"`, `sp05Eligible=true`, `interactionManual=false`, `interactionAutomated=true`. No synthetic input, no console errors, no retries. An independent audit re-checked 750 evidence-integrity conditions: 750/750 PASS.

Deviations resolved by decision on 2026-11-03: `sp-05_rotate_45.png` removed from the mandatory inventory; local Z is covered by the supplemental targeted run; the 40.8814° setup rotation is accepted as sufficient POC evidence; repeating all three handles at 90° is not required. A visual-review package (contact sheet + manifest) is available under `results/sp-05-manual/visual-review/`. See `results/sp-05-manual/SP-05_VISUAL_REVIEW_PACKAGE.md`.

### Test cases
- T-01 World Translate
- T-02 World Rotate (45° and 90° around Y)
- T-03 Local Scale (unrotated)
- T-04 Local Scale (rotated)
- T-05 Mode Switching (Translate → Rotate → Scale → Translate)
- T-06 Transform Integrity (finite components, quaternion length ~1 within 1e-5, no negative/zero scale, no shear)

### Notes
- No fabricated evidence or test logs have been created.
- SP-04 remains PASS (automated), visual review pending.
- The full suite has been executed, but its evidence has not been reviewed. SP-05 remains BLOCKED; do not start SP-06.
- The runner's evidence does not replace visual axis-alignment review.

### Reports
- Full execution report: `projects/simuforge/reports/poc-01/results/sp-05-manual/SP-05_FULL_EXECUTION_REPORT.md`.
- Consolidated SP-05 report: `projects/simuforge/reports/poc-01/results/sp-05-manual/SP-05_CONSOLIDATED_REPORT.md`. It records user-reported T-01 through T-05 results, automated T-06 validator results (8/8 PASS), the 2026-11-03 harness repair and CDP proof update, and the conclusion that SP-05 remains BLOCKED with A-03 and A-04 unverified.

### POC-04 OS click evidence
An OS-level click was executed at screen coordinate `(188, 188)` on the SP-05 harness. Archived evidence includes the OS click JSON, before/after screenshots, and baseline/after-click transform JSON snapshots. Transform comparison is STABLE (all 11 components diff 0 within tolerance 1e-5). OS click POC-04 is PASS for transform stability. SP-05 overall remains BLOCKED.

## SP-02 Preparation (not executed)

Documented SP-02 procedure (from readiness §8.2): set `scene.useRightHandedSystem = true` immediately after scene creation and before any content; place an asymmetric marker on +X and another on -Z; expected observation: +X appears right, +Y appears up, forward direction is -Z from the default camera view. Evidence: screenshot from a known camera pose.

Planned test setup:
- Browser: Google Chrome 156.0.8078.76 (interactive session, not headless, for visual inspection).
- Babylon.js: pinned 9.32.1 via `https://cdn.babylonjs.com/v9.32.1/babylon.js`.
- Scene: create engine, set `scene.useRightHandedSystem = true` before any content, then add an asymmetric marker mesh on +X (e.g., a cone/arrow pointing +X) and another on -Z, with a reference grid and a fixed camera pose.
- Coordinate checks:
  1. +X marker appears to the right of origin.
  2. +Y marker/up is vertical up.
  3. Forward (-Z) marker points away from the default camera view.
  4. Camera default pose recorded (alpha/beta/radius/target) and screenshot captured.
- Evidence to capture:
  - Screenshot named `sp-02_YYYYMMDD_chrome_<viewport>.png` from the known camera pose.
  - Console log of camera parameters (alpha, beta, radius, target) and any errors.
  - Note whether axes match the world convention visually.
- Pass criteria (from readiness §8.3): right-handed axes match the world convention visually.
- GPU: record actual renderer; do not force RTX 3050 selection. POC01-002 remains open as informational.