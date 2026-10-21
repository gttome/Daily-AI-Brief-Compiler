# October 21 AAR — six permanent forward-only improvements

**Approved:** October 21, 2026. **Effective:** October 22 edition onward. Scope: gttome/Daily-AI-Brief-Compiler only. Preserve the published October 21 bundle, accepted PNGs, all older history and October 8 pinned objects. Retain the two tasks at 19:15 (Compiler) and 21:15 (images), America/Chicago. No extra Work, Codex, paid APIs, metered browser automation, or additional scheduler.

## 1. Reject promotional/low-value videos

The new compiler/media-quality.mjs admission runs before sealing and again at the existing publisher's media-history gate. Video metadata, oEmbed, publisher identity and URL alone are not evidence of learning value.

For each new video, provide quality_review with reviewer, actual reviewed_at, learning_objective, practical_action, selected_over_alternatives; content_evidence (HTTPS url, source-wide scope and kind: transcript, timestamped_chapters, substantive_companion_lesson or direct_playback); promotional_assessment; promotional_risk low/medium; is_advertisement false; and either three independently useful transferable_takeaways or a reproducible_procedure (at least three steps, limitations, expected_outcome). Verification.content_reviewed must be true with substantive content_review_basis.

Short trailers below 3 minutes, explicitly promotional material, ad-risk high, description-only evidence and missing teaching outcomes fail closed. Prefer five-to-ten-minute instructional videos; 10–20 minutes needs justified fallback. These structural checks cannot independently prove a reviewer genuinely watched/listened; inventing evidence remains prohibited.

## 2. Podcasts must be at least 75% substantive AI

Require quality_review with the shared review fields and content_evidence.kind of whole_episode_transcript, timecoded_agenda or full_listening. Editorial_segments is a nonoverlapping, chronological map covering at least 90% of original episode duration, with numeric start_seconds/end_seconds, kind ai/other/advertisement and a descriptive topic. At least half the episode duration must be real editorial material. Compute AI share from AI seconds divided by AI plus non-AI editorial seconds, explicitly excluding advertisements. Require >= 0.75. An estimated_editorial_ai_fraction must match within 0.03.

Select two distinct actual episode links. Existing three-edition show cooldown and seven-edition exact episode non-repetition remain. A short AI segment in a general-news podcast fails rather than artificially inflating the percentage.

## 3. Require actual public video player advancement

Existing prepublish playback checks in bundle-ready-signal.yml and shadow-compile.yml now fail closed for Oct22+ unless both selected videos demonstrate a signed-out HTML5 player whose measured duration matches the intended full program and whose playback position advances. A YouTube oEmbed identity or page metadata fallback is unverified and cannot pass; a preview cannot substitute for an episode. Failure produces an honest diagnostic and blocks the candidate, not permission to mislabel its proof.

This is availability proof of a full-length player with short observed advancement. It does not mean the entire episode was watched or that inserted ads are absent. Historical October 21 evidence stays intact.

## 4. Retain all accepted premium-image and pixel gates

Preserve six source-bound 1200x630 professional mechanism PNGs, exact reviewed SHA-256 and labels, valid causal pathways, no pseudo-writing, humanoids or factual overclaims, immutable accepted assets, and the existing final 24 actual dated/permanent desktop/mobile semantic pixel reviews. Captures, build success and HTTP checks alone cannot supply visual PASS. Keep full-size mobile viewing for fine explanatory text. Never re-generate an accepted image to repair Git transport or reporting failures.

## 5. Record honestly observed task/generation clocks

For new image packages, the executing task must record two genuine UTC instants in the source-bound production section of reviews/after-action.json:

- host_execution_observed_at, with host_execution_observation_source: executor_observed_in_same_invocation — actual clock first observed in the task, NOT proof of the scheduler's precise trigger.
- generation_started_at, with generation_start_source: executor_observed_before_first_native_call — clock observed immediately before the first native image call, NOT inferred from schedule, commit, lease or subsequent file save.

The pre-PR image AAR validator requires both values for Oct22+ and rejects invalid, reversed or future instants. Do not manufacture timestamps if the host cannot expose its clock; save the true blocker instead. The report's timing reconciler now separates self-attested first execution, first native generation, first saved PNG, protected merge, Pages deployment, final visual review and planned schedule. It only computes observed start-to-end spans if ordered plausibly. No first-party scheduler or provider execution timestamp is invented.

## 6. Truthful per-cycle usage

For Oct22+ a Work usage percentage appears only if the exact cycle's optional owner-supplied record includes: schema_version daily-ai-brief-owner-work-usage-v1; cycle_date; edition_date; numeric work_usage_percent 0-100; measurement_scope cycle_increment_percent; source owner_reported_in_chat; owner_statement of the actual user report; report_date matching cycle_date; and carry_forward_allowed false. Missing, stale, incorrectly scoped or inferred figures display Not reported. Older accepted owner statements remain replayable. Percent used this cycle is not account remaining percentage or monetary spend. AAR generation never waits for usage.

## Scope and verification

The existing deterministic publisher and image workflows must read the latest protected producer instructions, enforce both media gates, and keep the same allocation (6 stories: 2 technical, 2 knowledge-worker, 2 agents; one Agent Skills), two videos and two podcasts. Do not reopen any completed edition. Run relevant tests, full existing CI and protected PR review. No additional scheduled workflow, metered service, paid model API, Work or Codex production run is introduced. Distinguish the verified implementation from any future unattended-run outcome that has not yet occurred.
