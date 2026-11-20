import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {stageNov20ReaderMetadata,NOV20_READER_ROUTES} from '../scripts/stage-nov20-reader-metadata.mjs';
const hf='Hugging Face and OpenRouter expose where open-weight inference is moving';
const hfOld='OpenRouter joins Hugging Face',paperOld='How do teams evaluate code changes attributed to AI agents?';
const openTopic='dab-topic-open-weight-inference-shifts-inside-managed-routing-ma',workTopic='dab-topic-workplace-ai-changes-task-time-before-meeting-load';
const block=`<span class="coverage-label">New development</span><p>19 Nov 2026</p><p>November 19, 2026</p><a>${hfOld}</a>`;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nov20-reader-')),history=path.join(root,'history'),out=path.join(root,'out');fs.mkdirSync(history);
 const source=new Map(),badge='<span>Recent instructional video fallback</span>';
 for(const route of NOV20_READER_ROUTES){
  let text;
  if(route.endsWith('watchlist.json'))text=JSON.stringify({edition_date:'2026-11-20',topics:[{topic_id:openTopic,first_detected:'2026-11-20',research_score:86,rubric:{unchanged:'score fixture'},evidence:[{url:'https://huggingface.co/blog/openrouter',title:hfOld,publication_date:'2026-11-19'}]},{topic_id:workTopic,first_detected:'2026-11-20',research_score:90,evidence:[]},{topic_id:'older-preserved',research_score:62,evidence:[]}]},null,2)+'\n';
  else if(route.startsWith('watchlist/'))text=`<section class="wl-card" id="${openTopic}"><a href="https://huggingface.co/blog/openrouter">Open-weight inference shifts inside managed routing markets</a><p>Published: 2026-11-19</p><ul><li>Original</li></ul></section><section class="wl-card" id="${workTopic}"><ul><li>Original</li></ul></section>`;
  else if(route.includes('nov20-k2-'))text=block;
  else if(route.includes('nov20-t2-'))text=`<a>${paperOld}</a>`;
  else if(route.startsWith('videos/'))text=badge;
  else text=(route.endsWith('.md')?`## 4. ${hf}\n${block}\n## 5. Other source\nNovember 19, 2026`:`<h2>4. ${hf}</h2>${block}<h2>5. Other source</h2>November 19, 2026`)+`<a>${paperOld}</a>${badge}${badge}`;
  source.set(route,Buffer.from(text));
 }
 // These are byte-preservation fixtures, not generated/approved artwork.
 for(let i=0;i<6;i++)source.set(`briefs/images/2026-11-20/fixture-${i}.png`,Buffer.from('immutable image fixture '+i));
 source.set('briefs/2026-11-19/index.html',Buffer.from('Prior edition is immutable'));
 for(const [route,bytes] of source){const p=path.join(history,route);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);}
 const r={correction_type:'NOV20_ORIGINAL_METADATA_AND_VIDEO_BADGES',edition_date:'2026-11-20',requested_by:'owner',observed_at:'2026-11-20T06:00:00Z',expected_previous_pages:Object.fromEntries(NOV20_READER_ROUTES.map(p=>[p,blob(source.get(p))])),expected_accepted_images:Object.fromEntries([...source].filter(([p])=>p.endsWith('.png')).map(([p,b])=>[p,sha(b)]))};
 const revision=path.join(root,'revision.json');fs.writeFileSync(revision,JSON.stringify(r));
 return {root,history,out,source,args:{revisionFile:revision,historySite:history,outSite:out}};
}
test('exact correction fixes source metadata and badges while preserving scores, older content and art bytes',()=>{
 const f=fixture();try{
  const r=stageNov20ReaderMetadata(f.args);assert.equal(r.files_changed,10);assert.equal(r.accepted_png_files_byte_preserved,6);
  const home=fs.readFileSync(path.join(f.out,'index.html'),'utf8');assert.match(home,/November 16, 2026/);assert.match(home,/<h2>5. Other source<\/h2>November 19, 2026/);assert.doesNotMatch(home,/instructional/);
  const watch=JSON.parse(fs.readFileSync(path.join(f.out,'data/watchlist.json')));
  assert.deepEqual(watch.topics.map(x=>x.research_score),[86,90,62]);assert.deepEqual(watch.topics[0].rubric,{unchanged:'score fixture'});
  assert.equal(watch.topics[0].evidence[1].url,'https://vercel.com/blog/ai-gateway-production-index-september-2026');assert.equal(watch.topics[1].evidence[0].url,'https://arxiv.org/abs/2504.11436');
  for(const [route,bytes] of f.source)if(!NOV20_READER_ROUTES.includes(route))assert.deepEqual(fs.readFileSync(path.join(f.out,route)),bytes);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('route or accepted-image drift rejects staging before any output is created',()=>{
 for(const route of ['index.html','briefs/images/2026-11-20/fixture-0.png']){
  const f=fixture();try{fs.appendFileSync(path.join(f.history,route),'drift');assert.throws(()=>stageNov20ReaderMetadata(f.args),/drift/);assert.equal(fs.existsSync(f.out),false);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
