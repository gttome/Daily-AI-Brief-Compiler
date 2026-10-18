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

## Media

- 2 verified videos; target <=10 minutes, fallback <=20 minutes only when necessary.
- 2 source-diverse podcasts with verified episode identity/date/source.

### Prospective media non-repetition — October 19, 2026 onward

For every newly sealed edition, check both video identities and both individual podcast episode identities against the **seven most recently published previous Briefs** (not merely the current candidates). A reused YouTube video, podcast episode URL/Apple episode ID, or identical substantive title is a publication defect even if metadata was rechecked. A different episode from a recurring program is eligible; retain source diversity within each edition and prefer varied publishers from the prior edition. Source verification does not imply actual audiovisual playback. The bundle-ready and Pages workflows independently fail closed when published media history cannot be verified or an exact item is repeated. Previously published October 15–18 bundles remain immutable. Select genuinely new media; never falsify identities or disable the validation gate.
- Source links open in a new tab.

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
