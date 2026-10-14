#!/usr/bin/env node
// Text-only post-publication correction. Never rebuilds a semantic bundle or replaces images.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {removeRedundantReadingCopy,assertCleanReadingCopy,READING_COPY_EFFECTIVE} from '../compiler/reading-copy.mjs';

const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function fail(message){throw new Error(message);}
function walk(root){
  const found=[];
  function visit(relative){
    const dir=path.join(root,relative);
    for(const item of fs.readdirSync(dir,{withFileTypes:true})){
      const target=path.posix.join(relative,item.name);
      if(item.isDirectory())visit(target);
      else if(item.isFile())found.push(target);
      else fail('unsupported file type in published history: '+target);
    }
  }
  visit('');
  return found.sort();
}
function datedPages(root,kind,date){
  const base=path.join(root,kind,date);
  if(!fs.existsSync(base))fail('missing dated '+kind+' directory');
  return walk(base).filter(p=>p.endsWith('/index.html')).map(p=>path.posix.join(kind,date,p)).sort();
}
function readRevision(file){
  const revision=JSON.parse(fs.readFileSync(file,'utf8'));
  if(revision.schema_version!=='daily-compiler-reading-copy-correction-v1')fail('unknown correction schema');
  if(revision.edition_date!==READING_COPY_EFFECTIVE)fail('revision is not authorized for October 14');
  if(revision.correction_type!=='DUPLICATED_READING_SUPPORT_TEXT_ONLY')fail('invalid scope');
  if(!revision.reason||!revision.correction_id)fail('revision identity/rationale required');
  return revision;
}
export function correctPublishedReadingCopy({revisionFile,siteDir,outDir,receiptFile}){
  const revision=readRevision(revisionFile);
  const date=revision.edition_date;
  if(path.resolve(outDir).startsWith(path.resolve(siteDir)+path.sep))fail('output must not be inside source tree');
  const storyPages=datedPages(siteDir,'stories',date);
  const videoPages=datedPages(siteDir,'videos',date);
  const podcastPages=datedPages(siteDir,'podcasts',date);
  if(storyPages.length!==6||videoPages.length!==2||podcastPages.length!==2)
    fail('expected 6 articles, 2 videos and 2 podcasts: got '+[storyPages.length,videoPages.length,podcastPages.length]);
  const routes=['index.html','latest.html',`briefs/${date}/index.html`,...storyPages,...videoPages,...podcastPages];
  if(new Set(routes).size!==13)fail('unexpected correction route count');
  const originalFiles=walk(siteDir);
  for(const route of routes)if(!originalFiles.includes(route))fail('published route missing: '+route);
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(siteDir,outDir,{recursive:true});
  const changed=[];
  let total=0;
  for(const route of routes){
    const src=fs.readFileSync(path.join(siteDir,route),'utf8');
    if(!src.includes(date))fail('route not bound to target edition: '+route);
    const fixed=removeRedundantReadingCopy(src,{editionDate:date,requireCopies:true});
    const expected=(route==='index.html'||route==='latest.html'||route===`briefs/${date}/index.html`)?8:1;
    if(fixed.removed!==expected)fail('unexpected duplicate count '+fixed.removed+' in '+route+' (expected '+expected+')');
    assertCleanReadingCopy(fixed.html,{editionDate:date});
    const summaries=(fixed.html.match(/<strong>Summary:<\/strong>/g)||[]).length;
    const whys=(fixed.html.match(/<strong>Why it matters:<\/strong>/g)||[]).length;
    if(summaries!==(expected===8?10:1)||whys!==(expected===8?10:1))
      fail('canonical summary/why counts changed: '+route);
    const before=Buffer.from(src),after=Buffer.from(fixed.html);
    if(before.equals(after))fail('route produced no actual correction: '+route);
    fs.writeFileSync(path.join(outDir,route),after);
    changed.push({route,original_sha256:sha256(before),current_sha256:sha256(after),removed_blocks:fixed.removed});
    total+=fixed.removed;
  }
  const resulting=walk(outDir);
  if(JSON.stringify(resulting)!==JSON.stringify(originalFiles))fail('published file inventory changed');
  const allowed=new Set(changed.map(x=>x.route));
  let preserved=0,images=0;
  for(const route of originalFiles){
    if(allowed.has(route))continue;
    const before=fs.readFileSync(path.join(siteDir,route));
    const after=fs.readFileSync(path.join(outDir,route));
    if(!before.equals(after))fail('protected published content drift: '+route);
    preserved++;
    if(route.startsWith(`briefs/images/${date}/`))images++;
  }
  if(total!==34||images<1)fail('expected 34 duplicated blocks and at least one existing image');
  const receipt={
    schema_version:'daily-compiler-reading-copy-correction-receipt-v1',
    result:'PASS',
    edition_date:date,
    correction_id:revision.correction_id,
    scope:'13 reader HTML files only; semantic bundle, all images, watchlist, media and older editions unchanged',
    changed,
    files_changed:changed.length,
    repeated_blocks_removed:total,
    other_files_byte_preserved:preserved,
    current_image_files_byte_preserved:images,
    canonical_summary_why_unchanged:true,
    older_editions_unchanged:true
  };
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
  return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [revisionFile,siteDir,outDir,receiptFile]=process.argv.slice(2);
  if(!revisionFile||!siteDir||!outDir||!receiptFile)
    fail('usage: node scripts/correct-reading-duplication.mjs <revision.json> <published-site> <output-dir> <receipt.json>');
  console.log(JSON.stringify(correctPublishedReadingCopy({revisionFile,siteDir,outDir,receiptFile}),null,2));
}
