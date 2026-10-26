# Daily Compiler Editorial Contract

This document defines reader-facing output quality, not orchestration.

## Edition

Every edition must contain exactly:

- 6 article stories
- 2 Technical AI Engineering
- 2 Applied Generative AI for Knowledge Workers
- 2 Agents for Everyone
- exactly 1 reusable Agent Skills story
- 2 verified videos
- 2 source-diverse podcasts
- 1 refreshed Emerging AI Watchlist
- reader-value book connections
- 6 accepted professional explanatory diagrams

## Freshness

1. prioritize the most recent 24 hours;
2. normal fallback through 72 hours when needed;
3. extended fallback through 168 hours / 7 days only when fresher qualifying material is insufficient and editorial value justifies it.

Use original publication date, not modification time.

## Story requirements

Each story requires a headline, source date, authoritative/credible source, professional explanatory diagram, substantive summary, Why it matters, reading-time estimate, focus/category, reader-facing topics/coverage labels where used, and permanent story route.

## October 13 and later reader-density requirement

The October 8, 2026 published Brief is the normative *reader-length* exemplar, not a requirement to reduce factual research or source verification. For every **new edition dated October 13, 2026 or later**, each of the six article stories must have:

- **Topics:** exactly 3 distinct concise keyword phrases, each 1–4 words.
- **Summary:** **45–60 words**, grounded in actual verified source facts.
- **Why it matters:** **32–45 words**, communicating a professional consequence or decision rather than repeating the Summary.
- **What you'll learn:** **32–45 words**, conveying a reader capability or outcome. The current canonical reader derives this block from the same story-level `why_it_matters` field, so that field's 32–45-word bound applies to both rendered sections.

These limits apply to the *reader-facing editorial text*, not full publisher reading/evidence records, underlying research capsules, image specifications, or immutable historical content. **Do not truncate using CSS or blind programmatic slicing.** Rewrite only the invalid new story while retaining the facts, citations and accepted content, before sealing its new immutable bundle.

The Release 1 validator enforces word counts and topic cardinality as a hard gate on new editions beginning October 13. The canonical homepage, dated Brief and permanent pages must show equivalent concise copy. The October 8–12 corpus remains unchanged and must never retroactively fail or be republished.

### Prospective article publisher balance — October 19, 2026 onward

The October 18 edition contained three AWS and two SAP articles out of six. This was allowed by the old distinct-URL check, because an AWS blog department and an SAP news page count as different URLs but are **not** independent publishing organizations. The same type of concentration should not recur in new editions.

For each **new** six-article edition, select for depth, factual significance, freshness and relevance while ensuring:
- **Target six different publishing organizations**, with a **hard minimum of five**. A second story from one other organization is permissible when it adds distinct evidence or substantial reader value, but no organization may supply more than two.
- **At most one AWS article and at most one SAP article.** Normalize the original source URL to the publishing organization; AWS Machine Learning and AWS Public Sector are both AWS, all SAP News domains are SAP, and Google Research/Google Cloud are Google. Rebranding a source label does not create a different publisher.
- Before locking a new selection, inspect the **seven most recently published editions** and deliberately prioritize authoritative publishers underrepresented in that period. Record the seven-edition source exposure in the release receipt, including gaps in archived evidence. These rolling counts guide editorial ranking; they never justify invented articles or manipulation of the source identities.
- Look beyond one vendor's feeds for credible source documents from independent researchers, Microsoft, IBM, NVIDIA, Databricks, Google, GitHub, Anthropic, OpenAI, open research venues and independent practitioners. Publisher-authored claims must still be represented as such; don't invent independent confirmation.
- Preserve the **2 technical / 2 knowledge-worker / 2 nontechnical-agent** allocation and **exactly one Agent Skills article**. Preserve the 24h/72h/168h freshness ladder and verified full reading evidence. An extra brand is not worth a speculative, old or irrelevant story.

The same prospective diversity check is enforced before new pending-image bundle sealing and independently in the existing bundle-ready and Pages publisher validation flow. On failure, correct only the unsealed future selection; don't relax the rule, borrow an already published article as filler, or touch a historical bundle. No new AI schedules, workflow runners or paid APIs are authorized.


### Historical article links — October 20, 2026 onward

The `Earlier Brief` panel is **opt-in, never inferred**. Do not select a prior article by category, date, or the original reader's frozen October 6 snapshot. The story-level `related_coverage` field describes the current edition and **must never be reinterpreted as evidence of a historical connection**. Without a verified historical reference, omit the panel entirely.

An optional story-level `historical_related` object may contain `url` (an exact prior `/stories/YYYY-MM-DD/slug/` route), `headline` (exact historical headline), `relationship` (`builds_on`, `contrasts`, `updates`, or `applies`), and `connection` (at least 16 meaningful words specifically explaining what the earlier article contributes). The deterministic reader verifies that the link, headline, availability and date appear in the actual prior published `data/archive-index.json` from the same Pages-history revision as the prior Watchlist. Reject a current/future link, missing archive evidence, mismatched headline, generic companion-story inventory or empty explanation. Do not invent a link to fill space; editorial review remains responsible for checking factual relevance.

Historical editions and accepted image assets stay immutable except for narrowly scoped, explicitly audited reader-text corrections. No production AI usage, new scheduler or external paid service is required.

## Media

- 2 verified videos; target <=10 minutes, fallback <=20 minutes only when necessary.
- 2 source-diverse podcasts with verified episode identity/date/source.

### Prospective media non-repetition — October 19, 2026 onward

For every newly sealed edition, check both video identities and both individual podcast episode identities against the **seven most recently published previous Briefs** (not merely the current candidates). A reused YouTube video, podcast episode URL/Apple episode ID, or identical substantive title is a publication defect even if metadata was rechecked. **Program rotation is additional to episode uniqueness.** The two podcasts must be from two different programs, and neither program may have appeared in the **three most recently published previous editions**, even if the episode, URL or display title has changed. Prefer a **seven-edition program gap** when qualifying fresh episodes exist. Match both the normalized program/publisher label and a stable show ID (for example, Apple Podcasts show ID), not just the episode ID. Return to a high-quality program only after the cooldown. If the available pool is insufficient, expand research among verified programs rather than repeat a show by default; preserve source verification and never fabricate an episode. Past October 15–18 editions remain immutable. Source verification does not imply actual audiovisual playback. The bundle-ready and Pages workflows independently fail closed when published media history cannot be verified or an exact item is repeated. Previously published October 15–18 bundles remain immutable. Select genuinely new media; never falsify identities or disable the validation gate.
- Source links open in a new tab.

### Instructional substance and AI focus — October 22, 2026 onward

The October 21 edition was published with two videos the owner identified as low-value advertising (a 32-second product-launch montage and a 96-second branded demo), and a Reuters general-news podcast in which AI occupied only a small segment. Metadata, channel variety, public access and source dates did **not** establish reader usefulness. The [October 21 media AAR](after-action/2026-10-21-media-quality-aar.md) records the observations, replacement sources and failure analysis.

**Video admission:** Prefer 5–10 minute genuinely instructional material (up to 20 minutes only on explicit quality grounds). Reject short product trailers, promotional montage, marketing advertisements, undifferentiated vendor demos and content with no teachable mechanism. Before sealing record at least **three distinct concrete transferable teaching points** or **one genuinely reproducible task/procedure** with enough explanation to carry it out, its boundary/risks and an explicit professional action. Check a source transcript, chapter/timestamp notes, first-party substantive companion lesson or actual viewed video content. Promotional description alone does not establish educational value. Reviewer should describe objective learning, not marketing claims. A verified YouTube video ID or publisher page remains necessary but is never sufficient. Do not claim actual playback unless the full-length media was tested.

**Podcast admission:** Require the individual episode to be *primarily about AI*. As an editorial cutoff, at least **75% of substantive, nonadvertising episode duration** must cover AI methods, adoption, governance, practical workflows or directly supported AI developments. Substantiate the estimate from a whole-episode transcript, chapter/timecode listing or sufficiently complete listening observations; record supporting portions and any unrelated topics. A general world-news or politics digest does not qualify merely because one story mentions AI. If the AI share is unknown, research another episode rather than invent a pass. Keep program diversity and 3-edition cooldown.

**Per-item quality review:** Record learning objective, 3 takeaways (or reproducible procedure), directly supported use case, content-coverage evidence, ad/promotional risk, estimated AI proportion for podcasts, unique reader value, source identity/date/runtime, and separate content-reviewed and playback-verified scopes. Reject weak items early and research alternatives instead of filling a quota. New editorial controls are **human/producer review criteria** until a compatible deterministic validator is merged and genuinely tested; do not claim that metadata-only CI checks prove editorial usefulness.

**Exceptions:** An explicit owner-directed post-publication correction may use evergreen educational material outside the new-edition 168-hour freshness ladder, clearly label the original publication date and the evergreen purpose, and preserve the immutable original bundle/images. Original historical material remains unchanged; repairs use a protected scoped reader-only correction. The October 21 exceptions are not reusable excuses to select old media in routine future briefs.

## Watchlist

Reader-facing states: New, Updated, Carried forward. Show what changed today and explain dropped topics when applicable.

### Watchlist editorial copy — effective October 14, 2026

Every **new, updated, carried-forward and dropped** item needs three **separately authored** reader fields in the sealed edition bundle:

- `summary`: **What it is** — describe the capability, workflow or research question in ordinary language.
- `why_now`: **Why now** — name the dated verified source development, changed evidence or reason a topic is carried/dropped; do not confuse an old original publication date with a corrected page date.
- `practical_value`: **Potential value** — explain a specific plausible use, reader decision, evaluation or bounded experiment. Keep uncertainty explicit; do not invent adoption, performance or broad availability.

All three are substantive, 7+ words and not substantially overlapping. They may share technical terms but **must not restate the same evidence sentence**. This is editorial work, not deterministic template expansion. If a field is missing or repeats another, the producer must correct the semantic bundle **before publication**. Deterministic compiler and built-reader validators fail closed. No copy padding, synonym-only rewriting, identical fallback fields or degraded placeholder text. Historical content before the effective date is not retroactively invalidated.

### Watchlist evidence-weighted scoring — October 16, 2026 onward

**No generic 60/100 fallback.** Each new or materially updated Watchlist topic in the sealed edition bundle must contain a real `rubric` object. It must give a separate `{score,reason}` for each of the six criteria: **novelty (20%)**, **evidence (25%)**, **independence (15%)**, **momentum (15%)**, **relevance (15%)** and **durability (10%)**. Scores are integers 0–5 or `null` when genuinely unmeasured. Each reason must be specific, substantive and distinct from every other criterion, explaining the available original evidence and its limitations. Compute the provisional /100 research score from these weights (the reader does this automatically); do not handwrite a score.

A single original publisher source does **not** demonstrate two independent developments. Both new and materially updated topics must mark momentum unknown (`null`) unless comparable past observations are recorded in `momentum.metric` and at least two `momentum.observations` with distinct valid `observed_at` timestamps, numeric `value` and HTTPS `source_url`; do not substitute first publication date or an unrelated source as momentum evidence. A 3/5 score across all six criteria with copied reasons is a **publication defect**, not a neutral baseline. Read the source and assess each criterion independently rather than fabricate data to pass a check. Earlier original edition bundles remain immutable.

Existing carried-forward or archived topics may keep their last **genuinely reviewed** rubric until credible new evidence warrants revision. When an existing topic is updated materially, refresh its six reasons and scores alongside the dated evidence. For a post-publication score defect, use a scoped `watchlist_rubric_correction` with exact topic identifiers, original-evidence URLs and audited old scores; never recompile editorial content, replace accepted illustrations or reopen historical editions.

For corrections to an already illustrated published edition, change only the verified Watchlist reader surfaces. Preserve exact current and historical image bytes, published articles, archived source bundle, and the normal 19:15/21:15 autonomous schedules.

## Books

Mappings are for reader value, should draw across the required Generative AI Professional Series, and must contain no run/control-plane language.

## Editorial learning-value novelty — new editions from October 27, 2026

**Different publication is not necessarily different instruction.** Before selecting, compare all six reader outcomes with the last seven actual published editions, in addition to the full-history exact URL/episode/headline check. For each story assess source-backed new development, concrete new reader action, what differs from the closest earlier article, and the evidence and uncertainty behind that distinction. A vendor change, different noun in the headline, or product walkthrough repeating *create Skill → review/test → reuse* is insufficient. When marginal value is weak, choose a substantively different verified item before sealing—not a cosmetic rewrite.

The October 26 Microsoft business Skill-authoring lab overlaps the instructional value of the October 25 Plaud, October 23 Metis and October 22 Salesforce Skills stories. It is retained as an honest historical observation; no edited October 26 article/image digest, archive page, or image-job handoff is authorized by this forward-only rule.

For October 27 onward the **existing** bundle-ready and protected reader publishing workflows both run the narrowly scoped deterministic `editorial_novelty` validator inside `scripts/verify-media-freshness.mjs`. It compares against the published archive, produces auditable candidate links, and rejects high-confidence copied explanations or a generic Skill-authoring lesson taught in at least two of the past seven published editions. A keyword or topical match alone is a research lead, not proof of duplication. The actual editorial producer must still review all six individual outcomes; deterministic similarity is not an AI judgment and cannot guarantee semantic uniqueness.

Do not weaken 2/2/2, the mandatory single Agent Skills item, source reading, freshness, preservation, protected CI, or the zero-charge unattended production policy. Do not add a worker/schedule, paid semantic embedding API, image generation dependency, or changes to completed editions.

### Oct27+ research and video variety incremental controls

The October 26 unified AAR found **0/6 selected articles published within 24h** and **two evergreen videos from the same educational publisher**. Neither is automatically a policy violation: factual original publisher dates, verifiable teaching value and source-justified 72h/168h fallback outrank recency padding or promotional videos. The preexisting current source discovery, broad candidate pool, seven-edition publisher history, verified video prequalification and publisher exceptions remain in force.

New editions must document separate, source-specific freshness comparisons rather than repeating a generic fallback rationale across six different stories. A same-publisher video pair still requires the previously implemented independent cross-publisher candidate reviews and now, for October 27+, distinct substantive educational objectives and distinct comparative selection reasons for each chosen video. Two genuinely different publishers remain preferred. Preserve age-accurate **Evergreen instructional video** labels already verified on the original October 26 pages. Read [approved October 26 incremental implementation register](automation/OCT26_APPROVED_UNIFIED_AAR_INCREMENTAL.md); no additional worker, paid API, weakening of existing player checks or edits to published October 26 content.

## Images

Each of the six stories requires one professional explanatory diagram:

- approximately 1200 x 630
- white/light professional background
- textbook / consulting-report quality
- high detail and mechanism-oriented
- readable labels and clear hierarchy
- no overlapping text
- no sparse generic boxes
- visually differentiated across the set
- no people/humanoids/faces/avatars/decorative characters
- no low-quality fallback or placeholder
- exact persisted asset must be reviewed before acceptance
- an accepted immutable image is never regenerated during recovery

## Simplicity invariant

Reader quality may not be reduced to simplify production. Conversely, reader requirements may not be used as justification to reintroduce a Supervisor, Watchdog Ring, leases, 30-task orchestration, continuous AI polling, wake PRs, or runtime repair loops.


## October 20 owner-approved improvements — October 21 onward

Read and apply [the six approved production improvements](automation/OCT20_APPROVED_IMPROVEMENTS.md). New editorial bundles require real chronology, nontechnical audience-fit evidence, video publisher variety and exact podcast episode links. New image packages require story-specific label/causal-state preflight plus canonical reviews/after-action.json and after-action.md. Preserve historical bundles and accepted PNGs. Complete actual 24-context visual QA and terminal closeout after release; never infer semantic PASS from screenshots or CI. Keep existing schedules and one worker per lane.


## October 21 AAR corrective controls — effective October 22 onward

The previous subsection describes human editorial objectives; the actual new-edition deterministic schema and percentage checks are now provided by compiler/media-quality.mjs through validateMediaPrecision. Read [October 21 permanent safeguards](automation/OCT21_AAR_IMPROVEMENTS.md) for the required quality_review, substantive video evidence, three teaching points/reproducible procedure, podcast near-complete timestamp coverage and >=75% AI editorial share. These deterministic checks validate evidence structure and the declared source coverage, not the intrinsic truth of a review. The existing public video gate independently requires a duration-matched player to advance, not just metadata. Preserve both verification scopes and all already-published editions.

Image admission continues to require six accepted, hashed professional PNGs and actual 24-context pixel inspection. New image package AARs must carry executor-observed first-entry and immediately pre-generation UTC instants, not invented scheduled execution or native-provider times. Owner weekly Work usage is optional, source-bound per cycle, never estimated or carried forward. No new AI schedulers or paid workflows.


## October 23 approved forward-only hardening — October 24+ editions

Read [the nine-proposal deduplicated implementation contract](automation/OCT23_APPROVED_IMPROVEMENTS.md) before sealing an October 24 or later edition. Video research must substantiate six distinct reviewed substantive candidates across three publishers, podcast editorial form and long-episode multiple timestamp sections must be recorded, and original-source discovery must include at least eight reviewed candidates with truthful fallback decisions for items older than 24 hours. Existing actual playback, AI-percentage, rubric, human review, protected CI and historical non-repetition gates are unchanged. For image packets, retain accepted hashes and use the tighter pre-generation export-size geometry requirements. The sole scheduled workflows and zero additional-cost restrictions remain unchanged.
