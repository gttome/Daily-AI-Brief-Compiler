# October 24, 2026 — approved AAR improvements, deduplicated implementation

**Scope:** gttome/Daily-AI-Brief-Compiler only. **Approved:** owner, October 24.
**Prospective controls:** editions October 25 onward. **Historical images, job bytes, receipts, and reader pages:** unchanged.

## Audit: nine requests against existing controls

| ID | Existing protection retained, not duplicated | Verified gap / scoped implementation |
|---|---|---|
| P0-1 Article freshness | 168h hard ceiling, 72h fallback, eight genuine dated source candidates from five domains and explanations for every >24h selection in `compiler/recent-source-discovery.mjs` | Oct25+: if at least one genuinely fresh (<24h) researched source exists, each older selected story must identify at least one of those actual reviewed URLs in its existing fallback comparison. Do not select filler or infer dates. Report selected vs considered freshness truthfully. |
| P0-2 Video quality and diversity | Six reviewed substantial candidates from three source publishers; playback, ad/exposure, teaching evidence, seven-edition rotation and two-publisher exception already guarded by `compiler/production-evidence.mjs` and `compiler/media-quality.mjs` | Oct25+: exceptions permitting two videos from one publisher may cite only alternatives already independently documented in the six-candidate pool. Keep real playback limitations and content quality ahead of artificial publisher quotas. |
| P0-3 Image first-pass quality | Six source-grounded frozen specs, 40px safe margins, >=22px effective label size, native source-connector evidence, factual review, unlimited correction until six passes | Rev8 handoff adds an explicit October 24 defect-prevention pass: separate training/game-time and evidence/steering paths; no success trophies, invented dashboards/charts/outcomes, anthropomorphic scenery, simulated writing or unapproved glyphs. Actual saved pixels and all 24 reader contexts remain the acceptance authority. Do not re-render accepted PNGs. |
| P1-4 Binary integrity | `scripts/reassemble-fixed-offset-image.mjs` already decodes each 256-KiB segment separately, rejects invalid lengths/padding, checks SHA-256/Git blob and valid PNG before reuse. Manifest and Git readback gates exist. | **Retain**. No duplicate second transport system or regeneration. |
| P1-5 Checkpoint consistency | Final closeout already checks six hashes and released lease | Oct25+: `scripts/worker-checkpoint-consistency.mjs` compares worker phase, bound job, actual generation total, 6 accepted, rejected count, six story IDs/SHA-256 across worker/manifest/release/AAR, and the sum of per-story attempts. Disagreement prevents the unified report from claiming COMPLETE; it does not alter accepted assets. |
| P1-6 Operational AAR | One existing consolidated deterministic operations report; image-package push CI already disabled while exact-head PR CI is required | Correct the renderer's omitted **published-watchlist** input. Show actual current-edition duplicate-title count when a dated snapshot is present. State missing historical avoidable-CI failure counts as **not independently audited**, citing PR-only admission rather than inventing counts or launching new jobs. |
| P1-7 Task-origin proof | `scripts/task-origin-evidence.mjs` records same-invocation preflight without falsely attesting a first-party scheduler. 19:15 and 21:15 Chicago tasks are retained. | Correct the renderer's omitted **image-task-origin** input. Report capability route evidence but continue to distinguish it from authenticated scheduler provenance. Do not create another task. |
| P2-8 Weekly usage | Existing `scripts/owner-usage.mjs` validates optional owner-supplied per-cycle usage; no carry-forward and no account inference | **Retain**. Unknown is Not reported. No metered or paid telemetry. |
| P2-9 Mobile legibility | Full-size reader zoom and 24 actual desktop/mobile pixel reviews; all required source-bound labels >=22px at original 1200x630 | Oct25+: every frozen image spec explicitly prioritizes two or three approved labels with >=30px planned effective text size (plus the original 40px safe margin). Native generated PNG and thumbnail/full-size inspection must still prove visual PASS; the plan is not itself a pixel certificate. |

## Non-negotiable operational invariants

- Six articles, exactly 2 technical / 2 applied / 2 nontechnical agents (one Agent Skills); two videos and two podcasts.
- Existing protected `main`, **one image-package PR** with exact-head CI, existing image-only public release, 24 saved-pixel reviews.
- Accepted October 24 images, all historical edition routes, 17 pinned October 8 objects and existing job/manifest source hashes are unchanged.
- Existing 19:15 Compiler and 21:15 image worker (America/Chicago) unchanged.
- **No** added scheduled jobs, new CI fan-out, paid APIs, browser automation services, TinyFish, Work/Codex production calls or extra usage-metered systems.
- Missing source, actual playback, first-party scheduler identity, account usage or historical CI-cause evidence remains **UNKNOWN / UNPROVEN**; never retroactively invented.

## Acceptance for the next cycle

Protected PR validation must pass the targeted retrospective + prospective regression tests. A newly sealed Oct25+ bundle with older sources must document genuine recent alternatives when researched, same-publisher videos must cite real prequalified competing episodes, pre-generation image specs must identify >=30px priority labels, and the unified AAR cannot mark a final image cycle COMPLETE with contradictory generation or hash records. The reporting-only lane now consumes the existing Watchlist and route receipts when their edition dates match.

This is a forward-only, no-rework hardening plan. It is **not** evidence that October 25 has published or that a human has accepted new image artwork.
