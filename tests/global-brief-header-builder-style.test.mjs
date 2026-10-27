import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {
 BUILDER_CSS_PATH,styleBuilderJekyllLayout,repairPublishedBuilderStyle,validateBuiltBuilderHead
} from '../compiler/brief-builder-style.mjs';
import {
 GLOBAL_BRIEF_NAV_SCRIPT,GLOBAL_BRIEF_NAV_MARKER,appendGlobalBriefNavigation
} from '../compiler/global-brief-navigation.mjs';
import {
 auditSharedNavDelivery,addBuilderToPublishedSourcesHead,stageGlobalBriefHeaderAndCss
} from '../scripts/stage-global-brief-header-css.mjs';

const css=fs.readFileSync(BUILDER_CSS_PATH,'utf8');
const BASE='/Daily-AI-Brief-Compiler/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const src='<li><a href="'+BASE+'sources/">Sources</a></li>';
const builder='<li><a href="'+BASE+'build-your-own-brief-compiler/">Build Your Own Brief</a></li>';
const nav=(includeBuilder=false)=>{
 return '<header><a href="'+BASE+'">The Daily Generative AI Brief</a>'+
 '<nav class="ledger-primary-nav" aria-label="Primary navigation"><ul>'+
 '<li><a href="'+BASE+'briefs-archive/">Briefs Archive</a></li>'+
 '<li><a href="'+BASE+'watchlist/">Emerging AI Watchlist</a></li>'+
 src+(includeBuilder?builder:'')+
 '</ul></nav></header>';
};
const audience='(()=>{const base="/Daily-AI-Brief-Compiler/";const endpoint="https://example.invalid/api/audience";})();\n';
const cssInMain='&lt;style id="brief-compiler-builder-style">\n'+css.trimEnd()+'\n</style>\n';
const builderPage='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
 '<body>'+nav(true)+'<main id="content" class="main-content" role="main">\n      '+cssInMain+
 '<h2>From information to a living knowledge system</h2></main><script defer src="'+BASE+'assets/js/audience.js"></script></body></html>';
const sourcePage='<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>'+
 nav()+'<main id="content" class="main-content" role="main">'+
 '<section id="source-builder"><a href="'+BASE+'build-your-own-brief-compiler/">Build Your Own Brief Compiler — from information to a living knowledge system</a></section>'+
 '<section id="source-directory">'+Array.from({length:208},(_,i)=>'<article class="src-source-card" data-source="'+i+'"></article>').join('')+
 '</section></main><script defer src="'+BASE+'assets/js/audience.js"></script></body></html>';

test('CSS extraction renders a real Builder-only head style and rejects escaped visible code',()=>{
 const fixed=repairPublishedBuilderStyle(builderPage,css);
 assert.equal(validateBuiltBuilderHead(fixed),true);
 assert.ok(fixed.includes('<head>')&&fixed.indexOf('<style id="brief-compiler-builder-style">')<fixed.indexOf('</head>')));
 assert.ok(!fixed.includes('&lt;style id='));
 assert.ok(!fixed.includes('/* Local page styling only; no change to published article CSS. */\n</main>'));
 assert.throws(()=>repairPublishedBuilderStyle(fixed,css),/already_repaired/);
 assert.throws(()=>repairPublishedBuilderStyle(builderPage,css+'body{display:none}'),/differs_from_canonical/);
 const jekyll='<html><head><meta charset="utf-8"></head><body></body></html>';
 const future=styleBuilderJekyllLayout(jekyll,css);
 assert.ok(future.includes("{% if page.permalink == '/build-your-own-brief-compiler/' %}"));
 assert.ok(future.includes('<style id="brief-compiler-builder-style">'));
 assert.throws(()=>styleBuilderJekyllLayout(future,css),/already_styled/);
});
test('a single existing shared script adds the Builder destination to every eligible top nav',()=>{
 const full=appendGlobalBriefNavigation(audience);
 assert.ok(full.startsWith(audience.trimEnd()));
 assert.ok(full.includes(GLOBAL_BRIEF_NAV_MARKER));
 assert.throws(()=>appendGlobalBriefNavigation(full),/already_attached/);
 assert.doesNotThrow(()=>new vm.Script(GLOBAL_BRIEF_NAV_SCRIPT));
 const entries=[];
 const footer={removed:false,remove(){this.removed=true;}};
 const bodyCta={textContent:'Build Your Own Brief Compiler',replacement:null,replaceWith(node){this.replacement=node;}};
 const sources={getAttribute(name){return name==='href'?BASE+'sources/':null;},parentElement:{
  insertAdjacentElement(where,node){assert.equal(where,'afterend');entries.push(node);}
 }};
 const fakeNav={querySelectorAll(){const added=entries.flatMap(li=>li.children||[]);
   return [sources,...added];}};
 const document={
  readyState:'interactive',
  querySelector(sel){return sel==='.ledger-primary-nav ul'?fakeNav:null;},
  querySelectorAll(sel){
   if(sel.includes('.reader-footer-links'))return footer.removed?[]:[footer];
   if(sel.includes('#source-builder'))return bodyCta.replacement?[]:[bodyCta];
   return [];
  },
  createElement(tag){return{
    tag,textContent:'',children:[],
    href:null,setAttribute(k,v){this[k]=v;},
    getAttribute(k){return this[k]??null;},
    appendChild(child){this.children.push(child);}
  };},
  addEventListener(){throw Error('DOMContentLoaded should not be required in interactive state');}
 };
 vm.runInNewContext(GLOBAL_BRIEF_NAV_SCRIPT,{document});
 assert.equal(entries.length,1);
 assert.equal(entries[0].children[0].getAttribute('href'),BASE+'build-your-own-brief-compiler/');
 assert.equal(entries[0].children[0].textContent,'Build Your Own Brief');
 assert.equal(footer.removed,true);
 assert.equal(bodyCta.replacement.tag,'strong');
 vm.runInNewContext(GLOBAL_BRIEF_NAV_SCRIPT,{document});
 assert.equal(entries.length,1,'runtime must not insert duplicate Builder links');
});
test('Sources gets one Builder link near its title and neutralizes lower repeated destination',()=>{
 const fixed=addBuilderToPublishedSourcesHead(sourcePage);
 const pos=fixed.indexOf(builder);
 assert.ok(pos>0&&pos<fixed.indexOf('<main'));
 assert.equal((fixed.match(/href="\/Daily-AI-Brief-Compiler\/build-your-own-brief-compiler\/"/g)||[]).length,1);
 assert.ok(fixed.includes('id="source-directory"'));
 assert.equal((fixed.match(/class="src-source-card"/g)||[]).length,208);
 assert.throws(()=>addBuilderToPublishedSourcesHead(fixed),/already_changed_or_missing/);
});
test('archived Brief header pages can be covered without editing even one historical HTML file',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'global-brief-links-'));
 const root=path.join(tmp,'history');
 try{
  fs.mkdirSync(path.join(root,'assets/js'),{recursive:true});
  fs.mkdirSync(path.join(root,'sources'),{recursive:true});
  fs.mkdirSync(path.join(root,'build-your-own-brief-compiler'),{recursive:true});
  fs.writeFileSync(path.join(root,'assets/js/audience.js'),audience);
  fs.writeFileSync(path.join(root,'sources/index.html'),sourcePage);
  fs.writeFileSync(path.join(root,'build-your-own-brief-compiler/index.html'),builderPage);
  const html=nav()+'<script src="'+BASE+'assets/js/audience.js"></script>';
  for(let i=0;i<301;i++){
   const p=path.join(root,'briefs/'+String(i).padStart(3,'0')+'/index.html');
   fs.mkdirSync(path.dirname(p),{recursive:true});
   fs.writeFileSync(p,html);
  }
  const proof=auditSharedNavDelivery(root);
  assert.equal(proof.eligible_header_pages,303);
  assert.equal(proof.common_audience_js_present,303);
  assert.equal(proof.sources_links,303);
  const rev={
   schema_version:'daily-compiler-reading-copy-correction-v1',
   correction_type:'GLOBAL_BRIEF_HEADER_AND_BUILDER_CSS',
   scope:'SHARED_NAV_JS_BUILDER_HTML_SOURCES_HTML_ONLY',
   requested_by:'owner',edition_date:'2026-10-27',
   expected_previous_pages:{
    'assets/js/audience.js':blob(Buffer.from(audience)),
    'build-your-own-brief-compiler/index.html':blob(Buffer.from(builderPage)),
    'sources/index.html':blob(Buffer.from(sourcePage))
   },
   expected_css_blob_sha:blob(Buffer.from(css))
  };
  const revisionFile=path.join(tmp,'revision.json'),out=path.join(tmp,'patched');
  fs.writeFileSync(revisionFile,JSON.stringify(rev));
  const staged=stageGlobalBriefHeaderAndCss({revisionFile,historySite:root,outSite:out});
  assert.equal(staged.result,'PASS');
  assert.equal(staged.files_changed,3);
  assert.equal(staged.shared_navigation.eligible_header_pages,303);
  assert.deepEqual(staged.changed.map(x=>x.route),
   ['assets/js/audience.js','build-your-own-brief-compiler/index.html','sources/index.html']);
  assert.deepEqual(fs.readFileSync(path.join(root,'briefs/198/index.html')),
    fs.readFileSync(path.join(out,'briefs/198/index.html')));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
