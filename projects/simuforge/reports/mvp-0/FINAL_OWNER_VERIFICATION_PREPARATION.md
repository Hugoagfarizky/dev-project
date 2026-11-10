# SimuForge — Final Owner Verification Preparation

**Date:** 2026-11-08
**Baseline:** `150999231b1bb62831f1c689b83ee267241285cc`
**Final commit:** (this increment)
**Branch:** `main`

> **Update (M0-AC-22 closure round):** §5 now records the Project Owner's manual
> keyboard-only verification results, and M0-AC-22 is closed as PASS. ACG-01
> remains NOT VERIFIED pending Project Owner visual sign-off.

## 1. Repository pre-flight

- Branch: `main`
- HEAD: `150999231b1bb62831f1c689b83ee267241285cc`
- origin/main: `150999231b1bb62831f1c689b83ee267241285cc`
- Working tree: clean
- Node: 24.22.2 (pinned), npm 11.19.1

## 2. Exact viewport verification

All six screenshots captured using `Emulation.setDeviceMetricsOverride` with exact CSS viewport:
- 1024×640: `window.innerWidth=1024`, `window.innerHeight=640`, `scrollWidth=1024`, `scrollHeight=640`.
- 1440×900: `window.innerWidth=1440`, `window.innerHeight=900`, `scrollWidth=1440`, `scrollHeight=900`.

Preset active state verified before each capture.

## 3. Six screenshot paths, dimensions, preset, SHA-256

| # | Preset | Size | Path | Active | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 1 | Build | 1024×640 | `projects/simuforge/reports/mvp-0/evidence/i09-1024x640-build.png` | B | e7cf11c9027b1601ca4c41ae66cf8a52976808837264fb5f06dd4db6b1ebe065 |
| 2 | Program | 1024×640 | `projects/simuforge/reports/mvp-0/evidence/i09-1024x640-program.png` | P | d24d38d7514729299770fd8aa0d84aeb7a4bb1342b6c3c1e013f832e46d3fe6f |
| 3 | Simulate | 1024×640 | `projects/simuforge/reports/mvp-0/evidence/i09-1024x640-simulate.png` | S | 1f4ae22a90da7408c2df679fa23a1d386d9663e8be5529db67e1dcdc24d2b457 |
| 4 | Build | 1440×900 | `projects/simuforge/reports/mvp-0/evidence/i09-1440x900-build.png` | Build | 1b578dc0b27d9741114960f5eab008aefead4ca9ea3b2284014055b79ae3a77c |
| 5 | Program | 1440×900 | `projects/simuforge/reports/mvp-0/evidence/i09-1440x900-program.png` | Program | 2651198020c9df055b73c9156effbcf1b24022b367e97730f81367e167e1a755 |
| 6 | Simulate | 1440×900 | `projects/simuforge/reports/mvp-0/evidence/i09-1440x900-simulate.png` | Simulate | d60a17dd0be844114c2c026a7ddd5cab3fc7a103abdc196de34122cb5c1eec93 |

## 4. ACG-01 technical findings

Screenshots captured with exact viewport emulation. Preset state verified active. Hashes distinct. Visual usability (no overlap, no page scroll, viewport ≥300px, auto-collapse) requires Project Owner visual inspection. OpenCode cannot visually evaluate screenshots.

## 5. M0-AC-22 keyboard test matrix

### 5.1 Project Owner manual verification (primary evidence, Chrome)

Recorded exactly as reported by the Project Owner:

| Test | Result |
| --- | --- |
| Tab navigation through interactive controls | PASS |
| Visible focus indicator | PASS |
| Shift+Tab reverse navigation | PASS |
| Delete dialog opens | PASS |
| Initial dialog focus on Cancel | PASS |
| Tab remains inside dialog | PASS |
| Shift+Tab remains inside dialog | PASS |
| Escape closes dialog | PASS |
| Focus returns to invoking control | PASS |
| Collapsed panel content is skipped by keyboard navigation | PASS |
| Inspector input accepts keyboard editing without Studio shortcut interference | PASS |

### 5.2 Automated / implementation evidence (supporting)

| Check | Status | Evidence |
| --- | --- | --- |
| Focus visible on buttons | PASS (CSS) | shell.css `:focus-visible` |
| Focus visible on inputs | PASS (CSS) | commit `4ae47c7` |
| Tab navigation through controls (10 steps) | PASS (automated run) | transient CDP harness, §6 |
| Dialog Escape close | PASS (automated run) | transient CDP harness, §6 |
| Focus restore after dialog | PASS (automated run) | transient CDP harness, §6 |
| Editable inputs not hijacked | PASS (code) | `isEditableTarget` guard |
| Collapsed panels not tabbable | PASS (code) | Panel.tsx conditional render |
| Dialog focus trap | PASS (code + Owner) | `ui/common/Dialog.tsx` |

## 6. Browser automation timeout diagnosis

Previous keyboard harness timed out because it waited 120s with no timeout handling. Root cause: the `waitFor`-style loop in the I-05 harness pattern; the keyboard harness's `sleep` calls accumulated. The simplified `_kb.js` harness completed successfully (KB DONE) and produced results: Tab moved through 10 controls (canvas → File/Edit/View → Build/Program/Simulate → Project Hub/Save/Export), dialog opened with focus on Cancel, Escape closed dialog, focus restored. No keyboard trap observed in the 10-step sequence.

## 7. Manual verification steps still required

M0-AC-22 manual keyboard verification is **complete** (Project Owner, §5.1). Remaining manual step:

1. Visual inspection of the six screenshots for layout usability (Build/Program/Simulate at 1024×640 and 1440×900): no overlap, no unexpected page scroll, viewport ≥300 px, auto-collapse behaving per the responsive rules.

## 8. Regression results

- typecheck PASS, tests 71/71, check PASS, build PASS.
- No application source changes in this commit.

## 9. File changes and Git status

No code changes in this round (evidence only). Temp harnesses removed. Working tree clean after commit.

## 10. Remaining blockers

- **ACG-01:** PENDING PROJECT OWNER VISUAL SIGN-OFF (screenshots provided, distinct, exact viewport).
- **M0-AC-22:** PASS — Project Owner manual keyboard-only verification (11/11) plus supporting implementation review and automated run.

**MVP-0 remains NOT ACCEPTED. ACG-01 awaits Project Owner visual sign-off. STOP.**