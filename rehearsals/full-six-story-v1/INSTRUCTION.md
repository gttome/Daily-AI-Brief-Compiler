# Full Six-Story Producer Rehearsal Instruction

Target edition date: 2026-10-07.
Mode: non-production real-content rehearsal.
Repository boundary: gttome/Daily-AI-Brief-Compiler only. Never access or modify gttome/Daily-AI-Brief and never use a prior Brief as editorial evidence.

Use ordinary Scheduled ChatGPT web research for current public evidence and connected GitHub for persistence. No Work, Codex, paid APIs, browser automation, external image apps, owner upload, alternate accounts, Supervisor, Watchdog, lease, worker pool, wake PR, continuous monitoring, or runtime code repair.

Read Compiler editorial/product contracts first. Reuse any valid existing rehearsal output; never redo completed work.

Persist only under rehearsals/full-six-story-v1/.

## Editorial
Research current AI developments from authoritative primary or highly credible public sources. Freshness hierarchy: <=24h priority, <=72h normal fallback, <=168h extended fallback only when necessary. Use original publication date.

Select exactly 6 differentiated stories in this exact reader order:
1-2 Agents for Everyone
3-4 Applied Generative AI for Knowledge Workers
5-6 Technical AI Engineering

Exactly one of the six must be a genuine reusable Agent Skills story.

Persist editorial/editorial.json with candidates considered, evidence metadata, freshness tier, selection/rejection rationale, locked=true, and selected story IDs.

## Story content
Persist stories/<story-id>.json for all six with:
id, headline, focus, source {title,publisher,url,published_at,retrieved_at}, reading_time_minutes, topics, coverage_labels, summary, why_it_matters, related_coverage, image_alt_intent, agent_skills boolean, permanent_route=/stories/2026-10-07/<slug>/.
No internal orchestration/run language in reader text.

## Media
Persist media/media.json:
- exactly 2 verified videos; target <=10 min, fallback <=20 only when necessary; title, source/channel, URL, original date, duration_minutes, focus, summary, why_it_matters, verified=true.
- exactly 2 verified source-diverse podcasts; episode title, source, URL, original date, duration_minutes, written_reading_time_minutes, summary, why_it_matters, verified=true.

## Emerging AI Watchlist
Persist watchlist/watchlist.json with arrays new, updated, carried_forward, dropped. Use current public evidence. Include topic and why/what_changed as appropriate. Dropped items require rationale. Meaningfully refresh; do not copy a prior Brief.

## Books
Persist books/book-mappings.json. Cover all four titles across the edition where substantively appropriate:
- Reliable Generative AI
- Reliable Generative AI Context Engineering
- Generative AI Professional Prompt Engineering Guide
- Generative AI Prompt Engineering Learning Ecosystem

Each mapping: story_id, book, concept_or_chapter, connection, what_to_study_next. Do not invent exact chapter/page numbers; concept-level mappings are acceptable.

## Images
Persist exactly six specs at images/specs/<story-id>.json using daily-compiler-diagram-spec-v2. Use each qualified grammar exactly once: pipeline, layered_system, control_loop, hub_spoke, comparison, state_machine. Each spec requires story_id, grammar, title <=60, subtitle <=110, exactly six mechanism nodes, exactly three evidence/callout cards, flow_label, footer, optional group_labels/palette. No pixel coordinates, people/humanoids/faces/avatars/photos/decorative characters, or generic filler. Every mechanism must be story-specific.

## Checkpoint
After all six specs are committed, persist producer-checkpoint.json:
EDITORIAL=complete; CONTENT=complete; IMAGES specs=6/6; selected stories=6; allocation=2/2/2; Agent Skills=1; videos=2; podcasts=2; Watchlist=complete; books=complete; owner_intervention=false; work_used=false; codex_used=false; paid_model_api_used=false; semantic_rework=0.

## Render boundary
Perform only bounded checks for images/rendered/<story-id>/receipt.json and proof.png. Do not create monitoring/waiting state.

If all six deterministic renders are already available, fetch exact persisted GitHub PNG bytes as base64 in Code Mode and pass those exact bytes into visual reasoning. Review actual pixels for professional quality, mechanism clarity, hierarchy, readable labels, no overlap/out-of-card text, no essential clipping, no people/humanoids/photos, not sparse/basic, semantic correspondence, and set differentiation. Persist images/reviews/<story-id>.json.

If every exact asset passes, persist producer-receipt.json with result=PASS and assemble edition-bundle.json compatible with daily-compiler-edition-bundle-v1. Do not create a shadow execution.

If all renders are not ready, persist full-rehearsal-receipt.json with result=INCOMPLETE, code=DETERMINISTIC_RENDER_NOT_YET_AVAILABLE, completed semantic outputs, accepted_image_regenerations=0, owner_intervention=false, then stop. A later bounded recovery must reuse all persisted semantic outputs unchanged.
