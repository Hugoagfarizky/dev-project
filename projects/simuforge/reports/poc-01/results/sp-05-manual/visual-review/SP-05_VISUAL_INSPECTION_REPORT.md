# SP-05 Visual Inspection Report

Revision: 2 (actual visual inspection)
Supersedes: Revision 1 (2026-11-03, recorded `NOT REVIEWED` because that session's model had no image input)
Date: 2026-11-04
Reviewer: DeepSeek V4.1 Flash Free (OpenCode), provider `opencode`
Commit inspected: `12a2d00ba9d8c43475689d8e36881706aeee48d7`
Evidence state: read-only; no screenshot edited, replaced, or deleted.

## 1. Reviewer model/tool and visual capability

- Model: **DeepSeek V4.1 Flash Free** (`opencode/deepseek-v4.1-flash-free`).
- Image input: **CONFIRMED BY ACTUAL TEST, not by documentation.** The `read` tool returned the rendered PNG for `sp-05_translate_x.png`, and the reviewer described its contents (dark viewport, orange rotated cube, green/red/blue gizmo, Inspector values) before consulting any sidecar file.
- All nine official screenshots and the supplemental screenshot were opened at native resolution (1733 × 985) and inspected. Three-times nearest-neighbour crops of the viewport region were generated in a temporary directory (`%TEMP%\opencode\sp05crops`) purely to inspect gizmo axis directions at higher magnification. Those crops are analysis aids, not evidence, and are not stored in the repository.
- No OCR was run. Text values quoted below were read directly from the rendered Inspector panel in the screenshots. No filename, sidecar JSON, dimension, or metadata was used to infer a verdict.

## 2. Repository commit

- Branch: `main`
- HEAD: `12a2d00ba9d8c43475689d8e36881706aeee48d7`
- Remote `origin/main`: `12a2d00ba9d8c43475689d8e36881706aeee48d7`
- Working tree before review: only two untracked superseded review drafts (no source changes).

## 3. Screenshot inventory

Evidence directory: `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`

| # | File | Bytes | Dimensions | Test | Criterion | SHA-256 |
| --- | --- | ---: | --- | --- | --- | --- |
| 1 | `sp-05_translate_x.png` | 89,522 | 1733 × 985 | T-01 | A-03 | `b8cca8eedd7a38df5d079d2ce610ecd2688397aa5a99c924f48bb378ef6cd54c` |
| 2 | `sp-05_translate_y.png` | 89,151 | 1733 × 985 | T-01 | A-03 | `bd74c1272ffdf7f56b932b12a77ed1bb316510a6418e57901be8f9fa78759eba` |
| 3 | `sp-05_translate_z.png` | 88,830 | 1733 × 985 | T-01 | A-03 | `6c46052a6f591104a0de05aae4107fd60d1692e346863d4ae43a42bf916b293d` |
| 4 | `sp-05_rotate_world_x.png` | 107,615 | 1733 × 985 | T-02 | A-03 | `ef5b636f27899ed389c1f597af1260d4efc154dedaff1acb3fd3cdf8db712dcb` |
| 5 | `sp-05_scale_unrotated.png` | 90,960 | 1733 × 985 | T-03 | A-04 | `0204b96273fc38e02f8088755368a35fd723de945b8c4b074f0952fbfcc1b853` |
| 6 | `sp-05_scale_rotated_45.png` | 86,291 | 1733 × 985 | T-04 | A-04 | `8c6508e7be682b1bc9b4ac9f63e399ec7717c230441188cf98f7382394b9f134` |
| 7 | `sp-05_scale_rotated_90.png` | 92,310 | 1733 × 985 | T-04 | A-04 | `9acf4d05b3d1162062409ab4578dc3ae4008c29deb45e1dd2e8c715f17fcaf3b` |
| 8 | `sp-05_mode_switch.png` | 90,734 | 1733 × 985 | T-05 | Mode-switch stability | `02a08b060d12f276f4696944748ecd910fe34c16a634440ba820873d0d5d0008` |
| 9 | `sp-05_transform_integrity.png` | 87,697 | 1733 × 985 | T-06 | Transform integrity | `3a33572c99dcd8ca9a0707249e4f4fd8e42a4e0d6d7e9742d8f5378bb9e813af` |

Supplemental (T-04 local Z, separate targeted run; clearly labelled, not part of the official nine):

| File | Bytes | Dimensions | Test | Criterion | SHA-256 |
| --- | ---: | --- | --- | --- | --- |
| `sp-05_scale_rotated_local_z.png` | 86,681 | 1733 × 985 | T-04-Z | A-04 | `00077f6774d59619602521cc5eaf146e65e18b12d65dabd08ed76386987f8b56` |

## 4. Method of inspection

1. Opened each PNG with the `read` tool (native 1733 × 985).
2. Recorded what is visible: viewport contents, cube orientation/silhouette, gizmo origin and axis directions, Inspector rows, status line.
3. For axis-direction questions, generated 3× nearest-neighbour crops of the viewport around the gizmo and compared:
   - world baseline: T-05 (translate, unrotated) and T-03 (scale, unrotated, where local = world);
   - rotated cases: T-01/T-02 (rotate/translate with a ~40.88° Y rotation) and T-04/T-04-Z (~40.88° and ~87.42° Y).
4. Judged world-vs-local orientation by whether the gizmo axes inherit the cube's rotation, not by whether the picture "looks reasonable".
5. Checked the object silhouette for clipping, missing faces, z-fighting, shear, inversion, or collapse.
6. Cross-checked each file's SHA-256 against the manifest before assigning a verdict, so each verdict is bound to a specific byte sequence.

No automated PASS was treated as a visual PASS. No acceptance criterion was modified.

## 5. Acceptance criteria used

- **A-03** — Position and rotation gizmos can be set to world orientation without artifacts in right-handed mode.
- **A-04** — The local-oriented scale gizmo behaves correctly on rotated entities under the approved policy, including non-uniform scale.
- T-05 stability and T-06 transform integrity are supporting checks, not substitutes for A-03/A-04.

## 6. Verdict per screenshot

| # | File | Test | Verdict |
| --- | --- | --- | --- |
| 1 | `sp-05_translate_x.png` | T-01 | **PASS** |
| 2 | `sp-05_translate_y.png` | T-01 | **PASS** |
| 3 | `sp-05_translate_z.png` | T-01 | **PASS** |
| 4 | `sp-05_rotate_world_x.png` | T-02 | **PASS** |
| 5 | `sp-05_scale_unrotated.png` | T-03 | **PASS** |
| 6 | `sp-05_scale_rotated_45.png` | T-04 | **PASS** |
| 7 | `sp-05_scale_rotated_90.png` | T-04 | **PASS** |
| 8 | `sp-05_mode_switch.png` | T-05 | **PASS** |
| 9 | `sp-05_transform_integrity.png` | T-06 | **PASS** |
| S | `sp-05_scale_rotated_local_z.png` | T-04-Z | **PASS** |

## 7. Visual explanation for each verdict

Visual observation and technical inference are kept separate below. "Observed" means directly visible in the PNG. "Inference" means the acceptance-criterion judgement drawn from that observation.

### 7.1 `sp-05_translate_x.png` — T-01 — PASS

- **Observed:** Mode `translate`. Inspector shows Position X `0.902087`, Y `0.500000`, Z `0.000000`; Quat Y `0.349237`, Quat W `0.937034`; Scale `1/1/1`. The cube is visibly rotated about Y (top face and two side faces visible). The gizmo sits at the cube centre with green pointing up, red pointing lower-right, blue pointing lower-left.
- **Comparison:** The unrotated translate baseline (`sp-05_mode_switch.png`) shows the same green-up / red-lower-right / blue-lower-left orientation. The gizmo therefore did **not** inherit the cube's ~40.88° Y rotation.
- **Inference:** The position gizmo is world-oriented while the object is rotated. The cube is displaced along +X (position X = 0.902087). No clipping, z-fighting, or missing faces. A-03 translation evidence PASS.

### 7.2 `sp-05_translate_y.png` — T-01 — PASS

- **Observed:** Position X unchanged at `0.902087`; Position Y `1.317648`; Z `0.000000`. The cube is visibly higher in the viewport than in the X frame, same orientation, same world-aligned gizmo axes.
- **Inference:** Motion is confined to +Y with the gizmo still world-oriented. No artifact. PASS.

### 7.3 `sp-05_translate_z.png` — T-01 — PASS

- **Observed:** Position X `0.902087`, Y `1.317648`, Z `0.858875`. The cube is displaced and slightly re-projected (perspective) consistent with world +Z; rotation and scale rows unchanged; gizmo axes remain green-up / red-lower-right / blue-lower-left.
- **Inference:** Motion is confined to +Z with world-oriented axes. No artifact. PASS.

### 7.4 `sp-05_rotate_world_x.png` — T-02 — PASS

- **Observed:** Mode `rotate`. Position `(0, 0.5, 0)`; Quat `(0.350417, 0.323898, 0.130602, 0.869045)`; Euler X `0.552073`, Y `0.876794`, Z `0.562393`; quaternion validation VALID. Three rotation rings surround the cube: the **green ring is a horizontally elongated ellipse** (world-horizontal plane), while the red and blue rings are tilted ellipses. The cube shows a compound rotation (top face tilted, two side faces at different angles).
- **Inference:** The ring set is world-oriented: the Y ring lies in the world horizontal plane, and no ring inherits the cube's compound object rotation. The compound object orientation is consistent with the recorded world-X drag applied on top of the ~40.88° Y setup. No ring distortion, gap, or clipping. A-03 rotation evidence PASS.
- **Limit:** A still image cannot show the drag path itself. The verdict rests on ring orientation plus the post-state Inspector, which is what the criterion asks for.

### 7.5 `sp-05_scale_unrotated.png` — T-03 — PASS

- **Observed:** Mode `scale`; identity rotation (Euler all 0); Scale X `1.214723`, Y `1.000000`, Z `1.000000`. The gizmo axes coincide with the world axes (red lower-right, blue lower-left, green up), and the cube silhouette is slightly elongated along the red axis.
- **Inference:** On an unrotated object, local and world coincide, so this is the correct baseline for T-04. Non-uniform X scale applied without artifact. PASS.

### 7.6 `sp-05_scale_rotated_45.png` — T-04 — PASS

- **Observed:** Rotation ~40.88° about Y (Quat Y `0.349237`, W `0.937034`); Scale X `1.203411`, Y `1.000000`, Z `1.000000`. The scale gizmo is visibly **rotated with the cube**: red now points almost horizontally right, blue points almost straight down, green stays up. This differs clearly from the T-03 world baseline (red lower-right, blue lower-left).
- **Inference:** The scale gizmo follows the object's local axes, not the world axes. The cube is stretched along local X without distortion of the other axes. This is direct visual evidence for A-04 on a rotated entity.
- **Consistency check:** A +40.88° Y rotation maps local +X toward the camera-right and local +Z toward screen-down, exactly the observed red/blue directions.

### 7.7 `sp-05_scale_rotated_90.png` — T-04 — PASS

- **Observed:** Rotation ~87.42° about Y (Quat Y `0.691189`, W `0.722674`; Euler Y `1.526265`); Scale X `1.203411`, Y `1.134295`, Z `1.000000`. Red points upper-right, blue points lower-right, green up; the cube shows a coherent silhouette with the top face visible.
- **Inference:** Near 90° the local axes have swapped screen roles relative to the 0° baseline: local X now projects like world −Z (upper-right) and local Z like world +X (lower-right). The observed handles match that prediction, so the local-oriented behaviour is consistent across a large rotation, not just at 45°. No world-space scaling artefact, shear, or collapse. PASS.
- **Note:** The angle is ~87.42°, not exactly 90°. The procedure says "approximately 90° if practical"; the deviation is recorded here and does not affect the local-axis conclusion.

### 7.8 `sp-05_mode_switch.png` — T-05 — PASS

- **Observed:** Status line reads `T-05 comparison: STABLE`. Mode `translate`; identity transform (Position `(0, 0.5, 0)`, identity quaternion, Scale `1/1/1`); quaternion and scale validation both VALID. The cube is a clean, unrotated, unscaled box.
- **Inference:** Switching modes left the object state unchanged, with the harness's own comparison confirming stability. No visual anomaly. PASS (supporting check).

### 7.9 `sp-05_transform_integrity.png` — T-06 — PASS

- **Observed:** Status `State captured.`; Mode `scale`; Position X `0.713283`, Y `0.500000`, Z `0.000000`; rotation ~40.88° Y; Scale X `1.154594`, Y `1.000000`, Z `1.000000`; quaternion VALID and scale VALID. The cube is a single coherent rotated box with straight edges and parallel opposite faces in 3D; the silhouette shows no shear, inversion, collapse, gap, or clipping.
- **Inference:** The final transform is a valid non-uniformly scaled, rotated rigid body. PASS (supporting check).

### 7.10 `sp-05_scale_rotated_local_z.png` — T-04-Z — PASS

- **Observed:** Rotation ~40.88° Y; Scale X `1.000000`, Y `1.000000`, Z `1.304800`. The gizmo is in the local orientation (red horizontal-right, blue straight-down, green up). The cube is visibly elongated along the screen-vertical direction, which is the projection of local +Z at this rotation, while its horizontal extent is essentially unchanged.
- **Inference:** Local Z scaling is applied on the rotated entity, confined to the local Z axis. No artifact. PASS (supplemental A-04 evidence).

## 8. Analysis of A-03

**Verdict: PASS — visually verified.**

- World translation: T-01 shows the position gizmo with the same axis orientation on a ~40.88°-rotated cube as on the unrotated baseline (T-05). A local gizmo would have rotated with the cube. The cube moves along +X, +Y, +Z with the other Inspector axes unchanged.
- World rotation: T-02 shows a world-aligned ring set — in particular the green (Y) ring is a horizontal-plane ellipse — while the cube carries a compound rotation. A local ring set would have been tilted with the object.
- No visual artifacts (clipping, z-fighting, missing/duplicated geometry, ring distortion) were observed.
- **Limits:** Static frames show end states, not the drag trajectory; the exact numeric delta is read from the on-screen Inspector, not measured from pixels.

## 9. Analysis of A-04

**Verdict: PASS — visually verified.**

- T-03 establishes the world baseline on an unrotated entity.
- T-04 at ~40.88° shows the scale handles rotating with the cube (red horizontal, blue down), i.e. local orientation, with a non-uniform local-X scale.
- T-04 at ~87.42° shows the expected local-axis swap (red upper-right, blue lower-right), so the behaviour is consistent across a large rotation.
- T-04-Z shows the supplemental local-Z case with the cube stretched along the projected local Z and X/Y unchanged.
- No unintended world-space scaling, shear, inversion, or collapse was observed.
- **Limits:** The exact stretch amount is read from the Inspector rather than measured from the silhouette; the ~87.42° target is approximate as documented in the manifest.

## 10. Evidence integrity and SHA-256

- Re-hashed all nine official PNGs plus the supplemental PNG immediately before writing this report. **10/10 match the manifest values and the sidecar `artifacts[]` records; 0 mismatches.**
- No screenshot was edited, replaced, resampled, or deleted. The temporary zoom crops are outside the repository and are not evidence.
- The five pre-existing POC-04 files in the evidence directory were not touched.
- Harness SHA-256 remains `0a05cda7c8407c747466fff21137820e551945de7b5e74c89a3d695807a1d222`.
- Review of the evidence was read-only.

## 11. Limitations

- One reviewer/session (DeepSeek V4.1 Flash Free) performed the inspection. This is a model review, not a second human reviewer.
- Static screenshots cannot demonstrate the drag path, pointer trajectory, or input provenance; those remain supported by the sidecar audit and runner logs.
- Numeric values are read from the rendered Inspector, not measured from image pixels; no sub-pixel measurement was attempted.
- Verdict scope is limited to A-03, A-04 and the two supporting checks. Other acceptance criteria were not re-evaluated.
- The 87.42° case is approximate by design; no exact-90° claim is made.

## 12. Final visual review recommendation

- **A-03: PASS (visually verified).**
- **A-04: PASS (visually verified).**
- All nine official screenshots plus the supplemental local-Z screenshot: **PASS**.
- SP-05 visual verification is **complete**. This report supports submitting SP-05 for **formal Project Owner acceptance**. It does **not** by itself change SP-05's formal status, and it does not grant any SP-06 authorization.
- Recommended next step: Project Owner signs the acceptance record; then the remaining SP-06 decisions (tolerance approval, execution authorization) can be taken.

## 13. Revision history

| Revision | Date | Content |
| --- | --- | --- |
| 1 | 2026-11-03 | Recorded `NOT REVIEWED`: the session model had no image input. No verdict assigned. |
| 2 | 2026-11-04 | Actual visual inspection by an image-capable model: 10/10 PASS, A-03 and A-04 visually verified. Revision 1 is superseded but retained in git history. |
