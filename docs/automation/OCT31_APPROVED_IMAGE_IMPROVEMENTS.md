# October 31 image-process improvements

The owner approved all three improvements following a read-only comparison of the October 31 AAR with existing controls. This change is prospective: new composition binding and the complete local-export procedure apply to November 1, 2026 and later. No accepted image, historical bundle, schedule, workflow, allocation or paid-service policy is changed.

## Implemented increments

1. **Composition-specific planning.** The existing first-pass validator now invokes `scripts/image-layout-contract.mjs` for new editions. Named regions must contain the actual planned labels; source-bound connector anchors must be inside their corresponding regions, with labeled endpoints matching the label region. A digest binds the exact stored native-generation prompt, reviewed composition, labels, edges and geometry. The prompt must include the unchanged geometry block. Region-to-prompt agreement remains a real semantic review, not a natural-language fact a deterministic validator can prove. Generic unbound plans fail; historical specifications retain their previous rules. The existing package admission calls this same validator, so no new workflow is needed.
2. **Complete local exports.** `scripts/complete-image-export.mjs` waits for the trusted exporter, validates a full RGB/RGBA PNG, persists and verifies the exact bytes, then atomically exposes a new destination without overwriting accepted files. The saved-file adapter requires the completed export identity. Pending exporters, truncation, corruption and competing output writes fail without exposing a partial file. It does not generate, resize, visually approve or publish images. Reuse the original artwork after a transport failure.
3. **One active requirements reference.** Both selected REV8 entrypoints use `docs/external-app/CURRENT_IMAGE_REQUIREMENTS.md`. Competing historical font rules have been removed from active instructions. Historical dated AAR documents are preserved as references. Current 36px/28px planned font floors are shared with code and checked by regression tests.

## Preserved gates and limitations

Real source and saved-pixel reviews, all 24 public contexts, six distinct accepted originals, exact GitHub bytes, protected PR validation, 12 pairings and the 17 October 8 objects remain mandatory. A geometry digest is not pixel acceptance; a complete local-export receipt is not GitHub readback or publication. Scheduler-origin evidence remains diagnostic, never a new admission gate. No change claims to prove unattended origin or account usage.

## Verification and rollout

Run `npm test` using the CI Node 20 runtime, plus `npm run validate:bootstrap`, `npm run fixture:e2e` and `npm run reader:parity`. The new tests cover composition mismatches/stale review digests, historical compatibility, incomplete export visibility, truncated/corrupt files, concurrent/no-overwrite output, and active-document threshold consistency. Existing protected CI must pass on the exact submitted PR head before any separately authorized merge. No production deployment or image re-run is part of this implementation.

## Accepted pre-activation compatibility

The six November 1 specifications were accepted in PR301 (`eff5573cc39ce6c47bdd582e4aa9350e5ac09d92`) before this change reached main. They and all accepted images remain byte-for-byte unchanged. The geometry validator has a closed, code-pinned SHA-256 allowlist of those six entire parsed specifications (`JSON.stringify`, including edition, story, source and reviews). Only those exact objects bypass the **new geometry check**; all preexisting checks remain mandatory. Any changed November 1 specification or later edition still needs the complete bound geometry and exact prompt. This is not a moving cutoff, runtime-discovered exemption, legacy-schema opt-in or permission to regenerate/rewrite accepted art. Further already-published editions encountered before rollout require explicit compatibility review, not silently advancing the effective date.
