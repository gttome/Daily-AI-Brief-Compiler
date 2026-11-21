# November 21 source qualification — November 22 readiness

Owner request: examine and qualify all 216 source records before the existing run for the November 22 edition. This is source development, not an early editorial production run. The work is scoped to `gttome/Daily-AI-Brief-Compiler`.

## Verified result

All **216 records have an explicit reviewed disposition**. **77 previously disabled sources are newly admitted for discovery**, increasing enabled records **128 → 205** and reducing disabled records **88 → 11**. **All 216 did not pass discovery admission.** The remaining eleven are five static/reference-only records, five stale/inactive records and one unresolved publisher identity collision. A completed review is not an approval.

| Measure | Before | After |
|---|---:|---:|
| Registered records | 216 | 216 |
| Enabled for discovery | 128 | 205 |
| Disabled | 88 | 11 |
| Previously disabled records with a documented decision | 0 in this review | 88 |

All original IDs and content roles are preserved. All 128 previously enabled resource objects are field-identical, including their genuinely unknown production health. The historical October and November fixtures and accepted editions/images are untouched. New source qualification is recorded in [the 216-record receipt](../../config/source-qualification/2026-11-21-all-216.json); the exact pre-change registry is [preserved separately](../../fixtures/resource-registry-pre-nov21-source-qualification.json).

## Actual evidence and scope

- The existing runtime made a public GET request to every original route: 202 returned HTTP 200, 13 returned HTTP 403, and one returned HTTP 404. Raw-response SHA256, byte length, original URL, redirect and observed request clock are retained per record. These counts are route results, not source-quality passes.
- Additional original indexes, articles, episode metadata, publisher-linked feeds and primary paper repositories were read. Each activation names its exact source, original dated item or research reference, publisher identity, date precision, review scope and limitations. No date-only source was assigned an invented midnight clock.
- AWS, Google Cloud, Azure, IBM, Oracle and JetBrains blocked direct runtime retrieval. Their primary pages were readable through the existing connected web tool; the receipt keeps the HTTP refusals and marks connected-source evidence separately. It does not claim the runtime route recovered.
- Source admission is candidate discovery only. It does not certify full article reading, a fresh November 22 item, the selected programs, full audio/video review, signed-out playback, 75% AI share, program cooldown, archive novelty, independence or non-promotion. Those existing gates continue at item selection.
- Old sample dates remain old. For example, the latest newsletter item in the repaired Last Week in AI RSS was November 21, but the exact audio-bearing sample inspected was October 3. The newsletter date is not attributed to the podcast. Similar original/modified distinctions are retained for Together, protocol versions and benchmark references.
- ServiceNow’s incorrect 2017 publication metadata was not repaired or accepted as an original date. The matching authors/title and primary arXiv record establish the June 12 2026 preprint date; ACL identifies an October conference version. The version/domain-count difference remains explicit.

## Route and identity repairs

| Record | Verified current discovery route |
|---|---|
| Airtable Product and Automation Blog | https://www.airtable.com/articles |
| MLOps Community Podcast | https://home.mlops.community/public/collections/mlops-community-podcast |
| Microsoft 365 Blog | https://www.microsoft.com/en-us/copilot/blog/ |
| Atlassian AI Blog | https://www.atlassian.com/blog/ai-research |
| Make Blog | https://www.make.com/blog |
| Weights & Biases — Fully Connected | https://forge.coreweave.com/forge-reports |
| Galileo Blog | https://www.splunk.com/en_us/blog/observability.html |
| Stanford HELM | https://crfm.stanford.edu/helm/ |
| Last Week in AI | https://lastweekin.ai/s/podcast |

The publisher-owned RSS endpoints for AI Explored, AI Today, Jonathan Green, Dwarkesh and Last Week in AI are retained in registry `endpoint` fields and source notes. Same corporate families remain one original publisher: Microsoft, Google, NVIDIA, OpenAI, Databricks, CoreWeave and Splunk/Cisco are not multiplied by source routes.

## Eleven records deliberately excluded from unattended discovery

| Source | Disposition | Evidence and next action |
|---|---|---|
| Agent Skills Open Standard | REFERENCE_ONLY | Official Agent Skills specification is readable and identifies a 2026-08-04 modification, but no original publication date was established. Retain as a standards reference; do not turn a modified date into a fresh article. Establish a genuinely dated original release or a continuing first-party editorial index. |
| Synced AI Technology & Industry Review | STALE_OR_INACTIVE | Current original index still lists the latest visible article at 2025-08-14. Current-edition freshness is not established. Find a genuine new original article or maintain this historical source disabled. |
| Talking Machines Podcast (Historical) | STALE_OR_INACTIVE | Original show site links the Acast feed. The newest feed entry is Gods and Robots, 2021-09-09. A genuinely new publisher-issued episode is required; do not relabel the archive active. |
| Microsoft Learn | REFERENCE_ONLY | Official Azure agent learning path is readable; ms.date and updated_at are revision metadata, not an independently established original publication date. Use as reference; qualify a dated original update before Article discovery activation. |
| OpenAI Academy Skills | REFERENCE_ONLY | Skills is a single OpenAI Academy resource published 2026-02-25 and updated 2026-09-17. It is a valid reference, but this exact static page is not an ongoing fresh source feed. Use the primary resource as background; select a genuine dated new resource through a continuing index. |
| Anthropic Research — Skills | REFERENCE_ONLY | The old Anthropic research/skills URL redirects to Claude’s Introducing Agent Skills product article originally dated 2025-10-16. This is a static historical item, not a new publisher. Keep the original identity and date; discover future items through the admitted Anthropic indexes. |
| Anthropic Engineering — Agent Skills | REFERENCE_ONLY | The old engineering Agent Skills URL redirects to the original research article published 2025-10-16. It is a source reference already covered by Anthropic’s continuing indexes. Retain historical reference without treating it as an additional fresh source. |
| Humanloop Blog | STALE_OR_INACTIVE | Humanloop’s original index says it is joining Anthropic and its latest visible listed post is from May 2025. Keep the old archive disabled; an ongoing new Humanloop-owned feed needs fresh evidence. |
| Me, Myself, and AI | STALE_OR_INACTIVE | The original Me, Myself, and AI index yields a May 5 2026 latest inspected episode; its host site advertises Fall 2026 as MIT SMR’s final issue. No continuing current episode was established. Confirm an ongoing original show feed with a new dated episode before activation. |
| The AI Breakdown | IDENTITY_MISMATCH | The historical The AI Breakdown domain now presents Andy Dumbell and Apple show ID 1827766757. That is not proof of continuity with the historical Nathaniel Whittemore/AI Daily Brief identity. Verify ownership/show continuity; do not silently transfer the historical source ID to an unrelated same-name show. |
| The Gradient: Perspectives on AI | STALE_OR_INACTIVE | The original podcast section’s latest inspected episode is Nathan Benaich 2025 in AI, dated 2026-01-22. Root/feed runtime requests were refused. No fresh continuing episode was found. Find a genuine new original episode on the source-owned podcast section before enabling unattended discovery. |

## Existing producer handoff

For the next genuine Compiler execution, read current protected `config/resource-registry.json` and this receipt. Enumerate all 216 records; attempt the complete enabled pool as required by the current contracts, preserve disabled exclusions, and recalculate counts from actual main. Where a declared publisher-owned feed is useful, inspect it with the source/host ownership evidence retained here. A parser error or HTTP refusal is not proof of no candidates. Use the existing connected capabilities when direct retrieval is unavailable, without claiming an unmade HTTP request or media watch.

The November 21 qualification observations are development evidence and must not be copied into the future production edition as its own searches, substantive item inspections, clock observations, source census or Top 10 integration. The ordinary next run must write its real evidence. More enabled sources is not yet proof of more high-quality selected stories.

Existing tasks, environments, recurrence, ownership, story allocation, Skills count, media counts, scoring, freshness, protected checks, accepted images and publication workflows remain in force. No extra producer, scheduled run, paid API, metered browser or service was added.

## Verification

Focused admission tests cover all 216 IDs, exact preservation of the prior 128 active records, evidence for every activation, exclusion of every rejected/reference record from the next editorial plan, original podcast dates, unknown media playback and the source-only health boundary. The November 20 video-expansion regression now reads its preserved pre-November-21 snapshot; the new current-registry test validates the newly admitted Zapier source without pretending any individual program was playback approved. Existing full regression, bootstrap, fixture/e2e, reader parity and exact-head protected CI are required before merge. Integration status is established by the protected PR, not by this report.

Observed local verification: **820/820 tests passed under Node v20.20.2**, matching the existing protected CI major version. Bootstrap, fixture/e2e, reader parity and the focused current-source admission tests passed. The first Node 24 test run exposed five historical-registry assertions and one unchanged Node 24 filesystem-copy incompatibility; the original historical expectations are retained against the exact saved registry, with current admissions tested separately. No image implementation was changed. See [the development validation receipt](../../config/source-qualification/2026-11-21-validation.json). Exact-head protected CI remains required.
