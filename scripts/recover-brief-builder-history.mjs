#!/usr/bin/env node
// Recover the already-verified live website into cumulative Pages history.
// No new site build, no Pages redeployment, no accepted-image mutation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BRIEF_BUILDER_ROUTE,addBuilderToPublishedNavigation} from '../compiler/brief-builder-pages.mjs';
import {assertBuiltBriefPage,insertBuilderIntoSources} from './stage-brief-builder-pages.mjs';

const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const HOME='index.html',SOURCES='sources/index.html';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('brief_builder_history_recovery:'+x);};
function walk(root,rel=''){
 const records=[];
 for(const entry of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){
  const route=path.posix.join(rel,entry.name);
  if(entry.isDirectory())records.push(...walk(root,route));
  else if(entry.isFile())records.push(route);
  else fail('unexpected_special_file:'+route);
 }
 return records.sort();
}
async function liveRead(route,{fetchImpl}){
 const url=new URL(route,BASE).href;
 const response=await fetchImpl(url,{headers:{'Cache-Control':'no-cache',Pragma:'no-cache'}});
 if(response.status!==200)fail('missing_verified_live_route:'+route+':'+response.status);
 return Buffer.from(await response.arrayBuffer());
}
export async function recoverBriefBuilderHistory({
 revisionFile,historySite,outSite,historyHead=process.env.HISTORY_HEAD,fetchImpl=fetch
}){
 const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    rev.correction_type!=='BRIEF_BUILDER_HISTORY_PERSIST_ONLY'||
    rev.scope!=='LIVE_VERIFIED_THREE_ROUTE_HISTORY_ONLY'||
    rev.requested_by!=='owner'||rev.edition_date!=='2026-10-27'||
    rev.original_deployment_run!==40576857499||
    !/^[a-f0-9]{40}$/.test(rev.expected_pages_history_head||'')||
    rev.expected_pages_history_head!==historyHead||
    Object.keys(rev.expected_live_routes||{}).sort().join('|')!==
     [HOME,SOURCES,BRIEF_BUILDER_ROUTE].sort().join('|')||
    Object.values(rev.expected_live_routes).some(x=>!/^[a-f0-9]{64}$/.test(x)))
    fail('recovery_revision_or_original_history_not_approved');
 if(!historySite||!fs.existsSync(historySite)||!outSite||fs.existsSync(outSite))
    fail('missing_history_or_output_exists');
 const old=walk(historySite);
 if(old.includes(BRIEF_BUILDER_ROUTE))fail('already_in_history_no_recovery_needed');
 if(!old.includes(HOME)||!old.includes(SOURCES))fail('historical_reader_missing');
 const expected={
  [HOME]:Buffer.from(addBuilderToPublishedNavigation(fs.readFileSync(path.join(historySite,HOME),'utf8'))),
  [SOURCES]:Buffer.from(insertBuilderIntoSources(
   addBuilderToPublishedNavigation(fs.readFileSync(path.join(historySite,SOURCES),'utf8'))))
 };
 const recovered={};
 for(const route of [HOME,SOURCES,BRIEF_BUILDER_ROUTE]){
  const bytes=await liveRead(route,{fetchImpl});
  if(hash(bytes)!==rev.expected_live_routes[route])
    fail('live_page_hash_not_original_verified_deployment:'+route);
  if(expected[route]&&!expected[route].equals(bytes))
    fail('unauthorized_home_or_sources_live_copy:'+route);
  if(route===BRIEF_BUILDER_ROUTE)assertBuiltBriefPage(bytes.toString('utf8'));
  recovered[route]=bytes;
 }
 fs.cpSync(historySite,outSite,{recursive:true,force:true});
 for(const route of Object.keys(recovered)){
   const to=path.join(outSite,route);
   fs.mkdirSync(path.dirname(to),{recursive:true});
   fs.writeFileSync(to,recovered[route]);
 }
 const current=walk(outSite),added=current.filter(x=>!old.includes(x));
 if(added.length!==1||added[0]!==BRIEF_BUILDER_ROUTE||current.length!==old.length+1)
   fail('unapproved_route_inventory_change');
 for(const route of old){
  if(route===HOME||route===SOURCES)continue;
  if(!fs.readFileSync(path.join(historySite,route)).equals(fs.readFileSync(path.join(outSite,route))))
   fail('unrelated_edition_media_or_image_changed:'+route);
 }
 const changed=[HOME,SOURCES,BRIEF_BUILDER_ROUTE].map(route=>({
  route,current_sha256:hash(recovered[route]),
  previous_sha256:route===BRIEF_BUILDER_ROUTE?null:hash(fs.readFileSync(path.join(historySite,route)))
 }));
 return {schema_version:'daily-compiler-brief-builder-history-only-recovery-v1',
  result:'PASS',edition_date:'2026-10-27',original_deployment_run:40576857499,
  prior_history_sha:historyHead,scope:rev.scope,files_changed:3,changed,
  exact_already_live_bytes_preserved:true,live_review_authorized:true,
  new_pages_deployed:0,previous_editions_and_accepted_images_unchanged:true,
  semantic_rework:0,additional_image_generation:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
 if(!receiptFile)fail('usage: recover-brief-builder-history.mjs <revision> <history/site> <out/site> <receipt>');
 const r=await recoverBriefBuilderHistory({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(r,null,2)+'\n');
 console.log('ALREADY_VERIFIED_LIVE_BUILDER_HISTORY_STAGED',r.files_changed,r.original_deployment_run);
}
