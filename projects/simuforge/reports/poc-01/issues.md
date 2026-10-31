# POC-01 Issues

| ID | Severity | Description | Reproduction | Expected | Actual | Workaround | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POC01-001 | Low | Spike used Babylon.js 9.33.0 from CDN, while the POC targets @babylonjs/core 9.32.1. | Load `https://cdn.babylonjs.com/babylon.js` in the spike page. | POC target version 9.32.1. | Reported `BABYLON.Engine.Version` = 9.33.0. | None for SP-01; install pinned 9.32.1 before implementation. | Open |
| POC01-002 | Info | Chrome selected the integrated Intel Iris Xe GPU instead of the discrete RTX 3050 during the headless run. | Run Chrome headless on the test machine. | Either GPU acceptable for init; record which GPU is used. | Unmasked renderer reports Intel Iris Xe. | Record GPU selection method before performance runs. | Open |

No blocking defect for SP-01. SP-01 marked PASS with evidence.