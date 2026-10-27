#!/usr/bin/env node
// One shared local JS bridge updates navigation on every historical Brief page
// without rewriting protected dated HTML; two informational pages get narrow
// source/HTML fixes. The CSS is moved from escaped body text to a real head tag.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BUILDER_CSS_PATH,repairPublishedBuilderStyle,validateBuiltBuilderHead} from '../compiler/brief-builder-style.mjs';
import {appendGlobalBriefNavigation,GLOBAL_BRIEF_NAV_MARKER} from '../compiler/global-brief-navigation.mjs';
import {assertUniqueBriefInternalLinks} from '../compiler/brief-explainer-link-integrity.mjs';

const ROUTES=['assets/js/audience.js','build-your-own-brief-compiler/index.html','sources/index.html'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=s=>{throw Error('sitewide_brief_header_and_css:'+s);};
function inventory(root,relative=''){
 return fs.readdirSync(path.join(root,relative),{withFileTypes:true}).flatMap(e=>{
  const route=path.posix.join(relative,e.name);
  if(e.isDirectory())return inventory(root,route);
  if(!e.isFile())fail('special_file_in_site:'+route);
  return [route];
 }).sort();
}
export function auditSharedNavDelivery(root){
 const pages=inventory(root).filter(x=>x.endsWith('.html'));
 let eligible=0,missing=0,withBuilder=0,withSources=0;
 const exceptions=[];
 for(const route of pages){
  const html=fs.readFileSync(path.join(root,route),'utf8');
  if(!html.includes('class="ledger-primary-nav"'))continue;
  eligible++;
  if(html.includes('assets/js/audience.js')){}else{
   missing++;if(exceptions.length<10)exceptions.push(route);
  }
  const nav=html.match(/<nav class="ledger-primary-nav"[\s\S]*?<\/nav>/)?.[0];
  if(!nav?.includes('href="/Daily-AI-Brief-Compiler/sources/"'))
   fail('header_missing_sources_link:'+route);
  withSources++;
  if(nav.includes('href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/"'))
   withBuilder++;
 }
 if(eligible<300||missing!==0)fail('global_header_script_coverage_incomplete:'+JSON.stringify({eligible,missing,exceptions}));
 return {html_pages:pages.length,eligible_header_pages:eligible,
   common_audience_js_present:eligible-missing,existing_builder_links:withBuilder,sources_links:withSources};
}
export function addBuilderToPublishedSourcesHead(page){
 let source=String(page);
 const nav='<nav class="ledger-primary-nav" aria-label="Primary navigation">';
 const headerStart=source.indexOf(nav),headerEnd=source.indexOf('</nav>',headerStart);
 if(headerStart<0||headerEnd<=headerStart)fail('sources_header_missing');
 const header=source.slice(headerStart,headerEnd);
 const src='<li><a href="/Daily-AI-Brief-Compiler/sources/">Sources</a></li>';
 const link='<li><a href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/">Build Your Own Brief</a></li>';
 if(header.split(src).length!==2||header.includes(link))
  fail('sources_header_already_changed_or_missing');
 source=source.slice(0,headerStart)+header.replace(src,src+'\n            '+link)+source.slice(headerEnd);
 const old='<a href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/">Build Your Own Brief Compiler — from information to a living knowledge system</a>';
 if(source.split(old).length!==2)fail('sources_single_cta_missing_or_changed');
 source=source.replace(old,'<strong>Build Your Own Brief Compiler — from information to a living knowledge system</strong>. Use the link near the title to open the guide');
 if(!source.includes('id="source-builder"')||
    (source.match(/class="src-source-card"/g)||[]).length!==208)
   fail('source_registry_directory_or_explainer_lost');
 assertUniqueBriefInternalLinks(source,{page:'sources'});
 return source;
}
export function stageGlobalBriefHeaderAndCss({revisionFile,historySite,outSite}){
 const revision=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 if(revision.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    revision.correction_type!=='GLOBAL_BRIEF_HEADER_AND_BUILDER_CSS'||
    revision.scope!=='SHARED_NAV_JS_BUILDER_HTML_SOURCES_HTML_ONLY'||
    revision.requested_by!=='owner'||revision.edition_date!=='2026-10-27'||
    !revision.expected_previous_pages||ROUTES.some(route=>!/^[a-f0-9]{40}$/.test(revision.expected_previous_pages[route]||''))||
    !/^[a-f0-9]{40}$/.test(revision.expected_css_blob_sha||''))
   fail('invalid_or_stale_owner_revision');
 if(!historySite||!fs.existsSync(historySite)||!outSite||fs.existsSync(outSite))
   fail('source_missing_or_output_exists');
 const cssFile=fs.readFileSync(BUILDER_CSS_PATH);
 if(blob(cssFile)!==revision.expected_css_blob_sha)
   fail('css_changed_since_source_review');
 const css=cssFile.toString('utf8');
 const oldFiles={},newFiles={};
 for(const route of ROUTES){
  oldFiles[route]=fs.readFileSync(path.join(historySite,route));
  if(blob(oldFiles[route])!==revision.expected_previous_pages[route])
   fail('published_route_drift_since_owner_review:'+route);
 }
 const coverage=auditSharedNavDelivery(historySite);
 newFiles[ROUTES[0]]=Buffer.from(appendGlobalBriefNavigation(oldFiles[ROUTES[0]].toString('utf8')));
 const originalAudience=oldFiles[ROUTES[0]].toString('utf8').trimEnd();
 if(!newFiles[ROUTES[0]].toString('utf8').startsWith(originalAudience)||
    !newFiles[ROUTES[0]].toString('utf8').includes(GLOBAL_BRIEF_NAV_MARKER))
   fail('original_shared_analytics_modified');
 const correctedBuilder=repairPublishedBuilderStyle(oldFiles[ROUTES[1]].toString('utf8'),css);
 validateBuiltBuilderHead(correctedBuilder);
 assertUniqueBriefInternalLinks(correctedBuilder,{page:'builder'});
 newFiles[ROUTES[1]]=Buffer.from(correctedBuilder);
 newFiles[ROUTES[2]]=Buffer.from(addBuilderToPublishedSourcesHead(oldFiles[ROUTES[2]].toString('utf8')));
 const originalList=inventory(historySite);
 fs.cpSync(historySite,outSite,{recursive:true,force:true});
 for(const route of ROUTES)fs.writeFileSync(path.join(outSite,route),newFiles[route]);
 const nextList=inventory(outSite);
 if(JSON.stringify(originalList)!==JSON.stringify(nextList))fail('site_inventory_changed');
 let edits=0;
 for(const route of originalList){
  const previous=fs.readFileSync(path.join(historySite,route)),
    current=fs.readFileSync(path.join(outSite,route));
  if(!previous.equals(current)){
   if(!ROUTES.includes(route))fail('unapproved_historical_file_mutation:'+route);
   edits++;
  }
 }
 if(edits!==3)fail('exactly_three_routes_expected');
 return {
  schema_version:'daily-compiler-global-brief-header-css-repair-v1',
  result:'PASS',edition_date:'2026-10-27',files_changed:3,
  changed:ROUTES.map(route=>({route,previous_sha256:sha(oldFiles[route]),current_sha256:sha(newFiles[route])})),
  shared_navigation:coverage,
  browser_header_has_sources_and_builder:true,
  builder_style_in_head_not_body:true,
  no_duplicate_explainer_brief_links:true,
  all_historical_html_except_two_informational_pages_unchanged:true,
  all_accepted_pngs_unchanged:true,
  no_editorial_reseal:true,no_paid_apis:true
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
 if(!receiptFile)fail('usage: stage-global-brief-header-css.mjs <revision> <history/site> <out/site> <receipt>');
 const receipt=stageGlobalBriefHeaderAndCss({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
 console.log('GLOBAL_BRIEF_HEADER_CSS_REPAIR_STAGED',receipt.shared_navigation.eligible_header_pages,receipt.files_changed);
}
