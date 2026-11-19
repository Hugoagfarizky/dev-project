# SimuForge — Browser Compatibility Matrix (v1.0)

| Browser | Version tested | Critical workflows | Python interrupt | Notes |
|---|---|---|---|---|
| Chrome | 156+ (Chromium) | PASS | Full (SharedArrayBuffer with COOP/COEP) | Release-supported |
| Edge | Chromium-based | PASS (Chromium parity) | Full with COOP/COEP | Release-supported |
| Firefox | latest | Best-effort; manual verification | Terminate-based only without COOP/COEP | Documented limitations |

## Viewport

| Resolution | Layout | Status |
|---|---|---|
| 1024×640 | Console collapses when Program panel open (accepted) | PASS |
| 1280×720 | Console collapses when Program panel open (accepted) | PASS |
| 1440×900 | Full layout | PASS |

## Known browser limitations

- Firefox: Python hard interrupt requires cross-origin isolation; without COOP/COEP, only
  terminate-and-restart cancellation is available.
- WebGL 2 required; overlay shown when unavailable.
- IndexedDB required for persistence; memory mode + file export fallback otherwise.
