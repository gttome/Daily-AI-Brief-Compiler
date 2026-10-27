import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {BRIEF_BUILDER_ROUTE,addBuilderToPublishedNavigation} from '../compiler/brief-builder-pages.mjs';
import {insertBuilderIntoSources} from '../scripts/stage-brief-builder-pages.mjs';
import {recoverBriefBuilderHistory} from '../scripts/recover-brief-builder-history.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const shell='<nav><li><a href="/Daily-AI-Brief-Compiler/sources/">Sources</a></li></nav>'+
 '<footer><a href="/Daily-AI-Brief-Compiler/sources/">Sources</a></footer>';
const src=shell+'<div class="src-nav"><a href="#source-accountability">Our commitments</a></div>'+
 '<section class="src-section" id="source-accountability">What we guarantee</section>';
const sectors=['manufacturing','healthcare','cybersecurity','education','government','gardening'];
const books=['genaipromptingguide','genaipro','GenAILearn','reliable-context-engineering'];
const page='<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+
 '<body><main id="content"><h1>From information to a living knowledge system</h1>'+
 '<h2>The difference: connected intelligence, not a topic checklist</h2>'+
 '<h2>The second product: a living knowledge system</h2>'+ '<h2>How the Brief stays current: a governed self-evolving loop</h2>'+
 '<p>The Generative AI Professional Series</p>'+
 '<h2>How to start with a Brief Compiler for your own field</h2>'+
 '<style id="brief-compiler-builder-style">@media(max-width:480px){.main-content{padding:1em}}</style>'+
 '<nav class="brief-builder-jump"><a href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/">Build Brief</a></nav>'+
 sectors.map(x=>'<span id="use-case-'+x+'"></span>').join('')+
 books.map(x=>'<a href="https://leanpub.com/'+x+'">Book</a>').join('')+
 '</main></body></html>';
function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-builder-recovery-'));
 const history=path.join(root,'history'),out=path.join(root,'out');
 fs.mkdirSync(path.join(history,'sources'),{recursive:true});
 fs.mkdirSync(path.join(history,'briefs/images/2026-10-27'),{recursive:true});
 const png=Buffer.from([137,80,78,71,0,3,2,1]);
 fs.writeFileSync(path.join(history,'index.html'),shell);
 fs.writeFileSync(path.join(history,'sources/index.html'),src);
 fs.writeFileSync(path.join(history,'briefs/images/2026-10-27/keep.png'),png);
 const live={
  'index.html':Buffer.from(addBuilderToPublishedNavigation(shell)),
  'sources/index.html':Buffer.from(insertBuilderIntoSources(addBuilderToPublishedNavigation(src))),
  [BRIEF_BUILDER_ROUTE]:Buffer.from(page)
 };
 const rev={
  schema_version:'daily-compiler-reading-copy-correction-v1',
  correction_type:'BRIEF_BUILDER_HISTORY_PERSIST_ONLY',
  scope:'LIVE_VERIFIED_THREE_ROUTE_HISTORY_ONLY',
  requested_by:'owner',edition_date:'2026-10-27',
  original_deployment_run:40576857499,
  expected_pages_history_head:'a'.repeat(40),
  expected_live_routes:Object.fromEntries(Object.entries(live).map(([k,v])=>[k,sha(v)]))
 };
 const revisionFile=path.join(root,'recovery.json');
 fs.writeFileSync(revisionFile,JSON.stringify(rev));
 const fetchImpl=async url=>{
  const route=new URL(url).pathname.replace('/Daily-AI-Brief-Compiler/','')
    .replace(/^build-your-own-brief-compiler\/$/,'build-your-own-brief-compiler/index.html');
  const bytes=live[route];
  return {status:bytes?200:404,arrayBuffer:async()=>bytes?.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)||new ArrayBuffer(0)};
 };
 return {root,history,out,png,live,rev,revisionFile,fetchImpl};
}
test('history-only recovery stages exact live bytes without new deploy or image rework',async()=>{
 const f=setup();
 try{
  const result=await recoverBriefBuilderHistory({
   revisionFile:f.revisionFile,historySite:f.history,outSite:f.out,
   historyHead:'a'.repeat(40),fetchImpl:f.fetchImpl
  });
  assert.equal(result.result,'PASS');
  assert.equal(result.files_changed,3);
  assert.equal(result.new_pages_deployed,0);
  assert.equal(result.exact_already_live_bytes_preserved,true);
  assert.deepEqual(fs.readFileSync(path.join(f.out,'briefs/images/2026-10-27/keep.png')),f.png);
  for(const [route,bytes] of Object.entries(f.live))
   assert.deepEqual(fs.readFileSync(path.join(f.out,route)),bytes);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('history recovery fails closed on a mismatching live route, bad history head, or duplicate new page',async()=>{
 const f=setup();
 try{
  await assert.rejects(()=>recoverBriefBuilderHistory({
   revisionFile:f.revisionFile,historySite:f.history,outSite:f.out,
   historyHead:'b'.repeat(40),fetchImpl:f.fetchImpl}),/revision_or_original_history/);
  const badFetch=async u=>{
   const r=await f.fetchImpl(u);
   if(u.includes('sources/index.html'))
     return {status:200,arrayBuffer:async()=>Buffer.from('unapproved').buffer};
   return r;
  };
  await assert.rejects(()=>recoverBriefBuilderHistory({
   revisionFile:f.revisionFile,historySite:f.history,outSite:f.out,
   historyHead:'a'.repeat(40),fetchImpl:badFetch}),/live_page_hash_not_original/);
  fs.mkdirSync(path.join(f.history,'build-your-own-brief-compiler'),{recursive:true});
  fs.writeFileSync(path.join(f.history,BRIEF_BUILDER_ROUTE),'original already present');
  await assert.rejects(()=>recoverBriefBuilderHistory({
   revisionFile:f.revisionFile,historySite:f.history,outSite:f.out,
   historyHead:'a'.repeat(40),fetchImpl:f.fetchImpl}),/already_in_history/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('recovery code has one allowlisted edition and does not invoke Pages deployments',()=>{
 const wf=fs.readFileSync('.github/workflows/reading-copy-correction.yml','utf8');
 const step=wf.indexOf("BRIEF_BUILDER_HISTORY_PERSIST_ONLY)");
 assert.ok(step>0);
 assert.ok(wf.includes("if: env.REVISION_KIND != 'BRIEF_BUILDER_HISTORY_PERSIST_ONLY'"));
 assert.ok(wf.includes('mkdir -p "$(dirname "history/site/$route")"'));
 assert.ok(wf.includes('https://gttome.github.io/Daily-AI-Brief-Compiler/'));
});
