// Planning is not source inspection. Preserve every currently enabled editorial ID.
import crypto from 'node:crypto';
import {validateResourceRegistry} from './resources.mjs';
import {buildVideoSourceSweepPlan} from './video-source-sweep.mjs';
import {buildScientificPaperCadence} from './scientific-paper-cadence.mjs';
const roles=['article','video','podcast'];
const validDate=d=>/^20\d\d-\d\d-\d\d$/.test(d||'')&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function rotate(rows,days){const at=rows.length?days%rows.length:0;return rows.slice(at).concat(rows.slice(0,at));}
function interleave(rows){
 const pending=[...rows],out=[];
 while(pending.length){for(const role of roles){const n=pending.findIndex(r=>r.content_types.includes(role));if(n>=0)out.push(pending.splice(n,1)[0]);}}
 return out;
}
export function buildEditorialResearchPlan({editionDate,registry,previousAar=null,trendInput=null,recentScientificPaperEvidence=[]}){
 if(!validDate(editionDate)||validateResourceRegistry(registry).length)throw Error('RESEARCH_PLAN_INVALID_INPUT');
 const previous=validDate(previousAar?.edition_date)&&previousAar.edition_date<editionDate?previousAar:null;
 const priorIds=previous?.evidence_reconciliation?.source_index_coverage?.unreviewed_ids;
 const unreviewed=new Set(Array.isArray(priorIds)?priorIds:[]);
 const eligible=registry.resources.filter(r=>r.enabled&&r.content_types.some(t=>roles.includes(t))).sort((a,b)=>a.resource_id.localeCompare(b.resource_id));
 const days=Math.floor(Date.parse(editionDate+'T00:00:00Z')/86400000);
 const first=interleave(rotate(eligible.filter(r=>unreviewed.has(r.resource_id)),days));
 const rest=interleave(rotate(eligible.filter(r=>!unreviewed.has(r.resource_id)),days));
 const scientific_papers=buildScientificPaperCadence({editionDate,registry,recentCoverage:recentScientificPaperEvidence});
 const paperSourceIds=new Set(scientific_papers.eligible_discovery_sources.map(x=>x.resource_id));
 return {schema_version:'daily-compiler-editorial-research-plan-v1',edition_date:editionDate,
  previous_edition_date:previous?.edition_date??null,
  registry_sha256:crypto.createHash('sha256').update(JSON.stringify(registry)).digest('hex'),
  eligible_count:eligible.length,previously_unreviewed_prioritized:first.length,
  ...(trendInput && {trend_search_coverage:initializeTrendSearchCoverage(editionDate,trendInput)}),
  video_source_sweep:buildVideoSourceSweepPlan({editionDate,registry}),
  scientific_papers,
  video_discovery_fallbacks:eligible.filter(r=>r.video_discovery_fallback?.status==='DISCOVERY_ONLY')
   .map(r=>({resource_id:r.resource_id,...r.video_discovery_fallback})),
  resources:[...first,...rest].map((r,i)=>({order:i+1,resource_id:r.resource_id,url:r.url,
   roles:r.content_types.filter(t=>roles.includes(t)),priority_reason:unreviewed.has(r.resource_id)?'PREVIOUSLY_UNREVIEWED':'REGULAR_ROTATION',
   scientific_paper_source:paperSourceIds.has(r.resource_id),inspection_status:'NOT_YET_RECORDED'})),
  rule:'Plan enabled editorial sources as before; prioritize qualified original scientific-paper leads when the seven-edition paper target is due or historical evidence is missing, without forcing publication. Separately account for every registered video lead, including disabled qualification-only leads. The video_source_sweep plan never proves retrieval; write and validate actual per-source attempts before new-edition selection lock. Disabled resources stay unqualified unless independently admitted.'};
}

// Initialize dispositions from the already verified and pinned Compiler snapshot.
// Planning records no actual attempts or selection mappings.
function initializeTrendSearchCoverage(editionDate,input){
 const report=input.report;
 const cycle=input.cycle_date;
 const reportAge=Date.parse(input.retrieved_at)-Date.parse(report?.generated_at);
 const topics=report?.topics;
 if(input.schema_version!=='daily-ai-topic-top10-input-v1'||
    !validDate(cycle)||Date.parse(editionDate)-Date.parse(cycle)!==86400000||
    input.edition_date!==editionDate||input.report_date!==cycle||
    report?.schema_version!=='daily-ai-topic-top10-v1'||report.report_date!==cycle||
    report.target_edition_date!==editionDate||report.timezone!=='America/Chicago'||
    !['ready','provisional','partial'].includes(report.status)||
    !Number.isFinite(reportAge)||reportAge<0||reportAge>86400000||
    input.source_path!=='signals/ai-topic-top10/'+cycle+'.json'||
    !/^[a-f0-9]{40}$/.test(input.source_commit||'')||
    !/^[a-f0-9]{40}$/.test(input.source_blob_sha||'')||
    !/^[a-f0-9]{64}$/.test(input.report_sha256||'')||
    !Array.isArray(topics)||topics.length>10||(report.status!=='partial'&&topics.length!==10)||
    new Set(topics.map(t=>t?.topic_id)).size!==topics.length||
    topics.some((t,i)=>t?.rank!==i+1||typeof t.topic_id!=='string'||!t.topic_id.trim()||
      roles.some(f=>typeof t.suggested_searches?.[f]!=='string'||!t.suggested_searches[f].trim())))
   throw Error('RESEARCH_PLAN_INVALID_TREND_INPUT');
 return {schema_version:'daily-ai-topic-top10-search-coverage-v1',cycle_date:cycle,edition_date:editionDate,
  source_commit:input.source_commit,report_sha256:input.report_sha256,
  searches:topics.flatMap(t=>roles.map(format=>({topic_id:t.topic_id,format,query:t.suggested_searches[format],
    attempted_at:null,source_urls:[],candidate_ids:[],outcome:'not_attempted',
    reason:'Initialized from the pinned discovery plan. No attempt has been recorded.'}))),
  selected_mappings:[]};
}
