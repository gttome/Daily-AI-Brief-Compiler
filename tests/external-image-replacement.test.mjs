import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  slotsFor,replaceSingleTag,verifyNoOtherChanges,prepareExternalImageReplacement
} from '../scripts/prepare-external-image-replacement.mjs';

const DATE='2026-10-11';
const base='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const story={id:'distinct-mechanism',headline:'Mechanism deployment',image_alt_intent:'Layered schematic of a source-bound interaction',
  focus:'Technical AI Engineering',permanent_route:'/stories/'+DATE+'/distinct-mechanism/'};
const original='<main><h2>Immutable original story text</h2><p>Real source and book bridges remain.</p><img src="'+base+'briefs/images/'+DATE+'/illustration-pending.svg?v=fe54b845623b" alt="Illustration pending for '+story.headline+'. Planned illustration: '+story.image_alt_intent+'"></main>';
const image=base+'briefs/images/'+DATE+'/dab-edition-'+DATE+'-m01.png?v=123456789abc';
test('only original exact story-specific placeholder img src and alt change; text survives byte-for-byte',()=>{
  const patched=replaceSingleTag(original,story,image);
  assert.match(patched,/<h2>Immutable original story text<\/h2>/);
  assert.match(patched,/Real source and book bridges remain/);
  assert.match(patched,/dab-edition-2026-10-11-m01\.png\?v=123456789abc/);
  assert.match(patched,/alt="Layered schematic of a source-bound interaction"/);
  assert.equal(patched.replace(/<img\b[^>]*>/,'<REPLACED>'),original.replace(/<img\b[^>]*>/,'<REPLACED>'));
  assert.throws(()=>replaceSingleTag(patched,story,image),/exactly_one_original_placeholder/);
});
test('wrong source, duplicate figure and nonexistent story fail without silently modifying unrelated HTML',()=>{
  const wrong=original.replace('illustration-pending.svg','prior-accepted.png');
  assert.throws(()=>replaceSingleTag(wrong,story,image),/not_an_original_pending_image/);
  assert.throws(()=>replaceSingleTag(original+original,story,image),/exactly_one_original_placeholder/);
  assert.throws(()=>replaceSingleTag('<p>untouched</p>',story,image),/exactly_one_original_placeholder/);
});
test('equivalent HTML attribute encodings match exactly without weakening story or source identity',()=>{
  const quoted={...story,headline:"Asana's research & tools",image_alt_intent:'A "quoted" input < boundary'};
  const text='Illustration pending for '+quoted.headline+'. Planned illustration: '+quoted.image_alt_intent;
  const encode=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const raw=original.replace(/alt="[^"]*"/,'alt="'+encode(text)+'"');
  for(const variant of [raw,raw.replaceAll("'",'&#39;'),raw.replaceAll("'",'&#x27;'),raw.replaceAll("'",'&apos;')]){
    assert.match(replaceSingleTag(variant,quoted,image),/dab-edition-2026-10-11-m01/);
    assert.throws(()=>replaceSingleTag(variant.replace('research','different'),quoted,image),/exactly_one_original_placeholder/);
    assert.throws(()=>replaceSingleTag(variant.replace('illustration-pending.svg','already-accepted.png'),quoted,image),/not_an_original_pending_image/);
    assert.throws(()=>replaceSingleTag(variant+variant,quoted,image),/exactly_one_original_placeholder/);
  }
});
test('reviewed accepted-image alt replaces planning text and preserves all other HTML bytes',()=>{
  const accepted='Cached prefix & new input; the operator\'s reviewed "request" assembly.';
  const patched=replaceSingleTag(original,story,image,accepted);
  assert.match(patched,/alt="Cached prefix &amp; new input; the operator&#39;s reviewed &quot;request&quot; assembly\."/);
  assert.equal(patched.replace(/<img\b[^>]*>/,'<REPLACED>'),original.replace(/<img\b[^>]*>/,'<REPLACED>'));
  assert.throws(()=>replaceSingleTag(original,story,image,''),/missing_reviewed_alt/);
});
test('focus-bound reader slots are unique and exact 2/2/2, no guessed order',()=>{
  const stories=['Technical AI Engineering','Technical AI Engineering','Applied Generative AI for Knowledge Workers','Applied Generative AI for Knowledge Workers','Agents for Everyone','Agents for Everyone'].map((focus,i)=>({id:'story'+i,focus}));
  const slots=slotsFor({stories});
  assert.deepEqual([...slots.values()],['m01','m02','m10','m11','m12','m14']);
  assert.throws(()=>slotsFor({stories:[...stories,stories[0]]}),/canonical_image_slot/);
  assert.throws(()=>slotsFor({stories:stories.slice(1)}),/six_canonical_slots/);
});
test('unaltered archived files must compare byte-identically, disallow hidden new or deleted pages',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'image-only-pages-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const hist=path.join(root,'historical'),output=path.join(root,'staged');
  for(const dir of [hist,output]){fs.mkdirSync(path.join(dir,'pages'),{recursive:true});fs.writeFileSync(path.join(dir,'pages','one.html'),'original');}
  assert.equal(verifyNoOtherChanges(hist,output,new Set()),1);
  fs.writeFileSync(path.join(output,'pages','one.html'),'mutated');
  assert.throws(()=>verifyNoOtherChanges(hist,output,new Set()),/unrelated_reader_byte_modified/);
  assert.equal(verifyNoOtherChanges(hist,output,new Set(['pages/one.html'])),0);
  fs.writeFileSync(path.join(output,'extra.html'),'unexpected');
  assert.throws(()=>verifyNoOtherChanges(hist,output,new Set(['pages/one.html'])),/unexpected_new_site_file/);
});
test('preparation does not touch October 8 or page history for an unpublished or fake external job',()=>{
  const bundleBytes=Buffer.from(JSON.stringify({edition_date:DATE,image_representation:{status:'images_pending'},stories:[]}));
  const jobBytes=Buffer.from(JSON.stringify({schema_version:'external-compiler-image-job-v1',lifecycle:'PUBLISHED_PENDING',edition_date:DATE}));
  const args={job:{schema_version:'external-compiler-image-job-v1',lifecycle:'PUBLISHED_PENDING',edition_date:DATE,
    source:{bundle_sha256:'0'.repeat(64),branch:'shadow/'+DATE}},jobBytes,bundleBytes,
    state:{state:'SHADOW_FAILED',stage:'IMAGES',edition_date:DATE,images:{accepted:[]}},
    manifest:{job_sha256:'0'.repeat(64)},stagingReceipt:null,historyRoot:'/nonexistent/history',
    outputRoot:'/nonexistent/new',repoRoot:'/nonexistent/repo',historyHead:'f'.repeat(40)};
  assert.throws(()=>prepareExternalImageReplacement(args),/unqualified_stale_or_unpublished_source/);
});
