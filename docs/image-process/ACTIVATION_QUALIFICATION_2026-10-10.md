# Premium Image Process — I1–I5 Activation and Qualification

**Edition fixture:** October 10, 2026 · **Repository:** gttome/Daily-AI-Brief-Compiler  
**Decision:** **FEATURES ACTIVE — END-TO-END PRODUCTION GO WITHHELD**

## 1. Executive closeout

All I1–I5 improvements are selected in protected `main` through independent, exact-head-CI PRs. I4 has independently reversible status-sync and verification-only selectors. The normal editorial publisher is unaffected; no schedules, accepted images, frozen jobs, protected October 8 objects or Pages-history bytes changed.

Historical Oct10 qualification used the actual published six-image edition. Its actual browser proof produced 24/24 loaded image-region captures, six matching live PNG SHA-256 checks, 12 correct dated/permanent article-image pairs, and 17/17 Oct8 protected object hashes. No new premium images were generated.

**Production GO is not proven:** native 390-pixel mobile image text is too small, the public metadata mirror is still `STATUS_SYNC_PENDING`, the connected GitHub toolset lacks workflow dispatch, and future create/export/upload/binary-readback through one executing chat has not been proven. An automated screenshot count is not a semantic pixel-review PASS.

## 2. Separate protected activation PRs

| Feature | Protected activation | Active selection | Qualification |
|---|---|---|---|
| I1 Standing owner starter authorization | [#140](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/140) | `bounded_starter_v7` | Selected; no extra bespoke GO |
| I2 Create-six-images Rev7 prompt + handoff | [#141](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/141) | `rev7` | Compatible with I1 |
| I3 Twenty-four exact target captures | [#142](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/142) | `element24_v1` | Capture PASS; mobile visual QA FAIL |
| I4 verification-only | [#143](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/143) | `true` | Enabled; published six-image verification proved read-only |
| I4 public-status sync | [#144](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/144) | `public_sync_v2` | Enabled; actual public redeployment not performed |
| I5 Source-faithful pre-generation quality | [#145](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/145) | `enriched_v1` | Enabled; no new image generated |

Focused safeguards: [#139](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/139) fixed capture of offscreen images on smooth-scrolling long pages. [#146](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/146) requires a second 17-object Oct8 network-hash audit **after** a future authorized Pages metadata-only deployment.

Selected flags: [`contracts/image-process-versions.json`](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/contracts/image-process-versions.json). Authoritative audit metadata: [version manifest](active_version_manifest.json) and [proposal change ledger](proposal_change_ledger.json).

## 3. Nonpublishing historical proof

| Gate | Observed evidence | Status |
|---|---|---|
| Six accepted Oct10 PNG exact bytes | 6/6 live SHA-256 match | PASS |
| Dated/permanent story/image URL/alt pairs | 12/12 | PASS |
| Protected Oct8 assets/media/pages | 17/17 SHA-256 | PASS |
| Image element captures, 1440×1000 and 390×844 | 24/24 (six × two contexts × two viewports) | CAPTURE PASS |
| Correct native image dimensions | 1200 × 630 in both viewports | PASS |
| Actual mobile text legibility | 12/12 displayed at ~354×186 CSS px; fine labels become too small | VISUAL FAIL |
| Independent full semantic image review | No verified complete 24/24 review receipt | UNPROVEN |
| GitHub Oct10 release receipt | `RELEASED_VERIFIED` | Historical PASS |
| Public release index / release receipt mirror | `STATUS_SYNC_PENDING` | NOT CLOSED |
| Five standalone postproduction proposal inverses | Five independent, nonpublishing fixture drills | PASS |

[Actual 24-image capture and integrity Action run](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38079454643) contains the saved target-image screenshots, image-context headings, image URLs and alt, PNG hashes, element geometry, exact 17-object network audit and public-status evidence. Mobile crops were visually inspected in both dated and permanent contexts; fine image labels do not satisfy 390-pixel legibility. Preserve all six accepted PNGs. The stricter new QA is not retroactive authorization to overwrite them.

[Five independent rollback drills](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38075054951) validate proposal-specific inverses, one at a time, without touching any other selector, accepted image, Pages history or 17 protected Oct8 objects. Future live rollback still needs separate authority; I1/I2 incompatibility HOLDS future optional image release without affecting daily editorial publication.

## 4. Remaining safe operations — no development redo

**A. Run the existing metadata-only public-status sync through an authorized workflow dispatch.** Existing workflow: [external-image-postrelease-verify](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/workflows/external-image-postrelease-verify.yml). Inputs for the already illustrated Oct10 edition:

`edition_date = 2026-10-10`  
`expected_history_head = 0730acb060f9bb31ea664f33e609e7c98fb914ca`  
`mode = sync_metadata`

Immediately re-read the history head before dispatch; abort if it changes. This workflow deploys *the existing current Pages tree* with its verified index/receipt and preserves PNG/HTML, not old placeholders. Require a real public status match plus unchanged six PNGs, 12 image/article pairs and 17 Oct8 objects. **These connected ChatGPT GitHub tools do not expose workflow dispatch.** This one-time operational trigger is not another custom owner artwork GO, and no browser login/token bypass or new schedule is authorized.

**B. Resolve the new native-mobile readable-label gate.** The already accepted Oct10 1200×630 images display at approximately 354×186 CSS pixels on 390px mobile. Fine labels cannot be certified readable. Improve a future mobile enlargement/zoom experience or prepare a separately source-reviewed, versioned correction *only with appropriate authority*. Never regenerate historical accepted images to test infrastructure.

**C. Preflight a real future image-production operator.** Before any future generation, `scripts/preflight-image-app-route.mjs` must prove actual create/export/saved-pixel inspection, exact GitHub binary upload and remote-commit readback, protected PR/CI/merge, authorized dispatch and both image-region viewport routes. Missing dispatch or binary-readback capability means `BLOCKED_INCOMPLETE` before generation; no fabricated evidence.

**D. Routine use only after full GO:** open a standard GitHub-connected chat, paste the entire [Revision 7 Production Starter](../external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV7.md). It reads the matching [full prompt](../external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md) and [handoff](../../EXTERNAL_APP_HANDOFF_REV7.md) already in GitHub. No second pasted document or redundant manual release GO.

## 5. Preservation and final result

Current protected-main SHA at the start of this closeout: `5678bb3d789dafad6114c00ebd5a97aaa50d093b`. Pages-history head stayed `0730acb060f9bb31ea664f33e609e7c98fb914ca`. Original six-image Oct10 job SHA-256: `15301d33191ad1e04eb8bba0ce9f40a5ac53809bdcc363f1647bce5f97b2749e`. The current history index lists Oct9 and Oct10 `RELEASED_VERIFIED`, Oct11 `PUBLISHED_PENDING`. Oct11 was not generated, modified or released in this assignment.

**Final state: `FEATURES_ACTIVE_PRODUCTION_QUALIFICATION_BLOCKED`.** No premium-image generation, protected-history rewrite or schedule change. Do not issue `PUBLISHED_COMPLETE` or `PRODUCTION READY — GO` until A–C have independent PASS evidence.
