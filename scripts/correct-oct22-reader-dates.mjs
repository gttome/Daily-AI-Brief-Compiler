#!/usr/bin/env node
// Exact-edition reader-only October 22 correction. No images, semantic sources or history are resealed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {removeEmptyAndRepeatedMediaCopy} from '../compiler/reader-materializer.mjs';
import {assertPublishedReaderQuality} from '../compiler/reader-quality.mjs';
const DATE='2026-10-22';
const ORDER=[
  ['stories/2026-10-22/oct22-a1-claude-duet/index.html','October 21, 2026','m12'],
  ['stories/2026-10-22/oct22-a2-salesforce-skills/index.html','October 19, 2026','m14'],
  ['stories/2026-10-22/oct22-k1-nhs-admin-copilot/index.html','October 21, 2026','m10'],
  ['stories/2026-10-22/oct22-k2-asana-ai-teammates/index.html','October 22, 2026','m11'],
  ['stories/2026-10-22/oct22-t1-multimodal-retrieval/index.html','October 21, 2026','m01'],
  ['stories/2026-10-22/oct22-t2-agentic-threat-campaigns/index.html','October 21, 2026','m02'],
  ['videos/2026-10-22/general/index.html','November 9, 2023',null],
  ['videos/2026-10-22/agent-skills/index.html','May 17, 2024',null],
  ['podcasts/2026-10-22/tool-integration-triggers-severe-safety-refusal-degradation/index.html','October 20, 2026',null],
  ['podcasts/2026-10-22/ai-in-the-am-where-s-the-steering-wheel/index.html','October 17, 2026',null]
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const invalid=/((?:<strong>Date:<\/strong>|\*\*Date:\*\*)\s*)([A-Za-z]+ NaN, \d{4})/g;
function checkRevision(file){
  const r=JSON.parse(fs.readFileSync(file,'utf8'));
  if(r.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    r.correction_id!=='DAB-READER-OCT22-001'||
    r.correction_type!=='OCT22_READER_DATES_MEDIA_COPY_ONLY'||
    r.edition_date!==DATE||r.scope!=='OCT22_READER_METADATA_ONLY')
    throw Error('October 22 reader-only revision not authorized');
  return r;
}
function walk(dir,relative=''){
  const results=[];
  for(const entry of fs.readdirSync(path.join(dir,relative),{withFileTypes:true})){
    const name=path.posix.join(relative,entry.name);
    if(entry.isDirectory())results.push(...walk(dir,name));
    else if(entry.isFile())results.push(name);
    else throw Error('unexpected site entry '+name);
  }
  return results.sort();
}
export function fixOct22RenderedDates(text,dates){
  let count=0;
  const fixed=text.replace(invalid,(_whole,prefix,old)=>{
    const wanted=dates[count++];
    if(!wanted||old.split(' ')[0]!==wanted.split(' ')[0]||
       old.split(', ')[1]!==wanted.split(', ')[1])
      throw Error('October 22 observed date differs from sealed publisher evidence: '+old);
    return prefix+wanted;
  });
  if(count!==dates.length)throw Error('date count not exactly sealed: '+count+' expected '+dates.length);
  return fixed;
}
function fixCoverage(text){
  const pattern=/(<strong>Coverage period:<\/strong>|\*\*Coverage period:\*\*) October 22, 2026/g;
  const count=(text.match(pattern)||[]).length;
  if(count!==1)throw Error('October 22 coverage line no longer matches original');
  return text.replace(pattern,'$1 October 19–22, 2026');
}
function imageFromPublishedStory(site,route,slot){
  const html=fs.readFileSync(path.join(site,route),'utf8');
  const tags=[...html.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/g)];
  const matching=tags.filter(x=>x[1].includes('dab-edition-2026-10-22-'+slot+'.png?v='));
  if(matching.length!==1)throw Error('accepted image binding unavailable for '+route);
  return {url:matching[0][1],alt:matching[0][2]};
}
function fixMarkdownImageParity(md,site){
  const accepted=ORDER.filter(x=>x[2]).map(([route,_,slot])=>imageFromPublishedStory(site,route,slot));
  const pattern=/!\[Illustration pending for [^\]]+\]\(https:\/\/gttome\.github\.io\/Daily-AI-Brief-Compiler\/briefs\/images\/2026-10-22\/illustration-pending\.svg\?v=[a-f0-9]{12}\)/g;
  let count=0;
  const result=md.replace(pattern,()=>{
    const next=accepted[count++];
    if(!next)throw Error('unexpected seventh Markdown pending image');
    return '!['+next.alt.replaceAll('[','(').replaceAll(']',')')+']('+next.url+')';
  });
  if(count!==6)throw Error('six accepted Markdown illustration references required; found '+count);
  return result;
}
export function correctOct22Reader({revisionFile,siteDir,outDir,receiptFile}){
  const r=checkRevision(revisionFile);
  if(path.resolve(outDir)===path.resolve(siteDir)||path.resolve(outDir).startsWith(path.resolve(siteDir)+path.sep))
    throw Error('correction output cannot overwrite published history');
  const archive=JSON.parse(fs.readFileSync(path.join(siteDir,'data/archive-index.json'),'utf8'));
  const latest=archive.stories?.find(x=>x.content_type==='Article')?.brief_date;
  if(!latest||latest<DATE)throw Error('October 22 archive not published');
  const includeLatest=latest===DATE;
  const overview=['briefs/'+DATE+'/index.html'];
  if(includeLatest)overview.push('index.html','latest.html','latest.md');
  const routes=[...overview,...ORDER.map(x=>x[0])];
  const files=walk(siteDir);
  for(const route of routes)if(!files.includes(route))throw Error('required published route missing: '+route);
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(siteDir,outDir,{recursive:true});
  const changed=[];
  let dateCount=0;
  for(const route of routes){
    const before=fs.readFileSync(path.join(siteDir,route),'utf8');
    const selection=ORDER.find(x=>x[0]===route);
    const expected=selection?[selection[1]]:ORDER.map(x=>x[1]);
    let after=fixOct22RenderedDates(before,expected);
    after=removeEmptyAndRepeatedMediaCopy(after);
    if(!selection)after=fixCoverage(after);
    if(route==='latest.md')after=fixMarkdownImageParity(after,siteDir);
    if(after===before)throw Error('expected reader correction had no change: '+route);
    if(route.endsWith('.html'))assertPublishedReaderQuality(after,{route,expectedDates:expected.length});
    fs.writeFileSync(path.join(outDir,route),after);
    changed.push({route,original_sha256:sha(Buffer.from(before)),
      current_sha256:sha(Buffer.from(after)),date_count:expected.length});
    dateCount+=expected.length;
  }
  if(JSON.stringify(files)!==JSON.stringify(walk(outDir)))throw Error('published file inventory drift');
  const touched=new Set(routes),preserved=files.filter(x=>!touched.has(x));
  let pngCount=0;
  for(const name of preserved){
    if(!fs.readFileSync(path.join(siteDir,name)).equals(fs.readFileSync(path.join(outDir,name))))
      throw Error('out-of-scope historical object changed: '+name);
    if(/^briefs\/images\/2026-10-22\/.*\.png$/.test(name))pngCount++;
  }
  if(pngCount<6)throw Error('previously accepted October 22 PNG bytes not preserved');
  const report={
    schema_version:'daily-compiler-oct22-reader-correction-v1',result:'PASS',edition_date:DATE,
    correction_id:r.correction_id,files_changed:changed.length,
    homepage_latest_changed:includeLatest,dates_repaired:dateCount,
    accepted_png_files_byte_preserved:pngCount,
    unrelated_files_byte_preserved:preserved.length,no_editorial_reseal:true,
    markdown_accepted_images_corrected:includeLatest?6:0,
    changed
  };
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [revisionFile,siteDir,outDir,receiptFile]=process.argv.slice(2);
  if(!revisionFile||!siteDir||!outDir||!receiptFile)throw Error('expected revision, site, output, receipt');
  console.log(JSON.stringify(correctOct22Reader({revisionFile,siteDir,outDir,receiptFile}),null,2));
}
