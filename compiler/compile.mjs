import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { materializeReaderSource } from './reader-materializer.mjs';
import { resolveReaderEnvironment } from './reader-environment.mjs';
import { checkGoldenReaderParity } from '../scripts/check-reader-parity.mjs';
import { validateD0BundleImages } from '../image-capsules/bundle-gate.mjs';
import { validateD1BundleImages } from '../image-studio/bundle-gate.mjs';
import { validateCanonicalPng } from '../image-studio/png-integrity.mjs';
import { validateBundleMedia } from './media.mjs';
import { canonicalSha } from '../image-capsules/util.mjs';
import { D1_STRATEGY,D1_WORK_SCOPE } from '../image-studio/activation.mjs';
import { d1EvidencePath } from '../image-studio/proof-evidence.mjs';
import { CORRECTION_REVISION_SCHEMA,validateCorrectionRevision } from '../operations/correction-apply.mjs';
import { validateCorrectionIntegrity } from './correction-gate.mjs';
import { compileEngineBinding } from '../operations/release-engine.mjs';

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
export function validateEdition({statePath, bundlePath, repoRoot='.'}) {
  const stateText = fs.readFileSync(statePath, 'utf8');
  const bundleText = fs.readFileSync(bundlePath, 'utf8');
  return validateEditionRecords({stateText,bundleText,repoRoot});
}

export function validateEditionRecords({stateText,bundleText,repoRoot='.'}) {
  const inputState = JSON.parse(stateText);
  const bundle = JSON.parse(bundleText);
  const correction = inputState.schema_version===CORRECTION_REVISION_SCHEMA ? validateCorrectionRevision({revision:inputState,bundle,bundleText}) : null;
  const state = correction ? correction.baseState : inputState;
  let baseValidation=null;
  if(correction){
    baseValidation=validateEditionRecords({stateText:JSON.stringify(state),bundleText:inputState.original_bundle_text,repoRoot});
    validateCorrectionIntegrity({revision:inputState,bundle,validation:correction,repoRoot});
  }
  const digest = sha256(Buffer.from(bundleText, 'utf8'));

  if (state.schema_version !== 'daily-compiler-state-v1') fail('state schema_version mismatch');
  const bundleReady=state.state === 'BUNDLE_READY' && state.stage === 'BUNDLE';
  const verifiedRebuild=state.state === 'SHADOW_VERIFIED' && state.stage === 'VERIFY';
  if (!bundleReady && !verifiedRebuild) fail('state must be BUNDLE_READY at BUNDLE or SHADOW_VERIFIED at VERIFY');
  if (inputState.bundle?.status !== 'BUNDLE_READY' || inputState.bundle?.digest !== digest) fail('state bundle digest mismatch');
  if (!['daily-compiler-edition-bundle-v1','daily-compiler-edition-bundle-v2'].includes(bundle.schema_version)) fail('bundle schema_version mismatch');
  if (bundle.status !== 'BUNDLE_READY') fail('bundle status mismatch');
  const currentMedia = bundle.schema_version === 'daily-compiler-edition-bundle-v2';
  if (bundle.editorial_contract_version !== (currentMedia ? 'daily-compiler-editorial-contract-v2' : 'daily-compiler-editorial-contract-v1')) fail('editorial contract mismatch');
  if (bundle.edition_date !== state.edition_date) fail('edition date mismatch');

  ensureArray(bundle.stories, 'stories', 6);
  const storyIds=new Set(bundle.stories.map(story=>story?.id));
  if(storyIds.size!==6||[...storyIds].some(id=>typeof id!=='string'||!id.trim()))fail('story identities must be unique');
  const routes=new Set(bundle.stories.map(story=>story?.permanent_route));
  if(routes.size!==6)fail('story permanent routes must be unique');
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
    if (!new RegExp('^/stories/'+bundle.edition_date+'/[a-z0-9-]+/$').test(story.permanent_route)) fail('story permanent route invalid');
    try{const source=new URL(story.source.url);if(!['https:','http:'].includes(source.protocol)||source.username||source.password)fail('story source URL invalid');}catch{fail('story source URL invalid');}
  }
  for (const [focus,count] of EXPECTED_FOCUS) if (focusCounts.get(focus) !== count) fail('focus allocation mismatch: '+focus);
  if (bundle.stories.filter(s => s.agent_skills === true).length !== 1) fail('exactly one Agent Skills story required');

  ensureArray(bundle.videos, 'videos', 2);
  ensureArray(bundle.podcasts, 'podcasts', 2);
  let mediaGate = null;
  if (currentMedia) mediaGate = validateBundleMedia({bundle,state,bundleDigest:digest,repoRoot});
  // Frozen v1 bundles retain their recorded checks. Exact-byte compatibility below
  // does not admit new v1 selections or retroactively claim current qualification.
  else {
  for (const video of bundle.videos) {
    for (const field of ['title','source','url','original_date','focus','summary','why_it_matters']) if (!video[field]) fail('video field missing: '+field);
    if (!Number.isFinite(video.duration_minutes) || video.duration_minutes <= 0 || video.duration_minutes > 20 || video.verified !== true) fail('video record invalid');
  }
  for (const podcast of bundle.podcasts) {
    for (const field of ['title','source','url','original_date','summary','why_it_matters']) if (!podcast[field]) fail('podcast field missing: '+field);
    if (!Number.isFinite(podcast.duration_minutes) || podcast.duration_minutes <= 0 || !Number.isInteger(podcast.written_reading_time_minutes) || podcast.written_reading_time_minutes < 1 || podcast.verified !== true) fail('podcast record invalid');
  }
  if (new Set(bundle.podcasts.map(p => p.source)).size !== 2) fail('podcast sources must be diverse');
  }

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
  const strategies=[bundle.image_system?.strategy,state.images?.strategy,bundle.producer_receipt?.bound_image_strategy,...bundle.images.map(image=>image?.image_system)].filter(value=>value!==undefined&&value!==null);
  if(strategies.some(value=>!['d0_native_image_capsules',D1_STRATEGY,'proposal1r_legacy'].includes(value)))fail('unsupported image strategy');
  if(new Set(strategies).size>1)fail('multiple image systems requested');
  const d0Requested=strategies.includes('d0_native_image_capsules');
  const d1Requested=strategies.includes(D1_STRATEGY);
  if(d0Requested&&bundle.image_system?.strategy!=='d0_native_image_capsules')fail('D0 image system metadata missing');
  if(d1Requested&&bundle.image_system?.strategy!==D1_STRATEGY)fail('D1 image system metadata missing');
  if(d1Requested&&bundle.corrections?.length&&!correction)fail('D1 corrected bundle requires a validated separate correction revision');
  if((d0Requested||d1Requested)&&bundle.images.some(image=>image?.image_system!==bundle.image_system.strategy))fail('image strategy mapping mismatch');
  if((d0Requested||d1Requested)&&state.images?.strategy_contract_version&&state.images.strategy_contract_version!==bundle.image_system?.contract_version)fail('bound image contract mismatch');
  if(new Set(bundle.images.map(image=>image?.story_id)).size!==6||bundle.images.some(image=>!storyIds.has(image?.story_id)))fail('image story mapping mismatch');
  if(new Set(bundle.images.map(image=>image?.path)).size!==6)fail('image paths must be unique');
  const imageEvidence = [];
  for (const image of bundle.images) {
    if (!image.story_id || !image.path || image.accepted !== true) fail('image acceptance record invalid');
    if (!/^[a-f0-9]{64}$/.test(image.sha256 || '')) fail('image sha256 invalid');
    if (!/^[a-f0-9]{40}$/.test(image.git_blob_sha || '')) fail('image git blob sha invalid');
    if (!d0Requested && !d1Requested && (image.visual_review?.result !== 'PASS' || image.visual_review?.reviewed_sha256 !== image.sha256)) fail('image visual review mismatch');
    const asset = d1EvidencePath(repoRoot,image.path);
    const bytes = fs.readFileSync(asset);
    const dims = validateCanonicalPng(bytes);
    if (dims.width !== 1200 || dims.height !== 630) fail('image dimensions invalid: '+image.path);
    if (sha256(bytes) !== image.sha256) fail('image SHA mismatch: '+image.path);
    if (gitBlobSha(bytes) !== image.git_blob_sha) fail('image Git blob mismatch: '+image.path);
    imageEvidence.push({story_id:image.story_id,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,width:dims.width,height:dims.height});
  }

  let d0ImageGate=null,d1ImageGate=null;
  if(d0Requested){
    d0ImageGate=validateD0BundleImages({bundle,repoRoot});
    if(d0ImageGate.result!=='PASS') fail('D0 image bundle gate failed: '+d0ImageGate.errors.join(';'));
  }
  if(d1Requested){
    d1ImageGate=validateD1BundleImages({bundle,state,repoRoot,validatedCorrection:Boolean(correction)});
    if(d1ImageGate.result!=='PASS') fail('D1 image bundle gate failed: '+d1ImageGate.errors.join(';'));
  }

  if (bundle.producer_receipt?.result !== 'PASS') fail('producer receipt missing PASS');
  if (bundle.producer_receipt.owner_intervention !== false) fail('owner intervention must be false');
  if (bundle.producer_receipt.codex_used !== false || bundle.producer_receipt.paid_model_api_used !== false) fail('codex/paid model API must be false');
  if(d1Requested){
    if(bundle.producer_receipt.work_used!==true||bundle.producer_receipt.work_scope!==D1_WORK_SCOPE||bundle.producer_receipt.work_image_generation!==false)fail('D1 Work usage must be narrow '+D1_WORK_SCOPE+' only');
    if(bundle.producer_receipt.local_computer_used!==false) fail('D1 local computer use forbidden');
  }else if(bundle.producer_receipt.work_used!==false) fail('work_used must be false');
  const acceptedImageRegenerations=bundle.producer_receipt.accepted_image_regenerations ?? 0;
  if (!Number.isInteger(acceptedImageRegenerations) || acceptedImageRegenerations < 0) fail('accepted_image_regenerations invalid');

  scanStrings(bundle, value => {
    for (const pattern of PROD_MUTATION_PATTERNS) if (pattern.test(value)) fail('production repository mutation target forbidden');
  });

  if (!mediaGate) {
    if(correction&&inputState.semantic_scope==='image_only'&&baseValidation.mediaGate.result==='HISTORICAL_COMPATIBILITY'){
      mediaGate={...baseValidation.mediaGate,result:'HISTORICAL_CORRECTION_COMPATIBILITY',original_bundle_sha256:inputState.original_bundle_sha256,revision_id:inputState.revision_id,current_media_qualification:false};
    }else mediaGate=validateBundleMedia({bundle,state,bundleDigest:digest,repoRoot});
  }
  let legacyImageGate=null;
  if(!d0Requested&&!d1Requested){
    const compatibility=JSON.parse(fs.readFileSync(new URL('../contracts/image-compatibility.json',import.meta.url),'utf8'));
    const fixedFixture=compatibility.entries.some(row=>row.bundle_sha256===digest&&row.edition_date===bundle.edition_date&&row.execution_id===state.execution_id&&row.branch===state.branch&&row.purpose==='immutable_test_fixture');
    if(!fixedFixture&&!['HISTORICAL_COMPATIBILITY','HISTORICAL_CORRECTION_COMPATIBILITY'].includes(mediaGate.result))fail('unregistered legacy image strategy cannot bypass current image contract');
    legacyImageGate={result:'HISTORICAL_COMPATIBILITY',current_image_qualification:false,fixture_only:fixedFixture};
  }
  if(currentMedia&&!correction&&acceptedImageRegenerations!==0)fail('accepted image regeneration forbidden in a new edition');
  return {state:inputState,baseState:state,bundle,bundleDigest:digest,stateSha256:sha256(Buffer.from(stateText,'utf8')),imageEvidence,d0ImageGate,d1ImageGate,legacyImageGate,mediaGate,correction:correction?{revision_id:inputState.revision_id,original_bundle_sha256:inputState.original_bundle_sha256,selected_story_ids:inputState.selected_story_ids}:null};
}

export async function buildSite({validation, outDir, repoRoot='.',environment}) {
  return materializeReaderSource({bundle:validation.bundle,bundleDigest:validation.bundleDigest,outDir,repoRoot,environment});
}

export async function compileShadow({statePath,bundlePath,outDir,repoRoot='.',environment,releaseBinding,requireReleaseBinding=false}) {
  environment=resolveReaderEnvironment(environment);
  const engineBinding=compileEngineBinding({statePath,bundlePath,semanticRoot:repoRoot,binding:releaseBinding,requireBinding:requireReleaseBinding});
  const validation=validateEdition({statePath,bundlePath,repoRoot});
  const parity=await checkGoldenReaderParity();
  const built=await buildSite({validation,outDir,repoRoot,environment});
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
    ...(engineBinding?{engine_binding:engineBinding}:{}),
    deterministic:true,
    chatgpt_required_after_bundle_ready:false,
    owner_intervention:false,
    production_reader_source_sha:parity.production_reader_source_sha,
    reader_parity_gate:parity,
    accepted_image_regenerations:validation.bundle.producer_receipt.accepted_image_regenerations ?? 0,
    media_contract_gate:validation.mediaGate,
    image_contract_gate:validation.d1ImageGate||validation.d0ImageGate||validation.legacyImageGate,
    image_evidence:validation.imageEvidence,
    source_manifest_sha256:canonicalSha(built.manifest),
    correction_revision:validation.correction,
    source_manifest:built.manifest,
    verification
  };
  fs.writeFileSync(path.join(outDir,'compile-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'verification-receipt.json'),JSON.stringify(verification,null,2)+'\n');
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{ if(v.startsWith('--')) a.push([v.slice(2),arr[i+1]]); return a; },[]));
  if (!args.state || !args.bundle || !args.out) fail('usage: node compiler/compile.mjs --state <file> --bundle <file> --out <dir> [--repo-root <dir>] [--reader-environment <json-file>] [--release-binding <json-file>]');
  if(Object.hasOwn(args,'reader-environment')&&(!args['reader-environment']||args['reader-environment'].startsWith('--')))fail('reader environment JSON file required');
  const environment=args['reader-environment']?readJson(args['reader-environment']):undefined;
  if(Object.hasOwn(args,'release-binding')&&(!args['release-binding']||args['release-binding'].startsWith('--')))fail('release binding JSON file required');
  const releaseBinding=args['release-binding']?readJson(args['release-binding']):undefined;
  const receipt=await compileShadow({statePath:args.state,bundlePath:args.bundle,outDir:args.out,repoRoot:args['repo-root']||'.',environment,releaseBinding,requireReleaseBinding:true});
  console.log(JSON.stringify(receipt,null,2));
}
