# Premium Image Process I1–I5 — Protected Development and Rollback

**Repository:** gttome/Daily-AI-Brief-Compiler  
**Baseline:** October 10, 2026 six-image edition; 17 October 8 protected objects  
**Status:** **I1–I5 selected and active in protected main, but full new-image production release qualification is BLOCKED_INCOMPLETE.** See [Oct10 activation and qualification](ACTIVATION_QUALIFICATION_2026-10-10.md).

## Independently protected code and active selectors

| Feature | Implementation | Activation PR | Selected mode |
|---|---|---|---|
| I1 | #130 | [#140](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/140) | `bounded_starter_v7` |
| I2 | #131 | [#141](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/141) | `rev7` |
| I3 | #132 / correction #134 | [#142](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/142) | `element24_v1` |
| I4 verify-only | #133 / correction #135 | [#143](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/143) | `true` |
| I4 status sync | #133 / correction #135 | [#144](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/144) | `public_sync_v2` |
| I5 | #136 | [#145](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/145) | `enriched_v1` |

All activation PRs were individually protected, exact-head CI passed, and all merge SHAs are in the [filled change ledger](proposal_change_ledger.json). I1/I2 have compatible selected Rev7 versions and remain independently reversible. I4 status and verify-only are independent. The [active-version manifest](active_version_manifest.json) mirrors `contracts/image-process-versions.json`.

## Production and rollback boundary

The independent initial editorial publisher stays on the shared placeholder until later optional image work. Nothing in this implementation changes its tasks, schedule, source articles, media, accepted images or protected history.

Single-proposal reversal after premium images have already been published:

~~~mermaid
flowchart TD
 A[Published six accepted PNGs] --> B[Read-only hash and article pairing snapshot]
 B --> C{Reverse exactly one I proposal}
 C --> D[Protected selector inverse PR and CI]
 D --> E[Same six PNG hashes, HTML, Oct 8 pins]
 D --> F{I1/I2 versions compatible?}
 F -->|No| G[Hold future optional image release]
 F -->|Yes| H[Future optional release may proceed]
~~~

The selected I-proposal is reversed without altering any other selector. I1 or I2 alone can become incompatible: return **RELEASE_ADMISSION_HOLD** on subsequent premium-image jobs, not a retroactive owner-GO requirement and not an excuse to undo the other four improvements. I3 rollback means incomplete mobile/desktop pixel reviews remain **UNPROVEN**. I4 has *two independent switches*; reversing status sync does not disable verification-only unless that sub-switch is separately selected. I5 rollback removes only new heuristics, never mandatory explanatory text, source faithfulness, saved-pixel inspection, no-people standard, or correction-until-PASS.

## Five independent historical postproduction drills

A dedicated path-scoped [workflow](../../.github/workflows/image-postproduction-rollback-drills.yml) reads exact Pages history into a detached worktree, uses the immutable October 10 job, release receipt, six real accepted binary PNGs and manifest, and audits the 17 October 8 objects over live HTTP. It checks all six live image digests and twelve article contexts *before and after* each in-memory selector reversal. The five cases are **RB-I1**, **RB-I2**, **RB-I3**, **RB-I4** (two separate sub-switch inverses), and **RB-I5**. The proof never invokes the original-placeholder replacement function, publishes HTML, generates an image or mutates history.

Verified [nonpublishing five-drill Actions PASS](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38075054951) produced: `postproduction_rollback_drills.json` and `postproduction_rollback_receipt_dryrun.json`, retained in the Actions artifact named `independent-image-postproduction-rollback-receipts`. A green normal unit test by itself does not establish the live fixture drill result.

### Authentic historical proof versus fixture contracts

The original job/package/release remain v1 and byte-identical. Future Rev7 assignment and v2 release readers are exercised using **clearly labeled synthetic schema fixtures**, never called actual owner approval or completed publication. The original producer receipt with `scheduled_execution:false` must stay false. Accepted PNGs are never regenerated for transport/CI/status errors.

### Reversing one feature later

An actual production rollback requires separate owner direction. After verifying current main/head, Pages-history SHA, six accepted images/paired article URLs and 17 protected October 8 objects, apply only the selected inverse from the ledger through one protected PR. Run exact-head CI, merge normally, then reverify all historical hashes and reader pairings. Do not restore placeholders, republish old HTML, regenerate accepted PNGs, modify a different feature or reopen a terminal edition. Status/visual-review evidence must remain truthful.

## Remaining release capability / quality gates

- Selected Rev7 starter, full prompt, handoff, validator and workflow: **ACTIVE, version-compatible**; normal first-edition placeholder publisher unchanged.
- Actual Oct10 image-region captures: **24/24 completed**, with six live PNG hashes, twelve article pairings and all seventeen October 8 objects verified. [Actual capture proof](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38079454643).
- At 390px, twelve mobile image contexts show explanatory text too small; semantic 24/24 review remains **BLOCKED_INCOMPLETE**, not fabricated PASS.
- Public image release-index mirror still `STATUS_SYNC_PENDING` pending an authorized existing metadata-only workflow dispatch and independent public readback. I4 is selected but **was not run live** in this activation conversation.
- Actual six-image creation/export/upload/remote binary-readback/dispatch full route has **not** been qualified under the executing external app in this conversation. The connected Github toolset has no direct `workflow_dispatch` method. Preflight must fail closed before producing any new images.
- Rollback drills remain PASSED on historical already illustrated assets; a later live rollback requires independent authority. No accepted art regeneration, production Work/Codex/paid API, added schedules, initial editorial publisher delay or forced history update.

Full disposition, owner-safe next operations and exact workflow inputs: [Activation Qualification Report](ACTIVATION_QUALIFICATION_2026-10-10.md).

## October 10 status-mirror repair — subsequently verified

The subsequent one-time protected Pages metadata-only repair passed: [live GitHub Actions proof](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38081183267). Public `image-jobs/index.json` and `2026-10-10/release.json` now match the historical `RELEASED_VERIFIED` records (`PUBLIC_STATUS_VERIFIED`), with all six accepted live PNG hashes and twelve article pairings unchanged and all seventeen October 8 protected objects independently identical before and after deployment. The [durable closeout receipt](PUBLIC_STATUS_CLOSEOUT_2026-10-10.json) records evidence. The one-time trigger and marker were retired in a separate protected PR; neither normal schedules nor existing image-only release workflow were changed. The original activation report is preserved as an as-of-time assessment, when `STATUS_SYNC_PENDING` was accurate. **Mobile image-label readability and the new-job binary-generation/export/upload/readback + dispatch capability still require independent proof; no image production GO is inferred from this successful metadata repair.**


## October 10 full-resolution mobile figure reader — subsequent live success

After the original qualification report, the **existing October 10** accepted PNGs gained a source-preserving mobile enlargement route: inline figures remain intact, and **Enlarge diagram to read labels** opens the original 1200 × 630 PNG at native width in a keyboard-focusable, horizontally pannable reader with Close and open-original fallback. [Protected reader implementation PR #151](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/151) passed twelve nonpublishing mobile interactive checks. [Live rollout PR #153](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/153) and [actual successful Pages run](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38087354318) established **twelve of twelve real mobile open/pan/close interactions, nine of nine new/changed reader objects with exact HTTP SHA readback, six original accepted PNG hashes, twelve article pairings, and seventeen unchanged October 8 public objects**. Zero images regenerated, zero original placeholders restored.

The cumulative Pages-history branch advanced in one controlled append-only commit from `0730acb060f9bb31ea664f33e609e7c98fb914ca` to `436c299569d6e457831e7f5383adbf2f9d0ac432`. Its **only nine changes** are seven October 10 dated/permanent HTML files (exactly two additional stylesheet/script lines per file) and two new viewer assets. The canonical reader layout and matching assets on main ensure the feature survives later initial editorial publications. The completed one-time workflow/marker were removed by a separate protected cleanup PR.

The native **inline** 390-pixel thumbnail still has small labels; its accessibility remedy is a proven native-size viewer, not a fictional inline fine-print PASS. Full future image-story semantic pixel review still requires independent, genuine content inspection. See the [durable live proof receipt](MOBILE_FULL_RESOLUTION_VIEWER_LIVE_CLOSEOUT_2026-10-10.json).

The protected image-package-merge release-start route, implemented by [#150](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/150) and repaired with real YAML parsing by [#152](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/152), no longer requires the connected chat to manually dispatch Actions. **Its actual future six-image job binary creation/export/upload/merge/publish roundtrip remains to be proven by an eligible image production run; CI and static contract tests do not establish that outcome.** The normal first editorial publisher remains independent and unchanged.


## Six-pixel GitHub binary API qualification (nonpublishing)

After the mobile reader rollout, an independently protected [PR #155](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/155) and [Actions run 38087898195](https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/38087898195) proved authenticated GitHub blob upload and exact API/raw-commit readback of all **six previously accepted October 10 PNGs**. They were content-addressed to their original, identical Git-blob identities, with six matching SHA-256s and **zero new images, commits, branch-ref changes, original assets or Pages deployments**. See the [durable proof receipt](GITHUB_EXISTING_SIX_PNG_BINARY_TRANSPORT_PROOF_2026-10-10.json).

This qualifies **GitHub-side binary transport** but does not pretend a new image generator has exported and handed off six novel images to the connected external operator. The next real eligible six-image job remains the end-to-end qualification of the complete create/export/GitHub staging/protected merge/automatic release/pixel-review process. No additional I1–I5 development or dummy six-image production is required.

**Start here for the next real image job:** [Revision 7 production start and verified qualification handoff](REV7_PRODUCTION_START_HERE_AFTER_QUALIFICATION.md). In a standard GitHub-connected image conversation, paste only the [Revision 7 Production Starter](../external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV7.md); it reads the matching [full prompt](../external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md) and [handoff](../../EXTERNAL_APP_HANDOFF_REV7.md) directly.
