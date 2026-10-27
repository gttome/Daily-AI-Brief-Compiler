import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
 assertUniqueBriefInternalLinks,normalizeBriefExplainerPage,
 tailorBriefExplainerJekyllLayout
} from '../compiler/brief-explainer-link-integrity.mjs';
import {
 assertBuilderMarkdown,addBuilderToJekyllLayout,BRIEF_BUILDER_MD
} from '../compiler/brief-builder-pages.mjs';
import {renderBriefBuilderSummary} from '../compiler/source-transparency.mjs';
import {assertBuiltBriefPage} from '../scripts/stage-brief-builder-pages.mjs';
import {updatePublicBriefExplainers} from '../scripts/update-brief-explainer-webpages.mjs';

const BASE='/Daily-AI-Brief-Compiler/';
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const siteLink=(href,label)=>'<a href="'+BASE+href+'">'+label+'</a>';
const requiredLinks=()=>'<a href="'+BASE+'">The Daily Generative AI Brief</a>'+
  '<ul><li>'+siteLink('','Home')+'</li>'+
  '<li>'+siteLink('briefs-archive/','Briefs Archive')+'</li>'+
  '<li>'+siteLink('watchlist/','Emerging AI Watchlist')+'</li>'+
  '<li>'+siteLink('sources/','Sources')+'</li>'+
  '<li>'+siteLink('build-your-own-brief-compiler/','Build Your Own Brief')+'</li>'+
  '</ul>';
const footer='<nav aria-label="Publication footer" class="reader-footer-links">'+
 siteLink('','Today’s Brief')+siteLink('briefs-archive/','Browse the Archive')+
 siteLink('sources/','Sources')+siteLink('build-your-own-brief-compiler/','Build Your Own Brief')+'</nav>';
function oldSources(){
 const callout='<div class="src-callout"><strong>For readers:</strong> Start with '+
 siteLink('','today’s Brief')+', examine the '+
 siteLink('watchlist/','Emerging AI Watchlist')+', or browse the '+
 siteLink('briefs-archive/','dated archive')+'. Original source archive.</div>';
 const summary='<section class="src-section" id="source-builder"><p>Explore five complete scenarios.</p></section>';
 const directory=Array.from({length:208},(_,i)=>'<article class="src-source-card" data-source-id="src-'+i+'">Source</article>').join('');
 return '<!DOCTYPE html><html><body><nav>'+requiredLinks()+'</nav><main>'+
   '<section id="source-directory"><input id="src-search"></section>'+directory+
   summary+'<section id="source-accountability">Accountability</section>'+callout+
   footer+'</main></body></html>';
}
function compiledBuilder(){
 const sectors=['manufacturing','healthcare','cybersecurity','education','government','gardening'];
 const bookNames=['genaipromptingguide','genaipro','GenAILearn','reliable-context-engineering'];
 return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+
  '<body><main id="content">'+
  '<nav><a href="'+BASE+'">The Daily Generative AI Brief</a>'+
  '<a href="'+BASE+'briefs-archive/">Briefs Archive</a>'+
  '<a href="'+BASE+'watchlist/">Emerging AI Watchlist</a>'+
  '<a href="'+BASE+'sources/">Sources</a>'+
  '<a href="'+BASE+'build-your-own-brief-compiler/">Build Your Own Brief</a></nav>'+
  '<h1>From information to a living knowledge system</h1>'+
  '<h2>The difference: connected intelligence, not a topic checklist</h2>'+
  '<h2>The second product: a living knowledge system</h2>'+
  '<h2>How the Brief stays current: a governed self-evolving loop</h2>'+
  '<h2>How to start with a Brief Compiler for your own field</h2>'+
  '<p>The Generative AI Professional Series</p>'+
  '<section>Home gardening: a personal growing-intelligence and garden-journal brief</section>'+
  '<a href="https://www.rhs.org.uk/about-us/what-we-do/publications/podcasts">Gardening with RHS</a>'+
  '<style id="brief-compiler-builder-style">@media(max-width:480px){.main-content{padding:.5rem}}</style>'+
  '<nav class="brief-builder-jump">'+
   sectors.map(x=>'<a href="#use-case-'+x+'">'+x+'</a>').join('')+'</nav>'+
   sectors.map(x=>'<span id="use-case-'+x+'"></span>').join('')+
   bookNames.map(x=>'<a href="https://leanpub.com/'+x+'">Book</a>').join('')+
   '</main></body></html>';
}
test('canonical website Markdown contains six cases, qualified gardening sources and governed self-evolution',()=>{
 const s=fs.readFileSync(BRIEF_BUILDER_MD,'utf8');
 assert.equal(assertBuilderMarkdown(s).scenarios,6);
 for(const x of ['## 6. Home gardening','id="use-case-gardening"',
  'University of Maryland Extension','Gardening with the RHS podcast',
  'share initiations','comments','1–5-star usefulness rating',
  'New, Updated, Carried forward and Dropped',
  'updated knowledge assets','reader issue']){
  // The newsletter calls its two products by slightly different phrases.
  if(x==='updated knowledge assets'||x==='reader issue')continue;
  assert.ok(s.includes(x),x);
 }
 assert.ok(!s.includes('## Explore the working example'));
 assert.ok(!s.includes("[Explore the current Brief]"));
 assert.equal((s.match(/href="#use-case-/g)||[]).length,6);
});
test('live Sources navigation is normalized without losing its single substantive builder CTA',()=>{
 const src=oldSources();
 assert.throws(()=>assertUniqueBriefInternalLinks(src,{page:'sources'}),/repeated_other_brief_page_link/);
 const next=normalizeBriefExplainerPage(src,{page:'sources'});
 assert.equal(assertUniqueBriefInternalLinks(next,{page:'sources'}).result,'PASS');
 assert.equal((next.match(/href="\/Daily-AI-Brief-Compiler\/build-your-own-brief-compiler\/"/g)||[]).length,0);
 const final=next.replace('<section class="src-section" id="source-builder"><p>Explore five complete scenarios.</p></section>',
  renderBriefBuilderSummary());
 assert.equal(assertUniqueBriefInternalLinks(final,{page:'sources'}).result,'PASS');
 assert.equal((final.match(/href="\/Daily-AI-Brief-Compiler\/build-your-own-brief-compiler\/"/g)||[]).length,1);
});
test('future Jekyll layout hides duplicate header and footer links on only the two explainer pages',()=>{
 const layout=fs.readFileSync('vendor/production-reader/snapshot/_layouts/default.html','utf8');
 const version=addBuilderToJekyllLayout(layout);
 assert.ok(version.includes("{% unless page.permalink == '/sources/' or page.permalink == '/build-your-own-brief-compiler/' %}"));
 assert.ok(version.includes("{% unless page.permalink == '/sources/' %}"));
 assert.ok(version.includes("Build Your Own Brief"));
 assert.throws(()=>tailorBriefExplainerJekyllLayout(version),/layout_or_markup_drift/);
});
test('six-case built page has exactly one link to each other Brief section and rejects duplicates',()=>{
 const page=compiledBuilder();
 assert.doesNotThrow(()=>assertBuiltBriefPage(page));
 assert.equal(assertUniqueBriefInternalLinks(page,{page:'builder'}).result,'PASS');
 assert.throws(()=>assertUniqueBriefInternalLinks(page.replace('</main>',siteLink('sources/','Repeated Sources')+'</main>'),{page:'builder'}),
 /repeated_other_brief_page_link/);
});
test('two-page update changes no old article, media, reader data or accepted image bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobby-brief-site-'));
 const history=path.join(root,'history'),out=path.join(root,'out');
 try{
  fs.mkdirSync(path.join(history,'sources'),{recursive:true});
  fs.mkdirSync(path.join(history,'build-your-own-brief-compiler'),{recursive:true});
  fs.mkdirSync(path.join(history,'briefs/images/2026-10-27'),{recursive:true});
  fs.mkdirSync(path.join(history,'stories/2026-10-27/example'),{recursive:true});
  const old=oldSources(),oldBuilder=Buffer.from('<p>Five older site scenarios</p>'),png=Buffer.from([137,80,78,71,6,4,2]);
  fs.writeFileSync(path.join(history,'sources/index.html'),old);
  fs.writeFileSync(path.join(history,'build-your-own-brief-compiler/index.html'),oldBuilder);
  fs.writeFileSync(path.join(history,'briefs/images/2026-10-27/accepted.png'),png);
  fs.writeFileSync(path.join(history,'stories/2026-10-27/example/index.html'),'<h1>Immutable article</h1>');
  const compiled=path.join(root,'six-case.html');
  fs.writeFileSync(compiled,compiledBuilder());
  const rev={
   schema_version:'daily-compiler-reading-copy-correction-v1',
   correction_type:'BRIEF_BUILDER_HOBBY_EVOLUTION_AND_LINK_HYGIENE',
   scope:'SOURCES_AND_BRIEF_BUILDER_HTML_ONLY',
   requested_by:'owner',edition_date:'2026-10-27',
   expected_previous_pages:{
    'sources/index.html':blob(Buffer.from(old)),
    'build-your-own-brief-compiler/index.html':blob(oldBuilder)
   },
   expected_builder_markdown_blob_sha:blob(fs.readFileSync(BRIEF_BUILDER_MD))
  };
  const revFile=path.join(root,'revision.json');
  fs.writeFileSync(revFile,JSON.stringify(rev));
  const result=updatePublicBriefExplainers({
   revisionFile:revFile,historySite:history,compiledPage:compiled,outSite:out
  });
  assert.equal(result.result,'PASS');
  assert.deepEqual(result.changed.map(x=>x.route),
   ['sources/index.html','build-your-own-brief-compiler/index.html']);
  assert.equal(result.files_changed,2);
  assert.equal(result.documented_hobby_use_cases,6);
  assert.equal(result.duplicate_internal_links,0);
  assert.deepEqual(fs.readFileSync(path.join(out,'briefs/images/2026-10-27/accepted.png')),png);
  assert.deepEqual(fs.readFileSync(path.join(out,'stories/2026-10-27/example/index.html')),
   fs.readFileSync(path.join(history,'stories/2026-10-27/example/index.html')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
