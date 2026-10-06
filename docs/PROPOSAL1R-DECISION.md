# Proposal 1R Decision — Preserve the Daily Compiler, Replace the Image Transport Boundary

Date: 2026-10-06

## Evidence

F0 proved an ordinary Scheduled ChatGPT invocation can autonomously persist durable state to the Compiler repository.

The decomposed image test isolated the next boundary:

- F1A persisted its scheduled start receipt and proceeded into the native-image step without producing a durable failure receipt.
- F1B then proved that the prior generated image was not exposed to the scheduled continuation as an exact-byte PNG asset.
- Durable F1B code: `PRIOR_GENERATED_IMAGE_EXACT_BYTES_NOT_ACCESSIBLE`.
- No owner upload, reconstruction, screenshot, re-render, paid API, or legacy image-control workaround was used.

This means the blocker is the unattended transfer of exact native-generated image bytes into Git, not the semantic ability to design an explanatory image.

## Decision

Continue Proposal 1 as **Proposal 1R**:

```text
Scheduled ChatGPT semantic producer
        |
        v
rich diagram-spec.json
        |
        v
deterministic professional diagram compiler
        |
        v
exact 1200x630 PNG + hash receipt
        |
        v
Scheduled ChatGPT exact-persisted-image review
        |
        v
accepted immutable image
```

The architecture remains one semantic producer plus deterministic GitHub compilation. No Supervisor, Watchdog Ring, leases, worker pool, wake PR, owner upload, Work, Codex, or paid model API is introduced.

## Required proof

Proposal 1R is viable only if all three gates pass:

1. F1D — Scheduled ChatGPT can persist a sufficiently rich semantic diagram specification.
2. F1R — GitHub can deterministically render and persist a professional 1200x630 PNG from that specification.
3. F1V — Scheduled ChatGPT can visually review the exact persisted PNG before acceptance.

Failure of F1V is a product-contract blocker unless an equally strong exact-persisted-asset review mechanism is proven without owner intervention.
