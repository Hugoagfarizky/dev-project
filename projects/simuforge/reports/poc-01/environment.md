# POC-01 Environment

## Machine
- Machine: Acer Nitro 5 AN515-58
- OS: Windows 11 Home Single Language, version 10.0.26100, 64-bit
- CPU: Intel Core i5-12500H, 12 cores, 16 logical processors
- RAM: 16,869,548,032 bytes (~15.7 GiB usable)
- Discrete GPU: NVIDIA GeForce RTX 3050 Laptop GPU, 4 GB, driver 32.0.16.1088
- Integrated GPU: Intel Iris Xe Graphics, driver 31.0.101.5081
- Display: 1920 × 1080 at 144 Hz

## Tooling
- Node.js: 24.21.0
- npm: 11.19.0

## Browser (POC-01 supported and tested)
- Google Chrome: 156.0.8078.76 (only supported/tested browser for POC-01)
- Cross-browser compatibility: out of scope

## SP-01 observed rendering surface
- Chrome selected GPU: Intel Iris Xe (ANGLE, Direct3D11) during the headless run.
- WebGL: 2.0 available.
- Hardware acceleration: enabled (GPU renderer reported; not SwiftShader/CPU).

## Babylon.js (spike execution)
- CDN loaded: Babylon.js 9.33.0 (latest at run time).
- POC target version: @babylonjs/core 9.32.1 (not yet installed; CDN used for the disposable spike).
- Note: version mismatch recorded as an issue; does not affect SP-01 engine-init result.

## Execution method
- SP-01 was executed with Google Chrome in headless mode via `--dump-dom` and `--screenshot`, serving a minimal Babylon.js page from a local HTTP server.
- No Firefox installed or used.