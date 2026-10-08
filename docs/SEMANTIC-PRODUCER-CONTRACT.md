# Semantic Producer Contract

The Daily Compiler uses one semantic producer for EDITORIAL, CONTENT and the semantic image specifications needed by IMAGES. D1 delegates visual generation/acceptance to a fresh cloud Image Studio and exact-byte repository transport to a narrow Work Cloud Porter. GitHub owns deterministic integrity validation and compilation. The producer operates only in `gttome/Daily-AI-Brief-Compiler`.

## Primary and recovery behavior

For target date `YYYY-MM-DD`, inspect Compiler state first and reuse the existing execution. Recovery never allocates a duplicate execution and never redoes valid completed editorial/content work.

Accepted images are immutable. Accepted/locked image bytes and identities must be reused exactly. D0 does not lock individual images early: an individual visual PASS becomes `REVIEW_PASS_PENDING_SET`, and only a set-review PASS creates the atomic six-image `ACCEPTED_LOCKED` record.

## EDITORIAL and CONTENT

EDITORIAL persists the candidate evidence and locked six-story selection. CONTENT persists stories, media, Watchlist and book mappings. Completed semantic outputs are not replayed merely because image work is incomplete.

For new output, set `state.research_cutoff_at` once during unfinished EDITORIAL, before progressing to CONTENT. Retain that exact timezone-qualified value in the editorial evidence, bundle and every media record. The existing progress-preservation guard rejects changing or removing it, or assigning it after EDITORIAL. Later source retrieval does not extend the cutoff. Preserve absence in historical states; do not retrofit terminal history.

### Bounded source research during unfinished EDITORIAL

Read the approved resource registry through `readSourceSnapshot` in `operations/source-discovery.mjs`. This verifies the exact policy, current route qualifications and their recorded evidence. The historical directory provenance remains separate. Follow [Source discovery](SOURCE-DISCOVERY.md) and use `source:plan`, `source:replay`, `source:research` and `source:validate-editorial` for the existing semantic pass.

Build the source plan before acquisition using the frozen state cutoff and the edition's reference date. Every Tier 1/always-check and mandatory-topic resource remains due, including an unqualified route whose failure must be recorded. Tier 2 rotates across three edition dates; Tier 3 across seven, with explicit topic acceleration. Calculate the unique endpoint/publisher/cutoff groups first, then the finite primary-plus-approved-alternate budget. A budget conflict retains the omitted due rows explicitly. Resolve the budget or an approved cadence change without claiming complete coverage.

Issue one primary metadata request per due group, with at most one publisher-evidenced approved alternate after a failure. Use one shared acquisition limit across the semantic execution: the provided callback executor is serial and stays below the policy maximum of four outstanding calls. The response bound covers the returned tool-result record and its retained extraction; origin HTTP transfer size is unknown unless the tool reports it. Do not infer a feed, account, browser, scheduler, origin-fetch timestamp or exact elapsed time from an unavailable capability. Use current tool observations with per-response plan/cutoff bindings. Historical qualification samples and saved-evidence replays cannot stand in for a new edition's acquisition.

The producer supplies topic classification and candidate ranking to `buildSourceResearch` in `producer/source-research.mjs`. That path derives source identity, route eligibility, publication precision, runtime and substantive support from the approved snapshot and the current exact-item evidence. Newly imported resources require a protected qualification grant. Previously enabled Compiler resources keep their approval and may demonstrate current usability through the existing route without an observer changing the registry. Unqualified assisted sources remain visible and ineligible; they create no owner-transfer task.

Retain at most 20 article metadata candidates, 9 deep packets and 12,000 Unicode codepoints across the full serialized article packet array, including its references and fields. Raw pages, excerpts or transcripts cannot hide in metadata or side fields. Preserve balanced qualification across Technical, Applied and Agents coverage, and retain reusable Agent Skills candidates. Before locking EDITORIAL, `validateSourceEditorial` replays the source-bound receipt and enforces six supported selections, two in each focus and exactly one Agent Skills item, the frozen cutoff, original-publication freshness and documented fallback rationales. Save the plan, current observations, coverage receipt, classifications, bounded research receipt and selection evidence with that execution. Reuse valid completed work on recovery.

Video and podcast discovery each have separate limits of 12 retained metadata candidates, 6 evidence packets and 6,000 evidence codepoints. Discovery admission does not set `verified`, select media or waive the existing duration, source-diversity, freshness or reader-value checks below. Qualification samples may be stale or have unknown runtime; such limitations remain visible and cannot qualify a selected item through a Boolean.

Keep `SOURCE_ROLLOUT` separate from the core outcome. A pending source, failed optional route or incomplete rotation does not block a Brief that has sufficient qualifying material. Missing required article/media evidence still fails its existing core gate. Source observations report access, editorial yield and due coverage separately; they never change active enablement, priority, identity, cadence or the approved snapshot. Proposed changes belong in a later protected configuration revision.

CONTENT uses [the current media contract](MEDIA-CONTRACT.md) for exactly two videos and two distinct podcast shows. Preserve original item/channel/show metadata, direct selected destinations, original publication precision/timezone, exact observed seconds, substantive source support and documented fallback rationales. Run `validateMediaSelection` on the candidate content using the same state cutoff; the sealed bundle compiler calls the same gate through `validateBundleMedia`.

During the existing content pass, review Summary, Why it matters and Connection to the Brief for their different reader purposes and source support, including paraphrased duplication. Persist the bounded `reader_value_review` alongside source observations in `media-evidence.json`, with the current copy hash, selected-story context hash, reviewed-evidence hash, support references, actual review timestamp and separate rationale for each field. A Boolean, three different strings, or a digest alone cannot establish factual or semantic quality. Do not add another reviewing service.

New bundles declare `daily-compiler-edition-bundle-v2`, `daily-compiler-editorial-contract-v2` and `daily-compiler-media-contract-v1`, and bind the retained evidence file by path and SHA-256. Missing qualifying media blocks the core selection; do not lower counts, use stale fill or substitute a podcast-length talk for a short-video slot. Synthetic acceptance fixtures do not qualify a future edition's media.


## IMAGES — D1 Cloud Image Studio

D1 is the target permanent reader-image path after activation.

1. The semantic producer locks six story-specific image specifications and differentiation assignments.
2. The Dot launches one fresh Image Studio cloud task by default.
3. The Studio receives image specifications and the Perfect Image standard only; repository/orchestration context is excluded.
4. The Studio generates, visually reviews and retries candidates as needed, with at most four genuine visual-quality attempts per story.
5. The Studio reviews the six-image set and locks the exact six accepted assets.
6. The Studio emits `daily-compiler-d1-image-acceptance-manifest-v1` binding each story to its cloud asset, filename, Git target path, dimensions, byte count, SHA-256, attempt and composition signature.
7. The Dot hands the six individual assets and manifest to Work Cloud. No ZIP is required.
8. Work operates only under `IMAGE_PACKAGE_INGEST`: exact-byte retrieval, structural/hash validation, Git upload, protected PR/CI/deploy/live-byte verification. Work performs no visual-quality review and no generation/editing.
9. A Work/Git/CI/deploy failure reuses the exact accepted assets. It never returns to image generation.
10. The edition can reach BUNDLE_READY only when the D1 activation and exact-byte bundle gate pass.

The image-quality authority is the Image Studio acceptance manifest. GitHub proves asset identity, not aesthetics.

## IMAGES — D0 Native Image Capsules — preserved development path

D0 is usable for reader-story generation only after its activation receipt proves P0-A through P0-F. Before activation, a D0 reader-story path remains blocked rather than pretending isolation or byte capture is proven.

For an activated D0 edition:

1. create and validate the six-image composition reservation plan;
2. create Image Packet v3 for each story;
3. find the first incomplete image operation from durable attempt files;
4. establish a genuinely fresh story-only capsule admission when generation is required;
5. generate exactly one image with built-in native ChatGPT image generation;
6. capture and persist the returned raw bytes before that capsule ends;
7. let deterministic GitHub code normalize to exact 1200x630 and produce structural evidence;
8. review the exact persisted final candidate against the packet and locked benchmark;
9. retry only a genuine rejected candidate, with a new invocation/context and at most four quality attempts;
10. after six individual passes, run Set Review v3;
11. atomically lock all six images;
12. bind exact evidence identities into the edition bundle.

A raw/final/review already persisted must be finished/reused before a new attempt is allocated. Infrastructure/capability failures consume zero visual attempts. There is no low-quality or Proposal 1R reader-story fallback.

The generator capsule sees only one story's generator projection. It does not see other stories, prior images, benchmark assets, publication state, repository paths, run IDs, recovery prose, or orchestration context.

## BUNDLE

`BUNDLE_READY` is fail-closed. A D0 edition cannot seal unless six images are atomically `ACCEPTED_LOCKED`, set review is PASS, every packet/admission/raw/final/structural/review identity validates, exact final PNGs are 1200x630, every image passes the exact-text/people/branding/benchmark requirements, set differentiation thresholds pass, and versions/cache keys/supersedes identities are complete.

After `BUNDLE_READY`, ChatGPT performs no deterministic compilation or publication work.

## Proposal 1R

Proposal 1R remains for historical/internal deterministic diagrams only. It is not an automatic reader-story fallback after D0 activation.

## Runtime software rule

No active shadow edition may modify compiler/workflow/schema code. A genuine code/platform defect preserves completed outputs and stops. Development fixes happen outside the active execution.

Forbidden: Supervisor, Watchdog Ring, writer/recovery leases, worker pools, wake PRs, continuous AI polling, runtime software repair, owner upload/manual transfer, general-purpose Work, Codex, paid model/image API, alternate account, local-computer dependency, or owner liveness prompt. The sole Work exception is D1 `IMAGE_PACKAGE_INGEST` after six images are already accepted and locked.

## Operational learning and observability

The producer and delegated cloud stages record structured timing/usage events. Every material problem is persisted as a problem-learning record with root cause, attempted fixes, actual fix, outcome, timing impact, Work/Dot impact, recurrence, permanent action and regression test. Run close produces metrics plus a post-run analysis of speed, reliability, source yield, image attempts, Work time, Dot time, CI/deploy latency and improvement opportunities.

The producer reads the extensible resource registry and records source observations for articles, videos, podcasts, Watchlist and general research. The producer also reads the future-Brief suggestion inbox before research/selection and records a resolution for each eligible suggestion.

Post-publication corrections are additive protected revisions. They do not allocate a new execution for the published edition and must preserve superseded historical artifacts.
