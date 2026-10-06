# Proposal 1R — Deterministic Professional Diagram Compiler

This experiment preserves the Daily Compiler architecture while replacing only the failed native-image byte-transfer boundary.

## Responsibility split

- Scheduled ChatGPT: semantic diagram design as structured JSON.
- Deterministic GitHub renderer: layout, vector construction, PNG rasterization, hashing, structural validation.
- Scheduled ChatGPT visual review: exact persisted PNG must still be reviewed before acceptance.

The renderer is deliberately not a generic flowchart generator. It uses a qualified editorial grammar with layered surfaces, depth, routed connectors, evidence panels, controlled typography, and fixed collision-safe geometry.

## Proof gates

- F1D — scheduled producer writes a rich semantic `diagram-spec.json`.
- F1R — GitHub deterministically renders exact 1200×630 SVG + PNG and persists a cryptographic receipt.
- F1V — a later Scheduled ChatGPT invocation visually inspects the exact persisted PNG and records PASS/FAIL.

No Supervisor, Watchdog, lease system, worker pool, owner upload, Work, Codex, or paid model API is introduced.
