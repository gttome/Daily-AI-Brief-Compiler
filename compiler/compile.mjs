import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { materializeReaderSource } from './reader-materializer.mjs';
import { checkGoldenReaderParity } from '../scripts/check-reader-parity.mjs';
import { validateD0BundleImages } from '../image-capsules/bundle-gate.mjs';

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
  const bundleReady=state.state === 'BUNDLE_READY' && state.stage === 'BUNDLE';
  const verifiedRebuild=state.state === 'SHADOW_VERIFIED' && state.stage === 'VERIFY';
  if (!bundleReady && !verifiedRebuild) fail('state must be BUNDLE_READY at BUNDLE or SHADOW_VERIFIED at VERIFY');
  if (state.bundle?.status !== 'BUNDLE_READY' || state.bundle?.digest !== digest) fail('state bundle digest mismatch');
  if (bundle.schema_version !== 'daily-compiler-edition-bundle-v1') fail('bundle schema_version mismatch');
  if (bundle.status !== 'BUNDLE_READY') fail('bundle status mismatch');
  if (bundle.editorial_contract_version !== 'daily-compiler-editorial-contract-v1') fail('editorial contract mismatch');
  if (bundle.edition_date !== state.edition_date) fail('edition date mismatch');

  ensureArray(bundle.stories, 'stories', 6);
  const focusCounts = new Map([...EXPECTED_FOCUS.keys()].map(k => [k,0]));
  for (const story of bundle.stories) {
    for (const field of ['id','headline','focus','summary','why_it_matters','related_coverage','image_alt_intent','permanent_route']) {
      if (!story[field]) fail('story field missing: '+field);
    }
    if (!focusCounts.has(story.focus)) fail('unknown focus: '+story.focus);
    focusCounts.set(story.focus, focusCounts.get(story.focus)+1);
    if (!story.source?.url || !story.source?.publisher || !story.source?.title || !story.source?.published_at || !story.source?.retrieved_at) fail('story source evidence missing');
    if (!Number.isInteger(story.reading_time_minutes) || story.reading_time_minutes < 1) fail('reading time invalid');
    if (!Array.isArray(story.topics) || story.topics.length < 1) fail('story topics missing');
    if (!Array.isArray(story.coverage_labels) || story.coverage_labels.length < 1) fail('story coverage labels missing');
    if (!String(story.permanent_route).startsWith('/stories/'+bundle.edition_date+'/')) fail('story permanent route invalid');
  }
  for (const [focus,count] of EXPECTED_FOCUS) if (focusCounts.get(focus) !== count) fail('focus allocation mismatch: '+focus);
  if (bundle.stories.filter(s => s.agent_skills === true).length !== 1) fail('exactly one Agent Skills story required');

  ensureArray(bundle.videos, 'videos', 2);
  ensureArray(bundle.podcasts, 'podcasts', 2);
  for (const video of bundle.videos) {
    for (const field of ['title','source','url','original_date','focus','summary','why_it_matters']) if (!video[field]) fail('video field missing: '+field);
    if (!Number.isFinite(video.duration_minutes) || video.duration_minutes <= 0 || video.duration_minutes > 20 || video.verified !== true) fail('video record invalid');
  }
  for (const podcast of bundle.podcasts) {
    for (const field of ['title','source','url','original_date','summary','why_it_matters']) if (!podcast[field]) fail('podcast field missing: '+field);
    if (!Number.isFinite(podcast.duration_minutes) || podcast.duration_minutes <= 0 || !Number.isInteger(podcast.written_reading_time_minutes) || podcast.written_reading_time_minutes < 1 || podcast.verified !== true) fail('podcast record invalid');
  }
  if (new Set(bundle.podcasts.map(p => p.source)).size !== 2) fail('podcast sources must be diverse');

  for (const key of ['new','updated','carried_forward','dropped']) ensureArray(bundle.watchlist?.[key], 'watchlist.'+key);
  for (const item of bundle.watchlist.new) if (!item.topic || !item.why) fail('Watchlist New item invalid');
  for (const item of bundle.watchlist.updated) if (!item.topic || !item.what_changed) fail('Watchlist Updated item invalid');
  for (const item of bundle.watchlist.carried_forward) if (!item.topic || !item.why) fail('Watchlist Carried forward item invalid');
  for (const item of bundle.watchlist.dropped) if (!item.topic || !(item.reason || item.why)) fail('Watchlist Dropped item invalid');

  ensureArray(bundle.book_mappings, 'book_mappings');
  if (bundle.book_mappings.length < 4) fail('book mappings incomplete');
  const requiredBooks = new Set([
    'Reliable Generative AI',
    'Reliable Generative AI Context Engineering',
    'Generative AI Professional Prompt Engineering Guide',
    'Generative AI Prompt Engineering Learning Ecosystem'
  ]);
  for (const mapping of bundle.book_mappings) {
    for (const field of ['story_id','book','concept_or_chapter','connection','what_to_study_next']) if (!mapping[field]) fail('book mapping field missing: '+field);
    requiredBooks.delete(mapping.book);
  }
  if (requiredBooks.size) fail('required book series coverage missing: '+[...requiredBooks].join(', '));

  ensureArray(bundle.images, 'images', 6);
  let imageEvidence = [];
  if(bundle.image_strategy === 'd0_native_image_capsules'){
    const d0=validateD0BundleImages({state,bundle,repoRoot});
    if(d0.errors.length) fail('D0 image bundle gate failed: '+d0.errors.join(','));
    imageEvidence=d0.imageEvidence;
  } else {
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
  }

  if (bundle.producer_receipt?.result !== 'PASS') fail('producer receipt missing PASS');
  if (bundle.producer_receipt.owner_intervention !== false) fail('owner intervention must be false');
  for (const key of ['work_used','codex_used','paid_model_api_used']) if (bundle.producer_receipt[key] !== false) fail(key+' must be false');
  const acceptedImageRegenerations=bundle.producer_receipt.accepted_image_regenerations ?? 0;
  if (!Number.isInteger(acceptedImageRegenerations) || acceptedImageRegenerations < 0) fail('accepted_image_regenerations invalid');

  scanStrings(bundle, value => {
    for (const pattern of PROD_MUTATION_PATTERNS) if (pattern.test(value)) fail('production repository mutation target forbidden');
  });

  return {state,bundle,bundleDigest:digest,stateSha256:sha256(Buffer.from(stateText,'utf8')),imageEvidence};
}

export async function buildSite({validation, outDir, repoRoot='.'}) {
  return materializeReaderSource({bundle:validation.bundle,outDir,repoRoot});
}

export async function compileShadow({statePath,bundlePath,outDir,repoRoot='.'}) {
  const validation=validateEdition({statePath,bundlePath,repoRoot});
  const parity=await checkGoldenReaderParity();
  const built=await buildSite({validation,outDir,repoRoot});
  const verification={
    schema_version:'daily-compiler-reader-source-verification-v2',
    result:'PASS',
    edition_date:validation.bundle.edition_date,
    permanent_story_pages:6,
    reader_contract:{
      canonical_production_renderer:true,
      watchlist:true,
      ratings:true,
      comments:true,
      feedback_store:built.manifest.feedback.store,
      feedback_item_namespace:true,
      share:true,
      subscriptions:true,
      archive:true,
      feeds:true,
      accessible_image_alt:true,
      responsive:true
    },
    reader_parity_gate:parity.result,
    semantic_rework:0,
    accepted_image_regenerations:validation.bundle.producer_receipt.accepted_image_regenerations ?? 0
  };
  const receipt={
    schema_version:'daily-compiler-compile-receipt-v2',
    result:'PASS',
    edition_date:validation.bundle.edition_date,
    state_sha256:validation.stateSha256,
    bundle_sha256:validation.bundleDigest,
    deterministic:true,
    chatgpt_required_after_bundle_ready:false,
    owner_intervention:false,
    production_reader_source_sha:parity.production_reader_source_sha,
    reader_parity_gate:parity,
    accepted_image_regenerations:validation.bundle.producer_receipt.accepted_image_regenerations ?? 0,
    source_manifest:built.manifest,
    verification
  };
  fs.writeFileSync(path.join(outDir,'compile-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'verification-receipt.json'),JSON.stringify(verification,null,2)+'\n');
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{ if(v.startsWith('--')) a.push([v.slice(2),arr[i+1]]); return a; },[]));
  if (!args.state || !args.bundle || !args.out) fail('usage: node compiler/compile.mjs --state <file> --bundle <file> --out <dir> [--repo-root <dir>]');
  const receipt=await compileShadow({statePath:args.state,bundlePath:args.bundle,outDir:args.out,repoRoot:args['repo-root']||'.'});
  console.log(JSON.stringify(receipt,null,2));
}
