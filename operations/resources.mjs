import {createHash} from 'node:crypto';

export const RESOURCE_REGISTRY_SCHEMA='daily-compiler-resource-registry-v2';
export const LEGACY_RESOURCE_REGISTRY_SCHEMA='daily-compiler-resource-registry-v1';
export const RESOURCE_OBSERVATION_SCHEMA='daily-compiler-resource-observation-v1';

export function validateResourceRegistry(registry={}){
  const errors=[];
  if(![RESOURCE_REGISTRY_SCHEMA,LEGACY_RESOURCE_REGISTRY_SCHEMA].includes(registry.schema_version)) errors.push('resource_registry_schema');
  if(!Array.isArray(registry.resources)) errors.push('resources_array');
  const ids=new Set();
  for(const r of Array.isArray(registry.resources)?registry.resources:[]){
    if(!r?.resource_id||ids.has(r.resource_id)) errors.push('resource_id');
    ids.add(r?.resource_id);
    if(!r?.name||!r?.url||typeof r.enabled!=='boolean'||!Array.isArray(r.content_types)||!r.content_types.length) errors.push('resource_identity');
    if(!['primary','secondary','fallback','experimental'].includes(r?.priority)) errors.push('resource_priority');
    if(!['targeted','site_search','feed','page','manual_endpoint'].includes(r?.search_mode)) errors.push('resource_search_mode');
    if(!['healthy','degraded','failing','unknown'].includes(r?.health?.status)) errors.push('resource_health');
  }
  if(registry.schema_version===RESOURCE_REGISTRY_SCHEMA) errors.push(...validateSourcePortfolioRegistry(registry));
  else if(registry.source_portfolio||(registry.resources||[]).some?.(r=>r?.catalogue)) errors.push('resource_registry_catalogue_requires_v2');
  return [...new Set(errors)];
}

export function validateResourceObservation(o={}){
  const errors=[];
  if(o.schema_version!==RESOURCE_OBSERVATION_SCHEMA) errors.push('resource_observation_schema');
  for(const k of ['edition_date','execution_id','resource_id','checked_at']) if(!o[k]) errors.push('resource_observation_'+k);
  if(!['article','video','podcast','watchlist','research'].includes(o.content_type)) errors.push('resource_observation_type');
  for(const k of ['queries','candidates_found','usable_candidates','selected_items','fresh_items','duration_ms']){
    if(!Number.isInteger(o[k])||o[k]<0) errors.push('resource_observation_'+k);
  }
  if(!Array.isArray(o.failures)) errors.push('resource_observation_failures');
  return [...new Set(errors)];
}

export function applyResourceObservation(registry,observation){
  const reg=structuredClone(registry);
  const errors=[...validateResourceRegistry(reg),...validateResourceObservation(observation)];
  if(errors.length) throw new Error(errors.join(';'));
  const r=reg.resources.find(x=>x.resource_id===observation.resource_id);
  if(!r) throw new Error('resource_not_registered');
  const hadFailure=observation.failures.length>0;
  const usable=observation.usable_candidates>0;
  r.health.last_checked_at=observation.checked_at;
  if(usable){
    r.health.last_success_at=observation.checked_at;
    r.health.consecutive_failures=0;
    r.health.status=hadFailure?'degraded':'healthy';
  }else{
    r.health.consecutive_failures=(r.health.consecutive_failures||0)+1;
    r.health.status=r.health.consecutive_failures>=3?'failing':'degraded';
  }
  r.health.observed_yield_rate=observation.candidates_found?observation.usable_candidates/observation.candidates_found:0;
  r.health.freshness_hit_rate=observation.usable_candidates?observation.fresh_items/observation.usable_candidates:0;
  reg.updated_at=observation.checked_at;
  return reg;
}

// A catalogue import is development-time data reconciliation. It performs no
// network requests and does not qualify routes, select items or change schedules.
export const SOURCE_DIRECTORY_SCHEMA='daily-compiler-source-directory-import-v1';
export const SOURCE_PORTFOLIO_SCHEMA='daily-compiler-source-portfolio-v1';
export const SOURCE_DIRECTORY_MIGRATION='source-portfolio-2026-09-19-v1';
export const SOURCE_DIRECTORY_PATH='migrations/source-portfolio-v1/directory.json';
export const SOURCE_LAYERS=[
  {layer:1,name:'Article and publisher sources',role:'article',total:74,existing:37},
  {layer:2,name:'Research and early-signal discovery',role:'research',total:40,existing:20},
  {layer:3,name:'Video discovery',role:'video',total:22,existing:11},
  {layer:4,name:'Podcast discovery',role:'podcast',total:28,existing:14},
  {layer:5,name:'Emerging AI Watchlist',role:'watchlist',total:40,existing:20}
];
const DISPOSITIONS=['mapped_existing','add_resource','add_layer_membership','alias_requires_verification','retrieval_pending'];
const IDENTITY_KINDS=['publisher_or_channel','show','platform','community'];
const QUESTION_KINDS=['possible_show_alias','show_continuity','possible_publisher_redirect','publisher_platform_identity','possible_endpoint_alias','channel_endpoint_relationship'];
const HEX64=/^[a-f0-9]{64}$/;
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const uniqueStrings=x=>Array.isArray(x)&&x.every(nonempty)&&new Set(x).size===x.length;
const dateTime=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const hash=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const objectDigest=x=>hash(JSON.stringify(canonical(x)));
const sortedRows=rows=>[...rows].sort((a,b)=>a.planning_row_id<b.planning_row_id?-1:a.planning_row_id>b.planning_row_id?1:0);
const layerFor=n=>SOURCE_LAYERS.find(x=>x.layer===n);
const unknownHealth=()=>({status:'unknown',last_checked_at:null,last_success_at:null,consecutive_failures:0,observed_yield_rate:null,freshness_hit_rate:null});
const pendingQualification=()=>({status:'pending',verified_runtime_endpoint:null,checked_at:null,evidence_ref:null,unattended_eligible:false});

export function serializeResourceRegistry(registry){return JSON.stringify(registry,null,2)+'\n';}
export function resourceRegistryDigest(registry){return hash(serializeResourceRegistry(registry));}
export function sourceDirectoryDigest(source){
  // Membership/identity-question order is not semantic. Original row wording,
  // URLs, rubric order, provenance and all other fields remain digest-bound.
  return objectDigest({...source,rows:sortedRows(source.rows),identity_questions:[...source.identity_questions].sort((a,b)=>a.question_id<b.question_id?-1:a.question_id>b.question_id?1:0)});
}

function publicUrl(value){
  if(!nonempty(value)||value!==value.trim()) return false;
  try{
    const u=new URL(value);
    return ['https:','http:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password;
  }catch{return false;}
}

export function validateSourceDirectory(source={}){
  const errors=[];
  if(source.schema_version!==SOURCE_DIRECTORY_SCHEMA||source.migration_id!==SOURCE_DIRECTORY_MIGRATION) errors.push('source_directory_version');
  if(!HEX64.test(source.source_directory?.sha256||'')||!HEX64.test(source.source_inventory?.sha256||'')||
     source.source_directory?.prepared_date!=='2026-09-19') errors.push('source_directory_provenance');
  if(!HEX64.test(source.baseline_registry?.sha256||'')||source.baseline_registry?.path!=='migrations/source-portfolio-v1/registry.before.json'||
     !/^[a-f0-9]{40}$/.test(source.baseline_registry?.source_commit||'')||
     source.baseline_registry?.schema_version!==LEGACY_RESOURCE_REGISTRY_SCHEMA||
     !uniqueStrings(source.baseline_registry?.resource_ids)||!source.baseline_registry.resource_ids.length) errors.push('source_directory_baseline');
  if(!Array.isArray(source.rows)||source.rows.length!==204) errors.push('source_directory_rows');
  const rows=Array.isArray(source.rows)?source.rows:[];
  const rowIds=new Set(), layerUrls=new Set();
  for(const r of rows){
    const layer=layerFor(r?.layer);
    if(!r||!layer||r.layer_name!==layer.name||!/^DIR-L[1-5]-\d{3}$/.test(r.planning_row_id||'')||
       rowIds.has(r.planning_row_id)) errors.push('source_directory_row_identity');
    rowIds.add(r?.planning_row_id);
    for(const key of ['name','description','source_type','recommended_role','reason','verification_note']) if(!nonempty(r?.[key])) errors.push('source_directory_row_provenance');
    if(!publicUrl(r?.url)||layerUrls.has(r?.layer+'|'+r?.url)) errors.push('source_directory_endpoint');
    layerUrls.add(r?.layer+'|'+r?.url);
    if(!['Existing','New'].includes(r?.directory_status)||!Number.isInteger(r?.source_line)||r.source_line<1) errors.push('source_directory_row_provenance');
    if(r?.compiler_resource_id!==null||r?.registry_reconciliation_disposition!=='not_yet_reconciled'||
       r?.retrieval_qualification!=='not_rechecked_for_this_plan'||r?.verified_runtime_endpoint!==null) errors.push('source_directory_historical_state');
  }
  if(source.counts?.total_layer_memberships!==204||source.counts?.baseline_memberships!==102||source.counts?.added_memberships!==102) errors.push('source_directory_counts');
  let first=1;
  for(const layer of SOURCE_LAYERS){
    const lr=rows.filter(r=>r?.layer===layer.layer);
    const declared=source.counts?.by_layer?.find?.(x=>x.layer===layer.layer);
    if(lr.length!==layer.total||lr.filter(r=>r.directory_status==='Existing').length!==layer.existing||
       lr.filter(r=>r.directory_status==='New').length!==layer.total-layer.existing||
       declared?.name!==layer.name||declared?.total!==layer.total||declared?.baseline!==layer.existing||declared?.added!==layer.total-layer.existing) errors.push('source_directory_layer_counts');
    for(let i=first;i<first+layer.total;i++) if(!rowIds.has('DIR-L'+layer.layer+'-'+String(i).padStart(3,'0'))) errors.push('source_directory_row_identity');
    first+=layer.total;
    const rubric=source.layer_rubrics?.[layer.name];
    const range=source.rubric_source_lines?.[layer.name];
    if(!Array.isArray(rubric)||!rubric.length||rubric.some(c=>!nonempty(c?.criterion)||!nonempty(c?.why_it_matters)||!Number.isInteger(c?.weight_percent)||c.weight_percent<1||c.weight_percent>100)||
       rubric.reduce((sum,c)=>sum+c.weight_percent,0)!==100||
       !Number.isInteger(range?.start)||!Number.isInteger(range?.end)||range.start<1||range.end<range.start) errors.push('source_directory_rubric');
  }
  if(Object.keys(source.layer_rubrics||{}).length!==5||Object.keys(source.rubric_source_lines||{}).length!==5) errors.push('source_directory_rubric');
  const questions=Array.isArray(source.identity_questions)?source.identity_questions:[];
  if(!Array.isArray(source.identity_questions)||new Set(questions.map(q=>q?.question_id)).size!==questions.length) errors.push('source_directory_identity_questions');
  for(const q of questions){
    if(!nonempty(q?.question_id)||!QUESTION_KINDS.includes(q?.kind)||!nonempty(q?.reason)||
       !uniqueStrings(q?.planning_row_ids)||!q.planning_row_ids.length||q.planning_row_ids.some(id=>!rowIds.has(id))||
       !uniqueStrings(q?.related_resource_ids)||q.status!=='pending'||q.evidence_ref!==null||q.verified_at!==null||q.resolution!==null) errors.push('source_directory_identity_questions');
  }
  if(!Array.isArray(source.retrieval_route_hints)) errors.push('source_directory_route_hints');
  for(const hint of Array.isArray(source.retrieval_route_hints)?source.retrieval_route_hints:[]){
    if(!nonempty(hint?.source_name)||!publicUrl(hint?.candidate_url)||!nonempty(hint?.purpose)||!nonempty(hint?.historical_status)||
       !Number.isInteger(hint?.source_line)||hint.source_line<1||!uniqueStrings(hint?.planning_row_ids)||!hint.planning_row_ids.length||
       hint.planning_row_ids.some(id=>!rowIds.has(id))||hint.qualification!=='not_rechecked'||hint.verified_runtime_endpoint!==null) errors.push('source_directory_route_hints');
  }
  return [...new Set(errors)];
}

function validateSourcePortfolioRegistry(registry){
  const errors=[], portfolio=registry.source_portfolio, resources=Array.isArray(registry.resources)?registry.resources:[];
  const ids=new Set(resources.map(r=>r?.resource_id));
  if(!portfolio||portfolio.schema_version!==SOURCE_PORTFOLIO_SCHEMA||portfolio.migration_id!==SOURCE_DIRECTORY_MIGRATION||
     portfolio.catalogue_status!=='reconciled'||portfolio.source_manifest_path!==SOURCE_DIRECTORY_PATH||
     !HEX64.test(portfolio.input_digest||'')||!HEX64.test(portfolio.baseline_registry_sha256||'')||
     !HEX64.test(portfolio.source_inventory_sha256||'')||!HEX64.test(portfolio.source_directory_sha256||'')||
     !dateTime(portfolio.applied_at)||portfolio.supplied_memberships!==204) errors.push('source_portfolio_metadata');
  for(const key of ['baseline_resource_ids','created_resource_ids','compiler_only_resource_ids']){
    if(!uniqueStrings(portfolio?.[key])||portfolio[key].some(id=>!ids.has(id))) errors.push('source_portfolio_preservation');
  }
  const baselineIds=new Set(portfolio?.baseline_resource_ids||[]), createdIds=new Set(portfolio?.created_resource_ids||[]);
  if([...createdIds].some(id=>baselineIds.has(id))||(portfolio?.compiler_only_resource_ids||[]).some(id=>!baselineIds.has(id))||
     [...ids].some(id=>!baselineIds.has(id)&&!createdIds.has(id))) errors.push('source_portfolio_preservation');
  const rows=new Map();
  for(const r of resources){
    const c=r?.catalogue;
    if(!c){
      if(createdIds.has(r?.resource_id)||(baselineIds.has(r?.resource_id)&&!(portfolio?.compiler_only_resource_ids||[]).includes(r.resource_id))) errors.push('source_portfolio_memberships');
      continue;
    }
    const identity=c.identity,q=c.qualification;
    if(c.migration_id!==SOURCE_DIRECTORY_MIGRATION||!IDENTITY_KINDS.includes(identity?.kind)||
       !uniqueStrings(identity?.claimed_names)||!identity.claimed_names.length||identity.canonical_publisher_id!==null||
       identity.canonical_show_id!==null||identity.verification_status!=='pending'||identity.evidence_ref!==null) errors.push('source_portfolio_identity');
    if(q?.status!=='pending'||q.verified_runtime_endpoint!==null||q.checked_at!==null||q.evidence_ref!==null||q.unattended_eligible!==false) errors.push('source_portfolio_qualification');
    if(!uniqueStrings(c.identity_question_ids)||!Array.isArray(c.memberships)||!c.memberships.length) errors.push('source_portfolio_memberships');
    if((createdIds.has(r.resource_id)||(Array.isArray(c.memberships)&&c.memberships.some(m=>m?.resource_action==='add_resource')))&&
       (r.enabled!==false||r.endpoint!==null||r.publisher!==null||r.search_mode!=='manual_endpoint')) errors.push('source_portfolio_unqualified_activation');
    for(const m of Array.isArray(c.memberships)?c.memberships:[]){
      const l=layerFor(m?.layer);
      if(!m||!l||m.layer_role!==l.role||!/^DIR-L[1-5]-\d{3}$/.test(m.planning_row_id||'')||
         rows.has(m.planning_row_id)||!nonempty(m.recommended_role)||!['Existing','New'].includes(m.directory_status)||
         !Number.isInteger(m.source_line)||m.source_line<1||!HEX64.test(m.provenance_sha256||'')||
         !DISPOSITIONS.includes(m.disposition)||!['reuse_resource','add_resource'].includes(m.resource_action)||
         typeof m.baseline_runtime_role_present!=='boolean') errors.push('source_portfolio_memberships');
      rows.set(m?.planning_row_id,m);
      if((createdIds.has(r.resource_id)&&m.resource_action!=='add_resource')||
         (baselineIds.has(r.resource_id)&&m.resource_action!=='reuse_resource')||
         (portfolio?.compiler_only_resource_ids||[]).includes(r.resource_id)) errors.push('source_portfolio_preservation');
    }
  }
  if(rows.size!==204) errors.push('source_portfolio_memberships');
  for(const l of SOURCE_LAYERS) if([...rows.values()].filter(m=>m?.layer===l.layer).length!==l.total||
    portfolio?.layer_membership_counts?.[String(l.layer)]!==l.total) errors.push('source_portfolio_layer_counts');
  if([...rows.values()].filter(m=>m?.directory_status==='Existing').length!==102||
     [...rows.values()].filter(m=>m?.directory_status==='New').length!==102) errors.push('source_portfolio_historical_counts');
  return [...new Set(errors)];
}

function identityKind(rows,resource){
  // These are unverified entity kinds, not canonical publisher or show IDs.
  if(rows.some(r=>['https://www.youtube.com/','https://podcasts.apple.com/','https://open.spotify.com/'].includes(r.url))) return 'platform';
  if(rows.some(r=>r.layer===4)) return 'show';
  if(rows.some(r=>r.source_type.includes('Community'))||resource?.resource_id==='x-research-feeds') return 'community';
  return 'publisher_or_channel';
}
function pendingIdentity(rows,resource){
  return {kind:identityKind(rows,resource),claimed_names:[...new Set(rows.length?rows.map(r=>r.name):[resource.name])],
    canonical_publisher_id:null,canonical_show_id:null,verification_status:'pending',evidence_ref:null};
}
function questionIdsFor(source,rowIds,resourceId){
  return source.identity_questions.filter(q=>q.planning_row_ids.some(id=>rowIds.includes(id))||q.related_resource_ids.includes(resourceId)).map(q=>q.question_id).sort();
}
function qualificationGroup(rows){
  const roles=rows.map(r=>r.recommended_role);
  if(roles.some(r=>r==='Required-topic source')) return 'mandatory_topic';
  if(roles.some(r=>/Tier 1|Always check|Daily|Active preflight/.test(r))) return 'always_check';
  if(roles.some(r=>/Tier 2|^Core$/.test(r))) return 'regular';
  if(roles.some(r=>/Tier 3|Fallback/.test(r))) return 'rotating_or_topic';
  if(roles.some(r=>/Assisted/i.test(r))) return 'assisted_route_pending';
  return rows.length?'baseline_recommendation':'retained_compiler_only';
}

function catalogueOutputs(registry,source,diff){
  const rowMap=new Map(source.rows.map(r=>[r.planning_row_id,r]));
  const mapped=[];
  for(const resource of registry.resources) for(const membership of resource.catalogue?.memberships||[]){
    const original=rowMap.get(membership.planning_row_id);
    mapped.push({original:structuredClone(original),resource_id:resource.resource_id,membership:structuredClone(membership),
      publisher_show_identity:structuredClone(resource.catalogue.identity),pending_qualification:structuredClone(resource.catalogue.qualification),
      identity_question_ids:questionIdsFor(source,[membership.planning_row_id],resource.resource_id)});
  }
  mapped.sort((a,b)=>a.original.planning_row_id<b.original.planning_row_id?-1:1);
  const p=registry.source_portfolio, baselineIds=new Set(p.baseline_resource_ids);
  const urlGroups=new Map();
  for(const r of source.rows) urlGroups.set(r.url,(urlGroups.get(r.url)||0)+1);
  const summary={
    supplied_memberships:mapped.length,layer_counts:Object.fromEntries(SOURCE_LAYERS.map(l=>[String(l.layer),mapped.filter(m=>m.original.layer===l.layer).length])),
    historical_designations:{Existing:mapped.filter(m=>m.original.directory_status==='Existing').length,New:mapped.filter(m=>m.original.directory_status==='New').length},
    exact_directory_urls:urlGroups.size,baseline_resources:p.baseline_resource_ids.length,
    matched_baseline_resources:new Set(mapped.filter(m=>baselineIds.has(m.resource_id)).map(m=>m.resource_id)).size,
    matched_baseline_memberships:mapped.filter(m=>baselineIds.has(m.resource_id)).length,
    new_resources:p.created_resource_ids.length,new_resource_memberships:mapped.filter(m=>!baselineIds.has(m.resource_id)).length,
    compiler_only_resources:p.compiler_only_resource_ids.length,registry_resources:registry.resources.length,
    preexisting_runtime_roles:mapped.filter(m=>m.membership.baseline_runtime_role_present).length,
    catalogue_roles_not_in_baseline:mapped.filter(m=>!m.membership.baseline_runtime_role_present).length,
    pending_added_roles_on_baseline_resources:mapped.filter(m=>baselineIds.has(m.resource_id)&&!m.membership.baseline_runtime_role_present).length,
    cross_layer_reuse_groups:[...urlGroups.values()].filter(n=>n>1).length,
    dispositions:Object.fromEntries(DISPOSITIONS.map(d=>[d,mapped.filter(m=>m.membership.disposition===d).length])),
    pending_identity_questions:source.identity_questions.length,verified_aliases:0,new_routes_qualified:0,
    resources_pending_qualification:registry.resources.length,runtime_role_changes:0
  };
  const digest=resourceRegistryDigest(registry);
  const mapping={schema_version:'daily-compiler-source-directory-reconciliation-v1',migration_id:source.migration_id,
    result:'SOURCE_CATALOGUE_RECONCILED',count_unit:'layer_memberships_not_unique_websites',
    input_digest:sourceDirectoryDigest(source),baseline_registry:structuredClone(source.baseline_registry),
    candidate_registry_sha256:digest,summary,layer_rubrics:structuredClone(source.layer_rubrics),
    rubric_source_lines:structuredClone(source.rubric_source_lines),rows:mapped,
    compiler_only_resources:registry.resources.filter(r=>p.compiler_only_resource_ids.includes(r.resource_id)).map(r=>structuredClone(r)),
    identity_questions:structuredClone(source.identity_questions)};
  const resources=registry.resources.map(r=>{
    const ids=(r.catalogue?.memberships||[]).map(m=>m.planning_row_id),rows=ids.map(id=>rowMap.get(id));
    return {resource_id:r.resource_id,directory_row_ids:ids,directory_urls:[...new Set(rows.map(row=>row.url))],
      current_registry_url:r.url,current_configured_endpoint:r.endpoint??null,current_enabled:r.enabled,
      current_runtime_content_types:[...r.content_types],current_runtime_priority:r.priority,
      directory_recommended_roles:rows.map(row=>({planning_row_id:row.planning_row_id,role:row.recommended_role})),
      qualification_priority_group:qualificationGroup(rows),due_at:null,coverage_status:'not_assessed',
      identity:structuredClone(r.catalogue?.identity||pendingIdentity([],r)),
      identity_question_ids:questionIdsFor(source,ids,r.resource_id),qualification:pendingQualification(),
      unattended_route_required:true,
      pending_reason:rows.some(row=>/assisted/i.test(row.recommended_role))||r.search_mode==='manual_endpoint'
        ?'No approved unattended route established by this import; assisted provenance cannot require owner presence.'
        :'Actual Compiler route, publisher/show identity and representative item evidence have not been requalified by this import.',
      historical_route_hints:source.retrieval_route_hints.filter(h=>h.planning_row_ids.some(id=>ids.includes(id))).map(h=>structuredClone(h))};
  });
  const groupNames=['mandatory_topic','always_check','regular','rotating_or_topic','assisted_route_pending','baseline_recommendation','retained_compiler_only'];
  const qualification_worklist={schema_version:'daily-compiler-source-qualification-worklist-v1',migration_id:source.migration_id,
    candidate_registry_sha256:digest,input_digest:sourceDirectoryDigest(source),scope:'Iteration 5 inputs only; no qualification, cadence or next-edition due status established.',
    source_rollout:'SOURCE_ROLLOUT_PARTIAL',qualified_by_this_migration:0,
    due_priority_groups:groupNames.map(group=>({group,resource_ids:resources.filter(r=>r.qualification_priority_group===group).map(r=>r.resource_id),actual_due_count:null})),
    required_checks:['Resolve the actual supported retrieval route; never invent a feed.',
      'Verify publisher/channel/show and any alias/continuity question with retained evidence.',
      'Retrieve representative metadata and one real item where required; retain date precision and exact item identity.',
      'Record actual method, check time, outcome, parser/access limits and evidence reference.',
      'Set finite due/probe/response budgets in the next approved qualification configuration; no unattended grant from directory labels.'],
    resources,identity_questions:structuredClone(source.identity_questions)};
  return {registry,mapping,diff,qualification_worklist};
}

export function reconcileSourceDirectory(registry,source,{appliedAt}={}){
  const errors=[...validateResourceRegistry(registry),...validateSourceDirectory(source)];
  if(errors.length) throw new Error(errors.join(';'));
  const beforeDigest=resourceRegistryDigest(registry),inputDigest=sourceDirectoryDigest(source);
  if(registry.source_portfolio){
    if(registry.source_portfolio.input_digest!==inputDigest||
       registry.source_portfolio.baseline_registry_sha256!==source.baseline_registry.sha256||
       registry.source_portfolio.source_directory_sha256!==source.source_directory.sha256||
       registry.source_portfolio.source_inventory_sha256!==source.source_inventory.sha256||
       objectDigest(registry.source_portfolio.baseline_resource_ids)!==objectDigest(source.baseline_registry.resource_ids)) throw new Error('source_directory_input_conflict');
    const existing=new Map();
    for(const r of registry.resources) for(const m of r.catalogue?.memberships||[]) existing.set(m.planning_row_id,{r,m});
    for(const row of source.rows){
      const found=existing.get(row.planning_row_id);
      if(!found||found.m.provenance_sha256!==objectDigest(row)||
         ![found.r.url,found.r.endpoint].includes(row.url)||
         found.m.layer!==row.layer||found.m.layer_role!==layerFor(row.layer).role||
         found.m.recommended_role!==row.recommended_role||found.m.directory_status!==row.directory_status||
         found.m.source_line!==row.source_line||!found.r.catalogue.identity.claimed_names.includes(row.name)||
         objectDigest(found.r.catalogue.identity_question_ids)!==objectDigest(questionIdsFor(source,found.r.catalogue.memberships.map(m=>m.planning_row_id),found.r.resource_id))) throw new Error('source_directory_mapping_conflict');
    }
    return catalogueOutputs(structuredClone(registry),source,{registry_changed:false,added_resource_ids:[],added_membership_ids:[],
      runtime_fields_changed:[],before_registry_sha256:beforeDigest,after_registry_sha256:beforeDigest});
  }
  if(registry.schema_version!==LEGACY_RESOURCE_REGISTRY_SCHEMA||beforeDigest!==source.baseline_registry.sha256||
     objectDigest(registry.resources.map(r=>r.resource_id))!==objectDigest(source.baseline_registry.resource_ids)) throw new Error('source_directory_baseline_mismatch');
  if(!dateTime(appliedAt)) throw new Error('source_directory_applied_at');
  const next=structuredClone(registry),baselineIds=new Set(next.resources.map(r=>r.resource_id)),createdIds=[];
  const rowGroups=new Map(),endpointIndex=new Map();
  const indexResource=r=>{
    for(const url of new Set([r.url,r.endpoint].filter(nonempty))){
      if(!endpointIndex.has(url)) endpointIndex.set(url,new Set());
      endpointIndex.get(url).add(r.resource_id);
    }
  };
  next.resources.forEach(indexResource);
  for(const row of sortedRows(source.rows)){
    const matches=[...(endpointIndex.get(row.url)||[])];
    if(matches.length>1) throw new Error('source_directory_ambiguous_endpoint:'+row.planning_row_id);
    let resource=next.resources.find(r=>r.resource_id===matches[0]);
    if(!resource){
      const id='directory-'+hash(row.url).slice(0,24);
      if(next.resources.some(r=>r.resource_id===id)) throw new Error('source_directory_resource_id_collision');
      resource={resource_id:id,name:row.name,url:row.url,enabled:false,
        content_types:[...new Set(sortedRows(source.rows.filter(r=>r.url===row.url)).map(r=>layerFor(r.layer).role))],
        priority:'experimental',search_mode:'manual_endpoint',endpoint:null,publisher:null,
        notes:'Directory catalogue only. The exact directory URL is retained; no runtime retrieval route or unattended eligibility is granted.',
        health:unknownHealth()};
      next.resources.push(resource);createdIds.push(id);indexResource(resource);
    }
    if(!rowGroups.has(resource.resource_id)) rowGroups.set(resource.resource_id,[]);
    rowGroups.get(resource.resource_id).push(row);
  }
  for(const question of source.identity_questions) if(question.related_resource_ids.some(id=>!baselineIds.has(id))) throw new Error('source_directory_unknown_alias_resource');
  for(const [id,rows] of rowGroups){
    const r=next.resources.find(resource=>resource.resource_id===id),wasPresent=baselineIds.has(id);
    r.catalogue={migration_id:source.migration_id,identity:pendingIdentity(rows,r),qualification:pendingQualification(),
      identity_question_ids:questionIdsFor(source,rows.map(row=>row.planning_row_id),id),
      memberships:rows.map((row,i)=>{
        const baselineRole=wasPresent&&r.content_types.includes(layerFor(row.layer).role);
        const questions=questionIdsFor(source,[row.planning_row_id],id);
        const retrievalPending=/assisted|retrieval limited|pending validation/i.test(row.recommended_role);
        const disposition=questions.length?'alias_requires_verification':retrievalPending?'retrieval_pending':
          baselineRole?'mapped_existing':!wasPresent&&i===0?'add_resource':'add_layer_membership';
        return {planning_row_id:row.planning_row_id,layer:row.layer,layer_role:layerFor(row.layer).role,
          recommended_role:row.recommended_role,directory_status:row.directory_status,source_line:row.source_line,
          provenance_sha256:objectDigest(row),disposition,resource_action:wasPresent?'reuse_resource':'add_resource',
          baseline_runtime_role_present:baselineRole};
      })};
  }
  next.schema_version=RESOURCE_REGISTRY_SCHEMA;
  next.updated_at=appliedAt;
  next.source_portfolio={schema_version:SOURCE_PORTFOLIO_SCHEMA,migration_id:source.migration_id,catalogue_status:'reconciled',
    applied_at:appliedAt,source_manifest_path:SOURCE_DIRECTORY_PATH,input_digest:inputDigest,
    source_inventory_sha256:source.source_inventory.sha256,source_directory_sha256:source.source_directory.sha256,
    baseline_registry_sha256:source.baseline_registry.sha256,supplied_memberships:204,
    layer_membership_counts:Object.fromEntries(SOURCE_LAYERS.map(l=>[String(l.layer),l.total])),
    baseline_resource_ids:[...baselineIds],created_resource_ids:createdIds,
    compiler_only_resource_ids:[...baselineIds].filter(id=>!rowGroups.has(id))};
  const afterErrors=validateResourceRegistry(next);
  if(afterErrors.length) throw new Error(afterErrors.join(';'));
  return catalogueOutputs(next,source,{registry_changed:true,added_resource_ids:createdIds,
    added_membership_ids:sortedRows(source.rows).map(r=>r.planning_row_id),runtime_fields_changed:[],
    before_registry_sha256:beforeDigest,after_registry_sha256:resourceRegistryDigest(next)});
}
