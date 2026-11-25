# November 25 approved image improvements

Effective November 26 and every eligible future edition. The November 25 revision is a separate, owner-directed comparison point. Do not reopen it or treat it as an unattended outcome. Preserve existing task IDs, schedules, ownership, protected QA, and accepted image bytes.

## P0 daily variety controls

Apply the current `IMAGES.md` composition rules to every new job, including resumed unlocked candidates. Choose the source-specific structure first, then vary its medium and perspective. A content region is not a panel. Inspect the actual thumbnails in grayscale or with colors and labels mentally suppressed before locking new art. Keep the existing saved-pixel, source, accessibility, and release requirements.

## P1 reproducible layout evidence

Add `manifest.set_review.structural_layout_review` alongside the existing editorial diversity review. Use schema version `image-structural-layout-review-v1`, method `unlabeled_silhouette_and_saved_thumbnail`, and the existing committed six-up PNG's exact `contact_sheet_sha256`. Do not add a separate producer or publish the contact sheet as an article image.

- Freeze planned layouts and simple unlabeled silhouettes with the six specs before the first native call. Each frozen spec uses `pre_generation_checks.structural_layout_plan` with `layout_family` and `silhouette`. The first-pass check enforces the planned counts, and the package check binds planned review rows back to those exact frozen specs. In each three-by-three sketch use `D` for dominant mass, `S` for supporting mass, and a period for open space. Separate the three rows with slashes, e.g. `..S/.DD/S..`. Record the corresponding observed silhouette from the actual saved thumbnails after generation. These are reviewer diagrams, not machine measurements.
- The six `stories` contain `story_id`, exact saved-image `sha256`, `planned_layout`, `planned_silhouette`, `observed_layout`, `observed_silhouette`, `observed_treatment`, `observed_grouping`, `observed_eye_path`, and `prior_matches` in prior-set order. Use stable treatment slugs (for example `cut-paper`, `letterpress`, `technical-linework`). Record the grouping, relative scale, visible treatment and reading direction as observed, not promised by the prompt.
- Use the dominant visible topology: `horizontal-strip` (linear left to right, including disguised three-station strips), `vertical-stack` (tiered descent/ascent), `central-cutaway` (one large view with embedded details), `radial-loop` (orbit or loop), `branching-tree` (divergent paths), `asymmetric-inset` (off-center main view and magnified detail), `continuous-scene` (one undivided setting), `diagonal-depth` (diagonal overlap or depth as the main reading direction), or `side-by-side` (paired views with no staged flow). Multiple works may share a broad family only if the individual compositions still meet the existing distinctness review.
- In `prior_sets`, list the latest three verified editions in descending order, or all if fewer. Compare the latest verified revision for each when available. Include `edition_date`, exact repository or production `evidence_url`, and six `images` with `sha256`, `layout_family` and `treatment`. The latest November 25 revision is the layout-correction receipt, not the older unchanged image package. Every story's `prior_matches` has one match per set with `edition_date`, `image_sha256`, and concrete `visual_comparison`. Compare to the nearest visual match rather than an arbitrary different image. Do not infer pixels from manifest labels.
- Existing pre-PR admission validates dates, current image and contact-sheet bindings, the counts and prior comparisons. Keep at least four families, a maximum of two per family, a different mix than the preceding edition, and at least three visibly changed layout-and-treatment combinations against that edition. The existing rendered AAR now displays the silhouettes and nearest comparisons. Validation checks consistency of supplied observations, not the artwork itself.

## P1 deployment visibility and retry evidence

The existing initial image, final status, and metadata-only recovery deployments share a single bounded, exact-attempt visibility check. It retains the previous two-list agreement, at least eight polls with settling, and three consecutive matches before deployment. It also rejects disagreement on artifact IDs and archives JSON with the actual elapsed wait, probe count, missing-list observations, endpoint errors, and result. There are no new deployments, jobs or paid checks. A failed check must not invoke Pages deploy. Keep existing native images and exact release/recovery safeguards on retry.

In the normal image AAR, use `rollout_observation.artifact_deployments[]` with `evidence_ref`, observed `visibility_wait_seconds`, and `deploy_outcome` (`deployed`, `artifact_missing`, `other_failure`, or `unknown`). Read the actual attempt evidence and deploy log before assigning a cause. A missing poll is not a failed deploy. Omit an unobserved value rather than assume zero.

## P2 first seven eligible editions

Use the current verified Pages history tree and the existing image worker/result artifacts:

```sh
node scripts/report-image-layout-rollout.mjs . history/site 2026-11-26
```

Use the edition under review instead of the example date. This reads and reports the first seven eligible editions from the history job index including pending packages, with explicit nulls where the actual records are missing. It does not run a producer or create an edition. In the existing after-action.json, use `rollout_observation.owner_intervention` (`owner_directed` or `none_observed`) only with a concrete `intervention_evidence_ref`. Missing means unknown, not unattended. Use observed usage only. Keep daily rollout observations current and review the first seven eligible cohorts through the existing `change_evaluations` AAR mechanism. Report distinct layout count, largest repeated family, changed combinations, first-pass accepts, attempts, owner intervention, usage, verification and any known visibility waits or missing-artifact failures. On the seventh eligible edition, disposition each approved register entry with exact evidence and mark incomplete comparisons inconclusive. Do not wait until the seventh to fix a current failure. The November 25 correction is context only.
