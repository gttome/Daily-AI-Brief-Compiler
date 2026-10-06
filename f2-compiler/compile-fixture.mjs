import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const fixtureDir=process.argv[2] || 'proof/f2/fixture';
const resultDir=process.argv[3] || 'proof/f2/result';

function readText(p){ return fs.readFileSync(p,'utf8'); }
function readJson(p){ return JSON.parse(readText(p)); }
function sha256(data){ return crypto.createHash('sha256').update(data).digest('hex'); }
function fail(m){ throw new Error(m); }
function esc(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const statePath=path.join(fixtureDir,'compiler-state.json');
const bundlePath=path.join(fixtureDir,'edition-bundle.json');
if(!fs.existsSync(statePath)||!fs.existsSync(bundlePath)) fail('fixture files missing');

const stateText=readText(statePath);
const bundleText=readText(bundlePath);
const state=JSON.parse(stateText);
const bundle=JSON.parse(bundleText);
const bundleDigest=sha256(Buffer.from(bundleText,'utf8'));

if(state.schema_version!=='daily-compiler-state-v1') fail('state schema mismatch');
if(state.state!=='BUNDLE_READY') fail('state is not BUNDLE_READY');
if(state.stage!=='BUNDLE') fail('state stage is not BUNDLE');
if(state.bundle?.status!=='BUNDLE_READY') fail('state bundle status is not BUNDLE_READY');
if(state.bundle?.digest!==bundleDigest) fail(`bundle digest mismatch expected ${state.bundle?.digest} actual ${bundleDigest}`);
if(bundle.schema_version!=='daily-compiler-f2-fixture-bundle-v1') fail('bundle schema mismatch');
if(bundle.status!=='BUNDLE_READY') fail('bundle status is not BUNDLE_READY');
if(bundle.fixture_only!==true) fail('F2 requires fixture_only=true');
if(bundle.edition_date!==state.edition_date) fail('edition date mismatch');

if(!Array.isArray(bundle.stories)||bundle.stories.length!==6) fail('exactly six stories required');
const focusCounts={technical:0,applied:0,agents:0};
for(const s of bundle.stories){
  if(!s.id||!s.headline||!s.focus) fail('story identity fields missing');
  if(!(s.focus in focusCounts)) fail(`unknown focus ${s.focus}`);
  focusCounts[s.focus]++;
}
if(focusCounts.technical!==2||focusCounts.applied!==2||focusCounts.agents!==2) fail('focus allocation must be 2/2/2');
if(bundle.stories.filter(s=>s.agent_skill===true).length!==1) fail('exactly one Agent Skills story required');
if(!Array.isArray(bundle.videos)||bundle.videos.length!==2) fail('exactly two videos required');
if(!Array.isArray(bundle.podcasts)||bundle.podcasts.length!==2) fail('exactly two podcasts required');
if(!bundle.watchlist||typeof bundle.watchlist!=='object') fail('watchlist missing');
if(!Array.isArray(bundle.book_mappings)||bundle.book_mappings.length<1) fail('book mappings missing');
if(!Array.isArray(bundle.images)||bundle.images.length!==6) fail('exactly six image records required');
if(!bundle.images.every(x=>x.accepted===true&&typeof x.sha256==='string'&&/^[a-f0-9]{64}$/.test(x.sha256)&&typeof x.asset_path==='string')) fail('image identity record invalid');
for(const image of bundle.images){
  if(!fs.existsSync(image.asset_path)) fail(`fixture image asset missing: ${image.asset_path}`);
  const actual=sha256(fs.readFileSync(image.asset_path));
  if(actual!==image.sha256) fail(`fixture image hash mismatch for ${image.story_id}`);
}

const buildModel={
  schema_version:'daily-compiler-f2-build-model-v1',
  edition_date:bundle.edition_date,
  fixture_only:true,
  stories:bundle.stories.map(s=>({id:s.id,headline:s.headline,focus:s.focus,agent_skill:s.agent_skill===true})),
  videos:bundle.videos.map(v=>({title:v.title,duration:v.duration})),
  podcasts:bundle.podcasts.map(p=>({title:p.title,source:p.source})),
  watchlist:bundle.watchlist,
  book_mappings:bundle.book_mappings
};

const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>F2 BUNDLE_READY Fixture</title></head><body>'+
  '<main><h1>F2 BUNDLE_READY Fixture</h1><p>Edition '+esc(bundle.edition_date)+' · deterministic build only</p>'+
  '<section><h2>Stories</h2><ol>'+buildModel.stories.map(s=>'<li data-story-id="'+esc(s.id)+'"><strong>'+esc(s.headline)+'</strong> — '+esc(s.focus)+(s.agent_skill?' · Agent Skills':'')+'</li>').join('')+'</ol></section>'+
  '<section><h2>Videos</h2><ul>'+buildModel.videos.map(v=>'<li>'+esc(v.title)+' — '+esc(v.duration)+'</li>').join('')+'</ul></section>'+
  '<section><h2>Podcasts</h2><ul>'+buildModel.podcasts.map(p=>'<li>'+esc(p.title)+' — '+esc(p.source)+'</li>').join('')+'</ul></section>'+
  '<section><h2>Watchlist</h2><pre>'+esc(JSON.stringify(buildModel.watchlist,null,2))+'</pre></section>'+
  '</main></body></html>\n';

fs.rmSync(resultDir,{recursive:true,force:true});
fs.mkdirSync(path.join(resultDir,'site'),{recursive:true});
fs.writeFileSync(path.join(resultDir,'site','index.html'),html);
fs.writeFileSync(path.join(resultDir,'build-model.json'),JSON.stringify(buildModel,null,2)+'\n');

const siteSha=sha256(Buffer.from(html,'utf8'));
const modelSha=sha256(Buffer.from(JSON.stringify(buildModel,null,2)+'\n','utf8'));
const receipt={
  schema_version:'daily-compiler-f2-receipt-v1',
  result:'PASS',
  trigger_contract:'push_of_bundle_ready_fixture',
  source_state:statePath,
  source_bundle:bundlePath,
  state_sha256:sha256(Buffer.from(stateText,'utf8')),
  bundle_sha256:bundleDigest,
  site_index_sha256:siteSha,
  build_model_sha256:modelSha,
  validated:{
    state_bundle_ready:true,
    exact_six_stories:true,
    focus_allocation_2_2_2:true,
    exactly_one_agent_skill:true,
    exactly_two_videos:true,
    exactly_two_podcasts:true,
    watchlist_present:true,
    book_mappings_present:true,
    six_image_identity_records:true
  },
  chatgpt_involved_after_fixture_commit:false,
  owner_intervention:false
};
fs.writeFileSync(path.join(resultDir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
