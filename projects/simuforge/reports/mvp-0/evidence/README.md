# I-05 Raw Evidence

This folder contains the exact artifacts used by the I-05 verification records.
All browser data was captured against `http://localhost:5173/` with Chrome 156
and WebGL 2.

## Artifacts

| File | Description |
| --- | --- |
| `i05-result.json` | Complete I-05 run: 51 results, console logs, errors, final state |
| `verify-i05.cjs` | I-05 acceptance harness (launches Chrome and drives the UI) |
| `verify-phase1.cjs` | Renderer conformance harness |
| `phase1-result.json` | 14/14 renderer conformance results |
| `verify-i04-regression.cjs` | I-04 regression harness (26 checks) |
| `i05-1440-empty.png` | Empty world at 1440x900 |
| `i05-1440-primitives.png` | Cube, Sphere, Plane with Plane selected |
| `i05-1440-delete-dialog.png` | Delete confirmation dialog |
| `i05-1024-primitives.png` | Compact 1024x640 layout |
| `i05-1440-empty-again.png` | Overlay restored after deleting all entities |
| `i05-1440-context-lost.png` | WebGL context-loss fallback |

## How to re-run

```powershell
# terminal 1: from projects/simuforge/app
npm run dev -- --port 5173 --strictPort

# terminal 2: from this directory
node verify-i05.cjs
```

`i05-result.json` is overwritten by each run. A failed run also writes
`i05-harness-error.json` with the failing expression and partial results.

## Notes

- The harness expects the dev build because `window.__simuforgeRenderer` is only
  exposed in DEV.
- The harness resolves the shared Chrome/CDP runner from
  `projects/simuforge/reports/poc-01/harness/runner/lib/`, so keep the repository
  layout intact.
- The screenshots are viewport captures (`Page.captureScreenshot`), not canvas
  exports, so they include the surrounding studio UI.
