# November 15 owner-approved AAR: implementation contract

**Approved:** November 14, 2026 CT. **First new edition:** November 16, 2026. **Historical November 15 release remains immutable.** This is a forward-only change within the existing four task roles, protected PR/CI and cost boundaries, with no new scheduled work.

## Five actions with evidence targets

| ID | Improvement and implementation | Outcome to verify next edition |
|---|---|---|
| NOV15-01 | **Images too alike:** Source-specific art direction, different actual formats/media/viewpoints/hierarchies rather than color/label swaps. The new image-set-diversity gate requires six observed saved-pixel style profiles, 15 pairwise comparisons and a committed, SHA-bound six-up contact-sheet PNG before the protected image PR passes. | A genuine six-up review, clearly distinct artwork and real owner feedback, separately from 24 individual screenshot passes. |
| NOV15-02 | **Top 10 input invalid:** New top10-handoff-check validates exact original report bytes, source commit/blob, input snapshot, dates and hash. The consumed source collector saves an explicit VERIFIED or UNVERIFIED receipt. The existing real per-topic article/video/podcast search and selected-item mappings must still be recorded. | Exact-source provenance, real searched URLs/clock/outcomes and actual selected mappings. Missing data remains PARTIAL/INVALID; trends stay advisory and do not block the Brief. |
| NOV15-03 | **Six failed protected gates unclassified:** The original failed jobs have a separate forensic JSON with exact errors. first-failure-diagnostics can classify only literal original error text, otherwise UNCLASSIFIED. | Verify six candidate-video substantive reads and pool before preseal; exact current bundle/edition before SOURCE_READY; genuinely new Skills lesson before MEDIA_HISTORY; fewer repeated failed submissions. |
| NOV15-04 | **13 image attempts/zero first-pass:** Prospective pre-generation six-art-direction and first-pass risk preflight now checks unique forms, mediums, hierarchy and risk-specific fixes before native creation. | At least 3/6 first-pass accepts and <=2 attempts per story as goals, without attempt cap or reduced quality; actual attempt data in the image AAR. |
| NOV15-05 | **Unattended autonomy unproven:** Existing task-origin and recovery telemetry must be recorded at genuinely observed checkpoints; independent first-party scheduler receipt remains a distinct proof requirement. | Scheduler entry, actual start, handoffs, failures/repair/verification and terminal report independently evidenced without an owner prompt. Otherwise report UNPROVEN. |

## New prospective image package requirements

Before the first native call: read the six full stories and primary sources and actual prior image rejection evidence; assign each frozen spec a pre_generation_checks.editorial_style_plan with format_family, dominant_grammar, medium_treatment, perspective, information_hierarchy, palette_family, subject_specific_visual_thesis, difference_from_earlier_story_images and first_pass_risk_mitigation. The grammar must match composition_signature.grammar, with at least four format/medium/hierarchy/palette families and at least three views. Avoid six panel collages, identical footers, identical input-engine-output layouts or renamed versions of one template.

After actual saved-pixel inspection: create a genuine 6-up PNG under external-image-packages/E/reviews/six-up-contact-sheet.png from the six current accepted images. Save in manifest.set_review.editorial_diversity the required schema_version external-image-editorial-diversity-v1, status PASS, method six_up_saved_png_pixel_comparison, source saved_committed_png_pixels, owner_acceptance_not_inferred true, reviewer, reviewed_at, six exact reviewed_sha256s, exact contact_sheet_path and contact_sheet_sha256, six stories, and 15 pairwise comparisons. Each story includes the source-bound story_id/sha256, the actual art-direction family fields plus mechanism_metaphor, dominant_arrangement, observed_distinctiveness and first_pass_risk_preflight. Each of 15 pairs includes left_story_id, right_story_id, same_dominant_template false, an actual observed_pixel_difference and acknowledged shared_traits. Record FAIL and correct the weak candidate if visual repetition persists; self-attestation does not confer aesthetic truth. Existing image-source, labels, 1200x630, white background, no people/logos, legibility and live QA protections remain.

The protected existing image pre-PR gate verifies the six-up file is actually committed under the current package, its PNG signature and exact SHA, plus completeness and differentiation of review evidence. The image after-action renderer reports this set-level evidence. It cannot algorithmically prove that the images satisfy the owner's aesthetic standards.

## November 15 original-job forensic causes

- PRESEAL_VIDEO x4: incomplete video-candidate substantive review evidence (3) and insufficient six-prequalified-video pool (1).
- SOURCE_READY x1: original diagnostic BUNDLE_INVALID_OR_WRONG_EDITION; not enough evidence to isolate which side of OR.
- MEDIA_HISTORY x1: original diagnostic EDITORIAL_NEAR_DUPLICATE_REQUIRES_RESELECTION for a recurring generic Skills authoring lesson.

Original job URLs and exact diagnostics are preserved in docs/automation/nov15-publishing-failure-forensic.json. Future writer/recovery roles check these specific conditions before submitting a protected validation. Reuse accepted articles/media. Never rerun or reseal the completed November 15 edition.

## Verification and limits

Changes are effective on the next genuine unlocked edition only. Do not infer achieved improvement from code merge, CI success, valid JSON, distinct binary hashes, scheduler claim, or a prior completed release. Record actual subsequent results in the existing combined AAR and existing NOV15-01 through NOV15-05 improvement register; keep unknown as unknown. Never change four task schedules, create new AI tasks, use paid or metered services, or weaken protected release or mobile rules.
