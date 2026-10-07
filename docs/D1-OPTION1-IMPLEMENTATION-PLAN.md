# D1 v5 Implementation Plan — Work Cloud Browser → Fresh Regular Chat per Story → Exact Git

## Decision

Adopt the path proven on October 7:

**Compiler → Work Cloud Browser → six brand-new ordinary regular ChatGPT story chats → accepted canonical assets → exact Git persistence/readback → deterministic publication.**

The earlier Dot → separate Image Studio → Work Porter design is superseded for reader images because the separate Image Studio launch/bind capability was not available. Temporary / Unpersonalized Chat was also rejected because native image generation was unavailable there.

## Proven one-image result

The capability proof reached PASS at commit:

`cfdbf828cf18f28e16ad65bdb924b17633646f1c`

It proved:

- authenticated Work Cloud Browser can operate chatgpt.com;
- Work can create a brand-new ordinary regular ChatGPT conversation;
- one sealed story-only prompt can be submitted without repository/orchestration context;
- native ChatGPT image generation works in that regular chat;
- Work can download the exact generated image automatically;
- no owner file transfer or local computer is needed;
- exact bytes can be persisted to Git;
- immutable exact-commit raw GitHub binary readback can independently verify byte count, Git blob SHA and SHA-256;
- no regeneration is required.

## D1 v5 runtime

1. Semantic producer completes editorial/content work and seals six image specifications plus six unique composition assignments.
2. After activation, semantic schedules persist `SPEC_READY` and do not generate images.
3. The separate Work Cloud Browser image lane opens one new ordinary regular ChatGPT conversation per story.
4. Each story chat receives only that story's sealed prompt and quality constraints.
5. Weak candidates may be retried only within that story chat, maximum four genuine quality attempts.
6. Work downloads the selected image automatically.
7. If needed, Work deterministically normalizes to 1200x630; the canonical result is returned to the same story chat for final acceptance.
8. The canonical asset becomes `accepted_locked` and is checkpointed immediately.
9. A later Work continuation resumes from the first unaccepted story and never regenerates accepted stories.
10. After six accepted assets, Work builds the acceptance manifest and ingest handoff, writes exact bytes to Git, and verifies every asset by exact-commit raw binary readback.
11. Deterministic Compiler validation/build/deploy follows after the image gate.

## Full activation proof

The next required proof is the non-production six-image rehearsal:

`rehearsals/d1-six-image-browser-r1`

PASS requires:
- six different regular story chats;
- six premium accepted images;
- zero cross-story conversation reuse;
- exact 1200x630 canonical bytes;
- forced resume after story 2 with zero accepted-image regeneration;
- six unique compositions and hashes;
- exact Git persistence/readback 6/6;
- zero owner file transfer;
- zero local-computer dependency;
- zero TinyFish/paid API/external metered-service dependency;
- no Work-native/subagent image generation.

Only then may `daily-compiler-d1-cloud-proof-v2` be emitted and D1 activated.

## Normal-run autonomy

One-time authentication of the Work Cloud Browser is environment setup. Normal daily execution must require zero owner presence. If the stored session expires, the image lane records `AUTH_REFRESH_REQUIRED` before consuming an image attempt.

## Recovery rule

Never regenerate content or accepted images to fix transport, Git, CI, deploy or verification failures. Accepted bytes are immutable.

## Architecture budget

D1 v5 must not add:
- Supervisor;
- Watchdog Ring;
- writer/recovery leases;
- persistent worker pools;
- wake PRs;
- continuous AI polling;
- runtime software repair loops.

## Scheduling

The existing four semantic schedules remain:
- 19:15 CT primary;
- 21:15 CT recovery 1;
- 01:15 CT recovery 2;
- 05:15 CT recovery 3.

Their count/cadence is unchanged. Before D1 activation they preserve Proposal 1R. After activation they stop at the D1 image boundary rather than competing with the Work Cloud Browser image lane.

## Oct 8 readiness sequence

1. Merge D1 v5 contracts through protected main after CI.
2. Run the full six-image browser rehearsal.
3. Repair only repository-contract defects; preserve accepted assets.
4. If six-image proof passes, emit cloud-proof v2.
5. Apply activation receipt through protected main.
6. Verify existing schedule prompts are synchronized to v2.
7. Admit the October 8 Compiler edition only after activation/readiness checks pass.
