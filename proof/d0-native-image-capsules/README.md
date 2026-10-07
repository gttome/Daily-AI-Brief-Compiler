# D0 native image capability proof workspace

This directory is reserved for disposable non-production D0 evidence. It must never contain an active shadow edition.

## Two-run pre-proof prompt contract

Each proof run must be created as a **standalone scheduled task**, not a scheduled task inside an existing chat.

Saved prompt template:

> Operate only on gttome/Daily-AI-Brief-Compiler and only on the named disposable D0 proof branch. This is one isolated D0 image-capsule capability run, not an edition and not production. Read the exact sealed story packet named in the run parameters. Do not load any other story, prior image, benchmark image, project instructions, publication state, recovery text, or orchestration context into the generator-visible projection. Generate exactly one image using native ChatGPT Images included in the current subscription. Do not use Work, Codex, any paid model/image API or paid AI service, billable overage, new paid infrastructure, another account, owner upload/manual transfer, or owner-liveness. In the same scheduled run and before yielding, pass the generated image directly as a ChatGPT file parameter to the approved D0 persistence tool. Persist the exact returned bytes to the named immutable proof path, record the plugin-visible anonymized ChatGPT session ID, byte count, SHA-256, Git blob SHA and commit SHA, then read back and verify exact identity. If native image capacity or a required supported bridge is temporarily unavailable, persist only the matching BLOCKED_RETRYABLE receipt and stop; do not substitute another path.

Run A and Run B must use different sealed packets, different canaries, different standalone scheduled runs, different session IDs and different immutable raw paths.

The outer canary belongs in the scheduled-run setup/evidence envelope only. It must never be copied into the sealed generator projection or native image prompt.

After both runs, execute:

`node scripts/verify-d0-capability-proof.mjs <capability-receipt.json>`

Only PASS may authorize formal P0-A/P0-B evidence promotion.
