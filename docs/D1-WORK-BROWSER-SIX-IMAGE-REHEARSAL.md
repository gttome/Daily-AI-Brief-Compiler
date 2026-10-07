# D1 v5 Six-Image Work Browser Rehearsal

## Goal

Prove production readiness of the new image path before activation. This is non-production and must not touch gttome/Daily-AI-Brief.

## Entry requirements

- protected Compiler main contains D1 v5 contracts;
- Work Cloud Browser authentication is valid;
- six story image specifications are sealed;
- six unique composition assignments are sealed;
- no accepted asset already exists for the rehearsal story unless it is being resumed.

## Procedure

For each story 1 through 6:

1. Open a brand-new ordinary regular ChatGPT conversation.
2. Confirm it is not Temporary and not Work mode.
3. Submit only that story's sealed prompt.
4. Generate and visually review candidates within that story conversation.
5. Maximum four genuine visual attempts.
6. Download the selected native asset automatically.
7. Canonicalize to 1200x630 only if necessary using deterministic resize.
8. If canonicalized, return the canonical file to the same story chat and require final PASS.
9. Hash the canonical file and persist an accepted_locked checkpoint immediately.
10. Never reuse the conversation for another story.

After story 2, deliberately persist a resume checkpoint and prove that a subsequent Work continuation starts at story 3 without generating stories 1 or 2 again.

After all six:

- validate six unique story chat identities;
- validate six unique composition signatures;
- validate six unique SHA-256 values;
- build the acceptance manifest;
- persist all exact canonical PNG bytes;
- read all six back from immutable exact-commit raw GitHub URLs;
- verify byte counts, SHA-256 and Git blob SHA;
- run deterministic D1 package/bundle validation;
- emit daily-compiler-d1-cloud-proof-v2 only if every gate passes.

## Pass criteria

- six accepted premium images;
- zero owner file transfers;
- zero local-computer use;
- zero TinyFish/paid API/external metered service;
- Work-native image generation = 0;
- Work-subagent image generation = 0;
- six fresh regular ChatGPT conversations;
- accepted image regeneration during recovery = 0;
- exact binary readback = 6/6;
- all quality/integrity tests PASS.

## Failure rule

Stop on the smallest irreducible platform blocker. Preserve all accepted_locked assets and do not redesign the control plane during the rehearsal.
