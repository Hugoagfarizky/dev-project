# POC-01 Current Readiness Assessment

Date: 2026-11-04 (Revision 4)
Scope: Consolidated readiness after the SP-05 acceptance, the owner-approved Option A tolerances, the official SP-06 execution, the owner-decided sign amendment, and the passing official re-run.
Supersedes Revision 3 (2026-11-04, before the sign amendment).

## 1. SP-05 visual sign-off

- **Visual inspection:** performed 2026-11-04 on all 9 official screenshots plus 1 supplemental local-Z screenshot at native resolution.
- **Result:** 10/10 PASS. **A-03 PASS (visually verified); A-04 PASS (visually verified).**
- **Evidence:** `sp-05-manual/visual-review/SP-05_VISUAL_INSPECTION_REPORT.md`, `SP-05_VISUAL_INSPECTION_RESULTS.json`.
- **Integrity:** 10/10 SHA-256 hashes match the manifest and sidecars.
- **Formal acceptance:** **ACCEPTED by the Project Owner on 2026-11-04** (`SP-05_OWNER_ACCEPTANCE_RECORD.md` §8). No waiver was used.

## 2. SP-06 execution

- **Official runner (D12):** implemented in `harness/runner/sp06/official.js` and `config.js` (runner 1.1.0, config `sp06-official-config-2`).
- **First official execution:** `sp06-official-2026-11-04T09-07-32-263Z-96430a`, completed 2026-11-04T09:10:01.191Z. **FAIL — 158/159**; the only failed check was the written beta-sign expectation (S-03 6/7). Preserved unchanged.
- **Owner decision:** A-05-P2/S-03 amended to the Babylon convention — rightward increases `alpha`, **downward decreases `beta`** — with the quantitative inversion check retained.
- **Official re-run:** `sp06-official-2026-11-04T09-26-01-934Z-374471`, completed 2026-11-04T09:28:24.728Z. **PASS — 159/159.**
- **Scenarios:** all S-01..S-12 PASS, including S-10 (hard gate, 52/52).
- **Acceptance:** **A-05-P1..P6 PASS; A-06-P1..P5 PASS.**
- **Screenshots:** 10/10 approved screenshots captured; all SHA-256 values match the manifest.
- **Console:** 0 errors, 0 warnings, 0 exceptions across 12 scenarios.
- **Integrity:** VERIFIED (12 files, 0 mismatches; manifest SHA-256 `70a94a71bf1a7cc9a4028fbfbb99ea941fdb5ca87d1137171493ad1925eb2a93`).
- **Full report:** `SP-06_OFFICIAL_EXECUTION_REPORT.md`.

## 3. The resolved SP-06 sign conflict

The original procedure stated that **downward drag must increase `beta`**. Babylon.js 9.32.1 empirically **decreases `beta`** on downward drag, with `alpha`, `radius`, and `target` exactly unchanged.

- This was a sign-convention difference, not cross-axis coupling.
- The failure was recorded, not hidden. The Project Owner then authorised amending the written expectation to the engine convention (option 1); no waiver was used and the quantitative inversion guard remains.
- The superseded expectation is retained in the runner as the non-default `legacy` mode for reproduction only.
- The diagnostic run (`results/sp-06-diagnostic/sp06-babylon-sign-2026-11-04/`) is historical and is not used as official evidence.
- The amendment and the passing re-run are recorded in `SP-06_OFFICIAL_EXECUTION_REPORT.md` §11–§13.

## 4. Tolerances (owner-approved)

| Quantity | Value | Status | Use |
| --- | --- | --- | --- |
| Invariance / equality | `1e-9` | **APPROVED (Option A)** | Only for parameters that must not change |
| Orbit minimum | `0.05 rad` | **APPROVED (retained)** | Gesture-magnitude floor |
| Pan minimum | `0.05 world units` | **APPROVED (retained)** | Gesture-magnitude floor |
| Zoom minimum | `0.1 radius units` | **APPROVED (retained)** | Gesture-magnitude floor |
| Settle delay | `2000 ms` | **APPROVED (retained)** | Mandatory before every recorded post-gesture state |

The invariance bound and the gesture floors remain semantically separate. Full basis: `SP-06_TOLERANCE_BASIS_AND_DECISION.md`.

## 5. POC-01 exit gates

| Gate | Status |
| --- | --- |
| SP-05 accepted (visual + automated evidence) | **MET** — accepted 2026-11-04 |
| SP-06 camera navigation | **MET** — official re-run PASS 159/159 after the owner-decided sign amendment |
| SP-07 quaternion / transform conversion | **NOT EXECUTED** |
| SP-08 final spike decision | **NOT EXECUTED** |
| No unresolved console/render defect | MET for executed scopes (0 errors) |
| POC-01 closure | **NOT COMPLETE** |

## 6. Status

- SP-05: **ACCEPTED**.
- A-03: **PASS (visually verified)**.
- A-04: **PASS (visually verified)**.
- SP-06: **PASSED** — 159/159 official re-run under the owner-amended A-05-P2 sign convention; A-05 and A-06 complete.
- A-05: **PASS (all sub-criteria)**.
- A-06: **PASS (all sub-criteria; camera non-capture scope)**.
- SP-07: **not executed**.
- SP-08: **not executed**.
- POC-01: **not closed.** Remaining blockers: the unexecuted SP-07 and SP-08.
- Main application: not modified.

## 7. History

- Revision 2 (2026-11-04): SP-05 visual verification complete; SP-06 NO-GO pending tolerance and authorization decisions; official runner D12 not implemented.
- Revision 3 (2026-11-04): owner acceptance and Option A recorded; D12 runner implemented; official S-01..S-12 executed once; one sign-convention criterion conflict identified. POC-01 remains open.
- Revision 4 (2026-11-04): owner amended A-05-P2/S-03 to the Babylon beta convention (quantitative inversion check retained); official re-run PASS 159/159; A-05 and A-06 fully PASS. POC-01 remains open only on SP-07/SP-08.
