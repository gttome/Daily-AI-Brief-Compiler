# Approved AAR continuous improvement extensions

Owner approved the ten follow-up proposals on November 3, 2026. Reporting can describe the November 3 evidence honestly; new collection instructions apply to November 4 onward. Preserve the frozen November 3 baseline, completed editions and accepted images. This adds deterministic code to the existing reporting job, not a producer, paid service, schedule, publication gate or mandatory historical repair.

## Ten delivered increments

1. Current reconciled Top 10 outcome/baseline/review status is shown separately from the original producer snapshot. Historical pending/qualification claims remain preserved and explicitly labeled, including in machine-readable output.
2. Four current role contracts plus COMMON replace accumulated scheduler instructions. Exact old prompts are archived under `archives/2026-11-03-task-prompts.json` as inactive history. Migration preserves task IDs, schedules, environments, ownership and substantive quality rules; `current/requirements-audit.json` maps old obligations to current clauses. No historical seed or obsolete incident status controls future work.
3. `config/aar-improvement-register.json` extends the existing daily_improvement feedback loop with stable IDs, accountable roles, measurable criteria, effective editions and review dates. Existing four changes and ten additions are evaluated November 11 after the first prospective week. Later register edits need the normal protected path. PENDING/OVERDUE is different from a failed production release; reporting never turns a proposal into an automatic control change.
4. Seven-edition trend panels show the existing coverage, first-pass image acceptance, image attempts, publication failures and Top 10 linkage metrics. Missing dates are visible gaps; tables show actual sample counts and medians. Registry changes are disclosed. No invented pre-baseline history or improvement score.
5. Failure charts group real recorded publishing gate events and separately reviewed root causes. Deduplicate exact stage/run identities. An unclassified cause stays UNCLASSIFIED; a stage is not a diagnosis. Show distinct affected editions, recurrence and only explicitly documented delay samples.
6. Recovery intervals separate detection, queue, repair and verification. Actual complete timing/evidence rows are mandatory for numeric intervals. Mode is recorded provenance, not first-party scheduler proof. Owner-assisted and scheduled-guard rows remain distinct.
7. Source inspection history uses exact source IDs with genuine pre-selection review timestamps. Counts alone and automated source-index GETs never establish the last editorial inspection. Missing history is NOT_RECORDED, not “never inspected.” Current enabled catalogue is shown; no disabled source is activated.
8. Rolling source contribution uses the bound substantive candidate_reviews ledger with explicit resource IDs. Unique candidate URLs are counted once per format/window; attribution gaps stay unknown. Only actual verified bundle inclusion counts as selection. It is a sampled contribution table, not a quality/popularity ranking or reason to remove specialist sources.
9. Image defect counts require actual rejected generation story/attempt identities and code/evidence records. One attempt may have multiple codes; preserve separate rejected-attempt totals and unclassified count. Existing narrative errors remain unchanged and are not automatically classified from keywords.
10. Publisher-family sensitivity requires complete recorded event-matched attention attribution and a justified band assessment after removing each family. It does not fabricate a scoring algorithm or establish audience popularity/independence from counts.

## Additive evidence contracts

All fields below are optional reporting evidence, never new release gates. Missing or invalid records remain unknown. Do not backfill a genuine run from memory, infer inspection from HTTP reachability or invent time. The new deterministic reporter reads original same-edition inputs, records their SHA256 digests and writes `daily/C/improvement-observations.json`, `improvement-metrics.json` and three extra SVGs beside the existing charts. Its seven-date tables start with the first comparable November 3 observation. Existing workflow/offline packaging includes all files.

### Change evaluations

Append `change_evaluations` in the existing role receipt: Top 10 `daily_improvement.change_evaluations`; Compiler `trend-search-coverage.json`; Images `reviews/after-action.json`; Recovery `recovery/E.json`. Each item:

```json
{"change_id":"AAR-07","reviewed_edition":"2026-11-11","decision":"keep","result":"inconclusive","reason":"Explain the actual recorded outcomes, missing evidence and comparability limits in at least forty characters.","evidence_refs":["https://github.com/gttome/Daily-AI-Brief-Compiler/blob/operations-reports/daily/2026-11-10/improvement-metrics.json"]}
```

This is a schema example, not a completed evaluation. Decision is keep/revise/retire; result is met/not_met/inconclusive. At least one real exact evidence URL is required. Evaluation belongs to its actual edition, at or after the change effective date. Later reports retain the latest valid review; “retire” is a recommendation, never silent disabling of a gate. Due-date evaluation must acknowledge insufficient sample size rather than invent success. Reevaluate after material changes via a newly recorded review date.

### Publication causes and recovery timing

In the existing Compiler coverage receipt, owner incident record or Recovery receipt, add `cause_reviews[]`: `run_url`, `stage`, `root_cause_code` (stable uppercase snake case), `reason` (at least forty characters), `evidence_ref` to the original job/log, and optional nonnegative `documented_delay_seconds` supported by that evidence. The run/stage must match the actual publication-health failure; duplicate/conflicting classifications are unclassified. Record root cause only after reading the exact failure. Do not allocate the full edition delay to each failure.

In same-edition Recovery receipt, add `timing_observations[]`: `failure_run_url`, actual ISO `failure_at`, `detected_at`, `repair_started_at`, `repair_completed_at`, `verified_at`, `mode` (owner_assisted/scheduled_guard/primary/unknown), `public_verification_ref`, and `evidence_refs` including original failing run and independent public verification. Times must be ordered; actual failure cannot follow the recorded failure observation. Rehearsals and healthy no-ops do not produce recovery intervals. Preserve existing ownership checks and the rest of the original receipt.

### Source inspections and contribution

Continue `bundle.source_discovery_audit.index_review` with true `eligible`, exact `eligible_ids`, `inspected`, exact `inspected_ids`, `inaccessible_ids` and `unreviewed`, plus actual audit `reviewed_at` no later than `editorial_provenance.selection_locked_at`. Count/IDs must agree and be unique registry IDs. The original eligible-ID snapshot establishes source membership; a later registry cannot reconstruct it. Never reconstruct missing November 3 inspected IDs from its aggregate count.

Each existing valid `trend-search-coverage.candidate_reviews.records[]` may add `resource_id` matching an enabled registry entry actually used to discover/review that candidate. Preserve all v1 method, identity, chronology and quality fields. A URL hostname alone cannot establish attribution. Metadata-only entries do not count as substantive reviews. Without complete verified bundle evidence, selected remains unknown.

### Image defect categories

On each real generation-rejection error in the existing Image AAR, add:

```json
{"generation_rejection":{"story_id":"actual-story-id","attempt":1,"defect_codes":["CAUSAL_CONNECTOR"],"evidence_ref":"https://github.com/gttome/Daily-AI-Brief-Compiler/blob/actual-commit/actual-rejection-receipt.json"}}
```

The example URL is a placeholder, not evidence. Use a real saved rejection record with actual source/pixel observations. Allowed codes: TYPOGRAPHY, UNSUPPORTED_CLAIM, CAUSAL_CONNECTOR, LAYOUT, PSEUDO_WRITING, UNALLOWLISTED_TEXT, OTHER. Attempt is 1-based, must precede the accepted attempt for the named final story, and may appear once. Multiple codes are allowed without multiplying the rejected-attempt total. Deployment, transport and reporting failures are not generation rejections. No accepted-image regeneration or attempt cap is introduced.

### Top 10 publisher-family review

Within a current topic, mark genuine attention evidence with `role:"attention"` and `event_id` matching the topic. Other source roles remain distinct. Optional `publisher_family_review` has schema_version `top10-publisher-family-review-v1`, actual `reviewed_at` no later than report generation, `families[]` and `removals[]`.

Each family has `family_id`, a verified `provenance_url`, `independence_reason` (at least forty characters), and distinct `evidence_urls`. Partition every event-matched attention URL exactly once; merge syndication/common original publisher rather than treating sites/trackers as independent. Unknown provenance means the review is incomplete, not an invented family.

For each family exactly once, record `family_id`, the exact `remaining_evidence_urls` after its removal, a genuinely reassessed `attention_band` (broader/limited/insufficient) and a substantive `reason` (at least forty characters). Removing all attention leaves insufficient. Removal cannot upgrade a band. Preserve the topic's original band. The reporter validates bookkeeping and reports recorded weakening; it does not independently certify the editorial judgment or manufacture popularity ranks.

## Rollout, verification and boundaries

Use one scoped protected PR and exact-head CI. Verify frozen baseline bytes unchanged, actual November 3 counts remain 27/87 inspections, 1/6 first-pass images, 12 attempts, five publishing failures and four unique Top 10-linked items. Cause/timing/attribution/sensitivity gaps remain unknown where original records lack them. Inspect 320px chart renders, deterministic rerender and offline packaging. Then replace only the prompts of the four existing tasks with pointers to the current role/common contracts, verify exact readback and unchanged schedules/environments/enabled state. No November 4 production is launched by rollout.

The ordinary next runs supply new evidence. Passing code checks verifies implementation; efficacy and unattended recovery require genuine future outcomes. AAR-only defects do not justify weakening production gates or rewriting historical receipts.
