# Semantic Producer Contract

The Daily Compiler uses one Scheduled ChatGPT semantic producer for EDITORIAL, CONTENT, IMAGES and BUNDLE. GitHub owns deterministic image processing and deterministic compilation. The producer operates only in `gttome/Daily-AI-Brief-Compiler`.

D0 Native Image Capsules are implemented but remain proof-gated until the immutable P0-A through P0-F proof receipt authorizes activation.

## Primary mode

For target date `YYYY-MM-DD`, inspect Compiler state only. Reuse an existing same-date execution; otherwise allocate exactly one `shadow/YYYY-MM-DD` execution. Continue as far as possible. Stop only at `BUNDLE_READY` or a genuine platform/software blocker.

## Recovery mode

Recovery never allocates. Read the newest nonterminal `compiler-state.json` first, preserve every valid completed output, preserve accepted image identities exactly, and resume the first incomplete semantic stage. D0 recovery reads immutable image attempt records; it never assumes `images.accepted.length + 1` identifies the next story because acceptance is atomic after set review.

## EDITORIAL and CONTENT

EDITORIAL persists `editorial/editorial.json` containing candidate evidence and the locked six-story selection. CONTENT persists stories, media, Watchlist and book mappings. Completed semantic work is not redone without proof that its durable output is invalid.

## IMAGES — D0 Native Image Capsules

After D0 activation:

1. create and validate one six-image composition reservation plan;
2. create one Image Packet v3 per locked story;
3. find the first incomplete durable image operation;
4. if no raw candidate exists, establish a proven fresh story-only capsule;
5. submit exactly the compiled packet prompt, with no referenced/conversation images;
6. generate exactly one native candidate;
7. capture and persist exact raw bytes before the capsule ends;
8. let deterministic GitHub normalization produce exact 1200x630 `final.png`;
9. review the exact persisted final asset against its packet and locked benchmark;
10. record `REVIEW_PASS_PENDING_SET` rather than locking it;
11. repeat only through separate proven clean capsules;
12. after six individual passes, perform Set Review v3;
13. atomically write `images/acceptance.json` and then update `compiler-state.json -> images.accepted` with all six identities;
14. only then advance to BUNDLE.

Each genuine retry gets a new context/invocation ID. No same-capsule retry. Infrastructure/capability failures consume zero visual attempts. Maximum genuine quality attempts per story is four. No owner fallback and no Proposal 1R reader-story fallback.

## BUNDLE

The bundle is a lossless projection of already persisted semantic outputs. A D0 bundle must set `image_strategy=d0_native_image_capsules` and preserve the atomic acceptance path/digest, set-review path/digest, and for every image: path, SHA-256, Git blob, asset version, cache key, review path/digest, set-review digest and supersedes identity.

`BUNDLE_READY` is fail-closed. It is denied unless six images are atomically accepted locked and the deterministic D0 image bundle gate passes.

After `BUNDLE_READY`, ChatGPT performs no compilation/publication work.

## Proposal 1R scope

Proposal 1R is retained for internal/developer diagrams and historical evidence. After D0 activation it is not an ordinary reader-story generator or emergency fallback.

## Runtime software rule

No active shadow edition may modify compiler code, workflows, schemas or image subsystem code. Development fixes occur outside the active edition. Forbidden runtime machinery: Supervisor, Watchdog Ring, writer/recovery leases, worker pools, wake PRs, continuous AI polling, runtime software repair, owner upload, Work, Codex, paid model API, alternate account, or owner liveness prompt.
