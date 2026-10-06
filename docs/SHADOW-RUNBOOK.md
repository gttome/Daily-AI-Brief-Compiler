# Shadow Runbook

This runbook intentionally stays short.

## Bootstrap mode

Run F0, then F1, then F2. Stop at the first failed feasibility gate. Do not allocate a shadow edition during bootstrap.

## Primary producer mode

After development authorization, resolve the target edition date, allocate exactly one `shadow/YYYY-MM-DD` execution if none exists, then attempt EDITORIAL -> CONTENT -> IMAGES -> BUNDLE. Persist checkpoints and stop at `BUNDLE_READY`.

## Recovery mode

Find the newest nonterminal shadow edition. If none exists, exit without mutation. Read only its `compiler-state.json` first. Resume the first incomplete semantic stage using valid persisted outputs. Never redo completed editorial work or regenerate accepted images.

## Deterministic phase

After `BUNDLE_READY`, GitHub owns validation/build/deploy/verification. ChatGPT is no longer required.
