# D1 Work Cloud Browser + Fresh Chat Image Architecture

Date: 2026-10-07  
Status: implementation target; full six-image proof required before activation.

## Proven capability

The October 7 one-image proof established the complete cloud path:

```text
Work Cloud Browser
  -> authenticated chatgpt.com
  -> brand-new ordinary regular ChatGPT conversation
  -> one sealed story-only prompt
  -> native ChatGPT image
  -> automatic cloud download
  -> exact Git persistence
  -> exact-commit raw binary readback
  -> byte count + Git blob + SHA-256 match
```

Proof evidence is preserved on `rehearsal/d1-cloud-proof-r1`. The final one-image PASS receipt is commit `cfdbf828cf18f28e16ad65bdb924b17633646f1c`.

The proof also established two negative results:
- Work cannot launch the originally specified separate non-Work Image Studio task as an API/subagent boundary.
- Temporary / Unpersonalized Chat reported native image generation unavailable.

Therefore D1 v5 uses a **brand-new regular ordinary ChatGPT conversation per story**, operated through Work Cloud Browser.

## Runtime architecture

```text
Compiler semantic producer
  -> six sealed image specifications + six preassigned compositions
  -> Work Cloud Browser image lane
       -> fresh regular Chat #1 -> story 1 native image -> canonical asset -> accepted_locked
       -> fresh regular Chat #2 -> story 2 native image -> canonical asset -> accepted_locked
       -> ...
       -> fresh regular Chat #6 -> story 6 native image -> canonical asset -> accepted_locked
  -> acceptance manifest
  -> exact Git persistence
  -> exact-commit raw binary readback
  -> protected CI / deploy / live verification
```

No Dot is required for the reader-image path. No TinyFish, paid API, local computer, owner file transfer, Supervisor, Watchdog Ring or lease system is introduced.

## Clean-context rule

Each story gets a new ordinary ChatGPT conversation. A story chat receives only its sealed story specification, the Perfect Image policy, its exact visible-text allowlist and its preassigned composition. It never receives repository paths, CI/publication state, prior story prompts, prior story images or orchestration history.

One chat may retry weak candidates for **that story only**. It may never be reused for another story.

## Subjective quality gate

The ordinary story chat is the sole subjective quality gate. Work coordinates the browser and moves bytes but does not make the visual acceptance decision itself.

Before `accepted_locked`, the exact canonical 1200x630 asset must be the asset reviewed in that same story chat. If the native image requires deterministic resizing, the canonical result is returned to the same story chat for final visual acceptance. No semantic edit is allowed during normalization.

Set differentiation is designed before generation through six unique composition assignments and validated after generation by unique composition signatures and byte streams.

## Exact-byte persistence

For every accepted image record:
- story ID;
- canonical filename;
- byte count;
- 1200x630 dimensions;
- SHA-256;
- Git blob SHA;
- composition signature;
- accepted attempt;
- accepted_locked timestamp.

Git binary readback must not use the connector's UTF-8 file reader. The proven readback method is a direct raw GitHub download pinned to an immutable commit, followed by binary SHA-256 and `git hash-object` verification in the Work cloud environment.

## Recovery

Persist after every accepted image. If Work stops after image 2, the next invocation begins at image 3. Images 1 and 2 are never regenerated.

A transport, Git, CI, deployment or verification problem resumes from the same accepted bytes. It never reopens image generation.

## Authentication

A one-time owner sign-in to ChatGPT inside Work Cloud Browser is permitted as environment bootstrap. Normal daily production still requires zero owner presence. Stored authentication may eventually expire; an expiry must produce `AUTH_REFRESH_REQUIRED` before any image attempt.

## Activation gate

D1 v5 remains `proof_required` until a non-production six-image rehearsal proves:

1. six distinct fresh regular conversations;
2. six premium accepted images;
3. no cross-story context reuse;
4. canonical 1200x630 bytes accepted and locked;
5. exact cloud download with no owner transfer;
6. six unique hashes/compositions;
7. interruption/resume without accepted-image regeneration;
8. exact Git persistence;
9. exact-commit raw binary readback for all six;
10. protected validation;
11. zero local-computer or paid external-service dependency.

Only then may `daily-compiler-d1-cloud-proof-v2` be emitted and D1 activated.

## Complexity rule

The image system is one bounded Work image lane plus six isolated ordinary chats. It must not grow a Supervisor, Watchdog, leases, worker pools, wake PRs or runtime repair loops.
