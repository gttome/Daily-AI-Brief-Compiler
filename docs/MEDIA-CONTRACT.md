# Exact media evidence and reader value

Current selections use `daily-compiler-media-contract-v1`, the independently versioned video and podcast policies in `contracts/media-contract.json`, media record v1, and edition bundle v2. The editorial contract is v2; article freshness is unchanged.

## Selection rules

| Requirement | Video | Podcast |
|---|---|---|
| Required count | Exactly 2 | Exactly 2 distinct canonical shows |
| Preferred freshness | Maximum 72 hours | Strongly prefer 48 hours |
| Freshness fallback | None beyond 72 hours | Through 7 days when fresher qualifying material is insufficient and the specific reader value justifies inclusion |
| Exceptional freshness | Not permitted | Through 30 days only as a documented exceptional selection: state why material within 7 days was insufficient and what unusually relevant value connects this episode to the selected coverage |
| Listening duration | At most 600 seconds preferred; through 900 seconds fallback; through 1200 seconds last resort | No ceiling; retain the existing requirement for observed positive runtime |
| Duration rationale | Both longer bands require a specific reason why a suitable shorter selection was unavailable and why this item is worth the additional time | Not applicable |
| Final destination | Exact video, with item and channel identity | Exact episode or verified platform episode, with canonical show identity |

A missing second qualifying video or podcast blocks media selection. No reduced-count or stale-fill policy is introduced. An unrelated long talk cannot qualify through the podcast duration rule and then fill a video slot. Unknown runtime remains unresolved; it cannot be rounded or replaced with zero. A future change permitting unavailable podcast runtime needs its own explicit policy disposition.

Freshness and duration bands are derived independently and stored separately from observed metadata. The valid bands are `within_72h`, `preferred_48h`, `fallback_7d`, `exceptional_30d`, `preferred_10m`, `fallback_15m`, `last_resort_20m`, and `no_ceiling`, as applicable. Fallback reasons must be recorded for each applicable dimension. An exact 1200-second video qualifies only with its last-resort rationale; 1201 seconds rejects.

## Preserve the original cutoff and publication precision

Set `state.research_cutoff_at` once during unfinished EDITORIAL. Use the exact same value in candidate content, each selected media record, the retained evidence document and the final bundle. `assertProgressPreserved` rejects changing or removing a recorded cutoff, or assigning one after EDITORIAL is complete. Later retries and later retrievals cannot extend the selection window. Historical states without this new field remain unchanged.

`publication.original_value` is the original observed publication date or timezone-qualified timestamp, with `precision` and `timezone` retained. Original publication, rather than a modification time, determines eligibility. Timestamp precision requires a valid explicit offset and a consistent declared timezone. Invalid calendar dates and future publication reject.

A date-only observation represents the interval of possible publication times on that date. Interval bounds are derived values, never asserted publication instants. UTC, explicit offsets and IANA zones are supported; IANA day lengths account for offset changes. A timezone whose date boundary cannot be established remains unresolved. When the source timezone is unknown, retain `null` and conservatively bound the possible date across UTC−12 through UTC+14. Do not assume UTC.

An interval wholly within the allowed window is eligible. An interval wholly too old or future is ineligible. If it crosses the outer age/future boundary, obtain better evidence or leave selection unresolved. An interval crossing a podcast preferred/fallback threshold uses its conservatively older band and that band's rationale. No exact age is invented.

## Canonical records and retained evidence

`contracts/media-record.schema.json` defines canonical media record v1. Each record retains:

- Type, internal stable ID, exact selected item ID, canonical channel/show ID and source URL, source name, title and direct selected URL.
- Original publication value, precision/timezone, the original research cutoff, and exact observed `duration_seconds`.
- Derived freshness/duration bands and separate fallback reasons.
- `summary`, `why_it_matters`, `connection_to_brief` and `related_story_ids` pointing to selected coverage.
- `metadata_ref`, nonempty `support_refs` and `reader_review_ref` into one retained evidence file.
- A written podcast-page reading-time estimate for podcasts, separate from listening duration.

The bundle binds the retained evidence file with `media_evidence.path` and `media_evidence.sha256`. The reference must remain inside the repository, including after symlink resolution. The gate rehashes actual bytes, limits the document to 1 MiB and 40 records, and rejects missing, duplicate or mismatched evidence references.

`contracts/media-evidence.schema.json` defines three record kinds:

| Kind | Required support |
|---|---|
| `metadata` | Authoritative publisher/channel/platform provenance, evidence URL, actual retrieval time, exact item/source bindings, original metadata including title and identity, matching publication observation and original runtime value with format and exact seconds |
| `content_support` | The same exact selected identity, authoritative provenance and retrieval time, a substantive source excerpt, and explicit source support for each of the three reader fields |
| `reader_value_review` | Existing content-pass scope, actual review time after supporting observations, PASS on all distinct-purpose checks, separate rationales, support references, current copy hash, selected-story context hash and reviewed-source-evidence hash |

Supported original runtime formats are positive whole seconds, `M:SS`/`H:MM:SS`, and ISO 8601 `PT…H…M…S`. The gate recomputes seconds; it does not accept a bare rounded minute estimate. Optional old date/minute aliases, if present in a current record, must agree with original publication and exact seconds.

YouTube, Vimeo, Spotify and Apple Podcast item URLs are parsed and checked against the selected ID. YouTube video selections require the stable channel ID and its canonical channel URL. Publisher episode/video destinations must be specific item paths and must be supported by original item metadata. Show/channel/search/feed/listing URLs may support discovery or item-specific source observations but cannot serve as the final selected destination. Two platform listings of one episode or show cannot fill two podcast slots. Canonical show ID, source URL and normalized source name are checked for diversity; source review must resolve aliases across platforms.

These checks establish the consistency of retained observations. They cannot establish factual truth from strings or hashes alone. The existing content pass must actually inspect the authoritative source and substantiate the selected identity, publication, runtime and content. Do not mark unsupported values verified.

## Reader value and semantic review

Summary explains the content. Why it matters explains its professional value. Connection to the Brief explains its specific relationship to selected coverage. All three pairings must differ after Unicode, entity, markup, punctuation and whitespace normalization.

Different strings can still repeat the same idea. During the existing content pass, record a bounded semantic review of all three purposes, including paraphrased duplication and the exact related coverage. `mediaCopySha256` binds the review to the current identity, title, URL, three paragraphs and related story IDs. `mediaStoryContextSha256` binds the selected story identities, headlines, summaries, professional value, source context and coverage metadata. `mediaReviewedEvidenceSha256` binds the full metadata and source-support records, including excerpts, provenance and retrieval time. Copy, coverage or supporting-evidence edits invalidate a stale review. Do not add a reviewing service or infer meaning from a passing structural fixture.

The Compiler adapter retains the three canonical fields separately. A narrow projection over the existing vendored renderer carries them to home/latest, dated edition, permanent video/podcast pages, JSON Feed, Atom and media archive records. Required hooks fail visibly if the imported renderer changes. Vendored source bytes and the golden parity fixture are unchanged.

Use `Duration`, exact `M:SS` or `H:MM:SS`, safe new-tab source links, and separate written-page reading time for podcasts. Avoid redundant duration beneath titles and obsolete operational wording. Raw publication precision remains available in page metadata and the feed's `_daily_compiler_media` extension. Feed entry publication time describes the Brief entry, not an invented source publication instant.

## One gate at selection and sealing

During CONTENT, run the existing pure `validateMediaSelection({bundle: content, state, evidence})` function with the canonical stories/media/cutoff and retained observations. A read-only CLI is available:

```sh
node scripts/validate-media.mjs state.json content.json .
```

The content object must include `edition_date`, `stories`, `videos`, `podcasts`, `research_cutoff_at`, `media_contract_version` and `media_evidence`. It need not pretend to be BUNDLE_READY. At sealing/compilation, `validateBundleMedia` reads and rehashes the same evidence and calls the same selection validator. Its result is included in the compile receipt. The CLI creates no task, state transition, retry loop or network call.

New sealed bundles require bundle v2 and editorial contract v2. No paid service, scheduler change, image executor change or observer dependency is added.

## Historical compatibility

`contracts/media-compatibility.json` enumerates the exact existing immutable fixture, October 7 terminal bundle, October 8 original bundle and the already completed October 8 corrected bundle. Each entry binds exact bundle SHA-256, edition, execution, branch and source commit. Real historical entries require SHADOW_VERIFIED/VERIFY. All existing structural, producer and exact-image-integrity checks remain active.

Historical compatibility returns `HISTORICAL_COMPATIBILITY`, never current media qualification. An altered bundle, different execution/branch, fresh candidate or an unregistered v1 declaration rejects. Missing historical Connection text stays absent; the reader does not manufacture a new relationship by repeating Why it matters. Original bundle and asset bytes are not rewritten.

There is no general correction exception. A future explicitly authorized historical correction needs its own protected evidence-backed disposition. Existing correction records, accepted assets and terminal history are preserved.

## Evidence limits

The synthetic acceptance fixtures prove the implementation's media contract and reader behavior. They do not certify next-edition media availability, live source review, image qualification/activation, scheduling, deployment or edition readiness. Those facts remain independently assessed at their existing boundaries. Missing optional observation or learning output does not change a valid media outcome.
