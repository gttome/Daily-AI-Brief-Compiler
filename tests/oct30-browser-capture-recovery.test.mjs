import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureImageBrowser14} from '../scripts/capture-image-browser14.mjs';
const base='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const date='2026-10-31';
const job={edition_date:date,stories:Array.from({length:6},(_,i)=>({
 permanent_url:base+'stories/'+date+'/story-'+(i+1)+'/'
}))};
const fakePng=Buffer.from('89504e470d0a1a0a00000001','hex');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'browser14-'));
test('bounded retry completes 14 real-screenshot file checks and seven DOM checks without pretending semantic review',()=>{
 const out=temp();let firstFailure=true;
 const invoke=(_browser,args)=>{
   const outarg=args.find(a=>a.startsWith('--screenshot='));
   if(outarg){
     const file=outarg.slice('--screenshot='.length);
     if(firstFailure){firstFailure=false;return {status:1,stderr:'transient browser crash'};}
     fs.writeFileSync(file,fakePng);
     return {status:0,stdout:'',stderr:''};
   }
   return {status:0,stdout:'<html><img src="dab-edition-'+date+'-m01.png"></html>',stderr:''};
 };
 const result=captureImageBrowser14({job,outputDir:out,browser:'test-browser',invoke,maxAttempts:2});
 assert.equal(result.result,'BROWSER14_CAPTURED_UNREVIEWED');
 assert.equal(result.screenshot_count,14);
 assert.equal(result.dom_count,7);
 assert.equal(result.failed_attempts.length,1);
 assert.equal(result.captures.length,21);
 assert.equal(result.semantic_24_context_review,'NOT_INFERRED');
 assert.equal(fs.readdirSync(out).filter(f=>/-(?:mobile|desktop)\.png$/.test(f)).length,14);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'browser14-capture.json'))).route_count,7);
});
test('permanent browser failure preserves route-specific evidence and fails closed',()=>{
 const out=temp();
 const invoke=()=>({status:1,stderr:'Chromium unavailable',error:{code:'EPIPE'}});
 assert.throws(()=>captureImageBrowser14({job,outputDir:out,browser:'test-browser',invoke,maxAttempts:2}),
   /BROWSER14_CAPTURE_FAILED.*route=briefs\/2026-10-31/);
 const f=JSON.parse(fs.readFileSync(path.join(out,'browser14-failure.json'),'utf8'));
 assert.equal(f.result,'BLOCKED_INCOMPLETE');
 assert.equal(f.failed_attempts.length,2);
 assert.equal(f.failed_attempts[0].stderr_tail,'Chromium unavailable');
 assert.equal(fs.existsSync(path.join(out,'browser14-capture.json')),false);
});
test('source job cannot pass with unapproved story routes or duplicate pages',()=>{
 const out=temp();
 assert.throws(()=>captureImageBrowser14({job:{...job,stories:job.stories.map(s=>({...s,
   permanent_url:'https://elsewhere.invalid/story/'}))},outputDir:out,browser:'test-browser'}),
   /unexpected_story_route/);
});
