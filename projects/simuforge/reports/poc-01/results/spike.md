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
- `POC01-001` (version mismatch — see `issues.md`).
- `POC01-002` (GPU selection — see `issues.md`).