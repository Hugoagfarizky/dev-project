# SP-05 Full Execution Report

Automated execution of the complete SP-05 test suite (T-01 through T-06) using the approved direct-CDP runner.

| Field | Value |
| --- | --- |
| Report date | 2026-11-03 |
| Runner | `projects/simuforge/reports/poc-01/harness/runner/` (runner 1.0.0, commit `1dffd74`) |
| Run ID | `2026-11-03T09-16-00-842Z-25efe7` |
| Started | `2026-11-03T09:16:00.842Z` |
| Completed | `2026-11-03T09:17:00.562Z` |
| Harness | `harness/sp05.html`, 36,233 bytes, SHA-256 `0a05cda7c8407c747466fff21137820e551945de7b5e74c89a3d695807a1d222` |
| Babylon.js | 9.32.1, right-handed system |
| Browser | Chrome/156.0.8078.76, dedicated temporary profile, port 9223 |
| Evidence directory | `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/` |
| Runner assertion result | PASS — 256/256 checks across six cases, 0 failed, 0 retries |
| SP-05 status | **BLOCKED — not released.** This report records execution evidence; it does not mark SP-05 PASS. |

---

## 1. Preflight

Preflight used a separate temporary, read-only CDP session. It did not modify the repository.

| # | Check | Result | Detail |
| --- | --- | --- | --- |
| 1 | Repository on `main`, synchronized with `origin/main` | PASS | HEAD `1dffd74` = `origin/main` |
| 2 | Working tree clean before execution | PASS | No modified or untracked files |
| 3 | HEAD contains the validated runner | PASS | `1dffd740216ed4e57755b689987b88fd75308e4a` |
| 4 | Harness and runner files exist | PASS | `sp05.html`, `run.js`, `lib/cdp.js`, `lib/browser.js`, `cases/index.js` |
| 5 | JavaScript syntax checks | PASS | All runner `.js` files and the harness inline script |
| 6 | CDP port free before launch | PASS | Port 9223 unbound |
| 7 | Chrome CDP connectivity | PASS | Chrome 156.0.8078.76 launched and reachable |
| 8 | Dedicated temporary profile | PASS | `%TEMP%\sp05-chrome-hPTOUg` |
| 9 | Anti-throttling launch flags | PASS | `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`, `--disable-features=CalculateNativeWinOcclusion` |
| 10 | Babylon.js version | PASS | 9.32.1 |
| 11 | Right-handed system | PASS | `useRightHandedSystem: true` |
| 12 | Translate gizmo world orientation | PASS | `positionSpaceWorld: true`, update flag `false` |
| 13 | Rotate gizmo world orientation | PASS | `rotationSpaceWorld: true`, update flag `false` |
| 14 | Scale gizmo local orientation | PASS | `scaleSpaceLocal: true`, update flag `true` |
| 15 | Provenance declaration | PASS | `cdp_trusted_input`, driver `simuforge-sp05-cdp-runner` |
| 16 | Policy rejects synthetic/programmatic input | PASS | `synthetic_input`, `programmatic_transform` rejected |
| 17 | No synthetic input during preflight | PASS | `syntheticSeen: false` |
| 18 | No console errors during preflight | PASS | None |
| 19 | Evidence destination ready | PASS | Existing POC-04 artifacts preserved; no filename collision |

Gizmo policy was re-verified after each mode activation, not inferred from source. The three assignments are applied by `applyGizmoSpace()` after lazy creation and on every `setMode()`.

---

## 2. Execution summary

Command:

```text
node run.js --cases all --out projects/simuforge/reports/poc-01/results/sp-05-manual/evidence
```

| Case | Title | Assertions | Failed | Result | Duration |
| --- | --- | --- | --- | --- | --- |
| T-01 | World-space translation of a rotated cube | 59/59 | 0 | PASS | 11,708 ms |
| T-02 | World-space rotation of a rotated cube | 35/35 | 0 | PASS | 10,824 ms |
| T-03 | Local-space scale of an unrotated cube | 26/26 | 0 | PASS | 5,890 ms |
| T-04 | Local-space scale of a rotated cube | 61/61 | 0 | PASS | 13,543 ms |
| T-05 | Mode switching does not disturb the transform | 26/26 | 0 | PASS | 5,845 ms |
| T-06 | Transform integrity after rotate, translate, and scale | 49/49 | 0 | PASS | 8,935 ms |
| **Total** | | **256/256** | **0** | **PASS** | **56,745 ms case time (59.7 s wall clock)** |

- One pass. Each case reloaded `sp05.html` from disk with cache disabled.
- No recoverable failures; `recoveries` is empty and `aborted` is false.
- No case was retried.
- No assertion was suppressed.
- No direct transform assignment, synthetic pointer event, internal gizmo drag call, or debugger injection was used.

---

## 3. Individual results

### T-01 — World Translate (59/59 PASS)

Setup: genuine CDP drag rotated the cube 40.8814° about world Y. Translate mode confirmed `positionSpaceWorld: true`.

| Drag | Delta | Axis check | Lifecycle |
| --- | --- | --- | --- |
| World X | `(0.902087, 0, 0)` | world angle 0°, off-axis 0 | 1 / 24 / 1 |
| World Y | `(0, 0.817648, 0)` | world angle 0°, off-axis 0 | 1 / 24 / 1 |
| World Z | `(0, 0, 0.858875)` | world angle 0°, off-axis 0 | 1 / 24 / 1 |

The X/Y/Z handle directions matched the world axes, not the cube's rotated local axes. Translation was confined to the dragged world axis within `1e-3`.

### T-02 — World Rotate (35/35 PASS)

Setup: 40.8814° about world Y. Rotate mode confirmed `rotationSpaceWorld: true`.

- World X drag produced an orientation delta axis `(1.000000, 0, 0)` at 43.9206°.
- The rotated local X axis in world coordinates was `(0.756066, 0, -0.654495)`.
- The delta excludes local-space behaviour: it aligns with world X to within the `0.9995` limit.
- Angle is plausible for the requested 45° drag.
- Lifecycle 1 / 24 / 1, fully trusted.

### T-03 — Unrotated Local Scale (26/26 PASS)

- Scale mode confirmed `scaleSpaceLocal: true`.
- Local X drag changed scale `(1, 1, 1) → (1.214723, 1, 1)`.
- Local Y and Z scale handles showed zero drag activity.
- On the unrotated cube, local X coincides with world X (world angle 0°).
- Non-uniform growth confirmed; Y/Z unchanged within `1e-6`.

### T-04 — Rotated Local Scale (61/61 PASS)

Setup: 40.8814° about world Y; local X diverges from world X by 40.8814°.

| Drag | Scale change | Axis check | Lifecycle |
| --- | --- | --- | --- |
| Local X at ~41° | `(1, 1, 1) → (1.203411, 1, 1)` | local X world angle 0°, off-axis 0 | 1 / 24 / 1 |
| Supplementary ~46.57° Y (total ~87.45°) | — | world Y delta, angle 0° | 1 / 24 / 1 |
| Local Y near 90° | `(1.203411, 1, 1) → (1.203411, 1.134295, 1)` | local Y world angle 0°, off-axis 0 | 1 / 24 / 1 |

The scale handles followed the rotated local axes; the scaled axis increased and the other axes remained unchanged within `1e-6`.

### T-05 — Mode Switching (26/26 PASS)

- Baseline captured, then Translate → Rotate → Scale → Translate with no drags.
- Gizmo space policy was re-applied and verified after each mode change.
- Position stayed `(0, 0.5, 0)`, quaternion `(0, 0, 0, 1)`, scale `(1, 1, 1)` through every mode.
- Harness comparison result: **STABLE** (tolerance `1e-5`).
- Zero drags were performed, as required.

### T-06 — Transform Integrity (49/49 PASS)

Fresh case: rotate world Y 40.8814° → world X translation → local X scale.

- World X translation delta `(0.713283, 0, 0)`; confined to world X; handle world angle 0°.
- Local X scale `(1, 1, 1) → (1.154594, 1, 1)`; confined to local X; handle world angle 0°.
- Quaternion components finite; length `1.000000` (within `1e-5`).
- Harness quaternion validation: VALID.
- Scale components finite, positive, and above the `1e-3` floor.
- Harness scale validation: VALID.
- Transform is not back at the initial state.

---

## 4. Post-execution audit

An independent audit script re-read every sidecar and export and performed 750 integrity checks.

| Audit area | Result |
| --- | --- |
| Six audit records present, T-01…T-06 | PASS |
| Six harness exports present | PASS |
| Every case result PASS, 0 failed assertions | PASS |
| Every artifact exists, size and SHA-256 match the sidecar | PASS |
| Harness SHA-256 matches the current harness file in every case | PASS |
| Babylon 9.32.1 and right-handed mode in every case | PASS |
| Gizmo policy world/world/local in every export | PASS |
| Every entry `cdp_trusted_input`, eligible, automated, not manual | PASS |
| Every drag `allTrusted: true`, `pointerType: "mouse"` | PASS |
| Every pointer event `isTrusted: true` | PASS |
| CDP methods are `Input.dispatchMouseEvent` | PASS |
| Drag lifecycle `start=1`, `drag=24`, `end=1` on all 14 drags | PASS |
| Handle picked axis matches target axis on all drags | PASS |
| No cross-axis gizmo activity | PASS |
| Start/end coordinates reconcile with CDP within 2 px | PASS |
| Quaternion normalized, scale positive and finite | PASS |
| No unexplained console errors | PASS |
| No `"interactionManual": true` | PASS |
| No synthetic or programmatic input labels | PASS |
| **Audit total** | **750/750 PASS** |

The 750 checks are an independent evidence-integrity audit, not SP-05 acceptance criteria.

---

## 5. Provenance audit

| Measure | Value |
| --- | --- |
| Genuine CDP drags | 14 |
| Drag lifecycle | 14 × `start=1`, `drag=24`, `end=1` |
| CDP event type | `Input.dispatchMouseEvent` |
| Harness `isTrusted` | `true` on every observed pointer event |
| Harness `pointerType` | `mouse` on every observed pointer event |
| Declared method | `cdp_trusted_input` |
| Runner declaration | driver `simuforge-sp05-cdp-runner`, session `2026-11-03T09-16-00-842Z-25efe7` |
| Synthetic input | none (`syntheticSeen: false` in all six cases) |
| Programmatic transform | none recorded |
| `interactionManual` | `false` in every entry |
| `interactionAutomated` | `true` in every entry |
| SP-05 eligibility | `true` in every entry |
| Cross-axis activity | 0 |
| Console errors / exceptions | 0 |
| Informational console entries | 1 per case (no warnings or errors) |

Note: T-05 performs no drags by design, so its export has zero drag records while still recording `cdp_trusted_input` provenance.

---

## 6. Evidence inventory

22 files were written into `results/sp-05-manual/evidence/`:

| Case | Screenshots | Harness export | Sidecar audit |
| --- | --- | --- | --- |
| T-01 | `sp-05_translate_x.png` (89,522 B), `sp-05_translate_y.png` (89,151 B), `sp-05_translate_z.png` (88,830 B) | `sp-05_translate_log.json` (53,841 B) | `sp-05_translate_audit.json` (189,518 B) |
| T-02 | `sp-05_rotate_world_x.png` (107,615 B) | `sp-05_rotate_log.json` (34,016 B) | `sp-05_rotate_audit.json` (110,662 B) |
| T-03 | `sp-05_scale_unrotated.png` (90,960 B) | `sp-05_scale_unrotated_log.json` (23,966 B) | `sp-05_scale_unrotated_audit.json` (75,094 B) |
| T-04 | `sp-05_scale_rotated_45.png` (86,291 B), `sp-05_scale_rotated_90.png` (92,310 B) | `sp-05_scale_rotated_log.json` (53,029 B) | `sp-05_scale_rotated_audit.json` (192,112 B) |
| T-05 | `sp-05_mode_switch.png` (90,734 B) | `sp-05_mode_switch_log.json` (5,605 B) | `sp-05_mode_switch_audit.json` (32,379 B) |
| T-06 | `sp-05_transform_integrity.png` (87,697 B) | `sp-05_final_integrity_log.json` (56,060 B) | `sp-05_final_integrity_audit.json` (165,060 B) |
| Run | — | — | `run_summary.json` (194,508 B) |

All 9 screenshots are valid PNGs, 1733 × 985, captured with CDP `Page.captureScreenshot`.

The five pre-existing POC-04 evidence files in the same directory were not modified or deleted. No staging directories or temporary files remain.

---

## 7. Environment

| Field | Value |
| --- | --- |
| OS | Windows (`win32`), Windows NT 10.0 |
| Node.js | v24.21.0 |
| Chrome | 156.0.8078.76 |
| User agent | `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36` |
| Viewport | 1386 × 788 |
| Canvas | 986.4 × 697.275 CSS px |
| Device pixel ratio | 1.25 |
| Camera | alpha 0.785398, beta 1.047198, radius 8, target `(0, 0.5, 0)` |

---

## 8. Acceptance-criteria comparison

| Criterion area | Test | Execution evidence | Status |
| --- | --- | --- | --- |
| A-03 — world translate | T-01 | PASS: world X/Y/Z deltas after a genuine ~41° Y rotation | Automated evidence complete; visual review pending |
| A-03 — world rotate | T-02 | PASS: delta axis `(1, 0, 0)` at 43.92°, distinct from rotated local X | Automated evidence complete; visual review pending |
| A-04 — local scale, unrotated | T-03 | PASS: local X `1 → 1.214723`, Y/Z unchanged | Automated evidence complete; visual review pending |
| A-04 — local scale, rotated | T-04 | PASS: local X `1 → 1.203411`; supplementary local Y at ~87° | Automated evidence complete; visual review pending |
| Mode-switch stability | T-05 | PASS: STABLE, zero drags | Automated evidence complete |
| Transform integrity | T-06 | PASS: normalized quaternion, positive finite scale | Automated evidence complete |

These results support A-03 and A-04 but do not verify them. Axis alignment and handle appearance still require human review of the screenshots.

---

## 9. Deviations and gaps (post-decision)

1. **`sp-05_rotate_45.png` — removed from mandatory inventory (2026-11-03).** No procedure step requires it; `sp-05_rotate_world_x.png` remains the T-02 evidence. No capture was fabricated.
2. **`sp-05_rotate_90_y_supplementary.png` not produced.** Optional; not captured.
3. **T-04 local Z scaling.** The official run did not drag local Z. A supplemental targeted run (`targeted-localz-2026-11-03T09-26-28-166Z-914f38`, 45/45 PASS) is accepted as evidence for T-04 step 5, with matching harness SHA-256, Babylon version, gizmo policy, and provenance.
4. **T-06 is an independent case**, not a literal continuation of T-05 (runner reloads per case).
5. **Harness checklist statuses remain "Not tested".** The runner does not set the manual checklist. "Evidence captured" is the appropriate intermediate status once the evidence is accepted; "Validation passed" only after visual review.
6. **Rotation angles slightly under nominal.** Setup 40.8814° for a requested 42° (accepted as sufficient POC evidence for axis distinction; the runner's 75–125% band is an internal assertion, not a product tolerance). T-02 world-X delta 43.9206° for a requested 45°. Values recorded without adjustment.
7. **Screenshots are CDP viewport captures**, not OS-level captures (approved automated method).
8. **`sp-05_transform_integrity.png` is additional evidence** beyond the procedure's required list.

None of these deviations invalidates the executed interactions, but items 1–3 affect completeness against the written procedure.

---

## 10. Criteria still requiring visual review

Human review is required for:

- `sp-05_translate_x.png`, `sp-05_translate_y.png`, `sp-05_translate_z.png`: handles aligned to world axes after the cube is rotated; motion follows the world axis.
- `sp-05_rotate_world_x.png`: rotation ring orientation and the result of a world-X rotation after a Y rotation.
- `sp-05_scale_unrotated.png`: local handles coincide with world axes on the unrotated cube.
- `sp-05_scale_rotated_45.png`: local scale handles follow the rotated cube axes.
- `sp-05_scale_rotated_90.png`: local handles remain consistent near 90°.
- `sp-05_mode_switch.png`: no visible transform change across mode switches.
- `sp-05_transform_integrity.png`: final visual state matches the recorded values.
- Absence of visual artefacts that numeric checks cannot detect.

The runner does not declare visual PASS, and this report does not either.

---

## 11. Blockers and status

- **SP-05 remains BLOCKED.** Execution is complete and all runner assertions pass, but the suite has not been formally reviewed or released.
- **A-03 and A-04 remain unverified** until the screenshots are visually reviewed and the evidence is accepted.
- **Evidence-completeness items** in §9 must be resolved or explicitly waived during review.
- **SP-06 remains NO-GO.** It has not been started.
- The main SimuForge application was not modified.
- Historical SP-01 through SP-04 evidence was not altered.

---

## 12. Reproducibility note

The runner is deterministic given the same harness and Chrome build. The full suite was executed once for official evidence; the three proof cases previously passed twice in commit `1dffd74`. A repeat full-suite execution is advisable before formal release if the reviewer wants pass-to-pass reproducibility for all six cases, but it was not required by this authorization and was not performed.
