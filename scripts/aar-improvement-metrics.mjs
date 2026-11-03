// Deterministic AAR extensions. No network, scheduling, generation or publication.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const METRICS_SCHEMA='daily-aar-continuous-improvement-v1';
export const OBSERVATION_SCHEMA='daily-aar-improvement-observations-v1';
export const IMPROVEMENT_CHART_FILES=['charts/seven-edition-trends.svg','charts/publication-failures.svg','charts/image-defects.svg'];
const EFFECTIVE='2026-11-03';
const day=86400000;
const date=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const stamp=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*day).toISOString().slice(0,10);
const count=x=>Number.isSafeInteger(x)&&x>=0;
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const text=x=>typeof x==='string'&&x.trim().length>0;
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const unique=xs=>[...new Set(xs)];
const list=x=>Array.isArray(x)?x:[];
const sameSet=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&unique(a).length===a.length&&a.every(x=>b.includes(x));
const median=xs=>{const v=xs.filter(number).sort((a,b)=>a-b),n=v.length;return n?Number(((v[Math.floor((n-1)/2)]+v[Math.floor(n/2)])/2).toFixed(2)):null;};
const tableCell=x=>String(x??'Not recorded').replaceAll('|','/').replace(/[\r\n]/g,' ');
const scoped=(e,k,d)=>e[k]?.edition_date===d?e[k]:null;
const codes=new Set(['TYPOGRAPHY','UNSUPPORTED_CLAIM','CAUSAL_CONNECTOR','LAYOUT','PSEUDO_WRITING','UNALLOWLISTED_TEXT','OTHER']);

export function publisherResilience({report,summary}){
 const absent={status:'NOT_RECORDED',topics:[],weakened_topics:null,reviewed_topics:0};
 if(!summary?.report_valid||!summary.source_commit||!summary.report_sha256||!report||report.target_edition_date!==summary.edition_date)return absent;
 const bands={broader:2,limited:1,insufficient:0},out=[];
 for(const topic of report.topics||[]){
  const r=topic.publisher_family_review;
  if(!r){out.push({topic_id:topic.topic_id,status:'NOT_RECORDED'});continue;}
  const bad=()=>out.push({topic_id:topic.topic_id,status:'INVALID'});
  if(r.schema_version!=='top10-publisher-family-review-v1'||!stamp(r.reviewed_at)||!stamp(report.generated_at)||
     Date.parse(r.reviewed_at)>Date.parse(report.generated_at)||!(topic.attention_band in bands)||
     !Array.isArray(r.families)||!r.families.length||!Array.isArray(r.removals)||
     r.families.some(x=>!x||typeof x!=='object')||r.removals.some(x=>!x||typeof x!=='object')) {bad();continue;}
  const attention=(topic.evidence||[]).filter(x=>x.role==='attention'&&x.event_id===topic.event_id).map(x=>x.source_url??x.url);
  const familyIds=r.families.map(x=>x.family_id),all=r.families.flatMap(x=>x.evidence_urls||[]);
  if(!text(topic.event_id)||!attention.length||!attention.every(https)||!sameSet(all,unique(attention))||unique(familyIds).length!==familyIds.length||
     r.families.some(x=>!text(x.family_id)||!https(x.provenance_url)||!text(x.independence_reason)||x.independence_reason.length<40||!Array.isArray(x.evidence_urls)||!x.evidence_urls.length)||
     !sameSet(r.removals.map(x=>x.family_id),familyIds)) {bad();continue;}
  let valid=true;
  for(const removal of r.removals){
   const family=r.families.find(x=>x.family_id===removal.family_id),remaining=all.filter(x=>!family.evidence_urls.includes(x));
   if(!sameSet(removal.remaining_evidence_urls,remaining)||!(removal.attention_band in bands)||
      bands[removal.attention_band]>bands[topic.attention_band]||(!remaining.length&&removal.attention_band!=='insufficient')||
      !text(removal.reason)||removal.reason.length<40)valid=false;
  }
  if(!valid){bad();continue;}
  out.push({topic_id:topic.topic_id,status:'RECORDED_EDITORIAL_ASSESSMENT',attention_band:topic.attention_band,
   publisher_families:familyIds.length,weakened:r.removals.some(x=>bands[x.attention_band]<bands[topic.attention_band]),
   removals:r.removals.map(x=>({...x})),reviewed_at:r.reviewed_at});
 }
 const recorded=out.filter(x=>x.status==='RECORDED_EDITORIAL_ASSESSMENT');
 return {status:recorded.length===out.length&&out.length?'RECORDED':recorded.length?'PARTIAL':out.some(x=>x.status==='INVALID')?'INVALID':'NOT_RECORDED',
  reviewed_topics:recorded.length,weakened_topics:recorded.length?recorded.filter(x=>x.weakened).length:null,topics:out,
  interpretation:'A documented editorial sensitivity check, not a popularity score or proof of publisher independence.'};
}

export function recoveryTiming(receipt,edition,events=[]){
 const rows=receipt?.edition_date===edition?receipt.timing_observations:null;
 if(!Array.isArray(rows))return {status:'NOT_RECORDED',rows:[]};
 const seen=new Set(),result=[];
 for(const r of rows){
  const times=['failure_at','detected_at','repair_started_at','repair_completed_at','verified_at'].map(k=>r?.[k]);
  const matching=events.find(x=>x.run_url===r?.failure_run_url);
  if(!r||!matching||seen.has(r.failure_run_url)||!times.every(stamp)||times.some((x,i)=>i&&Date.parse(x)<Date.parse(times[i-1]))||
     !['owner_assisted','scheduled_guard','primary','unknown'].includes(r.mode)||
     !Array.isArray(r.evidence_refs)||unique(r.evidence_refs).length<2||!r.evidence_refs.every(https)||
     Date.parse(r.failure_at)>Date.parse(matching.observed_at)||
     !https(r.public_verification_ref)||r.public_verification_ref===r.failure_run_url||!r.evidence_refs.includes(r.failure_run_url)||!r.evidence_refs.includes(r.public_verification_ref))
   return {status:'INVALID',rows:[]};
  seen.add(r.failure_run_url);
  const seconds=(a,b)=>(Date.parse(b)-Date.parse(a))/1000;
  result.push({...r,detection_seconds:seconds(times[0],times[1]),queue_seconds:seconds(times[1],times[2]),
   repair_seconds:seconds(times[2],times[3]),verification_seconds:seconds(times[3],times[4]),total_seconds:seconds(times[0],times[4])});
 }
 return {status:'RECORDED',rows:result,interpretation:'Invocation mode is recorded provenance, not independent certification of unattended recovery.'};
}

export function collectObservations({combined,evidence={},registry={},evidenceHashes={}}){
 const edition=combined.edition_date;
 if(!date(edition)||edition<EFFECTIVE||combined.schema_version!=='daily-compiler-unified-aar-v1')throw Error('INVALID_OBSERVATION_EDITION');
 const health=scoped(evidence,'publication-health',edition),bundle=scoped(evidence,'edition-bundle',edition);
 const recovery=scoped(evidence,'recovery-receipt',edition),coverage=scoped(evidence,'trend-search-coverage',edition);
 const aar=scoped(evidence,'image-after-action',edition),top10=combined.top10;
 const resources=(registry.resources||[]).filter(x=>x.enabled&&x.content_types?.some(t=>['article','video','podcast'].includes(t)));
 const knownIds=new Set(resources.map(x=>x.resource_id));
 const invalid=[];
 const rawEvents=health?.schema_version==='daily-compiler-publication-health-v1'&&Array.isArray(health.events)?health.events:null;
 let events=rawEvents?.filter(x=>x.status==='BLOCKED_PUBLICATION')??null;
 if(events?.some(x=>!https(x.run_url)||!stamp(x.observed_at)||!text(x.stage))){invalid.push('publication-health');events=null;}
 if(events){const seen=new Set();events=events.filter(x=>{const id=x.stage+':'+x.run_url;if(seen.has(id))return false;seen.add(id);return true;});}
 const causeReviews=[...list(recovery?.cause_reviews),...list(coverage?.cause_reviews),...list(scoped(evidence,'owner-intervention-incident',edition)?.cause_reviews)].filter(Boolean);
 const failures=events?.map(event=>{
  const matches=causeReviews.filter(r=>r.run_url===event.run_url&&r.stage===event.stage&&/^[A-Z][A-Z_]{2,60}$/.test(r.root_cause_code||'')&&https(r.evidence_ref)&&text(r.reason)&&r.reason.length>=40);
  const review=matches.length===1?matches[0]:null;
  return {...event,root_cause:review?.root_cause_code??'UNCLASSIFIED',cause_evidence_ref:review?.evidence_ref??null,
   documented_delay_seconds:review&&number(review.documented_delay_seconds)?review.documented_delay_seconds:null};
 })??null;
 const charts=combined.charts?.charts||[],research=charts.find(x=>x.id==='research-coverage'),image=charts.find(x=>x.id==='image-rework'),selection=charts.find(x=>x.id==='top10-selection');
 const audit=bundle?.source_discovery_audit,index=audit?.index_review,inspections=[];
 const sourceSet=Array.isArray(index?.eligible_ids)&&index.eligible_ids.length===index.eligible&&unique(index.eligible_ids).length===index.eligible_ids.length&&index.eligible_ids.every(text)?hash(JSON.stringify([...index.eligible_ids].sort())):null;
 // Exact IDs and a genuinely pre-selection review time are required. No inference from counts or index GETs.
 const locked=bundle?.editorial_provenance?.selection_locked_at;
 if(Array.isArray(index?.inspected_ids)&&stamp(audit.reviewed_at)&&stamp(locked)&&Date.parse(audit.reviewed_at)<=Date.parse(locked)&&
    index.inspected===index.inspected_ids.length&&unique(index.inspected_ids).length===index.inspected_ids.length&&index.inspected_ids.every(id=>knownIds.has(id)))
  inspections.push(...index.inspected_ids.map(resource_id=>({resource_id,reviewed_at:audit.reviewed_at,edition_date:edition})));
 const reviewValid=top10?.daily_improvement?.candidate_review_depth?.status==='RECORDED_REVIEW_LEDGER'&&
  top10.consumed_commit_independently_verified&&top10.search_status==='RECEIPTS_OBSERVED'&&coverage?.edition_date===edition;
 const selected=new Map(['article','video','podcast'].map(f=>[f,new Set((bundle?.[f==='article'?'stories':f==='video'?'videos':'podcasts']||[]).map(x=>x.source?.url??x.url))]));
 const reviews=reviewValid?(coverage.candidate_reviews?.records||[]).filter(x=>knownIds.has(x.resource_id)&&x.review_method!=='metadata_only').map(x=>({
  resource_id:x.resource_id,candidate_id:x.candidate_id,format:x.format,source_url:x.source_url,disposition:x.disposition,
  selected:combined.compiler_verified===true&&selected.get(x.format)?.has(x.source_url)===true,selection_observed:combined.compiler_verified===true})):null;
 const rejectionRows=[],seenAttempts=new Set();
 if(image?.status==='OBSERVED'&&aar){
  for(const error of list(aar.errors)){
   const r=error?.generation_rejection;if(!r)continue;
   const story=aar.images?.find(x=>x.story_id===r.story_id),key=r.story_id+':'+r.attempt;
   if(!story||!Number.isSafeInteger(r.attempt)||r.attempt<1||r.attempt>=story.generation_attempts||seenAttempts.has(key)||
      !Array.isArray(r.defect_codes)||!r.defect_codes.length||unique(r.defect_codes).length!==r.defect_codes.length||
      !r.defect_codes.every(x=>codes.has(x))||!https(r.evidence_ref)){invalid.push('generation_rejection');continue;}
   seenAttempts.add(key);rejectionRows.push({...r});
  }
 }
 const evaluations=[...list(top10?.daily_improvement?.change_log?.change_evaluations),
  ...list(coverage?.change_evaluations),...list(aar?.change_evaluations),...list(recovery?.change_evaluations)].filter(Boolean);
 return {schema_version:OBSERVATION_SCHEMA,edition_date:edition,cycle_date:combined.cycle_date,evidence_hashes:evidenceHashes,
  registry_sha256:hash(JSON.stringify(registry)),source_set_sha256:sourceSet,eligible_resource_ids:[...knownIds],invalid_evidence:unique(invalid),
  metrics:{coverage_percent:research?.status==='OBSERVED'?research.inspected_percent:null,
   coverage_numerator:research?.status==='OBSERVED'?research.rows[0].value:null,coverage_denominator:research?.status==='OBSERVED'?research.total:null,
   first_pass_accepted:image?.status==='OBSERVED'?image.first_pass_accepted:null,image_attempts:image?.status==='OBSERVED'?image.total_attempts:null,
   top10_linked_items:selection?.status==='OBSERVED'?selection.linked_items:null,publication_failures:failures?.length??null},
  failures,recovery:recoveryTiming(recovery,edition,events||[]),inspections,source_reviews:reviews,
  source_review_missing_resource_ids:reviewValid?coverage.candidate_reviews.records.filter(r=>!knownIds.has(r.resource_id)).length:null,
  image_rejections:image?.status==='OBSERVED'?{total:image.total_attempts-6,classified:rejectionRows,unclassified:image.total_attempts-6-rejectionRows.length}:null,
  resilience:publisherResilience({report:evidence['top10-report'],summary:top10}),change_evaluations:evaluations};
}

export function improvementRegister(register,observations,edition){
 if(register?.schema_version!=='daily-aar-improvement-register-v1'||!Array.isArray(register.changes))throw Error('INVALID_IMPROVEMENT_REGISTER');
 const ids=register.changes.map(c=>c.change_id);
 if(unique(ids).length!==ids.length||register.changes.some(c=>!text(c.change_id)||!date(c.effective_edition)||!date(c.review_due_edition)||c.review_due_edition<c.effective_edition||!text(c.metric)))throw Error('INVALID_IMPROVEMENT_REGISTER');
 return register.changes.map(c=>{
  const eligible=observations.filter(o=>o.edition_date>=c.effective_edition&&o.edition_date<=edition);
  const reviews=eligible.flatMap(o=>list(o.change_evaluations).filter(r=>r?.change_id===c.change_id&&date(r.reviewed_edition)&&r.reviewed_edition===o.edition_date&&
   ['keep','revise','retire'].includes(r.decision)&&['met','not_met','inconclusive'].includes(r.result)&&text(r.reason)&&r.reason.length>=40&&
   Array.isArray(r.evidence_refs)&&r.evidence_refs.length>0&&r.evidence_refs.every(https))).sort((a,b)=>a.reviewed_edition.localeCompare(b.reviewed_edition));
  const latest=reviews.at(-1)??null;
  return {...c,implementation_status:'PROTECTED_MAIN_IMPLEMENTATION',outcome_status:latest?'REVIEWED':edition<c.effective_edition?'NOT_YET_EFFECTIVE':edition>c.review_due_edition?'OVERDUE':'PENDING',latest_review:latest};
 });
}

export function buildMetrics({edition,observations,registry,register}){
 if(!date(edition))throw Error('INVALID_METRICS_EDITION');
 const valid=observations.filter(o=>o?.schema_version===OBSERVATION_SCHEMA&&date(o.edition_date)&&o.edition_date>=EFFECTIVE&&o.edition_date<=edition);
 if(unique(valid.map(o=>o.edition_date)).length!==valid.length)throw Error('DUPLICATE_OBSERVATION_EDITION');
 const window=valid.filter(o=>o.edition_date>=shift(edition,-6)).sort((a,b)=>a.edition_date.localeCompare(b.edition_date));
 const byDate=new Map(window.map(x=>[x.edition_date,x]));
 const series=Array.from({length:7},(_,i)=>{const d=shift(edition,i-6),o=byDate.get(d);return {edition_date:d,...Object.fromEntries(['coverage_percent','coverage_numerator','coverage_denominator','first_pass_accepted','image_attempts','top10_linked_items','publication_failures'].map(k=>[k,o?.metrics?.[k]??null]))};});
 const summary=Object.fromEntries(['coverage_percent','first_pass_accepted','image_attempts','top10_linked_items','publication_failures'].map(k=>{const values=series.map(x=>x[k]).filter(number);return [k,{recorded_editions:values.length,median:median(values)}];}));
 const failureMap=new Map();
 for(const o of window)for(const r of o.failures||[]){const key=r.stage+':'+r.root_cause;const x=failureMap.get(key)??{stage:r.stage,cause:r.root_cause,count:0,editions:[],delay_samples:[]};x.count++;x.editions.push(o.edition_date);if(number(r.documented_delay_seconds))x.delay_samples.push(r.documented_delay_seconds);failureMap.set(key,x);}
 const failures=[...failureMap.values()].map(x=>({...x,editions:unique(x.editions),recurring:unique(x.editions).length>1,median_documented_delay_seconds:median(x.delay_samples)})).sort((a,b)=>b.count-a.count||(a.stage+a.cause).localeCompare(b.stage+b.cause));
 const recovery=window.flatMap(o=>o.recovery?.status==='RECORDED'?o.recovery.rows.map(r=>({...r,edition_date:o.edition_date})):[]);
 const recoverySummary=unique(recovery.map(r=>r.mode)).map(mode=>{const rows=recovery.filter(r=>r.mode===mode);return {mode,recorded_incidents:rows.length,...Object.fromEntries(['detection_seconds','queue_seconds','repair_seconds','verification_seconds','total_seconds'].map(k=>[k,median(rows.map(r=>r[k]))]))};});
 const sourceIds=(registry.resources||[]).filter(x=>x.enabled&&x.content_types?.some(t=>['article','video','podcast'].includes(t))).map(x=>x.resource_id).sort();
 const age=sourceIds.map(resource_id=>{const seen=valid.flatMap(o=>(o.inspections||[]).filter(r=>r.resource_id===resource_id&&stamp(r.reviewed_at)).map(r=>({...r,edition_date:o.edition_date}))).sort((a,b)=>a.reviewed_at.localeCompare(b.reviewed_at));const latest=seen.at(-1);return {resource_id,last_inspected_at:latest?.reviewed_at??null,last_inspected_edition:latest?.edition_date??null,editions_since_inspection:latest?Math.round((Date.parse(edition)-Date.parse(latest.edition_date))/day):null,status:latest?'OBSERVED':'NOT_RECORDED'};});
 const contribution=sourceIds.map(resource_id=>{
  const rows=window.flatMap(o=>Array.isArray(o.source_reviews)?o.source_reviews.filter(r=>r.resource_id===resource_id).map(r=>({...r,edition_date:o.edition_date})):[]);
  const seen=new Set(),distinct=[...rows].reverse().filter(r=>{const key=r.format+':'+r.source_url;if(seen.has(key))return false;seen.add(key);return true;});
  const selectedStatus=distinct.map(r=>{const same=rows.filter(x=>x.format===r.format&&x.source_url===r.source_url);return same.some(x=>x.selection_observed&&x.selected)?true:same.every(x=>x.selection_observed)?false:null;});
  const qualified=distinct.filter(r=>r.disposition==='qualified').length,selectionKnown=distinct.length>0&&selectedStatus.every(x=>x!==null);
  return {resource_id,reviewed:distinct.length||null,qualified:distinct.length?qualified:null,selected:selectionKnown?selectedStatus.filter(Boolean).length:null,
   qualification_rate:distinct.length?qualified/distinct.length:null,recorded_editions:unique(rows.map(r=>r.edition_date)).length};
 });
 const defectMap=new Map();
 for(const o of window)for(const r of o.image_rejections?.classified||[])for(const code of r.defect_codes){const x=defectMap.get(code)??{cause:code,rejected_attempts:0,editions:[]};x.rejected_attempts++;x.editions.push(o.edition_date);defectMap.set(code,x);}
 const defects=[...defectMap.values()].map(x=>({...x,editions:unique(x.editions),recurring:unique(x.editions).length>1})).sort((a,b)=>b.rejected_attempts-a.rejected_attempts||a.cause.localeCompare(b.cause));
 const imageWindows=window.filter(o=>o.image_rejections),registered=improvementRegister(register,valid,edition);
 return {schema_version:METRICS_SCHEMA,edition_date:edition,window:{first:shift(edition,-6),last:edition,expected_editions:7,recorded_editions:window.length},
  series,summary,coverage_registry_changed:unique(window.filter(o=>text(o.source_set_sha256)).map(o=>o.source_set_sha256)).length>1||unique(series.map(r=>r.coverage_denominator).filter(number)).length>1,
  coverage_source_set_comparable:window.filter(o=>number(o.metrics.coverage_percent)).every(o=>text(o.source_set_sha256))&&window.some(o=>number(o.metrics.coverage_percent)),
  change_register:registered,change_review_counts:{pending:registered.filter(x=>x.outcome_status==='PENDING').length,overdue:registered.filter(x=>x.outcome_status==='OVERDUE').length,reviewed:registered.filter(x=>x.outcome_status==='REVIEWED').length},
  publication_failures:{recorded_editions:window.filter(x=>x.failures!==null).length,rows:failures,classified:window.flatMap(x=>x.failures||[]).filter(x=>x.root_cause!=='UNCLASSIFIED').length},
  recovery:{rows:recovery,summary:recoverySummary},source_inspection_age:age,source_contribution:contribution,
  image_defects:{recorded_editions:imageWindows.length,total_rejected:imageWindows.length?imageWindows.reduce((n,o)=>n+o.image_rejections.total,0):null,
   unclassified:imageWindows.length?imageWindows.reduce((n,o)=>n+o.image_rejections.unclassified,0):null,rows:defects},
  top10_resilience:byDate.get(edition)?.resilience??{status:'NOT_RECORDED',topics:[]},
  limits:['Seven calendar edition dates; missing observations are gaps, never zero.','Source counts and registry/method changes limit comparison; no causal improvement claim.',
   'Source contribution covers only resource-attributed substantive review records; it is not an exhaustive source ranking.','No last inspection record means not recorded, not proof the source was never read.',
   'Image defects may have multiple codes per rejected attempt; category totals are not attempt totals.','Recorded recovery mode is not first-party scheduler attestation.','Keep/revise/retire reviews do not automatically change production controls.']};
}

const xml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const svgText=(x,y,t,size=25)=>`<text x="${x}" y="${y}" font-size="${size}">${xml(t)}</text>`;
const wrap=(value,width)=>{const lines=[];let line='';for(const word of String(value).split(/\s+/)){if(line&&line.length+word.length+1>width){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
const frame=(title,height,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}" viewBox="0 0 640 ${height}" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><rect width="640" height="${height}" fill="white"/><g font-family="Arial,sans-serif" fill="#24343d">${svgText(28,40,title,28)}${body}</g></svg>\n`;
export function renderTrendSvg(model){
 const metrics=[['coverage_percent','Source indexes inspected (%)'],['first_pass_accepted','Images accepted first pass (of 6)'],['image_attempts','Image generation attempts'],['publication_failures','Publishing failures'],['top10_linked_items','Published items linked to Top 10']];
 let body=svgText(28,76,`${model.window.first} to ${model.window.last}`,23),y=112;
 for(const [key,label] of metrics){
  body+=svgText(28,y,label);y+=34;const values=model.series.map(r=>r[key]),max=Math.max(1,...values.filter(number)),top=y;
  body+=`<line x1="56" x2="584" y1="${y+100}" y2="${y+100}" stroke="#aab6bc"/>`;
  for(let i=0;i<7;i++){const x=56+i*88,v=values[i],py=number(v)?top+100-v/max*72:null;
   if(i&&number(v)&&number(values[i-1]))body+=`<line x1="${x-88}" y1="${top+100-values[i-1]/max*72}" x2="${x}" y2="${py}" stroke="#246b62" stroke-width="3"/>`;
   if(py!==null)body+=`<circle cx="${x}" cy="${py}" r="6" fill="#246b62"/>`;
   body+=svgText(x-16,py===null?top+55:py-13,py===null?'—':v,23);
   body+=svgText(x-25,top+133,model.series[i].edition_date.slice(5),20);
  }
  y+=180;
 }
 body+=svgText(28,y,'— = no comparable observation',23);return frame('Seven-edition AAR trends',y+30,body);
}
export function renderCauseSvg(title,rows,valueKey,known,footnote){
 let y=84,body='';const max=Math.max(1,...rows.map(r=>r[valueKey]));
 if(!rows.length){body+=svgText(28,y,known?'No classified causes recorded':'Not recorded',25);y+=44;}
 for(const row of rows){
  const label=row.label??row.cause;for(const line of wrap(label,38)){body+=svgText(28,y,line,23);y+=30;}
  body+=`<rect x="28" y="${y}" width="${row[valueKey]/max*480}" height="25" fill="#ad512f"/>`+svgText(530,y+23,row[valueKey],25);y+=58;
 }
 for(const line of wrap(footnote,48)){body+=svgText(28,y,line,21);y+=28;}
 return frame(title,y+20,body);
}

export function renderMetricsMarkdown(m){
 const lines=['## Continuous improvement review','',`Edition **${m.edition_date}**. Measurements use ${m.window.recorded_editions}/7 recorded editions in this window. Missing data stays **Not recorded**.`,
  '', '### Approved change evaluations','','| Change | Evaluate by | Outcome status | Latest decision |','|---|---|---|---|',
  ...m.change_register.map(r=>`| ${tableCell(r.change_id+' — '+r.title)} | ${r.review_due_edition} | ${r.outcome_status} | ${tableCell(r.latest_review?.decision)} |`),
  '',`Pending: ${m.change_review_counts.pending}; overdue: ${m.change_review_counts.overdue}; reviewed: ${m.change_review_counts.reviewed}. Implemented controls await measured results; review decisions do not disable controls.`,
  '', '### Seven-edition trends','','![Seven-edition trends](charts/seven-edition-trends.svg)','','| Edition | Coverage | First pass / 6 | Image attempts | Publishing failures | Top 10 links |','|---|---|---:|---:|---:|---:|',
  ...m.series.map(r=>`| ${r.edition_date} | ${r.coverage_percent===null?'Not recorded':r.coverage_numerator+'/'+r.coverage_denominator+' ('+r.coverage_percent+'%)'} | ${tableCell(r.first_pass_accepted)} | ${tableCell(r.image_attempts)} | ${tableCell(r.publication_failures)} | ${tableCell(r.top10_linked_items)} |`),
  '', '| Measure | Recorded editions | Window median |','|---|---:|---:|',...Object.entries(m.summary).map(([k,v])=>`| ${k.replaceAll('_',' ')} | ${v.recorded_editions} | ${tableCell(v.median)} |`),
  '',m.coverage_registry_changed?'**Registry changed in this window; coverage percentages use different source sets.**':m.coverage_source_set_comparable?'Recorded source-set identities are comparable in this window.':'**Source-set comparability is unknown:** historical aggregate counts do not establish identical source membership.',
  '', '### Publishing failures by stage and recorded cause','','![Publishing failures](charts/publication-failures.svg)','','| Stage | Recorded cause | Failures | Editions | Recurred | Delay median (seconds; documented samples only) |','|---|---|---:|---|---|---:|',
  ...m.publication_failures.rows.map(r=>`| ${r.stage} | ${r.cause} | ${r.count} | ${r.editions.join(', ')} | ${r.recurring?'Yes':'No within observed window'} | ${tableCell(r.median_documented_delay_seconds)} (${r.delay_samples.length} samples) |`),
  '', 'Unclassified means the original gate is known but no structured cause review is recorded. Stage names do not establish root causes. No rows establish no failures only when the recorded receipt explicitly has none.',
  '', '### Recovery intervals','','| Recorded mode | Incidents | Detection seconds | Queue seconds | Repair seconds | Verification seconds | Total seconds |','|---|---:|---:|---:|---:|---:|---:|',
  ...m.recovery.summary.map(r=>`| ${r.mode} | ${r.recorded_incidents} | ${r.detection_seconds} | ${r.queue_seconds} | ${r.repair_seconds} | ${r.verification_seconds} | ${r.total_seconds} |`),
  '',m.recovery.rows.length?'Intervals above are medians of recorded incidents; mode alone does not certify autonomy.':'**Not recorded:** no valid incident has all required timing and evidence references.',
  '', '### Source inspection history','','| Source | Last inspected edition | Editions since inspection |','|---|---|---:|',
  ...m.source_inspection_age.map(r=>`| ${r.resource_id} | ${tableCell(r.last_inspected_edition)} | ${tableCell(r.editions_since_inspection)} |`),
  '', 'Only exact inspected source IDs and pre-selection review timestamps count. No observation means history is unavailable.',
  '', '### Source contribution in this window','','| Source | Substantively reviewed | Qualified | Selected | Editions with attributed reviews |','|---|---:|---:|---:|---:|',
  ...m.source_contribution.filter(r=>r.reviewed!==null).map(r=>`| ${r.resource_id} | ${r.reviewed} | ${r.qualified} | ${tableCell(r.selected)} | ${r.recorded_editions} |`),
  '',m.source_contribution.some(r=>r.reviewed!==null)?'Candidate URLs are deduplicated by format within the window. Unattributed sources remain unknown in the JSON.':'**Not recorded:** no validated substantive reviews have registry source IDs.',
  '', '### Image rejection causes','','![Image rejection causes](charts/image-defects.svg)','','| Recorded defect | Rejected attempts with defect | Recurred across editions |','|---|---:|---|',
  ...m.image_defects.rows.map(r=>`| ${r.cause} | ${r.rejected_attempts} | ${r.recurring?'Yes':'No within observed window'} |`),
  '',`Total rejected: ${tableCell(m.image_defects.total_rejected)}; unclassified: ${tableCell(m.image_defects.unclassified)}. A rejected attempt can have several defect codes.`,
  '', '### Top 10 publisher-family sensitivity','','| Topic | Review status | Families | Evidence weakened after removal |','|---|---|---:|---|',
  ...m.top10_resilience.topics.map(r=>`| ${tableCell(r.topic_id)} | ${r.status} | ${tableCell(r.publisher_families)} | ${r.weakened===undefined?'Not recorded':r.weakened?'Yes':'No in recorded assessment'} |`),
  '',`Overall status: **${m.top10_resilience.status}**. Band changes are documented editorial assessments; source counts do not establish popularity.`,
  '', '[Full measurement data](improvement-metrics.json) · [Exact observation inputs](improvement-observations.json)','',...m.limits.map(x=>'- '+x),''];
 return lines.join('\n');
}

function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;return {_parse_error:true};}}
function write(file,o){fs.writeFileSync(file,JSON.stringify(o,null,2)+'\n');}
export function reconcileImprovementMetrics({dailyDir,evidenceRoot,registry,register}){
 const cycles=fs.readdirSync(dailyDir).filter(date).sort(),observations=[];let written=0;
 for(const cycle of cycles){
  const dir=path.join(dailyDir,cycle),combined=read(path.join(dir,'combined.json'));
  if(combined?.edition_date<EFFECTIVE||!date(combined?.edition_date)||combined.cycle_date!==cycle||combined.edition_date!==shift(cycle,1))continue;
  const evidenceDir=path.join(evidenceRoot,cycle);let obs;
  if(fs.existsSync(evidenceDir)){
   const evidence={},evidenceHashes={};for(const file of fs.readdirSync(evidenceDir).filter(x=>/^[a-z0-9-]+\.json$/.test(x))){const bytes=fs.readFileSync(path.join(evidenceDir,file));evidenceHashes[file]=hash(bytes);evidence[file.slice(0,-5)]=read(path.join(evidenceDir,file));}
   obs=collectObservations({combined,evidence,registry,evidenceHashes});write(path.join(dir,'improvement-observations.json'),obs);
  }else obs=read(path.join(dir,'improvement-observations.json'));
  if(obs?.schema_version!==OBSERVATION_SCHEMA||obs.edition_date!==combined.edition_date)continue;
  observations.push(obs);
  // Historical records can supply observations, but only collected cycles are rerendered.
  if(!fs.existsSync(evidenceDir))continue;
  const metrics=buildMetrics({edition:combined.edition_date,observations,registry,register});
  fs.mkdirSync(path.join(dir,'charts'),{recursive:true});write(path.join(dir,'improvement-metrics.json'),metrics);
  fs.writeFileSync(path.join(dir,IMPROVEMENT_CHART_FILES[0]),renderTrendSvg(metrics));
  fs.writeFileSync(path.join(dir,IMPROVEMENT_CHART_FILES[1]),renderCauseSvg('Publishing failures in seven editions',metrics.publication_failures.rows.map(r=>({...r,label:r.stage+' / '+r.cause})),'count',metrics.publication_failures.recorded_editions>0,'Counts are observed gate events, not inferred causes.'));
  fs.writeFileSync(path.join(dir,IMPROVEMENT_CHART_FILES[2]),renderCauseSvg('Image defects in seven editions',metrics.image_defects.rows,'rejected_attempts',metrics.image_defects.recorded_editions>0,`Unclassified rejected attempts: ${metrics.image_defects.unclassified??'Not recorded'}. Multiple codes per attempt are possible.`));
  const section=renderMetricsMarkdown(metrics),start='<!-- continuous-improvement:start -->',end='<!-- continuous-improvement:end -->';
  const reportFile=path.join(dir,'combined.md'),original=fs.readFileSync(reportFile,'utf8');
  const before=original.includes(start)?original.slice(0,original.indexOf(start)).trimEnd():original.trimEnd();
  fs.writeFileSync(reportFile,before+'\n\n'+start+'\n'+section+end+'\n');
  combined.continuous_improvement=metrics;write(path.join(dir,'combined.json'),combined);written++;
 }
 return {result:'CONTINUOUS_IMPROVEMENT_RECONCILED_NO_PUBLICATION',written};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [dailyDir,evidenceRoot,registryPath,registerPath]=process.argv.slice(2);
 if(!registerPath)throw Error('usage: aar-improvement-metrics <daily-dir> <evidence-root> <registry.json> <register.json>');
 console.log(JSON.stringify(reconcileImprovementMetrics({dailyDir,evidenceRoot,registry:read(registryPath),register:read(registerPath)})));
}
