# Maintaining the Brief Compiler explainer pages

**Scope:** Public site pages at /sources/ and /build-your-own-brief-compiler/  
**Owner:** Brief Compiler editorial owner  
**Editorial review:** October 27, 2026  
**Change class:** Website content and presentation only—no source activations, editorial resealing, image regeneration or new schedule

## Why these pages exist

They explain the **transferable editorial system**, not merely the daily AI newsletter. The Brief Compiler connects sources, demonstrations and practitioner perspectives into a coherent edition that can also yield **reviewable proposals** to keep a body of knowledge current. New adopters need not duplicate the existing six-story 2/2/2 subject allocation.

## Canonical sources

| Purpose | GitHub source | Website |
|---|---|---|
| Six examples, responsible self-evolution, starter charter | [Canonical website Markdown](../../site-content/build-your-own-brief-compiler.md) | [Build Your Own Brief Compiler](https://gttome.github.io/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/) |
| Source directory and summary | [Sources renderer](../../compiler/source-transparency.mjs) | [Sources](https://gttome.github.io/Daily-AI-Brief-Compiler/sources/) |
| Site route and navigation contracts | [Brief page contract](../../compiler/brief-builder-pages.mjs) | Both pages |
| Once-only destination policy | [Link integrity rule](../../compiler/brief-explainer-link-integrity.mjs) | Both pages |
| Builder-only CSS in the HTML head | [Page-scoped CSS](../../site-content/brief-builder-styles.css) and [head injection contract](../../compiler/brief-builder-style.mjs) | Build Your Own Brief Compiler |
| Historical and current shared header link | [Navigation script overlay](../../compiler/global-brief-navigation.mjs) | All dated and permanent Brief pages |
| Future daily materialization | [Reader materializer](../../compiler/reader-materializer.mjs) | Both pages |
| Protected current-site patch | [Two-route page update](../../scripts/update-brief-explainer-webpages.mjs) | Both pages |

The website Markdown has Jekyll front matter and builds into the existing site. It is **not** a Word or ZIP file offered to readers.

## Six distinct applications

1. **Manufacturing:** Research-to-maintenance procedures, engineering reviews and technician learning.
2. **Healthcare:** Clinical evidence to credentialed protocol and training review, never automatic treatment changes.
3. **Cybersecurity:** Verified threat intelligence to private defensive playbook and detection proposals.
4. **Education and professional publishing:** New evidence to book, curriculum, exercise and lesson maintenance.
5. **Municipal resilience:** Science and infrastructure evidence to approved emergency readiness changes.
6. **Personal home gardening:** Regional horticulture research, demonstrations and expert discussion tied to a planting calendar, journal, soil-test history, pest log and personal growing guide.

Each case needs a central **reader decision**, deliberately connected media, the Watchlist, downstream knowledge artifacts, review authority and tangible outcomes. Cases are illustrative, not claims of sector-specific data connections in the production AI Brief.

## Governed self-evolution

Treat source churn, emerging topics, ratings, shares, comments and publishing incidents as **signals**, not permission to rewrite or republish automatically.

| Input | What to record | Editorial boundary |
|---|---|---|
| New/inactive sources | Source identity, evidence, age, attempted routes, publisher independence, yield | Qualify/retire only with evidence; a reachable website is not a verified article |
| Watchlist | New, Updated, Carried forward, Dropped, citation, six-criterion rubric | Use genuine research evidence, never synthetic momentum |
| Item stars | 1–5 usefulness score for each article, video and podcast | Reader utility is not a factual accuracy rating |
| Shares | Recorded share initiations | Does not prove delivery, readership or outcome |
| Comments | Confusion, gaps, corrections, topic requests | Check facts, avoid sensitive content and inappropriate exposure |
| AAR/quality | Broken routes, rejected visuals, stale media and repeats | Record, propose, protect CI, check live publication |

A proposal should contain **observation → dated source → affected knowledge asset and version/section → suggested change → uncertainty → reviewer → Accept/Revise/Defer/Reject → outcome measurement**. It must not directly alter the four books, organizational procedures or other governed assets.

## Editorial and experience rules

- Prioritize concrete decisions and domain-specific knowledge assets over generic productivity claims.
- Require authoritative evidence. For home gardening, local Cooperative Extension planting windows outrank a generic overseas calendar; a podcast adds perspective, not proof of regional suitability.
- Distinguish today's working Brief Compiler from a future multi-tenant self-service application, which would need its own software, data rights, privacy, hosting and operations.
- Use descriptive headings, a six-use-case jump menu, readable/scannable sections and mobile-friendly tables; test at **320px** minimum.
- **Put Sources and Build Your Own Brief links in the primary header near each page title.** On the two explainer pages, link each site destination only once. The brand already links home, the Builder CTA belongs in top navigation, and duplicate footer/body destinations should be text or omitted.
- Preserve the original 208-record source directory unless the registry is separately updated; never invent source health or imply every route was checked.
- Do not rewrite any already published Brief, accepted image, feed, Watchlist, engagement data or schedule.

## Repairing a visible CSS block or a missing archived header link

Never paste a raw `<style>` block into `site-content/build-your-own-brief-compiler.md`. The production Jekyll Markdown engine can escape the opening tag into visible `&lt;style...` text. Put CSS in [the dedicated stylesheet](../../site-content/brief-builder-styles.css). The [head-style helper](../../compiler/brief-builder-style.mjs) injects it **inside the real HTML `<head>`**, guarded to the Builder permalink only. Tests require the style to exist once and forbid the escaped text.

All dated and permanent Brief HTML pages already load the shared `assets/js/audience.js` path. To avoid rewriting hundreds of archived pages (including historically pinned October 8 bytes), [the global navigation overlay](../../compiler/global-brief-navigation.mjs) adds a single **Build Your Own Brief** link after **Sources** in the top navigation. It does not call an external service, does not affect ratings or analytics, and ignores pages without the canonical header. It is idempotent and removes redundant Builder footer/CTA links when appropriate. A page retaining only the nav links is more useful than repeating the same destination.

**Future editions:** The materializer overlays the global navigation into its temporary copy of the reader runtime, adds both primary navigation links via the temporary Jekyll layout, and injects the same Builder CSS into the head; the original vendored reader remains unchanged.

**Verification before merge:** Audit actual Pages history to prove every page with the standard header loads the shared runtime; render the Builder page with Jekyll and assert real head styles and absence of printed code; validate no repeated Builder links on the two explainer pages; verify that all accepted images and unrelated HTML bytes stay identical. When the shared script URL remains the same, browsers may retain the previous cached JavaScript until their cache expires; a hard refresh is an appropriate spot check.

## Adding another hobby or sector

1. Edit the [canonical Jekyll content](../../site-content/build-your-own-brief-compiler.md), preserving front matter.
2. Add a distinct scenario section and unique anchor; add one jump link and one comparison-table row.
3. Confirm credible first-party evidence, one instructive video example and one substantial podcast example. Clearly mark fictional sample issue items as illustrative.
4. Map possible changes to versioned knowledge artifacts, a named reviewer and specific decision thresholds.
5. Update case counts, required anchors and evidence/format tests in the Brief page contracts.
6. Compile using the **existing** protected Jekyll action. Verify that links to other Brief routes are not duplicated in the entire HTML, including header and footer.
7. Stage only the two informational HTML routes, with expected previous Git blobs and exact changed-route allowlisting.
8. Require protected CI, preserved accepted PNG hashes, independent live-byte comparison and verified Pages-history persistence.

## Acceptance evidence

- **6/6** example anchors and all four current book destinations render correctly.
- Source/watchlist/ratings/shares/comments feedback loop clearly describes **proposal**, **review**, **approval** and **measurement**, without claims of unapproved automatic reconfiguration.
- One destination link to each other Brief page at most, with intact useful navigation.
- Sources remain searchable, with accurate registry counts and original links.
- Mobile **320px** and desktop view remain legible, and wide tables scroll within their own areas.
- All other public reader and image files remain byte-identical; no new paid API, schedule or platform change.
- Final status reports show **live website links**, not Word/ZIP downloads.

**Release scope:** The current header/CSS correction updates two informational HTML routes and one existing shared JavaScript asset. The other dated and permanent HTML routes, accepted images, and their editorial content remain byte-identical. Future editions continue to derive the pages from canonical GitHub source and the existing Reader/Jekyll build.
