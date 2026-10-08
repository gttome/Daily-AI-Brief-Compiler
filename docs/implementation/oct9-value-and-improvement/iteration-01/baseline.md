# Iteration 1 — Protected baseline

Recorded: **2026-10-08T04:42:09Z**. Repository: **gttome/Daily-AI-Brief-Compiler**.

## Baseline and authorization

Protected main resolved to `1dd128202ddd0c76d026878f8298d258cbfcdb12` before implementation edits. This baseline audit changed no implementation source, active edition, image, attempt record, schedule, or protected ref. These files are derived development records, not new runtime authority or a production prerequisite.

The six required package documents were read completely: SHARED_RULES.md, 01_ITERATION_PLAN.md, 02_IMPLEMENTATION_SPEC.md, 03_ACCEPTANCE_TESTS.md, 04_REPO_READ_MAP.md, and SUPPORTING_DOCUMENTS/Relevant_Plan_Excerpts.md. The integrity command `python3 verify_iteration_package.py` returned **PACKAGE INTEGRITY PASS: 22 files. Implementation tests remain NOT_RUN.** Supporting and historical documents are reference evidence; their old action instructions were not executed. Private source documents are not included in this change.

Iteration 1 is bounded to core protection and six-spec image admission. It does not authorize image generation, a new edition, activation, new schedules, later iterations, or a legacy repository change.

## Protected release rules and live PR inventory

[Ruleset 24610983 — Protect main](https://github.com/gttome/Daily-AI-Brief-Compiler/rules/24610983) is active on the default branch. It requires a pull request and the `validate` check from integration `15368`. Required approving reviewers: **0**. Bypass actors: **none**; current-user bypass: **never**. Non-fast-forward updates and deletion are prohibited. The release uses a normal protected merge with the exact tested candidate passed as `expected_head_sha`.

[Open PR #2](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/2), “Proof Blue/Green state portability on immutable October 6 edition,” is unrelated. Preserve branch `experiment/blue-green-state-portability` at `9d39656ed132d151735e7a9dceaee7aa04bb18aa`; do not combine that experiment with Iteration 1.

[PR #72](https://github.com/gttome/Daily-AI-Brief-Compiler/pull/72) is already merged into `shadow/2026-10-08`, not main. Its candidate was `cb35e97b40410ffd80544409709419e88a3c01c0`; merge commit `8c9204ee46997cf53815237be4e9e0586b2e11bc`, merged at `2026-10-08T02:22:11Z`. Preserve its six explicit owner-selected image supersessions and original image bytes.

## Actual GitHub capabilities

The exposed connector provides `fetch` and `fetch_file`; repository, branch/ref and Git-tree GETs; `create_branch`, `create_blob`, `create_tree`, `create_commit`, and `update_ref`; PR creation/read/update; check/status and workflow GETs; workflow log/artifact inspection and failed-job reruns; and protected `merge_pull_request` with `expected_head_sha`.

No workflow dispatch tool is exposed. GitHub does not provide browser or scheduler controls. Capability discovery is not proof that a write, CI run or external runtime operation occurred. `fetch` returns UTF-8 text and is not a binary transport claim. Serialize repository writes and use the existing protected checks; do not invent unavailable actions.

## Active image contract and core boundary

[D1 contract v5](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/1dd128202ddd0c76d026878f8298d258cbfcdb12/contracts/d1-image-contract.json) has blob `f670afbe0f24d61fecd2d3d66dbba5bd184df177`. It requires **12** meaningful causal components, **1200×630** canonical dimensions, and the existing fresh ordinary story-chat runtime. Normalization is deterministic resize only, and final canonical bytes must be reviewed in the same story chat. R3 uses the same quality-contract blob as this main baseline. Iteration 1 must preserve that floor and normalization rule.

[compiler/compile.mjs](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/1dd128202ddd0c76d026878f8298d258cbfcdb12/compiler/compile.mjs) was inspected by the implementation lead: compilation imports core image validators and has no dashboard, observability or learning module imports. The contract's `observability_required`, `learning_required` and `dashboard_ready_artifacts_required` fields are metadata, not consumed as admission or compile gates. This iteration leaves those broader flags unchanged.

Mandatory source/media support, pixel review, hashes, locks, bundle integrity and live verification remain core evidence. Metric spans, report prose, averages, projections, recommendations, learning reports and dashboards are optional observation. Their failures cannot block valid production. Core validation failures must still fail closed. Evidence flows from core to observer; no observer acknowledgement or production-control authority is added.

## Completed proof to reuse

[The one-image capability receipt](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/cfdbf828cf18f28e16ad65bdb924b17633646f1c/rehearsals/d1-cloud-proof-r1/browser-proof/receipt.json) and [exact-byte readback](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/cfdbf828cf18f28e16ad65bdb924b17633646f1c/rehearsals/d1-cloud-proof-r1/browser-proof/binary-readback-verification.json) are PASS on `rehearsal/d1-cloud-proof-r1` at `cfdbf828cf18f28e16ad65bdb924b17633646f1c`. The old readback blocker at `51292c5245159f680a95bf8f669365af35a5e847` is resolved.

| Preserved identity | Value |
|---|---|
| Proof | `d1-browser-chat-one-image-r1` |
| Asset commit | `88fda64122658c20f04639189fd3f93970389ae3` |
| Asset path | `rehearsals/d1-cloud-proof-r1/browser-proof/d1-proof-01-stress-terminal-evidence.png` |
| SHA-256 | `66f01ee6363a7d63b02320ec0a57f10f67b71287d7378d06e042ec76de8faa04` |
| Git blob | `b1ed862b007b607bfda268e17e620cf0e416cd77` |
| Bytes / dimensions | `1360444` / `1731×909` |
| Generation / regeneration | `1` / `0` |
| Quality acceptance | `NOT_EVALUATED` |

Compatibility is scoped to demonstrated native capability, cloud recovery, Git persistence and exact-byte readback. Reuse this completed evidence without regenerating it. It does not establish canonical-size image quality, six images, full-path resume/diversity, current unattended qualification, activation or release.

## Exhausted proof lineage

| Proof | Exact current head | Genuine quality attempts | Accepted locks | Result |
|---|---|---:|---:|---|
| R1 | `3fadf520ba47ffdcdf585b6a54000ac03d2e0507` | 4 | 0 | BLOCKED |
| R2 quality | `836f0a85b93255d856cfdd8948cb53dc703e1a49` | 4 | 0 | BLOCKED |
| R3 benchmark | `e1efd7fa2b76df315671b442862edee9aab2bfbd` | 4 | 0 | BLOCKED |

All three stop at `stress-terminal-evidence`. [R3 execution state](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/e1efd7fa2b76df315671b442862edee9aab2bfbd/rehearsals/d1-six-image-browser-r3-benchmark/execution-state.json) and its final quality blocker show no accepted asset, acceptance manifest, ingest handoff or cloud proof. R3's earlier infrastructure/automatic-review submission blocker was resolved and consumed zero visual attempts. Its separate single-sample calibration is failed reference evidence, not a Work-browser attempt or activation proof.

Preserve every attempt record. A renamed request, another chat or this admission-code repair does not create a fifth retry. R3's final pixel review passed density and finish but failed explicit provenance/comparator relationships, decision/return paths, controlled release and nondecorative causal geometry.

## Terminal October 8 state and accepted assets

`shadow/2026-10-08` at `e636d34c1a1a7894a75d398a221fec46ab05ba6d` is `SHADOW_VERIFIED`, execution `daily-compiler-shadow-2026-10-08`, strategy `proposal1r_legacy`. Its corrected bundle digest is `8fd69ce4b96e191c6ae68f743dc12f1292840d49f8ec69af792e2d3400bb9cf7`; editorial identity is `git-blob:86c2a33f4d503511690cd970fe14b29cc79d5774`.

Each following replacement is accepted and locked at 1200×630. Its replacement and superseded original Git blobs match the inspected current shadow tree. Full paths, original hashes, supersession records and byte sizes are retained in baseline.json.

| Story | Accepted SHA-256 | Git blob |
|---|---|---|
| realtor-realassist-agent-actions | `0dad7a6a1592cb28bd4ff7c0c686f1a08a92de62557c2559a8387f1bbfcebeb4` | `5fa14a5ce35847a6dd631ab980720cc254a22af8` |
| windows-hybrid-intelligence-copilot | `28b12f2a682f071bdba33fdcb4719afb193e8e7da7e760371f9668c32b1ef768` | `053e7bac8e5ec6df4a8e3803d71d7432c6b19a78` |
| cisco-webex-agentic-collaboration | `f40573aa30dd243bbe0a2a2ff87a1ecad5650abac75391dcb80ca95f973768d0` | `55e4c1dce01fc3b62f336e39675b773f44586724` |
| jump-trading-agentic-quant-research | `d304fce97b1d2f7d821a50edf5db2d2afb2d9411d08c0bd9a9ea5ecaa19354b1` | `f653a0f634eeae2adce3dfbd78c0c516ef39d207` |
| google-developer-knowledge-agent-skill | `dd1dca5333a5e156880f1b575ddae3ec1c42f1656d0be5e879f253903fe1633f` | `a71ae796ee2a72ba875f8742b7df255d1f3ea10f` |
| github-agent-scale-git-infrastructure | `ecf91db50db09f70fd085391494d169dfacf1209f541edd3c690d5d49f46636a` | `88cb567af0773f6cd8c10874ac0b45fd5df6568b` |

The existing reader live-verification record says PASS. This baseline did not repeat live verification and that inspected record has no per-image live SHA-256 readback detail. Preserve the terminal result and evidence without fabricating new live proof.

## Activation, external readiness and exact resume point

Protected main activation remains `proof_required`; activation receipt path and digest are null. The [readiness blocker](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/3b09ef21cfc39e41df915634de9265db16279416/_records/image-lane/2026-10-08T031911Z-readiness-blocker.json) on `operations/d1-image-lane-readiness-20261008T0319Z` at `3b09ef21cfc39e41df915634de9265db16279416` records missing image target binding, required D1 activation proof and an ineligible normal edition strategy. It consumed zero image attempts. Its scheduler-pause statement is repository evidence; current scheduler state was not independently read.

**First unfinished image qualification gate:** current-contract Story 1 pixel-quality acceptance in the complete six-image isolated proof, blocked by the exhausted R3 lineage. The remaining six-image, forced-resume, set-diversity and current unattended proof is absent. Iteration 1 can repair admission independently, but cannot grant a fresh attempt or activation.

Iteration 1 implementation tests are **NOT_RUN at this baseline**. Candidate SHA, PR, merged SHA, candidate CI and IMAGE_SPEC_ADMISSION are unknown until the implementation lead records actual results. Package integrity and a prior one-image capability PASS cannot substitute for those results. CODE_PASS, live proof, activation and release remain separate. After Iteration 1's own protected completion, the next eligible work is Iteration 2 subject to its dependency and authority checks.

Only public-safe derived requirements and evidence references are included; no private chat/session links, account data or private source documents are published.

