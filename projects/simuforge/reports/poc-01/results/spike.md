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