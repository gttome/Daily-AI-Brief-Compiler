# Daily Compiler feedback store

This is the Compiler-owned reader feedback service. It is deliberately small and independent from `gttome/Daily-AI-Brief` and the legacy Ratings Site.

It stores four public, low-risk signal types:

- five-star ratings;
- reader comments;
- Watchlist votes;
- share/event counters.

The service accepts only Compiler-namespaced item IDs such as `dab-story-compiler-YYYY-MM-DD-...`. It does not require accounts, cookies, reader identities, a production item registry, Supervisor/Watchdog logic, or any semantic processing.

Comments are **not private**. The reader must tell users not to submit personal or confidential information. A bounded public GET endpoint exists so the owner can inspect stored comments without a private administration plane.

Production storage uses a single SQLite/D1-compatible database with the schema in `schema.sql`. The Worker entry point is `worker.mjs`.

The intended public endpoint is configured by the Compiler reader environment. Publication of the service is a deterministic hosting step and must not modify or depend on `gttome/Daily-AI-Brief`.

October 7 preservation rule: deploying this store or rebuilding the reader must keep semantic rework at 0 and accepted-image regenerations at 0.
