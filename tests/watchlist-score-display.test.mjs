import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {repairWatchlistScoreVisibility} from '../scripts/correct-watchlist-score-visibility.mjs';

const canonicalPath='vendor/production-reader/snapshot/assets/js/watchlist.js';
const original=fs.readFileSync(canonicalPath,'utf8');
const helper=original.match(/^function researchScore\(t\)\{.*\}$/m)?.[0];
const anchor='${renderWatchlistEvidence(t)}${researchScore(t)}<fieldset class="wl-question">';
const oldAnchor='${renderWatchlistEvidence(t)}<fieldset class="wl-question">';
const shaBlob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function setup(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'watchlist-score-display-'));
  const history=path.join(tmp,'history'),out=path.join(tmp,'out');
  for(const sub of ['assets/js','data','watchlist/research','briefs/2026-10-27'])
    fs.mkdirSync(path.join(history,sub),{recursive:true});
  const runtime=original.replace(helper+'\n','').replace(anchor,oldAnchor);
  fs.writeFileSync(path.join(history,'assets/js/watchlist.js'),runtime);
  const topics=Array.from({length:50},(_,i)=>({topic_id:'dab-topic-'+i,research_score:55+i%23}));
  const data={edition_date:'2026-10-27',topics};
  fs.writeFileSync(path.join(history,'data/watchlist.json'),JSON.stringify(data));
  fs.writeFileSync(path.join(history,'briefs/2026-10-27/index.html'),'<html>Published original reader</html>');
  fs.writeFileSync(path.join(history,'watchlist/research/index.html'),topics.map(t=>
    '<section class="wl-card" id="'+t.topic_id+'"><details><summary>How the research score works · '+
    t.research_score+'/100</summary></details></section>').join('\n'));
  const revision={
    schema_version:'daily-compiler-reading-copy-correction-v1',
    correction_type:'WATCHLIST_RESEARCH_SCORE_DISPLAY_ONLY',edition_date:'2026-10-27',
    scope:'WATCHLIST_RUNTIME_JS_ONLY',requested_by:'owner',expected_topic_count:50,
    expected_previous_runtime_blob_sha:shaBlob(Buffer.from(runtime))
  };
  const revisionFile=path.join(tmp,'revision.json');
  fs.writeFileSync(revisionFile,JSON.stringify(revision));
  return {tmp,history,out,topics,revisionFile,runtime,revision};
}
test('canonical Watchlist cards show a distinct, source-derived research score before interest voting',()=>{
  assert.ok(helper,'canonical score formatter exists');
  assert.ok(original.includes(anchor),'each voting card includes the scored research summary');
  for(const value of [0,55,75,100]){
    const html=vm.runInNewContext(helper+'\nresearchScore({topic_id:"dab-topic-test",research_score:'+value+'})',
      {base:'/Daily-AI-Brief-Compiler',e:s=>String(s)});
    assert.match(html,new RegExp('Research score: '+value+'/100'));
    assert.match(html,/watchlist\/research\/#dab-topic-test/);
    assert.match(html,/separate from reader voting/);
  }
  const missing=vm.runInNewContext(helper+'\nresearchScore({topic_id:"dab-topic-test",research_score:null})',
      {base:'/Daily-AI-Brief-Compiler',e:s=>String(s)});
  assert.match(missing,/Research score: Not assessed/);
});
test('published Oct27 correction patches only the voting card runtime, preserving 50 scores and all other bytes',()=>{
  const t=setup();
  try{
    const receipt=repairWatchlistScoreVisibility({revisionFile:t.revisionFile,historySite:t.history,outSite:t.out});
    assert.equal(receipt.result,'PASS');
    assert.equal(receipt.watchlist_topic_count,50);
    assert.equal(receipt.graded_topic_count,50);
    assert.deepEqual(receipt.changed.map(x=>x.route),['assets/js/watchlist.js']);
    assert.equal(receipt.no_watchlist_content_change,true);
    const corrected=fs.readFileSync(path.join(t.out,'assets/js/watchlist.js'),'utf8');
    assert.ok(corrected.includes(anchor));
    assert.ok(corrected.includes(helper));
    assert.ok(!t.runtime.includes('function researchScore(t)'));
    assert.equal(fs.readFileSync(path.join(t.out,'data/watchlist.json'),'utf8'),
                 fs.readFileSync(path.join(t.history,'data/watchlist.json'),'utf8'));
    assert.equal(fs.readFileSync(path.join(t.out,'briefs/2026-10-27/index.html'),'utf8'),
                 fs.readFileSync(path.join(t.history,'briefs/2026-10-27/index.html'),'utf8'));
    execFileSync(process.execPath,['--check',path.join(t.out,'assets/js/watchlist.js')],{stdio:'pipe'});
    assert.throws(()=>repairWatchlistScoreVisibility({
      revisionFile:t.revisionFile,historySite:t.out,outSite:path.join(t.tmp,'duplicate')
    }),/published_runtime_changed_since_owner_report/);
  }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
test('correction refuses a changed published runtime or unsupported score census',()=>{
  const t=setup();
  try{
    fs.appendFileSync(path.join(t.history,'assets/js/watchlist.js'),'\n// changed');
    assert.throws(()=>repairWatchlistScoreVisibility({
      revisionFile:t.revisionFile,historySite:t.history,outSite:t.out
    }),/published_runtime_changed_since_owner_report/);
    fs.writeFileSync(path.join(t.history,'assets/js/watchlist.js'),t.runtime);
    const file=path.join(t.history,'data/watchlist.json');
    const v=JSON.parse(fs.readFileSync(file,'utf8'));
    v.topics[0].research_score=null;
    fs.writeFileSync(file,JSON.stringify(v));
    assert.throws(()=>repairWatchlistScoreVisibility({
      revisionFile:t.revisionFile,historySite:t.history,outSite:t.out
    }),/published_watchlist_score_census_mismatch/);
  }finally{fs.rmSync(t.tmp,{recursive:true,force:true});}
});
