# Semantic Producer Contract

The Daily Compiler uses one semantic producer for EDITORIAL, CONTENT and the semantic image specifications needed by IMAGES. D1 delegates visual generation/acceptance to a fresh cloud Image Studio and exact-byte repository transport to a narrow Work Cloud Porter. GitHub owns deterministic integrity validation and compilation. The producer operates only in `gttome/Daily-AI-Brief-Compiler`.

## Primary and recovery behavior

For target date `YYYY-MM-DD`, inspect Compiler state first and reuse the existing execution. Recovery never allocates a duplicate execution and never redoes valid completed editorial/content work.

Accepted images are immutable. Accepted/locked image bytes and identities must be reused exactly. D0 does not lock individual images early: an individual visual PASS becomes `REVIEW_PASS_PENDING_SET`, and only a set-review PASS creates the atomic six-image `ACCEPTED_LOCKED` record.

## EDITORIAL and CONTENT

EDITORIAL persists the candidate evidence and locked six-story selection. CONTENT persists stories, media, Watchlist and book mappings. For editions dated October 14, 2026 onward, every Watchlist New, Updated, Carried Forward and Dropped item must carry three distinct evidence-grounded fields: `summary` (what the emerging capability is), `why_now` (what dated evidence changed or why the item remains/retires now), and `practical_value` (the bounded professional application or test). Each is a separately written explanatory sentence of at least seven words; no literal or near-duplicate sections. Cite the item's own evidence, never another story's fallback URL. If editorial fields are absent or repeated, repair the item before sealing the bundle. The reader adapter must not synthesize all three from `why`, `what_changed`, or `reason`. Completed semantic outputs are not replayed merely because image work is incomplete.

### Forward-only selection diversity — October 19, 2026 and later

**Before starting EDITORIAL**, read current protected-main docs/EDITORIAL-CONTRACT.md, contracts/editorial-contract.json, config/resource-registry.json and scripts/verify-media-freshness.mjs, then inspect seven previously published editions for publisher and podcast program exposure. The existing producer may use public source research and the connected GitHub integration, but must not add paid services, new automation or billable research providers.

**Articles:** Build a research shortlist across **at least eight credible publishing organizations** where qualifying items actually exist. Evaluate full articles and original dates before considering rotation. Select six original URLs with a goal of six independent publisher organizations and a hard floor of five; no one organization can supply more than two; AWS and SAP may each supply at most one. AWS's different blog departments, SAP's different newsrooms, and Google's research/cloud subsidiaries are not independently owned editorial organizations for this count. Account for the seven previous published editions when ranking otherwise comparable candidates; deliberately seek useful perspectives outside previously dominant sources. A source may be authoritative and still be unsuitable for a given edition because it adds little marginal reader value. Do not fill quotas with shallow announcements, syndicated duplicates, unverified URLs, marketing copy without concrete evidence, or late articles that fail the normal 168-hour ceiling. Keep exact 2/2/2 focus and one Agent Skills procedure.

**Podcasts:** The resource registry contains an expanded set of established programs, not a mandatory quota. Research eligible fresh episodes from a range of independent shows, with a **three-previous-published-edition hard program cooldown**, a **seven-edition preferred cooldown**, **two different shows** in today's edition, and the existing seven-edition **exact episode identity prohibition**. A different episode from a recently used program **does not** count as variety. Inspect program identity across native show titles, normalized publisher labels and stable Apple show IDs when present. Prefer source pages with actual release dates, verified runtime and accessible public episodes; don't use an old or unavailable program just to meet a numerical target.

**If candidates are insufficient:** expand investigation across the active registry and original sites, preserve the existing 24/72/168-hour article rule and the trustworthy podcast verification contract, and correct the candidate bundle **before** it is sealed. Never silently replace a podcast program with another episode from the same show, fabricate a publisher alias, or weaken an existing validator. Keep any last-good published page intact if the genuinely required evidence is missing. No historical reseal and no new owner authorization gate.

The prospective deterministic gate runs in compiler/source-diversity.mjs and scripts/verify-media-freshness.mjs using the **same existing publisher workflows**, and writes counts/show identities to the media admission receipt. Historical editions through October 18 remain valid without re-evaluation. The saved daily Compiler task must read this prospective section on each run; repository changes alone cannot modify a separately stored external task prompt.

### Watchlist research rubric — required from October 16, 2026

Read `contracts/editorial-contract.json`, `docs/EDITORIAL-CONTRACT.md`, `compiler/watchlist-rubric.mjs` and `compiler/pending-editorial.mjs` from current protected main before research. The semantic producer authors the Watchlist entries directly into `edition-bundle.json`; there is no deterministic scorer that can supply missing research. Preserve `rubric` and any `momentum` observations when copying research/content records into the final bundle. Do not copy the October 15 bundle format unchanged or reopen/reseal that historical bundle.

For **each new or materially updated** item, include exactly six `rubric` keys. Each value is `{ "score": <integer 0–5 or null>, "reason": <separately authored source-grounded explanation> }`. Each reason must contain at least seven words and 42 characters, address that criterion specifically and be distinct from the other five. Bind the assessment to the item's own dated `evidence.url` / `evidence.date` and documented source-reading observations. A source link alone is not a rationale. Do not invent observations, independent corroboration or confidence to pass validation.

| Criterion | Weight | Required assessment |
| --- | ---: | --- |
| novelty | 20% | What changes relative to the documented prior capability; bound the claim. |
| evidence | 25% | What the actual source demonstrates, verification depth and limitations. |
| independence | 15% | Independent corroborating developments; one publisher is not multiple independent sources. |
| momentum | 15% | Comparable observations over time, or explicit unknown with `score:null`. |
| relevance | 15% | A concrete professional use or bounded test supported by this topic. |
| durability | 10% | Reasons the capability may persist, with source-specific uncertainty. |

**Unknown momentum stays null for both new and updated topics.** A numeric momentum score requires `momentum.metric` naming one comparable measure and `momentum.observations` containing at least two numerical observations at distinct valid `observed_at` timestamps, each with its own HTTPS `source_url` and numeric `value`. Explain the comparison in `rubric.momentum.reason`. Multiple URLs or publication dates without comparable measurements are insufficient. An example shape is `{ "metric": "<same measured quantity and units>", "observations": [{ "observed_at": "<ISO date>", "value": <observed number>, "source_url": "<actual HTTPS evidence>" }, ...] }`; this notation is not data to paste into production.

Keep all three October 14 editorial fields and legacy `why` / `what_changed` / `reason` alongside the rubric. Do not author a public `/100` total: the reader calculates `round(sum(weight * (score ?? 0) / 5))`, without renormalizing unknown criteria. Never assign all six criteria 3/5, copy reasons or mechanically vary scores. A genuinely researched total of 60 is not itself prohibited; synthetic defaults are.

**Carried forward / dropped:** use the stable topic identity matching the current published Watchlist. Preserve its last genuinely reviewed rubric; do not rescore because the date changed. If the compiler cannot resolve a prior record, supply its genuinely reviewed rubric explicitly or research it; never invoke a legacy default. A material evidence change belongs in `updated` with six refreshed assessments, not disguised as carry-forward. The existing adapter fails closed when neither a prior topic nor a valid supplied rubric exists.

**Before sealing:** inspect each new/updated topic's six assessments and evidence; correct missing/duplicate/unsupported reasons through research. Assemble the candidate `BUNDLE_READY` files locally with the exact bundle SHA-256 in state, where Node is available, run `node scripts/validate-semantic-bundle.mjs <state.json> <edition-bundle.json>` before committing/signaling them. This calls the production deterministic validator with the normal pending-image contract; it does not publish. A connected-GitHub-only producer must inspect the same fields on exact bundle readback and retain the existing mandatory protected GitHub validation; absence of local Node is not a new host-admission gate, and must never be reported as a local validation PASS. No fixture/preview exemptions, paid APIs, validator weakening or production restarts. Normal protected compilation additionally resolves prior Watchlist identities and validates reader output. A deterministic PASS proves format/integrity, not the truth of research or successful scheduled execution.

The saved Compiler task must explicitly read this current section and enforce the October 16 gate before `BUNDLE_READY`. Repository edits do not rewrite a saved external task prompt. Preserve its existing task ID, enabled state and 19:15 America/Chicago recurrence; preserve the 21:15 image task untouched.

## IMAGES — D1 Cloud Image Studio

D1 is the target permanent reader-image path after activation.

1. The semantic producer locks six story-specific image specifications and differentiation assignments.
2. The Dot launches one fresh Image Studio cloud task by default.
3. The Studio receives image specifications and the Perfect Image standard only; repository/orchestration context is excluded.
4. The Studio generates, visually reviews and retries candidates as needed, with at most four genuine visual-quality attempts per story.
5. The Studio reviews the six-image set and locks the exact six accepted assets.
6. The Studio emits `daily-compiler-d1-image-acceptance-manifest-v1` binding each story to its cloud asset, filename, Git target path, dimensions, byte count, SHA-256, attempt and composition signature.
7. The Dot hands the six individual assets and manifest to Work Cloud. No ZIP is required.
8. Work operates only under `IMAGE_PACKAGE_INGEST`: exact-byte retrieval, structural/hash validation, Git upload, protected PR/CI/deploy/live-byte verification. Work performs no visual-quality review and no generation/editing.
9. A Work/Git/CI/deploy failure reuses the exact accepted assets. It never returns to image generation.
10. The edition can reach BUNDLE_READY only when the D1 activation and exact-byte bundle gate pass.

The image-quality authority is the Image Studio acceptance manifest. GitHub proves asset identity, not aesthetics.

## IMAGES — D0 Native Image Capsules — preserved development path

D0 is usable for reader-story generation only after its activation receipt proves P0-A through P0-F. Before activation, a D0 reader-story path remains blocked rather than pretending isolation or byte capture is proven.

For an activated D0 edition:

1. create and validate the six-image composition reservation plan;
2. create Image Packet v3 for each story;
3. find the first incomplete image operation from durable attempt files;
4. establish a genuinely fresh story-only capsule admission when generation is required;
5. generate exactly one image with built-in native ChatGPT image generation;
6. capture and persist the returned raw bytes before that capsule ends;
7. let deterministic GitHub code normalize to exact 1200x630 and produce structural evidence;
8. review the exact persisted final candidate against the packet and locked benchmark;
9. retry only a genuine rejected candidate, with a new invocation/context and at most four quality attempts;
10. after six individual passes, run Set Review v3;
11. atomically lock all six images;
12. bind exact evidence identities into the edition bundle.

A raw/final/review already persisted must be finished/reused before a new attempt is allocated. Infrastructure/capability failures consume zero visual attempts. There is no low-quality or Proposal 1R reader-story fallback.

The generator capsule sees only one story's generator projection. It does not see other stories, prior images, benchmark assets, publication state, repository paths, run IDs, recovery prose, or orchestration context.

## BUNDLE

`BUNDLE_READY` is fail-closed. A D0 edition cannot seal unless six images are atomically `ACCEPTED_LOCKED`, set review is PASS, every packet/admission/raw/final/structural/review identity validates, exact final PNGs are 1200x630, every image passes the exact-text/people/branding/benchmark requirements, set differentiation thresholds pass, and versions/cache keys/supersedes identities are complete.

After `BUNDLE_READY`, ChatGPT performs no deterministic compilation or publication work.

## Proposal 1R

Proposal 1R remains for historical/internal deterministic diagrams only. It is not an automatic reader-story fallback after D0 activation.

## Runtime software rule

No active shadow edition may modify compiler/workflow/schema code. A genuine code/platform defect preserves completed outputs and stops. Development fixes happen outside the active execution.

Forbidden: Supervisor, Watchdog Ring, writer/recovery leases, worker pools, wake PRs, continuous AI polling, runtime software repair, owner upload/manual transfer, general-purpose Work, Codex, paid model/image API, alternate account, local-computer dependency, or owner liveness prompt. The sole Work exception is D1 `IMAGE_PACKAGE_INGEST` after six images are already accepted and locked.

## Operational learning and observability

The producer and delegated cloud stages record structured timing/usage events. Every material problem is persisted as a problem-learning record with root cause, attempted fixes, actual fix, outcome, timing impact, Work/Dot impact, recurrence, permanent action and regression test. Run close produces metrics plus a post-run analysis of speed, reliability, source yield, image attempts, Work time, Dot time, CI/deploy latency and improvement opportunities.

The producer reads the extensible resource registry and records source observations for articles, videos, podcasts, Watchlist and general research. The producer also reads the future-Brief suggestion inbox before research/selection and records a resolution for each eligible suggestion.

Post-publication corrections are additive protected revisions. They do not allocate a new execution for the published edition and must preserve superseded historical artifacts.


## October 20 owner-approved improvements — October 21 onward

Read and apply [the six approved production improvements](automation/OCT20_APPROVED_IMPROVEMENTS.md). New editorial bundles require real chronology, nontechnical audience-fit evidence, video publisher variety and exact podcast episode links. New image packages require story-specific label/causal-state preflight plus canonical reviews/after-action.json and after-action.md. Preserve historical bundles and accepted PNGs. Complete actual 24-context visual QA and terminal closeout after release; never infer semantic PASS from screenshots or CI. Keep existing schedules and one worker per lane.


## October 21 owner-approved AAR hardening — mandatory for October 22+ editions

Before new source selection, read [October 21 permanent improvements](automation/OCT21_AAR_IMPROVEMENTS.md) and current compiler/media-quality.mjs alongside the editorial contract. Candidate videos now require real instructional quality_review evidence and three concrete transferable teaching points or a reproducible procedure. Candidate podcasts require timecoded editorial_segments covering >=90% of episode runtime and >=75% substantive AI share after excluding ads. The same prospective deterministic admission runs in the existing bundle-ready and Pages gates; do not borrow metadata-only evidence or invent transcripts.

The existing public browser video gate must observe both public full-program-duration players advancing for new editions; oEmbed identity-only fallback is NOT accepted after October 21. When no suitable playable educational video exists, research different candidates, preserve the last-good public Brief and keep failed admission evidence. Do not claim an unseen video was fully watched.

The image worker must record truthful UTC task-first-observed and pre-first-native-call timestamps with the exact declared observation sources in the canonical image AAR for October 22+, without inferring actual scheduler invocation time. Existing 24 actual pixel reviews remain mandatory. Both AAR renderers must report cycle-specific owner usage only with its provenance fields; otherwise display Not reported. Maintain zero added-cost production and the current 19:15/21:15 schedule.
