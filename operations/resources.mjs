export const RESOURCE_REGISTRY_SCHEMA='daily-compiler-resource-registry-v1';
export const RESOURCE_OBSERVATION_SCHEMA='daily-compiler-resource-observation-v1';

export function validateResourceRegistry(registry={}){
  const errors=[];
  if(registry.schema_version!==RESOURCE_REGISTRY_SCHEMA) errors.push('resource_registry_schema');
  if(!Array.isArray(registry.resources)) errors.push('resources_array');
  const ids=new Set();
  for(const r of registry.resources||[]){
    if(!r?.resource_id||ids.has(r.resource_id)) errors.push('resource_id');
    ids.add(r?.resource_id);
    if(!r?.name||!r?.url||typeof r.enabled!=='boolean'||!Array.isArray(r.content_types)||!r.content_types.length) errors.push('resource_identity');
    if(!['primary','secondary','fallback','experimental'].includes(r?.priority)) errors.push('resource_priority');
    if(!['targeted','site_search','feed','page','manual_endpoint'].includes(r?.search_mode)) errors.push('resource_search_mode');
    if(!['healthy','degraded','failing','unknown'].includes(r?.health?.status)) errors.push('resource_health');
  }
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
