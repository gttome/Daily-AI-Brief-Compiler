# Daily AI Brief Compiler

Independent shadow/challenger system for producing the Daily AI Brief as one immutable semantic edition bundle, followed by deterministic GitHub validation/build/deploy.

## Isolation

- Official production remains `gttome/Daily-AI-Brief`.
- This repository has no authority to modify production repository state, schedules, Pages, branches, or execution records.
- No Supervisor, Watchdog Ring, writer/recovery leases, worker pools, wake PRs, or runtime repair framework.
- No Work, Codex, paid model API, alternate account, owner upload, or owner-liveness dependency.

## Modes

- **BOOTSTRAP**: build this repository and execute feasibility gates F0/F1/F2. No shadow edition is required.
- **PRIMARY PRODUCER**: after development authorization, allocate exactly one shadow edition for a target date.
- **RECOVERY**: resume only an existing nonterminal shadow edition; if none exists, exit without mutation.

## Development authorization

Full Daily Compiler development is authorized only after all three feasibility gates pass:

- **F0** Scheduled ChatGPT can autonomously persist a proof file to this repository.
- **F1** Scheduled/native ChatGPT can generate a real PNG, persist exact bytes, and verify Git/readback identity with zero owner intervention.
- **F2** A committed disposable `BUNDLE_READY` fixture autonomously triggers deterministic GitHub validation/build with no ChatGPT involvement.

See `docs/ARCHITECTURE.md`, `docs/ISOLATION-BASELINE.md`, and `docs/EDITORIAL-CONTRACT.md`.
