# Qualification runtime context recognition

## Scope and observed blocker

This is a bounded clarification of the Iteration 7 qualification prompt. It does
not change the normal or correction prompt, image contracts, proof validators,
source request, admission, attempt limits, accepted locks or activation authority.

The existing Work task `6ac6cf14a9e88191af48c353b9bc1e11` retained
[`runtime-context-blocker-20261008T170853Z.json`](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/c66d602e7531cd98e26b52385f72ed013c62f0c5/qualifications/value-image-2026-10-08/evidence/runtime-context-blocker-20261008T170853Z.json)
at commit `c66d602e7531cd98e26b52385f72ed013c62f0c5`, blob
`ac7284ed48cae47144c0f1af0c052561aaee88d4`. Its reported observation time is
`2026-10-08T17:08:53Z`; this is the record's timestamp, not a substituted scheduler
start time.

The record says its environment identified the executor as Codex in Work Mode,
the expected task and saved conversation were found, and Cloud Browser inventory
and read-only ChatGPT homepage navigation succeeded. It stopped because no
independently exposed current-invocation-to-conversation association was
available. Authentication and admission were not checked. Generations, accepted
images and consumed quality attempts were zero; the state and attempt log were
unchanged. Preserve that blocker as historical evidence of this invocation.

## Contract basis

| Existing requirement | Source at protected engine `5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b` |
|---|---|
| Reuse the existing Work task and preserve its saved conversation through task update and readback. | [Image completion contract](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b/docs/IMAGE-LANE-COMPLETION-AND-CORRECTIONS.md), completion-triggered scheduling steps 4–6. |
| Work Cloud Browser coordinates fresh ordinary story chats; subjective image acceptance remains in the same story chat. | [D1 architecture](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b/docs/D1-CLOUD-IMAGE-STUDIO-AND-OPERATIONS.md), Runtime architecture and Subjective quality gate. |
| Actual unattended operation, opaque identities, separate invocations and immutable accepted-lock resume checkpoints are mandatory. | [Qualification evidence](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b/docs/D1-QUALIFICATION-EVIDENCE.md), Required records; [proof validator](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b/image-studio/proof-evidence.mjs), `opaque`, runtime/session checks and resume checks. |

The supplied Iteration 7 `SHARED_RULES.md`, Standard chats and real capabilities,
explicitly preserves the separate existing Work runtime. Its image invariants
still prohibit image generation in the operational implementation conversation.

The conversation-preservation requirement governs the operator's actual task
update/readback. It does not introduce a platform introspection API or require a
platform-issued invocation ID. The proof validator requires opaque identifiers
in the form `ctx-<64 lowercase hexadecimal characters>` and checks their actual
runtime/checkpoint bindings; it does not specify an issuing platform.

The earlier [one-image capability receipt](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/cfdbf828cf18f28e16ad65bdb924b17633646f1c/rehearsals/d1-cloud-proof-r1/browser-proof/receipt.json)
records Work Cloud Browser, authenticated session reuse, ordinary-chat native
generation and exact Git binary readback without a platform invocation ID or
outer-conversation introspection record. Its capability-only scope remains
unchanged; it does not prove current six-image quality or unattended readiness.

## Qualification-only clarification

Require authoritative current Work-mode context, actual Cloud Browser capability
and valid authenticated ChatGPT access before generation. A task title or prompt
claim does not establish these facts. The inherited prohibition on Codex still
forbids a separate Codex task, CLI, replacement runtime or image-generation route.
It does not reject the already-approved Work executor solely because its system
product label contains Codex. This grants no authority to change execution mode.

The operator retains actual readbacks binding the same task, exact prompt and
request, one-shot schedule and unchanged saved conversation. Publish only an
opaque digest of the private conversation identity. Missing or contradictory
binding evidence remains a blocker. The executor is not asked to obtain an
unsupported current-invocation-to-conversation API result.

If a platform invocation ID is exposed, preserve its provenance and publish only
its opaque digest. Otherwise retain `platform_run_id: null`. An evidence-derived
identifier may be `ctx-` followed by the canonical JSON SHA-256 of an immutable
invocation-start record, excluding the identifier itself. That record binds the
actual start observation, existing task, proof/request identities, exact prompt
digest and operator handoff/readback identity. Label the derivation explicitly;
never claim the resulting digest was issued by the platform.

This digest identifies a retained observation; it does not establish execution.
Real runtime observations and the operator's separately observed task runs must
support the two genuinely distinct invocations. Existing before/after checkpoint,
chronology, same-task, first-two-lock and Story 3 generation checks all remain.
Different nonces, hashes, scheduled due times or task updates alone cannot PASS.

## Exact continuation boundary

Continue the same `value-image-2026-10-08` request and its preserved zero-attempt
lineage. A guard-only blocked invocation is not the required two-image resume
proof. The operator may re-arm only the same existing task after its actual
one-hour minimum permits. No new task, immediate-run substitute, polling loop,
future-edition allocation or schedule replacement is introduced here.

The next eligible actual invocation still checks authentication and all-six
admission, processes only the existing sealed story prompts, preserves every
genuine attempt and accepted lock, and stops with two accepted images before
Story 3. A later actual invocation must supply the prescribed resume evidence.
All fourteen companion records, actual canonical pixel reviews, set review and
exact binary readback remain required. This clarification records no image PASS,
full qualification, protected activation or release.
