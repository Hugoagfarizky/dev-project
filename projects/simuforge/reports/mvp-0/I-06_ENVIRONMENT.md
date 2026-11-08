# I-06 Verification Environment

**Captured:** 2026-11-08
**Repository:** `D:\Github\dev-project`
**Branch:** `main`

## 1. Repository state

| Item | Value |
| --- | --- |
| Baseline (I-05) | `889d081e41c5e6d864f4d50e0edee8a471bfb7c6` |
| I-06 implementation | this increment |
| Working tree during verification | Clean after final state |

## 2. Toolchain

| Tool | Version |
| --- | --- |
| Operating system | Windows 11 Home Single Language, 10.0.26100 |
| Node.js | 24.22.2 |
| npm | 11.19.1 |
| TypeScript | 6.0.3 |
| Vite | 8.3.5 |
| React / React DOM | 19.3.1 |
| Babylon.js | 9.32.1 |
| Chrome | 156.0.8078.81 |

## 3. Verification commands

- `npm run typecheck` — PASS
- `npm test` — 69/69 PASS
- `npm run check` — PASS
- `npm run build` — PASS
- `node verify-i04-regression.cjs` — 26/26 PASS
- `node verify-i05.cjs` — 50/51 (one check superseded by I-06; see matrix)
- `node verify-i06.cjs` — 51/51 PASS

## 4. Evidence artifacts

- `reports/mvp-0/evidence/i06-result.json`
- `reports/mvp-0/evidence/i06-*.png`
- `reports/mvp-0/shortcuts/audit.md`