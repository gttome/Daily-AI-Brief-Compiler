import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const EXPECTED_FOCUS = new Map([
  ['Technical AI Engineering', 2],
  ['Applied Generative AI for Knowledge Workers', 2],
  ['Agents for Everyone', 2]
]);

const PROD_MUTATION_PATTERNS = [
  /github\.com\/gttome\/Daily-AI-Brief(?:\/|$)/i,
  /api\.github\.com\/repos\/gttome\/Daily-AI-Brief(?:\/|$)/i
];

function fail(message) { throw new Error(message); }
function esc(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
export function gitBlobSha(data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'), bytes])).digest('hex');
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function ensureArray(value, name, n) {
  if (!Array.isArray(value) || (n !== undefined && value.length !== n)) fail(name+' invalid');
}
function scanStrings(value, visit) {
  if (typeof value === 'string') visit(value);
  else if (Array.isArray(value)) value.forEach(v => scanStrings(v, visit));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => scanStrings(v, visit));
}
function pngDimensions(bytes) {
  const sig = '89504e470d0a1a0a';
  if (bytes.subarray(0,8).toString('hex') !== sig) fail('invalid PNG signature');
  if (bytes.subarray(12,16).toString('ascii') !== 'IHDR') fail('PNG IHDR missing');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

export function validateEdition({statePath, bundlePath, repoRoot='.'}) {
  const stateText = fs.readFileSync(statePath, 'utf8');
  const bundleText = fs.readFileSync(bundlePath, 'utf8');
  const state = JSON.parse(stateText);
  const bundle = JSON.parse(bundleText);
  const digest = sha256(Buffer.from(bundleText, 'utf8'));

  if (state.schema_version !== 'daily-compiler-state-v1') fail('state schema_version mismatch');
  if (state.state !== 'BUNDLE_READY' || state.stage !== 'BUNDLE') fail('state must be BUNDLE_READY at BUNDLE');
  if (state.bundle?.status !== 'BUNDLE_READY' || state.bundle?.digest !== digest) fail('state bundle digest mismatch');
  if (bundle.schema_version !== 'daily-compiler-edition-bundle-v1') fail('bundle schema_version mismatch');
  if (bundle.status !== 'BUNDLE_READY') fail('bundle status mismatch');
  if (bundle.editorial_contract_version !== 'daily-compiler-editorial-contract-v1') fail('editorial contract mismatch');
  if (bundle.edition_date !== state.edition_date) fail('edition date mismatch');

  ensureArray(bundle.stories, 'stories', 6);
  const focusCounts = new Map([...EXPECTED_FOCUS.keys()].map(k => [k,0]));
  for (const story of bundle.stories) {
    for (const field of ['id','headline','focus','summary','why_it_matters']) if (!story[field]) fail('story field missing: '+field);
    if (!focusCounts.has(story.focus)) fail('unknown focus: '+story.focus);
    focusCounts.set(story.focus, focusCounts.get(story.focus)+1);
    if (!story.source?.url || !story.source?.publisher || !story.source?.title) fail('story source evidence missing');
    if (!Number.isInteger(story.reading_time_minutes) || story.reading_time_minutes < 1) fail('reading time invalid');
  }
  for (const [focus,count] of EXPECTED_FOCUS) if (focusCounts.get(focus) !== count) fail('focus allocation mismatch: '+focus);
  if (bundle.stories.filter(s => s.agent_skills === true).length !== 1) fail('exactly one Agent Skills story required');

  ensureArray(bundle.videos, 'videos', 2);
  ensureArray(bundle.podcasts, 'podcasts', 2);
  for (const video of bundle.videos) if (!video.title || !video.url || !Number.isFinite(video.duration_minutes)) fail('video record invalid');
  for (const podcast of bundle.podcasts) if (!podcast.title || !podcast.url || !podcast.source || !Number.isFinite(podcast.duration_minutes)) fail('podcast record invalid');
  if (new Set(bundle.podcasts.map(p => p.source)).size !== 2) fail('podcast sources must be diverse');

  for (const key of ['new','updated','carried_forward','dropped']) ensureArray(bundle.watchlist?.[key], 'watchlist.'+key);
  ensureArray(bundle.book_mappings, 'book_mappings');
  if (bundle.book_mappings.length < 1) fail('book mappings missing');

  ensureArray(bundle.images, 'images', 6);
  const imageEvidence = [];
  for (const image of bundle.images) {
    if (!image.story_id || !image.path || image.accepted !== true) fail('image acceptance record invalid');
    if (!/^[a-f0-9]{64}$/.test(image.sha256 || '')) fail('image sha256 invalid');
    if (!/^[a-f0-9]{40}$/.test(image.git_blob_sha || '')) fail('image git blob sha invalid');
    if (image.visual_review?.result !== 'PASS' || image.visual_review?.reviewed_sha256 !== image.sha256) fail('image visual review mismatch');
    const asset = path.resolve(repoRoot, image.path);
    if (!fs.existsSync(asset)) fail('image missing: '+image.path);
    const bytes = fs.readFileSync(asset);
    const dims = pngDimensions(bytes);
    if (dims.width !== 1200 || dims.height !== 630) fail('image dimensions invalid: '+image.path);
    if (sha256(bytes) !== image.sha256) fail('image SHA mismatch: '+image.path);
    if (gitBlobSha(bytes) !== image.git_blob_sha) fail('image Git blob mismatch: '+image.path);
    imageEvidence.push({story_id:image.story_id,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,width:dims.width,height:dims.height});
  }

  if (bundle.producer_receipt?.result !== 'PASS') fail('producer receipt missing PASS');
  if (bundle.producer_receipt.owner_intervention !== false) fail('owner intervention must be false');
  for (const key of ['work_used','codex_used','paid_model_api_used']) if (bundle.producer_receipt[key] !== false) fail(key+' must be false');

  scanStrings(bundle, value => {
    for (const pattern of PROD_MUTATION_PATTERNS) if (pattern.test(value)) fail('production repository mutation target forbidden');
  });

  return {state,bundle,bundleDigest:digest,stateSha256:sha256(Buffer.from(stateText,'utf8')),imageEvidence};
}

function ratingsMarkup() {
  return '<div class="rating" aria-label="Story rating">'+[1,2,3,4,5].map(n=>'<button type="button" data-rating="'+n+'" aria-label="'+n+' stars">★</button>').join('')+'</div>';
}
function shell(title, body) {
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{font-family:Arial,sans-serif;margin:0;background:#f7f8fa;color:#17202a}main{max-width:1080px;margin:auto;padding:32px}section,article{background:white;border:1px solid #dfe4ea;border-radius:14px;padding:20px;margin:18px 0}img{max-width:100%;height:auto;border-radius:10px}a{color:#164ea6}.meta{color:#5c6773;font-size:.92rem}.rating button{border:0;background:transparent;font-size:1.3rem}.share{margin-left:8px}</style></head><body><main>'+body+'</main></body></html>\n';
}

export function buildSite({validation, outDir, repoRoot='.'}) {
  const {bundle} = validation;
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.mkdirSync(outDir,{recursive:true});
  const editionDir = path.join(outDir,'briefs',bundle.edition_date);
  const storyRoot = path.join(outDir,'stories',bundle.edition_date);
  const assetDir = path.join(outDir,'assets',bundle.edition_date);
  fs.mkdirSync(editionDir,{recursive:true}); fs.mkdirSync(storyRoot,{recursive:true}); fs.mkdirSync(assetDir,{recursive:true});

  const imageMap = new Map();
  for (const image of bundle.images) {
    const dest = path.join(assetDir,path.basename(image.path));
    fs.copyFileSync(path.resolve(repoRoot,image.path),dest);
    imageMap.set(image.story_id,'../../assets/'+bundle.edition_date+'/'+path.basename(image.path));
  }

  const cards = bundle.stories.map(story => {
    const image = bundle.images.find(i=>i.story_id===story.id);
    const img = image ? '../../assets/'+bundle.edition_date+'/'+path.basename(image.path) : '';
    return '<article><h2><a href="../../stories/'+esc(bundle.edition_date)+'/'+esc(story.id)+'/">'+esc(story.headline)+'</a></h2><p class="meta">'+esc(story.focus)+' · '+story.reading_time_minutes+' min read'+(story.agent_skills?' · Agent Skills':'')+'</p><img src="'+esc(img)+'" alt=""><p>'+esc(story.summary)+'</p><p><strong>Why it matters:</strong> '+esc(story.why_it_matters)+'</p>'+ratingsMarkup()+'<button class="share" type="button" data-share="'+esc(story.id)+'">Share</button></article>';
  }).join('');

  const media = '<section><h2>Videos</h2><ul>'+bundle.videos.map(v=>'<li><a target="_blank" rel="noopener" href="'+esc(v.url)+'">'+esc(v.title)+'</a> · Duration '+esc(v.duration_minutes)+' min</li>').join('')+'</ul></section>'+
    '<section><h2>Podcasts</h2><ul>'+bundle.podcasts.map(p=>'<li><a target="_blank" rel="noopener" href="'+esc(p.url)+'">'+esc(p.title)+'</a> · '+esc(p.source)+' · Duration '+esc(p.duration_minutes)+' min</li>').join('')+'</ul></section>';
  const watch = '<section><h2>Emerging AI Watchlist</h2><pre>'+esc(JSON.stringify(bundle.watchlist,null,2))+'</pre></section>';
  const editionHtml = shell('Daily AI Brief '+bundle.edition_date,'<h1>Daily AI Brief — '+esc(bundle.edition_date)+'</h1><p class="meta">Deterministic Compiler fixture preview</p>'+cards+media+watch+'<p><a href="../../archive/">Earlier Briefs</a></p>');
  fs.writeFileSync(path.join(editionDir,'index.html'),editionHtml);

  for (const story of bundle.stories) {
    const image = bundle.images.find(i=>i.story_id===story.id);
    const img = '../../../assets/'+bundle.edition_date+'/'+path.basename(image.path);
    const books = bundle.book_mappings.filter(b=>b.story_id===story.id);
    const body='<p><a href="../../../briefs/'+bundle.edition_date+'/">← Edition</a></p><article><h1>'+esc(story.headline)+'</h1><p class="meta">'+esc(story.focus)+' · '+story.reading_time_minutes+' min read</p><img src="'+esc(img)+'" alt=""><p>'+esc(story.summary)+'</p><p><strong>Why it matters:</strong> '+esc(story.why_it_matters)+'</p><p><a target="_blank" rel="noopener" href="'+esc(story.source.url)+'">Authoritative source — '+esc(story.source.publisher)+'</a></p>'+books.map(b=>'<section><h2>Continue Learning</h2><p><strong>'+esc(b.book)+'</strong>: '+esc(b.connection)+'</p></section>').join('')+ratingsMarkup()+'<button class="share" type="button" data-share="'+esc(story.id)+'">Share</button></article>';
    const dir=path.join(storyRoot,story.id); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'index.html'),shell(story.headline,body));
  }

  fs.mkdirSync(path.join(outDir,'archive'),{recursive:true});
  fs.writeFileSync(path.join(outDir,'archive','index.html'),shell('Daily AI Brief Archive','<h1>Archive</h1><p><a href="../briefs/'+bundle.edition_date+'/">'+bundle.edition_date+'</a></p>'));
  fs.writeFileSync(path.join(outDir,'index.html'),shell('Daily AI Brief Compiler','<h1>Daily AI Brief Compiler</h1><p><a href="briefs/'+bundle.edition_date+'/">Open fixture edition '+bundle.edition_date+'</a></p>'));

  const routes=['index.html','archive/index.html','briefs/'+bundle.edition_date+'/index.html',...bundle.stories.map(s=>'stories/'+bundle.edition_date+'/'+s.id+'/index.html')];
  const manifest={schema_version:'daily-compiler-build-manifest-v1',edition_date:bundle.edition_date,bundle_sha256:validation.bundleDigest,routes,images:validation.imageEvidence.map(e=>({story_id:e.story_id,sha256:e.sha256,git_blob_sha:e.git_blob_sha}))};
  fs.writeFileSync(path.join(outDir,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

function resolveInternal(htmlFile, ref) {
  const clean=ref.split('#')[0].split('?')[0];
  if (!clean || /^(https?:|mailto:|javascript:)/i.test(clean)) return null;
  const base=path.dirname(htmlFile);
  const abs=path.resolve(base,clean);
  return clean.endsWith('/') ? path.join(abs,'index.html') : abs;
}
export function verifySite({outDir, validation, manifest}) {
  for (const route of manifest.routes) if (!fs.existsSync(path.join(outDir,route))) fail('missing route: '+route);
  const htmlFiles=manifest.routes.filter(r=>r.endsWith('.html')).map(r=>path.join(outDir,r));
  for (const file of htmlFiles) {
    const html=fs.readFileSync(file,'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target=resolveInternal(file,match[1]);
      if (target && !fs.existsSync(target)) fail('broken internal link '+match[1]+' in '+file);
    }
  }
  const copiedImages=fs.readdirSync(path.join(outDir,'assets',validation.bundle.edition_date)).filter(x=>x.endsWith('.png'));
  if (copiedImages.length!==6) fail('compiled site must contain six images');
  const editionHtml=fs.readFileSync(path.join(outDir,'briefs',validation.bundle.edition_date,'index.html'),'utf8');
  if ((editionHtml.match(/data-rating=/g)||[]).length!==30) fail('rating controls missing');
  if ((editionHtml.match(/data-share=/g)||[]).length!==6) fail('share controls missing');
  return {
    schema_version:'daily-compiler-shadow-verification-receipt-v1',
    result:'PASS',
    edition_date:validation.bundle.edition_date,
    bundle_sha256:validation.bundleDigest,
    route_count:manifest.routes.length,
    permanent_story_pages:6,
    images_present:6,
    internal_links_valid:true,
    production_mutation_target_absent:true,
    owner_intervention:false
  };
}

export function compileShadow({statePath,bundlePath,outDir,repoRoot='.'}) {
  const validation=validateEdition({statePath,bundlePath,repoRoot});
  const manifest=buildSite({validation,outDir,repoRoot});
  const verification=verifySite({outDir,validation,manifest});
  const receipt={
    schema_version:'daily-compiler-compile-receipt-v1',
    result:'PASS',
    edition_date:validation.bundle.edition_date,
    state_sha256:validation.stateSha256,
    bundle_sha256:validation.bundleDigest,
    deterministic:true,
    chatgpt_required_after_bundle_ready:false,
    owner_intervention:false,
    verification
  };
  fs.writeFileSync(path.join(outDir,'compile-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'verification-receipt.json'),JSON.stringify(verification,null,2)+'\n');
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{ if(v.startsWith('--')) a.push([v.slice(2),arr[i+1]]); return a; },[]));
  if (!args.state || !args.bundle || !args.out) fail('usage: node compiler/compile.mjs --state <file> --bundle <file> --out <dir> [--repo-root <dir>]');
  console.log(JSON.stringify(compileShadow({statePath:args.state,bundlePath:args.bundle,outDir:args.out,repoRoot:args['repo-root']||'.'}),null,2));
}
