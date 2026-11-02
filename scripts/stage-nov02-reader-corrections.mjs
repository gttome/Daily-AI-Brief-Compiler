import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const ROOT='vendor/production-reader/snapshot/';
export const NOV02_ROUTES=['assets/css/header.css','index.html','briefs/2026-11-02/index.html','stories/2026-11-02/nov02-k1-protostar-ai-ready-science/index.html','stories/2026-11-02/nov02-a2-article-recommendation-audit-skill/index.html'];
const swaps=[['https://huggingface.co/blog/protostar','https://huggingface.co/blog/announcing-project-protostar'],['https://every.to/source-code/how-to-get-ai-agents-to-recommend-your-articles','https://every.to/also-true-for-humans/how-to-get-ai-agents-to-recommend-your-articles']];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const list=(root,rel='')=>fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(e=>{const p=path.posix.join(rel,e.name);if(e.isDirectory())return list(root,p);if(!e.isFile())throw Error('special_file');return [p];}).sort();
export function stageNov02ReaderCorrections({revisionFile,historySite,outSite}){
 const r=JSON.parse(fs.readFileSync(revisionFile));
 if(r.correction_type!=='NOV02_MOBILE_AND_SOURCE_ROUTES'||r.edition_date!=='2026-11-02'||r.requested_by!=='owner'||
  JSON.stringify(Object.keys(r.expected_previous_pages))!==JSON.stringify(NOV02_ROUTES)||fs.existsSync(outSite))throw Error('invalid_revision_or_output');
 const before=new Map(list(historySite).map(route=>[route,fs.readFileSync(path.join(historySite,route))]));
 const replacements=new Map();
 for(const route of NOV02_ROUTES){
  const old=before.get(route);if(!old||blob(old)!==r.expected_previous_pages[route])throw Error('published_route_drift:'+route);
  let next;
  if(route.endsWith('.css')){
   next=fs.readFileSync(ROOT+route);
   if(blob(next)!==r.expected_header_css_blob_sha)throw Error('unreviewed_header_css');
  }else{
   let text=old.toString('utf8');let count=0;
   for(const [a,b] of swaps){const n=text.split(a).length-1;if(n>1)throw Error('unexpected_source_occurrences');count+=n;text=text.split(a).join(b);}
   if(count!==(route.startsWith('stories/')?1:2))throw Error('source_occurrence_missing');
   next=Buffer.from(text);
  }
  if(old.equals(next))throw Error('no_change:'+route);replacements.set(route,next);
 }
 fs.cpSync(historySite,outSite,{recursive:true});
 for(const [route,bytes] of replacements)fs.writeFileSync(path.join(outSite,route),bytes);
 if(JSON.stringify([...before.keys()])!==JSON.stringify(list(outSite)))throw Error('inventory_changed');
 let preserved=0;
 for(const [route,bytes] of before)if(!replacements.has(route)){
  if(!bytes.equals(fs.readFileSync(path.join(outSite,route))))throw Error('unapproved_change:'+route);preserved++;
 }
 return {schema_version:'daily-compiler-nov02-reader-correction-v1',edition_date:r.edition_date,result:'PASS',files_changed:5,
  changed:[...replacements].map(([route,bytes])=>({route,previous_sha256:sha(before.get(route)),current_sha256:sha(bytes)})),
  other_public_files_preserved:preserved,all_accepted_pngs_unchanged:true,immutable_source_bundle_unchanged:true,
  source_route_changes:swaps.map(([previous,current])=>({previous,current})),
  browser_320_verification:'REQUIRED_AFTER_DEPLOY_NOT_INFERRED_FROM_STAGING'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
 const receipt=stageNov02ReaderCorrections({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}
