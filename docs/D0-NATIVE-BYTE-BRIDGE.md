# D0 Native Image Exact-Byte Bridge

Status: transport mechanism proven in non-production; clean-capsule proof remains separate.

## Purpose

D0 needs the exact native ChatGPT Image bytes durably persisted before the image capsule yields. The zero-cost bridge is:

```text
native ChatGPT image
  -> runtime generated file ID
  -> already-connected Google Drive upload (ephemeral)
  -> Drive raw-file fetch with complete base64
  -> GitHub Git Data create_blob(base64)
  -> tree + commit + compare-and-swap branch update
  -> Git blob readback identity
  -> delete ephemeral Drive file
```

Google Drive is a transient byte shuttle only. GitHub remains the durable system of record. The bridge introduces no new paid infrastructure, no paid model/image API, no alternate account, no owner file transfer, and no owner-liveness step.

## Live transport-only preflight

On 2026-10-07 a disposable native ChatGPT image was generated, exposed by the runtime as a generated file, uploaded through the already-connected Drive action, fetched as complete raw bytes, persisted to the Compiler proof branch through Git Data, and verified byte-for-byte before the Drive file was deleted.

The source runtime image and Drive-fetched copy had the same:

- byte count: 1,111,336
- SHA-256: `19f91e28bd11e0bc62c2917cfcf030cbe395a614299931e6c3641afd25a9e9aa`
- Git blob SHA: `ab5652d40906f2f5e6f2964d06808d3b2ce4f08b`

GitHub persisted the raw asset under `proof/d0-native-image-capsules/transport-only/raw.png` with that exact Git blob SHA. The ephemeral Drive object was then deleted.

This preflight proves the risky P0-B transport primitive: native generated-file handoff and exact-byte persistence can work without owner transfer or paid capacity. It deliberately does **not** prove P0-A clean-session isolation and does not self-promote to formal P0-B.

## Production capsule rule

A production-capable D0 capsule may use this bridge only when all of the following are true:

1. the native image result exposes a runtime generated file ID in the same ChatGPT run;
2. the Drive connection is already authorized and the action requires no owner approval;
3. the Drive object is created only as an ephemeral shuttle;
4. raw bytes are fetched before the capsule yields;
5. the exact raw bytes are written to an immutable D0 Git path;
6. Git blob identity is verified;
7. the ephemeral Drive object is deleted after successful Git persistence;
8. all cost and owner-intervention flags remain false.

A temporary Drive/tool outage is infrastructure. It consumes zero visual-quality attempts and never opens a paid/manual fallback.

## Isolation remains independent

This bridge solves byte transport, not clean context. P0-A still requires a genuinely fresh standalone ChatGPT run with a story-only generation prompt and independent contamination evidence. The proof workflow must never infer clean isolation merely because byte persistence succeeded.
