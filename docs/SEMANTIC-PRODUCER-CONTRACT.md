# Semantic Producer Contract

The Daily Compiler uses one semantic producer for EDITORIAL, CONTENT, IMAGES and BUNDLE. GitHub owns deterministic normalization/validation and compilation. The producer operates only in `gttome/Daily-AI-Brief-Compiler`.

## Primary and recovery behavior

For target date `YYYY-MM-DD`, inspect Compiler state first and reuse the existing execution. Recovery never allocates a duplicate execution and never redoes valid completed editorial/content work.

Accepted images are immutable. Accepted/locked image bytes and identities must be reused exactly. D0 does not lock individual images early: an individual visual PASS becomes `REVIEW_PASS_PENDING_SET`, and only a set-review PASS creates the atomic six-image `ACCEPTED_LOCKED` record.

## EDITORIAL and CONTENT

EDITORIAL persists the candidate evidence and locked six-story selection. CONTENT persists stories, media, Watchlist and book mappings. Completed semantic outputs are not replayed merely because image work is incomplete.

## IMAGES — D0 Native Image Capsules

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

Forbidden: Supervisor, Watchdog Ring, writer/recovery leases, worker pools, wake PRs, continuous AI polling, runtime software repair, owner upload, Work, Codex, paid model API, alternate account, or owner liveness prompt.
