# Premium Image Process I1–I5 — Protected Development and Rollback

**Repository:** gttome/Daily-AI-Brief-Compiler  
**Baseline:** October 10, 2026 six-image edition; 17 October 8 protected objects  
**Status:** All feature code merged behind legacy/off selectors; five nonpublishing reversals require the dedicated CI proof to complete

## Independently merged proposal changes

| Feature | PRs | Version selector | Current selected | Available enhanced |
|---|---|---|---|---|
| I1 | #130 | `image_release_authority_policy` | `legacy_go_v1` | `bounded_starter_v7` |
| I2 | #131 | `image_starter_contract_version` | `rev6` | `rev7` |
| I3 | #132, correction #134 | `image_target_capture_policy` | `legacy` | `element24_v1` |
| I4 | #133, correction #135 | `image_status_sync_mode` and `image_verify_only_enabled` | `baseline` / `false` | `public_sync_v2` / `true` |
| I5 | #136 | `image_additional_first_pass_qc` | `baseline` | `enriched_v1` |

All PRs were individual and merged after protected CI. Code merge is not the same thing as production activation. See [actual SHA/PR ledger](proposal_change_ledger.json) and [active-version manifest](active_version_manifest.json). Revision 7 remains inactive while selectors show `legacy_go_v1:rev6`.

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

CI evidence outputs (after the workflow actually passes): `postproduction_rollback_drills.json` and `postproduction_rollback_receipt_dryrun.json`, retained in the Actions artifact named `independent-image-postproduction-rollback-receipts`. A green normal unit test by itself does not establish the live fixture drill result.

### Authentic historical proof versus fixture contracts

The original job/package/release remain v1 and byte-identical. Future Rev7 assignment and v2 release readers are exercised using **clearly labeled synthetic schema fixtures**, never called actual owner approval or completed publication. The original producer receipt with `scheduled_execution:false` must stay false. Accepted PNGs are never regenerated for transport/CI/status errors.

### Reversing one feature later

An actual production rollback requires separate owner direction. After verifying current main/head, Pages-history SHA, six accepted images/paired article URLs and 17 protected October 8 objects, apply only the selected inverse from the ledger through one protected PR. Run exact-head CI, merge normally, then reverify all historical hashes and reader pairings. Do not restore placeholders, republish old HTML, regenerate accepted PNGs, modify a different feature or reopen a terminal edition. Status/visual-review evidence must remain truthful.

## Remaining release capability / quality gates

- Revision 7 selected starter/full prompt/handoff/validator/workflow alignment: **not yet activated**.
- Actual external application generation/export/GitHub binary upload/workflow dispatch capabilities: **preflight not proven in this session**; connected GitHub tools do not expose dispatch.
- Twenty-four loaded, exact image-region captures with genuine visual/semantic pixel review: **UNPROVEN**, not 24/24 PASS merely because a screenshot script is present.
- Public status-sync improvement and verification-only mode: **implemented, default off**, not deployed or independently live-released yet.

No production Work, Codex, paid API, schedule additions, original editorial-publisher delay or live rollback has been authorized by these fixture drills.
