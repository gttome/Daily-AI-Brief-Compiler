# Daily Compiler Architecture — Current External-App Boundary

Updated: 2026-10-09.

The Compiler publishes the verified editorial Brief independently of optional premium image generation. An existing external app reads the [prompt](external-app/Brief_Compiler_Image_App_GitHub_Prompt.md) and the GitHub image job, creates and reviews six article-specific images, and returns six exact PNG binaries plus the manifest/reviews to GitHub. The Compiler validates the package and performs protected image-only publication. The executing session remains responsible until all six accepted images are integrated, published and verified on the live dated Brief and permanent articles; GitHub staging is an intermediate checkpoint.

No Work chat, fresh conversation, browser session, named generator, Work porter or new app implementation is required. Source-bound input/output and saved-pixel review replace platform-specific admission claims. Use the existing authenticated GitHub connection first; a routine browser sign-in is not part of startup. The owner's submitted startup prompt authorizes bounded publication while retaining required approval evidence and all release gates. A missing dispatch capability leaves the assignment incomplete. This boundary does not change the daily schedule or activate retired lanes. See [EXTERNAL_APP_HANDOFF.md](../EXTERNAL_APP_HANDOFF.md).

Mandatory explanatory text and article-fit infographic styling follow the [current image specification](external-app/Perfect_Image_Specification.md). Existing job/bundle bytes, accepted images, completed executions and historical evidence remain immutable.

## Historical architecture record — not current external-app instructions

The following earlier architecture is retained as development history. Its D0/D1 activation, Work porter, chat-session and generation restrictions do not govern the current external-app exchange. Do not execute its old activation or migration directions from this reference.


## Mission

The Daily Compiler uses one semantic producer for editorial/content/image decisions and deterministic GitHub validation/build/deploy/verification afterward. It intentionally avoids recreating the legacy production control plane.

## Six coarse stages

1. EDITORIAL — research, evidence, selection
2. CONTENT — stories, media, Watchlist, book mappings
3. IMAGES — D1 Cloud Image Studio after activation; pre-activation legacy renderer remains fail-safe
4. BUNDLE — immutable complete edition package
5. COMPILE — deterministic GitHub validation/build/deploy
6. VERIFY — deterministic preview/live verification

Stages 1–4 are semantic producer work. Stages 5–6 are GitHub-only.

## D1 Cloud Image Studio

D1 is the permanent reader-story target. It separates subjective image creation/acceptance from exact-byte repository transport. The Image Studio runs in a fresh cloud task, accepts and locks six native ChatGPT images, and emits six individual cloud assets plus one acceptance manifest. A narrow Work Cloud Porter then performs `IMAGE_PACKAGE_INGEST` only. GitHub verifies exact identity and publication; it does not repeat visual quality review.

See `docs/D1-CLOUD-IMAGE-STUDIO-AND-OPERATIONS.md`.

D1 remains proof-gated until `daily-compiler-d1-cloud-proof-v1` proves the complete cloud handoff without owner/local transfer.

```text
locked semantic edition
  -> Dot cloud coordinator
  -> fresh Image Studio task
  -> six accepted native images
  -> acceptance manifest
  -> Work Cloud Porter: IMAGE_PACKAGE_INGEST
  -> exact Git identities
  -> deterministic CI/deploy/live-byte verification
  -> BUNDLE_READY
```

No ZIP is required. No visual re-review occurs during Git ingest. Transport, CI, or deploy failures reuse the same accepted image bytes.

## D0 Native Image Capsules — preserved development history

D0 was the prior permanent-reader target. Its proof work is preserved as development evidence, but D1 supersedes it as the recommended architecture because D1 no longer requires clean image generation and Git persistence to coexist inside one isolated invocation.

```text
locked six-story edition
  -> composition reservation plan
  -> Image Packet v3 x6
  -> fresh story-only native capsule
  -> built-in ChatGPT image generation
  -> same-invocation raw-byte persistence
  -> deterministic 1200x630 normalization
  -> exact persisted Visual Review v3
  -> six-image Set Review v3
  -> atomic ACCEPTED_LOCKED x6
  -> BUNDLE_READY
```

The generator capsule must be genuinely fresh and story-only. Prompt text saying "ignore prior context" is not isolation proof. The generated raw bytes must be persisted before the capsule ends. If either boundary cannot be proven, D0 activation fails closed.

The deterministic image processor performs no model calls. It validates raw receipts, normalizes with contain/no-crop semantics, persists exact final candidates, and records structural evidence.

## Proposal 1R role

Proposal 1R is retained for historical evidence, internal architecture diagrams, proof fixtures, status graphics, developer documentation, and deterministic diagram tests. It is not a reader-story fallback for D0.

Existing Proposal 1R editions remain valid historical editions until an explicitly authorized image-only migration replaces their image identities. The October 7 migration must reuse execution `daily-compiler-shadow-2026-10-07` with semantic rework = 0.

## Deterministic compiler boundary

Once state is `BUNDLE_READY`, ChatGPT is no longer required. For a D0 bundle the compiler additionally verifies the complete D0 evidence graph: set plan, packet, clean-capsule admission, raw receipt/bytes, final receipt/bytes, structural PASS, exact persisted visual review, set-review PASS, atomic acceptance, hashes, Git blob identities, versions/cache keys, and supersedes identity.

## Complexity budget

- Primary semantic producer: 1
- Existing recovery invocations: bounded
- Supervisor: 0
- Watchdog Ring: 0
- Writer lease: 0
- Recovery lease: 0
- Worker pools: 0
- Runtime repair workflows: 0
- AI health polling: 0
- Wake PRs: 0
- Owner-liveness prompts: 0
- Dot coordinator: 1 cloud coordinator role
- Work: allowed only for `IMAGE_PACKAGE_INGEST`; target one batch invocation per six-image package
- Codex/paid model API dependencies: 0
- Local-computer dependencies: 0
- Owner-presence dependencies: 0

If a required capability needs prohibited machinery or paid capacity, preserve completed outputs and fail closed.

## State

Each shadow edition uses exactly one authoritative file: `shadow-runs/YYYY-MM-DD/compiler-state.json`.

Legal top-level states:

`ALLOCATED -> PRODUCING -> BUNDLE_READY -> COMPILING -> PREVIEW_READY -> SHADOW_VERIFIED`

Failure terminal: `SHADOW_FAILED`.

No micro-task orchestration state is permitted.

## Runtime repair policy

Active shadow executions do not repair program code. A software/platform defect produces a concise durable blocker/failure receipt and stops. Development fixes occur outside the active execution.

## Operational intelligence

Every run emits structured timing/usage events, resource observations, problem-learning records, run metrics, a post-run analysis, and a dashboard snapshot. Source health/yield, Dot active time, Work active time, image attempts, research queries, CI/deploy timing, retries and wait time are first-class metrics. Charges are not inferred unless an explicit rate card exists.

Future Brief suggestions live in a durable inbox and can target articles, story topics, images, videos, podcasts, Watchlist items or new research resources. Post-publication corrections are additive protected revisions for articles, images, videos, podcasts and Watchlist items; original historical artifacts remain preserved and the original edition execution is not reopened.
