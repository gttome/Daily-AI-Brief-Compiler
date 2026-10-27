import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {renderBriefBuilderSummary} from '../compiler/source-transparency.mjs';
import {
  BRIEF_BUILDER_MD,BRIEF_BUILDER_ROUTE,assertBuilderMarkdown,
  addBuilderToJekyllLayout,addBuilderToPublishedNavigation
} from '../compiler/brief-builder-pages.mjs';
import {prepareBuilderJekyllSource} from '../scripts/prepare-brief-builder-jekyll.mjs';
import {insertBuilderIntoSources,assertBuiltBriefPage,stageBriefBuilderPages}
 from '../scripts/stage-brief-builder-pages.mjs';

const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const header='<li><a href="/Daily-AI-Brief-Compiler/sources/">Sources</a></li>';
const footer='<a href="/Daily-AI-Brief-Compiler/sources/">Sources</a>';
const fakeShell='<nav>'+header+'</nav><footer>'+footer+'</footer>';
const fakeSources=fakeShell+'<nav class="src-nav"><a href="#source-accountability">Our commitments</a></nav>'+
  '<section class="src-section" id="source-accountability">Public commitments</section>';
const caseIds=['manufacturing','healthcare','cybersecurity','education','government'];
function fakeCompiled(){
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+
    '<body><main id="content">'+
    '<h1>From information to a living knowledge system</h1>'+
    '<h2>The difference: connected intelligence, not a topic checklist</h2>'+
    '<h2>The second product: a living knowledge system</h2>'+
    '<p>The Generative AI Professional Series</p>'+
    '<h2>How to start with a Brief Compiler for your own field</h2>'+
    '<style id="brief-compiler-builder-style">@media(max-width:480px){.main-content{padding:1em}}</style>'+
    '<nav class="brief-builder-jump"><a href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/">Home for builder</a></nav>'+
    caseIds.map(x=>'<span id="use-case-'+x+'"></span>').join('')+
    ['genaipromptingguide','genaipro','GenAILearn','reliable-context-engineering']
      .map(x=>'<a href="https://leanpub.com/'+x+'">Book</a>').join('')+
    '</main></body></html>';
}
test('the full website page includes five distinct real scenarios and the four real book links',()=>{
  const markdown=fs.readFileSync(BRIEF_BUILDER_MD,'utf8');
  assert.equal(assertBuilderMarkdown(markdown).scenarios,5);
  for(const title of [
    'Precision manufacturing: a reliability and field-service intelligence brief',
    'Hospital network: evidence-to-practice and clinical training',
    'Security operations: an intelligence-to-defense and playbook brief',
    'University, training company, or professional author: a living curriculum',
    'City or regional government: a climate, infrastructure, and emergency-readiness brief'
  ])assert.ok(markdown.includes(title),title);
  assert.ok(markdown.includes('not a ready-made, one-click platform'));
  assert.ok(markdown.includes('accepts, revises, defers, or rejects'));
});
test('Jekyll source builder uses established site layout with top nav/footer and no new service',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'brief-builder-jekyll-'));
 const out=path.join(dir,'source');
 try{
  const receipt=prepareBuilderJekyllSource({outRoot:out});
  assert.equal(receipt.result,'PASS');
  const layout=fs.readFileSync(path.join(out,'_layouts/default.html'),'utf8');
  assert.equal(layout.split("'/build-your-own-brief-compiler/'").length-1,2);
  assert.ok(fs.readFileSync(path.join(out,'_config.yml'),'utf8').includes('baseurl: "/Daily-AI-Brief-Compiler"'));
  assert.ok(fs.readFileSync(path.join(out,'build-your-own-brief-compiler.md'),'utf8').includes('use-case-manufacturing'));
  assert.throws(()=>prepareBuilderJekyllSource({outRoot:out}),/must_be_new/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Sources summary explains coherent media and human-approved learning updates',()=>{
 const section=renderBriefBuilderSummary();
 assert.ok(section.includes('id="source-builder"'));
 assert.ok(section.includes('editorial coherence'));
 assert.ok(section.includes('author-reviewable proposals'));
 assert.ok(section.includes('Generative AI Professional Series'));
 assert.ok(section.includes('build-your-own-brief-compiler/'));
 const updated=insertBuilderIntoSources(fakeSources);
 assert.equal(updated.split('id="source-builder"').length,2);
 assert.ok(updated.includes('id="source-accountability"'));
 assert.throws(()=>insertBuilderIntoSources(updated),/already_published/);
});
test('home page navigation only adds the new site link without deleting sources',()=>{
 const updated=addBuilderToPublishedNavigation(fakeShell);
 assert.equal(updated.split('href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/"').length-1,2);
 assert.ok(updated.includes(header)&&updated.includes(footer));
 assert.throws(()=>addBuilderToPublishedNavigation(updated),/already_added/);
 const jekyll=fs.readFileSync('vendor/production-reader/snapshot/_layouts/default.html','utf8');
 const future=addBuilderToJekyllLayout(jekyll);
 assert.equal(future.split("'/build-your-own-brief-compiler/'").length-1,2);
 assert.throws(()=>addBuilderToJekyllLayout(future),/already_added/);
});
test('new website route requires Jekyll HTML, 5 valid jump IDs, book links and responsive CSS',()=>{
 assert.doesNotThrow(()=>assertBuiltBriefPage(fakeCompiled()));
 assert.throws(()=>assertBuiltBriefPage(fakeCompiled().replace('use-case-manufacturing','wrong')),
  /use_case_anchor/);
 assert.throws(()=>assertBuiltBriefPage(fakeCompiled().replace('https:\/\/leanpub.com\/genaipro','https://invalid.test')),
  /book_destinations_not_bound/);
});
test('audited live staging adds one page and changes only homepage and Sources text',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'brief-builder-staged-'));
 const old=path.join(tmp,'history'),out=path.join(tmp,'published');
 try{
  fs.mkdirSync(path.join(old,'sources'),{recursive:true});
  fs.mkdirSync(path.join(old,'briefs/2026-10-27'),{recursive:true});
  fs.mkdirSync(path.join(old,'briefs/images/2026-10-27'),{recursive:true});
  fs.writeFileSync(path.join(old,'index.html'),fakeShell);
  fs.writeFileSync(path.join(old,'sources/index.html'),fakeSources);
  const oldEdition=Buffer.from('<article id="original">No editorial changes</article>');
  const originalPng=Buffer.from([137,80,78,71,1,2,4,8,16,32]);
  fs.writeFileSync(path.join(old,'briefs/2026-10-27/index.html'),oldEdition);
  fs.writeFileSync(path.join(old,'briefs/images/2026-10-27/image.png'),originalPng);
  const pagePath=path.join(tmp,'new-page.html');
  fs.writeFileSync(pagePath,fakeCompiled());
  const revision={
    schema_version:'daily-compiler-reading-copy-correction-v1',
    correction_type:'BRIEF_BUILDER_SITE_PAGES',
    scope:'SOURCES_SUMMARY_NEW_BUILDER_PAGE_HOME_NAV_ONLY',
    requested_by:'owner',edition_date:'2026-10-27',
    expected_home_blob_sha:blob(Buffer.from(fakeShell)),
    expected_sources_blob_sha:blob(Buffer.from(fakeSources)),
    expected_builder_markdown_blob_sha:blob(fs.readFileSync(BRIEF_BUILDER_MD))
  };
  const revFile=path.join(tmp,'revision.json');
  fs.writeFileSync(revFile,JSON.stringify(revision));
  const r=stageBriefBuilderPages({revisionFile:revFile,historySite:old,compiledPage:pagePath,outSite:out});
  assert.equal(r.result,'PASS');
  assert.equal(r.files_changed,3);
  assert.equal(r.pages_added,1);
  assert.equal(r.pages_updated,2);
  assert.deepEqual(r.changed.map(x=>x.route),
    ['index.html','sources/index.html',BRIEF_BUILDER_ROUTE]);
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/images/2026-10-27/image.png')),originalPng);
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/2026-10-27/index.html')),oldEdition);
  assert.throws(()=>stageBriefBuilderPages({revisionFile:revFile,historySite:out,
    compiledPage:pagePath,outSite:path.join(tmp,'other')}),/existing_web_route_must_not_be_overwritten/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
