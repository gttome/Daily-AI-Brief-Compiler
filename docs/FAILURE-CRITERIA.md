# Architecture Failure Criteria

Declare architectural NO-GO if normal success requires any of:

- continuous AI monitoring;
- persistent Supervisor;
- Watchdog Ring;
- writer or recovery leases;
- worker pools;
- wake PRs;
- runtime engineering-repair loops;
- owner-managed image transfer;
- paid model/API integration.

During an active shadow execution, a required unavailable platform capability must produce a concise `SHADOW_FAILED` receipt and stop rather than expanding architecture.
