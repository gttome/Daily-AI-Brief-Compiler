# Approved November 2 AAR improvements

Owner approval covers implementing the six recommendations in priority order.
Use only the existing Compiler, Image and Recovery Guard tasks and existing
protected workflows. Preserve accepted PNGs and immutable historical receipts.
No paid API, new producer, new schedule, TinyFish or metered recovery service.

1. **Recovery.** The existing guard uses `recoveryGuardDecision` in
   `operations/publication-recovery.mjs`. Record actual primary activity, recent
   semantic commits, open publication PRs and image lease state; unknown means
   yield. Compare-and-swap every branch write against the observed head. One
   bounded safe attempt only. The test rehearsal exercises failed dispatch,
   competing/ambiguous writers, moved heads, exhausted retry and already released
   jobs. This is a controlled decision rehearsal, **not unattended live proof**.
   On the first real eligible failure, the existing guard must save
   `operations-reports/recovery/YYYY-MM-DD.json`: first failure time and original
   run URL, detection time, all writer checks and their source refs, exact source
   head, attempted action, result, independent public URL/hash checks, owner
   intervention and scheduler-origin evidence. Claim unattended recovery only
   when the actual unprompted guard run and independent result establish it.

2. **320px.** From the November 3 edition, the existing 24-target capture uses
   1440px desktop and **320px mobile**. Admission checks recorded viewport sizes.
   November 2's original 390px receipts remain unchanged. Record its additional
   12-placement 320px check separately, including overflow failures and corrective
   readback. Fine text may require the existing full-size viewer; inspect priority
   labels, image identity, clipping, control usability and the full-size route.

3. **Image first pass.** Use `CURRENT_IMAGE_REQUIREMENTS.md` from both REV8
   entrypoints and the protected PR299 implementation. Native prompt, regions,
   label boxes and arrow endpoints must describe the same source mechanism.
   Budget label space, edge margins and source caveats before generation. Await
   a complete, strictly validated PNG export before persistence. Review actual
   pixels. For November 3–5 record first-pass accepts, every generation attempt,
   rejection reason and per-image totals in the existing image AAR. Target at
   least 3/6 first-pass accepts and at most two attempts per accepted image;
   report misses without lowering quality or regenerating accepted assets.

4. **Freshness.** Use the existing registry-bound source census to account for
   every eligible article/video/podcast index as inspected, inaccessible or
   unreviewed. Route reachability does not mean editorial inspection. Save
   `shadow-runs/D/editorial/fallback-search-evidence.json`, with edition_date and
   fallbacks[]. Each fallback names story_id, searches[] (query, source_url,
   attempted_at, candidate_urls), and newer_rejected_candidates[] (url, focus,
   original_date, inspected_at, rejection_reason). Candidates must be real,
   newer, relevant to the selected story's focus, and traced to an actual search.
   Other selected stories do not substitute for rejected candidates. If none was
   established, disclose that limitation and the inspected scope. Never claim
   there are no newer articles in the entire source universe from a small sample.
   The independent November 2 route check found the matching articles at
   Hugging Face `/blog/announcing-project-protostar` and Every
   `/also-true-for-humans/how-to-get-ai-agents-to-recommend-your-articles`.

5. **Timing/provenance.** Use `appendExecutionMilestone` to create the edition's
   `execution-milestones.json` on first observed execution and append failure,
   recovery, seal and verification milestones with actual source refs. Read the
   previous file before each update and preserve the original execution start.
   Do not backfill an unknown historical start with a guessed time. AARs label
   the state start-to-verification interval as the final seal window, and report
   semantic review completion, review-record commit and protected merge separately.
   Local capability route preflight and scheduler-origin evidence are independent.
   Missing usage stays unknown. November 2's 4m48s seal window is not total runtime.

6. **First Top 10 cycle.** November 2 at 17:00 Chicago targets November 3. Use
   `TOP10_UNIFIED_AAR.md`: ten supported topics or explicit shortfall, exact
   persisted-byte readback, Compiler input snapshot, article/video/podcast search
   observations and bundle-verified selection mapping. The report collector must
   independently fetch the report at the Compiler's recorded consumed commit.
   Run `summarizeTop10` through the existing daily-report workflow. Missing or
   provisional trend data is disclosed and creates no new publication blocker.

Implementation and controlled tests do not establish future production outcomes.
Unprompted recovery and November 3–5 image efficiency remain pending real runs.
