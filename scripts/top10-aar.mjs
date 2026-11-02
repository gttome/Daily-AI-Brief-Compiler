// Deterministic reporting only: this module neither researches topics nor changes release gates.
import crypto from 'node:crypto';

const EFFECTIVE_CYCLE='2026-11-02';
const SHA=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const FORMATS=['article','video','podcast'];
const OUTCOMES=new Set(['searched','selected','rejected','not_found','unavailable','not_attempted']);
const clean=x=>x&&typeof x==='object'&&!Array.isArray(x)&&!x._evidence_parse_error&&!x.parse_error;
const text=x=>typeof x==='string'&&x.trim()?x.trim():null;
const timestamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x))?x:null;
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const digest=x=>crypto.createHash('sha256').update(canonical(x)).digest('hex');
const chicagoDate=x=>timestamp(x)?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x)):null;
const scoped=(x,cycle,edition)=>clean(x)&&x.cycle_date===cycle&&x.edition_date===edition;
const minutes=(a,b)=>timestamp(a)&&timestamp(b)&&Date.parse(b)>=Date.parse(a)?Number(((Date.parse(b)-Date.parse(a))/60000).toFixed(2)):null;
const observedNumber=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;

export function summarizeTop10(cycle,edition,evidence={},hashes={}){
 const applicable=cycle>=EFFECTIVE_CYCLE;
 const report=clean(evidence['top10-report'])?evidence['top10-report']:null;
 const source=clean(evidence['top10-report-source'])?evidence['top10-report-source']:null;
 const input=clean(evidence['trend-input'])?evidence['trend-input']:null;
 const coverage=clean(evidence['trend-search-coverage'])?evidence['trend-search-coverage']:null;
 const aar=scoped(evidence['top10-after-action'],cycle,edition)&&
  evidence['top10-after-action'].schema_version==='daily-ai-topic-top10-run-aar-v1'?evidence['top10-after-action']:null;
 const defects=[],limitations=[];
 const topics=Array.isArray(report?.topics)?report.topics:[];
 const expectedPath='signals/ai-topic-top10/'+cycle+'.json';
 let reportValid=!!(report&&report.schema_version==='daily-ai-topic-top10-v1'&&report.report_date===cycle&&
  report.target_edition_date===edition&&report.timezone==='America/Chicago'&&
  ['ready','provisional','partial'].includes(report.status)&&timestamp(report.generated_at)&&
  chicagoDate(report.generated_at)===cycle&&topics.length<=10);
 const ids=new Set();
 for(let i=0;i<topics.length;i++){
  const t=topics[i];
  if(!clean(t)||t.rank!==i+1||!text(t.topic_id)||ids.has(t.topic_id)||!text(t.name)||!text(t.summary)||
   !['high','medium','low'].includes(t.confidence)||!FORMATS.every(f=>text(t.suggested_searches?.[f]))||
   !Array.isArray(t.evidence)||!t.evidence.some(x=>https(x?.source_url??x?.url)))reportValid=false;
  ids.add(t?.topic_id);
 }
 if(report?.status!=='partial'&&topics.length!==10)reportValid=false;
 if(report?.status==='partial'&&(!Array.isArray(report.limitations)||!report.limitations.some(text)))reportValid=false;
 if(report&&!reportValid)defects.push('Top 10 report schema, Chicago cycle/edition, timestamp, topic ranks or evidence are invalid.');
 const rawHash=SHA256.test(hashes['top10-report']??'')?hashes['top10-report']:null;
 const sourceBound=!!(reportValid&&source?.schema_version==='daily-ai-topic-top10-source-v1'&&
  scoped(source,cycle,edition)&&source.source_path===expectedPath&&SHA.test(source.source_commit??'')&&
  SHA.test(source.source_blob_sha??'')&&rawHash&&rawHash===source.report_sha256&&timestamp(source.observed_at)&&
  Date.parse(source.observed_at)>=Date.parse(report.generated_at));
 if(report&&!sourceBound)limitations.push('Current report provenance is not independently bound to exact source bytes and a Git commit.');
 let freshness=reportValid?'VALID_REPORT_CYCLE':report?'INVALID':'NOT_OBSERVED';
 let handoff=applicable?'NOT_OBSERVED':'NOT_APPLICABLE';
 if(input){
  const received=timestamp(input.retrieved_at),generated=timestamp(report?.generated_at);
  const age=received&&generated?Date.parse(received)-Date.parse(generated):null;
  const fresh=age!==null&&age>=0&&age<=86400000;
  if(reportValid&&received)freshness=fresh?'FRESH_AT_CONSUMPTION':age<0?'FUTURE_AT_CONSUMPTION':'STALE_AT_CONSUMPTION';
  const inputValid=reportValid&&sourceBound&&input.schema_version==='daily-ai-topic-top10-input-v1'&&
   scoped(input,cycle,edition)&&input.report_date===cycle&&input.source_path===expectedPath&&
   SHA.test(input.source_commit??'')&&input.source_blob_sha===source.source_blob_sha&&
   input.report_sha256===rawHash&&clean(input.report)&&digest(input.report)===digest(report)&&fresh&&
   Date.parse(received)<=Date.parse(source.observed_at);
  handoff=inputValid?'RECEIVED_SNAPSHOT_BOUND':'INVALID';
  if(!inputValid)defects.push('Compiler trend input is not a fresh, date-correct, exact-report snapshot bound to independently collected bytes.');
 }
 const searchCounts=Object.fromEntries(FORMATS.map(f=>[f,{recorded:0,attempted:0,not_attempted:0}]));
 const searches=Array.isArray(coverage?.searches)?coverage.searches:[];
 const covered=new Set(),observations=new Set();let searchesValid=true;
 for(const row of searches){
  const key=row?.topic_id+':'+row?.format;
  const observation=JSON.stringify([row?.topic_id,row?.format,row?.query,row?.attempted_at??null]);
  const noAttempt=row?.outcome==='not_attempted';
  const attempted=timestamp(row?.attempted_at);
  const valid=clean(row)&&ids.has(row.topic_id)&&FORMATS.includes(row.format)&&OUTCOMES.has(row.outcome)&&
   !observations.has(observation)&&text(row.query)&&text(row.reason)&&
   (noAttempt||(attempted&&timestamp(input?.retrieved_at)&&Date.parse(attempted)>=Date.parse(input.retrieved_at)&&
     timestamp(source?.observed_at)&&Date.parse(attempted)<=Date.parse(source.observed_at)&&
     Array.isArray(row.source_urls)&&row.source_urls.length>0&&row.source_urls.every(https)));
  if(!valid){searchesValid=false;continue;}
  covered.add(key);observations.add(observation);searchCounts[row.format].recorded++;
  searchCounts[row.format][noAttempt?'not_attempted':'attempted']++;
 }
 const mappings=Array.isArray(coverage?.selected_mappings)?coverage.selected_mappings:[];
 const mappingValid=mappings.every(m=>clean(m)&&ids.has(m.topic_id)&&FORMATS.includes(m.format)&&
  text(m.item_id)&&https(m.url)&&text(m.reason)&&covered.has(m.topic_id+':'+m.format));
 const bundle=clean(evidence['edition-bundle'])&&evidence['edition-bundle'].edition_date===edition?
  evidence['edition-bundle']:null;
 const selectedMatch=m=>{
  const records=bundle?.[m.format==='article'?'stories':m.format==='video'?'videos':'podcasts'];
  return Array.isArray(records)&&records.some(item=>{
   const url=item?.source?.url??item?.url;
   const id=text(item?.id)??url;
   return https(url)&&m.url===url&&m.item_id===id;
  });
 };
 const mappingStatus=!mappings.length?'NONE_RECORDED':!mappingValid?'INVALID':!bundle?
  'UNVERIFIED_BUNDLE_MISSING':mappings.every(selectedMatch)?'MATCHES_EDITION_BUNDLE':'INVALID';
 if(mappings.length&&mappingStatus!=='MATCHES_EDITION_BUNDLE')
  defects.push('Claimed trend-to-selection mappings are not verified against the same-edition selected bundle.');
 const coverageValid=!!(handoff==='RECEIVED_SNAPSHOT_BOUND'&&
  coverage?.schema_version==='daily-ai-topic-top10-search-coverage-v1'&&scoped(coverage,cycle,edition)&&
  coverage.report_sha256===input.report_sha256&&coverage.source_commit===input.source_commit&&
  searchesValid&&mappingValid&&covered.size===topics.length*FORMATS.length);
 const searchStatus=!coverage?(applicable?'NOT_OBSERVED':'NOT_APPLICABLE'):coverageValid?'RECEIPTS_OBSERVED':'INVALID';
 if(coverage&&!coverageValid)defects.push('Per-topic article/video/podcast search coverage is incomplete, invalid or bound to a different input.');
 const notAttempted=Object.values(searchCounts).reduce((n,f)=>n+f.not_attempted,0);
 if(notAttempted)limitations.push(notAttempted+' topic/format searches are explicitly not attempted.');
 if(applicable&&!report)limitations.push('No cycle-specific Top 10 report was observed; this does not prove the schedule never ran.');
 if(applicable&&!input)limitations.push('No Compiler receipt proves this report was received or used.');
 if(applicable&&!coverage)limitations.push('No per-topic article/video/podcast search receipt was observed.');
 if(report?.status==='provisional')limitations.push('The report labels its ranking provisional.');
 if(report?.status==='partial')limitations.push('The report labels its research partial.');
 if(Array.isArray(report?.limitations))limitations.push(...report.limitations.filter(x=>typeof x==='string'));
 const elapsed=aar&&timestamp(source?.observed_at)&&timestamp(aar.finished_at)&&
  Date.parse(aar.finished_at)<=Date.parse(source.observed_at)?minutes(aar.started_at,aar.finished_at):null;
 if(aar&&elapsed===null)limitations.push('Top 10 elapsed time is not supported by valid, collection-bounded start/finish timestamps.');
 const consumed=evidence['trend-consumed-source'],consumedReport=evidence['trend-consumed-report'];
 const consumedVerified=!!(handoff==='RECEIVED_SNAPSHOT_BOUND'&&
  consumed?.schema_version==='daily-ai-topic-top10-consumed-source-v1'&&scoped(consumed,cycle,edition)&&
  consumed.source_commit===input.source_commit&&consumed.source_path===input.source_path&&
  consumed.source_blob_sha===input.source_blob_sha&&consumed.report_sha256===input.report_sha256&&
  hashes['trend-consumed-report']===input.report_sha256&&clean(consumedReport)&&digest(consumedReport)===digest(input.report)&&
  timestamp(consumed.observed_at)&&Date.parse(consumed.observed_at)>=Date.parse(input.retrieved_at));
 if(applicable&&!consumedVerified)limitations.push('The exact Compiler-consumed commit has not been independently corroborated.');
 const endToEnd=consumedVerified&&reportValid&&topics.length===10&&report.status!=='partial'&&handoff==='RECEIVED_SNAPSHOT_BOUND'&&
  searchStatus==='RECEIPTS_OBSERVED'&&notAttempted===0&&
  ['NONE_RECORDED','MATCHES_EDITION_BUNDLE'].includes(mappingStatus);
 return {
  schema_version:'daily-ai-topic-top10-aar-v1',lane:'top10',cycle_date:cycle,edition_date:edition,applicable,
  expected_local_start:'17:00 America/Chicago',
  result:!applicable?'NOT_APPLICABLE':!report?'NOT_OBSERVED':!reportValid?'INVALID':endToEnd?'REPORT_AND_SEARCH_RECEIPTS_OBSERVED':'PARTIAL',
  report_available:!!report,report_valid:reportValid,report_status:report?.status??null,
  report_freshness:freshness,topic_count:reportValid?topics.length:null,
  generated_at:timestamp(report?.generated_at),
  topics:reportValid?topics.map(t=>({rank:t.rank,topic_id:t.topic_id,name:t.name,summary:t.summary,
   confidence:t.confidence,evidence_urls:t.evidence.map(x=>https(x?.source_url??x?.url)).filter(Boolean),
   limitations:Array.isArray(t.limitations)?t.limitations:[]})):[],
  sample_scope:reportValid?report.sample_scope??null:null,ranking_basis:reportValid?report.ranking_basis??null:null,
  source_commit:sourceBound?source.source_commit:null,source_blob_sha:sourceBound?source.source_blob_sha:null,
  report_sha256:sourceBound?rawHash:null,consumed_source_commit:handoff==='RECEIVED_SNAPSHOT_BOUND'?input.source_commit:null,
  consumed_commit_independently_verified:consumedVerified,
  handoff_status:handoff,search_status:searchStatus,search_counts:searchCounts,
  selection_mapping_status:mappingStatus,selection_mappings_reported:mappings.length,
  selected_mappings:coverageValid&&mappingStatus==='MATCHES_EDITION_BUNDLE'?mappings:[],end_to_end_ready:endToEnd,
  started_at:aar?timestamp(aar.started_at):null,finished_at:aar?timestamp(aar.finished_at):null,elapsed_minutes:elapsed,
  usage_percent:aar?observedNumber(aar.usage_percent):null,cost_usd:aar?observedNumber(aar.cost_usd):null,
  autonomy_status:'UNPROVEN',
  errors:aar&&Array.isArray(aar.errors)?aar.errors:[],improvements:aar&&Array.isArray(aar.improvements)?aar.improvements:[],
  defects,limitations:[...new Set(limitations)],
  note:'Report, source-readback and search receipts are separate observations. Snapshot binding verifies the collected report bytes; the consumed commit is independently corroborated only when the separately fetched source bytes match. These records do not independently attest scheduler identity or source truth. Top 10 reporting does not change Brief/image release status.'
 };
}

const cell=x=>String(x??'Not reported').replace(/[\\|\[\]*_`<>]/g,c=>c==='<'?'&lt;':c==='>'?'&gt;':'\\'+c).replace(/\r?\n/g,' ');
const shown=x=>x===null||x===undefined?'Not reported':cell(typeof x==='object'?JSON.stringify(x):x);
const link=x=>{const u=https(x);return u?'[Source]('+u.replace(/[|()\[\]]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())+')':'Not reported';};

export function renderTop10Section(s){
 const rows=[
  ['Run/report result',s.result],['Report status / topics',s.report_status?`${s.report_status} / ${s.topic_count??'unknown'}`:null],
  ['Freshness',s.report_freshness],['Compiler handoff',s.handoff_status],['Search coverage',s.search_status],
  ['Selection mapping verification',s.selection_mapping_status],
  ['Observed start / finish',s.started_at||s.finished_at?`${s.started_at??'Not reported'} / ${s.finished_at??'Not reported'}`:null],
  ['Elapsed minutes',s.elapsed_minutes],['Usage percent',s.usage_percent],['Cost USD',s.cost_usd],
  ['Independent scheduler autonomy',s.autonomy_status],['Compiler-recorded consumed commit',s.consumed_source_commit],['Report SHA-256',s.report_sha256]
 ];
 const lines=['## Daily AI Topic Top 10 and Compiler handoff','',
  `**Research cycle:** ${cell(s.cycle_date)} · **Target Brief:** ${cell(s.edition_date)} · **Scheduled start:** 17:00 America/Chicago`,'',
  '| Dimension | Recorded evidence |','|---|---|',...rows.map(([a,b])=>`| ${a} | ${shown(b)} |`),''];
 if(!s.applicable)lines.push('The Top 10 handoff was not applicable before the November 2, 2026 research cycle.','');
 if(s.topics.length)lines.push('| Rank | AI topic | Summary | Confidence | Evidence |','|---:|---|---|---|---|',
  ...s.topics.map(t=>`| ${t.rank} | ${cell(t.name)} | ${cell(t.summary)} | ${cell(t.confidence)} | ${t.evidence_urls.map(link).join(' · ')} |`),'');
 else lines.push('No valid cycle-specific ranked list is available in the collected evidence.','');
 lines.push(`**Sample scope:** ${shown(s.sample_scope)}. **Ranking basis:** ${shown(s.ranking_basis)}.`,'',
  '| Search format | Receipt rows | Attempts recorded | Explicitly not attempted |','|---|---:|---:|---:|',
  ...FORMATS.map(f=>`| ${f} | ${s.search_counts[f].recorded} | ${s.search_counts[f].attempted} | ${s.search_counts[f].not_attempted} |`),'',
  '**Selected Brief items linked to trends:**','');
 if(s.selected_mappings.length)lines.push('| Topic | Format | Selected item | Reason |','|---|---|---|---|',
  ...s.selected_mappings.map(m=>`| ${cell(m.topic_id)} | ${cell(m.format)} | ${cell(m.item_id)} · ${link(m.url)} | ${cell(m.reason)} |`),'');
 else lines.push('No validated selection-to-topic mapping was recorded.','');
 const issues=[...s.defects,...s.limitations];
 if(issues.length)lines.push('**Gaps and limitations:**','',...issues.map(x=>'- '+cell(x)),'');
 for(const [heading,items] of [['Recorded run issues',s.errors],['Recorded improvements',s.improvements]])
  if(items.length)lines.push('**'+heading+':**','',...items.map(x=>'- '+shown(x)),'');
 lines.push(s.note,'');return lines.join('\n');
}
