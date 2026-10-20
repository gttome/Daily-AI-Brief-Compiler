import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {removeGenericEarlierBrief,correctGenericRelatedCoverage} from '../scripts/correct-generic-related-coverage.mjs';

const dates=['2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19'];
const panel=(date)=>{
  const d=Number(date.slice(-2));
  const explanation=d<15?'See companion October '+d+' coverage for evaluation, knowledge-worker applications and safe delegation.':
    'Other October '+d+' stories examine evaluation, agent safety and professional procedures.';
  return '<div class="related-coverage"><strong>Earlier Brief</strong><p>'+
    '<a href="https://gttome.github.io/Daily-AI-Brief-Compiler/stories/2026-10-06/copilot-moves-from-chat-into-desktop-computer-use/" target="_blank" rel="noopener noreferrer">Copilot moves from chat</a>'+
    '</p><p>2026-10-06 · '+explanation+'</p></div>';
};
const revision={
  schema_version:'daily-compiler-reading-copy-correction-v1',
  correction_id:'DAB-READER-EARLIER-20261019-001',
  correction_type:'UNVERIFIED_EARLIER_BRIEF_TEXT_ONLY',
  edition_dates:dates,
  scope:'UNVERIFIED_HISTORICAL_LINKS_ONLY',
  reason:'Remove generic links without editorial resealing'
};
function fixture(latest='2026-10-19'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'related-reader-test-'));
  const site=path.join(dir,'site'),out=path.join(dir,'out');
  const write=(relative,content)=>{
    const file=path.join(site,relative);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,content);
  };
  for(const date of dates){
    write('briefs/'+date+'/index.html','<html>'+date+panel(date).repeat(6)+'<p>Canonical summary and Why it matters.</p></html>');
    for(let i=0;i<6;i++)write('stories/'+date+'/item-'+i+'/index.html','<html>'+date+panel(date)+'<p>Original story content intact</p></html>');
  }
  const overview='<html>2026-10-19'+panel('2026-10-19').repeat(6)+'<p>Keep canonical story copy</p></html>';
  for(const route of ['index.html','latest.html','latest.md'])
    write(route,latest==='2026-10-19'?overview:'<html>'+latest+'<p>Newer edition untouched</p></html>');
  write('data/archive-index.json',JSON.stringify({schema_version:'1.0.0',stories:[{content_type:'Article',brief_date:latest}]}));
  write('data/watchlist.json','{"preserved":true}');
  write('stories/2026-10-12/untouched/index.html','genuinely specific Earlier Brief comparison');
  write('briefs/images/2026-10-19/accepted.png','accepted immutable image bytes');
  for(let i=0;i<5;i++)write('briefs/images/2026-10-18/accepted-'+i+'.png','immutable image '+i);
  const revisionPath=path.join(dir,'revision.json');
  fs.writeFileSync(revisionPath,JSON.stringify(revision));
  return {dir,site,out,revisionPath,receiptFile:path.join(dir,'receipt.json')};
}
test('removes only October 13–19 generic earlier-brief panels including latest routes',()=>{
  const f=fixture();
  try{
    const result=correctGenericRelatedCoverage({revisionFile:f.revisionPath,siteDir:f.site,outDir:f.out,receiptFile:f.receiptFile});
    assert.equal(result.files_changed,52);
    assert.equal(result.panels_removed,102);
    assert.equal(result.editions_corrected,7);
    assert.equal(result.homepage_latest_changed,true);
    assert.equal(result.accepted_png_files_byte_preserved,6);
    assert.equal(fs.readFileSync(path.join(f.out,'data/watchlist.json'),'utf8'),'{"preserved":true}');
    assert.equal(fs.readFileSync(path.join(f.out,'stories/2026-10-12/untouched/index.html'),'utf8'),'genuinely specific Earlier Brief comparison');
    assert.equal(fs.readFileSync(path.join(f.out,'briefs/images/2026-10-19/accepted.png'),'utf8'),'accepted immutable image bytes');
    assert.ok(fs.readFileSync(path.join(f.out,'index.html'),'utf8').includes('Keep canonical story copy'));
    assert.ok(!fs.readFileSync(path.join(f.out,'index.html'),'utf8').includes('Earlier Brief'));
    assert.ok(fs.existsSync(f.receiptFile));
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('when a later brief is current, leave homepage/latest byte for byte unchanged',()=>{
  const f=fixture('2026-10-20');
  try{
    const before=fs.readFileSync(path.join(f.site,'index.html'),'utf8');
    const result=correctGenericRelatedCoverage({revisionFile:f.revisionPath,siteDir:f.site,outDir:f.out,receiptFile:f.receiptFile});
    assert.equal(result.files_changed,49);
    assert.equal(result.panels_removed,84);
    assert.equal(result.homepage_latest_changed,false);
    assert.equal(fs.readFileSync(path.join(f.out,'index.html'),'utf8'),before);
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('refuse to delete a substantive relation or a different-date historical link',()=>{
  const specific=panel('2026-10-19').replace('Other October 19 stories examine evaluation, agent safety and professional procedures.','The linked Copilot desktop article documents the permission boundary that the new story makes technically enforceable.');
  assert.throws(()=>removeGenericEarlierBrief(specific,{editionDate:'2026-10-19',expectedCount:1}),/not generic/);
  assert.throws(()=>removeGenericEarlierBrief(panel('2026-10-19').replace('/2026-10-06/','/2026-10-05/'),{editionDate:'2026-10-19',expectedCount:1}),/October 6 fixture/);
  assert.throws(()=>removeGenericEarlierBrief(panel('2026-10-19'),{editionDate:'2026-10-19',expectedCount:6}),/panel count/);
});
