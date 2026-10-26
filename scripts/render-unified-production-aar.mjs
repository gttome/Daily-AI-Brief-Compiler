import {validateImageAfterAction} from './image-aar-contract.mjs';
import {verifyFinalImageCheckpoint} from './worker-checkpoint-consistency.mjs';
import fs from "node:fs";
import {ownerReportedWorkUsage} from "./owner-usage.mjs";
import path from "node:path";
import {oct27SourceReadiness,renderOct27SourceSection} from './oct27-source-readiness.mjs';

function generateUnified(cycle,e) {
  const d = new Date(cycle+"T00:00:00Z"); if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==cycle)throw Error("invalid-cycle-date");d.setUTCDate(d.getUTCDate()+1);
  const edition=d.toISOString().slice(0,10), gh="https://github.com/gttome/Daily-AI-Brief-Compiler", pub="https://gttome.github.io/Daily-AI-Brief-Compiler/";
  const obj=k=>e[k]&&e[k].edition_date===edition?e[k]:null;
  const sourceReadiness=oct27SourceReadiness(edition,{routeCoverage:obj('source-route-coverage'),
    itemCensus:obj('source-item-census'),qualifications:obj('source-qualification')});
  const state=obj("compiler-state"),compile=obj("compile-receipt"),integrity=obj("postpublish-integrity"),bundle=obj("edition-bundle");
  const job=obj("image-job"),release=obj("image-release"),manifest=obj("image-manifest"),imageAar=obj("image-after-action"),reviews=obj("image-context-reviews"),imageTiming=obj("image-timing");
  const publicationHealth=obj("publication-health");
  const ownerIncident=obj("owner-intervention-incident");
  const confirmedOwnerRecovery=ownerIncident?.owner_intervention?.required_in_observed_sequence===true||
    ownerIncident?.unattended_autonomy_result==="FAIL_OWNER_TRIGGER_REQUIRED"||
    compile?.owner_intervention===true;
  const autonomy=confirmedOwnerRecovery?"FAIL_OWNER_RECOVERY":"UNPROVEN";
  // Preserve separately grounded owner-assisted recovery evidence.
  const ownerIncidentId=typeof ownerIncident?.incident_id==='string'?
    ownerIncident.incident_id:null;
  const recoveryPr=Number.isSafeInteger(ownerIncident?.recovery?.correcting_pr)?
    ownerIncident.recovery.correcting_pr:null;
  const protectionEvents=Array.isArray(publicationHealth?.events)?
    publicationHealth.events.filter(x=>x.status==="BLOCKED_PUBLICATION"):[];
  const usage=e["owner-usage"]&&e["owner-usage"].cycle_date===cycle&&e["owner-usage"].edition_date===edition?e["owner-usage"]:null;
  const amount=ownerReportedWorkUsage(usage,cycle,edition);
  const usageDisplay=amount===null?"**Not reported**":`**${amount}%** (owner reported)`;
  const compilerOk=state?.state==="SHADOW_VERIFIED"&&state?.bundle?.status==="BUNDLE_READY"&&compile?.result==="PASS"&&integrity?.result==="PASS"&&integrity?.oct8_protected_count===17&&Array.isArray(integrity?.live_http_and_sha256)&&integrity.live_http_and_sha256.some(p=>p.url===pub+"briefs/"+edition+"/"&&p.status===200);
  const images=Array.isArray(release?.images)?release.images:[];
  const imagesOk=release?.result==="RELEASED_VERIFIED"&&images.length===6&&new Set(images.map(i=>i.story_id)).size===6&&manifest?.images?.length===6&&manifest.images.every(i=>images.some(v=>v.story_id===i.story_id&&v.sha256===i.sha256));
  const oldVisualOk=reviews?.result==="PASS"&&reviews.reviewed_targets===24&&reviews.expected_targets===24&&reviews.criteria?.semantic_defects===0&&Array.isArray(reviews.stories)&&reviews.stories.length===6&&reviews.stories.every(i=>i.result==="PASS"&&i.targets?.length===4&&images.some(v=>v.story_id===i.story_id&&v.sha256===i.live_image_sha256)&&i.targets.every(t=>t.result==="PASS"));
  // Newer actual-pixel receipts have 24 individually inspected captures rather than six nested story reviews.
  // Require the same released story identities, all four contexts, and the exact release workflow evidence.
  const expectedContexts=new Set(images.flatMap(i=>["dated_brief","permanent_story"].flatMap(c=>["desktop","mobile"].map(v=>i.story_id+":"+c+":"+v))));
  const pixelTargets=reviews?.targets;
  const pixelVisualOk=imagesOk&&reviews?.schema_version==="external-image-semantic-pixel-review-v1"&&
    reviews.result==="PASS"&&reviews.expected_targets===24&&reviews.captured_targets===24&&reviews.reviewed_pass===24&&
    Array.isArray(reviews.defects)&&reviews.defects.length===0&&
    release?.actions_run_url===gh+"/actions/runs/"+reviews.evidence_source?.workflow_run_id&&
    Array.isArray(pixelTargets)&&pixelTargets.length===24&&new Set(pixelTargets.map(t=>t.target_id)).size===24&&
    pixelTargets.every(t=>expectedContexts.has(t.target_id)&&t.target_id===t.story_id+":"+t.context+":"+t.viewport&&
      t.actual_pixels_inspected===true&&t.correct_story_asset_visible===true&&t.full_diagram_visible===true&&
      t.clipped_or_overlapped===false&&t.placeholder_visible===false&&t.primary_explanatory_labels_recognizable===true&&
      t.result==="PASS"&&/^[a-f0-9]{64}$/.test(t.capture_sha256||"")&&Number.isSafeInteger(t.capture_bytes)&&t.capture_bytes>0);
  const visualOk=!!(oldVisualOk||pixelVisualOk);
  const worker=obj('image-worker-state');
  const checkpoint=verifyFinalImageCheckpoint({edition,worker,release,manifest,aar:imageAar});
  const workerClosed=edition<'2026-10-21'||(worker?.phase==='PUBLISHED_COMPLETE'&&worker.lease_status==='RELEASED'&&
    worker.job_sha256===manifest?.job_sha256&&worker.accepted_hashes?.length===6&&
    new Set(worker.accepted_hashes).size===6&&images.every(i=>worker.accepted_hashes.includes(i.sha256))&&
    (edition<'2026-10-25'||checkpoint.result==='PASS'));
  const provenanceWarnings=[];
  const end=Date.parse(state?.updated_at||'');
  for(const story of bundle?.stories||[]){
    for(const key of [story.source?.retrieved_at,story.source?.read_evidence?.read_at])
      if(Number.isFinite(end)&&Date.parse(key)>end)provenanceWarnings.push('Source evidence timestamp follows recorded publication: '+story.id);
  }
  let aarWarning=null;
  if(edition>='2026-10-21'){
    try{validateImageAfterAction({aar:imageAar,job,manifest});}catch(error){aarWarning=String(error.message);}
  }
  const complete=!!(compilerOk&&imagesOk&&visualOk&&workerClosed&&!provenanceWarnings.length&&!aarWarning), badge=complete?"COMPLETE":(compilerOk||imagesOk?"PARTIAL":"NOT_VERIFIED");
  const stateColor=complete?"0b7b57":(badge==="PARTIAL"?"d97706":"64748b");
  const nice=s=>String(s??"Not reported").replace(/\|/g,"/").replace(/\r?\n/g," ");
  const dateString=new Date(edition+"T12:00:00Z").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"});
  const started=Date.parse(state?.started_at||"");const ended=Date.parse(state?.updated_at||"");
  const elapsed=Number.isFinite(started)&&Number.isFinite(ended)&&ended>=started?((ended-started)/60000).toFixed(1)+" min":"Not recorded";
  const stories=Array.isArray(bundle?.stories)?bundle.stories:[];
  const watch=e["published-watchlist"]?.edition_date===edition?e["published-watchlist"]:null;
  const watchActive=(watch?.topics||[]).filter(t=>t.status!=="archived");
  const normalizeTitle=v=>String(v??"").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const seenTitles=new Map(),watchCollisions=[];
  for(const t of watchActive){
    const key=normalizeTitle(t.name);
    if(seenTitles.has(key))watchCollisions.push([seenTitles.get(key),t.topic_id]);
    else seenTitles.set(key,t.topic_id);
  }
  const publishedNoon=Date.parse(edition+"T12:00:00Z");
  const withinOneDay=stories.filter(t=>{
    const published=Date.parse(t.source?.published_at||"");
    return Number.isFinite(published)&&publishedNoon-published<=86400000&&published<=publishedNoon;
  }).length;
  const distinctArticlePublishers=new Set(stories.map(t=>t.source?.publisher).filter(Boolean)).size;
  const mediaOld=(bundle?.videos||[]).filter(t=>{
    const published=Date.parse(t.original_date||"");
    return Number.isFinite(published)&&publishedNoon-published>7*86400000;
  }).length;
  const selectedVideoPublishers=new Set((bundle?.videos||[])
    .map(t=>t.verification?.publisher_channel_id||t.source).filter(Boolean)).size;
  const originImages=e["image-task-origin"]?.edition_date===edition?e["image-task-origin"]:null;

  const durations=bundle?.videos?.length===2&&bundle?.podcasts?.length===2?"2 videos + 2 podcasts":"Source receipt incomplete";
  // Image timeline uses persisted first-accepted-binary and approved 24-context review Git events.
  const seconds=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?
    Math.floor(n/60)+'m '+String(Math.round(n%60)).padStart(2,'0')+'s':'Not independently recorded';
  const chicago=t=>t&&Number.isFinite(Date.parse(t))?
    new Date(t).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',second:'2-digit'}):'Not independently recorded';
  const timeEvidence=imageTiming?.result==='DURATIONS_VERIFIED'&&imageTiming?.events?imageTiming:null;
  const compilerStageDuration=Number.isFinite(started)&&Number.isFinite(ended)&&ended>=started?
    seconds((ended-started)/1000):'Not independently recorded';
  const imageStageDuration=seconds(timeEvidence?.durations_seconds?.first_accepted_binary_to_final_review);
  const imageScheduleWindow=seconds(timeEvidence?.durations_seconds?.scheduled_start_to_final_review);
  const imageReleaseDuration=seconds(timeEvidence?.durations_seconds?.first_accepted_binary_to_public_release);
  const observedGenerationDuration=seconds(timeEvidence?.durations_seconds?.executor_observed_generation_to_final_review);
  const timingEvents=timeEvidence?.events??{};
  const attempts=imageAar?.production?.actual_generation_count;
  const rejected=imageAar?.production?.rejected_count;
  const accepted=imageAar?.production?.accepted_count;
  const imgb=imagesOk?images.map((i,idx)=>({label:stories.find(s=>s.id===i.story_id)?.headline||i.story_id,...i,attempts:imageAar?.images?.find(a=>a.story_id===i.story_id)?.generation_attempts})): [];
  // Text and Unicode status colors render without third-party image downloads in Typora and GitHub.
  const good="**"+(complete?"🟩":"🟨")+" RELEASE "+badge.replaceAll("_"," ")+"**";
  const indicators="**"+(compilerOk?"🟩":"🟨")+" COMPILER "+(compilerOk?"VERIFIED":"UNVERIFIED")+"** · **"+(imagesOk?"🟦":"🟨")+" IMAGES "+(imagesOk?"6/6 RELEASED":"NOT YET COMPLETE")+"** · **"+(visualOk?"🟪":"🟨")+" VISUAL QA "+(visualOk?"24/24 PASS":"NOT YET VERIFIED")+"**";
  const line=(v)=>v?"✅":"Not yet evidenced";
  const requestedAarPath=imageAar?.human_readable_path||manifest?.after_action_path;
  const aarPath=typeof requestedAarPath==='string'&&requestedAarPath.startsWith('external-image-packages/'+edition+'/reviews/')&&
    !requestedAarPath.split('/').includes('..')?requestedAarPath:'external-image-packages/'+edition+'/reviews/after-action.md';
  const sourceInfo=[["Compiler state",`${gh}/blob/shadow/${edition}/shadow-runs/${edition}/compiler-state.json`],["Compiler compile receipt",`${gh}/blob/shadow/${edition}/shadow-runs/${edition}/compiler/compile-receipt.json`],["Compiler public integrity",`${gh}/blob/shadow/${edition}/shadow-runs/${edition}/compiler/postpublish-integrity.json`],["Image release receipt",`${gh}/blob/shadow-pages-history/site/image-jobs/${edition}/release.json`],["Image review",`${gh}/blob/main/external-image-packages/${edition}/reviews/live/${pixelVisualOk?"semantic-pixel-review.json":"image-element24/semantic-reviews.json"}`],["Original image AAR",`${gh}/blob/main/${aarPath}`]];
  const imgCols=imgb.length===6?["<table>"].concat([0,2,4].map(n=>`<tr><td width="50%"><a href="${pub}${imgb[n].route}"><img src="${pub}${imgb[n].route}" alt="Diagram for ${imgb[n].story_id}" width="420"/></a><br/><b>${nice(imgb[n].label)}</b></td><td width="50%"><a href="${pub}${imgb[n+1].route}"><img src="${pub}${imgb[n+1].route}" alt="Diagram for ${imgb[n+1].story_id}" width="420"/></a><br/><b>${nice(imgb[n+1].label)}</b></td></tr>`)).concat(["</table>"]).join("\n"):"No six-image public release gallery available yet.";
  const md=[
good,
indicators,
"",
"# Daily AI Brief — Unified Production After-Action Report",
`**Edition:** ${dateString} · **Production evening:** ${cycle} · **Timezone:** America/Chicago`,
`**Primary public reader:** [Open ${edition} Brief](${pub}briefs/${edition}/) · **Repository:** [Daily-AI-Brief-Compiler](${gh})`,
"",
"> **IMPORTANT — VERIFIED PRODUCTION RESULT**",
`> **Executive result: ${badge.replace("_"," ")}.** This is the single management-facing report combining the editorial Compiler and premium-image publication. Compiler public status: **${compilerOk?"VERIFIED":"NOT VERIFIED"}**. Image release: **${imagesOk?"RELEASED_VERIFIED":"not complete"}**. Direct 24-context visual quality: **${visualOk?"24/24 PASS":"not yet evidenced"}**. Autonomous completion: **${autonomy}**. Missing evidence must not be promoted to a success claim.`,
"",
`**🕒 Production stage durations:** **Compiler ${compilerStageDuration}** · **Premium Images ${imageStageDuration}** (evidence-bounded elapsed times; the start/end events differ).`,
"",
...(provenanceWarnings.length?["> **PROVENANCE WARNING:** Source-reading timestamps follow the recorded publication verification time. The original evidence is preserved; exact historical reading times are not reconstructed. Publication/image success does not resolve this audit discrepancy.",""]:[]),
...(aarWarning?["> **AAR SCHEMA WARNING:** "+aarWarning,""]:[]),
...(!workerClosed?["> **CLOSEOUT WARNING:** The exact image worker has not released its lease and recorded PUBLISHED_COMPLETE with the six accepted hashes.",""]:[]),
"## Performance dashboard",
"",
"| Measure | Recorded result | Source / caveat |",
"|:--|:--:|:--|",
`| Editorial publication | **${compilerOk?"PASS":"NOT VERIFIED"}** | State and public reader integrity receipt |`,
`| **Unattended autonomy (separate from publication)** | **${autonomy}** | Owner incident receipt takes precedence over unverified producer self-attestation |`,
`| Recorded protected publishing gate failures | **${protectionEvents.length}** | Actual same-edition GitHub failure sidecar only; earlier unrecorded failures remain unknown |`,
`| Articles | **${stories.length||"Not recorded"}** | Exactly 2 technical / 2 knowledge-worker / 2 agents required |`,
`| Verified original sources within preceding 24 hours | **${withinOneDay} / ${stories.length}** | Original publisher dates only; other sources require a documented fallback rationale |`,
`| Distinct selected article publishers | **${distinctArticlePublishers}** | Six different primary organizations preferred |`,
`| Videos over seven days old | **${mediaOld}** | Must be labeled evergreen, not a new development |`,
`| Distinct selected video publishers | **${selectedVideoPublishers}** | One channel is one publisher even across multiple videos |`,
`| Duplicate active Watchlist display titles | **${watch?watchCollisions.length:"Not recorded"}** | Published canonical Watchlist only; historical evidence retained |`,
`| Recorded scheduler capability route | **${originImages?.capability_preflight?.result??"UNPROVEN"}** | Same-invocation route receipt only; GitHub is not scheduler authentication |`,
`| Avoidable incomplete-staging CI failures | **Not independently audited** | Existing image-package push CI is disabled; exact-head protected PR CI remains required. A failure count requires actual workflow evidence |`,
`| Media | **${durations}** | Sealed bundle |`,
`| **Compiler stage duration** | **${compilerStageDuration} (${elapsed})** | First persisted Compiler state → verified public reader; not a host scheduler attestation |`,
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
"flowchart LR",
"  A[\"Compiler 19:15 Chicago\"] --> B[\"Sealed editorial bundle\"]",
"  B --> C[\"Published reader verified\"]",
"  C --> D[\"Current-date six-story image job\"]",
"  D --> E[\"Six source-bound premium PNGs\"]",
"  E --> F[\"Protected PR and CI\"]",
"  F --> G[\"Pages release and 24 visual reviews\"]",
"  classDef done fill:#dff6eb,color:#165c39,stroke:#168052,stroke-width:2px",
"  classDef uncertain fill:#fef3c7,color:#804c14,stroke:#d99412,stroke-width:2px",
`  class A,B,C,D ${compilerOk?"done":"uncertain"}`,
`  class E,F,G ${imagesOk&&visualOk?"done":"uncertain"}`,
"```",
"",
"## Track 1 — Compiler",
"",
`**State:** \`${state?.state??"NOT_OBSERVED"}\` · **Bundle:** \`${state?.bundle?.status??"NOT_OBSERVED"}\` · **Compiler duration:** ${compilerStageDuration} (${elapsed}).`,
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
"## Track 2 — Premium images",
"",
`**Public status:** \`${release?.result??"NOT_OBSERVED"}\` · **Saved images:** ${imgb.length}/6 · **Actual generation attempts:** ${typeof attempts==="number"?attempts:"Not reported"} · **Rejected candidates:** ${typeof rejected==="number"?rejected:"Not reported"}.`,
"",
"### Image production duration — Git-verified milestones",
"",
`**Auditable image stage duration:** **${imageStageDuration}** (first accepted binary saved in Git → final 24-context quality-review merge). **First asset to public image release:** **${imageReleaseDuration}**.`,
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
`| Final 24/24 semantic visual review approved | ${chicago(timingEvents.final_live_review_approved_commit)} | Immutable first review-approval commit |`,
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
"| Account-level billing telemetry | Not independently accessible to deterministic GitHub reporting |",
"",
"**Future reporting rule:** For cycles without an optional owner-usage record, publish the complete AAR with `Not reported`; do not reuse prior percentages, guess remaining weekly credits or delay tomorrow's production.",
"",
...(sourceReadiness?[renderOct27SourceSection(sourceReadiness)]:[]),
"## Next-edition operating handoff",
"",
"| Control | Recurring contract |",
"|---|---|",
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
"*Generated deterministically from edition-specific GitHub records. Primary report is a synthesis; original Compiler, image, hash, and review receipts remain immutable. This reporting action creates no stories, images, releases, extra AI tasks, or schedule changes.*",
""
].join("\n");
  const json={schema_version:"daily-compiler-unified-aar-v1",oct28_source_readiness:sourceReadiness,cycle_date:cycle,edition_date:edition,result:badge,autonomy_status:autonomy,confirmed_owner_intervention:confirmedOwnerRecovery,owner_intervention_incident_id:ownerIncidentId,owner_assisted_correction_pr:recoveryPr,protected_publication_failure_count:protectionEvents.length,latest_publication_health:publicationHealth?.status??null,provenance_warnings:[...new Set(provenanceWarnings)],image_aar_warning:aarWarning,worker_closeout_verified:workerClosed,worker_checkpoint_consistency:checkpoint,watchlist_title_collisions:watch?watchCollisions.length:null,image_route_preflight_recorded:originImages?.capability_preflight?.result==='CAPABILITY_ROUTE_PROVEN',ci_incomplete_staging_failures_audited:false,publication_and_visual_complete:!!(compilerOk&&imagesOk&&visualOk),compiler_verified:!!compilerOk,images_released:!!imagesOk,visual_24_pass:!!visualOk,image_count:imgb.length,work_usage_percent:amount,work_usage_source:amount===null?null:"owner_reported",generation_start_observed_at:timingEvents.native_generation_first_observed_at??null,scheduler_start_attested:false,source_urls:sourceInfo.map(([title,url])=>({title,url}))};
  return {markdown:md,json};
}

const [cycle,inputDir,outDir] = process.argv.slice(2);
if(!cycle||!inputDir||!outDir)throw Error("usage: node scripts/render-unified-production-aar.mjs YYYY-MM-DD evidence_dir output_dir");
const keys=["compiler-state","compile-receipt","postpublish-integrity","edition-bundle","image-job","image-release","image-manifest","image-after-action","image-context-reviews","image-timing","image-worker-state","owner-usage","image-task-origin","published-watchlist","publication-health","owner-intervention-incident","source-route-coverage","source-item-census","source-qualification"];
const ev={};for(const k of keys){const p=path.join(inputDir,k+".json");if(!fs.existsSync(p))continue;try{ev[k]=JSON.parse(fs.readFileSync(p,"utf8"));}catch{ev[k]={parse_error:true}}}
const {markdown,json}=generateUnified(cycle,ev);
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,"combined.md"),markdown);
fs.writeFileSync(path.join(outDir,"combined.json"),JSON.stringify(json,null,2)+"\n");
console.log(JSON.stringify({result:"UNIFIED_AAR_WRITTEN_NO_PUBLICATION",cycle_date:cycle,edition_date:json.edition_date,status:json.result,work_usage_percent:json.work_usage_percent}));
