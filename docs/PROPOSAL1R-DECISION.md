# Proposal 1R Decision — Historical Reader-Image Architecture

Date: 2026-10-06  
Current role updated: 2026-10-07

Proposal 1R proved that the Daily Compiler could preserve its simple one-producer architecture when a prior Scheduled ChatGPT boundary could not recover exact native-image bytes in a later invocation. It used rich semantic diagram specifications plus a deterministic GitHub diagram renderer and exact persisted-asset review. That evidence remains valid and must not be deleted.

The owner-approved permanent reader-story target is now **D0 Native Image Capsules**. D0 uses a genuinely fresh story-only native image capsule, built-in ChatGPT image generation included in the existing subscription, same-invocation capture/persistence of exact raw bytes, deterministic 1200x630 normalization, exact persisted Visual Review v3, locked benchmark comparison, six-image set review, and atomic acceptance.

D0 activation is fail-closed and requires P0-A through P0-F live non-production proofs. A failed clean-context or same-invocation-byte proof stops activation.

Proposal 1R remains allowed for historical accepted Compiler editions, internal architecture diagrams, proof fixtures, status graphics, developer documentation, and deterministic diagram tests.

Proposal 1R is not allowed as an automatic reader-story fallback after D0 activation, as rescue after native capacity/generation failure, as replacement for an exhausted four-attempt D0 story, or as a way around failed D0 isolation/byte-persistence proof.

Existing October 7 Proposal 1R assets remain live and untouched until all six D0 replacements pass independently and as a set and the authorized atomic image-only migration is ready.

## Executable routing

`scripts/render-pending-images.mjs` reads the protected image-contract activation state. Before D0 activation it preserves the legacy reader-story renderer. After `activation_status=active`, it refuses Proposal 1R rendering for `shadow-runs/**/images/specs/**` and any ordinary rehearsal reader spec. Proposal 1R remains available only for explicit internal fixtures, including the renderer-smoke rehearsal or a rehearsal run root carrying `.proposal1r-internal-fixture`. D0 raw-candidate normalization remains independent and continues through `scripts/process-native-image.mjs`.
