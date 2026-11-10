# ACG-01 — Visual Evidence Audit and Owner Review

**Audit date:** 2026-11-10
**Repository HEAD:** `1ff2ff6670a9a77386bb4e079da6b3bbb6ef737b`
**Screenshot capture commit:** `0e9e19618e91174bbe2434453205f4fc7629d8b5` (capture timestamp `2026-11-08T11:24:51.240Z`)
**Source changes between capture and this audit:** none — `git diff --stat 0e9e196..HEAD` touches only four Markdown files under `reports/mvp-0/` (documentation), so the captured UI still corresponds to the current source.
**Gate being audited:** ACG-01 — Visual layout validation (spec §11.1)

> **Status: PENDING PROJECT OWNER SIGN-OFF.** This document records a technical visual audit by OpenCode. It does not confer acceptance, and it does not mark ACG-01 as PASS.

---

## 1. Repository pre-flight

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `1ff2ff6670a9a77386bb4e079da6b3bbb6ef737b` |
| `origin/main` | `1ff2ff6670a9a77386bb4e079da6b3bbb6ef737b` (in sync) |
| Tracked working tree | clean |
| Node / npm | `24.22.2` / `11.19.1` (pinned executables) |
| Untracked file | `package-lock.json` at repo root (90-byte npm artifact, no root `package.json`). Pre-existing, out of scope, left untouched and not staged. |

No repository file was deleted, renamed, overwritten, or modified during this audit. Zoom crops were written only to `C:\Users\Acer\AppData\Local\Temp\opencode\` (outside the repository) and were generated from read-only copies.

## 2. Inspection method

1. All six PNGs were opened and viewed directly with the agent's image inspection capability — not metadata-only, not hash-only.
2. IHDR dimensions were read from each file to confirm the pixel geometry independent of the filename.
3. SHA-256 and byte length of every file were recomputed and compared with `evidence/i09-visual-meta.json`: **6/6 match**, so the files on disk are the files that were captured.
4. Selected regions were magnified (nearest-neighbour, 2–3×) to judge legibility, control styling, and whether an expanded panel had content. Crops were not edited or resampled into the evidence directory.
5. Pixel row/column scans were used only to measure panel boundaries (e.g. Program panel body height) as supporting detail. The usability judgement itself comes from viewing the images.

| File | IHDR size | Bytes | SHA-256 (prefix) | Metadata match |
| --- | --- | --- | --- | --- |
| `i09-1024x640-build.png` | 1024×640 | 76199 | `e7cf11c9027b1601` | yes |
| `i09-1024x640-program.png` | 1024×640 | 75015 | `d24d38d751472929` | yes |
| `i09-1024x640-simulate.png` | 1024×640 | 80169 | `1f4ae22a90da7408` | yes |
| `i09-1440x900-build.png` | 1440×900 | 109032 | `1b578dc0b27d9741` | yes |
| `i09-1440x900-program.png` | 1440×900 | 109539 | `2651198020c9df05` | yes |
| `i09-1440x900-simulate.png` | 1440×900 | 113853 | `d60a17dd0be84411` | yes |

Full hashes are recorded in `evidence/i09-visual-meta.json` and in `FINAL_OWNER_VERIFICATION_PREPARATION.md` §3.

## 3. Per-screenshot results

### 3.1 Build — 1024×640

**Path:** `projects/simuforge/reports/mvp-0/evidence/i09-1024x640-build.png`
**Active preset (confirmed visually):** Build (`B` highlighted in the preset cluster; "Editing" badge present)

| Check | Result |
| --- | --- |
| Panel overlap | None. Top bar / left dock / viewport / right dock / console / status bar are cleanly separated by 1 px splitters. |
| Clipping | None. Inspector actions (Project Hub, Save, Export) fully visible inside the 280 px right dock; status bar contents fit. |
| Text legibility | Good. Hierarchy title, empty-state text, primitive names, and status fields are readable at 11–13 px. |
| Viewport proportion | Centre column ≈ 522 px wide (220 px left dock + 280 px right dock), ≈ 383 px tall. Comfortably above the 300 px floor. |
| Responsive auto-collapse | Matches the documented Build layout: World Hierarchy expanded, Asset Library expanded (220 px), Program strip collapsed (32 px, header shows `Planned`), Monitor strip collapsed (`Planned`), Console collapsed (32 px). |
| Unexpected page scroll | None. No page scrollbar; captured `scrollWidth/scrollHeight` equal the 1024×640 viewport. |
| Preset consistency | Build is the only preset that shows the Asset Library expanded — expected for the build workflow. |

Observation: in compact mode the top bar reduces preset labels to `B` / `P` / `S` (spec §3.3 requires "preset labels become icons with accessible names"). Visually the single letters are small but legible; ambiguity is mitigated by accessibility names rather than visible text. Recorded as an observation, not a defect.

### 3.2 Program — 1024×640

**Path:** `projects/simuforge/reports/mvp-0/evidence/i09-1024x640-program.png`
**Active preset:** Program (`P` highlighted)

| Check | Result |
| --- | --- |
| Panel overlap | None. |
| Clipping | None. All viewport/Inspector/top-bar controls fully rendered. |
| Text legibility | Good. |
| Viewport proportion | ≈ 522 × 350 px (Program dock open below it). Above 300 px. |
| Responsive auto-collapse | Asset Library collapsed (32 px, `3 primitives`), Program dock **open**, Monitor strip 32 px, Console collapsed. Program body measured 198 px (borders at y≈415 and y≈615 in a 640 px viewport), consistent with the documented “200 px below 760 px height” rule. |
| Unexpected page scroll | None. |
| Preset consistency | **Deviation — see F-1.** The expanded Program panel body is empty; unlike Build/Simulate, the surface carries no visible `Planned` label in this state. |

### 3.3 Simulate — 1024×640

**Path:** `projects/simuforge/reports/mvp-0/evidence/i09-1024x640-simulate.png`
**Active preset:** Simulate (`S` highlighted)

| Check | Result |
| --- | --- |
| Panel overlap | None. Program strip, Monitor strip, and Console stack without collision. |
| Clipping | No control is cut off; the console filter row fits horizontally at 1024 px. |
| Text legibility | Present but improvable — see F-2 and F-3. |
| Viewport proportion | ≈ 522 × 390 px. Above 300 px. |
| Responsive auto-collapse | Program strip 32 px (y≈423–455), Monitor strip 32 px, Console expanded ≈160 px (y≈456–615). Matches spec §3.3 table exactly. |
| Unexpected page scroll | None. |
| Preset consistency | Consistent with the documented Simulate layout (Assets collapsed, console expanded). |

### 3.4 Build — 1440×900

**Path:** `projects/simuforge/reports/mvp-0/evidence/i09-1440x900-build.png`
**Active preset:** Build (full text label highlighted)

| Check | Result |
| --- | --- |
| Panel overlap | None. |
| Clipping | None. Full brand block, project meta (`Not saved`), and full preset labels are visible. |
| Text legibility | Good. |
| Viewport proportion | ≈ 862 × 813 px (left dock 260 px, right dock 280 px). |
| Responsive auto-collapse | Full-width layout: Asset Library expanded, Program strip 32 px (`Planned`), Monitor strip (`Planned`), Console collapsed. |
| Unexpected page scroll | None. |
| Preset consistency | Consistent with the 1024 Build layout, only wider. |

### 3.5 Program — 1440×900 *(not previously reviewed by the Owner — inspected here)*

**Path:** `projects/simuforge/reports/mvp-0/evidence/i09-1440x900-program.png`
**Active preset:** Program (highlighted)

| Check | Result |
| --- | --- |
| Panel overlap | None. |
| Clipping | None. Top-bar `Editing` badge and right-dock actions fully visible. |
| Text legibility | Good elsewhere; Program surface itself renders nothing — see F-1. |
| Viewport proportion | ≈ 862 × 508 px; well above 300 px. |
| Responsive auto-collapse | Program dock open, Asset Library collapsed (`3 primitives`), Monitor `Planned` strip, Console collapsed. |
| Unexpected page scroll | None. |
| Preset consistency | **Same deviation as F-1** — the open Program panel occupies roughly 250 px of blank surface with no `Planned` label. |

### 3.6 Simulate — 1440×900 *(not previously reviewed by the Owner — inspected here)*

**Path:** `projects/simuforge/reports/mvp-0/evidence/i09-1440x900-simulate.png`
**Active preset:** Simulate (highlighted)

| Check | Result |
| --- | --- |
| Panel overlap | None. |
| Clipping | None. |
| Text legibility | Log line is readable but field boundaries are unclear — see F-3. Filter controls are legible but unthemed — see F-2. |
| Viewport proportion | ≈ 862 × 528 px. |
| Responsive auto-collapse | Program strip 32 px (`Planned`), Monitor strip 32 px (`Planned`), Console expanded with filter row and one log entry. |
| Unexpected page scroll | None. |
| Preset consistency | Consistent with Simulate 1024×640. Log timestamp `2026-11-08T11:24:44.178Z` matches the same capture session as the 1024 run, so the 1440 images are not stale re-uses of an older session. |

## 4. ACG-01 criteria matrix (at 1024×640, per spec §11.1)

| Criterion | Build | Program | Simulate | Basis |
| --- | --- | --- | --- | --- |
| No overlap | PASS | PASS | PASS | Visual inspection of the full frame |
| No page-level scroll | PASS | PASS | PASS | No scrollbar rendered; captured `scrollWidth/scrollHeight` = 1024/640 |
| Viewport ≥ 300 px | PASS (≈522×383) | PASS (≈522×350) | PASS (≈522×390) | Visual inspection + framing measurement |
| Documented auto-collapse result | PASS | PASS | PASS | Compared against spec §3.3 preset table and §3.4 collapse rules |

These are the four criteria ACG-01 actually defines. All four are satisfied on inspection at 1024×640, and no layout-breaking defect appears at 1440×900.

## 5. Owner observations vs. this audit

| Screenshot | Owner | OpenCode inspection | Agreement |
| --- | --- | --- | --- |
| Build 1024×640 | Reviewed, no major visual issue | Four criteria met; one minor observation (single-letter preset labels) | Agree |
| Program 1024×640 | Reviewed, no major visual issue | Four criteria met; F-1 recorded | Agree on layout; audit adds F-1 |
| Simulate 1024×640 | Reviewed, no major visual issue | Four criteria met; F-2/F-3 recorded | Agree on layout; audit adds F-2/F-3 |
| Build 1440×900 | Reviewed, no major visual issue | Four criteria met; no new finding | Agree |
| Program 1440×900 | Not reviewed | Inspected: layout sound; F-1 present | New evidence |
| Simulate 1440×900 | Not reviewed | Inspected: layout sound; F-2/F-3 present | New evidence |

The Owner's four observations and this audit do not conflict. The two previously unreviewed 1440×900 images show no layout defect beyond the shared findings below.

## 6. Findings

Findings are listed by severity. None of them is one of ACG-01's four criteria, but F-1 interacts with ACG-04, so it needs an explicit Owner decision.

### F-1 — Expanded Program panel renders a blank surface with no `Planned` label (minor, ACG-04-relevant)

- **Observed in:** `i09-1024x640-program.png`, `i09-1440x900-program.png`.
- **Behaviour:** In the Program preset the Program dock is open (chevron points down), and its body is empty. In Build and Simulate the same panel is collapsed and its header shows the `Planned` summary. Monitor shows `PLANNED` in its body when expanded, so the two planned surfaces behave differently.
- **Cause (code):** `app/src/ui/shell/StudioShell.tsx` renders `<div className="sf-planned-surface">Planned</div>` inside the Program panel body with `summary="Planned"`, but `app/src/styles/shell.css` contains `.sf-planned-panel .sf-panel-body { display: none; }`, which suppresses the body unconditionally. The `Planned` text therefore never appears in the open state.
- **Impact:** The Program surface is an unavailable MVP-1+ surface. ACG-04 requires that "any unavailable surface is clearly `Planned`". In the Program preset open state that condition is not met visually. ACG-04 was recorded PASS in I-09 on source/DOM grounds; this is the first visual contradiction of that clause.
- **No change made:** Fixing it is a one-line CSS change outside this audit's authorization (documentation only). It requires Owner authorization.

### F-2 — Console filter controls use unthemed native styling (minor, cosmetic)

- **Observed in:** `i09-1024x640-simulate.png`, `i09-1440x900-simulate.png`.
- **Behaviour:** `Collapse`, both filter `<select>`s, the search field, and `Clear` render with browser-default white backgrounds and square borders inside an otherwise dark shell, and the row sits flush against the panel edges without the 12 px padding used by other panels.
- **Impact:** Cosmetic inconsistency; text remains high-contrast and usable. Not a layout, overlap, clipping, or scroll defect.

### F-3 — Console log line concatenates fields without separators (minor, readability)

- **Observed in:** both Simulate screenshots, e.g. `2026-11-08T11:24:44.178ZINFOAPPAPP_STARTEDSimuForge Studio started`.
- **Behaviour:** timestamp, severity, source, code, and message run together. The uppercase tokens hint at the boundaries, but `INFOAPPAPP_STARTED` is genuinely ambiguous to read.
- **Impact:** Readability of the console log, which is one of the panels the MVP-0 shell exposes. Not a layout defect.
- **Cause:** rendering-side formatting in the console row (timestamp + severity + source + code + message concatenated without separators or spacing).

## 7. Limitations of this audit

- **Empty-world state only.** All six screenshots show an empty world (`0/0 meshes`, `Entities 0`). Selection-populated Inspector, Hierarchy with objects, the delete dialog, the Project Hub, first-error auto-expand, and hover/focus states are **not** covered by this evidence set. ACG-01's documented procedure only requires the three presets at 1024×640, but any claim about those other states would need new captures.
- **Static frames.** No animation, scrollbar-on-overflow, resize-drag, or browser-zoom state is represented.
- **Single reviewer, subjective judgement.** "No overlap" and "legible" are visual judgements made by one reviewer; the Owner's sign-off remains the authority.
- **No colour-vision or contrast simulation.** Text contrast figures are covered separately by ACG-02 token measurement, not re-measured here.
- **The 1440×900 images are supporting evidence only.** ACG-01 is defined at 1024×640; the wider size is reported because the Owner asked for all six files.
- **No interaction was replayed.** This audit inspected stored images; it did not re-run the browser session.

## 8. Verdict

| Item | Status |
| --- | --- |
| Six screenshots available, genuine, unmodified | PASS (6/6 hashes match capture metadata; IHDR sizes 1024×640 and 1440×900) |
| ACG-01 four criteria at 1024×640 | PASS on visual inspection (Build, Program, Simulate) |
| ACG-01 1440×900 supplementary review | PASS — no layout defect found |
| ACG-01 gate status | **PENDING PROJECT OWNER SIGN-OFF** (not PASS; sign-off is the Owner's) |
| Findings F-1, F-2, F-3 | Recorded above; no source change made |

**Readiness: READY FOR PROJECT OWNER SIGN-OFF on ACG-01**, conditional on the Owner's disposition of **F-1**, which is a labelling gap on an unavailable surface and therefore touches ACG-04 rather than ACG-01's four criteria.

**Decision required from the Project Owner:**

1. Accept F-1 as a known minor limitation and sign off ACG-01 (and confirm ACG-04 remains PASS), **or**
2. Authorize a targeted one-line fix (restore the Program panel body so the `Planned` surface is visible), after which the three 1024×640 and three 1440×900 screenshots must be re-captured and this audit re-run.

F-2 and F-3 can be deferred to a later increment; neither affects ACG-01 or the usability of the shipped shell.

**MVP-0 remains NOT ACCEPTED.** Nothing in this document changes that, and no other gate status is modified.

## 9. Git and file changes

- New file (this audit): `projects/simuforge/reports/mvp-0/ACG-01_VISUAL_OWNER_REVIEW.md`.
- Index update: `projects/simuforge/reports/mvp-0/README.md` (one row).
- No application source, test, ADR, specification, acceptance criteria, or screenshot was modified.
- Commit and push status: reported in the accompanying summary.
