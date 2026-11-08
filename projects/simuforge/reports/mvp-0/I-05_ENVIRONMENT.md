# I-05 Verification Environment

**Captured:** 2026-11-08
**Repository:** `D:\Github\dev-project`
**Branch:** `main`

## 1. Repository state

| Item | Value |
| --- | --- |
| Starting commit (authorized HEAD) | `cd330659c846e07ad67b3551251005cb2127cb75` |
| Renderer conformance commit | `4eacb0f7a90b12d6cabf2e8509b90c4842c9788a` |
| Editor/store commit | `ab11fc56ac65ee9e6d3b6f31464c3762ad409a94` |
| UI foundation commit | `0ddff089e2057f187961c54c151d94d0b11152e8` |
| UI integration commit | `9a57cde8d2bcae23f78c7de5e53c49fccfd6e98e` |
| Evidence commit | the commit that adds this directory |
| Working tree during verification | Clean after each group commit |

## 2. Toolchain

| Tool | Version |
| --- | --- |
| Operating system | Windows 11 Home Single Language, version 10.0.26100 |
| Node.js | 24.22.2 |
| npm | 11.19.1 |
| TypeScript | 6.0.3 |
| Vite | 8.3.5 |
| React / React DOM | 19.3.1 |
| Babylon.js | 9.32.1 |
| Chrome | 156.0.8078.81 |

Chrome user agent:
`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36`

## 3. Browser conditions

- The app ran from the Vite development server at `http://localhost:5173/`
  with `--strictPort`.
- The harness launched Chrome with a dedicated profile and debugging port via
  the POC-01 runner, including its anti-throttling flags.
- Primary viewport: `Emulation.setDeviceMetricsOverride` at 1440x900,
  deviceScaleFactor 1.
- Compact viewport: 1024x640, deviceScaleFactor 1.
- Device pixel ratio measured in-page: ~1.0.
- `window.__simuforgeRenderer` is exposed only in DEV builds and was used to
  read diagnostics, camera pose, and canvas pixels.
- Context loss was induced with the standard `WEBGL_lose_context` extension and
  restored with `restoreContext()`.

## 4. Commands and results

All commands were run from `D:\Github\dev-project\projects\simuforge\app` with
the pinned Node on `PATH`.

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | 68/68 PASS |
| `npm run check` | PASS (Node, typecheck, boundaries, token contrast) |
| `npm run build` | PASS; only the existing chunk-size warning |
| `node verify-phase1.cjs` | 14/14 PASS |
| `node verify-i05.cjs` | 51/51 PASS |
| `node verify-final.cjs` (I-04 regression) | 26/26 PASS |

## 5. Evidence location

- Written records: `projects/simuforge/reports/mvp-0/`
- Raw browser data: `projects/simuforge/reports/mvp-0/evidence/i05-result.json`
- Screenshots: `projects/simuforge/reports/mvp-0/evidence/*.png`
- Harness sources: `projects/simuforge/reports/mvp-0/evidence/verify-*.cjs`

The harnesses resolve the POC-01 runner from the repository, so they can be
re-run from the evidence directory without path changes.
