# Current premium-image requirements

**Selected contract: Revision 8. Scope: gttome/Daily-AI-Brief-Compiler only.**

This is the single current operational quality reference for the REV8 starter and full prompt. Existing source fidelity, exact bytes, protected publication and real saved-pixel review remain mandatory. Historical AAR documents retain the thresholds effective for their editions; they do not offer weaker alternatives for a new edition. The composition binding and local-export procedure below apply prospectively to editions **2026-11-01 and later**. Older specifications and accepted artifacts are not rewritten.

## Current dimensions and typography

The machine-readable values are `IMAGE_LAYOUT_REQUIREMENTS` in `scripts/image-layout-contract.mjs`:

- `width`: **1200** pixels; `height`: **630** pixels.
- `safe_margin_px`: **40** on all four edges. Required-label rectangles stay within x=40..1160 and y=40..590 and do not overlap.
- `priority_font_px`: **36** minimum, at actual final export resolution, for two or three exact source-approved `thumbnail_priority_labels`.
- `secondary_font_px`: **28** minimum for every other required explanatory label.
- `effective_date`: **2026-11-01** for the new composition binding. The existing font floors remain in force for October 30 onward.

Design at the final 1200×630 aspect ratio from the beginning. Do not letterbox or shrink a different composition and assume planned fonts survived. From November 3 onward inspect actual full-resolution saved pixels and a real **320px** inline rendition; earlier 390px receipts remain historical. Fine secondary mobile detail may use the existing full-size viewer; state that limitation honestly. A numeric font plan is not measured rendered-text evidence.

## Freeze source-grounded, distinct mechanisms before generation

For November 4 and later, read [November 3 approved AAR improvements](../automation/NOV03_APPROVED_AAR_IMPROVEMENTS.md), especially the six recorded rejection lessons. Apply the relevant source-specific exclusions and physical arrow/brace/label checks to each actual prompt. Keep the legacy `mobile_inline_390px_review_planned` field for compatibility while performing the current 320px mobile review. The existing geometry and pixel gates remain unchanged.

Read each full source; retain exact required-label allowlists, source-claim maps, supported conditional causal edges and excluded claims. Six images need six genuinely different composition grammars, not six names on the same layout. Preserve the existing density requirements: 12 meaningful components, three to five major regions, at least two dominant internal substages and at least two supported secondary relationships.

The existing `pre_generation_checks` must continue to include:

- `source_caveat_detached:true`: limitations remain a separate note, never a causal output, approval or success badge.
- `no_simulated_writing:true`, `no_simulated_document_strokes:true`, `no_unsupported_chart_or_score_marks:true`, `no_false_success_symbols:true`, `no_decorative_scenery:true`.
- `no_avatars_shields_gears_control_knobs:true`, `no_unsupported_memory_or_permission_flow:true`, `no_pseudotext_decorative_microstrokes:true`.
- `mechanism_canvas_percent` from 55 to 85 and at least two distinct source-approved `explanatory_substage_labels`.
- `mobile_inline_390px_review_planned:true`, the existing native export/mobile preview plan, source-specific causal-state checks, and reviewed connector origins and targets.

No people, avatars, brands, logos, photos, invented controls, fake document strokes, pseudo-words, scenery, trophies or unsupported numeric charts. Distinguish training from use-time, evidence from output, memory from permission, and conditional results from guarantees. Review genuine prior rejected regions as negative examples; do not invent scores or assume a checklist prevents native-generation errors.

## Bind the plan to this composition, November 1 onward

Use `pre_generation_checks.composition_geometry` with `schema_version:"image-composition-geometry-v1"`. Prepare real story-specific regions instead of copying a generic label grid:

1. `regions`: named `{id, description, bounding_box_px:{x,y,width,height}}` entries describing the actual mechanism regions in `composition_signature.layout`. Use the same three-to-five region count as `quality_review_plan.major_regions`; each region must contain at least one explanatory label.
2. Every `label_layout` entry names a `region_id`; its planned bounding box fits its assigned region and the safe canvas. Its existing `region` explanation must describe that placement, not an unrelated placeholder region. Each label box must be at least as tall as its planned font.
3. `connector_anchors`: one record per allowed causal edge, preserving its exact `from`, `to` and `support_claim_id`, with `from_region_id`, `to_region_id`, `origin_px:{x,y}` and `target_px:{x,y}`. Each endpoint lies in the matching region; labeled endpoints use their label’s assigned region and the two anchors cannot coincide. Source-supported nondirectional comparison guides must not be mislabeled as causal arrows.
4. `prompt_geometry_review`: record `result:"PASS"`, a real `reviewer`, and `regions_match_composition:true`, `labels_match_regions:true`, `connectors_match_source:true` only after reviewing the actual story-specific plan against the prompt to be submitted. Store the **exact prompt text to be submitted** in `spec.native_generation_prompt`, including exactly one unchanged block returned by `compositionGeometryPromptBlock(spec)` from `scripts/image-layout-contract.mjs`. Set `geometry_sha256` to `compositionPlanDigest(spec)` from `scripts/image-layout-contract.mjs`; it binds the exact prompt text as well as the reviewed story, source, composition, label layout, allowed edges, regions and anchors. Submit that exact stored prompt; changing it invalidates the review. Include this actual geometry in the generation prompt, not only in a detached receipt. Fix inconsistencies before calling the native generator; any plan change requires a new review and digest.

Run the existing first-pass preflight on all six frozen specifications. It checks the declared structure and geometry; it cannot prove the prompt was followed or a causal claim is true. After generation, inspect the real endpoint attachments, every explanatory label, source caveats, full-size and mobile pixels. Reject or correct failed regions until the complete set passes. Preserve passing features; never impose an attempt cap.

## Complete local export before inspection or upload

Use `scripts/complete-image-export.mjs` for the supported local-export path. The in-process `completeImageExport({outputPath, exportPng})` awaits a trusted callback that returns the completed PNG Buffer. The CLI is `node scripts/complete-image-export.mjs <completed.png> <new.png> <completed-sha256> <completed-byte-count>`. CLI identity values must come from the completed exporter, not be computed from a file that may still be written; a stable-size poll is not proof of completion. Await the actual export operation's completion before consuming the candidate. The helper validates complete PNG bytes with the existing strict PNG decoder, exact dimensions and hash, then exposes a completed file without overwriting an existing destination. Do not inspect a file still being written, accept a partial PNG, or treat a success claim as a substitute for bytes.

Keep the native original while export runs. If export is interrupted or truncated, retry export/transport from that same original rather than making a new native generation. Inspect the returned completed artifact, then bind the accepted SHA-256, byte count and Git blob to the exact committed GitHub readback. A complete-export receipt is not visual acceptance or a publication receipt. Existing fixed-offset transport for accepted files over 750 KiB remains unchanged.

## Acceptance and preserved boundaries

- Export real 8-bit RGB/RGBA PNGs, white/near-white background, exact 1200×630; no palette-mode or low-quality substitute.
- Actual saved-pixel inspection and all **24** dated/permanent desktop/mobile semantic context reviews remain required. Capture counts and workflow success are not visual PASS.
- Preserve six accepted PNGs, exact GitHub readback, 12 pairings, 17 October 8 objects, single worker ownership, protected PR/CI and image-only release. Never regenerate locked images for export, Git, CI, capture or reporting failures.
- Keep existing 19:15/21:15 America/Chicago tasks unchanged. Record only observed start/usage evidence; missing scheduler identity is **UNPROVEN**, never a new production admission condition. No extra worker, paid API, TinyFish, metered service or schedule.
- Record genuine attempts, first-pass outcomes, rejected regions and corrections in the existing canonical AAR. No quota estimate, fabricated review or unobserved success.

## Accepted pre-activation compatibility

The six November 1 specifications were accepted in PR301 (`eff5573cc39ce6c47bdd582e4aa9350e5ac09d92`) before this change reached main. They and all accepted images remain byte-for-byte unchanged. The geometry validator has a closed, code-pinned SHA-256 allowlist of those six entire parsed specifications (`JSON.stringify`, including edition, story, source and reviews). Only those exact objects bypass the **new geometry check**; all preexisting checks remain mandatory. Any changed November 1 specification or later edition still needs the complete bound geometry and exact prompt. This is not a moving cutoff, runtime-discovered exemption, legacy-schema opt-in or permission to regenerate/rewrite accepted art. Further already-published editions encountered before rollout require explicit compatibility review, not silently advancing the effective date.

## November 15 visual-set quality correction (future editions from Nov 16)

The owner rejected the Nov 15 edition's repetitive style and format. A common white background, exact source labels and mandatory individual pixel checks do not require the same layout, lower strips, object frames or infographics in six stories. Select each story's genuine best explanatory format before generating. For new editions, use the current frozen per-story editorial_style_plan, genuinely render the six-up contact-sheet PNG, inspect all 15 visual pairs, bind exact hashes and save set_review.editorial_diversity in the manifest. The protected PR gate requires this evidence; visual judgement must be based on actual saved PNG pixels. See docs/automation/NOV15_APPROVED_AAR_IMPLEMENTATION.md. Do not replace existing released artwork or weaken factual and mobile quality.

## November 17 approved mechanism-detail pilot

Owner approved November 17, 2026. Apply at the next eligible edition whose image specifications are still unfrozen, then assess the next two eligible editions in the existing image AAR. The image worker implements this through its normal planning, native generation, saved-pixel review and protected release.

Before freezing each story, state the single relationship readers should understand at 320px. In the existing editorial_style_plan.subject_specific_visual_thesis, identify two source-supported internal substages to make visible and which useful detail rewards full-size viewing. Choose the composition from the source mechanism, such as a continuous cutaway, exploded dependency view, comparison, approval boundary, evidence trail or return path. Use the existing composition geometry and exact label allowlist to express that decision.

Use the October 7 ambient-agent, enterprise-adoption and telemetry illustrations as craft references for explanatory routes, dimensional hierarchy and meaningful density. Use November 16–17 as references for larger labels and distinct media. Read the historical October 7 page at https://gttome.github.io/Daily-AI-Brief/ only as a historical reference. Current production remains https://gttome.github.io/Daily-AI-Brief-Compiler/. Historical detail must meet every current source, typography, exclusion and mobile rule before reuse in new art.

Give each story a dominant shape, clear entry point, two or three priority labels, and a reading path that follows supported relationships. Use depth, line weight and restrained accents to clarify its internal structure. Inspect silhouette and reading order across all six planned compositions before palette choices. Position detached caveats to suit each composition. All existing diversity floors and the prohibition on panel collages apply.

Review the November 17 rejection evidence before generation. Route sample-to-workload connectors clear of separate vendor-evidence objects. Keep multi-part inspection mechanisms in one continuous assembly when separate pedestals would imply a panel collage. Attach connectors to the intended physical component. Use only causal relationships supported by the sealed source.

In the existing saved-pixel and 15-pair set review, compare focal clarity, useful internal detail, professional finish, silhouette and reading order against the reference sets. Record observed strengths and weaknesses in the existing review narrative. Correct failed candidates while preserving passing features. The existing six-image, 320px and 24-context live review gates remain mandatory.

For the pilot and following two eligible editions, record the actual edition dates, first-pass accepts, total attempts, defects and corrections, mobile issues, repeated compositions and observed owner feedback in the canonical image AAR. Published baseline records report November 13 at 0/6 first-pass accepts and 19 attempts, November 16 at 3/6 and 9 attempts, and November 17 at 4/6 and 8 attempts. Evaluate the existing efficiency goals of at least 3/6 first-pass accepts and at most two attempts per story as targets, without imposing an attempt cap. At the third evaluation record keep, revise or retire for these art-direction practices with supporting observations. Aesthetic improvement requires inspection of the resulting pixels.

This pilot uses the current workflow, tests and review fields. Production outcomes become established only after the eligible images have been generated, reviewed and released.


## November 18 owner visual-quality correction — future unfrozen editions

Owner feedback on the November 18 release: the six premium images **seem too similar and basic**. Treat this as a negative observed **owner aesthetic outcome**, even though its six-up set review and protected publication passed. Do not retroactively amend the original publication receipt, claim the previous set review was fabricated, regenerate locked PNGs, or treat a technical PASS as proof of audience-level design quality.

**Specific planning diagnosis (November 18):** All six frozen designs specified exactly four labels, four major regions, twelve components, two substages, 68% mechanism occupancy, and one causal link. They did have different named grammars and palettes. These matching defaults are a *design-risk signal*, not proof that any pair of final pixels is identical. Preserve every source-grounded minimum, label allowlist, causal restriction, white background, 1200×630/320px requirement, and protected release gate; do not merely randomize the counts.

For the **next unfrozen edition and onward**, use the existing single image worker, frozen-spec preflight, native generator, saved-pixel inspection and set review to apply all of the following:

1. **Lead with a subject-specific editorial visual thesis, not a reusable diagram shell.** Describe what the reader learns in three seconds at 320px, what real source-supported mechanism is exposed at 1200px, and why this subject needs its chosen format. Prefer explanatory physical structure and meaningful detail over generic isolated icons, empty shapes or a row of four labels.
2. **Design the six together before freezing their individual specifications.** Compare their dominant silhouettes, mass distribution, focal scales, depth treatment, reading directions, perspectives and text architecture. Vary them according to subject: e.g. a continuous scientific cutaway, an exploded dependency assembly, an annotated topological map, a consequential boundary scene, a comparative cross-section or a layered evidence trail, but only where each format accurately explains the cited source. Different palette or grammar names alone are not diversity. Do not force a collage, six identical object-on-white vignettes, or repeated three-column/lower-caveat templates.
3. **Make visual complexity meaningful.** Meet the existing component and mechanism requirements through discernible interacting parts, hierarchy, overlap, line weight, selective dimensional depth and evidence-tied intermediate states; never through unsupported decorative micro-detail. A crisp 320px focal story and legible labels remain mandatory. At full size the image should reward inspection, rather than simply repeat the headline in shapes.
4. **Review the *actual six-up pixels* for aesthetic weakness, not only formal uniqueness.** In the existing 15-pair review explicitly judge shared macro composition, genericness, visual depth, craft, information hierarchy, distinctiveness at thumbnail size, and whether two images could be mistaken for the same diagram with different nouns. A repeated formula or visibly simplistic result warrants correction even when hashes, nominal grammar names, individual semantics and publication tests pass. Record observed defects honestly; no new speculative numeric pass threshold is introduced.
5. **Use the existing AAR for outcome evaluation.** Record November 18 owner feedback as negative, first-pass acceptance as 2/6 from 10 attempts, and whether the following editions show *observed* improvement in depth, six-up variety and owner reception. The image worker must distinguish internal reviewer PASS from owner acceptance, and mark owner acceptance UNKNOWN unless actually observed. Reassess at the next two eligible editions without claiming that implementing these instructions demonstrates success.

This is a **prospective art-direction adjustment**, not an override of source fidelity, causal provenance, visual exclusions, locked-asset immutability, protected gates, existing schedules or zero-metered-service rules.

## November 19 AAR improvements approved November 18

For the next eligible **unfrozen edition dated 2026-11-20 or later**, apply all eight actions in `docs/automation/NOV19_APPROVED_IMAGE_IMPROVEMENTS.md`. Keep the existing component and substage floors; make each counted part explain a supported relationship. Design the text architecture with the mechanism instead of repeating cream plaques, ribbons or folios across unrelated subjects. Inspect a compact reference set of the preceding seven genuinely released editions, including any current independently verified revision; name the closest earlier PNG and its meaningful differences. Metadata, palette names and hash differences do not establish originality.

Freeze the complete connection system before the first call: each source-supported arrowhead, source and target port, nondirectional guide and stopped path. Retain the preferred 72px planning inset where feasible and the mandatory 40px exported glyph floor. Inspect actual full-size, 320px and six-up pixels. Preserve all fifteen current-set comparisons and existing source, native-generation, publication and historical-preservation gates.

Use `scripts/prepare-image-review-receipt.mjs` to parse and stage the **complete local** 24-target review, then compare the complete remote readback. Its output contains metadata only; do not reconstruct a JSON file from bounded command output. `scripts/build-image-reference-index.mjs` lists original accepted examples, recorded rejected regions and separately labeled revision candidates without inspecting pixels or asserting that a revision is live. The optional `editorial_quality_review` AAR observations remain distinct from technical PASS and owner feedback. The approved register tracks IMG19-01 through IMG19-08; efficacy remains unknown until genuine new runs supply evidence.
