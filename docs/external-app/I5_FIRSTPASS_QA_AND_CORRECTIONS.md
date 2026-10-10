# I5 — Future Image First-Pass Quality and Correction Contract

**Scope:** only optional six-image creation, not the initial placeholder publisher or accepted historical PNGs. Activation is via `contracts/image-process-versions.json` field `image_additional_first_pass_qc=enriched_v1`. The existing mandatory image quality floor remains enforced even with this enhancement OFF.

## Frozen, source-faithful specifications

For each exact story from the immutable eligible image job, prior to generation the external operator must freeze a v1 spec with: `visual_thesis`, exact `source_url`, `source_claim_map` including publisher evidence excerpts and explicitly reviewed fact-versus-metaphor authority, two or three unique `story_anchors`, **three or more exact, nonempty explanatory `required_labels`**, `allowed_causal_edges` with direction and supported claim bindings, `excluded_claims`, distinct `composition_signature` (grammar, metaphor, layout, palette and annotation), review-plan counts and explicit `editorial_semantic_review`.

Use `scripts/preflight-image-firstpass.mjs` only after selecting I5. Structural checks cannot replace genuine semantic source reading. Six-image admission requires four distinct grammars/metaphors, three annotations and no more than two dominant duplicate grammars, unless source truth requires a different composition; document and review any justified exception instead of silently inserting fabricated relationships.

Every 1200×630 image must visibly explain its specific source-backed mechanism on white/near-white, with readable labels, safe margins, premium textbook/editorial detail; infographic/hybrid styling when justified. Never accept pseudo-writing, generic flat cards, unrelated decoration, unsupported arrows, flipped approval sequence or invented metrics. Dimensions and checksum do not substitute for saved-pixel inspection.

## Corrections

Review each exact saved candidate at full size and all six collectively. Classify failures with `pseudotext`, `wrong_relation`, `unsupported_claim`, `mobile_legibility`, `generic_layout`, `clipping`, `wrong_source_metric`, `reversed_gate`, `alt_text` or `six_set_similarity`, and record region and evidence. Version/repair only failures, preserving passing features. **No fixed attempt cap.** A transport/release/CI/status error reuses accepted immutable bytes, never redraws them. A genuine published-quality problem requires a separately authorized versioned correction.

## Regression discipline and independent reversal

The actual October 10 six-story pre-generation evidence is the golden structured fixture; CI tests include missing labels, fake microtext, false causal edges, duplicate composition signatures, unreviewed source semantics, saved accepted image no-regeneration, and an apostrophe/entity-rendered accepted article that must never be rerun through placeholder replacement. The existing PR #121 Jekyll source-attribute matching and corrected alt-text regression remain mandatory.

I5 rollback only switches `image_additional_first_pass_qc` from `enriched_v1` to `baseline` through protected CI. The underlying text, factual accuracy, image difference, correct alt, and saved-pixel floor remain required and existing published art must not change. Rollback is a policy change for future images; do not reverse PR #121 or edit source/history/accepted PNGs.
