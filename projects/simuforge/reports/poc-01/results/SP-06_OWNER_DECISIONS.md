# SP-06 Owner Decisions

Date: 2026-11-03
Status: Decisions recorded per Project Owner authorization. All decisions governing execution remain PROVISIONAL until the corresponding empirical probes are completed and reviewed. No SP-06 acceptance criterion is changed by this document.

## 1. Recorded decisions

| No. | Decision | Status | Notes |
| --- | --- | --- | --- |
| 1 | Modifier assignment (Ctrl/Alt) | **PROVISIONAL** — pending P1 and browser conflict check | Recommendation: ctrl+left = orbit, alt+left = pan. P1 modifier tests produced mixed results (ctrl drag changed radius+target; alt drag changed target slightly) requiring further investigation. Final modifier assignment deferred. |
| 2 | Remove plain-left-drag rotate default | **APPROVED** | P2 confirmed removal works (8→7 entries), plain drag no longer orbits, resetInputMap restores (7→8), plain drag orbits again. |
| 3 | Numeric tolerances | **PROVISIONAL** — pending probe results | 0.05 rad / 0.1 radius / 1e-6 invariants / 500 ms settle. P4 showed settle took 1434 ms, so 500 ms is insufficient; recommend ≥2000 ms. |
| 4 | 10 screenshot baseline | **APPROVED** | Filenames as proposed in the draft. |
| 5 | JSON input log versioned | **APPROVED** | Schema as proposed, with `settleDelayMs` addition. |
| 6 | CDP trusted input + visual review; reuse SP-05 runner utilities | **APPROVED** | P1–P5 all used trusted CDP input successfully. |
| 7 | Dedicated SP-06 harness; reuse relevant runner components | **APPROVED** | Probe reused SP-05 runner libraries with a separate probe harness (`sp06-probe.html`). |
| 8 | A-06 limited to camera non-capture for POC | **APPROVED** | A-06-P5 applies: SP-06 verifies camera does not capture left click; full selection verification deferred to a later spike. This does not claim selection UI works. |
| 9 | S-10a/S-10b as mandatory hard-gate evidence | **APPROVED** | P5 recorded S-10a == S-10b (camera unchanged) and gizmo drag succeeded. |

## 2. Scope of approval

- Approval of decisions 2, 4, 5, 6, 7, 8, 9 authorizes the **design** and future **probe-level** validation only.
- It does **not** authorize full SP-06 execution.
- SP-06 remains **NO-GO**.
- SP-05 remains **BLOCKED**; A-03/A-04 remain **unverified**.
- Decisions 1 and 3 remain PROVISIONAL pending empirical results.

## 3. A-06 scope clarification (decision 8)

A-06-P5 is approved as a **POC scope limitation**, not as a claim that selection UI works. SP-06 verifies that the camera does not intercept left click (camera state unchanged). Full selection behavior (hit-testing, selection state, selection UI) is out of SP-06 scope per §8.1 and is deferred to a later spike. No acceptance criterion is changed; the official wording "left click is free for selection" is interpreted as "camera does not capture left click" for POC purposes.

## 4. Modifier assignment status (decision 1)

P1 modifier tests produced mixed results:
- Ctrl+left-drag (modifiers=2) on the default map changed radius (−2.26) and target (+0.556), not a pure pan. This is unexpected for the default map (ctrl+left should pan) and may indicate the modifier was not applied, or inertia/residual motion.
- Alt+left-drag (modifiers=1) changed target slightly (+0.046) and radius minimally (−0.001).

These results are **inconclusive** for modifier assignment. Decision 1 remains PROVISIONAL. Further investigation (Probe P1 extension) is required before finalizing the modifier map.

## 5. Tolerance status (decision 3)

- P4 measured inertia settle at **1434 ms**, exceeding the proposed 500 ms. Recommend increasing settle delay to **≥2000 ms**.
- 0.05 rad / 0.1 radius / 1e-6 invariants remain provisional; no empirical basis established.
- All tolerances remain provisional until probe data and owner review.

## 6. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; probes are not full execution).
- No acceptance criterion changed.
- No harness, runner, or application source modified by this decision record.