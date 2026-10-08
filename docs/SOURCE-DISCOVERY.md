# Qualified source discovery

Iteration 5 connects the 204 directory memberships to finite source acquisition and the existing semantic producer. `config/resource-registry.json` remains the source authority. Its v3 `discovery` fields are current protected route grants; the imported `catalogue` fields preserve Iteration 4's historical September 19 provenance. Source membership, publisher ownership, resource endpoint, canonical podcast show and exact selected item remain distinct identities.

## Configuration and authority

| File or module | Purpose |
|---|---|
| `config/source-discovery-policy.json` | Versioned cadence, acquisition and research bounds |
| `config/source-route-qualifications.json` | One current or explicitly pending result per resource, with source evidence bindings |
| `config/source-snapshot.json` | Exact registry, policy and qualification SHA-256 bindings |
| `operations/source-discovery.mjs` | Plan, validation, acquisition, qualification and coverage functions |
| `producer/research.mjs` | Closed metadata boundary, balanced retention, counted evidence and editorial allocation |
| `producer/source-research.mjs` | Approved-source and current-observation binding for the existing semantic producer |

`readSourceSnapshot` validates all bindings and re-derives current qualification results from their saved extracts. It rejects mismatched grants, unchecked dates relabeled as current, altered identities and selected-item escalation. The hashes establish consistency with protected evidence; they are not publisher signatures or proof of an uncached origin response.

Only a route with verified publisher identity, a supported actual method, a permanent dated sample and substantive item evidence receives a new grant. A reachable landing page alone is insufficient. No feed URL is invented. A publisher-approved alternate is recorded explicitly and may run once after failure; it cannot promote itself to a new primary route.

All original resource URLs and directory provenance remain intact. Related OpenAI, Anthropic and Google subdomains do not count as independent publisher owners. The verified AI & I / Every Podcast rename retains its canonical show identity; a platform listing is not another show. Other unresolved alias questions remain visible in their historical worklist and current qualification limitations.

## Plan and capture in the existing execution

Use these commands from the repository root. They read or write the named local evidence files; they do not start an edition, create a scheduler, launch a browser, change remote configuration or perform image work.

```sh
npm run source:verify
npm run source:plan -- --date YYYY-MM-DD --cutoff TIMEZONE_QUALIFIED_CUTOFF --out RUN/source-plan.json
```

The producer must supply the cutoff already frozen in unfinished EDITORIAL. Optional `--topic resource-id,resource-id` accelerates named resources. Optional `--budget N` can tighten acquisition; if it is smaller than the computed due requirement, the plan reports `DUE_PORTFOLIO_EXCEEDS_BUDGET` and retains every due row.

The versioned cadence uses `2026-01-01` as a stable edition-date epoch. Tier 1 and mandatory topics are due daily. Tier 2 covers each roster over three dates. Tier 3 covers seven dates. Stable resource-derived slots and explicit topic IDs make replay deterministic. Previously enabled primary sources remain Tier 1. Changing health or yield cannot silently change these rules.

`executeSourcePlan(plan, probe)` is a finite callback interface for the already available semantic environment. Its callback receives an exact endpoint, probe key, resource/membership group, frozen cutoff, attempt number and response cap. It dispatches serially, tries no more than the one approved alternate, and records callback failures without repair loops. No network or browser capability is supplied by GitHub or this module.

Normalize actual returned tool metadata to `daily-compiler-web-metadata-extract-v1`, preserving method, observed check time, exact returned-record hash/size, null unknown HTTP status or elapsed time, publisher identity, item URLs, original publication precision, runtime and support references. A callback protocol failure is not a healthy empty catalogue. Record explicit inaccessible, unavailable, parse-error or identity-unverified outcomes. Keep unsupported item URLs, publication values and runtimes unknown; never derive an original date from an update, recording date or page footer.

Each current observation uses `acquisition_binding` with exactly `plan_sha256`, `probe_key`, `cutoff_at` and `mode`. `bindSourceObservation` creates that consistency binding; valid executor responses receive it automatically. The primary and approved alternate share the group's probe key. Reuse a successful response across all equivalent endpoint/verified-publisher/cutoff memberships while retaining each layer's trace. Different endpoints on one domain remain separate.

Save a current acquisition document with `plan_sha256`, `research_cutoff_at`, `evidence_path`, `acquisition_mode: "live_plan_capture"` and `observations`. The path identifies that document's durable execution evidence. Store an approved alternate under its failed primary's `alternate_attempt`. Preserve acquisition attempts when a malformed response prevents a normal observation. An incomplete capture stays incomplete; do not reconstruct a successful response. The qualification rehearsal uses a separate `saved_evidence_replay` mode and cannot select an edition.

```sh
npm run source:replay -- --plan RUN/source-plan.json --observations RUN/source-acquisition.json --out RUN/source-coverage.json
npm run source:research -- --plan RUN/source-plan.json --observations RUN/source-acquisition.json --requests RUN/source-classifications.json --out RUN/source-research.json
```

The classifications file is an array containing only `resource_id`, `item_url`, `type`, `focus`, `agent_skills` and `score`. `score` is the producer's candidate ordering, not a fabricated source-quality score. Source metadata and support come from the bound exact-item observation. A classification cannot inject raw evidence or assert that an unapproved source is qualified.

The research output retains at most 20 article candidates and 9 full evidence packets, with a 12,000-codepoint serialized evidence budget. Each media type has its own 12-candidate / 6-packet / 6,000-codepoint bound. Over-budget evidence is explicitly skipped rather than clipped into an apparent proof. Focus gaps and rejected candidates remain visible. Only bounded identity fields appear in rejection diagnostics.

```sh
npm run source:validate-editorial -- --plan RUN/source-plan.json --observations RUN/source-acquisition.json --requests RUN/source-classifications.json --receipt RUN/source-research.json --selection RUN/source-selection.json --state RUN/compiler-state.json
```

The selection file has `selected_ids` and `freshness_rationales` keyed by selected candidate ID. Validation replays the research receipt, requires unfinished EDITORIAL and the unchanged state cutoff, then checks six source-supported retained stories, two per focus and exactly one reusable Agent Skills story. It preserves date-only interval uncertainty and the existing 24/72/168-hour article freshness policy; non-priority fallback requires a rationale. Media admission still runs through `compiler/media.mjs` under the existing Iteration 3 contract.

## Coverage, health and yield

The coverage receipt includes every one of the 169 resources and all 204 memberships. Rows report `checked`, `not_due`, `pending` or `budget_skipped` independently of access and editorial yield. A checked 403 remains a checked access limitation with unknown item counts. A successfully parsed empty response remains healthy, with zero new yield and no failure increment. Unknown elapsed time remains null.

Observation schema v2 separates retrieval, editorial yield and coverage. The v1 compatibility reader preserves historical observations while no longer treating quiet successful responses as access deterioration. Observation application may update measured health only; it cannot change enablement, routes, identity, priority or cadence. Active research is bound to its frozen source snapshot. Health changes or qualification proposals for a later snapshot need normal protected review and a fresh consistent snapshot.

`SOURCE_ROLLOUT_PARTIAL` does not prevent a valid Brief. It is also not permission to omit unresolved sources or claim full catalogue research. Required article/media shortages continue to fail the core contract. This feature adds no dashboard-to-core dependency.

## Reproduce the recorded Iteration 5 rehearsal

The actual public-source capture is in `docs/implementation/oct9-value-and-improvement/iteration-05/source-observations.json`. It includes public-safe metadata, short substantive paraphrases, current tool references and an exact saved-record hash inventory. `preassigned-scope.json` preserves the due-resource assignment; `due-source-plan.json` binds its matching scope to the qualified candidate configuration after capture. The latter is explicitly a retrospective replay plan, not a claim that its final snapshot existed before acquisition.

```sh
npm run source:replay -- --plan docs/implementation/oct9-value-and-improvement/iteration-05/due-source-plan.json --observations docs/implementation/oct9-value-and-improvement/iteration-05/rehearsal-acquisition.json --out build/iteration-05/source-coverage.json
npm run source:research -- --plan docs/implementation/oct9-value-and-improvement/iteration-05/due-source-plan.json --observations docs/implementation/oct9-value-and-improvement/iteration-05/rehearsal-acquisition.json --requests docs/implementation/oct9-value-and-improvement/iteration-05/research-requests.json --out build/iteration-05/research-replay.json
```

Compare the outputs with the committed coverage and research receipts. This replay performs no network calls and selects no future edition. Current qualification, bounded code/replay, image activation, core readiness and release remain separately reported in the iteration's completion record. The actual capture's global concurrency peak and upstream HTTP sizes were not measured; the separate callback executor's serial bound is verified by code tests.
