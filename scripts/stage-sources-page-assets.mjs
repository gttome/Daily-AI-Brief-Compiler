#!/usr/bin/env node
// Source page: move originally embedded raw CSS and JS into functioning assets.
// Only one informational HTML route and two newly created static assets change.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
 SOURCE_CSS,SOURCE_JS,PUBLIC_CSS,PUBLIC_JS,validateSourceAssets,
 repairPublishedSourceMarkup,assertSourcesPageAssets
} from '../compiler/sources-page-assets.mjs';
import {sourceRegistrySummary} from '../compiler/source-transparency.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=x=>{throw Error('sources_page_public_asset_repair:'+x);};
const ROUTES=['sources/index.html',PUBLIC_CSS,PUBLIC_JS];
function list(root,rel=''){
 return fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(e=>{
   const n=path.posix.join(rel,e.name);
   if(e.isDirectory())return list(root,n);
   if(!e.isFile())fail('unexpected_non_file:'+n);
   return [n];
 }).sort();
}
export function stageSourcesAssetRepair({revisionFile,historySite,outSite}){
 const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    rev.correction_type!=='SOURCES_ASSETS_CSS_JS_FIX'||
    rev.scope!=='SOURCES_HTML_AND_TWO_NEW_PUBLIC_ASSETS_ONLY'||
    rev.requested_by!=='owner'||rev.edition_date!=='2026-10-28'||
    !/^[a-f0-9]{40}$/.test(rev.expected_previous_sources_blob_sha||'')||
    !/^[a-f0-9]{40}$/.test(rev.expected_css_blob_sha||'')||
    !/^[a-f0-9]{40}$/.test(rev.expected_js_blob_sha||''))
   fail('unapproved_or_stale_owner_revision');
 if(!historySite||!fs.existsSync(historySite)||!outSite||fs.existsSync(outSite))
   fail('missing_source_or_output_already_exists');
 const prev=fs.readFileSync(path.join(historySite,ROUTES[0]));
 const css=fs.readFileSync(SOURCE_CSS),js=fs.readFileSync(SOURCE_JS);
 if(blob(prev)!==rev.expected_previous_sources_blob_sha||
    blob(css)!==rev.expected_css_blob_sha||
    blob(js)!==rev.expected_js_blob_sha)
   fail('pinned_published_page_or_asset_changed');
 const original=list(historySite);
 if(original.includes(PUBLIC_CSS)||original.includes(PUBLIC_JS))
   fail('assets_already_published');
 validateSourceAssets(css.toString('utf8'),js.toString('utf8'));
 const updated=repairPublishedSourceMarkup(prev.toString('utf8'),
   {css:css.toString('utf8'),js:js.toString('utf8')});
 assertSourcesPageAssets(updated);
 const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
 const totals=sourceRegistrySummary(registry);
 const sourceIds=[...updated.matchAll(/data-source-id="([^"]+)"/g)].map(x=>x[1]);
 if(sourceIds.length!==totals.registered||new Set(sourceIds).size!==sourceIds.length||
    registry.resources.some(x=>!sourceIds.includes(x.resource_id)))
   fail('source_directory_drift');
 fs.cpSync(historySite,outSite,{recursive:true,force:true});
 fs.writeFileSync(path.join(outSite,ROUTES[0]),updated,'utf8');
 for(const [route,bytes] of [[PUBLIC_CSS,css],[PUBLIC_JS,js]]){
   const target=path.join(outSite,route);
   fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.writeFileSync(target,bytes);
 }
 const final=list(outSite),created=final.filter(x=>!original.includes(x));
 if(final.length!==original.length+2||
    JSON.stringify(created)!==JSON.stringify([PUBLIC_CSS,PUBLIC_JS].sort()))
   fail('unapproved_new_public_asset');
 let changeCount=0;
 for(const route of original){
  const old=fs.readFileSync(path.join(historySite,route)),now=fs.readFileSync(path.join(outSite,route));
  if(!old.equals(now)){
   if(route!==ROUTES[0])fail('unapproved_published_reader_or_image_change:'+route);
   changeCount++;
  }
 }
 if(changeCount!==1)fail('sources_html_must_change_once');
 const changed=ROUTES.map(route=>({
  route,
  previous_sha256:route===ROUTES[0]?sha(prev):null,
  current_sha256:sha(fs.readFileSync(path.join(outSite,route)))
 }));
 return {
  schema_version:'daily-compiler-sources-css-js-asset-repair-v1',
  result:'PASS',edition_date:rev.edition_date,files_changed:3,changed,
  source_records:totals.registered,source_enabled:totals.enabled,
  external_css_head:true,external_js_deferred:true,
  escaped_css_and_js_removed:true,interactive_directory_preserved:true,
  all_earlier_articles_videos_podcasts_images_unchanged:true,
  new_paid_apis:0,new_schedules:0
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
 if(!receiptFile)fail('usage: stage-sources-page-assets.mjs <revision> <published-history/site> <new/site> <receipt>');
 const report=stageSourcesAssetRepair({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(report,null,2)+'\n');
 console.log('SOURCE_PAGE_REAL_CSS_JS_ASSET_REPAIR_PASS',report.source_records,report.files_changed);
}
