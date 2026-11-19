# November 19 image AAR improvements

George approved all eight actions on November 18, 2026 after reviewing the November 19 edition image AAR. Apply them at the existing image worker's next eligible **unfrozen** edition dated November 20 or later. The existing task reads the current IMAGES contract, which points here. No new producer, schedule, paid service, image format, release gate or owner-computer dependency is introduced.

Approved evidence package: [Image AAR and improvement plan](https://chatgpt.com/library?file_id=libfile_fde3_f-0439571171e481918bb4d1d0e96c6dfa_acaecf7401d0819183c783b6efb86da4&account_id=personal). Original production evidence remains in `external-image-packages/2026-11-19/`. Preserve its six accepted PNGs, immutable manifest and source receipts. Do not reopen that completed edition to demonstrate this change.

## Evidence and intended outcome

November 19 produced six accepted images from twelve native calls and zero first-pass accepts. Five rejected candidates had connector defects, three had layout defects and one had pseudo-writing; categories overlap. Several extra arrows were source-plausible but absent from the frozen edge plan. All six accepted images have different main structures, but cream label surfaces and heavy dark lettering repeat. Zaps and Neon both use broad ribbons. The Cowork folio resembles the current November 18 sales folio, including the later owner-quality-r2 artwork.

The current >=4/6 first-pass and <=8-call targets remain goals, never attempt caps. Technical PASS, internal artistic judgment and owner reception are separate outcomes. Missing feedback or usage remains unknown.

## All eight approved actions

| ID | Existing owner | Required practice during genuine new work | Evidence and evaluation |
|---|---|---|---|
| IMG19-01 | Images | Map every meaningful component to a supported source relationship or explicitly identified editorial procedure. Describe what each internal substage teaches. | Identify at least two discernible substages and two supported secondary relationships in the actual full-size pixels. Retain current density floors; repeated blank layers or texture do not independently establish useful detail. |
| IMG19-02 | Images | Design the text architecture with the mechanism. Use direct annotations, open-margin labels, integrated tabs or inset captions where they suit the subject. | Inspect the actual six-up sheet for repeated cream plaques, banner rhythm, type hierarchy, silhouette, focal scale and reading path. Palette or grammar names alone do not establish variety. Keep all type and mobile floors. |
| IMG19-03 | Images | Inspect seven preceding genuinely released image sets, including current verified revisions. Name the closest earlier asset for each new image. | Record its exact earlier edition, story, PNG hash and link, plus a specific difference in structure, viewpoint or visual encoding observed in actual pixels. Missing history stays unknown. |
| IMG19-04 | Images | Enumerate every intended causal arrow, arrowhead, noncausal comparison guide and stopped path before freezing. | The exact prompt, allowed edge list, physical ports and geometry must agree. Preserve source caveats and absent crossings. Do not add an edge merely to excuse arbitrary generated arrows. Record each real rejected region and localized repair. |
| IMG19-05 | Images | Use the existing preferred 72px planning inset where feasible. Inspect complete glyph extents and detached caveats after export. | The mandatory saved-pixel floor remains 40px. Inspect the exact 1200x630 PNG and actual 320px rendition before acceptance. |
| IMG19-06 | Images and reporting maintainer | Stage the complete local review JSON and compare its full remote readback. Never reconstruct it from bounded command output. | Use the helper below; preserve original bytes and findings. The November 19 receipt incident is already repaired in PR 390 and reporting run 44455557132 passed. No new image generation is needed for transport. |
| IMG19-07 | Images | Record useful detail, setwide identity, historical comparison, mobile limitations and owner feedback separately. | The optional structured review below is exposed by both the individual image AAR and existing unified reporting. Evaluate the next three actual eligible editions; a prompt change is not proof of better art. |
| IMG19-08 | Images | Keep a compact evidence index of accepted examples and real rejected regions, organized by the relationship explained. | Reuse craft features without copying the old shell. The local reference index links actual original records and separately labels later revision candidates. It never claims to have viewed pixels. |

## Source bound art direction before generation

Read the six complete new stories and original primary sources. In each existing `editorial_style_plan.subject_specific_visual_thesis`, explain the single relationship to understand at 320px and the supported inner mechanism visible at 1200px. In `difference_from_earlier_story_images`, name the actual closest prior image and the specific planned departure. Do not simply restate the new grammar name.

Choose the structure from the source: an artifact dissection, dependency section, topological mapping, consequential boundary, evidence tracing or matched comparison when appropriate. Keep the mandatory twelve meaningful components, three to five regions, at least two internal substages and two supported secondary relationships. Rich material rendering cannot substitute for a relationship. Do not increase density with invented controls, unsupported charts, fake document writing, scenic filler or repeated anonymous objects.

For the complete connection system, name the source and target objects and visible ports; distinguish causal arrows from physical ties and nondirectional guides. Describe every intended head and every path that stops before a boundary. Review this against the exact native prompt, label boxes and composition digest before the first call. Recompute the existing digest after a change; never backdate the freeze.

## Seven edition reference index

The following local command reads existing metadata and writes a new review aid. Use a worktree containing the protected-main records at the supplied SHA. Verify that SHA and the exact indexed files through the existing Git workflow. Output belongs in the current canonical package's existing reviews directory, not in an earlier package.

```sh
node scripts/build-image-reference-index.mjs \
  "$EDITION" "$REFERENCE_WORKTREE" "$PROTECTED_MAIN_SHA" \
  "$CANONICAL_PACKAGE/reviews/recent-reference-index.json"
```

The index selects up to seven earlier sets with a bound original `RELEASED_VERIFIED` AAR. It lists accepted PNG references, recorded visual theses, media, viewpoints and actual rejected regions. Original publication is distinct from later `revision_candidates`: a revision manifest alone does not prove publication or owner art acceptance. Check actual current prior-day page/image routes and verified revision receipts, then inspect those PNGs before selecting a nearest neighbor. Missing or inconsistent historical metadata is skipped and disclosed, never repaired automatically. The index does not fetch, generate, score, inspect or publish images.

Use the existing six-up sheets as compact visual references, then open the nominated actual PNGs at readable scale. The reference index's relationship fields help locate a suitable craft example; they do not authorize transplanting its labels, facts or metaphor to another source.

## Actual pixel review and optional AAR observations

Inspect the exact complete saved PNG at full size and 320px, and inspect all fifteen current-set pairs. For a failed candidate, name the exact region and make a localized correction while preserving passing regions. Accepted images stay immutable. No attempt cap or inferior fallback is introduced.

During genuine review, record `after-action.json.editorial_quality_review` with schema `image-editorial-quality-review-v1`. This is optional reporting evidence, not a new package-admission condition. Fill it from actual review; the renderer never generates an aesthetic result. Use these fields:

| Field | Meaning |
|---|---|
| `edition_date`, `reviewed_at`, `reviewer` | Actual edition, observation time and executing reviewer. |
| `method` | `saved_png_fullsize_320_and_set_review`. |
| `set_observation`, `evidence_ref` | Specific saved-pixel set assessment, with an exact evidence URL. |
| `reference_editions` | Up to seven distinct earlier released edition dates actually considered. |
| `owner_feedback` | `{state:"unknown"}` unless an actual positive, mixed or negative owner statement has a genuine `evidence_ref` and substantive `note`. Internal PASS does not supply owner feedback. |
| `stories` | Six exact story and accepted-PNG hash records. Each includes fields below. |

Each story row contains `story_id`, `sha256`, genuine `fullsize_pixels_inspected:true` and `mobile_320_pixels_inspected:true`, `detail_observation`, `text_architecture_observation`, `mobile_observation`, an exact `evidence_ref`, and `assessment` of `improved`, `needs_revision` or `inconclusive`.

Also record two or more `supported_substages` and two or more `secondary_relationships`. Each entry names a distinct `description` and its existing source-map `support_claim_id`. These are reviewer source references, not code-certified factual support. `nearest_prior` is either null for unavailable evidence or an object with `edition_date`, `story_id`, `asset_sha256`, `asset_ref`, `comparison_basis:"actual_saved_pixels"` and a specific `observed_difference` of at least sixty characters. Use a date in the recorded reference set. The actual hashes, not names alone, bind the observation.

The existing renderers show RECORDED, PARTIAL, INVALID or NOT_RECORDED evidence without a numeric art score. Unknown owner feedback does not make an otherwise complete internal review invalid and never blocks ordinary publication. The existing AAR retains all original production and publication facts.

## Complete review transport

After actual twenty four context reviews are finished, stage the original complete JSON file. The helper checks six manifest hashes, all four exact contexts per story and the recorded review fields. It does not inspect pixels or create findings.

```sh
node scripts/prepare-image-review-receipt.mjs stage \
  "$CANONICAL_PACKAGE/manifest.json" "$COMPLETE_LOCAL_REVIEW" "$NEW_STAGED_REVIEW"
```

Upload the staged file through the existing Git path using file bytes. Do not copy the JSON payload out of terminal output. Fetch the complete committed remote file through the ordinary authenticated Git readback to a new local file, then compare it:

```sh
node scripts/prepare-image-review-receipt.mjs verify-readback \
  "$CANONICAL_PACKAGE/manifest.json" "$COMPLETE_LOCAL_REVIEW" "$REMOTE_REVIEW_READBACK"
```

Both commands print small metadata receipts only. The second requires complete byte equality, including whitespace. A parse failure, missing/duplicate context, wrong story/hash or changed readback fails locally. Existing protected PR checks, merge and reporting remain required. Do not regenerate images or fabricate a replacement semantic review to repair a transport failure.

## Three edition outcome review

IMG19-01 through IMG19-08 are registered prospectively from November 20; November 22 is the first planned cumulative review date. Record the actual three eligible editions. If fewer genuine runs or observations exist, evaluate efficacy as inconclusive and record the gap instead of inventing samples. Keep the existing >=4/6 first-pass and <=8-call goals, six-image quality, twelve page pairings, all twenty four pixel contexts and historical safeguards.

Record evidence-supported `change_evaluations` using the existing keep/revise/retire and met/not_met/inconclusive fields. A negative or unknown owner outcome is distinct from a technical release failure. No owner response is a routine prerequisite to production. Preserve unknown usage; do not estimate quota savings from call counts. The deterministic reporting job only reports evidence and never starts image work.
