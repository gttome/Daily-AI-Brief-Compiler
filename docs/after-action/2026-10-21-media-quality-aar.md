# October 21, 2026 — Media Editorial Quality After-Action Review

**Incident:** DAB-MEDIA-20261021-001 · **Status:** Owner-confirmed editorial-value defect; replacements selected; publication not yet verified.

## Owner-observed failure

The owner opened both videos and assessed them as advertisements with very little value. The second podcast was a broad world-news program with only a small AI segment. This is a **substantive usefulness failure**, not merely a broken URL, publisher diversity issue, or absent runtime. The owner's firsthand assessment is recorded as observation; no reviewer falsely claims to have watched/listened to all three source items.

## Root cause

The admission process checked names, stable source identity, duration, current episode links, publisher/channel rotation and evidence scope, but did not require sufficient **teaching value** from the actual video content or an **AI-majority episode**. A 32-second launch montage, a 96-second product demo and a general-news podcast met structural criteria but failed the publication's reader-value intent. These are independent failures from the October 17 private-video defect.

## Replacement selections (pending protected release)

| Slot | Remove | Replacement / sources | Publication and content evidence |
|---|---|---|---|
| Video 1, general | VideoGen Model 1 launch film · 0:32 | [3Blue1Brown, Large Language Models explained briefly](https://www.youtube.com/watch?v=LPZh9BOjkQs) | November 20, 2024; 7:58; [official substantive written lesson](https://www.3blue1brown.com/lessons/mini-llm/) explains next-token sampling, training and transformer attention; an **evergreen** educational replacement, not fresh news |
| Video 2, nontechnical | Glean Skill Reflection product demo · 1:36 | [IBM Technology, RAG vs Fine-Tuning vs Prompt Engineering](https://www.youtube.com/watch?v=zYGDpG-pTho) | 2025 educational explainer, approximately 13:10; [IBM publisher educational item](https://mediacenter.ibm.com/media/RAG%2Bvs%2BFine-Tuning%2Bvs%2BPrompt%2BEngineering%3A%2BOptimizing%2BAI%2BModels/1_0r35dbjl) contrasts technique and use case; **11–20 minute quality fallback**; evergreen, not 2026 launch news |
| Podcast 2 | Reuters World News mixed-topic episode · 13:16 | [Practical AI E376: Is Education Failing our Students in this AI-Driven World?](https://practicalai.show/376) | October 15, 2026; 43:51; [publisher transcript](https://practicalai.show/376/transcript) examines AI and education through the episode; show absent from Oct18–20 Briefs |

Reader use: 3Blue1Brown establishes the underlying LLM mental model. IBM distinguishes when prompting, retrieval or fine-tuning is appropriate for an organization; avoid vendor-specific endorsement. Practical AI examines AI-assisted learning while preserving critical thinking and human judgment. None is presented as independent product benchmark or news from October 20. **Actual full playback/listening is unverified**; textual source evidence and publisher identity do not prove playback. Review sponsored segments before release.

## Permanent admission fixes (new editions October 22 onward)

1. **Ad/repackaged-launch rejection:** a short brand montage, product launch trailer or thin marketing demo must fail even when metadata and an official link are valid. Require at least three factual transferable teaching points OR one demonstrated reproducible procedure with clear steps, caveats and practical reader outcome. Verify these against a substantive source, transcript, chapter sequence or real playback—not promotional metadata.
2. **AI-majority podcast:** the episode must devote at least 75% of editorial/non-ad runtime to substantive AI topics, recorded as transcript/agenda/timestamp evidence. Broad political/world-news shows with short AI interludes are disallowed. State unknown when full runtime cannot be assessed, and do not promote that candidate.
3. **Value-based media rubric:** record `learning_objectives`, `transferable_takeaways`, `practical_action`, `content_scope_evidence`, `estimated_editorial_ai_fraction`, `promotional_risk`, `selected_over_alternatives`, `reviewer_disposition` and whether runtime/identity/content/playback were *separately* checked.
4. **Visual/textual publication check:** an accepted replacement must have correct heading, original item date, duration, summary, source link, permanent route, archive, feeds, feedback identity and 17 protected historical objects. Source selection alone is NOT publication. The two videos need substantive full-length playback availability checks at the release gate when supported; YouTube metadata fallback must remain labeled `playback_verified:false`.
5. **Learning-regression cases:** flag a 32-second product trailer; a 96-second promotional demonstration; a 13-minute international news digest with a brief AI report; reject claims that an official source description equals watched content. Positive checks require an educational tutorial and an AI-centric transcript.

## Scope, release and integrity

Original editorial bundle SHA-256: `eb89487277260254468b9dfce91d91736cfcb072893bf772e7ccf3b48e1d438f`. October 21 image job SHA-256: `a023a981fce77b06546441515df4d0408077e669e551bffaf15bd0e252a8a134`. Corrections must not rewrite either, rerun research, redo or replace six story images, or touch the retired Brief repository. Image worker and protected Pages publishing must not conflict. Preserve the six articles, other podcast, Watchlist, books, and original readers' ratings under stable IDs.

**Verification state:** Replacement links researched; GitHub release, exact route diff, protected CI, image/preservation tests and live final readback are separate mandatory acceptance gates. Do not declare fixed from this report alone. No weekly usage percentage was supplied for this correction.
