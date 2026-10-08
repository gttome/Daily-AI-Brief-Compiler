# Source portfolio reconciliation

**Migration:** `source-portfolio-2026-09-19-v1`  
**Catalogue result:** `SOURCE_CATALOGUE_RECONCILED = 204/204`  
**Operational rollout:** `SOURCE_ROLLOUT_PARTIAL`

Iteration 4 accounts for the complete supplied September 19 source portfolio in the existing [resource registry](../config/resource-registry.json). The migration adds catalogue provenance and pending qualification records. It establishes no new live retrieval proof, activation, edition admission, or reader release.

## Reconciled scope

| Directory layer | Historical Existing | Historical New | Memberships |
|---|---:|---:|---:|
| Article and publisher sources | 37 | 37 | 74 |
| Research and early-signal discovery | 20 | 20 | 40 |
| Video discovery | 11 | 11 | 22 |
| Podcast discovery | 14 | 14 | 28 |
| Emerging AI Watchlist | 20 | 20 | 40 |
| **Total** | **102** | **102** | **204** |

Existing and New describe the directory's September 19 baseline. They do not describe current Compiler presence, health, or eligibility.

The 204 memberships reference **166 exact directory URLs**. Exact matching reuses **53 baseline resources for 68 memberships**. The remaining **136 memberships create 113 disabled resources**. All **56 baseline resources** survive, producing **169 registry resources**. The 36 cross-layer reuse groups contain 34 pairs and two triples.

Three baseline endpoints have no exact directory match and remain explicitly preserved:

| Resource ID | Preserved directory-facing URL |
|---|---|
| `x-research-feeds` | `https://x.com/` |
| `youtube-anthropic` | `https://www.youtube.com/@anthropic-ai` |
| `youtube-openai` | `https://www.youtube.com/@OpenAI` |

The directory's corresponding YouTube `/videos` URLs remain separate pending relationship verification. The X resource retains its existing null operational endpoint.

The [204-row mapping](implementation/oct9-value-and-improvement/iteration-04/reconciliation/mapping.json) records these descriptive dispositions:

| Disposition | Memberships |
|---|---:|
| `mapped_existing` | 50 |
| `add_resource` | 90 |
| `add_layer_membership` | 25 |
| `alias_requires_verification` | 11 |
| `retrieval_pending` | 28 |

Disposition describes a row's reconciliation state. The separate `resource_action` records whether its resource was reused or added; a pending identity or retrieval question can therefore accompany an added resource. These counts grant no runtime eligibility.

## Identity, membership, and runtime state

The [migration in `operations/resources.mjs`](../operations/resources.mjs) matches an original URL exactly against existing resource `url` and configured `endpoint` values. Ambiguous exact matches fail. New IDs use `directory-` plus the first 24 hexadecimal characters of the exact URL's SHA-256. Row ordering cannot change the assignment.

Identical endpoints share a resource across layers. Different paths, queries, fragments, raw hostname spellings, and trailing slashes remain distinct. The migration does not guess redirects or collapse resources by publisher name or hostname. For example, both DeepMind blog endpoints, both LocalLLaMA views, all six arXiv category endpoints, and separate YouTube channels remain represented.

| Concept | Stored meaning |
|---|---|
| Resource | A specific directory or configured endpoint, with a stable resource ID |
| Catalogue membership | One original `planning_row_id`, its layer role, recommendation, provenance, and disposition |
| Publisher/channel/show identity | Claimed names and identity kind; canonical publisher/show IDs and evidence remain null pending verification |
| Selected item | An exact article, paper, video, or episode identity; this migration selects no items |
| Qualification | Actual-route and unattended-eligibility evidence; pending in this import |
| Runtime health | Existing observed health fields, preserved separately from historical directory labels |

All preexisting operational fields remain unchanged, including `enabled`, `content_types`, `priority`, `search_mode`, `endpoint`, `publisher`, `notes`, and the complete `health` object. The versioned registry advances to v2 and adds catalogue metadata; the validator continues to accept legacy v1 fixtures.

Five imported Article memberships are absent from their matching baseline runtime roles: `anthropic`, `stanford-hai`, `berkeley-bair`, `mit-csail`, and `the-batch`. They are retained as catalogue memberships without expanding those enabled resources' runtime `content_types`.

Every newly created resource is disabled, has `priority: experimental`, `search_mode: manual_endpoint`, a null configured endpoint, and unknown health. Its prospective content types describe its catalogue roles. Qualification remains pending with null check time, evidence, and verified endpoint, and `unattended_eligible: false`. The placeholder search mode does not establish an owner-assisted execution route.

## Provenance and unresolved work

The [versioned import manifest](../migrations/source-portfolio-v1/directory.json) retains all 204 original rows verbatim, including descriptions, exact URLs, recommendations, rationale, Existing/New designations, verification notes, planning IDs, and source-line numbers. It also retains all five rubrics with original wording and weights, rubric source-line ranges, and the original source-file hashes. Memberships bind each original row with `provenance_sha256`. No numerical source scores are invented.

Eight explicit identity questions remain pending, with no verified aliases:

| Question ID | Required verification |
|---|---|
| `show-ai-daily-brief-breakdown` | Relationship between The AI Daily Brief and The AI Breakdown; no asserted rename or independent-show claim |
| `show-hard-fork-continuity` | The historical host/show transition note and current show continuity |
| `route-ai-and-i` | The potentially redirecting publisher route and show identity |
| `route-gradient-dissent` | Publisher route versus historical Apple Podcasts identity evidence |
| `route-deepmind-blogs` | `/discover/blog/` versus `/blog/` |
| `route-openai-research` | `/research/` versus `/research/index/` |
| `channel-openai-videos` | Preserved `/@OpenAI` versus supplied `/@OpenAI/videos` |
| `channel-anthropic-videos` | Preserved `/@anthropic-ai` versus supplied `/@anthropic-ai/videos` |

The manifest preserves **13 historical retrieval-route hints** from the directory's discovery-infrastructure table: ten existing machine-readable routes and three publisher pages describing podcast RSS availability. Their original lines and statuses remain traceable; all are marked `not_rechecked`, with verified runtime endpoint null. The three podcast feed URLs were not supplied and are not invented. Apple Podcasts, Spotify, and general YouTube remain platform identities rather than independent shows.

## Reproduction, digests, and rollback

The baseline snapshot comes from protected-main commit `32f4e962623d94db0a7b28594e828627ffb42600`. The recorded candidate uses migration timestamp `2026-10-08T06:36:00Z`.

| Binding | SHA-256 |
|---|---|
| [Preserved baseline registry bytes](../migrations/source-portfolio-v1/registry.before.json) | `f26d874cdc1affa9417cbd0e87d99dfdb2508c7555b150915913db96bb616103` |
| Reconciled candidate registry bytes | `f3d755f0d5b1385cd0d0377f80a580046c4173925c0cb18c6a75557c058078b2` |
| Original supplied inventory bytes | `5a35c38f5058b29956a6493ecaaf9ef7668ab1fdcefe0cba2e348be935da2073` |
| Original supplied directory bytes | `0cb76d7d4a5014b5476670dcc66ff2c9b4cd9d2d3c91adfc7f3a974a8a9db159` |
| Canonical import-manifest digest | `f5123013c9003164ee2f4a602c5807fef41a70bb3251d3a9d362cec98b3c16f6` |

The [initial dry-run diff](implementation/oct9-value-and-improvement/iteration-04/reconciliation/dry-run.json), mapping, and qualification worklist bind the candidate registry digest. These are catalogue artifacts; PR, test, merge, and release evidence belong in the iteration completion record.

From the repository root, the default command performs a dry run and prints its result without writing the registry or report files:

```sh
npm run resource:reconcile
```

`--output-dir PATH` explicitly writes the three derived reports. `--apply` writes the registry only if the validated migration changes it. Repeating the same migration on the reconciled candidate returns empty additions and `registry_written: false`; it preserves the registry bytes, timestamp, and any subsequent valid observations. Changed inputs under the same migration identity are rejected. Existing different report contents must use a fresh output directory.

To reproduce the initial diff, copy the preserved snapshot to a temporary registry. The CLI refuses to use the preserved snapshot itself as the target:

```sh
reconcile_tmp="$(mktemp -d)"
cp migrations/source-portfolio-v1/registry.before.json "$reconcile_tmp/registry.json"
npm run resource:reconcile -- --registry "$reconcile_tmp/registry.json" --at 2026-10-08T06:36:00Z --output-dir "$reconcile_tmp/reports"
```

This example leaves the temporary registry unchanged and writes only the requested reports. The CLI verifies snapshot and serialization digests, checks input/report collisions before writing, and refuses a registry changed by another writer before application.

Rollback uses the preserved baseline snapshot through a reviewed protected change, retaining the migration manifest, mapping, and pending work. Reconcile any later approved operational changes before restoring that snapshot so rollback does not erase subsequent observations or sources.

## Qualification handoff

The [qualification worklist](implementation/oct9-value-and-improvement/iteration-04/reconciliation/qualification-worklist.json) contains all **169 resources once**, each pending qualification by this migration. Its priority groups are `mandatory_topic` (3), `always_check` (65), `regular` (40), `rotating_or_topic` (6), `assisted_route_pending` (14), `baseline_recommendation` (38), and `retained_compiler_only` (3). These groups preserve directory recommendations for Iteration 5; every `due_at` and group `actual_due_count` is null, and coverage is `not_assessed`.

The next qualification work must establish the actual supported route, publisher/channel/show identity, representative item evidence, date precision, parser/access limitations, and bounded due/probe policy. Historical Active/Verified or assisted-review labels provide no current health or unattended grant. Catalogue completion is independent of endpoint qualification: **zero new routes were qualified or activated by this migration**, and `SOURCE_ROLLOUT_PARTIAL` remains the operational result.
