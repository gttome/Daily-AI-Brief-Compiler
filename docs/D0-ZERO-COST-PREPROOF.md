# D0 Zero-Cost Pre-Proof

Status: required before formal P0-A/P0-B and before D0 activation.

## Decision

There is no paid-capacity branch. D0 may use only native ChatGPT Images already included in the user's ChatGPT subscription. Work, Codex, paid model APIs, paid image APIs/services, billable overage, new paid infrastructure, alternate accounts, owner image upload/manual transfer, and owner-liveness prompts are prohibited.

A temporary native-capacity or supported-tool outage is not a visual failure and is not a reason to weaken D0. Persist the blocker as `BLOCKED_RETRYABLE`, consume zero visual attempts, and retry in a later ordinary Compiler invocation.

## Why this pre-proof exists

Formal P0-A and P0-B must not be used as capability-discovery experiments. Current ChatGPT product documentation supports two important primitives:

1. a standalone scheduled task starts a new chat for each scheduled run;
2. ChatGPT plugins can receive file parameters containing `file_id` and a temporary `download_url`, and plugin tool calls include an anonymized ChatGPT session identifier.

The remaining product uncertainty is whether a freshly generated native ChatGPT image can be handed directly to a persistence tool as a file parameter in that same unattended run. D0 therefore proves that bridge in disposable non-production evidence before formal capability receipts are sealed.

## Minimum-image strategy

P0-R1 through P0-R5 use **two total disposable native images**, not a new image for every sub-proof.

- Run A uses sealed story packet A plus an unrelated outer-context canary.
- Run B uses materially different sealed story packet B plus a different unrelated outer-context canary.
- Each run is a standalone scheduled task run/new chat.
- Each run generates exactly one native image.
- Each run immediately hands the generated file to the persistence tool before the capsule ends.
- Each persistence call records the plugin-visible anonymized session ID.
- The two persisted raw byte streams must be distinct.

The same immutable evidence satisfies R1-R5. After deterministic validation passes, formal P0-A and P0-B receipts are **promotions of that evidence** and MUST NOT regenerate the two images merely to repeat the experiment. This reduces image-capacity exposure and eliminates unnecessary failure opportunities.

## P0-R1 — standalone-session primitive

For both runs, require:

- `session_boundary.kind = standalone_scheduled_task`;
- product behavior is new chat per run;
- a nonempty plugin-visible session ID;
- no prior-chat context visible;
- no prior images visible;
- native executor is ChatGPT Images included in subscription.

If a standalone scheduled run cannot start because the platform is temporarily unavailable, record `STANDALONE_SCHEDULED_RUN_TEMPORARILY_UNAVAILABLE` and retry later.

## P0-R2 — isolation canaries

Before each run, the producer may know conspicuous unrelated canary material, but the generator-visible projection contains only the sealed single-story image packet. The proof fails if the generator can see the canary, another story, a prior image, repository/run/orchestration prose, or if the resulting image shows contamination attributable to those materials.

Two materially different packet SHA-256 values and two distinct session IDs are mandatory.

## P0-R3 — native image to file handoff

Immediately after native generation and before the run/capsule ends:

1. address the generated image as a ChatGPT file;
2. call the approved persistence tool with that file as an `openai/fileParams` input;
3. require `file_id` and temporary `download_url`;
4. require the persistence call's anonymized ChatGPT session ID to equal the generation-run session ID;
5. forbid owner download/upload, Base64 copy/paste, cross-chat recovery, or later Library selection.

If ChatGPT does not expose the generated image to the tool as a same-run file parameter, record `PLUGIN_FILE_HANDOFF_TEMPORARILY_UNAVAILABLE` only when evidence indicates a transient product outage. If the product surface fundamentally lacks the capability, keep D0 inactive and research a different zero-cost native bridge; do not activate a fallback.

## P0-R4 — exact-byte persistence

The persistence tool downloads the temporary URL itself, computes byte count, SHA-256 and Git blob SHA, writes the exact raw PNG to a disposable `proof/...` branch/path, re-reads persisted bytes, and verifies both hashes. The write must complete before the generator capsule yields.

The repository receipt must bind:

- generated `file_id`;
- ChatGPT session ID;
- immutable proof path;
- raw byte count;
- SHA-256;
- Git blob SHA;
- commit SHA;
- read-back verification PASS.

## P0-R5 — repeatability

Both runs must pass R1-R4. Require:

- 2 distinct ChatGPT session IDs;
- 2 materially different packet hashes;
- 2 distinct raw byte streams;
- zero contamination;
- zero owner intervention;
- zero paid/prohibited dependencies.

Only then is the capability receipt `PASS`.

## Formal P0-A/P0-B promotion

A validated `daily-compiler-d0-capability-proof-v1` PASS receipt authorizes formal P0-A and P0-B. Formal receipts bind/restate the immutable pre-proof evidence; they do not require fresh generations. This is deliberate: the pre-proof already demonstrated the exact capability and repeatability, while unnecessary regeneration would consume native capacity without increasing confidence.

P0-C through P0-F remain separate proof stages.

## Failure semantics

`BLOCKED_RETRYABLE` is allowed only for explicit transient capability codes in the executable validator. It never authorizes P0-A/P0-B and never consumes a visual-quality attempt. There is no timeout that converts a retryable block into paid capacity, Proposal 1R reader-story fallback, owner transfer, same-chat generation, or architecture expansion.

A true `FAIL` is reserved for contradictory evidence: context/session reuse, actual canary contamination, cross-session persistence, hash/read-back mismatch, or violation of the zero-cost boundary.
