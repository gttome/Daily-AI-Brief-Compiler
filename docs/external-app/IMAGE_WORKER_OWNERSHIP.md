# Image worker ownership and execution setup

Effective for the October 20, 2026 edition and later. Repository: `gttome/Daily-AI-Brief-Compiler`. This is a coordination correction within the existing image task, not a new scheduler, image provider, permission grant or quality exception.

## Verified incident

The scheduled task `6acac88cff048191ba02e5b2bcb3becb` is attached to conversation `6acab19d-7868-83ea-aa16-d94eeece8c94`. The live task editor shows **Same chat for every run**. That conversation is Work-enabled. The October 19 scheduled worker generated twelve native candidates, accepted six images, returned exact PNG bytes through GitHub and passed package push CI. Its immutable handoff is [53008f6 / final-readiness.md](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/53008f6c42f9c42a207ea7f55d8d64201e88c173/external-image-packages/2026-10-19/reviews/final-readiness.md).

It stopped publication after finding a competing recovery package. The recovery session published the other set through PR #222. Missing image artifacts in an early status check did not prove the scheduled worker lacked tools or had not begun. The October 17–18 scheduled failures instead recorded diagram refusals despite exposed native generation; the existing static-editorial admission clarification remains binding, subject to actual tool restrictions.

Do not claim this evidence proves the exact start time, all future scheduler launches, or a missing capability in any unobserved run.

## Keep the existing execution setup

Keep this same task, attached chat, enabled state, and 21:15 America/Chicago schedule. Keep connected GitHub and native Image Creation available in that chat. Explicitly invoke the imagegen skill for rendering when available; use the connected GitHub tools for repository work. A skill mention or task title does not enable a missing tool.

No chat-type, scheduler-ID, synthetic host-attestation or proof-branch gates are introduced. If the actual invocation lacks a required capability, record the precise missing callable operation, preserve work and report it honestly. Never substitute a paid API, add another AI task, or ask the owner to routinely start another chat.

## Mandatory claim before the first image call

This section applies to the scheduled worker and every manually requested recovery session.

1. Read the exact current-date job and release index. A released edition is verify-only: no generation, replacement or new image PR.
2. Check the actual scheduled conversation/run when accessible, current package branches, open PRs and release workflow progress. A status request is read-only and never authorizes a second producer merely because images or a receipt are absent.
3. Use exactly one canonical candidate branch, `image-package/YYYY-MM-DD-native-primary`, created from fresh protected main **before any native generation**. GitHub branch creation is the atomic claim: only one create may succeed. Do not choose a different suffix after a conflict.
4. The creator immediately commits `external-image-packages/YYYY-MM-DD/reviews/worker-state.json` on that branch. Record edition, immutable job/source hashes, an opaque owner token created for this execution (not a fabricated scheduler identity), actual UTC claim time, lease expiration twenty minutes later, phase `CLAIMED`, generation count zero, accepted hashes, and next action. Read the committed receipt back before the first image call.
5. A caller that finds the canonical branch already present must read and respect its owner. An initializing branch without a receipt is not permission to generate. Recheck after a short bounded interval; do not create an alternate package.
6. Renew the twenty-minute lease and record genuine progress after each candidate/review/upload boundary, or before expiry during other substantive work. Recheck the exact branch head and ownership before every generation call, package write and release action. Preserve already accepted PNGs.
7. Update claims and progress only by a non-force fast-forward with the previously observed head SHA as the expected value. A rejected compare-and-update means ownership was lost: reread and yield, never overwrite or retry blindly.
8. Takeover is allowed only after explicit terminal release by the prior owner, or after the recorded lease has expired, the same branch head is unchanged across observations at least sixty seconds apart, and no package PR/release is actively progressing. Missing receipts alone are not sufficient. Take over on the **same canonical branch** with an expected-head update, preserve valid outputs and the prior ownership history, then recheck ownership before work.
9. A worker losing ownership must not generate, publish, merge, replace images or allocate a second branch. A completed edition stays immutable. Preserve unselected candidates as evidence; never republish them over an already released set.
10. Continue the existing six-image review, exact-byte transport, PRE_PR_PACKAGE_PASS, protected PR/CI/merge, existing image-only deployment and truthful live verification. Ownership is not image acceptance and never bypasses a release gate.

## Status and closure

A status response should distinguish: task enabled; invocation observed; branch claimed; real generation; accepted bytes; PR/CI; deployment; semantic pixel review. Do not infer any stage from another.

Save the actual claim and meaningful progress so the owner can see that the existing scheduled run is moving. Do not require owner prompts for ordinary continuation. A recovery handoff may request the smallest necessary supported action only for a real unresolved capability/access blocker.

The October 19 accepted published package and historical source bytes remain unchanged. This correction does not certify all twenty-four mobile/desktop small-text checks; preserve the honest mobile enlargement finding.

## Validation limit

The updated saved prompt and repository instructions make the common claim protocol concrete and reviewable. They do not constitute an end-to-end successful October 20 scheduled run. The next unattended run must demonstrate claim-before-generation, one producer and protected live completion before that outcome is called proven.

