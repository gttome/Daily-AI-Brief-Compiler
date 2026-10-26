# October 26 Deep Research — source-only admission for existing 19:15 CT compiler

**Status before protected CI/merge:** proposed; **post-merge source-yield status:** `AWAITING_NATURAL_CYCLE`. The already scheduled 19:15 America/Chicago EDITORIAL producer must be the only natural run that measures source usefulness. **No new schedules**, image jobs, Work/Codex/TinyFish, paid APIs, workflow edits, publication edits or historic reseals.

## Scope and reconciliation

The completed Deep Research report supplied **13 entries** (7 article, 5 podcast, 1 video), **not** the hundreds originally requested. Do not claim a larger research inventory. Re-read protected main `df7edefe6c6d85268f69cfc381b887bed3f0e268` before this change: **97** registered, **73** enabled; only unrelated image-process documentation PR #159 was open. Existing source helper `operations/resources.mjs:activeDiscoveryResources` already implements enabled-only role filtering and current `docs/SEMANTIC-PRODUCER-CONTRACT.md` already instructs the producer to read the live registry.

Five Deep Research entries were already registered and are **reused, not duplicated**:
- Article: OpenAI News/Research (`openai-news`), Google DeepMind (`deepmind` plus existing `google-deepmind-blog` article route), Meta AI Blog (`meta-ai-blog`).
- Podcast: TWIML AI Podcast (`podcast-twiml`), Eye on AI (`podcast-eye-on-ai`).

Eight distinct URLs not present in the 97-row registry are catalogued as one new row each below. Two article routes belong to organizations **already represented** (Google Research is not independent of Google DeepMind; NVIDIA News is not independent of NVIDIA Technical Blog). Do not count distinct URLs as independent publishing organizations.

## New sources and original item evidence

| Resource ID / source | Type | Route and original evidence | Admission for tonight |
|---|---|---|---|
| `deep-20261026-a01-google-research` — Google Research | Article | [Original research index](https://research.google/blog/) lists **Oct 23 2026** 'Bringing foundational models to the front lines of TB screening'; [original Oct 14 article](https://research.google/blog/research-2026-10-ways-were-amplifying-human-ingenuity/) has a clear date | **ENABLED, discovery only**. Google-owned; exact original-date/168-hour/novelty gates still apply |
| `deep-20261026-a02-microsoft-ai` — Microsoft AI | Article | [Microsoft AI Blog](https://microsoft.ai/blog/) and [news index](https://microsoft.ai/?post_type=new) list **Oct 15 2026** 'Frontier Pre-training at Microsoft AI' and further MAI model articles | **ENABLED, discovery only**. Vendor evidence, not independent corroboration |
| `deep-20261026-a03-nvidia-news` — NVIDIA News Blog | Article | [Original NVIDIA Blog](https://blogs.nvidia.com/) links [Oct 15 2026 Nemotron article](https://blogs.nvidia.com/blog/nemotron-3-5-super-vl/) and Oct 12 GTC update | **ENABLED, discovery only**. Same corporate publisher as existing NVIDIA technical blog; exclude unrelated gaming items |
| `deep-20261026-a04-synced` — Synced Review | Article | [Synced](https://syncedreview.com/) currently lists **Aug 14 2025** as latest visible original post | **DISABLED**. Report's unsupported 2026 freshness claim corrected; no current qualifying source item |
| `deep-20261026-p01-lex` — Lex Fridman | Podcast | [Episode #501](https://lexfridman.com/dhh-2) is **Aug 26 2026** and mixed AI/non-AI; [latest #502](https://lexfridman.com/andrew-scull/) is **Sep 16 2026**, largely psychiatry | **DISABLED**. No fresh independently verified AI-dominant episode |
| `deep-20261026-p02-data-skeptic` — Data Skeptic | Podcast | [Original episode list](https://dataskeptic.com/podcast) dates [Gestures Around the Ear](https://dataskeptic.com/blog/episodes/2026/gestures-around-the-ear) **Oct 18 2026** | **ENABLED, discovery only**. This HCI episode is *not* approved as >=75% AI; verify fresh episode, program identity, content and runtime before selection |
| `deep-20261026-p03-talking-machines` — Talking Machines | Podcast | [Apple Podcasts show ID 955198749](https://podcasts.apple.com/us/podcast/talking-machines/id955198749) identifies final listed episode **Sep 9 2021**, 40 min | **DISABLED**. Not a current 2026 show despite Deep Research report's inference |
| `deep-20261026-v01-two-minute-papers` — Two Minute Papers | Video | [Official YouTube channel](https://www.youtube.com/channel/UCbfYPyITQ-7l4upoX8nvctg), [Oct 19 2026 exact watch link](https://www.youtube.com/watch?v=LWxX6vvHfrc), approx **6m49s**, independently indexed with explanatory summary and source links | **ENABLED, discovery only**. Signed-out full playback was **not** verified by this research. Existing exact video playback/educational gate must pass before item selection |

All eight new resource-health objects start **unknown**, with null check/yield values; source route research is not a successful unattended runtime observation.

## Expected registry after protected merge

- **105** resources total = 97 unchanged original rows + 8 distinct additions.
- **78 enabled** = 73 unchanged + 5 newly enabled; **27 disabled** total.
- Article: **51 registered / 39 enabled**; Video: **11 registered / 4 enabled**; Podcast: **27 registered / 19 enabled**.
- All 13 reported sources accounted for: 5 existing source matches, 8 appended, of which 5 enabled and 3 disabled.
- The exact prior October 26 69→97 expansion and its 28 candidate records are retained without modification. No alias or role is reinserted under an already registered URL.

## Existing 19:15 CT test — observation, not forced publication

On the next **already scheduled** 19:15 CT EDITORIAL cycle, after reading current protected-main registry and seven published editions, sample a **bounded** relevant dated item from each of the five newly enabled source IDs alongside existing reliable sources. Record actual route reachability, item URL, original publication date, publisher/show identity, eligibility/quality reason and observed yield through the existing source-observation/research evidence mechanism. Stop on unproductive routes; do not poll or schedule a separate check. The 19:15 task remains unchanged.

**Do not force inclusion** of any newly enabled source: Google and NVIDIA share their existing corporate publisher identity, the Data Skeptic Oct 18 HCI episode is not independently 75%-AI-verified, and Two Minute Papers still requires real signed-out player/full-content review. If the natural cycle never uses these sources, report zero usable candidates, not a false PASS. Existing article freshness (24/72/168 hours), exactly six stories/2-2-2/one Agent Skills, two independently qualified videos, two program-diverse verified podcasts, full-archive no-reuse, editorial novelty, show cooldown, Watchlist, images and paid-service restrictions are untouched.

## Acceptance

Protected PR required, no direct main push. Existing `npm test`, `npm run validate:bootstrap`, `npm run fixture:e2e`, reader parity and protected exact-head `validate` must pass. Diff must be limited to source registry, source-only editorial instructions, tests and this evidence file. Post-merge re-read main and compare the first 97 resource objects exactly. Until the natural compiler research receipt is inspected, the only honest runtime outcome is `AWAITING_NATURAL_CYCLE`; do not claim 19:15 production selection or any published change.
