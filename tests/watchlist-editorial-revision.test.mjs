import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import {renderDailyTopicGroups} from '../vendor/production-reader/snapshot/assets/js/watchlist-daily.js';
import {renderWatchlistEvidence} from '../vendor/production-reader/snapshot/assets/js/watchlist-evidence.js';
import path from 'node:path';
import {applyWatchlistRevision} from '../scripts/apply-watchlist-editorial-revision.mjs';

const old='An October source report identifies a specific agent boundary failure and updates the investigation record.';
const good={
 summary:'Browser agent isolation separates permitted site interactions from disallowed network operations and tool actions.',
 why_now:'A recent corrected incident analysis adds timely evidence about boundary enforcement and responses.',
 practical_value:'Teams can use the incident to design tool-permission tests and independent safety review.'
};
function setup(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'watchlist-copy-only-'));
 const history=path.join(tmp,'history'),out=path.join(tmp,'patched');
 const write=(route,data)=>{const dest=path.join(history,route);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);};
 const topic={topic_id:'dab-topic-browser-agent-evaluation-isolation',name:'Browser agent evaluation isolation',summary:old,why_now:old,practical_value:old,evidence:[{url:'https://publisher.example.org/article'}]};
 write('data/watchlist.json',JSON.stringify({edition_date:'2026-10-13',topics:[topic]}));
 write('watchlist/research/index.html','<section class="wl-card" id="'+topic.topic_id+'"><h2>'+topic.name+'</h2><p>'+old+'</p><p><strong>Why now:</strong> '+old+'</p><p><strong>Potential value:</strong> '+old+'</p></section>');
 for(let i=0;i<6;i++)write('briefs/images/2026-10-13/dab-edition-2026-10-13-m'+i+'.png','pinned-premium-'+i);
 for(let i=0;i<17;i++)write('stories/2026-10-08/historical-'+i+'/index.html','immutable-historical-'+i);
 const revision={schema_version:'daily-compiler-watchlist-editorial-revision-v1',scope:'watchlist_copy_only',requested_by:'owner',edition_date:'2026-10-13',items:[{topic_id:topic.topic_id,topic:topic.name,expected_original_text:old,expected_evidence_url:topic.evidence[0].url,...good}]};
 return {tmp,history,out,revision};
}
test('text-only correction changes exactly HTML and Watchlist JSON and preserves all current premium PNGs',()=>{
 const t=setup();
 try{
 const r=applyWatchlistRevision({revision:t.revision,historySite:t.history,outSite:t.out});
 assert.equal(r.result,'PASS');
 assert.equal(r.corrected_topics,1);
 assert.deepEqual(r.changed.map(c=>c.route).sort(),['data/watchlist.json','watchlist/research/index.html']);
 assert.equal(r.current_premium_pngs_preserved,6);
 assert.equal(r.images_regenerated,0);
 const item=JSON.parse(fs.readFileSync(path.join(t.out,'data/watchlist.json'),'utf8')).topics[0];
 assert.equal(item.practical_value,good.practical_value);
 assert.ok(fs.readFileSync(path.join(t.out,'watchlist/research/index.html'),'utf8').includes(good.why_now));
 assert.equal(fs.readFileSync(path.join(t.out,'briefs/images/2026-10-13/dab-edition-2026-10-13-m0.png'),'utf8'),'pinned-premium-0');
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
test('text-only correction cannot overwrite a newer edition, stale source text or uncorrected duplicate',()=>{
 const t=setup();
 try{
  const newer=structuredClone(t.revision);newer.edition_date='2026-10-14';
  assert.throws(()=>applyWatchlistRevision({revision:newer,historySite:t.history,outSite:t.out}),/latest published Watchlist date/);
  const stale=structuredClone(t.revision);stale.items[0].expected_original_text='stale copy';
  assert.throws(()=>applyWatchlistRevision({revision:stale,historySite:t.history,outSite:t.out}),/expected original repeated copy/);
  const duplicate=structuredClone(t.revision);duplicate.items[0].why_now=duplicate.items[0].summary;
  assert.throws(()=>applyWatchlistRevision({revision:duplicate,historySite:t.history,outSite:t.out}),/repeated or substantially overlapping/);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});

test('score-only correction fills missing rubric scores in both live routes without changing images',()=>{
 const t=setup();
 try{
  const rubric={
   novelty:{score:4,reason:'Verified'},evidence:{score:4,reason:'Verified'},
   independence:{score:2,reason:'Verified'},momentum:{score:null,reason:'Unknown'},
   relevance:{score:5,reason:'Verified'},durability:{score:3,reason:'Verified'}
  };
  const dataPath=path.join(t.history,'data/watchlist.json');
  const data=JSON.parse(fs.readFileSync(dataPath,'utf8'));
  data.topics[0].rubric=rubric;
  fs.writeFileSync(dataPath,JSON.stringify(data));
  const htmlPath=path.join(t.history,'watchlist/research/index.html');
  fs.writeFileSync(htmlPath,fs.readFileSync(htmlPath,'utf8').replace('</section>','<details class="wl-score-details"><summary>How the research score works · /100</summary></details></section>'));
  const revision={
   schema_version:'daily-compiler-watchlist-editorial-revision-v1',
   scope:'watchlist_score_only',requested_by:'owner',edition_date:'2026-10-13',
   expected_topic_count:1,expected_missing_score_count:1
  };
  const result=applyWatchlistRevision({revision,historySite:t.history,outSite:t.out});
  assert.equal(result.result,'PASS');
  assert.equal(result.corrected_topics,1);
  assert.equal(result.missing_scores_after,0);
  assert.equal(result.images_regenerated,0);
  assert.deepEqual(result.changed.map(c=>c.route).sort(),['data/watchlist.json','watchlist/research/index.html']);
  const published=JSON.parse(fs.readFileSync(path.join(t.out,'data/watchlist.json'),'utf8'));
  assert.equal(published.topics[0].research_score,63);
  const html=fs.readFileSync(path.join(t.out,'watchlist/research/index.html'),'utf8');
  assert.match(html,/How the research score works · 63\/100/);
  assert.doesNotMatch(html,/How the research score works · \/100/);
  assert.equal(fs.readFileSync(path.join(t.out,'briefs/images/2026-10-13/dab-edition-2026-10-13-m0.png'),'utf8'),'pinned-premium-0');
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
test('score-only correction refuses a stale topic audit or changed rendered score',()=>{
 const t=setup();
 try{
  const revision={schema_version:'daily-compiler-watchlist-editorial-revision-v1',scope:'watchlist_score_only',requested_by:'owner',
   edition_date:'2026-10-13',expected_topic_count:29,expected_missing_score_count:21};
  assert.throws(()=>applyWatchlistRevision({revision,historySite:t.history,outSite:t.out}),/score audit mismatch/);
  const unscoped={...revision,scope:'watchlist_other'};
  assert.throws(()=>applyWatchlistRevision({revision:unscoped,historySite:t.history,outSite:t.out}),/unsupported revision authorization/);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});

test('rubric correction replaces only demonstrably synthetic 60/100 scores with six grounded explanations',()=>{
 const t=setup();
 try{
  const dataPath=path.join(t.history,'data/watchlist.json');
  const htmlPath=path.join(t.history,'watchlist/research/index.html');
  const record=JSON.parse(fs.readFileSync(dataPath,'utf8'));
  const topic=record.topics[0],badReason='One unreviewed source sentence was recycled across all six criteria.';
  topic.research_score=60;
  topic.rubric=Object.fromEntries(['novelty','evidence','independence','momentum','relevance','durability']
    .map(k=>[k,{score:3,reason:badReason}]));
  topic.momentum={classification:'baseline',score:null,reason:'No comparable past observations establish measurable change.'};
  topic.confidence='moderate';topic.first_detected='2026-10-13';topic.updated_at='2026-10-13T12:00:00Z';
  topic.limitations='Only one original source is available.';topic.next_action='Review another independent source.';
  topic.evidence=[{kind:'primary',url:'https://publisher.example.org/article',title:'Primary article',publisher:'Publisher',checked_at:'2026-10-13',publication_date:'2026-10-13',review_depth:'Article summary',development_id:'primary-1'}];
  fs.writeFileSync(dataPath,JSON.stringify(record));
  const priorHtml=fs.readFileSync(htmlPath,'utf8');
  fs.writeFileSync(htmlPath,priorHtml.replace('</section>',
    '<details class="wl-score-details"><summary>How the research score works · 60/100</summary><p>Old generic rubric</p></details></section>'));
  const statements=[
   'Novelty has a specific testable source-backed technical advance in this example.',
   'An original publisher article provides architecture details, though broader validation remains necessary.',
   'The Watchlist has only one original account and no independently corroborating test.',
   'This first observation lacks prior dated comparable evidence needed to assess momentum.',
   'The topic offers professionals a concrete and bounded trial against known outcomes.',
   'The underlying governance problem persists beyond the particular published product announcement.'
  ];
  const values=[4,4,1,null,5,4],rubric={};
  for(const [i,key] of ['novelty','evidence','independence','momentum','relevance','durability'].entries())
    rubric[key]={score:values[i],reason:statements[i]};
  const revision={schema_version:'daily-compiler-watchlist-editorial-revision-v1',
   scope:'watchlist_rubric_correction',requested_by:'owner',edition_date:'2026-10-13',
   expected_topic_count:1,expected_generic_score_count:1,
   items:[{topic_id:topic.topic_id,topic:topic.name,expected_original_score:60,
     expected_evidence_url:topic.evidence[0].url,rubric}]};
  const result=applyWatchlistRevision({revision,historySite:t.history,outSite:t.out});
  assert.equal(result.result,'PASS');assert.equal(result.corrected_topics,1);
  assert.equal(result.synthetic_sixties_before,1);assert.equal(result.synthetic_sixties_after,0);
  assert.deepEqual(result.changed.map(x=>x.route).sort(),['data/watchlist.json','watchlist/research/index.html']);
  const corrected=JSON.parse(fs.readFileSync(path.join(t.out,'data/watchlist.json'),'utf8'));
  assert.equal(corrected.topics[0].research_score,62);
  const built=fs.readFileSync(path.join(t.out,'watchlist/research/index.html'),'utf8');
  assert.match(built,/How the research score works · 62\/100/);
  assert.match(built,/Independent developments<\/strong><span>1\/5/);
  assert.match(built,/Momentum<\/strong><span>Unknown/);
  assert.doesNotMatch(built,/Old generic rubric|How the research score works · 60\/100/);
  const stale=structuredClone(revision);stale.expected_generic_score_count=2;
  assert.throws(()=>applyWatchlistRevision({revision:stale,historySite:t.history,outSite:path.join(t.tmp,'stale')}),/exact existing-topic/);
  const weaker=structuredClone(revision);weaker.items[0].rubric.independence.score=4;
  assert.throws(()=>applyWatchlistRevision({revision:weaker,historySite:t.history,outSite:path.join(t.tmp,'weak')}),/single original source/);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});


test('a material update moves one topic across every daily view while six images await publication',()=>{
 const t=setup();
 try{
   const date=t.revision.edition_date;
   const reviewedAt=date+'T15:00:00Z';
   const revision=JSON.parse(fs.readFileSync(new URL('../config/watchlist-editorial-revisions/2026-11-24-consumer-agent-permissions.json',import.meta.url)));
   const item=revision.items[0];
   const topic={...good,topic_id:item.topic_id,name:'Test topic',first_detected:'2026-10-02',
     updated_at:'2026-10-08',status:'under_research',confidence:'moderate',evidence:[],
     rubric:item.rubric,research_score:60,momentum:{score:null},next_action:'Review evidence.',limitations:'Initial report.'};
   const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
   item.expected_topic_sha256=digest(JSON.stringify(topic));
   revision.edition_date=date;revision.reviewed_at=reviewedAt;
   for(const e of item.evidence)e.checked_at=reviewedAt;
   const watch={edition_date:date,topics:[topic]};
   const write=(route,bytes)=>{const file=path.join(t.history,route);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
   const card='<section class="wl-card" id="'+topic.topic_id+'"><h2>Test topic</h2><p>'+topic.summary+
     '</p><p><strong>Why now:</strong> '+topic.why_now+'</p><p><strong>Potential value:</strong> '+topic.practical_value+'</p>'+renderWatchlistEvidence(topic)+'</section>';
   const groups=renderDailyTopicGroups(watch);
   const routes=['index.html','latest.html','latest.md','briefs/'+date+'/index.html','watchlist/research/index.html'];
   for(const route of routes)write(route,groups+(route.startsWith('watchlist/')?card:''));
   write('data/watchlist.json',JSON.stringify(watch));
   fs.rmSync(path.join(t.history,'briefs/images/'+date),{recursive:true});
   const job=JSON.stringify({edition_date:date,stories:[1,2,3,4,5,6]});
   write('image-jobs/'+date+'/job.json',job);
   write('image-jobs/index.json',JSON.stringify({editions:[{edition_date:date,status:'PUBLISHED_PENDING',story_count:6,job_sha256:digest(job)}]}));
   const result=applyWatchlistRevision({revision,historySite:t.history,outSite:t.out});
   assert.equal(result.changed.length,6);
   for(const route of routes)assert.match(fs.readFileSync(path.join(t.out,route),'utf8'),/0 new today · 1 updated · 0 carried forward/);
   const updated=JSON.parse(fs.readFileSync(path.join(t.out,'data/watchlist.json'))).topics[0];
   assert.equal(updated.topic_id,topic.topic_id);
   assert.equal(updated.first_detected,topic.first_detected);
   assert.equal(updated.rubric.momentum.score,null);
   assert.equal(updated.evidence.length,item.evidence.length);
   assert.throws(()=>applyWatchlistRevision({revision,historySite:t.out,outSite:t.out+'-again'}),/exact previously published carried topic/);
 }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
