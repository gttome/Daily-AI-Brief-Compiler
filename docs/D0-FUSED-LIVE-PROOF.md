# D0 Fused Live Proof

Purpose: finish P0-A, formal P0-D, P0-E and P0-F from **one six-image non-production D0 rehearsal** once the missing zero-cost native capsule primitive becomes available.

This is the no-rework path. Do not run separate image generations for P0-A, P0-D or P0-E after a valid P0-F six-image set already contains the required evidence.

## Six-image allocation

All six candidates must independently prove the P0-A isolation boundary and P0-F full-set requirements. At least two candidates are designated `stress_case=true` and are intentionally chosen to invite text/branding failure; those two must pass on attempt 1 and become P0-E evidence. The first exact persisted candidate also supplies formal P0-D story-bound review evidence.

Therefore the live proof generation budget is:

- six native candidates total for a passing first-attempt set;
- not 2 for P0-A + 2 for P0-E + 6 for P0-F;
- quality retries occur only when a real visual-quality attempt fails, and remain bounded to four per story;
- infrastructure failures consume zero visual attempts;
- no P0-B or P0-C rerun.

## Candidate evidence

Each candidate binds:

- unique story, run, task, nonce, packet and context identities;
- exact sealed prompt SHA-256;
- outer-context canary identity and zero leakage;
- correct story subject;
- raw and final byte identities;
- exact persisted Visual Review v3 evidence;
- exact text allowlist observation;
- no branding/logos;
- benchmark-grade result.

The six candidates collectively bind Set Review requirements: six unique compositions and byte streams, at least four layouts/grammars/hierarchies, at least three annotation patterns, and no labels-swapped template.

## Promotion

After the fused receipt validates PASS, run:

`node scripts/promote-d0-fused-proof.mjs <fused-proof.json> proof/d0-native-image-capsules/formal`

This deterministically derives:

- P0-A PASS from all six clean isolated runs;
- formal P0-D PASS from an exact persisted story-bound reviewed candidate;
- P0-E PASS from the two first-attempt stress candidates;
- P0-F PASS from the full six-image set.

Promotion performs zero image generations.

P0-B and P0-C remain the already-completed immutable proofs. Once the four promoted receipts are present, the six-proof completion gate can build the activation receipt.
