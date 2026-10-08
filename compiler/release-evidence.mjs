import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {canonicalSha,sha256,gitBlobSha,hex} from '../image-capsules/util.mjs';
import {d1EvidencePath} from '../image-studio/proof-evidence.mjs';
import {readReleaseManifest} from '../scripts/verify-built-reader.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>isDeepStrictEqual(a,b);

// Shared mandatory publication evidence. Optional observation is never an input.
export function assertCompleteReleaseEvidence({evidence,bundle,repoRoot,sourceDir}){
  const {compile,built,live,history,manifest}=evidence;
  const source=readReleaseManifest({sourceDir});
  need(same(source.manifest,manifest)&&same(source.compile,compile),'release_source_proof_mismatch');
  need(compile.source_manifest_sha256===canonicalSha(manifest),'release_compile_manifest_digest');
  need(['PASS','HISTORICAL_COMPATIBILITY'].includes(compile.image_contract_gate?.result)&&['PASS','HISTORICAL_COMPATIBILITY','HISTORICAL_CORRECTION_COMPATIBILITY'].includes(compile.media_contract_gate?.result),'release_compile_product_gates');
  need(Array.isArray(compile.image_evidence)&&compile.image_evidence.length===6&&new Set(compile.image_evidence.map(image=>image.story_id)).size===6,'release_compile_image_evidence');
  for(const flag of ['ratings','sharing','public_comments','accessibility','responsive','story_image_bindings','media_reader_bindings'])need(built[flag]===true,'release_built_product_proof');
  const rows=(list,routes,label)=>{
    need(Array.isArray(list)&&list.length===routes.length&&new Set(list.map(row=>row.route)).size===routes.length&&routes.every(route=>list.some(row=>row.route===route)),'release_'+label+'_routes');
    for(const row of list)need(hex(row.sha256,64)&&Number.isInteger(row.bytes)&&row.bytes>0,'release_'+label+'_route_identity');
    return new Map(list.map(row=>[row.route,row]));
  };
  const builtRows=rows(built.route_evidence,manifest.required_routes,'built'),liveRows=rows(live.route_evidence,manifest.required_routes,'live');
  need(built.route_evidence_sha256===canonicalSha(built.route_evidence),'release_built_route_digest');
  need(live.exact_reader_route_bytes===true&&live.story_image_bindings===true&&live.media_reader_bindings===true,'release_live_reader_proof');
  for(const flag of ['ratings','comments','watchlist','public_comments'])need(live.feedback_writes?.[flag]===true,'release_live_feedback_proof');
  need(history.historical_correction===(history.latest_date>bundle.edition_date)&&history.canonical_current_reader_preserved===true&&history.permanent_history===true&&history.archive_and_feeds_rewritten===false,'release_history_preservation');
  const historical=history.historical_correction;
  if(historical){
    need(history.homepage_latest_preserved===true&&history.historical_scope==='dated_edition_routes_and_assets'&&history.preserved_editions?.includes(history.latest_date),'release_latest_reader_preservation');
    need(Array.isArray(history.published_shared_routes)&&['index.html','latest.md'].every(route=>history.published_shared_routes.some(row=>row.route===route)),'release_shared_route_proof');
    const allowed=['briefs','stories','videos','podcasts'].map(category=>category+'/'+bundle.edition_date+'/').concat('briefs/images/'+bundle.edition_date+'/');
    need(Array.isArray(history.overlaid_target_routes)&&history.overlaid_target_routes.every(route=>allowed.includes(route)),'release_history_scope');
  }
  for(const [route,row] of liveRows){
    need(row.status===200&&row.url===new URL(route,live.base_url.replace(/\/?$/,'/')).href,'release_live_route_source');
    const dated=['briefs','stories','videos','podcasts'].some(category=>route.startsWith(category+'/'+bundle.edition_date+'/'));
    const expected=builtRows.get(route);
    if(!historical||dated)need(expected.sha256===row.sha256&&expected.bytes===row.bytes,'release_live_built_route_mismatch');
  }
  for(const row of history.published_shared_routes||[])if(liveRows.has(row.route))need(liveRows.get(row.route).sha256===row.sha256,'release_live_shared_route_mismatch');
  need(Array.isArray(live.image_evidence)&&live.image_evidence.length===6&&new Set(live.image_evidence.map(image=>image.story_id)).size===6,'release_live_image_count');
  for(const image of bundle.images){
    const binding=manifest.current_images.find(row=>row.story_id===image.story_id),verified=live.image_evidence.find(row=>row.story_id===image.story_id),compiledImage=compile.image_evidence.find(row=>row.story_id===image.story_id);
    need(compiledImage?.sha256===image.sha256&&compiledImage.git_blob_sha===image.git_blob_sha&&compiledImage.path===image.path,'release_compile_image_binding');
    need(binding&&verified&&binding.sha256===image.sha256&&verified.sha256===image.sha256&&verified.route===binding.route&&verified.status===200,'release_live_image_binding');
    const bytes=fs.readFileSync(d1EvidencePath(repoRoot,image.path));
    need(sha256(bytes)===image.sha256&&gitBlobSha(bytes)===image.git_blob_sha&&verified.bytes===bytes.length,'release_live_image_bytes');
    need(verified.url===new URL(binding.public_url).href,'release_live_image_url');
  }
  return {latest_edition_date:history.latest_date,historical_correction:historical,current_reader_preserved:true};
}

