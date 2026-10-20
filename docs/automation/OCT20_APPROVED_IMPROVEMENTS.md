# October 20 approved production improvements

Owner approval: October 20, 2026. Forward-only validation takes effect with the **October 21 edition**. Preserve every historical bundle and accepted PNG. Current six-story 2/2/2 allocation, exactly one Agent Skills item, two videos and two podcasts remain unchanged. Keep the sole 19:15 and 21:15 America/Chicago tasks. No extra AI schedules, paid API or metered service is authorized.

## 1. Actual image QA and closeout

A released image is not a completed visual review. Inspect all six images in dated and permanent story placements at desktop and mobile sizes. Reuse the existing exact-release workflow's 24 image-area captures; do not redeploy or regenerate just to acquire duplicate evidence. Validate each capture's SHA-256 against captures.json and its accepted asset binding. Save the actual individual results in reviews/live/semantic-pixel-review.json. A capture count, HTTP success or CI cannot supply the subjective review booleans. Document mobile thumbnail limitations honestly; fine text may require the original/full-size viewer.

After real review, update the worker receipt to PUBLISHED_COMPLETE and release the lease. Preserve the checkpoint AAR and original package manifest. Make all report links point to actual files. A released edition is verification-only on future invocation; never regenerate its accepted assets. On a real defect repair only the affected downstream stage. Never manufacture a PASS to obtain a green report.

## 2. Source chronology before sealing

The producer MUST capture real event times, not assign one later arbitrary timestamp to every evidence record. Every source keeps retrieved_at and read_evidence.read_at; media keeps content_retrieved_at and verification.checked_at. Add to the sealed bundle:

```json
"editorial_provenance": {
  "selection_locked_at": "<actual ISO-8601 UTC instant after research and verification>",
  "sealed_at": "<actual ISO-8601 UTC instant when sealing this bundle>"
}
```

The validator requires retrieval <= read/verification <= selection lock <= seal. Watchlist refreshed_at must precede the lock. state.started_at precedes seal; state.updated_at at BUNDLE_READY matches the seal within 60 seconds. Seal and state timestamps cannot be more than 60 seconds ahead of the validator clock. Previously cached reads may precede the run start. No historical clock is silently corrected. If an observed_at and later recorded_at differ, preserve both and their meaning; never use recorded_at as the original read time.

The October 20 discrepancy is documented in docs/after-action/2026-10-20-provenance-correction.json. Exact historical reading times remain unestablished. The reporting layer shows a provenance warning rather than inventing a chronology or marking that issue fixed retrospectively.

## 3. Canonical structured image AAR

Before the first package PR, save reviews/after-action.json and generate its sibling Markdown using node scripts/render-image-aar.mjs <job.json> <manifest.json> <after-action.json>. The pre-PR gate requires the human report to equal the deterministic rendering of the structured facts. Set manifest.after_action_path to the canonical Markdown path. At this point status is SIX_IMAGES_SAVED_REVIEWED, not PUBLISHED_COMPLETE. The JSON schema is external-image-after-action-v1 and includes edition_date, cycle_date, job_sha256, original_source_commit_sha, original_bundle_sha256, human_readable_path and:

```json
"production": {
  "actual_generation_count": 0,
  "accepted_count": 6,
  "rejected_count": 0,
  "accepted_art_regenerated_after_lock": 0,
  "github_binary_stage_commit": "<first actual accepted-PNG Git commit SHA>"
}
```

The zeros illustrate field types only. Supply genuine observed counts; total must equal six accepted plus rejected. Include six images rows with story_id, generation_attempts and exact accepted sha256; their attempts sum to the total. Include errors rows with phase, issue and correction. Counts and source bindings are checked by scripts/image-aar-contract.mjs. Use the existing October 20 after-action.json as a complete format example, never as next cycle's metrics. Missing usage remains UNKNOWN. After publication and actual QA, append final release/review facts and update the terminal status through the normal protected review path.

The pre-first-PR validator requires the canonical facts, human AAR and six frozen specifications. The deterministic combined report displays schema warnings, uses the real recorded AAR path, and never derives a usage percentage from attempts or Git commits.

## 4. Image first-pass accuracy

Before the FIRST native generation, freeze all six source-grounded specifications and run scripts/preflight-image-firstpass.mjs. Edition identity must match the job. Reserve six different composition grammars. Existing factual/source/quality gates remain mandatory.

Each spec adds pre_generation_checks with:

- label_layout: one unique row for EVERY required_labels entry, containing exact label, named region and minimum_font_px >=18 on the 1200x630 canvas;
- safe_margin_px >=40;
- no_simulated_writing:true, no_false_success_symbols:true, no_decorative_scenery:true;
- source_caveat: the exact source limitation or statement that no unlisted outcome is implied;
- causal_state_checks: at least one source-specific condition, allowed_path, blocked_path and support_claim_id from source_claim_map. Add a row for every meaningful conditional/training/deployment state.

For GRAFT-like stories explicitly distinguish unflagged BOTH-adapter updates, flagged FORGET-only updates, RETAIN-only anchor, removal and deployment. Never substitute a generic success arrow. This is a preparation check, not saved-pixel acceptance. Correct only failed regions where practical; preserve passing features. Track first-pass success and attempts; a goal of <=12 attempts is not a cap. Continue corrections until every premium requirement passes. Accepted bytes never change for transport/CI/reporting defects.

## 5. Media variety, exact links and honest verification

Prefer two distinct original video publishers. If both are genuinely necessary from one publisher, persist video_diversity_exception with a substantive reason, named reviewer and at least two alternatives_reviewed from distinct independent publishers, each with actual URL and rejection reason. Do not invent alternatives. Match publisher identity from source URLs. For YouTube, source-page metadata must verify publisher_channel_id, publisher_channel_url=https://www.youtube.com/channel/<id>, publisher_channel_verified:true; the channel ID is the stable UC identifier, not a display label. Different videos from one channel do not create variety.

Apple podcast links MUST include the numeric i= episode ID; Spotify links must be /episode/... . Other original publisher links must be episode-specific, with verification.episode_url matching url and a stable verification.episode_identifier. Preserve the seven-previous-edition item check and three-previous-edition program cooldown.

For each video/podcast verification record include content_reviewed and playback_verified booleans plus a substantive content_review_basis. playback_verified:true additionally needs playback_evidence={method,result,checked_at}. Metadata verification does not imply playback. Do not claim a video played merely because its URL or title was verified.

## 6. Nontechnical agents audience fit

Each of the two Agents for Everyone stories must include audience_fit:

```json
{
  "requires_programming": false,
  "prerequisite_level": "general_office_tools",
  "intended_user": "<specific nontechnical professional and context>",
  "practical_action": "<action the reader can perform without programming>",
  "review_action": "<specific human verification or approval>",
  "usable_outcome": "<concrete result the professional can use>"
}
```

prerequisite_level is none or general_office_tools. All four narratives are substantive, at least 35 characters, grounded in the source. Worktrees, source-code editing, running local tests or updating pull requests are developer prerequisites: choose a technical lane for those workflows. Field presence is not proof of audience suitability; genuinely evaluate the underlying Summary and Why it matters before sealing.

## Regression and closeout

Tests cover the October 20 failure modes, historical replay, exact source/hash/episode identities, distinct YouTube channels, false playback assertions, text geometry, invalid causal-state references and canonical AAR totals. Update the existing learning ledger at run closeout. Do not rewrite prior receipts to conceal a discrepancy or report a future unattended outcome as already observed.
