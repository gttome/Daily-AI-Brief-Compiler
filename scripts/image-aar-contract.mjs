// Structured production facts; never a substitute for saved-pixel review.
export const IMAGE_AAR_EFFECTIVE='2026-10-21';
export function validateImageAfterAction({aar,job,manifest}){
 const fail=s=>{throw Error('image_aar:'+s);};
 const p=aar?.production,ids=new Set(job.stories.map(s=>s.story_id));
 if(aar?.schema_version!=='external-image-after-action-v1'||aar.edition_date!==job.edition_date||
   aar.job_sha256!==manifest.job_sha256||aar.original_source_commit_sha!==manifest.original_source_commit_sha||
   aar.original_bundle_sha256!==manifest.original_bundle_sha256||!p||
   !Number.isSafeInteger(p.actual_generation_count)||!Number.isSafeInteger(p.rejected_count)||p.rejected_count<0||
   p.accepted_count!==6||p.actual_generation_count!==6+p.rejected_count||p.accepted_art_regenerated_after_lock!==0||
   !/^[a-f0-9]{40}$/.test(p.github_binary_stage_commit||'')||
   !Array.isArray(aar.images)||aar.images.length!==6||new Set(aar.images.map(x=>x.story_id)).size!==6||
   aar.images.some(x=>!ids.has(x.story_id)||!Number.isSafeInteger(x.generation_attempts)||x.generation_attempts<1||
    !manifest.images.some(i=>i.story_id===x.story_id&&i.sha256===x.sha256))||
   aar.images.reduce((n,x)=>n+x.generation_attempts,0)!==p.actual_generation_count||
   !Array.isArray(aar.errors)||aar.errors.some(x=>!['phase','issue','correction'].every(k=>typeof x[k]==='string'&&x[k].length>=10))||
   aar.human_readable_path!==`external-image-packages/${job.edition_date}/reviews/after-action.md`)
   fail('missing_or_inconsistent_source_bound_facts');
 // Prospective first-party task evidence: actual clock observations must be
 // recorded by the executing image session, never inferred from schedule or Git.
 if(job.edition_date>='2026-10-22'){
   const iso=x=>typeof x==='string'&&
     /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)&&
     Number.isFinite(Date.parse(x));
   const host=p.host_execution_observed_at,gen=p.generation_started_at;
   const observedBoth=iso(host)&&iso(gen)&&
     p.host_execution_observation_source==='executor_observed_in_same_invocation'&&
     p.generation_start_source==='executor_observed_before_first_native_call'&&
     Date.parse(host)<=Date.parse(gen)&&Date.parse(gen)<=Date.now()+60000;
   // One pinned, owner-directed recovery: six separately reviewed, byte-bound
   // November 13 PNGs must not become unpublishable because the worker failed
   // to capture a second, non-image-quality clock observation. Missing remains
   // UNKNOWN; we never reconstruct a generator clock from Git or a schedule.
   // This is not a blanket exception, a new timetable, or a visual-proof bypass.
   const nov13Hashes=[
     'e628668c7b844c11a91e5ee4556b8c84f9b27ecf24ee614765ffe84942302377',
     'f60508d44675e98e5588e6b91032a3f24d08bc389cca4a2a27e42102bdf31e06',
     '0e8bd2467fbffbfc26588dc0cf8c5e559edb5c32f5c086661b0cf9b36d5b443a',
     'e3de476f8901658372f230da584ba44ae1c5139930a5cb6150556df1dd777922',
     'cae52e20c503788c946350e5306340896317c9b4baa09aa42266588d8750b938',
     '9a2993813476366c196b49cc4af13d09ca553c1f04e20a6980822812ff7d20b7'
   ];
   const pinnedNov13MissingClock=job.edition_date==='2026-11-13'&&
     aar.job_sha256==='f1c3e17e778de6689cdf74265f42c33d7804aeb9af066487d26a12570d2a7b05'&&
     aar.original_source_commit_sha==='3da32365d3173fac3d7b414342346859bfc0bc7e'&&
     aar.original_bundle_sha256==='247f2f668a3bac15d7a05290c8d441f1a77d6d0e4e8aaee9ecdcc6c943bf9c32'&&
     p.github_binary_stage_commit==='320020d8e14520f8a3d93386cce6fa8ea58ac0f4'&&
     p.host_execution_observed_at==='2026-11-13T14:49:49Z'&&
     p.host_execution_observation_source==='executor_observed_in_same_invocation'&&
     gen===null&&p.generation_start_source===null&&
     p.scheduler_origin==='UNPROVEN'&&p.actual_generation_count===19&&p.rejected_count===13&&
     manifest.set_review?.result==='PASS'&&manifest.set_review.independent_saved_pixel_review===true&&
     Array.isArray(manifest.images)&&manifest.images.length===6&&
     manifest.images.every((img,i)=>img.sha256===nov13Hashes[i]&&img.accepted_locked===true&&
       img.visual_review?.result==='PASS'&&img.visual_review.inspected_png_sha256===img.sha256)&&
     aar.errors.some(e=>e.phase==='Protected package admission'&&
       e.issue.includes('did not capture a separate observation immediately before its first native call'));
   if(!observedBoth&&!pinnedNov13MissingClock)
     fail('genuine_forward_only_execution_and_generation_start_observations_required');
   if(pinnedNov13MissingClock&&!observedBoth)
     return {result:'PASS',actual_generation_count:p.actual_generation_count,
       accepted_count:6,rejected_count:p.rejected_count,visual_qa_not_inferred:true,
       first_native_generation_clock:'UNKNOWN_NOT_CAPTURED',
       exception_scope:'PINNED_2026_11_13_IMAGE_ONLY_REPORTING_GAP'};
 }
 return {result:'PASS',actual_generation_count:p.actual_generation_count,accepted_count:6,rejected_count:p.rejected_count,visual_qa_not_inferred:true};
}

export const IMAGE_NOV28_FOLLOWUP_EFFECTIVE='2026-11-29';
const hash=x=>/^[a-f0-9]{64}$/.test(x||'');
const note=x=>typeof x==='string'&&x.trim()?x.trim():null;
const whole=x=>Number.isSafeInteger(x)&&x>=0;
const insets=['left','top','right','bottom'];
const byTarget=(targets,id)=>Array.isArray(targets)?targets.filter(t=>t?.target_id===id):[];

export function summarizeImageFirstExports({edition,aar,manifest}){
 if(edition<IMAGE_NOV28_FOLLOWUP_EFFECTIVE)return null;
 const candidates=manifest?.edition_date===edition?manifest.images:null;
 const images=Array.isArray(candidates)&&candidates.length===6&&
  new Set(candidates.map(i=>i?.story_id)).size===6&&candidates.every(i=>note(i?.story_id)&&hash(i?.sha256))?candidates:[];
 const reviewed=aar?.edition_date===edition&&hash(aar.job_sha256)&&aar.job_sha256===manifest?.job_sha256;
 const attempts=reviewed&&Array.isArray(aar.images)&&aar.images.length===6&&images.length===6&&
  images.every(i=>aar.images.filter(a=>a.story_id===i.story_id&&a.sha256===i.sha256&&
    Number.isSafeInteger(a.generation_attempts)&&a.generation_attempts>=1).length===1)?aar.images:null;
 const calls=attempts?.reduce((n,i)=>n+i.generation_attempts,0);
 const production=aar?.production;
 const reliable=calls!==undefined&&calls===production?.actual_generation_count&&production.accepted_count===6&&production.rejected_count===calls-6;
 const input=reviewed&&Array.isArray(aar.first_export_observations)?aar.first_export_observations:[];
 const root='external-image-packages/'+edition+'/reviews/';
 const rows=images.map(i=>{
  const matches=input.filter(a=>a?.story_id===i.story_id),a=matches[0];
  const ref=a?.evidence_path;
  const bound=matches.length===1&&hash(a?.first_export_sha256)&&typeof ref==='string'&&ref.startsWith(root)&&
   !ref.slice(root.length).split('/').some(s=>!s||s==='..'||s==='.')&&/^[\w./-]+$/.test(ref);
  if(!bound)return {story_id:i.story_id,first_export_sha256:null,insets_px:null,mobile_320:'UNKNOWN',export_only_reexports:null,evidence_path:null};
  const geometry=insets.every(k=>whole(a.insets_px?.[k]))&&a.insets_px.left+a.insets_px.right<1200&&a.insets_px.top+a.insets_px.bottom<630;
  return {story_id:i.story_id,first_export_sha256:a.first_export_sha256,
   insets_px:geometry?Object.fromEntries(insets.map(k=>[k,a.insets_px[k]])):null,
   mobile_320:['PASS','ISSUE'].includes(a.mobile_320)?a.mobile_320:'UNKNOWN',
   export_only_reexports:whole(a.export_only_reexports)?a.export_only_reexports:null,evidence_path:ref};
 });
 const measuredUsage=reviewed&&typeof aar.usage?.work_usage_percent==='number'&&
  Number.isFinite(aar.usage.work_usage_percent)&&aar.usage.work_usage_percent>=0&&aar.usage.work_usage_percent<=100;
 const margins=rows.filter(i=>i.insets_px);
 return {edition_date:edition,first_native_accepts:reliable?attempts.filter(i=>i.generation_attempts===1).length:null,
  native_calls:reliable?calls:null,rejected_native_candidates:reliable?calls-6:null,
  first_export_margins_measured:margins.length,first_export_margin_failures:margins.length===6?
   margins.filter(i=>insets.some(k=>i.insets_px[k]<40)).length:null,
  export_only_reexports:rows.length===6&&rows.every(i=>i.export_only_reexports!==null)?
   rows.reduce((n,i)=>n+i.export_only_reexports,0):null,
  advisory_targets:{first_native_accepts_minimum:4,native_calls_maximum:8},
  work_usage_percent:measuredUsage?aar.usage.work_usage_percent:null,rows};
}

export function summarizeImageLiveFindings({edition,manifest,release,review,liveVerified}){
 if(edition<IMAGE_NOV28_FOLLOWUP_EFFECTIVE)return null;
 const list=manifest?.edition_date===edition?manifest.images:null;
 const images=Array.isArray(list)&&list.length===6&&new Set(list.map(i=>i?.story_id)).size===6&&
  list.every(i=>note(i?.story_id)&&hash(i?.sha256))?list:[];
 const run=String(review?.evidence_source?.workflow_run_id??'');
 const exact=liveVerified===true&&release?.edition_date===edition&&review?.edition_date===edition&&
  review.schema_version==='external-image-semantic-pixel-review-v1'&&/^\d+$/.test(run)&&
  release.actions_run_url==='https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/'+run;
 const targets=images.flatMap(i=>['dated_brief','permanent_story'].flatMap(context=>['desktop','mobile'].map(viewport=>{
  const target_id=[i.story_id,context,viewport].join(':');
  const matches=byTarget(review?.targets,target_id),t=matches[0];
  const bound=exact&&matches.length===1&&t.story_id===i.story_id&&t.context===context&&t.viewport===viewport&&t.live_image_sha256===i.sha256;
  const inspected=bound&&t.actual_pixels_inspected===true&&hash(t.capture_sha256)&&whole(t.capture_bytes)&&t.capture_bytes>0;
  const pass=inspected&&t.result==='PASS'&&t.correct_story_asset_visible===true&&t.full_diagram_visible===true&&
   t.clipped_or_overlapped===false&&t.placeholder_visible===false&&t.primary_explanatory_labels_recognizable===true;
  const issue=inspected&&['ISSUE','FAIL'].includes(t.result);
  const result=pass?'PASS':issue?'ISSUE':'GAP';
  const recorded=bound?note(t.finding)??note(t.observation):null;
  const finding=pass?recorded??'Bound semantic review confirmed full diagram and recognizable primary labels.':
   issue?recorded??'An inspected issue is recorded, but the specific finding is missing.':
   bound&&t.result==='GAP'&&recorded?recorded:
   (!liveVerified?'Live release hashes are not verified.':!exact?'No semantic receipt bound to this release workflow.':
    matches.length>1?'Duplicate context rows.':matches.length===0?'No target finding recorded.':'Exact capture inspection or required visual checks are not evidenced.');
  return {target_id,result,finding,capture_sha256:inspected?t.capture_sha256:null};
 })));
 return {expected_targets:24,live_hashes_verified:liveVerified===true?6:null,
  unavailable_target_id_count:24-targets.length,pass_count:targets.filter(t=>t.result==='PASS').length,
  issue_count:targets.filter(t=>t.result==='ISSUE').length,
  gap_count:24-targets.filter(t=>t.result!=='GAP').length,targets};
}

const tableCell=x=>String(x??'Unknown').replace(/[|\r\n]/g,' ');
export function renderImageFirstExports(report){
 if(!report)return [];
 return ['## First export and native effort','',
  'First-native accepts: '+tableCell(report.first_native_accepts)+'/6 (target ≥4). Native calls: '+tableCell(report.native_calls)+
  ' (target ≤8). Rejections: '+tableCell(report.rejected_native_candidates)+
  '. Export-only re-exports: '+tableCell(report.export_only_reexports)+'. Work usage: '+
  (report.work_usage_percent===null?'Unknown':report.work_usage_percent+'% (AAR-reported)')+'.',
  'First-export margins measured: '+report.first_export_margins_measured+'/6. Margin failures: '+tableCell(report.first_export_margin_failures)+'.',
  '', '| Story | First-export inset L/T/R/B px | 320 px check | Export-only re-exports | Evidence |','|---|---|---|---:|---|',
  ...report.rows.map(i=>'| '+[i.story_id,i.insets_px?insets.map(k=>i.insets_px[k]).join('/'):null,i.mobile_320,i.export_only_reexports,
    i.first_export_sha256?i.first_export_sha256.slice(0,12)+' · '+i.evidence_path:null].map(tableCell).join(' | ')+' |'),''];
}

export function renderImageLiveFindings(report){
 if(!report)return [];
 return ['## Per-context live image findings','',
  'Live image hashes verified: '+tableCell(report.live_hashes_verified)+' / 6. Contexts: '+report.pass_count+' passed, '+
    report.issue_count+' issue(s), '+report.gap_count+' gap(s) out of 24. Capture is not semantic inspection.',
  ...(report.unavailable_target_id_count?['Target identities unavailable: '+report.unavailable_target_id_count+' (no exact six-image manifest).']:[]),'',
  '| Exact target | Result | Finding or gap |','|---|---|---|',
  ...report.targets.map(t=>'| '+[t.target_id,t.result,t.finding].map(tableCell).join(' | ')+' |'),''];
}
