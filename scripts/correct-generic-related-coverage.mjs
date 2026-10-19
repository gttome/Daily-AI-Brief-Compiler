#!/usr/bin/env node
// Post-publication reader-only repair. Historical article text, images, media,
// Watchlist, semantic bundles and prior substantive links stay byte-identical.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const DATES=['2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19'];
const HISTORICAL_ORIGIN='https://gttome.github.io/Daily-AI-Brief-Compiler/stories/2026-10-06/';
const RELATED_BLOCK=/<div class="related-coverage"><strong>Earlier Brief<\/strong><p><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/p><p>(\d{4}-\d{2}-\d{2}) · ([^<]+)<\/p><\/div>/g;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFileSync(file,'utf8');
const fail=message=>{throw new Error(message);};
function walk(root){
  const files=[];
  function visit(rel){
    const full=path.join(root,rel);
    for(const entry of fs.readdirSync(full,{withFileTypes:true})){
      const target=path.posix.join(rel,entry.name);
      if(entry.isDirectory())visit(target);
      else if(entry.isFile())files.push(target);
      else fail('unsupported published-history file type: '+target);
    }
  }
  visit('');
  return files.sort();
}
function readRevision(revisionFile){
  const revision=JSON.parse(read(revisionFile));
  if(revision.schema_version!=='daily-compiler-reading-copy-correction-v1'||
     revision.correction_type!=='UNVERIFIED_EARLIER_BRIEF_TEXT_ONLY'||
     revision.correction_id!=='DAB-READER-EARLIER-20261019-001'||
     JSON.stringify(revision.edition_dates)!==JSON.stringify(DATES)||
     !revision.reason||revision.scope!=='UNVERIFIED_HISTORICAL_LINKS_ONLY')
    fail('reader earlier-brief correction authorization does not match the exact approved scope');
  return revision;
}
function articlePages(root,date){
  const dir=path.join(root,'stories',date);
  if(!fs.existsSync(dir))fail('missing published permanent article pages for '+date);
  const pages=walk(dir).filter(p=>p.endsWith('/index.html')).map(p=>'stories/'+date+'/'+p).sort();
  if(pages.length!==6)fail('expected six archived permanent story pages on '+date+', got '+pages.length);
  return pages;
}
export function removeGenericEarlierBrief(source,{editionDate,expectedCount}){
  if(typeof source!=='string'||!DATES.includes(editionDate))fail('unsupported correction edition');
  let removed=0;
  const fixed=source.replace(RELATED_BLOCK,(block,url,title,earlierDate,reason)=>{
    if(earlierDate!=='2026-10-06'||!url.startsWith(HISTORICAL_ORIGIN))
      fail('earlier article is not the confirmed repeated October 6 fixture: '+url);
    const day=Number(editionDate.slice(-2));
    const generic=new RegExp('^(?:Other October '+day+' (?:edition )?(?:articles|stories) (?:cover|examine)|See companion October '+day+' coverage)\\b','i');
    if(!generic.test(reason))fail('related-coverage explanation is not generic; preserve and review manually');
    removed++;
    return '';
  });
  if(removed!==expectedCount)
    fail('unexpected generic Earlier Brief panel count '+removed+' in '+editionDate+', expected '+expectedCount);
  return {html:fixed,removed};
}
export function correctGenericRelatedCoverage({revisionFile,siteDir,outDir,receiptFile}){
  const rev=readRevision(revisionFile);
  if(path.resolve(outDir)===path.resolve(siteDir)||path.resolve(outDir).startsWith(path.resolve(siteDir)+path.sep))
    fail('output must not overwrite the published history source');
  const archive=JSON.parse(read(path.join(siteDir,'data/archive-index.json')));
  const latest=archive.stories?.find(s=>s.content_type==='Article')?.brief_date;
  if(typeof latest!=='string'||latest<DATES.at(-1))fail('published history is missing target October 19');
  const includeLatest=latest===DATES.at(-1);
  const routes=[];
  for(const date of DATES){
    routes.push({route:'briefs/'+date+'/index.html',date,count:6});
    for(const route of articlePages(siteDir,date))routes.push({route,date,count:1});
  }
  if(includeLatest){
    for(const route of ['index.html','latest.html','latest.md'])routes.push({route,date:DATES.at(-1),count:6});
  }
  const seenRoutes=new Set(routes.map(r=>r.route));
  if(seenRoutes.size!==routes.length||routes.length!==(includeLatest?52:49))
    fail('published reader correction route set invalid');
  const beforeFiles=walk(siteDir);
  for(const {route} of routes)if(!beforeFiles.includes(route))fail('missing published route: '+route);
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(siteDir,outDir,{recursive:true});
  const changed=[];
  let removed=0;
  for(const {route,date,count} of routes){
    const initial=read(path.join(siteDir,route));
    if(!initial.includes(date))fail('reader route edition identity does not match: '+route);
    const correction=removeGenericEarlierBrief(initial,{editionDate:date,expectedCount:count});
    if(correction.html===initial)fail('no correction made to expected route: '+route);
    fs.writeFileSync(path.join(outDir,route),correction.html);
    changed.push({
      route,
      edition_date:date,
      removed_blocks:correction.removed,
      original_sha256:sha(Buffer.from(initial)),
      current_sha256:sha(Buffer.from(correction.html))
    });
    removed+=correction.removed;
  }
  const afterFiles=walk(outDir);
  if(JSON.stringify(beforeFiles)!==JSON.stringify(afterFiles))
    fail('reader text correction cannot add or remove published files');
  let otherFilesBytePreserved=0,imagesPreserved=0;
  for(const route of beforeFiles){
    if(seenRoutes.has(route))continue;
    const before=fs.readFileSync(path.join(siteDir,route));
    const after=fs.readFileSync(path.join(outDir,route));
    if(!before.equals(after))fail('out-of-scope published content changed: '+route);
    otherFilesBytePreserved++;
    if(route.startsWith('briefs/images/')&&route.endsWith('.png'))imagesPreserved++;
  }
  if(removed!==(includeLatest?102:84)||imagesPreserved<6)
    fail('reader correction removed unexpected panels or failed to preserve accepted PNGs');
  const receipt={
    schema_version:'daily-compiler-generic-related-reader-correction-v1',
    result:'PASS',
    correction_id:rev.correction_id,
    edition_dates:DATES,
    last_published_date:latest,
    homepage_latest_changed:includeLatest,
    scope:'Only generic October 6 Earlier Brief links in October 13–19 article readers; no semantic or image resealing',
    changed,
    files_changed:changed.length,
    panels_removed:removed,
    editions_corrected:DATES.length,
    unrelated_files_byte_preserved:otherFilesBytePreserved,
    accepted_png_files_byte_preserved:imagesPreserved,
    prior_substantive_links_preserved:true,
    original_articles_images_media_watchlist_unchanged:true
  };
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
  return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [revisionFile,siteDir,outDir,receiptFile]=process.argv.slice(2);
  if(!revisionFile||!siteDir||!outDir||!receiptFile)
    fail('usage: node scripts/correct-generic-related-coverage.mjs <revision.json> <published-site> <out> <receipt.json>');
  console.log(JSON.stringify(correctGenericRelatedCoverage({revisionFile,siteDir,outDir,receiptFile}),null,2));
}
