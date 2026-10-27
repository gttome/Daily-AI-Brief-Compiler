#!/usr/bin/env node
// Versioned public site-only update: replace two informational HTML routes.
// No article/history/image recompilation, no site-wide link manipulation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  renderBriefBuilderSummary,sourceRegistrySummary
} from '../compiler/source-transparency.mjs';
import {BRIEF_BUILDER_MD} from '../compiler/brief-builder-pages.mjs';
import {assertBuiltBriefPage} from './stage-brief-builder-pages.mjs';
import {
  normalizeBriefExplainerPage,assertUniqueBriefInternalLinks
} from '../compiler/brief-explainer-link-integrity.mjs';

const ROUTES=['sources/index.html','build-your-own-brief-compiler/index.html'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=x=>{throw Error('brief_explainer_web_update:'+x);};
function list(root,rel=''){
 return fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(e=>{
  const loc=path.posix.join(rel,e.name);
  if(e.isDirectory())return list(root,loc);
  if(!e.isFile())fail('unexpected_special_file:'+loc);
  return [loc];
 }).sort();
}
function updateSourcesHtml(before){
 const original=String(before);
 const marker='<section class="src-section" id="source-builder">';
 const pos=original.indexOf(marker),end=original.indexOf('</section>',pos);
 if(pos<0||end<=pos||original.indexOf(marker,pos+marker.length)!==-1)
  fail('sources_summary_anchor_missing_or_duplicate');
 const old=original.slice(pos,end+'</section>'.length);
 if(!old.includes('five complete scenarios')&&!old.includes('five complete scenarios'))
  fail('unexpected_old_sources_summary');
 const summary=renderBriefBuilderSummary();
 if(!summary.includes('six detailed scenarios')||!summary.includes('self-evolving loop'))
  fail('new_sources_summary_missing_hobby_or_evolution');
 let html=original.slice(0,pos)+summary+original.slice(end+'</section>'.length);
 html=normalizeBriefExplainerPage(html,{page:'sources'});
 const srcStats=sourceRegistrySummary(JSON.parse(fs.readFileSync('config/resource-registry.json','utf8')));
 if((html.match(/class="src-source-card"/g)||[]).length!==srcStats.registered)
  fail('source_directory_count_changed');
 if(!html.includes('id="source-directory"')||!html.includes('id="src-search"'))
  fail('source_directory_interaction_missing');
 if(!html.includes('id="source-builder"')||!html.includes('home gardening'))
  fail('source_section_missing');
 return html;
}
export function updatePublicBriefExplainers({revisionFile,historySite,compiledPage,outSite}){
 const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    rev.correction_type!=='BRIEF_BUILDER_HOBBY_EVOLUTION_AND_LINK_HYGIENE'||
    rev.scope!=='SOURCES_AND_BRIEF_BUILDER_HTML_ONLY'||
    rev.requested_by!=='owner'||rev.edition_date!=='2026-10-27'||
    !/^[a-f0-9]{40}$/.test(rev.expected_builder_markdown_blob_sha||'')||
    !rev.expected_previous_pages||ROUTES.some(route=>
      !/^[a-f0-9]{40}$/.test(rev.expected_previous_pages[route]||'')))
   fail('revision_or_expected_source_invalid');
 if(!historySite||!compiledPage||!outSite||
    !fs.existsSync(historySite)||!fs.existsSync(compiledPage)||fs.existsSync(outSite))
   fail('missing_source_or_existing_staging_path');
 const markdown=fs.readFileSync(BRIEF_BUILDER_MD);
 if(blob(markdown)!==rev.expected_builder_markdown_blob_sha)
   fail('current_site_markdown_changed_since_approval');
 const oldFiles={};
 for(const route of ROUTES){
  const filename=path.join(historySite,route);
  if(!fs.existsSync(filename))fail('public_page_missing:'+route);
  oldFiles[route]=fs.readFileSync(filename);
  if(blob(oldFiles[route])!==rev.expected_previous_pages[route])
    fail('published_page_changed_since_owner_review:'+route);
 }
 let newBuilder=fs.readFileSync(compiledPage,'utf8');
 assertBuiltBriefPage(newBuilder);
 newBuilder=normalizeBriefExplainerPage(newBuilder,{page:'builder'});
 if(!newBuilder.includes('How the Brief stays current: a governed self-evolving loop')||
    !newBuilder.includes('Home gardening: a personal growing-intelligence')||
    !newBuilder.includes('href="https://www.rhs.org.uk/about-us/what-we-do/publications/podcasts"'))
   fail('new_website_page_missing_required_material');
 const newSources=updateSourcesHtml(oldFiles[ROUTES[0]].toString('utf8'));
 for(const [k,body] of [['sources',newSources],['builder',newBuilder]]){
  const report=assertUniqueBriefInternalLinks(body,{page:k});
  if(report.result!=='PASS')fail('duplicate_site_links:'+k);
 }
 const inventory=list(historySite);
 fs.cpSync(historySite,outSite,{recursive:true,force:true});
 fs.writeFileSync(path.join(outSite,ROUTES[0]),newSources,'utf8');
 fs.writeFileSync(path.join(outSite,ROUTES[1]),newBuilder,'utf8');
 const all=list(outSite);
 if(JSON.stringify(inventory)!==JSON.stringify(all))fail('unexpected_site_inventory');
 let changes=0;
 for(const route of inventory){
  const before=fs.readFileSync(path.join(historySite,route));
  const after=fs.readFileSync(path.join(outSite,route));
  if(!before.equals(after)){
   if(!ROUTES.includes(route))fail('unapproved_mutation:'+route);
   changes++;
  }
 }
 if(changes!==2)fail('exact_two_site_pages_must_change');
 return {
  schema_version:'daily-compiler-brief-explainer-hobby-evolution-v1',
  result:'PASS',edition_date:rev.edition_date,scope:rev.scope,
  files_changed:2,changed:ROUTES.map(route=>({
   route,previous_sha256:sha(oldFiles[route]),
   current_sha256:sha(fs.readFileSync(path.join(outSite,route)))
  })),
  documented_hobby_use_cases:6,hobby:"home gardening",
  feedback_sources_watchlist_learning_loop:true,
  duplicate_internal_links:0,
  registry_directory_preserved:true,
  accepted_images_reencoded:0,
  all_previous_reader_and_media_bytes_preserved:true,
  new_schedules:0,new_paid_apis:0
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [revisionFile,historySite,compiledPage,outSite,receiptFile]=process.argv.slice(2);
 if(!receiptFile)fail('usage: update-brief-explainer-webpages.mjs <revision> <history/site> <Jekyll-built-HTML> <out/site> <receipt.json>');
 const r=updatePublicBriefExplainers({revisionFile,historySite,compiledPage,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(r,null,2)+'\n');
 console.log('BRIEF_EXPLAINER_HOBBY_EVOLUTION_STAGED',r.files_changed,r.documented_hobby_use_cases,r.duplicate_internal_links);
}
