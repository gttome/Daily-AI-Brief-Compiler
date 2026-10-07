# D0 P0-A Capability Gap and No-Rework Gate

Status: binding until a zero-cost native clean-capsule path is proven end to end.

## What is already complete

Do not repeat completed work:

- D0 PR1-PR5 are merged.
- The zero-cost native generated-file -> ephemeral Drive -> exact Git byte bridge is proven.
- Formal P0-B is PASS from immutable existing evidence with zero regeneration.
- Run A proved same-run native generation-to-Git transport, but its image was unrelated to the sealed story and therefore is invalid for P0-A.
- Run B correctly stopped before generation when the runtime could not prove exact story-only prompt binding.
- Two later standalone tasks used the sealed Run A image prompt as the entire saved task prompt. Those tasks completed, but the available Compiler tool surface exposes only task metadata/notifications, not the generated result image bytes or pixels. Email notification contains a link to the run conversation, not the result image.

These facts MUST be reused. Do not rerun P0-B, transport preflights, PR1-PR5, October 7 semantics, or the failed control-heavy Run A approach.

## Product findings

Current official ChatGPT documentation establishes:

- Scheduled is the product surface for reviewing task results.
- Standalone scheduled work can be isolated in its own run/new-chat context.
- ChatGPT-created files are saved to Library, while generated images continue to appear in the Images tab.
- Personal task notification email does not itself provide the generated image bytes.
- The Compiler's available Files/Library connector surface does not currently expose those new scheduled-task Images-tab assets.
- The current native image tool exposed to the assistant does not provide a caller-supplied prompt argument; it derives image instructions from conversation context.

Therefore a pure story-only scheduled task is a credible clean-generation primitive, but it is not yet a production D0 capsule: the Compiler cannot currently retrieve and inspect the generated pixels automatically, and invoking the proven persistence bridge requires operational context that would no longer make the generator context story-only.

## P0-A is now three explicit capability gates

P0-A must not be retried until all three are available together:

1. **Pure generator boundary** — the complete generator-visible conversation is the sealed story image prompt and nothing else.
2. **Automated result visibility** — the generated image from that pure run is programmatically retrievable for exact-pixel inspection without owner action.
3. **Clean-capture compatibility** — exact image bytes can be persisted before the capsule yields without adding repository/run/orchestration prose to the generator-visible context.

Passing only gate 1 is insufficient. Passing P0-B separately is insufficient for activation because production must combine clean generation and exact same-invocation capture for the same candidate.

## No-rework retry rule

A new native P0-A generation is authorized only when a product/tool change or newly proven native mechanism supplies the missing result-visibility and clean-capture primitives. Merely changing wording, adding stronger "ignore context" language, rescheduling another identical pure task, or repeating the Run A control-heavy prompt is prohibited.

While blocked:

- consume zero visual-quality attempts;
- preserve all existing proof assets and receipts;
- keep D0 inactive;
- do not alter the October 7 semantic edition;
- do not fall back to Proposal 1R reader images;
- do not introduce Work, Codex, paid APIs/services, billable overage, alternate accounts, owner transfer, or owner-liveness.

## Acceptable zero-cost capability changes that may reopen P0-A

Any one of these product-level changes could justify a new bounded proof attempt, provided it is directly demonstrated first:

- a native ChatGPT Images result/file reference becomes accessible to ordinary Scheduled task follow-up logic without owner action;
- the Images tab becomes accessible through a supported ChatGPT/Library tool with exact generated-byte identity;
- native image generation exposes an explicit caller-supplied prompt or story-only sub-context while allowing post-generation connected-tool actions outside that generator-visible context;
- Scheduled exposes a supported task-run result action that returns the generated image/file reference;
- another built-in, subscription-included ChatGPT primitive provides a genuine fresh image-generation capsule plus exact-byte handoff without paid services or owner transfer.

The proof must demonstrate the capability itself before spending another P0-A image generation.
