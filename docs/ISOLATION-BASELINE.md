# Isolation Baseline

Recorded: 2026-10-06
Purpose: freeze a read-only reference proving that the Daily Compiler is operationally separate from the official Daily AI Brief production system.

## Official production system

- Repository: `gttome/Daily-AI-Brief`
- Protected main observed SHA: `ad63f6b5799774d48b95a576c1c9936941b35a2a`
- Observation was read-only. No production repository mutation was made.
- Production remains the official publication authority.

## Active production-related ChatGPT schedules observed

- Daily Brief Controller — daily 19:00 America/Chicago
- Daily Brief Watchdog A — hourly at minute 03
- Daily Brief Watchdog B — hourly at minute 13
- Daily Brief Watchdog C — hourly at minute 23
- Daily Brief Watchdog D — hourly at minute 33
- Daily Brief Watchdog E — hourly at minute 43
- Daily Brief Watchdog F — hourly at minute 53
- Watchdog Ring Integrity — hourly membership check
- Daily Brief Live Validation & Repair — daily 08:30 America/Chicago

These are recorded only as an isolation baseline. The Daily Compiler must not alter, depend on, or reuse them.

## Authority boundary

The Daily Compiler may read this historical baseline for comparison. It has no authority to modify the production repository, production schedules, production Pages deployment, production state, or production edition.

Runtime Compiler execution must not require reads from `gttome/Daily-AI-Brief`.
