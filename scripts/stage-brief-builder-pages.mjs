#!/usr/bin/env node
// Publish exactly one new static Jekyll-built web page, plus a short Sources
// section and homepage navigation. Existing editions, media and accepted image
// binaries remain byte-identical. Uses the existing protected Pages lane.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  BRIEF_BUILDER_ROUTE,BRIEF_BUILDER_MD,addBuilderToPublishedNavigation,
  assertBuilderMarkdown
} from '../compiler/brief-builder-pages.mjs';
import {renderBriefBuilderSummary} from '../compiler/source-transparency.mjs';

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=s=>{throw Error('brief_builder_pages:'+s);};
const HOME='index.html',SOURCES='sources/index.html';
function inventory(root,rel=''){
  return fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(entry=>{
    const route=path.posix.join(rel,entry.name);
    if(entry.isDirectory())return inventory(root,route);
    if(!entry.isFile())fail('unexpected_symlink_or_special_file:'+route);
    return [route];
  }).sort();
}
export function assertBuiltBriefPage(page){
  const text=String(page);
  for(const mark of [
    '<!DOCTYPE html>','<html', '<main id="content"',
    '/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/',
    'From information to a living knowledge system',
    'The difference: connected intelligence, not a topic checklist',
    'The second product: a living knowledge system',
    'How the Brief stays current: a governed self-evolving loop',
    'How to start with a Brief Compiler for your own field',
    'The Generative AI Professional', 'id="brief-compiler-builder-style"',
    'class="brief-builder-jump"'
  ])if(!text.includes(mark))fail('built_page_missing:'+mark);
  for(const sector of ['manufacturing','healthcare','cybersecurity','education','government','gardening']){
    const marker='id="use-case-'+sector+'"';
    if(text.split(marker).length!==2)fail('use_case_anchor_missing_or_duplicate:'+sector);
  }
  if((text.match(/href="https:\/\/leanpub\.com\/(?:genaipromptingguide|genaipro|GenAILearn|reliable-context-engineering)"/g)||[]).length!==4)
    fail('four_book_destinations_not_bound');
  if(!text.includes('name="viewport"')||
     !text.includes('320px')&& !text.includes('max-width:480px')&& !text.includes('max-width: 480px'))
    fail('responsive_viewport_or_styles_missing');
  if(/sandbox:\/|file:\/\/\//.test(text))fail('unpublished_document_url_in_page');
  return true;
}
export function insertBuilderIntoSources(source){
  if(source.includes('id="source-builder"'))fail('source_summary_already_published');
  const nav='<a href="#source-accountability">Our commitments</a>';
  if(source.split(nav).length!==2)fail('source_page_section_nav_changed');
  let next=source.replace(nav,
    '<a href="#source-builder">Build your own Brief</a>'+nav);
  const anchor='<section class="src-section" id="source-accountability">';
  if(next.split(anchor).length!==2)fail('source_page_content_anchor_changed');
  next=next.replace(anchor,renderBriefBuilderSummary()+'\n'+anchor);
  if(!next.includes('Build Your Own Brief Compiler — from information to a living knowledge system'))
    fail('source_page_builder_explanation_missing');
  return next;
}
export function stageBriefBuilderPages({revisionFile,historySite,compiledPage,outSite}){
  const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
  if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
     rev.correction_type!=='BRIEF_BUILDER_SITE_PAGES'||
     rev.scope!=='SOURCES_SUMMARY_NEW_BUILDER_PAGE_HOME_NAV_ONLY'||
     rev.requested_by!=='owner'||rev.edition_date!=='2026-10-27'||
     !/^[a-f0-9]{40}$/.test(rev.expected_sources_blob_sha||'')||
     !/^[a-f0-9]{40}$/.test(rev.expected_home_blob_sha||'')||
     !/^[a-f0-9]{40}$/.test(rev.expected_builder_markdown_blob_sha||''))
    fail('revision_not_approved_or_invalid');
  if(!historySite||!compiledPage||!outSite||
     !fs.existsSync(historySite)||!fs.existsSync(compiledPage)||fs.existsSync(outSite))
    fail('missing_input_or_output_already_exists');
  const content=fs.readFileSync(BRIEF_BUILDER_MD);
  if(gitBlob(content)!==rev.expected_builder_markdown_blob_sha)
    fail('compiled_page_source_drift');
  assertBuilderMarkdown(content.toString('utf8'));
  const compiled=fs.readFileSync(compiledPage);
  assertBuiltBriefPage(compiled.toString('utf8'));
  const previous=inventory(historySite);
  if(previous.includes(BRIEF_BUILDER_ROUTE))fail('existing_web_route_must_not_be_overwritten');
  for(const route of [HOME,SOURCES]){
    if(!previous.includes(route))fail('missing_existing_page:'+route);
  }
  const home=fs.readFileSync(path.join(historySite,HOME)),
    sources=fs.readFileSync(path.join(historySite,SOURCES));
  if(gitBlob(home)!==rev.expected_home_blob_sha||
     gitBlob(sources)!==rev.expected_sources_blob_sha)
    fail('public_home_or_sources_changed_since_review');
  const nextHome=addBuilderToPublishedNavigation(home.toString('utf8'));
  let nextSources=addBuilderToPublishedNavigation(sources.toString('utf8'));
  nextSources=insertBuilderIntoSources(nextSources);
  fs.cpSync(historySite,outSite,{recursive:true,force:true});
  fs.writeFileSync(path.join(outSite,HOME),nextHome);
  fs.writeFileSync(path.join(outSite,SOURCES),nextSources);
  fs.mkdirSync(path.join(outSite,path.dirname(BRIEF_BUILDER_ROUTE)),{recursive:true});
  fs.writeFileSync(path.join(outSite,BRIEF_BUILDER_ROUTE),compiled);
  const added=inventory(outSite).filter(x=>!previous.includes(x));
  if(added.length!==1||added[0]!==BRIEF_BUILDER_ROUTE||previous.length+1!==inventory(outSite).length)
    fail('unapproved_file_inventory_change');
  const allowed=new Set([HOME,SOURCES]);
  for(const route of previous){
    const before=fs.readFileSync(path.join(historySite,route)),
      after=fs.readFileSync(path.join(outSite,route));
    if(allowed.has(route)){if(before.equals(after))fail('expected_page_unchanged:'+route);}
    else if(!before.equals(after))fail('unapproved_existing_file_change:'+route);
  }
  const changed=[HOME,SOURCES,BRIEF_BUILDER_ROUTE].map(route=>({
    route,current_sha256:hash(fs.readFileSync(path.join(outSite,route))),
    previous_sha256:route===BRIEF_BUILDER_ROUTE?null:hash(fs.readFileSync(path.join(historySite,route)))
  }));
  return {
    schema_version:'daily-compiler-brief-builder-site-pages-v1',
    result:'PASS',edition_date:rev.edition_date,
    scope:rev.scope,files_changed:3,pages_added:1,pages_updated:2,
    preserved_preexisting_routes:previous.length-2,
    source_section_linked:true,homepage_navigation_linked:true,
    five_examples_and_four_book_destinations:true,
    all_editions_podcasts_articles_and_accepted_images_unchanged:true,
    no_paid_services:true,no_editorial_bundle_reseal:true,changed
  };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const [revisionFile,historySite,compiledPage,outSite,receiptFile]=process.argv.slice(2);
  if(!receiptFile)fail('usage: stage-brief-builder-pages.mjs <revision> <history/site> <compiled-page> <out/site> <receipt>');
  const r=stageBriefBuilderPages({revisionFile,historySite,compiledPage,outSite});
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(r,null,2)+'\n');
  console.log('BRIEF_BUILDER_PAGES_STAGING_PASS',r.files_changed,r.pages_added,r.pages_updated);
}
