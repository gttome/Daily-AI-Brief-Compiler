import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateResourceRegistry, resourceRegistryDigest, SOURCE_LAYERS} from './resources.mjs';
import {parseMediaInstant, publicationInterval} from '../compiler/media.mjs';

export const SOURCE_POLICY_VERSION='daily-compiler-source-discovery-policy-v1';
export const SOURCE_CADENCE_VERSION='daily-compiler-source-cadence-v1';
export const SOURCE_PLAN_VERSION='daily-compiler-source-acquisition-plan-v1';
export const SOURCE_EVIDENCE_VERSION='daily-compiler-web-metadata-extract-v1';
export const SOURCE_QUALIFICATION_VERSION='daily-compiler-source-qualifications-v1';
export const SOURCE_SNAPSHOT_VERSION='daily-compiler-qualified-source-snapshot-v1';
export const QUALIFIED_REGISTRY_VERSION='daily-compiler-resource-registry-v3';
const DAY=86400000;
const HEX64=/^[a-f0-9]{64}$/;
const text=x=>typeof x==='string'&&x.trim().length>0;
const array=x=>Array.isArray(x)?x:[];
const unique=x=>[...new Set(x)];
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const sourceDigest=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(canonical(x))).digest('hex');
export const sourceJson=x=>JSON.stringify(x,null,2)+'\n';
const assert=(condition,message)=>{if(!condition)throw new Error('source_discovery:'+message);};
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const instant=x=>{try{return parseMediaInstant(x);}catch{return null;}};
function publicUrl(value){try{const u=new URL(value);return text(value)&&value===value.trim()&&u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1','::1'].includes(u.hostname);}catch{return false;}}
const sameArray=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const memberIds=r=>array(r.catalogue?.memberships).map(m=>m.planning_row_id);
const allTypes=r=>unique([...array(r.content_types),...array(r.catalogue?.memberships).map(m=>m.layer_role)]);

export function validateSourcePolicy(policy={}){
  const errors=[];
  if(policy.schema_version!==SOURCE_POLICY_VERSION||policy.cadence_version!==SOURCE_CADENCE_VERSION||!validDate(policy.epoch_date)||policy.timezone!=='America/Chicago')errors.push('policy_version');
  if(policy.cadence?.tier_1_period_editions!==1||policy.cadence?.tier_2_period_editions!==3||policy.cadence?.tier_3_period_editions!==7||policy.cadence?.preserve_enabled_primary_as_tier_1!==true)errors.push('cadence');
  const a=policy.acquisition;
  if(a?.method!=='chatgpt_web_open'||a.parser_version!==SOURCE_EVIDENCE_VERSION||a.primary_probes_per_due_endpoint!==1||a.approved_alternates_after_failure!==1)errors.push('acquisition_method');
  for(const [key,max] of [['max_concurrency',4],['max_response_bytes',131072],['max_items_per_response',50]])if(!Number.isSafeInteger(a?.[key])||a[key]<1||a[key]>max)errors.push(key);
  const caps={retained_articles:20,article_deep_packets:9,article_evidence_characters:12000,media_retained_per_type:12,media_evidence_packets_per_type:6,media_evidence_characters_per_type:6000};
  for(const [key,max] of Object.entries(caps))if(!Number.isSafeInteger(policy.research_limits?.[key])||policy.research_limits[key]<1||policy.research_limits[key]>max)errors.push('research_limit:'+key);
  if(policy.source_scores!==null||policy.active_registry_mutation_from_observations!==false||a?.qualification_never_grants_selected_item_admission!==true)errors.push('authority');
  return errors;
}

export function sourceCadence(resource){
  const roles=array(resource.catalogue?.memberships).map(m=>m.recommended_role);
  const mandatory=roles.some(r=>r==='Required-topic source');
  const always=roles.some(r=>/Tier 1|Always check|Daily|Active preflight/.test(r));
  const regular=roles.some(r=>/Tier 2|^Core$/.test(r));
  const tier=mandatory||always||(resource.enabled&&resource.priority==='primary')?1:regular||resource.priority==='secondary'?2:3;
  const period={1:1,2:3,3:7}[tier];
  return {schema_version:SOURCE_CADENCE_VERSION,tier,period_editions:period,
    slot:parseInt(sourceDigest(resource.resource_id).slice(0,8),16)%period,
    reason:mandatory?'mandatory_topic':always?'directory_always_check':resource.enabled&&resource.priority==='primary'?'preserved_enabled_primary':regular?'directory_regular':resource.priority==='secondary'?'preserved_secondary':'weekly_rotation_or_topic'};
}

export function buildSourcePlan(registry,policy,{reference_date,cutoff_at,topic_resource_ids=[],max_probes=null,purpose='edition',approved_alternates_by_resource_id={}}={}){
  assert(validateResourceRegistry(registry).length===0,'invalid_registry');
  assert(validateSourcePolicy(policy).length===0,'invalid_policy');
  assert(validDate(reference_date)&&instant(cutoff_at)!==null,'reference_date_or_cutoff');
  assert(['edition','qualification_rehearsal'].includes(purpose),'purpose');
  const ids=new Set(registry.resources.map(r=>r.resource_id));
  assert(Array.isArray(topic_resource_ids)&&topic_resource_ids.every(id=>ids.has(id)),'unknown_topic_resource');
  const day=Math.round((Date.parse(reference_date+'T00:00:00Z')-Date.parse(policy.epoch_date+'T00:00:00Z'))/DAY);
  const groups=new Map();
  const rows=registry.resources.map(r=>{
    const cadence=sourceCadence(r),topic=topic_resource_ids.includes(r.resource_id);
    const mod=((day%cadence.period_editions)+cadence.period_editions)%cadence.period_editions;
    const due=cadence.tier===1||topic||mod===cadence.slot;
    const daysUntil=(cadence.slot-mod+cadence.period_editions)%cadence.period_editions;
    const nextDays=due?(cadence.tier===1?1:((cadence.slot-mod+cadence.period_editions)%cadence.period_editions||cadence.period_editions)):daysUntil;
    const q=r.discovery;
    const eligible=r.enabled===true&&q?.unattended_eligible===true&&q?.qualification_status==='qualified';
    const endpoint=eligible?q.endpoint:r.endpoint||r.url;
    assert(publicUrl(endpoint),'invalid_endpoint:'+r.resource_id);
    // Unverified names cannot establish equivalence. Distinct endpoints stay distinct.
    const identity=eligible?q.publisher_id:'unverified:'+r.resource_id;
    const key=sourceDigest([endpoint,identity,cutoff_at]);
    const row={resource_id:r.resource_id,membership_ids:memberIds(r),content_types:allTypes(r),
      cadence,due,due_reason:topic?'topic_acceleration':due?cadence.reason:'rotation_not_due',
      last_checked_at:q?.checked_at??r.health.last_checked_at??null,
      next_due_date:new Date(Date.parse(reference_date+'T00:00:00Z')+nextDays*DAY).toISOString().slice(0,10),
      endpoint,identity_key:identity,probe_key:due?key:null,unattended_eligible:eligible,
      qualification_status:q?.qualification_status??'pending'};
    if(due){
      const alternatives=array(approved_alternates_by_resource_id[r.resource_id]??q?.approved_alternates);
      assert(alternatives.length<=1&&alternatives.every(a=>publicUrl(a.endpoint)&&text(a.evidence_ref)&&a.endpoint!==endpoint),'alternate_approval');
      if(!groups.has(key))groups.set(key,{probe_key:key,endpoint,identity_key:identity,cutoff_at,
        resource_ids:[],membership_ids:[],content_types:[],approved_alternates:alternatives});
      const group=groups.get(key);
      assert(JSON.stringify(group.approved_alternates)===JSON.stringify(alternatives),'ambiguous_alternates');
      group.resource_ids.push(r.resource_id);group.membership_ids.push(...memberIds(r));group.content_types=unique([...group.content_types,...allTypes(r)]);
    }
    return row;
  });
  const due=[...groups.values()];
  const required=due.length+due.reduce((n,g)=>n+g.approved_alternates.length,0);
  const budget=max_probes===null?required:max_probes;
  assert(Number.isSafeInteger(budget)&&budget>=0,'probe_budget');
  const dueMemberships=rows.filter(r=>r.due).flatMap(r=>r.membership_ids).length;
  return {schema_version:SOURCE_PLAN_VERSION,purpose,reference_date,cutoff_at,topic_resource_ids:unique(topic_resource_ids).sort(),
    registry_sha256:resourceRegistryDigest(registry),policy_sha256:sourceDigest(sourceJson(policy)),
    cadence_version:SOURCE_CADENCE_VERSION,catalogue_memberships:rows.flatMap(r=>r.membership_ids).length,
    resource_count:rows.length,due_resource_count:rows.filter(r=>r.due).length,due_membership_count:dueMemberships,
    unique_due_endpoints:due.length,duplicate_membership_probes_avoided:dueMemberships-due.filter(g=>g.membership_ids.length).length,
    required_probe_budget:required,budget:{max_probes:budget,max_response_bytes:policy.acquisition.max_response_bytes,
      max_total_response_bytes:budget*policy.acquisition.max_response_bytes,max_concurrency:policy.acquisition.max_concurrency,
      max_items_per_response:policy.acquisition.max_items_per_response},
    budget_conflict:budget<required?{code:'DUE_PORTFOLIO_EXCEEDS_BUDGET',required,available:budget,
      resolution:'Raise the finite budget or make an explicitly approved cadence revision; due sources remain due.'}:null,
    rows,probes:due};
}

export function validateSourcePlan(plan={}){
  const errors=[];
  if(plan.schema_version!==SOURCE_PLAN_VERSION||!validDate(plan.reference_date)||instant(plan.cutoff_at)===null||
    !HEX64.test(plan.registry_sha256||'')||!HEX64.test(plan.policy_sha256||'')||plan.cadence_version!==SOURCE_CADENCE_VERSION)errors.push('plan_binding');
  const rows=array(plan.rows),groups=array(plan.probes),budget=plan.budget||{};
  if(!Array.isArray(plan.rows)||!Array.isArray(plan.probes)||new Set(rows.map(r=>r.resource_id)).size!==rows.length||
    rows.length!==plan.resource_count||rows.filter(r=>r.due).length!==plan.due_resource_count||
    rows.flatMap(r=>array(r.membership_ids)).length!==plan.catalogue_memberships||groups.length!==plan.unique_due_endpoints)errors.push('plan_scope');
  for(const [key,max] of [['max_concurrency',4],['max_response_bytes',131072],['max_items_per_response',50]])
    if(!Number.isSafeInteger(budget[key])||budget[key]<1||budget[key]>max)errors.push('plan_limit:'+key);
  if(!Number.isSafeInteger(budget.max_probes)||budget.max_probes<0||budget.max_total_response_bytes!==budget.max_probes*budget.max_response_bytes)errors.push('plan_budget');
  const required=groups.length+groups.reduce((n,g)=>n+array(g.approved_alternates).length,0);
  if(plan.required_probe_budget!==required||(budget.max_probes<required)!==!!plan.budget_conflict)errors.push('plan_budget_conflict');
  const groupIds=new Set();
  for(const g of groups){
    if(!publicUrl(g.endpoint)||!text(g.identity_key)||g.cutoff_at!==plan.cutoff_at||g.probe_key!==sourceDigest([g.endpoint,g.identity_key,g.cutoff_at])||groupIds.has(g.probe_key))errors.push('plan_probe_binding');
    groupIds.add(g.probe_key);
    const matches=rows.filter(r=>r.due&&r.probe_key===g.probe_key);
    if(!matches.length||!sameArray(matches.map(r=>r.resource_id),array(g.resource_ids))||
       !sameArray(matches.flatMap(r=>r.membership_ids),array(g.membership_ids))||
       matches.some(r=>r.endpoint!==g.endpoint||r.identity_key!==g.identity_key))errors.push('plan_probe_scope');
    if(!Array.isArray(g.approved_alternates)||g.approved_alternates.length>1||g.approved_alternates.some(a=>!publicUrl(a.endpoint)||!text(a.evidence_ref)||a.endpoint===g.endpoint))errors.push('plan_alternate_approval');
  }
  if(rows.some(r=>typeof r.due!=='boolean'||!Array.isArray(r.membership_ids)||(r.due&&!groupIds.has(r.probe_key))||(!r.due&&r.probe_key!==null)))errors.push('plan_due_scope');
  return unique(errors);
}

export function validateBoundSourcePlan(registry,policy,plan){
  try{
    const expected=buildSourcePlan(registry,policy,{reference_date:plan.reference_date,cutoff_at:plan.cutoff_at,
      topic_resource_ids:plan.topic_resource_ids,max_probes:plan.budget.max_probes,purpose:plan.purpose});
    return sourceDigest(expected)===sourceDigest(plan)?[]:['plan_does_not_match_approved_snapshot'];
  }catch(error){return [error.message];}
}

export function validateWebExtraction(evidence={}, {endpoint=null,maxBytes=131072,maxItems=50}={}){
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))return ['extraction_shape'];
  const errors=[];
  if(evidence.schema_version!==SOURCE_EVIDENCE_VERSION||evidence.method!=='chatgpt_web_open')errors.push('extraction_method');
  if(!publicUrl(evidence.endpoint)||(endpoint!==null&&evidence.endpoint!==endpoint)||instant(evidence.checked_at)===null)errors.push('route_or_check_time');
  if(!text(evidence.resource_id)||!HEX64.test(evidence.raw_response_sha256||'')||(evidence.retrieval?.status==='healthy'&&!text(evidence.source_ref)))errors.push('retrieval_provenance');
  if(!Number.isSafeInteger(evidence.returned_response_bytes)||evidence.returned_response_bytes<0||evidence.returned_response_bytes>maxBytes||Buffer.byteLength(JSON.stringify(evidence))>maxBytes)errors.push('response_limit');
  if(evidence.duration_ms!==null&&(!Number.isSafeInteger(evidence.duration_ms)||evidence.duration_ms<0))errors.push('duration');
  const status=evidence.retrieval?.status;
  if(!['healthy','access_blocked','parse_error','identity_unverified','unavailable'].includes(status))errors.push('retrieval_status');
  const http=evidence.retrieval?.http_status;
  if(http!==null&&(!Number.isInteger(http)||http<100||http>599))errors.push('http_status');
  if(status==='healthy'&&(http!==null&&(http<200||http>=300)))errors.push('false_healthy');
  if(status!=='healthy'&&!text(evidence.retrieval?.reason))errors.push('limitation_reason');
  if(!Array.isArray(evidence.items)||evidence.items.length>maxItems)errors.push('item_limit');
  if(!Array.isArray(evidence.limitations)||!evidence.limitations.every(text))errors.push('limitations');
  const seen=new Set();
  for(const item of array(evidence.items)){
    if(!item||typeof item!=='object'||Array.isArray(item)){errors.push('item_shape');continue;}
    if(!text(item.title)||(!publicUrl(item.url)&&item.url!==null)||(!text(item.link_locator)&&item.url===null))errors.push('item_identity');
    if(item.url&&seen.has(item.url))errors.push('duplicate_item');seen.add(item.url);
    const p=item.publication;
    if(p?.precision==='unknown'){if(p.original_value!==null||p.timezone!==null)errors.push('unknown_publication');}
    else{try{publicationInterval(p);}catch{errors.push('publication_precision');}}
    if(item.duration_seconds!==null&&(!Number.isSafeInteger(item.duration_seconds)||item.duration_seconds<=0))errors.push('item_runtime');
    if(item.substantive_support!==null&&!text(item.substantive_support))errors.push('support');
    if(!Array.isArray(item.evidence_refs)||!item.evidence_refs.every(text))errors.push('item_evidence_refs');
  }
  if(status!=='healthy'&&array(evidence.items).length)errors.push('failure_is_not_yield');
  if(status==='healthy'&&evidence.publisher_identity?.status!=='verified')errors.push('identity_unverified');
  return unique(errors);
}

export function assessRouteQualification(resource,evidence,{evidence_ref,policy}={}){
  const errors=validateWebExtraction(evidence,{endpoint:evidence?.endpoint,maxBytes:policy.acquisition.max_response_bytes,maxItems:policy.acquisition.max_items_per_response});
  // This rollout qualifies the exact registered catalogue URL. An alternate may
  // be monitored after failure, but cannot authorize itself as a new primary.
  const authorizedEndpoints=[resource.url];
  if(!authorizedEndpoints.includes(evidence?.endpoint))errors.push('unapproved_runtime_endpoint');
  const directItem=array(resource.catalogue?.memberships).some(m=>m.recommended_role==='Required-topic source')&&evidence?.resource_route_kind==='exact_item';
  const samples=array(evidence?.items).filter(item=>publicUrl(item?.url)&&(item.url!==evidence.endpoint||directItem)&&item.publication?.precision!=='unknown'&&text(item.substantive_support)&&array(item.evidence_refs).length>0);
  const identity=evidence?.publisher_identity;
  const identityOkay=identity?.status==='verified'&&text(identity.canonical_id)&&text(identity.evidence_basis);
  const check=instant(evidence?.checked_at);
  const nonfuture=samples.filter(item=>{try{return publicationInterval(item.publication).earliest_ms<=check;}catch{return false;}});
  const okay=errors.length===0&&evidence.resource_id===resource.resource_id&&identityOkay&&evidence.retrieval.status==='healthy'&&nonfuture.length>0&&text(evidence_ref);
  const reason=okay?null:errors.length?'Invalid extraction: '+errors.join(', '):evidence?.retrieval?.status!=='healthy'?evidence?.retrieval?.reason:'A verified publisher route and a permanent, dated, substantively supported sample item are required.';
  return {resource_id:resource.resource_id,membership_ids:memberIds(resource),qualification_scope:'metadata_discovery_only',
    status:okay?'qualified':evidence?.retrieval?.status==='access_blocked'?'blocked':'pending',
    checked_at:evidence?.checked_at??null,endpoint:evidence?.endpoint??null,method:evidence?.method??null,
    parser_version:SOURCE_EVIDENCE_VERSION,publisher_id:okay?identity.canonical_id:null,
    canonical_show_id:okay&&allTypes(resource).includes('podcast')?(identity.canonical_show_id??identity.canonical_id):null,
    unattended_eligible:okay,evidence_ref,evidence_sha256:sourceDigest(evidence),
    sample_item_urls:okay?nonfuture.map(x=>x.url):[],limitations:unique([...array(evidence?.limitations),...(reason?[reason]:[])]),
    approved_alternates:array(evidence?.approved_alternates),source_score:null};
}

export function makeQualificationPortfolio(registry,policy,observations,{recorded_at,evidence_path}={}){
  assert(instant(recorded_at)!==null&&text(evidence_path),'qualification_recording');
  const byId=new Map();
  for(const observation of observations){assert(!byId.has(observation.resource_id),'duplicate_source_observation');byId.set(observation.resource_id,observation);}
  assert([...byId.keys()].every(id=>registry.resources.some(r=>r.resource_id===id)),'unknown_observed_resource');
  const records=registry.resources.map(r=>byId.has(r.resource_id)?assessRouteQualification(r,byId.get(r.resource_id),{policy,evidence_ref:evidence_path+'#'+r.resource_id}):{
    resource_id:r.resource_id,membership_ids:memberIds(r),qualification_scope:'metadata_discovery_only',status:'pending',checked_at:null,
    endpoint:null,method:null,parser_version:SOURCE_EVIDENCE_VERSION,publisher_id:null,canonical_show_id:null,unattended_eligible:false,
    evidence_ref:null,evidence_sha256:null,sample_item_urls:[],limitations:['Not due in this qualification rehearsal; no current route qualification claimed.'],approved_alternates:[],source_score:null});
  return {schema_version:SOURCE_QUALIFICATION_VERSION,recorded_at,catalogue_input_digest:registry.source_portfolio.input_digest,
    historical_directory_date:'2026-09-19',qualification_time_is_not_historical_verification:true,
    qualification_scope:'metadata_discovery_only',source_rollout:records.every(r=>r.status==='qualified')?'SOURCE_ROLLOUT_COMPLETE':'SOURCE_ROLLOUT_PARTIAL',
    resource_count:records.length,membership_count:records.flatMap(r=>r.membership_ids).length,
    qualified_resources:records.filter(r=>r.status==='qualified').length,records};
}

export function applySourceQualifications(registry,policy,qualifications){
  assert(validateResourceRegistry(registry).length===0&&validateSourcePolicy(policy).length===0,'invalid_source_inputs');
  assert(qualifications.schema_version===SOURCE_QUALIFICATION_VERSION&&qualifications.catalogue_input_digest===registry.source_portfolio.input_digest,'qualification_binding');
  assert(sameArray(qualifications.records.map(r=>r.resource_id),registry.resources.map(r=>r.resource_id)),'qualification_scope');
  const next=structuredClone(registry),byId=new Map(qualifications.records.map(r=>[r.resource_id,r]));
  next.schema_version=QUALIFIED_REGISTRY_VERSION;
  next.updated_at=qualifications.recorded_at;
  next.source_discovery={schema_version:SOURCE_SNAPSHOT_VERSION,policy_path:'config/source-discovery-policy.json',
    policy_sha256:sourceDigest(sourceJson(policy)),qualifications_path:'config/source-route-qualifications.json',
    qualifications_sha256:sourceDigest(sourceJson(qualifications)),snapshot_path:'config/source-snapshot.json'};
  for(const r of next.resources){
    const q=byId.get(r.resource_id);
    assert(sameArray(q.membership_ids,memberIds(r)),'qualification_memberships');
    r.discovery={qualification_status:q.status,qualification_sha256:sourceDigest(q),checked_at:q.checked_at,
      endpoint:q.unattended_eligible?q.endpoint:null,publisher_id:q.publisher_id,canonical_show_id:q.canonical_show_id,
      unattended_eligible:q.unattended_eligible,approved_alternates:q.approved_alternates};
    if(q.status==='qualified'){
      assert(q.unattended_eligible===true&&publicUrl(q.endpoint)&&text(q.publisher_id)&&HEX64.test(q.evidence_sha256||'')&&q.sample_item_urls.length>0,'unproven_qualification');
      r.enabled=true;r.endpoint=q.endpoint;r.search_mode='page';
      // Import provenance is immutable. This is the separate current route grant.
      if(!r.publisher)r.publisher=q.publisher_id;
    }
  }
  assert(validateResourceRegistry(next).length===0,'qualified_registry_invalid');
  return next;
}

export function makeSourceSnapshot(registry,policy,qualifications,{recorded_at}={}){
  return {schema_version:SOURCE_SNAPSHOT_VERSION,recorded_at,registry_path:'config/resource-registry.json',registry_sha256:resourceRegistryDigest(registry),
    policy_path:'config/source-discovery-policy.json',policy_sha256:sourceDigest(sourceJson(policy)),
    qualifications_path:'config/source-route-qualifications.json',qualifications_sha256:sourceDigest(sourceJson(qualifications)),
    cadence_version:SOURCE_CADENCE_VERSION,source_rollout:qualifications.source_rollout,
    resource_count:registry.resources.length,membership_count:registry.resources.flatMap(memberIds).length,
    qualified_resources:qualifications.qualified_resources,selected_item_qualification:false,
    approval_scope:'Bounded Iteration 5 protected source implementation and normal merge; image activation, schedules and edition launch excluded.'};
}

export function validateSourceSnapshot(registry,policy,qualifications,snapshot,observations){
  const errors=[...validateResourceRegistry(registry),...validateSourcePolicy(policy)];
  if(snapshot?.schema_version!==SOURCE_SNAPSHOT_VERSION||snapshot.registry_sha256!==resourceRegistryDigest(registry)||
     snapshot.policy_sha256!==sourceDigest(sourceJson(policy))||snapshot.qualifications_sha256!==sourceDigest(sourceJson(qualifications))||
     snapshot.cadence_version!==SOURCE_CADENCE_VERSION||snapshot.resource_count!==registry.resources.length||
     snapshot.membership_count!==registry.resources.flatMap(memberIds).length)errors.push('snapshot_binding');
  if(registry.source_discovery?.policy_sha256!==snapshot.policy_sha256||registry.source_discovery?.qualifications_sha256!==snapshot.qualifications_sha256)errors.push('registry_snapshot_binding');
  if(qualifications.schema_version!==SOURCE_QUALIFICATION_VERSION||qualifications.catalogue_input_digest!==registry.source_portfolio?.input_digest||
     !sameArray(array(qualifications.records).map(r=>r.resource_id),registry.resources.map(r=>r.resource_id)))errors.push('qualification_scope');
  const evidence=new Map(array(observations).map(o=>[o.resource_id,o]));
  const quals=new Map(array(qualifications.records).map(q=>[q.resource_id,q]));
  for(const r of registry.resources){
    const q=quals.get(r.resource_id),d=r.discovery;
    if(!q||!d||d.qualification_sha256!==sourceDigest(q)||d.qualification_status!==q.status||d.unattended_eligible!==q.unattended_eligible||d.checked_at!==q.checked_at||
       !sameArray(array(q.membership_ids),memberIds(r)))errors.push('resource_qualification_binding:'+r.resource_id);
    if(q?.checked_at!==null){
      const e=evidence.get(r.resource_id);
      if(!e||q.evidence_sha256!==sourceDigest(e)||sourceDigest(assessRouteQualification(r,e,{policy,evidence_ref:q.evidence_ref}))!==sourceDigest(q))errors.push('qualification_evidence_binding:'+r.resource_id);
    }
    if(q?.status==='qualified'&&(!r.enabled||r.endpoint!==q.endpoint||d.endpoint!==q.endpoint||d.publisher_id!==q.publisher_id||d.canonical_show_id!==q.canonical_show_id))errors.push('qualified_route_binding:'+r.resource_id);
  }
  const count=array(qualifications.records).filter(q=>q.status==='qualified').length;
  if(count!==qualifications.qualified_resources||snapshot.qualified_resources!==count||qualifications.membership_count!==204||snapshot.membership_count!==204)errors.push('qualification_counts');
  const rollout=count===registry.resources.length?'SOURCE_ROLLOUT_COMPLETE':'SOURCE_ROLLOUT_PARTIAL';
  if(qualifications.source_rollout!==rollout||snapshot.source_rollout!==rollout)errors.push('false_rollout');
  if(snapshot.selected_item_qualification!==false||qualifications.qualification_scope!=='metadata_discovery_only'||
     array(qualifications.records).some(q=>q.qualification_scope!=='metadata_discovery_only'||q.source_score!==null))errors.push('qualification_authority');
  if(new Set(array(observations).map(o=>o.resource_id)).size!==array(observations).length)errors.push('duplicate_source_evidence');
  return unique(errors);
}

export function replaySourcePlan(plan,observations){
  assert(validateSourcePlan(plan).length===0,'invalid_plan:'+validateSourcePlan(plan).join(';'));
  const byId=new Map();
  for(const o of observations){assert(plan.rows.some(r=>r.resource_id===o.resource_id),'unknown_replay_resource');assert(!byId.has(o.resource_id),'duplicate_replay_evidence');byId.set(o.resource_id,o);}
  const results=new Map();let probes=0,primaryProbes=0,bytes=0;
  for(const group of plan.probes){
    if(probes>=plan.budget.max_probes){results.set(group.probe_key,{coverage:'budget_skipped',retrieval:'not_checked',reason:'finite_probe_budget_exhausted',evidence:null});continue;}
    const members=group.resource_ids.map(id=>byId.get(id)).filter(Boolean);
    if(!members.length){results.set(group.probe_key,{coverage:'pending',retrieval:'not_checked',reason:'saved_current_probe_evidence_missing',evidence:null});continue;}
    let evidence=members[0];
    assert(members.every(e=>e.endpoint===evidence.endpoint&&e.raw_response_sha256===evidence.raw_response_sha256),'conflicting_shared_response');
    let errors=validateWebExtraction(evidence,{endpoint:group.endpoint,maxBytes:plan.budget.max_response_bytes,maxItems:plan.budget.max_items_per_response});
    if(!group.identity_key.startsWith('unverified:')&&evidence.retrieval?.status==='healthy'&&evidence.publisher_identity?.canonical_id!==group.identity_key)errors.push('probe_publisher_identity');
    probes++;primaryProbes++;bytes+=Math.min(evidence.returned_response_bytes||0,plan.budget.max_response_bytes);
    if((errors.length||evidence.retrieval.status!=='healthy')&&evidence.alternate_attempt){
      const alternate=evidence.alternate_attempt;
      assert(group.approved_alternates.some(a=>a.endpoint===alternate.endpoint),'unapproved_replay_alternate');
      if(probes<plan.budget.max_probes){
        assert(group.resource_ids.includes(alternate.resource_id),'alternate_resource_identity');
        evidence=alternate;probes++;bytes+=Math.min(evidence.returned_response_bytes||0,plan.budget.max_response_bytes);
        errors=validateWebExtraction(evidence,{endpoint:alternate.endpoint,maxBytes:plan.budget.max_response_bytes,maxItems:plan.budget.max_items_per_response});
        if(!group.identity_key.startsWith('unverified:')&&evidence.retrieval?.status==='healthy'&&evidence.publisher_identity?.canonical_id!==group.identity_key)errors.push('probe_publisher_identity');
      }
    }else assert(!evidence.alternate_attempt,'alternate_after_success');
    results.set(group.probe_key,{coverage:'checked',retrieval:errors.length?'parse_error':evidence.retrieval.status,
      reason:errors.length?errors.join(';'):evidence.retrieval.reason,evidence,validation_errors:errors});
  }
  const rows=plan.rows.map(row=>{
    const r=row.due?results.get(row.probe_key):{coverage:'not_due',retrieval:'not_checked',reason:'rotation_not_due',evidence:null};
    const healthy=r.retrieval==='healthy';
    return {...row,coverage_status:r.coverage,retrieval_status:r.retrieval,limitation:r.reason,
      checked_at:r.evidence?.checked_at??null,actual_retrieval_endpoint:r.evidence?.endpoint??null,duration_ms:r.evidence?.duration_ms??null,
      metadata_items_observed:healthy?r.evidence.items.length:null,
      editorial_yield_status:healthy?(r.evidence.items.length?'metadata_candidates':'empty'):'not_assessed',
      fresh_items:null,selected_items:null,evidence_sha256:r.evidence?sourceDigest(r.evidence):null,
      source_ref:r.evidence?.source_ref??null};
  });
  const due=rows.filter(r=>r.due),uncompleted=due.filter(r=>r.coverage_status!=='checked');
  const checked=due.filter(r=>r.coverage_status==='checked');
  return {schema_version:'daily-compiler-source-coverage-v1',evidence_mode:'saved_current_observations_replay',
    plan_sha256:sourceDigest(plan),registry_sha256:plan.registry_sha256,policy_sha256:plan.policy_sha256,
    cutoff_at:plan.cutoff_at,reference_date:plan.reference_date,source_rollout:plan.rows.every(r=>r.unattended_eligible)?'SOURCE_ROLLOUT_COMPLETE':'SOURCE_ROLLOUT_PARTIAL',
    coverage_result:uncompleted.length?'INCOMPLETE_DUE_PLAN':'COMPLETE_DUE_PLAN',
    catalogue_memberships:plan.catalogue_memberships,resource_count:rows.length,
    due_resources:due.length,checked_resources:checked.length,unique_primary_probes:primaryProbes,alternate_probes:probes-primaryProbes,actual_metadata_probes:probes,
    returned_response_bytes:bytes,upstream_http_bytes:null,healthy_resources:checked.filter(r=>r.retrieval_status==='healthy').length,
    uncompleted_resource_ids:uncompleted.map(r=>r.resource_id),budget_conflict:plan.budget_conflict,
    selected_items_qualified:false,future_edition_selected:false,rows};
}

// This binds a response to its actual acquisition scope. It is a consistency
// record, not a signature from the publisher or proof of network freshness.
export function bindSourceObservation(plan,evidence,{mode='live_plan_capture'}={}){
  assert(validateSourcePlan(plan).length===0,'invalid_binding_plan');
  assert(['live_plan_capture','saved_evidence_replay'].includes(mode),'acquisition_binding_mode');
  const group=plan.probes.find(g=>g.resource_ids.includes(evidence?.resource_id));
  assert(group&&(evidence.endpoint===group.endpoint||group.approved_alternates.some(a=>a.endpoint===evidence.endpoint)),'acquisition_binding_scope');
  const result=structuredClone(evidence);
  result.acquisition_binding={plan_sha256:sourceDigest(plan),probe_key:group.probe_key,cutoff_at:plan.cutoff_at,mode};
  if(result.alternate_attempt)result.alternate_attempt=bindSourceObservation(plan,result.alternate_attempt,{mode});
  return result;
}

// Callback is supplied by the existing semantic environment. This module adds no
// browser, scheduler, account, polling loop or network service.
export async function executeSourcePlan(plan,probe,{mode='live_plan_capture'}={}){
  assert(validateSourcePlan(plan).length===0&&typeof probe==='function','plan_or_probe');
  assert(['live_plan_capture','saved_evidence_replay'].includes(mode),'acquisition_binding_mode');
  const responses=[],attempts=[];let used=0;
  for(const group of plan.probes){
    if(used>=plan.budget.max_probes)break;
    const routes=[{endpoint:group.endpoint},...group.approved_alternates];
    for(let index=0;index<routes.length&&used<plan.budget.max_probes;index++){
      used++;
      const request={...group,endpoint:routes[index].endpoint,attempt:index+1,max_response_bytes:plan.budget.max_response_bytes};
      let evidence;
      try{evidence=await probe(request);}catch(error){attempts.push({probe_key:group.probe_key,endpoint:request.endpoint,attempt:index+1,outcome:'unavailable',reason:String(error.message||error)});continue;}
      const errors=validateWebExtraction(evidence,{endpoint:request.endpoint,maxBytes:plan.budget.max_response_bytes,maxItems:plan.budget.max_items_per_response});
      if(!group.resource_ids.includes(evidence?.resource_id))errors.push('probe_resource_identity');
      if(!group.identity_key.startsWith('unverified:')&&evidence?.retrieval?.status==='healthy'&&evidence.publisher_identity?.canonical_id!==group.identity_key)errors.push('probe_publisher_identity');
      attempts.push({probe_key:group.probe_key,endpoint:request.endpoint,attempt:index+1,outcome:errors.length?'parse_error':evidence.retrieval.status,errors});
      responses.push(errors.length===0?bindSourceObservation(plan,evidence,{mode}):evidence);
      if(errors.length===0&&evidence.retrieval.status==='healthy')break;
    }
  }
  return {schema_version:'daily-compiler-source-acquisition-execution-v1',plan_sha256:sourceDigest(plan),attempts,responses,
    actual_probe_count:used,max_concurrency_used:1,finite_budget_exhausted:used===plan.budget.max_probes};
}

export function readSourceSnapshot(repoRoot='.'){
  const read=file=>JSON.parse(fs.readFileSync(path.join(repoRoot,file),'utf8'));
  const registry=read('config/resource-registry.json'),policy=read('config/source-discovery-policy.json'),qualifications=read('config/source-route-qualifications.json'),snapshot=read('config/source-snapshot.json');
  assert(Array.isArray(qualifications.records)&&Array.isArray(registry.resources),'source_evidence_inputs');
  const root=fs.realpathSync(repoRoot),known=new Set(registry.resources.map(r=>r.resource_id)),selected=new Map(),documents=new Map();
  for(const q of qualifications.records){
    assert(text(q.resource_id)&&known.has(q.resource_id)&&!selected.has(q.resource_id),'duplicate_or_unknown_source_qualification');
    selected.set(q.resource_id,null);
    if(q.checked_at===null){
      assert(q.evidence_ref===null&&q.evidence_sha256===null,'unobserved_source_evidence_binding');
      continue;
    }
    const ref=typeof q.evidence_ref==='string'?q.evidence_ref.split('#'):[];
    assert(ref.length===2&&ref[1]===q.resource_id,'source_evidence_reference:'+q.resource_id);
    const relative=ref[0];
    assert(relative.length>0&&!path.isAbsolute(relative)&&!/[\\\s?:]/.test(relative)&&!relative.split('/').some(part=>!part||part==='.'||part==='..'),'unsafe_evidence_path');
    if(!documents.has(relative)){
      const supplied=path.resolve(root,relative);
      assert(fs.existsSync(supplied),'source_evidence_document_missing:'+relative);
      const full=fs.realpathSync(supplied),within=path.relative(root,full);
      assert(within!==''&&within!=='..'&&!within.startsWith('..'+path.sep)&&!path.isAbsolute(within)&&fs.statSync(full).isFile(),'unsafe_evidence_path');
      const document=JSON.parse(fs.readFileSync(full,'utf8'));
      assert(Array.isArray(document.observations),'source_evidence_document_shape:'+relative);
      const byId=new Map();
      for(const observation of document.observations){
        assert(observation&&text(observation.resource_id)&&known.has(observation.resource_id),'source_evidence_document_resource:'+relative);
        assert(!byId.has(observation.resource_id),'duplicate_source_document_evidence:'+relative);
        byId.set(observation.resource_id,observation);
      }
      documents.set(relative,{rows:document.observations,byId});
    }
    const evidence=documents.get(relative).byId.get(q.resource_id);
    assert(evidence,'source_evidence_record_missing:'+q.resource_id);
    assert(sourceDigest(evidence)===q.evidence_sha256,'source_evidence_record_digest:'+q.resource_id);
    selected.set(q.resource_id,relative);
  }
  // Preserve older evidence documents verbatim. A qualification names its exact
  // document and resource; an older observation of that resource in another
  // retained document cannot replace or conflict with that explicit selection.
  // Single-document snapshots retain their original observation ordering.
  const observations=[...documents].flatMap(([relative,document])=>document.rows.filter(row=>selected.get(row.resource_id)===relative));
  const errors=validateSourceSnapshot(registry,policy,qualifications,snapshot,observations);
  assert(!errors.length,errors.join(';'));
  return {registry,policy,qualifications,snapshot,observations};
}
