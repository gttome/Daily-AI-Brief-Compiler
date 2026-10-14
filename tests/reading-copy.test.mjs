import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {removeRedundantReadingCopy,assertCleanReadingCopy,READING_COPY_EFFECTIVE} from '../compiler/reading-copy.mjs';
import {correctPublishedReadingCopy} from '../scripts/correct-reading-duplication.mjs';

const date=READING_COPY_EFFECTIVE;
const summary="Publisher's original report describes an agent tool with evidence.";
const why='Use a bounded review & approval before installing.';
const normalizeSource=(s)=>s.replaceAll("'",'&#39;').replaceAll('& ','&amp; ');
function item(){
  return '<h2>Reader article</h2><aside class="reading-context" aria-label="Reading context">'+
    '<div class="reading-meta">Source article · about 4 min read</div>'+
    '<p><strong>Agent Skills:</strong> '+normalizeSource(summary)+'</p>'+
    '<div class="learning-outcome"><strong>What you’ll learn</strong><p>'+normalizeSource(why)+'</p></div>'+
    '<div class="related-coverage"><strong>Earlier Brief</strong><p>Related historical coverage</p></div></aside>'+
    '<p><strong>Summary:</strong> '+summary+'</p>'+
    '<p><strong>Why it matters:</strong> '+why+'</p>'+
    '<p><strong>Source:</strong> <a href="https://example.org">Primary evidence</a></p>';
}
test('removes only repeated intro, retaining canonical copy, evidence, reading time and Earlier Brief',()=>{
  const source=item();
  const out=removeRedundantReadingCopy(source,{editionDate:date,requireCopies:true});
  assert.equal(out.removed,1);
  assert.equal(out.html.includes('What you’ll learn'),false);
  assert.equal(out.html.includes('Agent Skills:</strong>'),false);
  for(const part of ['Source article · about 4 min read','Earlier Brief','Summary:</strong>','Why it matters:</strong>','Primary evidence'])
    assert.ok(out.html.includes(part),part);
  assertCleanReadingCopy(out.html,{editionDate:date});
  assert.equal(removeRedundantReadingCopy(source,{editionDate:'2026-10-13'}).html,source);
});
test('does not delete genuinely distinct explanatory editorial context',()=>{
  const distinct=item().replace('Agent Skills:</strong> '+normalizeSource(summary),'Agent Skills:</strong> Independently written additional detail.');
  assert.throws(()=>removeRedundantReadingCopy(distinct,{editionDate:date,requireCopies:true}),/editorially distinct/);
});
test('new edition validator fails on redundant learning outcome',()=>{
  assert.throws(()=>assertCleanReadingCopy(item(),{editionDate:date}),/What you’ll learn/);
  assert.doesNotThrow(()=>assertCleanReadingCopy(item(),{editionDate:'2026-10-13'}));
});
test('text-only postpublication correction changes exactly 13 HTML routes and preserves every other file byte for byte',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'compiler-reader-copy-'));
  try{
    const site=path.join(dir,'site'),out=path.join(dir,'patched');
    const write=(relative,body)=>{
      const f=path.join(site,relative);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,body);
    };
    const mediaOnly='<p><strong>Summary:</strong> Video overview.</p><p><strong>Why it matters:</strong> Check boundaries.</p>';
    const overview='<html>'+date+item().repeat(8)+mediaOnly.repeat(2)+'</html>';
    write('index.html',overview);
    write('latest.html',overview);
    write('briefs/'+date+'/index.html',overview);
    for(let i=0;i<6;i++)write('stories/'+date+'/article-'+i+'/index.html',date+item());
    for(let i=0;i<2;i++)write('videos/'+date+'/video-'+i+'/index.html',date+item());
    for(let i=0;i<2;i++)write('podcasts/'+date+'/podcast-'+i+'/index.html',date+item());
    const image='<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    write('briefs/images/'+date+'/illustration-pending.svg',image);
    write('stories/2026-10-13/stable/index.html','old edition must not change');
    write('data/watchlist.json','{"stable":true}');
    const revision=path.join(dir,'revision.json');
    fs.writeFileSync(revision,JSON.stringify({
      schema_version:'daily-compiler-reading-copy-correction-v1',edition_date:date,
      correction_id:'test-only',correction_type:'DUPLICATED_READING_SUPPORT_TEXT_ONLY',
      reason:'published duplicate content'
    }));
    const receipt=correctPublishedReadingCopy({revisionFile:revision,siteDir:site,outDir:out,receiptFile:path.join(dir,'receipt.json')});
    assert.equal(receipt.result,'PASS');
    assert.equal(receipt.files_changed,13);
    assert.equal(receipt.repeated_blocks_removed,34);
    assert.equal(receipt.current_image_files_byte_preserved,1);
    assert.equal(fs.readFileSync(path.join(out,'stories/2026-10-13/stable/index.html'),'utf8'),'old edition must not change');
    assert.equal(fs.readFileSync(path.join(out,'briefs/images/'+date+'/illustration-pending.svg'),'utf8'),image);
    assert.equal(fs.readFileSync(path.join(out,'data/watchlist.json'),'utf8'),'{"stable":true}');
    assert.ok(!fs.readFileSync(path.join(out,'index.html'),'utf8').includes('What you’ll learn'));
    assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8').includes('Earlier Brief'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('future compiler suppresses repeated support in a copied reader, without altering the vendor snapshot',()=>{
  const materializer=fs.readFileSync(new URL('../compiler/reader-materializer.mjs',import.meta.url),'utf8');
  const vendor=fs.readFileSync(new URL('../vendor/production-reader/snapshot/_generator/lib/reading-support.mjs',import.meta.url),'utf8');
  assert.ok(materializer.includes('suppressRepeatedReaderContext(outDir)'));
  assert.ok(materializer.includes("const contextBlock=date>='2026-10-14'?'':x?"));
  assert.ok(vendor.includes('const contextBlock=x?'));
});
