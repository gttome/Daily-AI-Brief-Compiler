# Iteration completion and next-chat handoff

**Template only — complete from actual execution evidence.** Do not commit the owner’s private inputs.

| Field | Actual value |
|---|---|
| Iteration | Fill iteration number and title |
| Result | COMPLETE / ALREADY_SATISFIED / CODE_PASS_EXTERNAL_PENDING / READY_FOR_ACTIVATION / PARTIAL / BLOCKED |
| Baseline protected SHA | Pending execution |
| Implementation branch and candidate SHA | Pending execution |
| PR and exact-head CI URLs | Pending execution |
| Merged protected SHA | Pending execution |
| Live proof/activation/deployment evidence, where required | Pending execution or explicit not-applicable reason |
| Contract/source/proof versions | Pending execution |
| Files and tests changed | Pending execution |
| Preserved asset/terminal evidence | Pending execution |
| Known blocker or remaining scope | Pending execution |
| Next eligible iteration | Pending execution |

## Evidence checklist

Record each test ID, actual PASS/FAIL/NOT_RUN result, command or workflow/check identity, source commit and artifact/link. Report skipped checks and reasons. A passing unit suite does not satisfy a live capability, image quality, scheduler readback or deployment gate.

## No-rework handoff

State what was already completed before this iteration, what this iteration changed, which accepted assets/proofs must be reused, the first unfinished operation and any external capability still needed. Include branch/commit/path identifiers so another standard GitHub chat can resume without private chat memory. Do not reset proof lineage or retry budgets.

## Independent release states

Preserve CORE_RELEASE_READY, SOURCE_ROLLOUT, OBSERVATION_RELEASE and LEARNING_REPORT separately. Only report fields actually checked. A missing optional report cannot change a valid core outcome.

## Approval boundaries

List any explicit approval still required for activation, schedule mutation, public unpublished previews, hosting or correction. Do not treat this template or another model’s proposal as owner authorization.
