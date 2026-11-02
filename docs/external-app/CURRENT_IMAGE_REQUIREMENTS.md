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

Design at the final 1200×630 aspect ratio from the beginning. Do not letterbox or shrink a different composition and assume planned fonts survived. Inspect actual full-resolution saved pixels and a real **390px** inline rendition. Fine secondary mobile detail may use the existing full-size viewer; state that limitation honestly. A numeric font plan is not measured rendered-text evidence.

## Freeze source-grounded, distinct mechanisms before generation

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
