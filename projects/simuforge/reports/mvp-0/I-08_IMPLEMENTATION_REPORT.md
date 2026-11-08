# I-08 Implementation Report

**Increment:** I-08 — Console, Status Bar & Planned Surfaces
**Status:** Complete
**Baseline:** `c346f048d7467a7b5565acf6a58aae5ef6de48b2`

## 1. Objective

Complete MVP-0 feedback surfaces: Console drawer with filtering, real status bar, planned surfaces, without implying unavailable capability.

## 2. Scope delivered

### Workstream A/B/C — Console domain/UI/log sources
- `src/ui/console/ConsoleDrawer.tsx`: log list, severity/source filters, search, clear, auto-expand.
- Wired into `StudioShell` (replaced static placeholder).
- Log sources: startup (APP_STARTED), storage errors, import errors.
- Domain `logBuffer`/`filters` reused; no second domain.

### Workstream D — First-error auto-expand
- `autoExpandedRef` in StudioShell; expands Console once on first error; manual collapse respected.

### Workstream E — Status Bar
- `StatusBar.tsx` now subscribes to store (selection, entity count, tool, save status) and renderer diagnostics (WebGL, context lost).

### Workstream F — Planned surfaces & ACG-04
- Program/Monitor remain `Planned` static; no interactive controls.
- No "60 fps" literal; no fabricated metrics.

### Workstream G — Inspector omission
- M0-AC-20 already PASS (I-05); no change.

### Workstream H — Performance/state integrity
- Store subscriptions use selectors; auto-expand guarded by ref.
- No render-loop logging.

### Workstream I — Testing/regression
- 71/71 tests pass; typecheck/check/build pass; I-06 51/51, I-04 26/26.

## 3. Known limitations

- Log sources limited to startup/storage/import; editor command and render diagnostics logging minimal.
- Console auto-expand only on first error per session.
- ACG-01 remains deferred; I-09 not started.

## 4. Deferred

- I-09 (a11y/perf/final audit).
- ACG-01.

## 5. Validation

- `npm run typecheck` PASS
- `npm test` 71/71 PASS
- `npm run check` PASS
- `npm run build` PASS