# D0 Pre-Activation Proof Evidence Gate

D0 activation depends on P0-F, so P0-F must be able to validate a complete six-image D0 rehearsal **before** D0 is active. Production publication must still require activation. These are deliberately separate gates.

- `validateD0ImageEvidenceSet` validates the full D0 image evidence graph: set plan, six sealed packets, clean-capsule admissions, exact raw receipts/bytes, deterministic final receipts/bytes, structural gates, Visual Review v3 receipts, set review, atomic acceptance, six unique story identities and six unique byte streams. It does **not** authorize publication.
- `validateD0BundleImages` wraps the same evidence validation and additionally requires the exact proof-bound D0 activation receipt. Compiler BUNDLE_READY/public compilation uses this production gate.
- `scripts/verify-d0-preactivation-set.mjs` is the P0-F rehearsal entry point. It cannot activate D0 or publish a reader.

This removes the circular dependency in which P0-F would otherwise require D0 activation while D0 activation requires P0-F. The separation does not weaken the production bundle gate.
