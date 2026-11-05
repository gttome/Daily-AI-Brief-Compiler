import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildMetrics,buildDailyActionReview,collectObservations,publisherResilience,recoveryTiming,improvementRegister,
 reconcileImprovementMetrics,renderTrendSvg,renderCauseSvg,renderMetricsMarkdown,METRICS_SCHEMA,OBSERVATION_SCHEMA,IMPROVEMENT_CHART_FILES} from '../scripts/aar-improvement-metrics.mjs';
import {renderTop10Section} from '../scripts/top10-aar.mjs';
const edition='2026-11-04',cycle='2026-11-03';
const run='https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/123';
const ref='https://github.com/gttome/Daily-AI-Brief-Compiler/blob/abc/receipt.json';
const registry={resources:[{resource_id:'source-a',enabled:true,content_types:['article']},{resource_id:'source-b',enabled:true,content_types:['video']},{resource_id:'disabled',enabled:false,content_types:['article']}]};
const register={schema_version:'daily-aar-improvement-register-v1',changes:[{change_id:'AAR-01',title:'Change',effective_edition:edition,review_due_edition:'2026-11-11',metric:'Actual observed failures'}]};
function input(){return {registry,combined:{schema_version:'daily-compiler-unified-aar-v1',cycle_date:cycle,edition_date:edition,compiler_verified:true,
 charts:{charts:[{id:'research-coverage',status:'OBSERVED',inspected_percent:50,total:2,rows:[{value:1}]},{id:'image-rework',status:'OBSERVED',first_pass_accepted:1,total_attempts:12},{id:'top10-selection',status:'OBSERVED',linked_items:4}]},
 top10:{edition_date:edition,consumed_commit_independently_verified:true,search_status:'RECEIPTS_OBSERVED',daily_improvement:{candidate_review_depth:{status:'RECORDED_REVIEW_LEDGER'}}}},
 evidence:{'publication-health':{schema_version:'daily-compiler-publication-health-v1',edition_date:edition,events:[{status:'BLOCKED_PUBLICATION',stage:'MEDIA_HISTORY',run_url:run,observed_at:'2026-11-04T01:35:00Z'}]},
 'edition-bundle':{edition_date:edition,editorial_provenance:{selection_locked_at:'2026-11-04T02:00:00Z'},source_discovery_audit:{reviewed_at:'2026-11-04T01:30:00Z',index_review:{eligible:2,eligible_ids:['source-a','source-b'],inspected:1,inspected_ids:['source-a']}},stories:[{source:{url:'https://example.org/a'}}],videos:[],podcasts:[]},
 'trend-search-coverage':{edition_date:edition,candidate_reviews:{records:[{resource_id:'source-a',candidate_id:'a',format:'article',source_url:'https://example.org/a',review_method:'full_article',disposition:'qualified'}]}},
 'image-after-action':{edition_date:edition,images:[{story_id:'s1',generation_attempts:3}],errors:[{issue:'Actual saved-pixel arrow defect',generation_rejection:{story_id:'s1',attempt:1,defect_codes:['CAUSAL_CONNECTOR','UNSUPPORTED_CLAIM'],evidence_ref:ref}}]}}};}
function observation(d=edition){const i=input();i.combined.edition_date=d;i.combined.cycle_date=new Date(Date.parse(d)-86400000).toISOString().slice(0,10);for(const e of Object.values(i.evidence))e.edition_date=d;return collectObservations(i);}
test('actual counts are separate from unknown causes, missing historical reviews and disabled sources',()=>{
 const i=input(),o=collectObservations(i);
 assert.equal(o.metrics.publication_failures,1);assert.equal(o.failures[0].root_cause,'UNCLASSIFIED');
 assert.equal(o.metrics.first_pass_accepted,1);assert.equal(o.metrics.image_attempts,12);
 assert.deepEqual(o.eligible_resource_ids,['source-a','source-b']);assert.equal(o.inspections.length,1);
 assert.equal(o.source_reviews[0].selected,true);assert.equal(o.image_rejections.total,6);assert.equal(o.image_rejections.unclassified,5);
 delete i.evidence['publication-health'];delete i.evidence['edition-bundle'].source_discovery_audit.index_review.inspected_ids;
 i.combined.top10.daily_improvement.candidate_review_depth.status='NOT_RECORDED';
 const unknown=collectObservations(i);assert.equal(unknown.failures,null);assert.equal(unknown.metrics.publication_failures,null);assert.deepEqual(unknown.inspections,[]);assert.equal(unknown.source_reviews,null);
});
test('stale, late, duplicate and unbound inspection or source attribution is not counted',()=>{
 for(const alter of [i=>i.evidence['edition-bundle'].source_discovery_audit.reviewed_at='2026-11-04T03:00:00Z',i=>i.evidence['edition-bundle'].source_discovery_audit.index_review.inspected_ids=['source-a','source-a'],i=>i.evidence['edition-bundle'].source_discovery_audit.index_review.inspected_ids=['disabled']]){
  const i=input();alter(i);assert.deepEqual(collectObservations(i).inspections,[]);
 }
 const i=input();i.evidence['trend-search-coverage'].candidate_reviews.records[0].resource_id='unknown';const o=collectObservations(i);assert.deepEqual(o.source_reviews,[]);assert.equal(o.source_review_missing_resource_ids,1);
 i.combined.compiler_verified=false;i.evidence['trend-search-coverage'].candidate_reviews.records[0].resource_id='source-a';assert.equal(collectObservations(i).source_reviews[0].selection_observed,false);
});
test('root cause is bound to the actual failed run and stage, never guessed from gate labels',()=>{
 const i=input();i.evidence['trend-search-coverage'].cause_reviews=[{run_url:run,stage:'MEDIA_HISTORY',root_cause_code:'CHANNEL_IDENTITY',reason:'Original job log documents a missing verified channel identity.',evidence_ref:ref,documented_delay_seconds:120}];
 const o=collectObservations(i);assert.equal(o.failures[0].root_cause,'CHANNEL_IDENTITY');assert.equal(o.failures[0].documented_delay_seconds,120);
 i.evidence['trend-search-coverage'].cause_reviews.push({...i.evidence['trend-search-coverage'].cause_reviews[0]});assert.equal(collectObservations(i).failures[0].root_cause,'UNCLASSIFIED');
 i.evidence['trend-search-coverage'].cause_reviews={malformed:true};assert.equal(collectObservations(i).failures[0].root_cause,'UNCLASSIFIED');
});
test('recovery requires ordered actual timings, original failure and independent verification references',()=>{
 const row={failure_run_url:run,failure_at:'2026-11-04T01:30:00Z',detected_at:'2026-11-04T01:35:00Z',repair_started_at:'2026-11-04T01:36:00Z',repair_completed_at:'2026-11-04T01:40:00Z',verified_at:'2026-11-04T01:42:00Z',mode:'owner_assisted',public_verification_ref:ref,evidence_refs:[run,ref]};
 const receipt={edition_date:edition,timing_observations:[row]},events=input().evidence['publication-health'].events;
 const r=recoveryTiming(receipt,edition,events);assert.equal(r.status,'RECORDED');assert.equal(r.rows[0].detection_seconds,300);assert.equal(r.rows[0].queue_seconds,60);assert.equal(r.rows[0].repair_seconds,240);assert.equal(r.rows[0].verification_seconds,120);
 row.verified_at='2026-11-04T01:39:00Z';assert.equal(recoveryTiming(receipt,edition,events).status,'INVALID');
 assert.equal(recoveryTiming(null,edition,events).status,'NOT_RECORDED');
});
test('image codes cannot turn deployment errors, duplicate attempts or accepted attempts into rejects',()=>{
 const i=input(),r=i.evidence['image-after-action'].errors[0];i.evidence['image-after-action'].errors.push({...r}, {issue:'Deployment failed'}, {generation_rejection:{...r.generation_rejection,attempt:3}});
 const o=collectObservations(i);assert.equal(o.image_rejections.classified.length,1);assert.equal(o.image_rejections.unclassified,5);assert.ok(o.invalid_evidence.includes('generation_rejection'));
 const m=buildMetrics({edition,observations:[o],registry,register});assert.equal(m.image_defects.rows.length,2);assert.equal(m.image_defects.total_rejected,6);
});
test('seven edition dates preserve gaps, explicit zero and source-set changes without invented trends',()=>{
 const a=observation('2026-11-03'),b=observation();b.metrics.publication_failures=0;b.failures=[];
 const m=buildMetrics({edition,observations:[a,b],registry,register});assert.equal(m.series.length,7);assert.equal(m.series[0].publication_failures,null);assert.equal(m.series.at(-1).publication_failures,0);
 assert.equal(m.summary.publication_failures.recorded_editions,2);assert.equal(m.summary.publication_failures.median,.5);assert.equal(m.source_inspection_age.find(x=>x.resource_id==='source-b').status,'NOT_RECORDED');
 b.source_set_sha256='changed';assert.equal(buildMetrics({edition,observations:[a,b],registry,register}).coverage_registry_changed,true);
 assert.throws(()=>buildMetrics({edition,observations:[b,b],registry,register}),/DUPLICATE/);
});
test('source contribution deduplicates URL per format across days and preserves unknown selection',()=>{
 const a=observation('2026-11-03'),b=observation();b.source_reviews[0].selection_observed=false;
 const m=buildMetrics({edition,observations:[a,b],registry,register}),r=m.source_contribution.find(x=>x.resource_id==='source-a');
 assert.equal(r.reviewed,1);assert.equal(r.qualified,1);assert.equal(r.selected,1);assert.equal(r.recorded_editions,2);
 a.source_reviews[0].selected=false;assert.equal(buildMetrics({edition,observations:[a,b],registry,register}).source_contribution.find(x=>x.resource_id==='source-a').selected,null);
 assert.equal(m.source_contribution.find(x=>x.resource_id==='source-b').reviewed,null);
});
test('evaluation dates and actual evidence govern pending, overdue and reviewed status',()=>{
 const o=observation();assert.equal(improvementRegister(register,[o],'2026-11-03')[0].outcome_status,'NOT_YET_EFFECTIVE');
 assert.equal(improvementRegister(register,[o],edition)[0].outcome_status,'PENDING');assert.equal(improvementRegister(register,[o],'2026-11-12')[0].outcome_status,'OVERDUE');
 o.change_evaluations=[{change_id:'AAR-01',reviewed_edition:edition,decision:'keep',result:'inconclusive',reason:'The first observed cycle supplies too few comparable observations to conclude efficacy.',evidence_refs:[ref]}];
 assert.equal(improvementRegister(register,[o],edition)[0].outcome_status,'REVIEWED');o.change_evaluations[0].evidence_refs=[];assert.equal(improvementRegister(register,[o],edition)[0].outcome_status,'PENDING');
});
function sensitivity(){const urls=['https://example.org/a','https://other.org/b'];return {summary:{report_valid:true,source_commit:'abc',report_sha256:'def',edition_date:edition},report:{target_edition_date:edition,generated_at:'2026-11-03T23:10:00Z',topics:[{topic_id:'t1',event_id:'e1',attention_band:'broader',evidence:urls.map(source_url=>({source_url,role:'attention',event_id:'e1'})),publisher_family_review:{schema_version:'top10-publisher-family-review-v1',reviewed_at:'2026-11-03T23:00:00Z',families:urls.map((url,i)=>({family_id:'f'+i,provenance_url:url,independence_reason:'The reviewed original publisher identity and authorship are documented at this source.',evidence_urls:[url]})),removals:urls.map((_,i)=>({family_id:'f'+i,remaining_evidence_urls:[urls[1-i]],attention_band:'limited',reason:'Removing this original publisher leaves only one independently reviewed attention family.'}))}}]}};}
test('publisher sensitivity requires complete original family attribution and exact remaining evidence',()=>{
 const i=sensitivity(),r=publisherResilience(i);assert.equal(r.status,'RECORDED');assert.equal(r.weakened_topics,1);assert.equal(r.topics[0].publisher_families,2);
 i.report.topics[0].publisher_family_review.removals[0].remaining_evidence_urls.push('https://invented.org/');assert.equal(publisherResilience(i).status,'INVALID');
 const j=sensitivity();delete j.report.topics[0].publisher_family_review;assert.equal(publisherResilience(j).status,'NOT_RECORDED');
 const k=sensitivity();k.report.topics[0].publisher_family_review.families=[null];assert.equal(publisherResilience(k).status,'INVALID');
});
test('report postpass is deterministic, contains all charts, preserves baseline and never invents history',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aar-improve-'));
 try{
  const daily=path.join(tmp,'daily'),dir=path.join(daily,cycle),ev=path.join(tmp,'evidence',cycle);fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(ev,{recursive:true});fs.mkdirSync(path.join(daily,'baselines'));
  fs.writeFileSync(path.join(daily,'baselines','nov03-2026-top10.json'),'frozen-exact-bytes');const i=input();fs.writeFileSync(path.join(dir,'combined.json'),JSON.stringify(i.combined));fs.writeFileSync(path.join(dir,'combined.md'),'# Existing current conclusions\n');
  for(const [k,v] of Object.entries(i.evidence))fs.writeFileSync(path.join(ev,k+'.json'),JSON.stringify(v));
  const args={dailyDir:daily,evidenceRoot:path.join(tmp,'evidence'),registry,register};reconcileImprovementMetrics(args);
  const first=fs.readFileSync(path.join(dir,'combined.md'),'utf8'),data=fs.readFileSync(path.join(dir,'improvement-metrics.json'),'utf8');reconcileImprovementMetrics(args);
  assert.equal(fs.readFileSync(path.join(dir,'combined.md'),'utf8'),first);assert.equal(fs.readFileSync(path.join(dir,'improvement-metrics.json'),'utf8'),data);
  assert.equal(fs.readFileSync(path.join(daily,'baselines','nov03-2026-top10.json'),'utf8'),'frozen-exact-bytes');
  assert.equal(JSON.parse(data).schema_version,METRICS_SCHEMA);assert.equal((first.match(/continuous-improvement:start/g)||[]).length,1);
  for(const f of IMPROVEMENT_CHART_FILES)assert.ok(fs.existsSync(path.join(dir,f)));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('charts escape source labels and show genuine gaps without connecting through missing dates',()=>{
 const m=buildMetrics({edition,observations:[observation()],registry,register}),svg=renderTrendSvg(m);assert.match(svg,/no comparable observation/);assert.match(svg,/Source indexes inspected/);
 const cause=renderCauseSvg('Test',[{cause:'<script>&',count:1}],'count',true,'Observed');assert.doesNotMatch(cause,/<script>/);assert.match(cause,/&lt;script&gt;&amp;/);
});
test('workflow adds measurements to existing reporting job and preserves scheduling/publication boundaries',()=>{
 const w=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');assert.match(w,/cp scripts\/aar-improvement-metrics.mjs/);assert.match(w,/recovery\/\$edition.json/);assert.match(w,/node "\$tmp\/aar-improvement-metrics.mjs" daily/);
 assert.equal((w.match(/runs-on:/g)||[]).length,1);assert.equal((w.match(/cron:/g)||[]).length,1);
 const source=fs.readFileSync('scripts/top10-aar.mjs','utf8');assert.match(source,/Historical producer observations \(not current status\)/);assert.match(source,/Current reconciled conclusion/);
 const changes=JSON.parse(fs.readFileSync('config/aar-improvement-register.json'));assert.equal(changes.changes.length,14);assert.equal(new Set(changes.changes.map(x=>x.change_id)).size,14);
});
test('consolidated prompts retain all four task identities and mapped requirements with inactive archived history',()=>{
 const prompts=JSON.parse(fs.readFileSync('config/automation-prompts.json')),audit=JSON.parse(fs.readFileSync('docs/automation/current/requirements-audit.json'));
 const archive=JSON.parse(fs.readFileSync(audit.archive));assert.equal(prompts.tasks.length,4);assert.equal(archive.tasks.length,4);
 assert.equal(new Set(prompts.tasks.map(x=>x.task_id)).size,4);
 for(const r of audit.requirements)assert.ok(fs.readFileSync(r.current_contract,'utf8').includes(r.evidence_text),r.requirement);
 for(const task of prompts.tasks){const old=archive.tasks.find(x=>x.task_id===task.task_id),r=audit.prompts.find(x=>x.task_id===task.task_id);assert.ok(old);assert.equal(task.prompt.length,r.after_characters);assert.equal(old.prompt.length,r.before_characters);assert.equal(old.schedule,r.schedule_preserved);assert.ok(task.prompt.includes(task.contract));assert.ok(task.prompt.length<old.prompt.length);}
 assert.equal(archive.status,'SUPERSEDED_HISTORY_NOT_ACTIVE_INSTRUCTIONS');
 const common=fs.readFileSync('docs/automation/current/COMMON.md','utf8');assert.match(common,/320px mobile \/ 1440px desktop/);assert.match(common,/need not be tutorials/);
});

test('index inspection clock stays independent of later editorial candidate-audit clock',()=>{
 const i=input(),audit=i.evidence['edition-bundle'].source_discovery_audit;
 audit.reviewed_at='2026-11-04T02:30:00Z';
 audit.index_review.reviewed_at='2026-11-04T01:20:00Z';
 const o=collectObservations(i);
 assert.equal(o.inspections.length,1);
 assert.equal(o.inspections[0].reviewed_at,'2026-11-04T01:20:00Z');
 audit.index_review.reviewed_at='2026-11-04T03:00:00Z';
 assert.deepEqual(collectObservations(i).inspections,[]);
});
 
test('daily triage flags witnessed failures without waiting for November 11 or rewriting history',()=>{
 const i=input();
 i.combined.compiler_verified=true;
 i.combined.images_released=true;
 i.combined.visual_24_pass=true;
 i.combined.autonomy_status='UNPROVEN';
 i.combined.top10.search_status='INVALID';
 i.combined.charts.charts.find(c=>c.id==='research-coverage').status='NOT_RECORDED';
 const obs=collectObservations(i);
 assert.equal(obs.production_state.compiler,'VERIFIED');
 assert.equal(obs.production_state.premium_images,'RELEASE_AND_VISUAL_VERIFIED');
 const m=buildMetrics({edition,observations:[obs],registry,register});
 const triage=m.daily_action_review;
 assert.equal(triage.mode,'DAILY_EVIDENCE_LED_TRIAGE');
 assert.equal(triage.next_cumulative_review,'2026-11-11');
 assert.equal(triage.open_production_blockers,0);
 for(const code of ['TOP10_SEARCH_EVIDENCE_INVALID','PROTECTED_GATE_FAILURES','SOURCE_INSPECTION_EVIDENCE_MISSING','PREMIUM_IMAGE_REWORK','SCHEDULER_ORIGIN_UNPROVEN'])
  assert.ok(triage.findings.some(f=>f.id===code),code);
 assert.match(renderMetricsMarkdown(m),/Daily corrective-action review/);
 assert.match(renderMetricsMarkdown(m),/November 11|2026-11-11/);
 assert.match(renderMetricsMarkdown(m),/never waits for that date/);
});
test('daily triage prioritizes verified live blockers, does not invent unknown failures',()=>{
 const obs=observation();
 obs.production_state={compiler:'BLOCKED',premium_images:'NOT_RECORDED',top10_search:'NOT_RECORDED',autonomy:'NOT_RECORDED'};
 obs.failures=null;obs.image_rejections=null;obs.metrics.coverage_percent=null;
 const triage=buildDailyActionReview({edition,observation:obs,registered:[]});
 assert.equal(triage.open_production_blockers,1);
 assert.equal(triage.findings[0].id,'PUBLISHING_BLOCKED');
 assert.equal(triage.findings[0].timing,'CURRENT_CYCLE_IF_OWNED');
 assert.equal(triage.findings.some(x=>x.id==='PROTECTED_GATE_FAILURES'),false);
 assert.equal(buildDailyActionReview({edition,observation:null,registered:[]}).finding_count,0);
});
