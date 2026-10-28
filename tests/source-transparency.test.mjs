import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {sourceRegistrySummary,renderSourcesExperience,renderSourcesMarkdown,
  replacePublishedSourcesPage} from '../compiler/source-transparency.mjs';
import {correctSourcesPage} from '../scripts/correct-sources-transparency.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const revisionPath='config/reading-copy-revisions/2026-10-27-sources-transparency.json';

test('public registry totals expose discovery eligibility without pretending all sources are monitored',()=>{
 const counts=sourceRegistrySummary(registry);
 assert.deepEqual([counts.registered,counts.enabled,counts.pending],[208,98,110]);
 assert.deepEqual(Object.fromEntries(Object.entries(counts.roles).map(([k,v])=>[k,v.enabled])),
   {article:60,video:6,podcast:21,research:71,watchlist:57});
 assert.equal(counts.roles.article.registered,116);
 assert.equal(counts.roles.video.registered,29);
 assert.equal(counts.roles.podcast.registered,40);
 const copy=renderSourcesExperience(registry);
 assert.equal((copy.match(/class="src-source-card"/g)||[]).length,208);
 assert.equal((copy.match(/<article class="src-source-card"[^>]+data-enabled="true"/g)||[]).length,98);
 assert.equal((copy.match(/<article class="src-source-card"[^>]+data-enabled="false"/g)||[]).length,110);
 assert.match(copy,/Counts are generated from the current protected source registry/);
 assert.match(copy,/not that a website was reached/);
 assert.match(copy,/Unknown measurements remain unknown/);
 assert.match(copy,/6 \+ 2 \+ 2/);
 assert.doesNotMatch(copy,/two videos, and one podcast/);
});
test('newly qualified October 27 article routes are enabled and correctly named',()=>{
 const copy=renderSourcesExperience(registry);
 for(const name of ['Google ADK Release Notes','Hugging Face Blog','Microsoft Research','LlamaIndex Blog',
  'LangChain Blog','Cohere Blog','METR Updates','Arize AI Blog']){
   assert.ok(copy.includes(name),name);
 }
 const ids=['research-20261026-a05','directory-935fbe5ba89ff5f91fc8c69b',
  'directory-411bf5f837e28f35220736eb','directory-3ccc18a956cae0b1e24b5968'];
 for(const id of ids){
   const item=registry.resources.find(x=>x.resource_id===id);
   assert.ok(item?.enabled,id+' must be qualified in current registry');
   assert.ok(copy.includes('data-source-id="'+id+'"'));
 }
 assert.ok(copy.includes('The Rundown AI'));
 assert.ok(copy.includes('TLDR AI'));
 assert.ok(copy.includes('Inoreader'));
 assert.ok(copy.includes('Feedly'));
 assert.ok(copy.includes('not a feature-by-feature benchmark'));
});
test('mobile layout, semantic navigation and self-contained directory interaction are available',()=>{
 const body=renderSourcesExperience(registry);
 const doc=renderSourcesMarkdown(registry);
 assert.match(doc,/^---\nlayout: default\n/);
 assert.match(doc,/permalink: \/sources\//);
 for(const marker of ['id="src-search"','id="src-role"','id="src-state"','id="src-show-more"',
   'id="source-method"','id="source-featured"','id="source-directory"',
   'id="source-difference"','id="source-accountability"']){
   assert.ok(body.includes(marker),marker);
 }
 assert.ok(!body.includes(String.fromCharCode(60)+'style'));
 assert.ok(!body.includes(String.fromCharCode(60)+'script'));
 const js=fs.readFileSync('site-content/sources-transparency.js','utf8');
 const css=fs.readFileSync('site-content/sources-transparency.css','utf8');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.ok(css.includes('@media(max-width:540px)'));
 assert.ok(css.includes('grid-template-columns:1fr'));
});
test('historic published page patch changes main editorial area, keeping site navigation untouched',()=>{
 const prior='<!doctype html><title>Sources and early-signal monitoring</title>'+
  '<h1 class="project-name">Sources and early-signal monitoring</h1>'+
  '<p class="project-tagline">Where the Daily AI Brief and Emerging AI Watch look first.</p>'+
  '    <main id="content" class="main-content" role="main">'+
  '\n<p>Original ten channels</p>\n'+
  '      <footer class="site-footer"><nav><a href="/Daily-AI-Brief-Compiler/">Home</a></nav></footer>'+
  '</main><script src="/assets/js/watchlist.js"></script>';
 const updated=replacePublishedSourcesPage(prior,registry);
 assert.ok(updated.includes('id="sources-transparency"'));
 assert.ok(updated.includes('Sources, evidence &amp; the Brief Compiler'));
 assert.ok(updated.includes('<footer class="site-footer"><nav><a'));
 assert.ok(updated.includes('<script src="/assets/js/watchlist.js"></script>'));
 assert.equal((updated.match(/class="src-source-card"/g)||[]).length,208);
 assert.throws(()=>replacePublishedSourcesPage(updated,registry),/already_corrected/);
});
test('current protected owner correction manifest matches exact source snapshot',()=>{
 const revision=JSON.parse(fs.readFileSync(revisionPath,'utf8'));
 const stats=sourceRegistrySummary(registry);
 assert.equal(revision.expected_registry_blob_sha,blob(fs.readFileSync('config/resource-registry.json')));
 assert.deepEqual(revision.expected_counts,
   {catalogued:stats.registered,enabled:stats.enabled,pending:stats.pending});
});
test('live correction has a single legal route; all other mock public and image bytes persist',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sources-transparency-'));
 const history=path.join(tmp,'history'),out=path.join(tmp,'out');
 const rev=JSON.parse(fs.readFileSync(revisionPath,'utf8'));
 const oldPage='    <main id="content" class="main-content" role="main">'+
  '<h2>Old sources</h2>\n      <footer class="site-footer">Original footer</footer></main>';
 try{
  fs.mkdirSync(path.join(history,'sources'),{recursive:true});
  fs.mkdirSync(path.join(history,'briefs/images/2026-10-27'),{recursive:true});
  fs.mkdirSync(path.join(history,'briefs/2026-10-27'),{recursive:true});
  fs.writeFileSync(path.join(history,'sources/index.html'),oldPage);
  const originalImage=Buffer.from([137,80,78,71,13,10,0,19,8,2,5,4,13,18]);
  fs.writeFileSync(path.join(history,'briefs/images/2026-10-27/premium.png'),originalImage);
  const oldEdition=Buffer.from('<h1>Original dated edition must never change</h1>');
  fs.writeFileSync(path.join(history,'briefs/2026-10-27/index.html'),oldEdition);
  const revFile=path.join(tmp,'revision.json');
  rev.expected_previous_sources_blob_sha=blob(Buffer.from(oldPage));
  fs.writeFileSync(revFile,JSON.stringify(rev));
  const receipt=correctSourcesPage({revisionFile:revFile,historySite:history,outSite:out});
  assert.equal(receipt.result,'PASS');
  assert.equal(receipt.source_records,208);
  assert.deepEqual(receipt.changed.map(x=>x.route),['sources/index.html']);
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/images/2026-10-27/premium.png')),originalImage);
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/2026-10-27/index.html')),oldEdition);
  assert.throws(()=>correctSourcesPage({revisionFile:revFile,historySite:out,
    outSite:path.join(tmp,'invalid')}),/public_sources_page_changed_since_owner_review/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
