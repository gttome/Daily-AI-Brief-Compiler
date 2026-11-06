// Prospective source discovery coverage for ALL registered video leads.
// A registry entry is a discovery target, not an approved video or a playback check.
// Historical sealed editions stay immutable; do not infer attempted work from a plan.
import crypto from 'node:crypto';
import {validateResourceRegistry} from './resources.mjs';

export const VIDEO_SWEEP_EFFECTIVE_DATE='2026-11-07';
export const VIDEO_SWEEP_SCHEMA='daily-video-source-sweep-v1';
const METHODS=new Set(['DIRECT_PAGE','SOURCE_SEARCH','PUBLIC_SEARCH','FEED']);
const OUTCOMES=new Set([
  'CANDIDATES_FOUND','NO_RELEVANT_VIDEO','NO_NEW_ITEMS',
  'INACCESSIBLE','REVIEWED_UNQUALIFIED'
]);
const fail=code=>{throw Error('video_source_sweep:'+code);};
const iso=value=>typeof value==='string'&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&
  Number.isFinite(Date.parse(value));
function publicHttps(value){
  try{
    const u=new URL(value);
    return u.protocol==='https:'&&!u.username&&!u.password&&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|example\.)/i.test(u.hostname);
  }catch{return false;}
}
function videoRoster(registry){
  if(validateResourceRegistry(registry).length)fail('invalid_registry');
  return registry.resources.filter(r=>r.content_types.includes('video'))
    .sort((a,b)=>a.resource_id.localeCompare(b.resource_id))
    .map(r=>({resource_id:r.resource_id,url:r.url,enabled:r.enabled,
      search_mode:r.search_mode,name:r.name}));
}
const digest=rows=>crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
function validDate(date){
  return typeof date==='string'&&/^20\d\d-\d\d-\d\d$/.test(date)&&
    Number.isFinite(Date.parse(date+'T00:00:00Z'))&&
    new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
}

export function buildVideoSourceSweepPlan({editionDate,registry}){
  if(!validDate(editionDate))fail('invalid_edition_date');
  const roster=videoRoster(registry);
  return {schema_version:VIDEO_SWEEP_SCHEMA,edition_date:editionDate,
    registry_roster_sha256:digest(roster),registered_count:roster.length,
    enabled_count:roster.filter(x=>x.enabled).length,
    qualification_only_count:roster.filter(x=>!x.enabled).length,
    registry_snapshot:roster,
    observations:roster.map(r=>({resource_id:r.resource_id,
      outcome:'NOT_ATTEMPTED',attempted_at:null,method:null,
      checked_url:null,candidate_urls:[],reason:null})),
    rule:'Attempt discovery at every registered video source, including disabled qualification leads. Record actual source-specific results before selection lock. A plan is not evidence of an attempt; disabled leads remain unapproved for selection until independently qualified.'};
}

/**
 * Verifies an evidence ledger for every member of the original registry snapshot.
 * No network request is performed; source review and candidate/program playback
 * are separate human/editorial observations that cannot be inferred from this PASS.
 *
 * On replay after a registry update, the pinned immutable roster can be used only
 * if the current registry updated_at is genuinely later than the edition's lock.
 */
export function validateVideoSourceSweep({editionDate,registry,sweep,selectionLockedAt}){
  if(editionDate<VIDEO_SWEEP_EFFECTIVE_DATE)
    return {result:'SKIPPED_HISTORICAL',edition_date:editionDate};
  if(!validDate(editionDate)||!iso(selectionLockedAt))fail('invalid_edition_or_selection_lock');
  if(!sweep||sweep.schema_version!==VIDEO_SWEEP_SCHEMA||
     sweep.edition_date!==editionDate)fail('missing_or_wrong_edition_ledger');
  const live=videoRoster(registry);
  const locked=Date.parse(selectionLockedAt);
  const isSame=digest(live)===sweep.registry_roster_sha256;
  const registryUpdated=iso(registry.updated_at)?Date.parse(registry.updated_at):null;
  const archivedRoster=!isSame&&registryUpdated!==null&&registryUpdated>locked;
  if(!isSame&&!archivedRoster)fail('not_entire_current_video_registry');
  const roster=isSame?live:sweep.registry_snapshot;
  if(!Array.isArray(roster)||!roster.length||
    roster.some(r=>typeof r.resource_id!=='string'||!r.resource_id||
      !publicHttps(r.url)||typeof r.enabled!=='boolean'||
      !['targeted','site_search','feed','page','manual_endpoint'].includes(r.search_mode)||
      typeof r.name!=='string'||!r.name))fail('invalid_roster');
  if(digest(roster)!==sweep.registry_roster_sha256||
     !Array.isArray(sweep.registry_snapshot)||
     digest(sweep.registry_snapshot)!==digest(roster)||
     sweep.registered_count!==roster.length||
     sweep.enabled_count!==roster.filter(r=>r.enabled).length||
     sweep.qualification_only_count!==roster.filter(r=>!r.enabled).length)
    fail('registry_snapshot_or_count_mismatch');
  const plannedIds=roster.map(r=>r.resource_id);
  if(new Set(plannedIds).size!==plannedIds.length||
     !Array.isArray(sweep.observations)||sweep.observations.length!==roster.length)
    fail('missing_or_duplicated_source_observation');
  const seen=new Set(),resultCounts={};
  let totalCandidates=0;
  for(const o of sweep.observations){
    const r=roster.find(x=>x.resource_id===o?.resource_id);
    if(!r||seen.has(o.resource_id))fail('unknown_or_duplicate_source_id');
    seen.add(o.resource_id);
    if(!OUTCOMES.has(o.outcome)||!METHODS.has(o.method)||
      !iso(o.attempted_at)||Date.parse(o.attempted_at)>locked||
      Date.parse(o.attempted_at)<locked-48*3600*1000)
      fail('unattempted_stale_or_invalid_attempt:'+r.resource_id);
    if(!publicHttps(o.checked_url)||typeof o.reason!=='string'||o.reason.trim().length<40||
      !Array.isArray(o.candidate_urls)||o.candidate_urls.some(u=>!publicHttps(u))||
      new Set(o.candidate_urls).size!==o.candidate_urls.length)
      fail('source_specific_evidence_required:'+r.resource_id);
    if(o.outcome==='CANDIDATES_FOUND'&&o.candidate_urls.length===0)
      fail('candidate_urls_required:'+r.resource_id);
    if(o.outcome!=='CANDIDATES_FOUND'&&o.candidate_urls.length!==0)
      fail('candidate_outcome_mismatch:'+r.resource_id);
    resultCounts[o.outcome]=(resultCounts[o.outcome]||0)+1;
    totalCandidates+=o.candidate_urls.length;
  }
  if(seen.size!==roster.length)fail('source_coverage_incomplete');
  return {result:'PASS',edition_date:editionDate,
    registry_roster_sha256:sweep.registry_roster_sha256,
    registered_count:roster.length,attempted_count:seen.size,
    qualified_selection_sources:roster.filter(r=>r.enabled).length,
    qualification_only_sources:roster.filter(r=>!r.enabled).length,
    outcomes:resultCounts,candidate_urls_reported:totalCandidates,
    archived_registry_snapshot:archivedRoster,
    caveat:'Structural review of declared source attempts; does not prove website retrieval, audiovisual content review, exact program qualification or signed-out playback.'};
}
