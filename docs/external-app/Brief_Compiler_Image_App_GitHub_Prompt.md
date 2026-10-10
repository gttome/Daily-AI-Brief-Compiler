# Daily AI Brief — GitHub image-production prompt

**Revision 6 — Existing GitHub connection; complete only after all six images are published and verified — 2026-10-09**

This revision incorporates a review of the five latest dated Briefs available on the public site at review time: **October 3–7, 2026**, covering **30 article/image pairs**. The dated calibration notes at the end explain the changes. They are operator guidance, not extra story content for an image generator.

Use my existing image application to retrieve the Daily AI Brief’s image assignments from GitHub, create and upload the six required images, then use the existing Compiler release process to integrate and publish them in the Brief. Do not build or modify an application.

**The executing session owns completion.** This includes the Work session when Work is used, without making Work a platform requirement. Create six valid images, review them, correct every failed image, and repeat generation/editing and review until all six pass every applicable individual and set-level requirement. Routine corrections and retries are already authorized; do not return the work to the owner to fix, ask whether to continue fixing ordinary defects, or stop after a preset number of quality attempts.

**The task is not finished until all six passing images are uploaded to GitHub, integrated into their correct articles in the dated Brief, published, and independently verified on the live site.** Uploads, a merged PR, a queued release, previews or a successful deployment status alone do not satisfy completion. Continue correcting image, integration and publication failures until the complete live result passes; a genuine unresolved access, tool or quota blocker leaves the task incomplete.

**App-independent exchange:** the app reads this prompt and the GitHub job, creates and reviews six images, then copies the six PNG binaries and their manifest/review records back to GitHub. The Compiler does not require a ChatGPT Work chat, a fresh chat, a browser session, a particular image provider or a particular app architecture. Use the app's existing authorized capabilities. Clean story-only generator inputs are required for image quality; they do not mean a particular chat product must be used. The same executing session continues from verified staging through the Compiler's protected image-only publication and live verification. No additional chat is required.

**Readable, meaningful explanatory text is mandatory in every image.** This owner correction supersedes the earlier prompt's textless instruction and the empty-label defaults in the GitHub handoff/job for this image-production task. An empty `visible_text_allowlist` or `labels_authorized=false` means the story's label specification still needs to be completed; it is not an instruction to produce an unlabeled image. Prepare source-faithful labels as described below. Preserve the original GitHub job bytes and hashes, and record this correction separately from the immutable source packet. All other publication, integrity and owner-release gates remain in force.

**Use the existing GitHub connection first.** Read the job, upload binary PNGs, create commits and PRs, and perform supported release operations through the already connected account. Do not require a separate GitHub browser sign-in as a routine startup step. Request authentication only after an actual authorization failure establishes that the connection needs it; lack of a workflow-dispatch tool is a capability limitation, not proof that the owner must sign in. Never request passwords or access tokens in chat.

Before generation, inspect the available publication capabilities and the current repository release workflow. Use a supported authenticated API, connector or already configured automation route when available. The image replacement workflow was manual-only at this revision, and the GitHub tools in the editing session did not expose a new-workflow dispatch action. This prompt does not add that capability or change the workflow. If release cannot be started through an available authorized route, preserve completed work, identify the precise missing capability and report **BLOCKED_INCOMPLETE**. Do not automatically fall back to browser login, fabricate a dispatch or silently change release triggers, permissions or schedules.

**1. Start here and discover the current assignment**

Read the permanent handoff in full:

https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/EXTERNAL_APP_HANDOFF.md

The previous `EXTERNAL_WORK_HANDOFF.md` URL remains a compatibility pointer to the same app-independent handoff. Its filename does not impose a Work requirement.

Perform repository operations only in `gttome/Daily-AI-Brief-Compiler`. The owner-authorized public [Daily AI Brief site](https://gttome.github.io/Daily-AI-Brief/) may be read for article and image comparison. Never modify the `gttome/Daily-AI-Brief` repository or its published site. Historical illustrations are calibration references, not automatically passing examples or substitutes for the current job's evidence.

Read the current image-job index:

https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/index.json

For a new assignment, use `latest_eligible_date` to locate the corresponding `PUBLISHED_PENDING` entry with six stories, then retrieve its `job_url`. Discover the date and story IDs from GitHub; do not require date-specific edits to this prompt. When resuming an identified job, keep its exact edition and accepted work. If its index entry is already `RELEASED_VERIFIED`, verify that job's release receipt and six live results before reporting completion; do not start a different edition or regenerate its accepted images.

Verify the exact downloaded job bytes against `job_sha256`. Retrieve `job.source.bundle_url` and verify its original bytes against `job.source.bundle_sha256`. Confirm the source commit, edition, execution, completed publication evidence, live dated Brief and six permanent story pages as required by the handoff.

Honor any edition-specific authorization gates. If no qualified job exists, report the exact blocker and stop. Do not guess a date, substitute historical stories or treat a published index entry as image approval.

**2. Get each image’s information directly from its story record**

For each of the six `job.stories` entries, read:

- `story_id` and `permanent_url`;
- `complete_compiler_story`;
- `primary_source`, including publisher, original publication date and verified source-read evidence;
- the entire `visual_specification`, including image intent, factual scope and mechanism;
- `expected_stage_path`.

Use the supplied editorial context where relevant. Preserve the existing story and source identity. Do not repeat editorial selection or rewrite the Brief.

Read the complete assigned article, not just its headline, summary card, alt text or existing picture. Use the verified primary-source evidence in the packet and inspect the relevant original source sections whenever the mechanism, sequence, metric, product mode or limitation is not established there. Record the supporting location and access time. If a source has changed or conflicts with the frozen packet, report the discrepancy and resolve the affected claim before generation; do not silently rewrite the source job or illustrate an unsupported interpretation.

Read the quality benchmark:

https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md

**3. Establish what each image must explain**

Before generation, prepare a separate, versioned **article-to-image specification** for each story. Store it with review evidence, bound to the edition, story ID, permanent article URL, primary source, original job hash and recipe version. It must contain:

1. **Visual thesis:** one sentence explaining the article's actual change or contribution: what enters, what happens, what leaves, and why the mechanism matters. For an education, adoption, investigation or comparison story, describe the real process or relationship; do not invent a software architecture.
2. **Distinctive anchors:** at least two source-supported details that identify this particular article. Generic labels such as “AI,” “data,” “process” and “output” are insufficient. Identify the feature that would be lost if the image could accompany another story unchanged.
3. **Mechanism inventory:** each meaningful component, its role, inputs, operation and resulting state or output. Distinguish a stored artifact from an action, a permission from a result, and evidence from the claim it supports.
4. **Relationship map:** every arrow's origin, destination and meaning. Specify whether it carries data, triggers an action, changes state, provides evidence, enforces a constraint or represents a comparison. Record any condition or branch. Do not treat every connection as a pipeline or feedback loop.
5. **Evidence map:** link every factual component, label, arrow and number to a specific source section or packet passage. Record whether it is a reported feature, measured result, future plan, recommendation or explicitly conceptual illustration. Geometry may be explanatory; it must not imply undocumented hardware or behavior.
6. **Exact visible-text specification:** all required wording, placement targets and source support, following section 5.
7. **Exclusions and limitations:** tempting but unsupported interpretations, omitted scope, and qualifications that must remain visible when their associated claim appears.

Use this evidence table in the review record; do not print its identifiers or source bookkeeping inside the artwork:

| Visual element / exact label | Source location and supported claim | Visual role and relationship | Qualification / prohibited inference |
|---|---|---|---|
| Populate separately for every story | Specific section or packet passage | Input, transformation, output, control, evidence or comparison | Scope, condition, uncertainty or unsupported extension |

**Article alignment rules**

- Preserve the article's actual sequence and boundaries. Put a required approval before the action it governs. Show interrupted and resumed state distinctly when relevant. A blocked or rejected path must not appear to become an accepted result without a supported recovery step.
- Show a return arrow only when a real return, retry or feedback relationship is supported. Test evidence does not automatically rewrite a reusable skill; usage feedback does not automatically train a model. Bidirectional arrows require support in both directions.
- Bind each metric to its exact subject, unit and scope. First-token or first-partial latency is not end-to-end task latency. Keep necessary qualifiers such as “reported,” “target,” “first partial” and “just over.” Do not turn a training target, adoption count or proposed feature into a measured performance outcome.
- Use only source-established product modes, versions and options. Do not invent an extra mode to balance a diagram or populate a gauge.
- Separate recommendations in the Brief's implications from functionality already implemented by the product. A suggested audit practice is not evidence that an automatic audit system exists.
- Do not use shields, seals, checkmarks, padlocks or “verified” labels to imply guarantees the source does not make. Citation linkage is not proof of truth; an investigation is not a finding of liability; attestation has a specific scope, not unlimited assurance.
- Keep failure, uncertainty, handoff and incomplete states where they are material to the story. Do not manufacture an all-success ending for visual neatness.
- When several features are announced together, separate their mechanisms and link them only where the source does. Shared branding is not evidence of shared synchronization or a common data plane.

**4. Compose and generate the six images**

**Plan the set, then generate and review one image at a time.** Before the first generation, reserve a story-appropriate composition, visual grammar, palette family, hierarchy and annotation approach for each of the six stories. The operator can compare this plan and accepted visual signatures; each generator sees only its own assignment. After each generation, review article alignment, mechanism depth, text, palette and composition, record the outcome, and preserve accepted bytes before moving to the next story. Recover and review an existing pending candidate before spending another attempt.

Use the app’s existing supported image-generation workflow with a separate clean story-only context for each image. Give each generator only that story’s evidence, mechanism recipe, exact completed label specification and neutral quality rules. Do not supply the other five stories, historical illustrations, the calibration appendix or another story's draft as generator context.

Produce six different, source-faithful, premium textbook/editorial mechanism illustrations, each an exact **1200 × 630 PNG** with a white or near-white background. Follow the benchmark: at least 12 meaningful components, 3–5 major regions, two visible internal mechanism substages, at least two supported evidence/constraint/provenance/feedback relationships, physicalized flows, approximately 80–90% useful canvas coverage and crisp dimensional technical linework.

**An infographic-like appearance is expressly allowed when it best explains the specific article.** It may use annotated comparisons, timelines, taxonomies, quantitative relationships, structured panels or a hybrid of these with a dimensional mechanism illustration. Explain the choice in the story specification. Keep the established factual, text, detail, hierarchy, readability and file requirements. A clear two-dimensional comparison need not imitate a machine; reserve depth for where it helps. The restriction is against generic, sparse or repetitive graphics, not against infographic styling itself. A data chart must use verified values, units, scales and qualifications; never invent data to fill a panel.

Show feedback only when supported by the source. No people, faces, humanoids, logos, decorative branding, photorealism, dashboard/card templates, decorative filler, pseudo-writing or unsupported facts. Accurate product or organization names may appear as necessary explanatory text in the frozen label specification.

Choose the composition from the article's structure:

| Article structure | Suitable visual organization | Required distinction |
|---|---|---|
| Event-driven workflow | State transitions with a conditional approval branch | Trigger, persisted state, pause, decision and resumption |
| Comparison or telemetry defect | Separate, clearly named comparison lanes | What differs, why it differs and the resulting evidence |
| Evidence-grounded synthesis or evaluation | Traceable claim-to-evidence relationships | Claim versus source, expected versus observed, pass versus mismatch |
| Security or privacy mechanism | Explicit trust boundaries and conditional gates | Who holds data or keys, what is checked and what is released |
| Training or organizational adoption | Supported progression or service relationships | Practice, assessment, deployment and support without invented software machinery |
| Multi-feature announcement | Distinct coordinated regions | Separate features; shared links only where documented |

These are composition choices, not mandatory template layouts. Select one based on the story; do not force six unrelated stories into the same chamber-and-pipe drawing.

Before generation, use the completed five-Brief calibration or a bounded operator-only sample of accepted historical art to understand the range of visual approaches. Do not repeat a broad archive review for every story or feed unrelated images to the generator. Share a professional white-background editorial standard across the set, while varying the dominant palette balance, object family, perspective, connector treatment and explanation structure where the article supports it.

Reserve and then verify these set targets: **six distinct composition signatures; at least four layouts, four diagram grammars, four hierarchy patterns, three annotation patterns, four dominant palette families and four mechanism metaphors; no more than two images using the same primary grammar or generic input–engine–output arrangement.** These reconcile the stronger composition thresholds in the Perfect Image specification with the variation after-action. Count visible differences, not renamed metadata. Never distort an article just to satisfy variety; revise the composition plan or record a genuine constraint before generation.

For each accepted image, record its actual visual signature: `story_id`, `visual_grammar`, `layout_signature`, `composition_signature`, `dominant_palette`, `mechanism_metaphor`, `major_object_family`, `connector_style`, `hierarchy_pattern`, `annotation_pattern`, `perspective_style`, `evidence_representation`, `feedback_pattern`, image SHA-256 and review status. Do not use the same rounded panels, translucent materials or blue/green/purple/orange balance across all six merely because an earlier prompt did.

Make physicalized flows explain something: identifiable artifacts enter a visible operation and emerge in a changed state. Use depth, exposed internals, controlled color and clear spatial hierarchy to make those relationships legible. Avoid oversized housings, bolts, gears, neon pipes, repeated blank pages, fake interface rows and buildings that merely symbolize a topic. They do not count as meaningful components or mechanism substages.

The benchmark's density and component requirements never authorize fabrication. Count distinct explanatory roles, not repeated decorative objects. Develop supported detail to meet the benchmark while preserving readable text and clear relationships. If the evidence cannot support the required richness, report a recipe/benchmark conflict before generation; do not invent steps or quietly waive the requirement. Useful coverage means occupied explanatory space, not a giant enclosure around a sparse diagram.

**5. Include mandatory explanatory text**

Before generating each image, derive a nonempty exact visible-text allowlist from that story's verified evidence. This task authorizes the app to draft the explanatory labels; it does not require the owner to supply the wording. Label the inputs, key internal stages, transformations, outputs and relevant evidence or constraints so the mechanism can be understood. Show and label feedback only when the source supports it.

- Use concise, accurate words and short phrases tied to actual parts and relationships in the image. A title alone does not satisfy the text requirement.
- Prefer roughly 6–9 purposeful short labels as a starting point; add labels when needed to explain the article clearly. Each exact label should be unique, trimmed, no more than eight words and no more than 80 characters. Include useful titles, legends, units or qualifiers in this nonempty list when needed; the list controls wording, not whether explanatory text is allowed. No blank placeholder rows or fake tiny paragraphs.
- Use source terminology where accurate and readable. Do not invent technical claims, metrics, outcomes, unsupported feedback or decorative captions to fill space.
- Label the article's distinctive mechanism, not just generic region headings. Where an arrow or gate could be misunderstood, label its condition or operation. If a number is shown, its subject, unit and necessary qualification must be readable in the image.
- Plan the text alongside the mechanism geometry. Keep it legible at the intended display size, with clear contrast, consistent typography, safe margins and enough space to avoid clipping, overlaps or tiny writing.
- Freeze the exact wording and spelling in a versioned, story-specific label specification before generation. Bind that specification and each label's source support to the story ID, original job SHA-256 and build-recipe version in the review evidence. Keep repository identifiers and hashes out of the generator's visible-image content.
- Instruct the generator to include all required labels exactly as specified and no other readable characters. A missing label list requires completing this preparation step; never use a blank list as a shortcut to textless generation.
- Record the authority truthfully: the owner requires explanatory text, and the app prepared the exact source-supported wording. Do not claim that the owner separately reviewed or approved every label, the final image or a production release.

**Text acceptance is part of image acceptance.** Inspect the exact persisted PNG pixels for all required labels, correct spelling, faithful meaning, readability, placement and absence of extra text or pseudo-writing. A textless image, a title-only image, or an image with missing, garbled, illegible or unsupported labels fails. OCR may assist, but it does not replace visual inspection. Preserve rejected candidates, record their defects, correct them and repeat review until they pass.

If a repository validator cannot represent this owner correction, report the specific contract conflict without falsifying metadata or reverting to textless images. Do not rewrite the immutable source job to make its original label fields appear different.

Record failed attempts honestly and preserve successful work across interruptions. Do not regenerate an otherwise valid accepted image because transport or file-validation tooling failed. If a previously accepted candidate has a real quality defect, including missing mandatory text, preserve its original bytes and review history, create a corrected version with an explicit supersedes record, and review the new version. Never count the defective version as passing or silently overwrite its evidence.

This owner instruction supersedes the earlier four-attempt cap, bounded-repair stopping rules and any legacy instruction to stop with fixable quality failures. There is no fixed quality-attempt limit for this assignment. Use targeted corrections that address observed defects; if the same defect persists, revise the source-grounded recipe or rendering approach rather than repeating an unchanged request. Wrong-subject or cross-story contamination requires a fresh, clean story-only generation request; preserve the failed output as evidence.

Actual platform quotas, authentication failures, missing eligible source data, unavailable required tools or exhausted authorized service capacity must be reported truthfully as **BLOCKED_INCOMPLETE**, with exact remaining work and a durable resume checkpoint. Do not claim completion, fabricate a PASS, bypass access controls or purchase new services. Resume from that checkpoint when the blocker is resolved. An ordinary failed image review is work to correct, not a blocker that ends the assignment.

Use the existing app's authorized generation, pixel-review and GitHub transfer capabilities. This prompt does not authorize new paid services, account changes, owner-assisted transfers or an app build. If a necessary capability is unavailable, report that capability precisely; do not describe absence of Work mode as a blocker.

**6. Review article alignment before accepting an image**

**Mandatory correction loop:** generate or edit → save the candidate → review its actual pixels against every requirement → record precise defects → correct the failed parts while preserving passing features → save a new version → re-review the whole image for defects and regressions. Continue until the image passes. Version any necessary label/specification correction with source support; do not weaken the requirement or change the article's facts to make a failed image pass.

After all six pass individually, review the complete set. If the set fails article pairing, variation, readability or any other applicable requirement, identify the responsible images, correct them, re-review each changed image, and repeat the full set review. Preserve unaffected passing images. A later review may supersede an earlier acceptance if it identifies a real defect; preserve the old version and history and lock only the corrected passing version for final delivery.

Inspect the actual saved PNG alongside that story's complete article, evidence map and exact label list. Review the pixels, not merely the generation prompt or a model's claim of success. Record a result and concrete evidence for each check:

- **Identity:** the edition, story ID, article, source and intended image path agree. A repeated topic on another day does not justify reusing its binding.
- **Specificity:** the visual thesis and at least two distinctive anchors are visible. Apply a title-swap check: if the image could explain another story with only a title change, it needs a more specific mechanism.
- **Causality:** trace each arrow from origin to destination and explain its meaning from the source. Check gates, branch outcomes, trust boundaries and any return loop. No backwards approval, unsupported automatic learning or failed evidence entering a successful result.
- **Fact and scope:** every factual label, number, mode, outcome and depicted operation has support. Conditions, uncertainty and the difference between plans and delivered features remain intact.
- **Text:** all required labels are present, exact, readable and correctly attached. Examine both full resolution and the actual article display size. Reject clipping, tiny print, spelling errors, pseudo-text and titles used in place of explanation.
- **Visual explanation:** internal transformations are visible; the image is not a collection of labeled boxes, generic UI panels or decorative machinery. Complexity helps understanding and does not hide missing content.
- **File:** the actual PNG decodes and is exactly 1200 × 630 with the required encoding. A CSS display size, filename or prompt instruction is not evidence of its pixel dimensions. Complete any workflow-permitted export before review and hash locking; do not stretch artwork or crop off explanatory content to pass.
- **Accessibility:** provide substantive alt text describing the actual mechanism, key components and important relationship, rather than repeating the headline. Store it with the image's review metadata; it does not substitute for visible labels.

A semantic or text failure blocks acceptance regardless of visual polish or component count. Record a specific defect, correct the affected recipe and image, and repeat full review until all applicable checks pass. Do not mark all checklist items PASS from one overall aesthetic judgment.

Perform a six-image comparison after the individual checks: verify the correct article/image pairing, six distinct files, and genuinely appropriate compositions. Distinct hashes prove different bytes, not different explanations. Do not introduce factual changes merely to make repeated subject matter look different.

Compare the actual six images against the reserved signatures and variation targets. Record separate judgments for professional finish, meaningful detail, explanatory mechanism, annotations, visual depth where useful, hierarchy, composition, story specificity and differentiation. An overall score or successful PNG validation cannot stand in for those judgments. Prefer correcting the later candidate that repeats an already passing layout. If correcting an earlier image is necessary to satisfy the full set, create an explicitly versioned successor and preserve the prior accepted bytes and review history. Do not regenerate unaffected passing images.

**7. Copy the actual PNG binaries back to GitHub**

The destination repository is:

https://github.com/gttome/Daily-AI-Brief-Compiler

Use a dedicated **unprotected staging branch based on freshly resolved `main`**. Reuse an existing matching job branch when resuming verified work. Record the actual branch name and commit SHA.

For each PNG, use the exact `expected_stage_path` supplied by its story. The required pattern is:

`external-image-packages/YYYY-MM-DD/images/<exact-story-id>.png`

Save the package manifest at:

`external-image-packages/YYYY-MM-DD/manifest.json`

Derive the date and filenames from the verified job. Upload real PNG binaries through authenticated GitHub access—not screenshots, links, base64 text files or files merely renamed `.png`.

Read the current package requirements before constructing the manifest:

https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/scripts/stage-external-image-package.mjs

Use its `external-compiler-image-package-v1` contract, including the original job and bundle hashes, source commit, execution, current expected Pages-history head, six story/file bindings, byte counts, SHA-256 hashes, Git blob hashes and genuine review evidence. Include the versioned article-to-image specifications, evidence maps, label specifications, actual visual signatures, alt text, this mandatory-text correction and saved-pixel alignment/text/set-review results with the package's review evidence, using schema-supported fields or referenced review files. Do not invent manifest fields that violate the contract. No Work-session receipt, fresh-chat proof or app-internal execution architecture is required. Do not fabricate legacy `actual_work_session` fields. An outdated validator that still demands them is a Compiler compatibility defect, not a reason to require a different app.

After committing the images, read their exact Git blobs back and independently download their raw bytes using the exact commit SHA. Verify PNG structure, required encoding, 1200 × 630 dimensions, byte counts, SHA-256 and Git blob SHA-1. Require six distinct image hashes.

Visually inspect the exact persisted PNGs and perform the independent six-image set review. Only mark `accepted_locked` when the required saved-pixel checks genuinely pass. Never fabricate PASS results or overwrite accepted evidence. A necessary quality correction is a new reviewed version/commit with the prior immutable commit, hash and supersedes relationship retained; it is not silent mutation of the old accepted bytes.

Recheck each persisted PNG against its corresponding article and label specification after upload. Verify the committed manifest binds that exact file hash to the correct story and `expected_stage_path`; do not rely on filenames alone. If transport fails, retry transport of the accepted bytes rather than regenerating the image.

**8. Verify all six images in GitHub, then continue to publication**

Continue uploading and correcting transfer problems until GitHub contains all six final reviewed PNGs at their exact job paths. Read each file back from the final package commit and verify its bytes/hash, dimensions, story binding and matching review evidence. Confirm the committed manifest points to those same six final versions and that the set-review hashes match them. A successful upload of fewer than six images does not complete the session. Transfer retries reuse valid accepted bytes; an actual image defect requires the correction and re-review loop above.

Mark verified staging as an intermediate checkpoint only: **STAGED_VERIFIED_CONTINUING**. It requires six individual PASS results, final set PASS, six exact-commit upload/readback verifications and a matching committed manifest/review package. Continue immediately to the publication stage below; it is not the completion status.

**9. Integrate, publish and verify all six images before finishing**

The executing session owns the complete result. The external image app supplies the PNGs and package; the Compiler's existing image-only release mechanism integrates and publishes them. These are stages of the same assignment, not a requirement to start another chat or stop after staging.

**Publication authority:** when the owner submits this startup prompt as the assignment, it authorizes the selected eligible job's image-only publication after all six images pass review, including the normal protected PR, merge and existing release workflow. Preserve that actual owner instruction as the authorization evidence and bind the release record to the exact job, manifest and six accepted image hashes once available. Do not ask for the same routine publication permission again. This authorization does not claim that the owner personally inspected the artwork, supply missing historical evidence, waive a required repository approval, or permit bypassing branch protection or failed checks. Record only facts and approval evidence that actually exist.

Read the current release workflow and its contracts before preparing the release:

- `.github/workflows/external-image-only-replacement.yml`;
- `scripts/check-external-image-release-gates.mjs`;
- `scripts/stage-external-image-package.mjs`;
- the preparation, finalization and live-verification scripts referenced by that workflow.

1. Resolve current protected `main`, the exact Pages-history head, existing job/package branches, relevant PRs and release runs. Resume valid completed work. If the selected job is already released, verify that exact release and all six live images; do not regenerate the images or switch editions while resuming.
2. Prepare truthful owner-release evidence under the current schema, linked to the actual owner authorization and bound to the exact job and manifest. Preserve all edition-specific prerequisites and October 8 historical protection. Never set legacy Work-session, source-publication or review fields to true merely to satisfy a validator. A stale or incompatible gate is a specific blocker to report, not permission to fabricate evidence.
3. Open or resume the package PR. Run the required validation on its actual current head; fix supported package or image defects, re-review changed images and repeat affected validation. Preserve unaffected accepted image bytes. Merge only through the normal protected process after all required checks and repository approvals pass.
4. Start the existing authorized image-only release using the verified edition, PR number, PR head SHA, merge SHA and Pages-history head. Use an available supported authenticated route as described in the connection instructions. Monitor that exact run through deployment and finalization; resolve ordinary failures and safely retry without repeating a successful release. Do not reset the original edition execution, rewrite articles, alter schedules, weaken release controls or modify `gttome/Daily-AI-Brief`.
5. Independently retrieve the live dated Brief and all six permanent story pages from the Compiler's published site, using the job and release evidence to resolve their URLs. Verify the Brief contains all six correct images, each permanent article contains its matching image, and no assigned slot still shows a pending placeholder, broken image or stale version.
6. Retrieve each final live PNG and verify its SHA-256 against the accepted GitHub bytes and manifest, along with its PNG encoding and actual 1200 × 630 dimensions. Check article-to-image binding, visible mandatory labels, legibility and rendering at desktop and mobile sizes using actual rendered-page evidence. A GitHub file link, HTML reference, cached screenshot or CI assertion alone is insufficient.
7. Confirm the release's finalization/index state and preservation checks succeeded, including unchanged editorial content and the 17 protected October 8 public objects. If the live site has changed but release finalization failed, record that partial state, repair it safely and do not deploy the same images blindly again.

**The task is not finished until all six passing images are uploaded to GitHub, integrated into their correct articles in the dated Brief, published, and independently verified on the live site.** Uploads, a merged PR, a queued release, previews or a successful deployment status alone do not satisfy completion. Continue correcting image, integration and publication failures until the complete live result passes; a genuine unresolved access, tool or quota blocker leaves the task incomplete.

Report **PUBLISHED_COMPLETE** only after six individual reviews and the final set review are PASS; all six GitHub uploads/readbacks are verified; the protected integration and release succeed; and all six matching images are verified in the live dated Brief and their permanent articles. Use **IN_PROGRESS** or **BLOCKED_INCOMPLETE** otherwise. These are session-report labels, not new manifest schema values. A blocked report must preserve the exact branch, commit, hashes, PR/run IDs, completed checks and next recoverable action.

Return:

- the live dated Brief URL and selected edition/job URL;
- the protected package PR, merge commit and successful release-run links;
- the committed manifest and immutable GitHub links for the six accepted PNGs;
- a six-row table with story ID, permanent article URL, live PNG URL, SHA-256, image-review PASS, GitHub readback PASS and live publication verification PASS;
- the final set-review result, desktop/mobile display checks, historical-preservation result and verification time;
- `PUBLISHED_COMPLETE` only if every completion requirement passed, or the exact remaining blocker and resume checkpoint.

A documentation change or this prompt's wording is not evidence that a release occurred. Do not claim completion until the actual live result has been checked.

---

## Calibration appendix — review completed 2026-10-09

**Operator and reviewer reference only. Do not put this appendix or the historical images into an individual image-generation context.** It documents why the requirements above changed; it does not authorize editing historical editions or make these dates the next production assignment.

### Coverage and file findings

Read the five complete dated Briefs and all 30 linked permanent story pages; visually inspected all 30 associated PNGs; checked relevant primary-source sections for the disputed mechanisms below. This was not a new editorial selection exercise or a full independent investigation of every primary-source claim.

| Dated Brief | Article/image pairs reviewed | PNGs actually 1200 × 630 |
|---|---:|---:|
| [October 7, 2026](https://gttome.github.io/Daily-AI-Brief/briefs/2026-10-07/) | 6 | 5 |
| [October 6, 2026](https://gttome.github.io/Daily-AI-Brief/briefs/2026-10-06/) | 6 | 0 |
| [October 5, 2026](https://gttome.github.io/Daily-AI-Brief/briefs/2026-10-05/) | 6 | 0 |
| [October 4, 2026](https://gttome.github.io/Daily-AI-Brief/briefs/2026-10-04/) | 6 | 0 |
| [October 3, 2026](https://gttome.github.io/Daily-AI-Brief/briefs/2026-10-03/) | 6 | 6 |
| **Total** | **30** | **11** |

The 30 image URLs matched their respective permanent story-page references and produced 30 distinct SHA-256 hashes. **Nineteen files were not exactly 1200 × 630.** Their decoded dimensions were 1730 × 909 (10), 1731 × 909 (3), 1199 × 630 (2), 1200 × 600 (2), 1734 × 907 (1) and 1733 × 907 (1). These measurements concern the files retrieved during this review, not all historical versions. URL consistency and distinct bytes do not establish semantic alignment.

### Specific alignment corrections

These are visual-review findings and recommendations. Where a drawing is ambiguous, the issue is the inference a reader could reasonably make, not a claim that the artist intended that inference. The linked story pages identify the reviewed article and illustration; the source links establish the relevant mechanism.

| Reviewed illustration | Observed problem or risk | Required treatment in future images | Primary-source basis |
|---|---|---|---|
| [Oct 3 — voice agents](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-03/voice-agents-get-a-100-millisecond-head-start/) | The 100 ms gauge sits with a response-loop label, suggesting whole-agent response time. | Bind timing to the first partial transcript; distinguish partial output, revision and downstream response. Preserve “just over” if using the reported timing. | [Microsoft model announcement](https://microsoft.ai/news/our-first-streaming-transcription-model/): latency concerns initial partial transcription, not the complete voice-agent loop. |
| [Oct 3 — private federated learning](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-03/federated-learning-gets-a-public-privacy-proof/) | Generic encrypted updates and secure aggregation dominate; the public policy log and conditional key release are absent. | Show encrypted client data, public policy commitments, checks before key release, protected computation and scoped privacy controls. Avoid an unconditional privacy-proof badge. | [Google Research explanation](https://research.google/blog/toward-provably-private-learning-from-federated-data/): public transparency and policy-bound key management are central contributions. |
| [Oct 5 — code-review API](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-05/copilot-code-review-becomes-an-api-with-adjustable-effort/) | A low/balanced/high gauge adds a mode not established by the linked announcement; the flow can imply automatic merge. | Use only source-established effort modes and the documented review output. Do not add a merge action merely to finish the pipeline. | [GitHub announcement](https://github.blog/changelog/2026-10-02-copilot-code-review-api-support-and-new-default-effort-level/): names Lite and Balanced; describes API review configuration. |
| [Oct 6 — Workspace features](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-06/workspace-turns-prompts-into-images-canvases-and-cross-app-work/) | A shared synchronization rail across three work areas suggests universal synchronization. | Separate image editing, Sheets/canvas interaction and cross-app tasks. Confine the two-way synchronization relation to the supported pair. | [Workspace feature announcement](https://workspace.google.com/blog/product-announcements/september-2026-workspace-feature-drop): the explicit bidirectional synchronization is between a spreadsheet and its canvas. |
| [Oct 7 — ambient agents](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-07/ambient-agents-turn-events-into-resumable-human-approved-workflows/) | The action, approval and resume routes are hard to trace and can imply approval after the governed action. | Show event intake, persisted work, a conditional pause for human input, and resumption leading to the next permitted action. Keep blocked and successful routes distinct. | [AWS implementation](https://aws.amazon.com/blogs/machine-learning/building-ambient-agents-with-amazon-bedrock-agentcore-from-event-driven-signals-to-human-in-the-loop-workflows/): human input can interrupt a session and resume it before the subsequent action. |
| [Oct 7 — Android CLI](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-07/android-cli-packages-device-workflows-as-reusable-agent-skills/) | A physical gripper and an evidence-to-skill return arrow suggest hardware actuation and automatic skill rewriting. | Explain reusable instructions, CLI operations, remote device access and returned test artifacts. Show software/device control; omit unsupported self-modification. | [Android developer announcement](https://android-developers.googleblog.com/2026/10/android-cli-device-streaming-and-skills.html): documents device streaming through secure ADB and agent-friendly device workflows. |
| [Oct 7 — Frontier Academy](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-07/claude-frontier-academy-targets-forward-deployed-engineering-skills-gap/) | Generic project panels obscure the distinctive educational progression. | Show simulation-based practice, a graded practical, a 12-week real-project residency and final assessment. Keep enrollment goals separate from achieved outcomes. | [Anthropic announcement](https://www.anthropic.com/news/claude-frontier-academy): describes that progression and a future training target. |
| [Oct 7 — Copilot telemetry](https://gttome.github.io/Daily-AI-Brief/stories/2026-10-07/copilot-metrics-expose-hidden-agent-telemetry-failure/) | Generic version/schema lanes do not identify the missing attribution signal or limits of the fix. | Compare affected client reporting with restored IDE identity reporting. Show the effect on usage attribution; do not imply historic backfill or a billing correction. | [GitHub telemetry notice](https://github.blog/changelog/2026-10-06-update-your-ide-to-restore-agent-activity-in-copilot-usage-metrics/): missing IDE identity caused omissions/misclassification; prior data cannot be backfilled and billing was unaffected. |

Across the other reviewed illustrations, retain the useful white backgrounds, visible labels, color-traced relationships and varied compositions. Strengthen the exposed mechanism: citation maps should distinguish source support from guaranteed truth; database evaluation should compare observed state with expected outcomes and make mismatches visible; adoption and training stories should show the supported organizational process rather than decorative buildings or generic machinery. Repeated placeholder paragraphs, oversized enclosures and unlabeled internals should not be counted as explanatory detail.

**Acceptance priority:** factual alignment and correct relationships; mandatory readable text; visible mechanism; visual quality; exact final bytes and packaging. Every requirement still has to pass. A beautiful image with the wrong mechanism is not acceptable.
