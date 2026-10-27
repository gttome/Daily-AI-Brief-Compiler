#!/usr/bin/env node
// Sources-page-only public reader update. Preserves all historical editions,
// feeds, accepted image binaries and user engagement data byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {replacePublishedSourcesPage,sourceRegistrySummary,SOURCES_TRANSPARENCY_REVISION} from '../compiler/source-transparency.mjs';

const ROUTE='sources/index.html';
const REGISTRY='config/resource-registry.json';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=s=>{throw Error('source_page_correction:'+s);};
function inventory(root,relative=''){
  const rows=[];
  for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
    const route=path.posix.join(relative,entry.name);
    if(entry.isDirectory())rows.push(...inventory(root,route));
    else if(entry.isFile())rows.push(route);
    else fail('unexpected_special_file:'+route);
  }
  return rows.sort();
}
export function correctSourcesPage({revisionFile,historySite,outSite}){
  const revision=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
  if(revision.schema_version!=='daily-compiler-reading-copy-correction-v1'||
     revision.correction_type!=='SOURCES_TRANSPARENCY_ENHANCEMENT_ONLY'||
     revision.scope!=='SOURCES_INDEX_HTML_ONLY'||
     revision.requested_by!=='owner'||
     revision.revision!==SOURCES_TRANSPARENCY_REVISION||
     !/^[a-f0-9]{40}$/.test(revision.expected_previous_sources_blob_sha||'')||
     !/^[a-f0-9]{40}$/.test(revision.expected_registry_blob_sha||''))
    fail('invalid_unapproved_or_stale_revision');
  if(!historySite||!outSite||!fs.existsSync(historySite)||fs.existsSync(outSite))
    fail('invalid_staging_paths');
  const registryBytes=fs.readFileSync(REGISTRY);
  if(blob(registryBytes)!==revision.expected_registry_blob_sha)
    fail('registry_changed_since_editorial_source_audit');
  const registry=JSON.parse(registryBytes.toString('utf8'));
  const s=sourceRegistrySummary(registry);
  if(s.registered!==revision.expected_counts?.catalogued||
     s.enabled!==revision.expected_counts?.enabled||
     s.pending!==revision.expected_counts?.pending)
    fail('protected_source_registry_count_drift');
  const previous=fs.readFileSync(path.join(historySite,ROUTE));
  if(blob(previous)!==revision.expected_previous_sources_blob_sha)
    fail('public_sources_page_changed_since_owner_review');
  const original=previous.toString('utf8');
  const updated=replacePublishedSourcesPage(original,registry);
  if(updated===original||updated.includes('two videos, and one podcast')||
     (updated.match(/data-source-id="/g)||[]).length!==s.registered)
    fail('revised_sources_page_missing_inventory_or_had_old_media_count');
  const list=inventory(historySite);
  fs.cpSync(historySite,outSite,{recursive:true,force:true});
  fs.writeFileSync(path.join(outSite,ROUTE),updated);
  if(JSON.stringify(list)!==JSON.stringify(inventory(outSite)))
    fail('unexpected_site_inventory_difference');
  let changed=0;
  for(const route of list){
    const old=fs.readFileSync(path.join(historySite,route));
    const now=fs.readFileSync(path.join(outSite,route));
    if(!old.equals(now)){
      if(route!==ROUTE)fail('unapproved_public_file_changed:'+route);
      changed++;
    }
  }
  if(changed!==1)fail('exactly_one_sources_page_required');
  return {schema_version:'daily-compiler-sources-transparency-correction-v1',
    result:'PASS',edition_date:revision.edition_date,scope:revision.scope,
    files_changed:1,changed:[{route:ROUTE,previous_sha256:hash(previous),
      current_sha256:hash(Buffer.from(updated,'utf8'))}],
    source_records:s.registered,enabled_routes:s.enabled,pending_qualification:s.pending,
    all_earlier_editions_and_accepted_images_unchanged:true,story_count_changed:0,
    new_paid_dependencies:0,source_links_rewritten:0};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
  if(!receiptFile)fail('usage: correct-sources-transparency.mjs <revision> <history/site> <out/site> <receipt>');
  const result=correctSourcesPage({revisionFile,historySite,outSite});
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({result:result.result,source_records:result.source_records,
    enabled_routes:result.enabled_routes,pending_qualification:result.pending_qualification,files_changed:result.files_changed}));
}
