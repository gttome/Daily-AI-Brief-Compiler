import {summarizeNov02Evidence} from './nov02-evidence-summary.mjs';
import {summarizeNov20Evidence,renderNov20Evidence} from './nov20-evidence-review.mjs';
import {validateImageAfterAction,summarizeImageFirstExports,renderImageFirstExports,summarizeImageLiveFindings,renderImageLiveFindings} from './image-aar-contract.mjs';
import {verifyFinalImageCheckpoint} from './worker-checkpoint-consistency.mjs';
import fs from "node:fs";
import {ownerReportedWorkUsage} from "./owner-usage.mjs";
import path from "node:path";
import crypto from "node:crypto";
import {oct27SourceReadiness,renderOct27SourceSection} from './oct27-source-readiness.mjs';
import {summarizeTop10,renderTop10Section} from './top10-aar.mjs';
import {buildAarCharts,renderAarChartsMarkdown,writeAarCharts} from './aar-charts.mjs';

function renderPresealEvidence(evidence) {
  const cell = value => String(value ?? 'Not recorded').replace(/[|\r\n]/g, ' ');
  const index = evidence.source_index_coverage;
  const lines = index?.partition_status ? [
    `Eligible source partition **${index.partition_status}**. Full original-item reads **${index.full_dated_item_reads ?? 'Not recorded'}**. Bounded index searches **${index.bounded_index_searches ?? 'Not recorded'}**. Qualification-only sources recorded separately **${index.qualification_only_sources ?? 'Not recorded'}**.`,
    ''
  ] : [];
  const candidateRoutes = evidence.video_source_sweep?.source_outcomes?.filter(row =>
    row.source_name && row.outcome === 'CANDIDATES_FOUND') ?? [];
  if (candidateRoutes.length) {
    lines.push('### Video candidate discovery', '',
      '| Discovery source | Eligibility | Candidate URLs |', '|---|---|---:|',
      ...candidateRoutes.map(row => `| ${cell(row.source_name)} | ${row.eligible ? 'Enabled' : 'Qualification only'} | ${cell(row.candidate_urls)} |`), '');
  }
  const review = evidence.video_preseal_attempts;
  if (review) {
    lines.push('### Protected preseal video outcomes', '',
      '| Original publisher | Distinct programs submitted | Archive rejects | Playback passes | Playback unverified | Probes skipped |',
      '|---|---:|---:|---:|---:|---:|',
      ...review.publishers.map(row => `| ${cell(row.publisher)} | ${row.programs} | ${row.archive_rejections} | ${row.playback_passes} | ${row.playback_failures} | ${row.not_probed} |`),
      '', 'Outcomes count observed checks across all saved requests. Programs can be submitted again after a different slot changes.', '',
      ...review.attempts.filter(row => ['ARCHIVE_REPEAT', 'PLAYBACK_UNVERIFIED'].includes(row.result)).map(row =>
        `- ${cell(row.title)} received ${row.original_result}.${row.archive_matches.length ? ' Earlier editions ' + row.archive_matches.map(match => cell(match.date)).join(', ') + '.' : ''} [Original run](${row.run_url})`),
      '');
  }
  return lines;
}

function generateUnified(cycle,e,hashes={}) {
  const d = new Date(cycle+"T00:00:00Z"); if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==cycle)throw Error("invalid-cycle-date");d.setUTCDate(d.getUTCDate()+1);
  const edition=d.toISOString().slice(0,10), gh="https://github.com/gttome/Daily-AI-Brief-Compiler", pub="https://gttome.github.io/Daily-AI-Brief-Compiler/";
  const top10=summarizeTop10(cycle,edition,e,hashes);
  const reconciled=summarizeNov02Evidence(edition,e);
  const nov20=summarizeNov20Evidence(edition,e);
  const obj=k=>e[k]&&e[k].edition_date===edition?e[k]:null;
  const sourceReadiness=oct27SourceReadiness(edition,{routeCoverage:obj('source-route-coverage'),
    itemCensus:obj('source-item-census'),qualifications:obj('source-qualification')});
  const state=obj("compiler-state"),compile=obj("compil…5919 tokens truncated…cate active Watchlist display titles | **${watch?watchCollisions.length:"Not recorded"}** | Published canonical Watchlist only; historical evidence retained |`,
`| Original-release video playback (historical) | **${publishedVideoCheck?.result??"NOT_RECORDED"}** | Later reader corrections may replace these originally verified videos; see incident register | `,
`| Postpublication reader incidents | **${incidentLedger?readerIncidents.length:"NOT_RECORDED"}** | Edition-specific owner reports and corrective PRs, not inferred absence | `,
`| Verified postpublication video corrections | **${incidentLedger?readerIncidents.filter(i=>i.status==="CORRECTED_LIVE_VERIFIED").length:"NOT_RECORDED"}** | Incident register tracks correction PR, actual playback evidence and reader preservation |`,
`| Editorial index second-pass attempts | **${indexRetry?.counts?.attempted??"NOT_RECORDED"}** | Bounded public GET retries only; never proof of original article reading |`,
`| Editorial index reads recovered | **${indexRetry?.counts?.recovered_to_index_read??"NOT_RECORDED"}** | Successful page fetch can still yield zero eligible dated items |`,
`| Recorded scheduler capability route | **${originImages?.capability_preflight?.result??"UNPROVEN"}** | Same-invocation route receipt only; GitHub is not scheduler authentication |`,
`| Avoidable incomplete-staging CI failures | **Not independently audited** | Existing image-package push CI is disabled; exact-head protected PR CI remains required. A failure count requires actual workflow evidence |`,
`| Media | **${durations}** | Sealed bundle |`,
`| **Compiler final seal window** | **${compilerStageDuration} (${elapsed})** | Final sealed-state timestamp → verified public reader; initial execution is separate |`,
`| **Image processing stage duration** | **${imageStageDuration}** | First accepted PNG Git checkpoint → final 24/24 review; auditable stage elapsed time |`,
`| Image scheduled-to-final-review window | **${imageScheduleWindow}** | Only with a saved one-cycle schedule anchor; does not attest exact generation start |`,
`| Executor-observed generation-to-final-review | **${observedGenerationDuration}** | Only if the worker recorded a same-execution clock before its first native call; not independently verified provider runtime |`,
`| Accepted premium PNGs | **${imagesOk?6:"Not complete"} / 6** | Exact package and public release hashes |`,
`| Native image generation attempts | **${typeof attempts==="number"?attempts:"Not reported"}** | Image worker AAR; no estimation |`,
`| Rejected candidates | **${typeof rejected==="number"?rejected:"Not reported"}** | Image worker AAR |`,
`| Final worker checkpoint reconciliation | **${checkpoint.result}** | Oct25+ verifies exact generation count, per-story attempts, six accepted story/image/hash bindings and final release |`,
`| Saved visual contexts | **${visualOk?"24 / 24 PASS":"Unverified"}** | Dated/permanent desktop/mobile review |`,
`| Public SHA-256 checks | **${release?.independent_http_sha256_checks??"Not recorded"}** | Image release receipt |`,
`| October 8 immutable history | **${release?.protected_oct8_objects_verified??integrity?.oct8_protected_count??"Not recorded"} / 17** | Independent content-preservation checks |`,
`| **Owner-reported weekly Work usage for this run** | **${amount===null?"Not reported":amount+"%"}** | ${amount===null?"No per-cycle usage supplied":"User-reported for this cycle only; not account-metered"} |`,
"",
"> **EFFICIENCY NOTE**",
`> **Resource reporting policy:** ${amount===null?"No usage figure was supplied for this cycle, so none is assumed.":"The owner reported "+amount+"% of weekly Work usage for this run; the internal target is under 5%. This number is not GitHub billing telemetry."} Future runs show **Not reported** unless the owner supplies new cycle-specific usage metadata. No approval or extra step is required to generate the AAR.`,
"",
"## Production architecture and checkpoints",
"",
"```mermaid",
"flowchart TD",
"  T[\"Top 10 topics 17:00 Chicago\"] -.-> A[\"Compiler 19:15 Chicago\"]",
"  A --> B[\"Sealed editorial bundle\"]",
"  B --> C[\"Published reader verified\"]",
"  C --> D[\"Current-date six-story image job\"]",
"  D --> E[\"Six source-bound premium PNGs\"]",
"  E --> F[\"Protected PR and CI\"]",
"  F --> G[\"Pages release and 24 visual reviews\"]",
"  classDef done fill:#dff6eb,color:#165c39,stroke:#168052,stroke-width:2px",
"  classDef uncertain fill:#fef3c7,color:#804c14,stroke:#d99412,stroke-width:2px",
`  class A,B,C,D ${compilerOk?"done":"uncertain"}`,
`  class E,F,G ${imagesOk&&visualOk?"done":"uncertain"}`,
`  class T ${top10.end_to_end_ready===true?"done":"uncertain"}`,
"```",
"",
renderTop10Section(top10),
...renderImageFirstExports(firstExports),
...renderImageLiveFindings(imageFindings),
"",
"## Track 1 — Compiler",
"",
`**State:** \`${state?.state??"NOT_OBSERVED"}\` · **Bundle:** \`${state?.bundle?.status??"NOT_OBSERVED"}\` · **Compiler final seal window:** ${compilerStageDuration} (${elapsed}).`,
"",
"| Publication gate | Result |",
"|---|:---:|",
`| Canonical reader build | ${line(compile?.result==="PASS")} |`,
`| Reader parity | ${line(state?.reader_parity?.result==="PASS")} |`,
`| Public verification of dated edition | ${line(compilerOk)} |`,
`| Previous editions preserved | ${line(integrity?.oct8_protected_count===17)} |`,
`| Permanent story routes and feeds | ${line(integrity?.result==="PASS")} |`,
"",
"**Selected coverage:**",
"",
"| Lane | Story |",
"|---|---|",
...stories.map(s=>`| ${nice(s.focus)} | ${nice(s.headline)} |`),
"",
"### Scientific paper opportunity and publication evidence",
"",
`**Current edition:** ${paperCoverage.status}; **paper-led stories:** ${paperCoverage.paper_led_stories??"Not recorded"}. Editorial target: at least one genuinely qualified original-paper-based story in seven editions, with methods, limitations, and an explicit preprint/peer-review distinction. No stale or weak paper is selected solely to fill a quota.`,
...(paperIdentityValid?paperRows.map(p=>`- ${nice(p.title)} (${nice(p.publication_status)}): ${nice(p.original_paper_url)} — linked article: ${nice(p.story_id)}.`):[]),
"",
"",
"## Track 2 — Premium images",
"",
`**Public status:** \`${release?.result??"NOT_OBSERVED"}\` · **Saved images:** ${imgb.length}/6 · **Actual generation attempts:** ${typeof attempts==="number"?attempts:"Not reported"} · **Rejected candidates:** ${typeof rejected==="number"?rejected:"Not reported"}.`,
"",
"### Image production duration — Git-verified milestones",
"",
`**Auditable image stage duration:** **${imageStageDuration}** (first accepted binary saved in Git → first persisted 24-context quality-review record). **First asset to public image release:** **${imageReleaseDuration}**.`,
`**Scheduled-to-final-review window:** **${imageScheduleWindow}**. This is a scheduled-clock comparison only when a separately recorded exact-date schedule exists; it is **not** measured native image-generation runtime.`,
"",
"| Production milestone | Chicago local time | Evidence |",
"|---|---|---|",
`| Scheduled image start (if exact-date record exists) | ${chicago(timingEvents.scheduled_image_task_start)} | Time planned, not actual execution start |`,
`| First executor-observed start | ${chicago(timingEvents.host_execution_first_observed_at)} | Worker self-attestation, not a first-party scheduler event |`,
`| First native generation observation | ${chicago(timingEvents.native_generation_first_observed_at)} | Worker clock recorded immediately before first native call, not model-provider telemetry |`,
`| First accepted PNG bytes saved to Git | ${chicago(timingEvents.first_accepted_binary_commit)} | Immutable binary-stage commit |`,
`| Six-image package / reviews committed | ${chicago(timingEvents.six_image_package_commit)} | Exact-head PR source commit |`,
`| Protected package merged | ${chicago(timingEvents.protected_image_merge_commit)} | Merge SHA and required CI |`,
`| Public images verified | ${chicago(timingEvents.public_release_verified_at)} | Image-release receipt |`,
`| 24/24 review record committed | ${chicago(timingEvents.final_live_review_approved_commit)} | Immutable first review-approval commit |`,
"",
"> **Duration interpretation:** The audited stage excludes unobservable pre-checkpoint creative work. The scheduled-start window includes it but must not be interpreted as precise active processing time. Missing timestamps appear as **Not independently recorded**, never an estimate.",
"",
"",
"| Source-bound image | Attempts | File size | Public page |",
"|---|---:|---:|---|",
...imgb.map(im=>`| ${nice(im.label)} | ${im.attempts??"—"} | ${(im.bytes/1048576).toFixed(2)} MiB | [View original](${pub}${im.route}) |`),
"",
"**Immutable-release and visual gates:**",
"",
"| Release gate | Result |",
"|---|:---:|",
`| Protected public image receipt | ${line(imagesOk)} |`,
`| Accepted-image Git hash bindings | ${line(imagesOk)} |`,
`| Six live PNGs | ${imagesOk?"6/6":"Not verified"} |`,
`| Dated/permanent story placements | ${imagesOk?"12/12 recorded in release evidence":"Not verified"} |`,
`| Desktop/mobile visual inspection | ${visualOk?"24/24 PASS":"Not verified"} |`,
`| Historical Oct 8 integrity | ${release?.protected_oct8_objects_verified===17?"17/17":"Not verified"} |`,
"",
"### Published premium illustrations",
"",
imgCols,
"",
"## Incidents, corrections and learning",
"",
"### Postpublication reader incidents (updated when new evidence is merged)",
"",
...(incidentLedger?[ "| Incident | Impact | Disposition | Verified correction |", "|---|---|---|---|",
  ...readerIncidents.map(i=>`| ${nice(i.incident_id)} | ${nice(i.impact)} | ${nice(i.status)} | ${i.corrective_pr?`[PR #${i.corrective_pr}](${gh}/pull/${i.corrective_pr})`:"Not recorded"} |`)
 ]:["No current-edition postpublication incident register was available; this is **NOT_RECORDED**, not a certification of zero incidents."]),
"",
"",
`**Editor recovery classification:** ${autonomy}. **Owner intervention:** ${confirmedOwnerRecovery?"Documented and required":"Unproven either way"}. **Protected same-edition failures recorded:** ${protectionEvents.length}. ${publicationHealth?.status==="BLOCKED_PUBLICATION"?"Latest recorded publishing step was blocked; public release status must be evaluated separately.":""}`,
`**Latest failed protected stage:** ${publicationHealth?.last_recorded_blocker?.stage??"Not in same-edition receipts"}; [Action evidence](${publicationHealth?.last_recorded_blocker?.run_url??gh+"/actions"}). Exact stage durations are available only where real source timestamps exist.`,
 ...(ownerIncidentId?[`**Owner-initiated recovery record:** [${nice(ownerIncidentId)}](${gh}/blob/main/docs/after-action/${edition}-compiler-production-aar.json).${recoveryPr?` Corrected in [PR #${recoveryPr}](${gh}/pull/${recoveryPr}).`:""} Owner-message timing and independent scheduler identity remain unproven.`]:[]),
"",
...(Array.isArray(imageAar?.errors)&&imageAar.errors.length?[
"| Stage | Verified issue | Corrective action |",
"|---|---|---|",
...imageAar.errors.map(a=>`| ${nice(a.phase)} | ${nice(a.issue)} | ${nice(a.correction)} |`)
]:["No image-stage correction receipts were available for this cycle."]),
"",
"> **OPERATIONAL NOTE**",
"> This report distinguishes a published and verified production outcome from scheduler metadata exposed to another conversation. Lack of a live host heartbeat in a separate normal chat is not a Compiler production failure.",
"",
"## Usage and cost stewardship",
"",
"| Item | Per-cycle value |",
"|---|---|",
`| **Weekly Work usage reported by owner** | ${usageDisplay} |`,
"| Internal weekly usage reference | Target under 5% |",
`| Genuine image-generation attempts | ${typeof attempts==="number"?attempts:"Not reported"} |`,
`| Accepted diagrams | ${typeof accepted==="number"?accepted:imgb.length||"Not reported"} |`,
`| Regeneration after acceptance | ${imageAar?.production?.accepted_art_regenerated_after_lock??"Not reported"} |`,
`| Top 10 reported usage | ${Number.isFinite(top10.usage_percent)?top10.usage_percent+"% (run receipt)":"Not reported"} |`,
`| Top 10 reported cost | ${Number.isFinite(top10.cost_usd)?"$"+top10.cost_usd.toFixed(2)+" (run receipt)":"Not reported"} |`,
"| Account-level billing telemetry | Not independently accessible to deterministic GitHub reporting |",
"",
"**Future reporting rule:** For cycles without an optional owner-usage record, publish the complete AAR with `Not reported`; do not reuse prior percentages, guess remaining weekly credits or delay tomorrow's production.",
"",
...(sourceReadiness?[renderOct27SourceSection(sourceReadiness)]:[]),
"## Next-edition operating handoff",
"",
"| Control | Recurring contract |",
"|---|---|",
"| AI Topic Top 10 | Sole report task · 17:00 America/Chicago · saved dated list guides same-evening research |",
"| Primary Compiler | Sole existing task · 19:15 America/Chicago |",
"| Premium image production | Sole existing task · standard 21:15 America/Chicago |",
"| Exact image job selection | Newly published next-date `PUBLISHED_PENDING` only |",
"| AAR | Combined report generated automatically from new GitHub receipts |",
"| Optional Work usage | Owner-supplied per cycle, otherwise `Not reported` |",
"",
"> **SCHEDULE RESTORATION NOTE**",
"> A temporary scheduling exception must be explicitly restored before claiming standard-time readiness. This deterministic document generator reads existing state only; it does not modify production schedules.",
"",
"## Evidence register",
"",
"| Evidence | Link |",
"|---|---|",
...sourceInfo.map(([name,url])=>`| ${name} | [Open receipt](${url}) |`),
"",
`**Image workflow:** ${release?.actions_run_url?`[Workflow evidence](${release.actions_run_url})`:"Not yet available"}.`,
"",
"---",
"",
"*Generated deterministically from cycle- and edition-specific GitHub records. The report combines the Top 10 discovery priorities, its Compiler handoff and searches, the published Brief, and the image run; original research, Compiler, image, hash, and review receipts remain immutable. This reporting action creates no stories, images, releases, extra AI tasks, or schedule changes.*",
""
].join("\n");
  const json={schema_version:"daily-compiler-unified-aar-v1",evidence_reconciliation:reconciled,oct28_source_readiness:sourceReadiness,cycle_date:cycle,edition_date:edition,result:badge,top10,end_to_end_system_status:systemStatus,autonomy_status:autonomy,confirmed_owner_intervention:confirmedOwnerRecovery,owner_intervention_incident_id:ownerIncidentId,owner_assisted_correction_pr:recoveryPr,protected_publication_failure_count:protectionEvents.length,latest_publication_health:publicationHealth?.status??null,provenance_warnings:[...new Set(provenanceWarnings)],image_aar_warning:aarWarning,worker_closeout_verified:workerClosed,worker_checkpoint_consistency:checkpoint,watchlist_title_collisions:watch?watchCollisions.length:null,postpublication_incidents_recorded:incidentLedger?readerIncidents.length:null,postpublication_video_corrections_verified:incidentLedger?readerIncidents.filter(i=>i.status==="CORRECTED_LIVE_VERIFIED").length:null,editorial_index_retry_counts:indexRetry?.counts??null,postpublication_video_playback_status:publishedVideoCheck?.result??null,image_route_preflight_recorded:reconciled.image_capability_preflight_recorded||originImages?.capability_preflight?.result==='CAPABILITY_ROUTE_PROVEN',ci_incomplete_staging_failures_audited:false,publication_and_visual_complete:!!(compilerOk&&imagesOk&&visualOk),compiler_verified:!!compilerOk,images_released:!!imagesOk,visual_24_pass:!!visualOk,image_count:imgb.length,work_usage_percent:amount,work_usage_source:amount===null?null:"owner_reported",generation_start_observed_at:timingEvents.native_generation_first_observed_at??null,scheduler_start_attested:false,scientific_paper_coverage:paperCoverage,media_topic_diversity:{status:mediaEventStatus,documented_events:eventIds.length===4?new Set(eventIds).size:null,pairwise_reviews:Array.isArray(eventReview?.comparisons)?eventReview.comparisons.length:null,original_source_truth_independently_verified:false},source_urls:sourceInfo.map(([title,url])=>({title,url}))};
  if(charts)json.charts=charts;
  if(firstExports)json.image_first_exports=firstExports;
  if(imageFindings)json.image_live_context_findings=imageFindings;
  json.approved_nov20_improvements=nov20;
  json.status_dimensions={publication:compilerOk?'VERIFIED':'NOT_VERIFIED',
   images:imagesOk&&visualOk?'RELEASED_AND_24_CONTEXTS_VERIFIED':'INCOMPLETE',
   top10:top10.search_status,system:systemStatus,autonomy,
   runtime_policy:nov20.runtime_policy.status,usage:amount===null?'UNKNOWN':'OWNER_REPORTED'};
  return {markdown:md,json,charts};
}

const [cycle,inputDir,outDir] = process.argv.slice(2);
if(!cycle||!inputDir||!outDir)throw Error("usage: node scripts/render-unified-production-aar.mjs YYYY-MM-DD evidence_dir output_dir");
const keys=["top10-baseline","top10-outcome-baseline","top10-previous-report","top10-previous-aar","top10-improvement","execution-milestones","fallback-search-evidence","trend-consumed-source","trend-consumed-report","image-route-preflight","compiler-state","compile-receipt","postpublish-integrity","edition-bundle","image-job","image-release","image-manifest","image-after-action","image-context-reviews","image-timing","image-worker-state","owner-usage","image-task-origin","published-watchlist","publication-health","owner-intervention-incident","source-route-coverage","source-item-census","source-qualification","source-item-retries","postpublication-incidents","postpublish-video-playback","top10-report","top10-after-action","top10-report-source","trend-input","trend-search-coverage","scientific-paper-coverage"];
keys.push('preseal-video-attempts');
keys.push('postpublication-source-metadata');
const ev={},hashes={};for(const k of keys){const p=path.join(inputDir,k+".json");if(!fs.existsSync(p))continue;const bytes=fs.readFileSync(p);hashes[k]=crypto.createHash("sha256").update(bytes).digest("hex");try{ev[k]=JSON.parse(bytes.toString("utf8"));}catch{ev[k]={parse_error:true}}}
const {markdown,json,charts}=generateUnified(cycle,ev,hashes);
fs.mkdirSync(outDir,{recursive:true});
writeAarCharts(charts,outDir);
fs.writeFileSync(path.join(outDir,"combined.md"),markdown);
fs.writeFileSync(path.join(outDir,"combined.json"),JSON.stringify(json,null,2)+"\n");
console.log(JSON.stringify({result:"UNIFIED_AAR_WRITTEN_NO_PUBLICATION",cycle_date:cycle,edition_date:json.edition_date,status:json.result,work_usage_percent:json.work_usage_percent}));


