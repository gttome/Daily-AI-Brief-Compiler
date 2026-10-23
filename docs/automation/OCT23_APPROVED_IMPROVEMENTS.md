# October 23 AAR — owner-approved, deduplicated production hardening

**Approved:** October 23, 2026. **Repository:** `gttome/Daily-AI-Brief-Compiler`. **Prospective contracts:** October 24 onward unless otherwise noted.

## Change ledger

| Proposal | Already implemented and retained | Actual gap / new control |
| --- | --- | --- |
| P0-1 Watchlist | IDs, six-rubric evidence, scored topics, historical continuity | Safely disambiguate the two October 23 same-title pairs without deleting records or feedback; reject future active duplicate display titles |
| P0-2 Media dates | Verifiable original dates, signed-out selected-video playback, educational review | Derive new/recent-fallback/evergreen labels from original dates, omit unverifiable podcast host/guest data |
| P0-3 CI | Protected exact-head PR tests and image-package pre-PR admission | Stop launching full CI on every incomplete image-package push; preserve exact-head pull-request gate |
| P1-4 Videos | Source/channel verification, ads/trailer exclusion, episode history, publisher preference | Require evidence for six reviewed substantive candidates across three verified publishers before selecting two |
| P1-5 Podcasts | Distinct shows, 75% AI editorial share, 90% timeline coverage | Require multiple distinct timecoded sections for long episodes; classify original reporting versus synthetic roundups |
| P1-6 Images | Source-grounded six frozen specs, minimum labels, 40 px margin, individual/full-set/24-context QA | Native 1200×630 export planning with ≥22 px effective labels, safe bounding boxes and one verified connector-origin specification per allowed causal edge |
| P1-7 Scheduler | Worker lease/clock separation and existing route-preflight evaluator | Optional per-cycle task-entry and pre-generation route evidence; first-party scheduler claims remain **unverified** without original provider authentication |
| P2-8 Sources | Six distinct original story publishers, 72h/168h source fallback gates | Document at least eight researched original-source candidates, five domains, two unselected alternatives and explicit reasons for sources older than 24 hours |
| P2-9 AAR | **Already present:** single combined report from the existing GitHub read-only reporting lane | Add article recency, distinct media publishers, active Watchlist collisions, and honest task-origin / CI-noise unknowns to the same report |

## October 23 Watchlist decision

The published list has **46 records** with two different pairs of identical display titles. The older `dab-topic-agent-skills-observability` covers observable implementations and cross-platform skill adoption; the newer Metis Strategy item `dab-topic-reusable-agent-skills-become-observable` concerns version ownership and review governance. They are **different scopes**, so do not merge their scores or votes. Rename the newer item **Governed agent skills require ownership and review cycles**.

The older `dab-topic-adaptive-agent-safeguards` covers broad layered control and review. The newer Google Research item `dab-topic-agent-safeguards-tailored-to-the-task` concerns physically grounded wet-lab execution safeguards. They are **different scopes**, so rename the newer item **Autonomous wet-lab agents require physical safety controls** without destroying either record.

Keep both original topic IDs, all prior evidence, research rubrics, scores, feedback links, and `name_aliases` (prior display titles). The specifically scoped `config/watchlist-editorial-revisions/2026-10-23-identity.json` is applied only by the existing protected Watchlist correction lane; it must change exactly two textual reader routes and **zero image bytes**. A newer live edition or unexpected historic bytes aborts rather than overwriting.

## October 24 producer admission

1. **Videos:** Each `video_prequalification.candidates` entry contains the actual HTTPS URL, full title, `teaching_evidence` (at least 45 characters of genuinely reviewed content), `research_disposition` (at least 35 characters), `content_reviewed:true`, `public_player_checked:true`, verified duration 3–20 minutes, actual ISO `checked_at`, and the verified source identity used by `videoPublisherKey`. At least six distinct substantial candidates from three publishers are required. Both selected URL identities must be among the six. Passing structure is **not** proof of actual playback; the existing browser check still applies.
2. **Podcasts:** Continue both 75% editorial AI share and 90% timecoded coverage. Record `quality_review.editorial_form` as `original_reporting`, `original_interview`, `expert_analysis`, or `synthetic_roundup`, plus a factual `editorial_form_rationale` ≥55 characters. For episodes ≥30 minutes, use at least four distinct chronological sections including at least two independently described AI sections. Synthetic roundups require at least two genuine independent source URLs. Do not invent listening evidence.
3. **Source breadth:** Add `source_discovery_audit.reviewed_at`, at least eight distinct `candidates` (each: real HTTPS `url`, `publisher`, `original_date`, actual ISO `checked_at`, `disposition` and source-specific ≥45-character `disposition_reason`), from at least five domains, including all six selected source URLs and at least two real alternatives. For each selected story older than 24 hours, record exactly one `fallback_decisions` item with matching `story_id`, ≥65-character `why_selected_over_recent_options`, and `newer_sources_considered` with only actually reviewed candidate URLs. Never select filler or backdate evidence to fill quotas.
4. **Images:** Each `pre_generation_checks.label_layout` entry includes `minimum_font_px≥22` and `bounding_box_px:{x,y,width,height}`, contained in the 40 px safe area of a 1200×630 output (x≥40, y≥40, right≤1160, bottom≤590). Include `native_export_legibility_plan:{canvas_width:1200,canvas_height:630,mobile_fullsize_review_planned:true,thumbnail_readability_check_planned:true}` and `connector_origin_reviews` for every allowed causal edge (same from/to/support_claim_id, named origin/target regions, `disallowed_paths_visually_blocked:true`). These are preparation plans, never claims that saved pixels passed. **Always generate/correct until six genuine final PNGs satisfy the existing rigorous saved-pixel and 24-context quality gates; ≤12 attempts and ≥3 first-pass are goals, never caps.**

## Autonomous origin evidence

The only schedules remain **19:15 Compiler** and **21:15 image worker**, America/Chicago; no new tasks. Save an optional genuine `shadow-runs/YYYY-MM-DD/producer/task-origin.json` and/or `external-image-packages/YYYY-MM-DD/reviews/task-origin.json` as it becomes available. Fields: `edition_date`, `lane` (`compiler` or `images`), `task_entry_observed_at` (the actual worker-observed clock), and `capability_preflight:{result:'CAPABILITY_ROUTE_PROVEN',checked_at,evidence_ref}` from a real same-invocation pre-generation check. Only if the host exposes it, also record `scheduler:{source:'first_party_scheduler',invocation_id,invoked_at,receipt_ref}`. Missing host evidence means **UNPROVEN**; a GitHub JSON field alone never authenticates the scheduler. Never create a proxy/copy of a receipt or fabricate a start timestamp to make the report green. The existing route-preflight script must run before the first native image-generation call.

## Protection, cost and release

- Never modify retired `gttome/Daily-AI-Brief`. Do not reseal October 23, recreate its six accepted images or re-run its 24 passed pixel reviews.
- Keep protected main, existing PR/CI checks, six-story 2/2/2 allocation and exactly one Agent Skills, two videos, two podcasts, historical October 8 objects and the existing seven-edition media non-repetition rule.
- Current Oct23 reader corrections must be independently verified in the existing narrowly scoped release lane. Future gate changes do not retroactively rewrite the sealed bundle.
- Use only the existing GitHub connector and protected workflows, with no added paid API, TinyFish, metered browser automation, extra scheduled job, Work/Codex production call, or speculative billable CI expansion. Avoid premature image push validation.
- The existing consolidated Markdown/JSON daily AAR remains the sole report. Unknown usage or scheduler/CI provenance must be reported as **UNKNOWN/UNPROVEN**, not estimated.

**Acceptance:** target zero duplicate active topic titles, zero falsely `New development` evergreen video labels on future editions, successful protected PR/head admission, two independently useful videos, two substantively AI podcasts, six fully accepted PNGs, 24 actual quality reviews, preserve all historical object hashes, and zero invented capabilities or incremental paid services. The last release is complete only upon verified GitHub CI, protected merge and public reader integrity.
