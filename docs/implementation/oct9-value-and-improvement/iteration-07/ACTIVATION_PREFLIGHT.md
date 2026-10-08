# Activation preflight regression repair

## Problem and resulting behavior

The protected baseline `ff38e89f1da7716f3f674ca4582a0f8d10c79154` contained two tests that permanently asserted the preactivation state. A legitimate activation would therefore fail CI even when its complete proof and receipt graph passed. The synthetic qualification fixture also inherited the source checkout's activation metadata, so fixture creation after activation would incorrectly start from an already-active contract.

This repair changes only three test paths. The architecture test retains its quality and execution invariants and requires the existing independent `validateD1Activation` gate whenever the real contract says active. Pending state still requires `proof_required` and null receipt bindings. Readiness tests exercise both states and prove that missing receipts or required evidence remain blocked. The missing-companion test maintains valid outer digests, so its rejection is caused by the missing required runtime companion.

Synthetic fixtures reset exactly the three activation metadata fields on their temporary copy. Every other quality/architecture field is preserved. A fresh-process test starts from a fully activated synthetic source, creates a new pending fixture, validates and activates that fixture, and verifies that the source contract was not changed. Synthetic evidence is explicitly TEST_ONLY and cannot qualify production.

## Verification

[Local test evidence](activation-preflight-tests.json) records **61/61 passing focused tests** in the pending source and **61/61** in a separately activated TEST_ONLY source, with zero failures and zero skipped tests. A broader preliminary run in each environment recorded 618 passing tests and four test-file import failures because the scratch snapshot lacked `sharp`. Those full local runs are retained as environment-limited failures, not PASS.

The existing protected CI installs its pinned dependencies and remains the required candidate and merged-head gate. Its actual results will be recorded separately after they finish. No live image proof or activation follows from a test PASS.

## Release boundary

The accompanying [primary allocation hold](PREALLOCATION_HOLD.md) closes the actual unqualified-allocation path while the existing image task continues. This development change does not activate D1, change quality requirements, supersede an accepted asset, reset a proof lineage, start an edition, or promote a final release engine. The complete actual image proof, protected activation, final-engine delivery, concrete prompt promotion and freeze remain distinct required operations.

