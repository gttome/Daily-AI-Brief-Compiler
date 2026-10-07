import fs from 'node:fs';
import path from 'node:path';

export const RUN_EVENT_SCHEMA='daily-compiler-run-event-v1';
const ACTORS=new Set(['semantic_producer','dot','image_studio','work_porter','github_actions','compiler','recovery','correction']);
const STAGES=new Set(['EDITORIAL','CONTENT','IMAGES','BUNDLE','COMPILE','VERIFY','CORRECTION','ANALYSIS','RESOURCE_MONITORING']);
const STATUSES=new Set(['START','PASS','FAIL','BLOCKED','RETRY','INFO']);

export function validateRunEvent(event={}){
  const errors=[];
  if(event.schema_version!==RUN_EVENT_SCHEMA) errors.push('event_schema');
  for(const key of ['event_id','timestamp','edition_date','execution_id','event_type']) if(typeof event[key]!=='string'||!event[key]) errors.push('event_'+key);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event.edition_date||'')) errors.push('event_edition_date');
  if(!ACTORS.has(event.actor)) errors.push('event_actor');
  if(!STAGES.has(event.stage)) errors.push('event_stage');
  if(!STATUSES.has(event.status)) errors.push('event_status');
  if(event.duration_ms!==null&&(!Number.isInteger(event.duration_ms)||event.duration_ms<0)) errors.push('event_duration_ms');
  if(!Array.isArray(event.refs)) errors.push('event_refs');
  const u=event.usage||{};
  for(const k of ['dot_active_seconds','work_active_seconds','native_image_generations','web_queries','github_writes']){
    if(u[k]!==null&&(!Number.isFinite(u[k])||u[k]<0)) errors.push('event_usage_'+k);
  }
  if(u.estimated_charge!==null&&u.estimated_charge!==undefined&&(!Number.isFinite(u.estimated_charge)||u.estimated_charge<0)) errors.push('event_estimated_charge');
  return [...new Set(errors)];
}

export function assertRunEvent(event){
  const errors=validateRunEvent(event);
  if(errors.length) throw new Error('run event invalid: '+errors.join(';'));
  return event;
}

export function appendRunEvent(file,event){
  assertRunEvent(event);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.appendFileSync(file,JSON.stringify(event)+'\n');
  return event;
}

export function readRunEvents(file){
  if(!fs.existsSync(file)) return [];
  return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(line=>assertRunEvent(JSON.parse(line)));
}

export function blankUsage(){
  return {dot_active_seconds:null,work_active_seconds:null,native_image_generations:null,web_queries:null,github_writes:null,estimated_charge:null,estimate_basis:null};
}
