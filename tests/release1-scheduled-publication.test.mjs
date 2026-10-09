import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateNewPendingEditorial} from '../compiler/pending-editorial.mjs';
import {OCT8_PREFIX,preservedOctober8Paths,verifyLocalPreservation,currentRoutes} from '../scripts/verify-publication-preservation.mjs';

const clone=x=>structuredClone(x);
const baseBundle=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
const baseState=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
function valid(){
 const bundle=clone(baseBundle),state=clone(baseState);
 delete bundle.fixture_only;
 bundle.edition_date='2026-10-10';
 state.edition_date=bundle.edition_date;
 state.branch='shadow/'+bundle.edition_date;
 state.execution_id='release1-proof-' + bundle.edition_date;
 bundle.stories.forEach((s,i)=>{
  s.id='proof-'+i;
  s.source.url='https://example-source-'+i+'.org/article'; // distinct non-fixture hosts; no external access in tests
  s.source.published_at='2026-10-09T13:00:00Z';
  s.source.retrieved_at='2026-10-09T18:00:00Z';
  s.source.read_evidence={status:'verified',full_source_read:true,method:'publisher_main_text',read_at:'2026-10-09T18:00:00Z',scope:'Complete publisher main text and metadata'};
  s.summary='A full and independently explained technical or professional research finding '+i+'.';
  s.why_it_matters='A concrete application and controlled reader action with evidence.';
  s.image_alt_intent='Mechanism diagram with a distinct reader-suitable description of evidence '+i+'.';
  if(s.agent_skills)s.agent_skills_evidence='Reusable skill package specifies inputs, allowed actions, checks, and repeatable outputs.';
 });
 bundle.videos.forEach((v,i)=>{
  v.url='https://video-source-'+i+'.org/episode';
  v.original_date='2026-10-09';
  v.verification={identity_verified:true,duration_verified:true,checked_at:'2026-10-09T18:00:00Z',runtime_source_url:v.url};
 });
 bundle.podcasts.forEach((p,i)=>{
  p.url='https://podcast-source-'+i+'.org/episode';
  p.original_date='2026-10-09';
  p.verification={identity_verified:true,duration_verified:true,checked_at:'2026-10-09T18:00:00Z',runtime_source_url:p.url};
 });
 bundle.watchlist.refreshed_at='2026-10-09T18:00:00Z';
 for(const kind of ['new','updated'])bundle.watchlist[kind].forEach((w,i)=>w.evidence={url:'https://watch-source-'+kind+'.org/article-'+i,date:'2026-10-09'});
 return {bundle,state};
}
test('Release 1 evidence gate accepts a valid complete editorial package independently of image generation',()=>{
 const p=valid();assert.equal(validateNewPendingEditorial(p).result,'PASS');
});
test('pending production gate rejects missing original-source reads, fake URLs, stale stories and unverified media',()=>{
 const cases=[
 p=>{delete p.bundle.stories[0].source.read_evidence;},
 p=>{p.bundle.stories[0].source.read_evidence.full_source_read=false;},
 p=>{p.bundle.stories[1].source.url='https://example.com/fake';},
 p=>{p.bundle.stories[1].source.url=p.bundle.stories[0].source.url;},
 p=>{p.bundle.stories[2].source.published_at='2026-09-30T12:00:00Z';},
 p=>{p.bundle.videos[0].verification.duration_verified=false;},
 p=>{p.bundle.podcasts[0].verification.identity_verified=false;},
 p=>{delete p.bundle.watchlist.updated[0].evidence;},
 p=>{p.bundle.watchlist.refreshed_at='not a date';},
 p=>{p.bundle.stories.find(s=>s.agent_skills).agent_skills_evidence='';},
 p=>{p.bundle.fixture_only=true;},
 p=>{p.state.branch='shadow/2026-10-09';}
 ];
 for(const mutate of cases){const p=valid();mutate(p);assert.throws(()=>validateNewPendingEditorial(p),/Release 1 editorial evidence/);}
});
test('pinned October 8 corpus is exactly eleven permanent HTML pages plus six accepted PNGs',()=>{
 assert.equal(OCT8_PREFIX,'2026-10-08');
 assert.equal(preservedOctober8Paths.length,17);
 assert.equal(preservedOctober8Paths.filter(x=>x.endsWith('/index.html')).length,11);
 assert.equal(preservedOctober8Paths.filter(x=>x.endsWith('.png')).length,6);
});
test('bytewise preservation failure blocks any real deployment',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'release1-historic-'));
 const history=path.join(root,'history'),site=path.join(root,'site');
 try{
  for(const f of preservedOctober8Paths){
   for(const dir of [history,site]){
    const file=path.join(dir,f);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'immutable-image-or-page-evidence');
   }
  }
  // The six PNGs must equal independently pinned public SHA-256, so synthetic fixtures must fail closed.
  assert.throws(()=>verifyLocalPreservation(history,site),/pinned SHA mismatch/);
  const old=preservedOctober8Paths[0];fs.writeFileSync(path.join(site,old),'tampered');
  assert.throws(()=>verifyLocalPreservation(history,site),/byte mismatch/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('new edition manifest requires the same six pending figure routes and all canonical pages',()=>{
 const base={image_representation:'images_pending',required_routes:Array.from({length:21},(_,i)=>'stories/2026-10-10/st-'+i+'/index.html'),current_images:Array.from({length:6},(_,i)=>({story_id:'s'+i,status:'pending',accepted:false,route:'briefs/images/2026-10-10/illustration-pending.svg'}))};
 assert.equal(currentRoutes(base).length,22);
 const broken=clone(base);broken.current_images[0].accepted=true;
 assert.throws(()=>currentRoutes(broken),/pending figures/);
 const broken2=clone(base);broken2.current_images[0].route='briefs/images/2026-10-10/fake.png';
 assert.throws(()=>currentRoutes(broken2),/one shared placeholder/);
});
test('protected publisher enforces full integrity checks before and after actual deploy and never invokes generator',()=>{
 const wf=fs.readFileSync('.github/workflows/shadow-compile.yml','utf8');
 const before=wf.indexOf('verify-publication-preservation.mjs preflight');
 const upload=wf.indexOf('actions/upload-pages-artifact@v3');
 const deploy=wf.indexOf('actions/deploy-pages@v4');
 const after=wf.indexOf('verify-publication-preservation.mjs postdeploy');
 const finalize=wf.indexOf('scripts/finalize-shadow-state.mjs');
 assert.ok(before>0&&before<upload&&upload<deploy&&deploy<after&&after<finalize);
 assert.match(wf,/--allow-pending-images true/);
 assert.match(wf,/--release1-production true/);
 assert.doesNotMatch(wf,/render-pending-images|image-capsules\/render|D1 Work Image Lane/);
});
