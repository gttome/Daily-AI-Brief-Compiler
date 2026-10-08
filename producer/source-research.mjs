import {parseMediaInstant, publicationInterval} from '../compiler/media.mjs';
import {
  assessRouteQualification, replaySourcePlan, sourceDigest,
  validateBoundSourcePlan, validateSourceSnapshot, validateWebExtraction
} from '../operations/source-discovery.mjs';
import {
  RESEARCH_FOCUS, boundResearchCandidates, researchEvidenceCharacters,
  validateEditorialResearch, validateResearchEnvelope
} from './research.mjs';

export const SOURCE_RESEARCH_VERSION='daily-compiler-source-research-v1';
const fail=reason=>{throw new Error('source_research:'+reason);};
const requireOkay=(condition,reason)=>{if(!condition)fail(reason);};
const present=x=>typeof x==='string'&&x.trim().length>0;
const safeRef=x=>present(x)&&!/[\s\u0000-\u001f]/u.test(x)&&x.length<=900;
const requestFields=new Set(['resource_id','item_url','type','focus','agent_skills','score']);
const acquisitionFields=new Set(['plan_sha256','probe_key','cutoff_at','mode']);
const HOUR=3600000;
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const boundedIdentifier=(x,max)=>present(x)&&x.length<=max&&!/[\s\u0000-\u001f\u007f]/u.test(x);
function requestUrl(value){
  if(!boundedIdentifier(value,2048))return false;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
const ownValue=(value,key)=>record(value)?Object.getOwnPropertyDescriptor(value,key)?.value:undefined;
function requestProblem(request){
  if(!record(request)||![Object.prototype,null].includes(Object.getPrototypeOf(request))||Object.getOwnPropertySymbols(request).length)return 'classification_fields_only';
  const fields=Object.getOwnPropertyDescriptors(request);
  if(Object.keys(fields).length!==requestFields.size||Object.entries(fields).some(([key,d])=>!requestFields.has(key)||!d.enumerable||!Object.hasOwn(d,'value')))return 'classification_fields_only';
  if(!boundedIdentifier(request.resource_id,256)||!requestUrl(request.item_url))return 'classification_reference_bounds';
  if(!['article','video','podcast'].includes(request.type)||!RESEARCH_FOCUS.includes(request.focus)||
     typeof request.agent_skills!=='boolean'||!Number.isFinite(request.score))return 'classification_primitives';
  return null;
}
function rejection(request,reason){
  const id=ownValue(request,'resource_id'),url=ownValue(request,'item_url');
  // Rejections contain bounded references, never arbitrary caller objects/text.
  return {resource_id:boundedIdentifier(id,256)?id:null,item_url:requestUrl(url)?url:null,reason};
}
const candidateBindingKey=c=>sourceDigest([c.id,c.resource_id,c.source_observation_sha256]);

/** Source freshness is interval based: a date-only source never gains a made-up
 * midnight timestamp. Qualification samples can be old; selected articles cannot. */
export function articleResearchFreshness(publication,cutoff){
  try{
    const interval=publicationInterval(publication),at=parseMediaInstant(cutoff);
    if(interval.earliest_ms>at)return {status:'INELIGIBLE',reason:'future_original_publication'};
    const lower=at-168*HOUR;
    const tooOld=interval.end_exclusive?interval.latest_ms<=lower:interval.latest_ms<lower;
    if(tooOld)return {status:'INELIGIBLE',reason:'older_than_168_hours'};
    if(interval.latest_ms>at)return {status:'UNRESOLVED',reason:'publication_interval_crosses_cutoff'};
    if(interval.earliest_ms<lower)return {status:'UNRESOLVED',reason:'publication_interval_crosses_168_hour_boundary'};
    const oldest=(at-interval.earliest_ms)/HOUR;
    return {status:'ELIGIBLE',band:oldest<=24?'priority_24h':oldest<=72?'fallback_72h':'extended_168h'};
  }catch{return {status:'UNRESOLVED',reason:'original_publication_unknown_or_invalid'};}
}

/** Capture bindings prevent accidental cross-plan reuse. They are consistency
 * records, not signed-origin evidence or proof of contemporaneous dispatch. */
export function replayBoundSourceAcquisition(context,plan,document){
  const {registry,policy,qualifications,snapshot,observations}=context;
  requireOkay(validateSourceSnapshot(registry,policy,qualifications,snapshot,observations).length===0,'untrusted_snapshot');
  requireOkay(validateBoundSourcePlan(registry,policy,plan).length===0,'untrusted_plan');
  requireOkay(document?.plan_sha256===sourceDigest(plan)&&document.research_cutoff_at===plan.cutoff_at,'observation_plan_binding');
  requireOkay(Array.isArray(document.observations)&&safeRef(document.evidence_path),'observation_document');
  const mode=plan.purpose==='edition'?'live_plan_capture':'saved_evidence_replay';
  requireOkay(document.acquisition_mode===mode,'acquisition_mode_scope');
  const groups=new Map(plan.probes.flatMap(group=>group.resource_ids.map(id=>[id,group])));
  const ids=new Set();
  function binding(evidence,group){
    requireOkay(record(evidence)&&group.resource_ids.includes(evidence.resource_id),'acquisition_resource_scope');
    const b=evidence.acquisition_binding;
    requireOkay(record(b)&&Object.keys(b).length===acquisitionFields.size&&Object.keys(b).every(k=>acquisitionFields.has(k))&&
      b.plan_sha256===document.plan_sha256&&b.probe_key===group.probe_key&&b.cutoff_at===plan.cutoff_at&&b.mode===mode,'response_acquisition_binding');
  }
  for(const observation of document.observations){
    requireOkay(record(observation)&&present(observation.resource_id)&&!ids.has(observation.resource_id),'duplicate_or_invalid_observation');
    ids.add(observation.resource_id);
    const group=groups.get(observation.resource_id);
    requireOkay(!!group,'acquisition_resource_scope');
    binding(observation,group);
    if(observation.alternate_attempt!==undefined&&observation.alternate_attempt!==null){
      const alternate=observation.alternate_attempt;
      binding(alternate,group);
      requireOkay(!alternate.alternate_attempt,'nested_alternate_not_allowed');
      requireOkay(group.approved_alternates.some(a=>a.endpoint===alternate.endpoint),'unapproved_acquisition_alternate');
    }
  }
  return replaySourcePlan(plan,document.observations);
}

/** The semantic producer supplies classification/ranking only. Source identity,
 * support, dates, durations and route permission come from the approved snapshot
 * and this plan's observed exact item, never a caller's verified Boolean. */
export function buildSourceResearch(context,plan,document,requests){
  const coverage=replayBoundSourceAcquisition(context,plan,document);
  const {registry,policy,snapshot}=context;
  requireOkay(Array.isArray(requests)&&requests.length<=plan.unique_due_endpoints*policy.acquisition.max_items_per_response,'candidate_request_budget');
  const resources=new Map(registry.resources.map(r=>[r.resource_id,r]));
  const rows=new Map(coverage.rows.map(r=>[r.resource_id,r]));
  const groups=new Map(plan.probes.map(group=>[group.probe_key,group]));
  const observations=new Map();
  for(const observation of document.observations){
    const ref=document.evidence_path+'#'+observation.resource_id;
    observations.set(sourceDigest(observation),{evidence:observation,ref});
    if(observation.alternate_attempt)observations.set(sourceDigest(observation.alternate_attempt),{
      evidence:observation.alternate_attempt,ref:ref+'/alternate_attempt'});
  }
  const baselineIds=new Set(registry.source_portfolio.baseline_resource_ids);
  const candidates=[],rejected=[],support=new Map(),bindings=new Map();
  for(const request of requests){
    const reject=reason=>rejected.push(rejection(request,reason));
    const problem=requestProblem(request);
    if(problem){reject(problem);continue;}
    const r=resources.get(request.resource_id),row=rows.get(request.resource_id);
    if(!r||!r.enabled){reject('resource_not_enabled');continue;}
    if(!row?.due||row.coverage_status!=='checked'){reject('current_due_observation_required');continue;}
    const selected=observations.get(row.evidence_sha256),e=selected?.evidence,group=groups.get(row.probe_key);
    if(row.retrieval_status!=='healthy'||!e||validateWebExtraction(e,{endpoint:row.actual_retrieval_endpoint,maxBytes:policy.acquisition.max_response_bytes,maxItems:policy.acquisition.max_items_per_response}).length){
      reject('current_route_unavailable_or_invalid');continue;
    }
    const alternate=e.endpoint!==row.endpoint;
    if(!group?.resource_ids.includes(e.resource_id)||e.acquisition_binding.probe_key!==row.probe_key||
       (alternate&&!group.approved_alternates.some(a=>a.endpoint===e.endpoint))){reject('current_publisher_or_endpoint_mismatch');continue;}
    // Existing enabled Compiler routes retain their approval. A fresh successful
    // check can establish current usability without an observer editing config.
    // New imports require the explicit protected qualification grant as well.
    const approved=r.discovery?.qualification_status==='qualified'&&r.discovery.unattended_eligible;
    if(!approved&&!baselineIds.has(r.resource_id)){reject('new_route_requires_protected_qualification');continue;}
    if(approved&&(row.endpoint!==r.discovery.endpoint||e.publisher_identity.canonical_id!==r.discovery.publisher_id)){
      reject('current_publisher_or_endpoint_mismatch');continue;
    }
    // This temporary view assesses the already-authorized retrieval selected by
    // replay, including a shared response or approved alternate. It never grants
    // an alternate as a primary or changes the protected qualification snapshot.
    const ref=selected.ref;
    const current=assessRouteQualification({...r,resource_id:e.resource_id,url:e.endpoint,endpoint:e.endpoint},e,{policy,evidence_ref:ref});
    if(current.status!=='qualified'){reject('current_route_not_qualified');continue;}
    if(request.type==='podcast'&&approved&&present(r.discovery.canonical_show_id)&&current.canonical_show_id!==r.discovery.canonical_show_id){
      reject('current_canonical_show_mismatch');continue;
    }
    const types=new Set([...r.content_types,...(r.catalogue?.memberships||[]).map(m=>m.layer_role)]);
    if(!['article','video','podcast'].includes(request.type)||
       (request.type==='article'?!['article','research','watchlist'].some(t=>types.has(t)):!types.has(request.type))){reject('resource_content_type');continue;}
    const item=e.items.find(i=>i.url===request.item_url);
    if(!item||item.publication?.precision==='unknown'){reject('dated_exact_item_required');continue;}
    let interval;
    try{interval=publicationInterval(item.publication);}catch{reject('original_publication_invalid');continue;}
    if(interval.earliest_ms>parseMediaInstant(e.checked_at)){reject('future_item_at_observation');continue;}
    const id=request.type+'-'+sourceDigest([request.type,item.url]).slice(0,24);
    const candidate={id,url:item.url,resource_id:r.resource_id,type:request.type,focus:request.focus,
      agent_skills:request.agent_skills,score:request.score,source_supported:present(item.substantive_support),route_qualified:true,
      original_publication:item.publication,evidence_refs:[...new Set([item.url,...item.evidence_refs])],title:item.title,
      source_url:e.endpoint,publisher_id:current.publisher_id,source_observation_ref:ref,source_observation_sha256:sourceDigest(e)};
    if(request.type!=='article'){
      candidate.duration_seconds=item.duration_seconds??null;
      if(request.type==='podcast')candidate.show_id=current.canonical_show_id;
    }
    candidates.push(candidate);
    const key=candidateBindingKey(candidate);
    support.set(key,item);
    bindings.set(key,{candidate_id:id,resource_id:r.resource_id,membership_ids:row.membership_ids,
      observation_resource_id:e.resource_id,source_observation_ref:ref,source_observation_sha256:candidate.source_observation_sha256,
      probe_key:row.probe_key,primary_endpoint:row.endpoint,retrieval_endpoint:e.endpoint,approved_alternate_used:alternate,
      route_approval:approved?'protected_qualified_route':'preserved_enabled_route_with_current_qualification',
      original_publication:item.publication,article_freshness:request.type==='article'?articleResearchFreshness(item.publication,plan.cutoff_at):null,
      selected_media_admission:'NOT_RUN'});
  }
  const bounded=boundResearchCandidates(candidates,{limits:policy.research_limits});
  const packetSkips=[];
  function packets(retained,type,maxPackets,maxCharacters){
    const result=[];
    for(const candidate of retained){
      const item=support.get(candidateBindingKey(candidate));
      if(!present(item?.substantive_support)){packetSkips.push({candidate_id:candidate.id,reason:'substantive_support_not_observed'});continue;}
      const packet={candidate_id:candidate.id,evidence_text:item.substantive_support,source_refs:[...new Set([candidate.url,...item.evidence_refs])]};
      if(result.length>=maxPackets||researchEvidenceCharacters([...result,packet])>maxCharacters){
        packetSkips.push({candidate_id:candidate.id,reason:type+'_deep_evidence_budget'});continue;
      }
      result.push(packet);
    }
    return result;
  }
  const limits=bounded.limits;
  const envelope={retained_articles:bounded.retained_articles,
    deep_packets:packets(bounded.retained_articles,'article',limits.article_deep_packets,limits.article_evidence_characters),
    media:Object.fromEntries(['video','podcast'].map(type=>[type,{retained_candidates:bounded.media[type],
      evidence_packets:packets(bounded.media[type],type,limits.media_evidence_packets_per_type,limits.media_evidence_characters_per_type)}])),limits};
  const errors=validateResearchEnvelope(envelope);
  requireOkay(errors.length===0,'invalid_bounded_envelope:'+errors.join(';'));
  const retained=[...envelope.retained_articles,...Object.values(envelope.media).flatMap(m=>m.retained_candidates)];
  return {schema_version:SOURCE_RESEARCH_VERSION,purpose:plan.purpose,research_cutoff_at:plan.cutoff_at,
    acquisition_mode:document.acquisition_mode,
    snapshot_sha256:sourceDigest(snapshot),plan_sha256:sourceDigest(plan),observations_sha256:sourceDigest(document),requests_sha256:sourceDigest(requests),
    result:'BOUNDED_RESEARCH_PASS',source_rollout:snapshot.source_rollout,coverage_result:coverage.coverage_result,
    coverage_gaps:bounded.coverage_gaps,rejected_requests:rejected,not_retained:bounded.not_retained,packet_skips:packetSkips,
    source_bindings:retained.map(c=>bindings.get(candidateBindingKey(c))),envelope,
    evidence_characters:{article:researchEvidenceCharacters(envelope.deep_packets),
      video:researchEvidenceCharacters(envelope.media.video.evidence_packets),podcast:researchEvidenceCharacters(envelope.media.podcast.evidence_packets)},
    future_edition_selected:false,selected_media_admission:'NOT_RUN',activation:'NOT_RUN',release:'NOT_RUN'};
}

/** Called during unfinished EDITORIAL before locking its six stories. This is
 * independent of source-rollout completeness and never edits execution state. */
export function validateSourceEditorial(context,plan,document,requests,receipt,selection,state){
  const errors=[];
  let rebuilt;
  try{rebuilt=buildSourceResearch(context,plan,document,requests);}catch(error){return [error.message];}
  if(sourceDigest(rebuilt)!==sourceDigest(receipt))errors.push('research_receipt_does_not_replay');
  if(plan.purpose!=='edition')errors.push('qualification_rehearsal_cannot_select_edition');
  if(state?.stage!=='EDITORIAL'||!['ALLOCATED','PRODUCING'].includes(state?.state)||state?.editorial_bundle?.status==='complete')errors.push('unfinished_editorial_required');
  if(state?.research_cutoff_at!==plan.cutoff_at)errors.push('frozen_state_cutoff_mismatch');
  if(!selection||Object.keys(selection).some(k=>!['selected_ids','freshness_rationales'].includes(k)))errors.push('selection_fields');
  const selected=selection?.selected_ids;
  errors.push(...validateEditorialResearch({...rebuilt.envelope,selected_ids:selected}));
  const candidates=new Map(rebuilt.envelope.retained_articles.map(c=>[c.id,c]));
  for(const id of Array.isArray(selected)?selected:[]){
    const c=candidates.get(id);if(!c)continue;
    const freshness=articleResearchFreshness(c.original_publication,plan.cutoff_at);
    if(freshness.status!=='ELIGIBLE')errors.push('selected_article_freshness:'+id+':'+freshness.reason);
    else if(freshness.band!=='priority_24h'&&!present(selection?.freshness_rationales?.[id]))errors.push('selected_article_fallback_rationale:'+id);
  }
  return [...new Set(errors)];
}
