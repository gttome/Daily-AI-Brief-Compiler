// Deterministic reporting only: this module neither researches topics nor changes release gates.
import crypto from 'node:crypto';

const EFFECTIVE_CYCLE='2026-11-02';
const SHA=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const FORMATS=['article','video','podcast'];
const OUTCOMES=new Set(['searched','selected','rejected','qualified_not_selected','not_found','unavailable','not_attempted']);
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
 const bundle=clean(evidence['edition-bundle'])&&evidence['edition-bundle'].edition_date===edition?
  evidence['edition-bundle']:null;
 // The source readback may be collected before or after Compiler searches.
 // Search chronology is bound to the consumed snapshot and the editorial selection
 // lock, never to the separate Top 10 provenance-collector observation time.
 const selectionLock=timestamp(bundle?.editorial_provenance?.selection_locked_at)||
  timestamp(coverage?.impact_observations?.timing?.selection_locked_at);
 const covered=new Set(),observations=new Set();let searchesValid=true;
 for(const row of searches){
  const key=row?.topic_id+':'+row?.format;
  const observation=JSON.stringify([row?.topic_id,row?.format,row?.query,row?.attempted_at??null]);
  const noAttempt=row?.outcome==='not_attempted';
  const attempted=timestamp(row?.attempted_at);
  const sourceUrls=Array.isArray(row?.source_urls)?row.source_urls:null;
  const candidateIds=Array.isArray(row?.candidate_ids)?row.candidate_ids:null;
  const skipped=!!(noAttempt&&(row.attempted_at===null||row.attempted_at===undefined)&&
   sourceUrls&&sourceUrls.length===0&&candidateIds&&candidateIds.length===0);
  const searched=!!(!noAttempt&&text(row.query)&&attempted&&timestamp(input?.retrieved_at)&&
   Date.parse(attempted)>=Date.parse(input.retrieved_at)&&
   (!selectionLock||Date.parse(attempted)<=Date.parse(selectionLock))&&
   sourceUrls&&sourceUrls.length>0&&sourceUrls.every(https));
  const valid=clean(row)&&ids.has(row.topic_id)&&FORMATS.includes(row.format)&&OUTCOMES.has(row.outcome)&&
   !observations.has(observation)&&text(row.reason)&&candidateIds&&candidateIds.every(text)&&
   (noAttempt?skipped:searched);
  if(!valid){searchesValid=false;continue;}
  covered.add(key);observations.add(observation);searchCounts[row.format].recorded++;
  searchCounts[row.format][noAttempt?'not_attempted':'attempted']++;
 }
 const mappings=Array.isArray(coverage?.selected_mappings)?coverage.selected_mappings:[];
 const mappingValid=mappings.every(m=>clean(m)&&ids.has(m.topic_id)&&FORMATS.includes(m.format)&&
  text(m.item_id)&&https(m.url)&&text(m.reason)&&covered.has(m.topic_id+':'+m.format));
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
 const result={
  schema_version:'daily-ai-topic-top10-aar-v1',lane:'top10',cycle_date:cycle,edition_date:edition,applicable,
  expected_local_start:'17:00 America/Chicago',
  result:!applicable?'NOT_APPLICABLE':!report?'NOT_OBSERVED':!reportValid?'INVALID':endToEnd?'REPORT_AND_SEARCH_RECEIPTS_OBSERVED':'PARTIAL',
  report_available:!!report,report_valid:reportValid,report_status:report?.status??null,
  report_freshness:freshness,topic_count:reportValid?topics.length:null,
  generated_at:timestamp(report?.generated_at),
  topics:reportValid?topics.map(t=>({rank:t.rank,topic_id:t.topic_id,name:t.name,summary:t.summary,
   confidence:t.confidence,attention_band:t.attention_band??null,brief_priority:t.brief_priority??null,
   freshness:t.freshness??null,why_now:t.why_now??null,rank_semantics:t.rank_semantics??null,
   evidence_urls:t.evidence.map(x=>https(x?.source_url??x?.url)).filter(Boolean),
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
 result.ranking_status=reportValid?report.ranking_status??null:null;
 result.daily_improvement=summarizeDailyImprovement(result,evidence,hashes);
 return result;
}

const BASELINE_ID='nov03-2026-v1';
const BASELINE_HASH='059ee675574a3ba7e257828e8b062a638f808d29870e49ca924791d51d47735d';
const previousDate=d=>new Date(Date.parse(d+'T00:00:00Z')-86400000).toISOString().slice(0,10);
const unique=xs=>new Set(xs).size;
function inputMetrics(report){
 const scope=report?.sample_scope??{},topics=report?.topics;
 return {topic_count:Array.isArray(topics)?topics.length:null,
  validation_resource_count:Array.isArray(report?.validation_resources)?report.validation_resources.length:null,
  additional_video_metadata_records:observedNumber(scope.new_metadata_screened_records),
  additional_video_channels:observedNumber(scope.new_metadata_distinct_channels),
  total_video_observations:observedNumber(scope.combined_observation_records),
  unique_videos:observedNumber(scope.combined_unique_video_ids),
  full_video_reviews:observedNumber(scope.videos_watched),
  direct_youtube_counter_verifications:observedNumber(scope.direct_counter_verifications),
  broader_evidence_band_topics:Array.isArray(topics)&&topics.every(t=>text(t.attention_band))?topics.filter(t=>t.attention_band==='broader').length:null,
  limited_evidence_band_topics:Array.isArray(topics)&&topics.every(t=>text(t.attention_band))?topics.filter(t=>t.attention_band==='limited').length:null};
}
const delta=(current,base)=>Object.fromEntries(Object.entries(current).map(([key,value])=>[key,
 typeof value==='number'&&Number.isFinite(value)&&typeof base?.[key]==='number'&&Number.isFinite(base[key])?value-base[key]:null]));

// Supplementary review-depth evidence. Do not reinterpret or extend the frozen
// November 3 outcome baseline, which did not record this candidate-level ledger.
export function summarizeCandidateReviews({coverage,bundle,bound=false,edition}){
 const empty=status=>({status,reviewed_candidate_count:null,qualified_candidate_count:null,
  rejected_candidate_count:null,metadata_only_count:null,full_video_reviews:null,transcript_reviews:null});
 const ledger=coverage?.candidate_reviews;
 if(!bound||!ledger)return empty('NOT_RECORDED');
 if(coverage.edition_date!==edition||ledger.schema_version!=='daily-compiler-candidate-reviews-v1'||ledger.edition_date!==edition||
    bundle?.edition_date!==edition||!Array.isArray(ledger.records)||!Array.isArray(coverage.searches)||
    !timestamp(bundle.editorial_provenance?.selection_locked_at))return empty('INVALID');
 const discovered=new Set(coverage.searches.filter(r=>r.outcome!=='not_attempted')
  .flatMap(r=>(Array.isArray(r.candidate_ids)?r.candidate_ids:[]).map(id=>r.format+':'+id)));
 const seen=new Set(),sources=new Set(),methods=new Set(['full_article','full_transcript','full_video','detailed_episode_notes','metadata_only']);
 for(const r of ledger.records){
  if(!clean(r))return empty('INVALID');
  const key=r.format+':'+r.candidate_id;
  const sourceKey=r.format+':'+https(r.source_url);
  if(!FORMATS.includes(r.format)||!discovered.has(key)||seen.has(key)||sources.has(sourceKey)||!https(r.source_url)||
     !methods.has(r.review_method)||!['qualified','rejected','research_lead'].includes(r.disposition)||
     !timestamp(r.retrieved_at)||!timestamp(r.reviewed_at)||Date.parse(r.retrieved_at)>Date.parse(r.reviewed_at)||
     Date.parse(r.reviewed_at)>Date.parse(bundle.editorial_provenance.selection_locked_at)||
     !text(r.content_evidence)||r.content_evidence.trim().length<50||!text(r.disposition_reason)||r.disposition_reason.trim().length<40||
     (r.disposition==='qualified'&&r.review_method==='metadata_only')||
     (r.review_method==='full_transcript'&&r.format==='article')||
     (r.review_method==='detailed_episode_notes'&&r.format!=='podcast')||
     (r.review_method==='full_video'&&r.format!=='video')||
     (r.review_method==='full_article'&&r.format!=='article'))return empty('INVALID');
  seen.add(key);sources.add(sourceKey);
 }
 const rows=ledger.records;
 return {status:'RECORDED_REVIEW_LEDGER',reviewed_candidate_count:rows.filter(r=>r.review_method!=='metadata_only').length,
  qualified_candidate_count:rows.filter(r=>r.disposition==='qualified').length,
  rejected_candidate_count:rows.filter(r=>r.disposition==='rejected').length,
  metadata_only_count:rows.filter(r=>r.review_method==='metadata_only').length,
  full_video_reviews:rows.filter(r=>r.review_method==='full_video').length,
  transcript_reviews:rows.filter(r=>r.review_method==='full_transcript').length};
}

export function summarizeDailyImprovement(s,e={},hashes={}){
 const report=s.report_valid?e['top10-report']:null,rawBaseline=e['top10-baseline'];
 const baseline=clean(rawBaseline)&&rawBaseline.schema_version==='daily-ai-topic-top10-baseline-v1'&&
  rawBaseline.baseline_id===BASELINE_ID&&rawBaseline.cycle_date===EFFECTIVE_CYCLE&&rawBaseline.edition_date==='2026-11-03'&&
  rawBaseline.report?.sha256===BASELINE_HASH?rawBaseline:null;
 const prior=e['top10-previous-report'];
 const previous=clean(prior)&&prior.schema_version==='daily-ai-topic-top10-v1'&&
  prior.report_date===previousDate(s.cycle_date)&&prior.target_edition_date===s.cycle_date?prior:null;
 const priorAar=e['top10-previous-aar'];
 const previousAar=clean(priorAar)&&priorAar.schema_version==='daily-ai-topic-top10-aar-v1'&&
  priorAar.cycle_date===previousDate(s.cycle_date)&&priorAar.edition_date===s.cycle_date?priorAar:null;
 const coverage=e['trend-search-coverage'];
 const bound=s.consumed_commit_independently_verified&&s.search_status==='RECEIPTS_OBSERVED';
 const rows=bound?coverage.searches.filter(r=>r.outcome!=='not_attempted'):[];
 const bundle=e['edition-bundle'];
 const selectionsObserved=bound&&Array.isArray(coverage.selected_mappings)&&clean(bundle)&&bundle.edition_date===s.edition_date&&
  FORMATS.every(f=>Array.isArray(bundle[f==='article'?'stories':f==='video'?'videos':'podcasts']))&&
  ['NONE_RECORDED','MATCHES_EDITION_BUNDLE'].includes(s.selection_mapping_status);
 const candidatesObserved=bound&&rows.every(r=>Array.isArray(r.candidate_ids)&&r.candidate_ids.every(text));
 const metrics={expected_topic_format_pairs:s.topic_count===null?null:s.topic_count*3,
  attempted_topic_format_pairs:bound?unique(rows.map(r=>r.topic_id+':'+r.format)):null,
  explicitly_unattempted_pairs:bound?unique(coverage.searches.filter(r=>r.outcome==='not_attempted').map(r=>r.topic_id+':'+r.format)):null,
  discovered_candidate_count:candidatesObserved?unique(rows.flatMap(r=>r.candidate_ids.map(id=>r.format+':'+id))):null,
  searched_source_host_count:bound?unique(rows.flatMap(r=>r.source_urls.map(u=>new URL(u).hostname))):null,
  selected_article_count:selectionsObserved?unique(s.selected_mappings.filter(m=>m.format==='article').map(m=>m.item_id)):null,
  selected_video_count:selectionsObserved?unique(s.selected_mappings.filter(m=>m.format==='video').map(m=>m.item_id)):null,
  selected_podcast_count:selectionsObserved?unique(s.selected_mappings.filter(m=>m.format==='podcast').map(m=>m.item_id)):null};
 const frozen=e['top10-outcome-baseline'];
 const frozenValid=baseline&&clean(frozen)&&frozen.schema_version==='daily-ai-topic-top10-outcome-baseline-v1'&&
  frozen.baseline_id===BASELINE_ID&&frozen.cycle_date===EFFECTIVE_CYCLE&&frozen.edition_date==='2026-11-03'&&
  frozen.report_sha256===BASELINE_HASH&&frozen.publication_verified===true&&clean(frozen.metrics)&&
  Object.keys(metrics).every(k=>observedNumber(frozen.metrics[k])!==null);
 const sidecar=e['top10-improvement'];
 const log=clean(report?.daily_improvement)?report.daily_improvement:
  scoped(sidecar,s.cycle_date,s.edition_date)&&sidecar.report_sha256===s.report_sha256&&clean(sidecar.daily_improvement)?sidecar.daily_improvement:null;
 const priorMetrics=previousAar?.daily_improvement?.outcome_metrics_status==='OBSERVED'?previousAar.daily_improvement.outcome_metrics:null;
 const currentInput=inputMetrics(report),resourceIds=r=>Array.isArray(r?.validation_resources)?r.validation_resources.map(x=>x.id).filter(text):[];
 const currentIds=resourceIds(report),previousIds=resourceIds(previous);
 const reviewDepth=summarizeCandidateReviews({coverage,bundle,bound,edition:s.edition_date});
 const previousDepth=previousAar?.daily_improvement?.candidate_review_depth;
 return {schema_version:'daily-ai-topic-top10-improvement-aar-v1',baseline_id:BASELINE_ID,
  baseline_status:!s.applicable?'NOT_APPLICABLE':baseline?'INPUT_FROZEN':'NOT_OBSERVED',
  baseline_input:baseline?.input_metrics??null,baseline_input_sha256:hashes['top10-baseline']??null,
  current_input:currentInput,input_delta_from_baseline:delta(currentInput,baseline?.input_metrics),
  previous_cycle:previous?.report_date??previousAar?.cycle_date??null,
  previous_report_sha256:previous?hashes['top10-previous-report']??null:null,
  previous_aar_sha256:previousAar?hashes['top10-previous-aar']??null:null,
  input_delta_from_previous:delta(currentInput,previous?inputMetrics(previous):null),
  source_registry_changes:report&&previous?{added:currentIds.filter(id=>!previousIds.includes(id)),removed:previousIds.filter(id=>!currentIds.includes(id))}:null,
  outcome_metrics_status:selectionsObserved&&candidatesObserved?'OBSERVED':'PENDING_OR_INCOMPLETE',
  outcome_metrics:metrics,outcome_baseline_status:frozenValid?'FROZEN_AFTER_VERIFIED_PUBLICATION':'PENDING',
  outcome_baseline_sha256:frozenValid?hashes['top10-outcome-baseline']??null:null,
  outcome_delta_from_baseline:delta(metrics,frozenValid?frozen.metrics:null),
  outcome_delta_from_previous:delta(metrics,priorMetrics),
  candidate_review_depth:reviewDepth,
  candidate_review_delta_from_previous:delta(Object.fromEntries(Object.entries(reviewDepth).filter(([k])=>k!=='status')),
    previousDepth?.status==='RECORDED_REVIEW_LEDGER'?previousDepth:null),
  candidate_review_baseline_status:'NOT_RECORDED_IN_FROZEN_NOV03_BASELINE',
  change_log_status:log?'RECORDED':'NOT_OBSERVED',change_log:log,
  reported_impact_observations:bound&&clean(coverage.impact_observations)?coverage.impact_observations:null,
  reported_impact_status:bound&&clean(coverage.impact_observations)?'HISTORICAL_PRODUCER_SNAPSHOT_NOT_CURRENT_STATUS':'NOT_RECORDED',
  reported_impact_interpretation:'Preserved producer claims from the original observation time. Pending statuses may be superseded by current reconciled metrics; candidate-quality claims require the separate validated review ledger.',
  next_improvement:text(log?.next_improvement)??(!bound?'Collect and verify the actual Compiler input and search receipts.':'Review candidate quality, unattempted searches and source gaps before changing the method.'),
  interpretation:'Counts show coverage and observed association, not audience popularity, source independence, candidate quality or causal uplift. Compare source/method changes before interpreting deltas. Unknown values are not zero. Publication, reader corrections, runtime and image outcomes retain their separate AAR evidence.'};
}

export function buildTop10OutcomeBaseline(top10,compiler,hashes={}){
 const d=top10.daily_improvement;
 if(top10.cycle_date!==EFFECTIVE_CYCLE||top10.edition_date!=='2026-11-03'||top10.report_sha256!==BASELINE_HASH||
  d?.baseline_status!=='INPUT_FROZEN'||d.outcome_metrics_status!=='OBSERVED'||compiler?.result!=='SUCCESS'||
  compiler.edition_date!=='2026-11-03')return null;
 return {schema_version:'daily-ai-topic-top10-outcome-baseline-v1',baseline_id:BASELINE_ID,
  cycle_date:top10.cycle_date,edition_date:top10.edition_date,report_sha256:top10.report_sha256,
  consumed_source_commit:top10.consumed_source_commit,publication_verified:true,
  metrics:d.outcome_metrics,source_evidence_hashes:hashes,
  interpretation:'First observed November 3 search/selection outcome after verified publication; immutable reference, not proof of causal uplift.'};
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
 if(s.ranking_status==='unranked_within_evidence_bands')lines.push('**Order:** discovery sequence only; entries are unranked within qualitative evidence bands.','');
 if(s.topics.length)lines.push('| Discovery order | AI topic | Summary | Confidence | Evidence |','|---:|---|---|---|---|',
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
 const d=s.daily_improvement;
 if(d&&s.applicable){
  lines.push('### Daily improvement and effect on the Brief','',
   `**Fixed baseline:** ${cell(d.baseline_id)} / ${cell(d.baseline_status)}. **Outcome baseline:** ${cell(d.outcome_baseline_status)}. **Prior cycle:** ${shown(d.previous_cycle)}.`,'',
   '| Input measure | Current | November 3 baseline | Change from baseline | Change from prior cycle |','|---|---:|---:|---:|---:|',
   ...Object.entries(d.current_input).map(([k,v])=>`| ${cell(k.replaceAll('_',' '))} | ${shown(v)} | ${shown(d.baseline_input?.[k])} | ${shown(d.input_delta_from_baseline[k])} | ${shown(d.input_delta_from_previous[k])} |`),'',
   `**Observed downstream measurements:** ${cell(d.outcome_metrics_status)}.`,'',
   '| Outcome measure | Current | Change from frozen outcome | Change from prior cycle |','|---|---:|---:|---:|',
   ...Object.entries(d.outcome_metrics).map(([k,v])=>`| ${cell(k.replaceAll('_',' '))} | ${shown(v)} | ${shown(d.outcome_delta_from_baseline[k])} | ${shown(d.outcome_delta_from_previous[k])} |`),'',
   '**Source changes:** '+shown(d.source_registry_changes)+'.','',
   '**Candidate review depth:** '+cell(d.candidate_review_depth?.status??'NOT_RECORDED')+'.','',
   '| Review measure | Current | Change from prior comparable cycle |','|---|---:|---:|',
   ...Object.entries(d.candidate_review_depth??{}).filter(([k])=>k!=='status').map(([k,v])=>`| ${cell(k.replaceAll('_',' '))} | ${shown(v)} | ${shown(d.candidate_review_delta_from_previous?.[k])} |`),'',
   'The frozen November 3 baseline has no candidate-level review ledger; no retrospective value is invented. Recorded reviews do not independently establish content quality, audience interest or causal benefit.','',
   '**Method/resource review:** '+shown(d.change_log)+'.','',
   '**Current reconciled conclusion:** '+cell(d.outcome_metrics_status)+'; outcome baseline '+cell(d.outcome_baseline_status)+
    '; candidate review ledger '+cell(d.candidate_review_depth?.status??'NOT_RECORDED')+'.','',
   '**Historical producer observations (not current status):** The following snapshot preserves what the producer reported at the time. Its pending statuses and candidate-quality claims are not independently reconciled conclusions. Use the current tables above for publication-bound measurements; an absent candidate review ledger remains unknown.','',
   '<details><summary>Original producer effects and gaps — historical snapshot</summary>','',
   '```json',JSON.stringify(d.reported_impact_observations??null,null,2),'```','','</details>','',
   '**Next improvement:** '+cell(d.next_improvement),'',d.interpretation,'');
 }
 lines.push(s.note,'');return lines.join('\n');
}

