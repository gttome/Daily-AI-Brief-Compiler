// Planning is not source inspection. Preserve every currently enabled editorial ID.
import crypto from 'node:crypto';
import {validateResourceRegistry} from './resources.mjs';
const roles=['article','video','podcast'];
const validDate=d=>/^20\d\d-\d\d-\d\d$/.test(d||'')&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function rotate(rows,days){const at=rows.length?days%rows.length:0;return rows.slice(at).concat(rows.slice(0,at));}
function interleave(rows){
 const pending=[...rows],out=[];
 while(pending.length){for(const role of roles){const n=pending.findIndex(r=>r.content_types.includes(role));if(n>=0)out.push(pending.splice(n,1)[0]);}}
 return out;
}
export function buildEditorialResearchPlan({editionDate,registry,previousAar=null}){
 if(!validDate(editionDate)||validateResourceRegistry(registry).length)throw Error('RESEARCH_PLAN_INVALID_INPUT');
 const previous=validDate(previousAar?.edition_date)&&previousAar.edition_date<editionDate?previousAar:null;
 const priorIds=previous?.evidence_reconciliation?.source_index_coverage?.unreviewed_ids;
 const unreviewed=new Set(Array.isArray(priorIds)?priorIds:[]);
 const eligible=registry.resources.filter(r=>r.enabled&&r.content_types.some(t=>roles.includes(t))).sort((a,b)=>a.resource_id.localeCompare(b.resource_id));
 const days=Math.floor(Date.parse(editionDate+'T00:00:00Z')/86400000);
 const first=interleave(rotate(eligible.filter(r=>unreviewed.has(r.resource_id)),days));
 const rest=interleave(rotate(eligible.filter(r=>!unreviewed.has(r.resource_id)),days));
 return {schema_version:'daily-compiler-editorial-research-plan-v1',edition_date:editionDate,
  previous_edition_date:previous?.edition_date??null,
  registry_sha256:crypto.createHash('sha256').update(JSON.stringify(registry)).digest('hex'),
  eligible_count:eligible.length,previously_unreviewed_prioritized:first.length,
  resources:[...first,...rest].map((r,i)=>({order:i+1,resource_id:r.resource_id,url:r.url,
   roles:r.content_types.filter(t=>roles.includes(t)),priority_reason:unreviewed.has(r.resource_id)?'PREVIOUSLY_UNREVIEWED':'REGULAR_ROTATION',inspection_status:'NOT_YET_RECORDED'})),
  rule:'Inspect original dated items across all enabled sources. Account for each as inspected, inaccessible or unreviewed. This plan proves no retrieval, reading, freshness or qualification. Disabled sources stay disabled; publication gates and the image handoff remain unchanged.'};
}
