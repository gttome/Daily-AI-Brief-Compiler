import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
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
