# D0 Final Proof and Schedule Activation

This file closes the remaining implementation work that does not depend on the missing live P0-A product primitive.

## P0-E

P0-E is a strict first-attempt stress proof. Use at least two valid P0-A-isolated candidates that naturally invite text/branding, such as a terminal/device workflow and an app/workflow/screen/evidence artifact. Each must pass on attempt 1 with:

- exact visible-text allowlist only;
- every required label observed;
- zero missing labels;
- zero extra visible text;
- no logos or branding;
- benchmark-grade exact persisted-asset review;
- zero prohibited dependency use.

Validate with `node scripts/verify-d0-p0e.mjs <p0-e.json>`.

## P0-F

P0-F is the six-story full D0 rehearsal. It requires:

- six distinct story IDs;
- six distinct fresh context IDs;
- six exact raw byte streams;
- six exact final byte streams;
- deterministic 1200×630 normalization;
- six Visual Review v3 PASS results;
- Set Review v3 PASS;
- six unique compositions;
- at least four layouts, grammars and hierarchies;
- at least three annotation patterns;
- no labels-swapped template;
- zero Proposal 1R reader fallback;
- zero prohibited dependency use.

Validate with `node scripts/verify-d0-p0f.mjs <p0-f.json>`.

## Schedule activation

The four final D0-active schedule prompts are stored in `contracts/d0-active-schedule-prompts.json`.

They MUST NOT be applied while `contracts/image-contract.json` is `proof_required`. Apply them only after:

1. P0-A through P0-F formal receipts all validate PASS;
2. the D0 activation receipt is built and digest-bound;
3. protected main merges the contract switch to `activation_status=active`;
4. protected-main CI passes.

The schedule update is then configuration-only. It does not create another execution, re-open October 7 semantics, or regenerate any accepted image.

The current pre-activation schedules may continue to use the legacy shadow image path. Once D0 is active, the stored prompts explicitly prohibit Proposal 1R as a reader-story fallback.
