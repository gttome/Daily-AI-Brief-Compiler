# D1 v5 Six-Image Work Cloud Browser Rehearsal — Execution Handoff

Operate only on `gttome/Daily-AI-Brief-Compiler` branch `rehearsal/d1-six-image-browser-r1`.

This is the full non-production activation proof for D1 v5. Do not access or modify `gttome/Daily-AI-Brief`.

## Read first

1. `rehearsals/d1-six-image-browser-r1/execution-state.json`
2. `rehearsals/d1-six-image-browser-r1/request.json`
3. `rehearsals/d1-six-image-browser-r1/ingest-mapping.json`
4. `contracts/d1-image-contract.json`
5. `contracts/d1-work-browser-prompt.txt`
6. `docs/D1-WORK-BROWSER-SIX-IMAGE-REHEARSAL.md`

Preserve all valid persisted work. Resume the first unaccepted story. Never regenerate an accepted_locked image.

## Proven route

Use only the route proven in the one-image capability proof:

```text
Work Cloud Browser
  -> authenticated chatgpt.com
  -> BRAND-NEW ordinary REGULAR ChatGPT conversation for one story
  -> submit only that story's sealed input
  -> native ChatGPT image
  -> story-local visual quality review
  -> automatic cloud download
  -> deterministic 1200x630 canonicalization if required
  -> final review of the canonical bytes in the SAME story chat
  -> accepted_locked checkpoint
```

Do not use Temporary Chat. Do not use Work-native image generation. Do not use a Work subagent to generate an image. Do not use TinyFish or another metered external browser. Do not use a local computer or owner file transfer.

## Story isolation

For each story create a brand-new regular ordinary ChatGPT conversation. Never reuse a conversation for another story.

The story conversation may receive only:
- that story object from `request.json`;
- the shared quality_policy from `request.json`;
- the exact visible-text allowlist and composition assignment already inside that story object.

Do not expose repository name, Git branch/path, CI, publication state, other story specifications, other generated images, Work instructions, orchestration history, or prior Brief images to the story chat.

## Per-story quality loop

Generate the first candidate.

Then, in the same story chat, instruct ChatGPT to inspect its generated candidate against the complete story specification and quality policy and return a concise machine-readable verdict containing:
- PASS or FAIL;
- story_specific;
- mechanism_clear;
- meaningful_components_at_least_8;
- exact_allowlisted_text_only;
- no_pseudotext;
- no_people_humanoids_faces_avatars;
- no_logos_brands;
- no_photorealism;
- no_overlap_or_clipping;
- composition_matches_assignment;
- premium_textbook_editorial_quality;
- concise defect list.

Work is the browser operator, not the subjective reviewer. Follow the story chat's verdict.

If FAIL, generate a corrected candidate in that SAME story chat. Maximum four genuine quality attempts for the story.

When a candidate passes, download that exact image automatically into the Work cloud environment. Compute dimensions, bytes and SHA-256.

If the native image is not exactly 1200x630, perform only deterministic resize to 1200x630. Do not make semantic edits. Upload the canonical 1200x630 file back into the SAME story chat and request a final review of that exact canonical asset against the same quality rubric. Only a PASS on the canonical asset may become accepted_locked.

Immediately persist a durable per-story checkpoint containing:
- story_id;
- chat_session_id / conversation URL or stable identity;
- cloud/generated asset identity when available;
- filename;
- canonical width=1200;
- canonical height=630;
- bytes;
- SHA-256;
- Git blob SHA when persisted;
- composition_signature;
- visible_text_allowlist;
- accepted attempt number;
- visual_acceptance=PASS;
- accepted_locked=true;
- owner_intervention=false.

## Resume proof

After story 2 is accepted_locked, deliberately re-read `execution-state.json` and the two durable accepted checkpoints as though resuming after interruption. Prove the next work is story 3 and that stories 1-2 need no generation. Persist the resume-proof evidence, then continue within this Work task.

Do not regenerate story 1 or 2.

## After six accepted stories

Build `daily-compiler-d1-image-acceptance-manifest-v2`:
- exactly six images;
- six unique story IDs;
- six unique chat_session_id values;
- six unique SHA-256 values;
- six unique composition signatures;
- quality_gate_location=`fresh_regular_chat_per_story`;
- set_review PASS with six unique story chats/compositions/byte streams and at least four distinct layouts/mechanisms;
- owner_intervention=false.

Build the v2 ingest handoff using the existing mapping and repository script.

Persist the exact six canonical PNGs to the target paths.

For every persisted PNG perform independent binary readback from a `raw.githubusercontent.com` URL pinned to the exact immutable commit. The GitHub connector's UTF-8 file content reader is not valid binary readback evidence.

For all six require:
- readback bytes equal source byte count;
- readback SHA-256 equals accepted manifest SHA-256;
- `git hash-object` equals recorded Git blob SHA.

Then build `daily-compiler-d1-work-porter-receipt-v2`, set execution state to GITHUB_VERIFIED, and build `daily-compiler-d1-cloud-proof-v2`.

The cloud proof may be PASS only if:
- Work Cloud Browser was used;
- authenticated cloud session was used;
- Work-native image generation=false;
- Work-subagent image generation=false;
- six fresh regular conversations were used;
- six native ChatGPT image assets were accepted;
- prior conversation reuse=false;
- owner transfer=false;
- local file transfer=false;
- archive/ZIP dependency=false;
- exact accepted assets preserved=true;
- exact-commit binary readback PASS 6/6;
- owner_intervention=false for normal execution;
- local_computer_used=false;
- prohibited paid dependencies used=false.

If the proof passes, persist the exact proof artifacts and stop. Do NOT activate D1 in this rehearsal branch; activation happens separately through protected main after review of the PASS proof.

## Failure handling

On a browser/session/Git/platform failure, preserve accepted_locked assets and record the smallest exact blocker. Never return to image generation for a transport/Git/CI/readback failure. Do not redesign the architecture during the rehearsal.

If the Work Cloud Browser authentication has expired, record AUTH_REFRESH_REQUIRED before consuming an image generation.

## Completion report

Return:
- PASS / BLOCKED;
- accepted images X/6;
- unique story chats X/6;
- native generation attempts by story;
- rejected quality attempts;
- accepted-image regenerations (must be 0);
- owner transfer/local computer/TinyFish/paid API use (all must be false);
- resume proof result after story 2;
- exact-byte Git persistence 6/6;
- exact-commit readback SHA/blob/byte matches 6/6;
- cloud-proof path and commit;
- any remaining blocker.
