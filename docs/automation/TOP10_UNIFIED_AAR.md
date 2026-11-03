# Unified AAR: Top 10, Compiler, published Brief and images

Owner directive: November 1, 2026. Effective from the November 2 Chicago research cycle, which targets the November 3 Brief. Earlier cycles are NOT_APPLICABLE for Top 10; do not backfill fictional runs.

The existing deterministic daily-operations-report workflow produces the single management-facing AAR. It now includes the full ranked Top 10 list and its relationship to Compiler research, alongside the existing Compiler, published reader, image and visual-review evidence. No additional schedule, publisher, workflow or paid service is introduced.

## Producer: 17:00 America/Chicago

The Top 10 task owns only `signals/ai-topic-top10/**` on the existing `operations-reports` branch. Cycle D's dated report is `signals/ai-topic-top10/D.json`; E is the next Chicago calendar date. Preserve the existing report schema and all source/measurement provenance. An enabled task is not evidence that research happened.

After writing and reading the actual report back from its returned commit, write the optional same-run sidecar `signals/ai-topic-top10/D.aar.json`:

- `schema_version`: `daily-ai-topic-top10-run-aar-v1`
- `cycle_date`: D; `edition_date`: E
- `started_at` and `finished_at`: actual observed ISO timestamps, or null when unavailable
- `report_commit`, `report_blob_sha`, `report_sha256`, `report_path`: actual returned/readback identities when obtainable, otherwise null with the precise limitation
- `usage_percent` and `cost_usd`: actual explicitly sourced per-run values only, otherwise null. No estimates or assumed zero cost.
- `errors`: observed problems, effects and corrections
- `improvements`: proposed follow-ups, with already-implemented items distinguished

Record genuine start time when the run begins. Do not reconstruct it from the scheduled time, copied timestamps or a later commit. Preserve the report if a sidecar write fails and disclose the missing receipt. The sidecar is an observation by the producer, not independent scheduler or account billing attestation.

## Consumer: existing 19:15 Compiler

Read the current Chicago cycle's report before new discovery. Follow `signals/ai-topic-top10/README.md` on `operations-reports`; preserve all existing selection, source universe, quality and publication requirements. Never reopen a locked or historical edition because a trend report arrives later.

On the existing `shadow/E` edition branch, record `shadow-runs/E/editorial/trend-input.json` with:

- `schema_version`: `daily-ai-topic-top10-input-v1`
- `cycle_date`: D; `edition_date`: E; `report_date`: D
- `source_commit`, `source_blob_sha`, `source_path`: the immutable source record actually read
- `report_sha256`: SHA-256 of the exact raw report bytes, not reserialized JSON
- `retrieved_at`: actual read time
- `report`: the complete parsed input snapshot

Record `shadow-runs/E/editorial/trend-search-coverage.json` with:

- `schema_version`: `daily-ai-topic-top10-search-coverage-v1`
- `cycle_date`, `edition_date`, `report_sha256`, `source_commit`: matching the input receipt
- `searches`: one summary per supported topic and format, retaining actual queries and source URLs inspected
- `selected_mappings`: only genuinely selected final items linked to those topics

Each searches row has `topic_id`, `format` (`article`, `video` or `podcast`), `query`, `attempted_at`, `source_urls`, `outcome`, `reason` and `candidate_ids`. Allowed outcomes: `searched`, `selected`, `rejected`, `not_found`, `unavailable`, `not_attempted`. A real attempted search needs its actual timestamp and HTTPS source evidence; a `not_attempted` row must explain the omission without invented evidence. Distinct genuine queries may be separate observations; do not duplicate identical rows. Each selected mapping has `topic_id`, `format`, `item_id`, `url` and `reason`. It must match the same-edition bundle's actually selected record and URL; when a media record has no ID, use its exact URL as `item_id`. Missing bundle evidence never proves a selection match.

Unavailable hashing or read capabilities must be disclosed; never fabricate a digest to satisfy a reporting field. Missing or invalid trend input causes ordinary wider research with an honest AAR gap, not a new publication blocker. A popular topic does not automatically qualify an article, video or podcast.

## Deterministic AAR and interpretation

The existing reporter gathers the exact dated report, optional run sidecar, Compiler input snapshot and search coverage. It records the collected Git commit, blob SHA, exact raw SHA-256 and collection time separately. Validity, freshness at consumption, receipt binding, full per-format coverage and selection mappings are evaluated independently.

The unified Markdown AAR includes the complete ranked list, summaries, confidence and source links; actual timing and reported usage/cost; handoff and search outcomes; errors, limitations and improvements; and all existing Compiler/reader/image reporting. Its machine-readable JSON includes `top10` and a separate `end_to_end_system_status`. The lane reporter also writes `top10.json` and `top10.md` next to the existing Compiler, image and daily rollup outputs.

Existing release/publication result fields retain their meaning. Missing Top 10 evidence cannot invalidate an otherwise verified published Brief or image release. Conversely, a verified reader/image release cannot certify the Top 10 ran or influenced research. Explicitly unattempted searches, partial lists and missing receipts prevent a complete entire-system evidence claim. Provisional rankings remain disclosed even when every handoff/search receipt is present.

No claim of independent scheduler autonomy, zero paid consumption, or exact account usage follows from these records alone. First natural unattended end-to-end operation remains unproven until genuine report, input, search and production receipts exist.

## November 3 fixed baseline and continuous improvement

The accepted report commit is `e76763522d93ba2152b6d8a2b22b64a051fb2297`; its raw SHA256 is `059ee675574a3ba7e257828e8b062a638f808d29870e49ca924791d51d47735d`. The immutable input baseline is `signals/ai-topic-top10/baselines/2026-11-03.json` at operations-reports commit `aebc04de2173c37b2c041eb0e9f964e27325ee26`. It records 10 topics, 14 validation resources, 79 metadata observations covering 71 unique videos, and zero full-video reviews or direct YouTube counter verifications. Numbers indicate discovery sequence; topics are unranked within qualitative evidence bands.

The producer logs `daily_improvement` in each report: baseline_id, previous_report_date, actual method_version, changes with reasons/expected effects, resource_candidates with HTTPS URL/role/accepted-rejected-deferred decision/reason, observed_effects with comparability limits, next_improvement and limitations. Evaluate an additional relevant resource candidate each day when access permits. Admission requires useful credible evidence, never a source-count quota. Registry expansion is not audience growth or independent corroboration. Initial setup may use `D.improvement.json`, bound to cycle, edition and raw report SHA256.

The Compiler retains the existing input and search schemas, adds `baseline_id=nov03-2026-v1` to search coverage, and may add `impact_observations` for evidence-backed qualified candidates, source additions, freshness/duplicate/promotion rejections, gaps and genuinely measured time/cost. These narrative observations are reported claims, not independent verification.

The existing reporting workflow collects the fixed baseline, previous calendar day's report and AAR, optional current improvement ledger and any frozen outcome baseline. Missing previous evidence is explicitly unknown. Both lane and unified AARs include `top10.daily_improvement`: input counts/deltas, unique topic-format search coverage, unique format/candidate counts, source-host breadth, and distinct bundle-verified article/video/podcast selections. Counts are suppressed when the binding or necessary receipts are missing. Host counts do not establish publisher independence; candidate counts do not establish qualification. Separate reader corrections, publication, runtime, usage and image sections retain their meanings.

After the first genuine November 3 publication success with the exact accepted input and observed search/selection metrics, `compile-daily-aar.mjs` creates `daily/baselines/nov03-2026-top10.json` using exclusive creation. Existing outcome baselines are never overwritten. Future comparisons show numeric differences only where both measurements exist. Historical rerendering and larger research samples cannot silently redefine the reference. A rise in trend-linked selections is association, not proof of causal benefit. Daily improvement can mean rejecting a weak source or discovering a limitation; no monotonic quality claim is made.

This extends the existing deterministic reporter and two existing task prompts. It adds no publication blocker, schedule, publisher or paid service.

