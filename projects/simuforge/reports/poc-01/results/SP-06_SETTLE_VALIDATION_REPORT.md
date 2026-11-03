# SP-06 Settle Validation Report

Date: 2026-11-03
Scope: Empirical inertia settle measurement (read-only). No SP-06 full execution. No acceptance criteria changed.

Probe: `sp06-modifier-settle.js` (P4 follow-up) using trusted CDP input on `sp06-probe.html`.
Evidence: `projects/simuforge/reports/poc-01/results/sp-06-probe/evidence/sp-06_settle_validation.json`

## 1. Results

| Trial | Settled at (ms) | Total observed (ms) | Stable at 2000 ms? |
| --- | --- | --- | --- |
| 1 | 1182 | 1517 | Yes |
| 2 | 1163 | 1496 | Yes |
| 3 | 113 | 433 | Yes |

## 2. Findings

- **Settle duration:** 113–1182 ms across 3 trials (trial 3 was a short gesture, hence faster settle).
- **500 ms is insufficient.** Two of three trials required >1100 ms.
- **2000 ms is sufficient** with margin for all three trials.
- No NaN or non-finite values observed during settle.
- No console errors.

## 3. Recommendation

- Update settle delay candidate from 500 ms to **≥2000 ms**.
- Record settle duration per gesture in the input log (`settleDelayMs` field).
- Final settle delay remains **PROVISIONAL** until more data is collected across different gesture magnitudes and directions.
- Tolerances for angle/radius/position remain **PROVISIONAL** (no empirical basis yet).

## 4. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).
- No acceptance criterion changed.