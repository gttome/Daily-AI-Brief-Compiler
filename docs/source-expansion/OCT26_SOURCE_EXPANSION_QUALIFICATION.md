# October 26, 2026 — Source Expansion Qualification and Reconciliation

**Change type:** Forward-only, source-only feature branch. **Repository:** `gttome/Daily-AI-Brief-Compiler`.
**Source of truth before change:** protected `main` `4feef673ff6d7bf4c47c0d94b8cf96ab4d0e9e4f`;
`config/resource-registry.json` blob `9f9945a523bf19bec6a55059afd65dca59663434`.
**Baseline:** 69 registered and enabled; 33 article, 3 video and 17 podcast source-role memberships.

## Decisions, not a numerical source quota

The attached approved October 26 source pack had **124 historical role memberships**
(74 article, 22 video, 28 podcast) and **28 newly researched candidates**
(14 article, 7 video, 7 podcast). The original September inventory also had
80 general research/Watchlist memberships; those are explicitly out of scope.

Comparison of the 124 historical **normalized source URLs** with protected-main URLs
found **23 exact-route matches** (14 article, 1 video, 8 podcast) and **101
non-exact historical routes** (60 article, 21 video, 20 podcast). This is a
URL-presence crosscheck, **not proof that any corresponding historical
content-role is already assigned** or that different URLs prove independent
sources. The 101 remain pending source/role, identity, redirect and current-item
review rather than being blindly imported as another batch. Key unresolved
aliases include AI Daily Brief/AI Breakdown, Hard Fork show continuity,
AI & I/Every, Gradient Dissent, DeepMind paths, OpenAI research paths and
the OpenAI/Anthropic YouTube channel-handle variants. Preserve current resources,
do not merge corporate identities merely from a matching display name.
The complete 152-row local audit matrix is retained as development evidence.

All **28 Oct 26 new candidate IDs** are appended to the present v1 registry.
Only **four sources** have enough publicly readable **publisher route plus
exact dated sample-item evidence** to be used for *discovery* now; the other
24 stay `enabled:false`. No existing resource is changed or disabled; the
registry expands from 69 to 97. Article memberships expand 33→47, video
3→10, podcast 17→24; these count disabled leads as catalogued role
memberships. The **enabled discovery totals** are article 36, video 3,
podcast 18 (69 originally enabled + four additions). Every new health record
remains `unknown` with null checks; a successful browser research read is
not an operational health observation.

## Four route-qualified discovery candidates

| Resource ID | Publisher route and exact dated item evidence | Admission and limitations |
|---|---|---|
| `research-20261026-a01` — OpenAI Developers Agent Cookbook | [Original agent recipe index](https://developers.openai.com/cookbook/topic/agents) lists [Run OpenAI agents on a Databricks Sandbox](https://developers.openai.com/cookbook/examples/agents_api/sandboxes/databricks/readme), **October 23, 2026** | Enabled for article **discovery**, not automatic article selection. Recipe credits Databricks author; validate original technical novelty/attribution and tool claims. No API execution authorized. |
| `research-20261026-a04` — Pydantic Engineering Blog | [Pydantic articles](https://pydantic.dev/articles) lists *Run Pydantic AI coding agents in E2B sandboxes*, dated **October 22, 2026** | Enabled for article discovery. Topic discusses a third-party sandbox; **do not run/use a billable sandbox**. Exact publication/freshness and article contents still need editorial selection review. |
| `research-20261026-a12` — n8n Automation Engineering Blog | [AI Agent Memory: How LLM Agents Manage State in Production](https://blog.n8n.io/ai-agent-memory-how-llm-agents-manage-state-in-production/), **October 23, 2026**, 10-minute source read | Enabled for article discovery. Page identifies a **Cognee guest/partner author**. Do not count it as independent evidence or insert without novelty review. |
| `research-20261026-p03` — The AI Native Dev (Tessl) | [Tessl episode 128](https://tessl.io/podcast/128), **October 20, 2026**, **46:31**, with dated AI/Skills/MCP/agent-security chapter guide | Enabled for **podcast discovery only**. Detailed episode synopsis exists, but independently completed audio playback, exact AI percentage and current 3-edition show cooldown are **not certified**. Final inclusion must fail closed absent those checks. |

**New video sources admitted: zero.** Official channel or video-library
landing pages, including [Google for Developers on YouTube](https://www.youtube.com/@GoogleDevelopers/videos),
have not supplied adequate evidence of actual full-length playback, educational
substance, dated individual-video metadata and current relevance in this change.
All seven proposed video leads are present but disabled. No promotional/private
video gets an automatic exception.

## Current producer connection and governance

The current `docs/SEMANTIC-PRODUCER-CONTRACT.md` explicitly reads
`config/resource-registry.json` before EDITORIAL, and has now been clarified
to require **`enabled === true` and a matching article/video/podcast
`content_types` role**, preserving both ID and source URL. The pure
`operations/resources.mjs:activeDiscoveryResources` provides the same
read-only selection for deterministic source-ingress tests. Current runtime
selection stays semantic: entries are candidate publishers, **not**
preselected stories or media. Normal editorial and prospective
source/media item gates remain intact, including publisher independence,
original dates, last-seven teaching delta, accepted playback,
episode identity, 75%-AI podcast evidence and show cooldown.

No changes are authorized to scheduling, Watchlist scoring, quotas,
production pipelines, archive, AAR, image work, the 21:15 separate Work
task, CI workflows, or any paid API/provider. This source edit does
**not** run any existing or extra production cycle.

## Verification acceptance and limitations

- **Existing source preservation:** original 69 JSON resource objects
  must be byte/field equivalent after the append (diff inspection).
- **v1 schema and health:** new role/priority/mode enums legal;
  all newly created health records remain `unknown`.
- **Idempotent mapping:** existing IDs and normalized URLs never reinserted;
  a second dry-read/selection yields identical candidate IDs and unchanged input.
- **Enabled-only ingress:** test shows three added article routes, no new
  video route, one added podcast route; disabled leads cannot enter
  unattended producer candidate inputs.
- **Full regression:** `npm test`, `npm run validate:bootstrap`,
  `npm run fixture:e2e` and current protected CI must pass before merge.
- **Natural-cycle observation:** the first next pre-existing 19:15
  EDITORIAL run must provide real selected/discovered yield and counts
  if such receipts exist; otherwise report `AWAITING_NATURAL_CYCLE`.
  No first-run success, Work-quota savings or full-media item approval
  may be inferred from this configuration-only release.

If a new route is unproductive, the minimal rollback is a **source-only,
protected PR** disabling only that newly activated entry. Do not roll back
unrelated existing resources or mutate an already published edition.
