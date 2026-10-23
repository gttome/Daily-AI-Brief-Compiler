#!/usr/bin/env node
// October 23 metadata-only correction: identical published reader except for
// proven misleading media-age labels and unsupported podcast host placeholders.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const DATE='2026-10-23';
const P='podcasts/'+DATE+'/';
const PODCASTS=[
 ['openai-s-jalapen-o-chip-nvidia-s-279b-push-and-anthropic-s-claude-duet','dab-podcast-'+DATE+'-1','New AI podcast episode','October 22, 2026'],
 ['sundar-pichai-google-s-frontier-imperative-compute-scarcity-dilemmas-future-ai-products-an','dab-podcast-'+DATE+'-2','Recent AI podcast episode fallback','October 20, 2026']
];
const VIDEO=[
 ['general','Evergreen instructional video','November 9, 2023'],
 ['agent-skills','Evergreen instructional video','February 23, 2024']
];
const podRoutes=PODCASTS.map(x=>P+x[0]+'/index.html');
const videoRoutes=VIDEO.map(x=>'videos/'+DATE+'/'+x[0]+'/index.html');
const editionRoute='briefs/'+DATE+'/index.html';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('oct23_media_reader_correction:'+s);};
const read=(root,route)=>fs.readFileSync(path.join(root,route),'utf8');
function walk(root,rel=''){
 const out=[];
 for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){
   const n=path.posix.join(rel,e.name);
   if(e.isDirectory())out.push(...walk(root,n));
   else if(e.isFile())out.push(n);
   else fail('unexpected_symlink_or_special_file:'+n);
 }
 return out.sort();
}
const badge=name=>'<span class="coverage-label">'+name+'</span>';
export function correctAgeBadges(text,{role,sourceDate}){
 if(!text.includes(sourceDate))fail('original_media_date_not_in_reader:'+role);
 if(role==='video'){
   if(text.split(badge('New development')).length!==2)fail('video_badge_not_exactly_one');
   return {text:text.replace(badge('New development'),badge('Evergreen instructional video')),changed:1};
 }
 const pod=PODCASTS.find(x=>x[1]===role);
 if(!pod)fail('unsupported_podcast_id:'+role);
 const mark='data-podcast-id="'+role+'"';
 const pos=text.indexOf(mark);
 if(pos<0||text.indexOf(mark,pos+mark.length)>=0)fail('podcast_identity_not_unique:'+role);
 const label=badge('New development');
 const index=text.lastIndexOf(label,pos);
 if(index<0||pos-index>500)fail('podcast_badge_not_adjacent:'+role);
 if(sourceDate!==pod[3])fail('date_binding_changed:'+role);
 return {text:text.slice(0,index)+badge(pod[2])+text.slice(index+label.length),changed:1};
}
export function removeUnverifiedHost(text,kind){
 let total=0;
 // Jekyll HTML includes a line break after the unsupported display string.
 if(kind==='html'){
   const pattern=/<strong>Host \/ guest:<\/strong>\s*Not listed\s*<br\s*\/>\s*/g;
   text=text.replace(pattern,()=>{total++;return '';});
 }else if(kind==='md'){
   const pattern=/^\*\*Host \/ guest:\*\*\s*Not listed[ \t]*(?:\r?\n)/gm;
   text=text.replace(pattern,()=>{total++;return '';});
 }else fail('unknown_host_correction_format');
 return {text,removed:total};
}
function patchOverview(text,kind){
 let count=0;
 for(const pod of PODCASTS){
   const adjusted=correctAgeBadges(text,{role:pod[1],sourceDate:pod[3]});
   text=adjusted.text;count+=adjusted.changed;
 }
 const host=removeUnverifiedHost(text,kind);
 if(host.removed!==2)fail('two_unverified_host_values_required');
 return {text:host.text,badges:count,hosts:host.removed};
}
function patchPermanent(text,route){
 for(const [key,label,original] of VIDEO){
   if(route==='videos/'+DATE+'/'+key+'/index.html'){
     const adjusted=correctAgeBadges(text,{role:'video',sourceDate:original});
     if(!adjusted.text.includes(badge(label)))fail('wrong_video_label');
     return {text:adjusted.text,badges:1,hosts:0};
   }
 }
 const pod=PODCASTS.find(x=>route===P+x[0]+'/index.html');
 if(!pod)fail('unlisted_permanent_route:'+route);
 const adjusted=correctAgeBadges(text,{role:pod[1],sourceDate:pod[3]});
 const host=removeUnverifiedHost(adjusted.text,'html');
 if(host.removed!==1)fail('one_unverified_host_value_required:'+route);
 return {text:host.text,badges:1,hosts:1};
}
export function correctOct23MediaMetadata({revisionFile,historySite,outSite}){
 const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    rev.correction_type!=='OCT23_MEDIA_AGE_AND_METADATA_ONLY'||
    rev.edition_date!==DATE||rev.scope!=='READER_METADATA_TEXT_ONLY'||
    rev.requested_by!=='owner')fail('revision_not_owner_approved_or_wrong_type');
 if(!fs.existsSync(historySite)||fs.existsSync(outSite))fail('staging_input_missing_or_output_exists');
 const archive=JSON.parse(read(historySite,'data/archive-index.json'));
 const latest=archive.stories?.find(x=>x.content_type==='Article')?.brief_date;
 if(!latest||latest<DATE)fail('published_oct23_archive_missing');
 const home=latest===DATE;
 const overview=[editionRoute,...(home?['index.html','latest.html','latest.md']:[])];
 const routes=[...overview,...videoRoutes,...podRoutes];
 const before=walk(historySite);
 for(const route of routes)if(!before.includes(route))fail('published_route_missing:'+route);
 fs.cpSync(historySite,outSite,{recursive:true,force:true});
 const changed=[];
 let labels=0,hosts=0;
 for(const route of routes){
   const original=read(historySite,route);
   const fixed=overview.includes(route)?
     patchOverview(original,route.endsWith('.md')?'md':'html'):
     patchPermanent(original,route);
   if(fixed.text===original||fixed.badges!== (overview.includes(route)?2:1))
     fail('targeted_correction_missing:'+route);
   fs.writeFileSync(path.join(outSite,route),fixed.text);
   labels+=fixed.badges;hosts+=fixed.hosts;
   changed.push({route,previous_sha256:sha(Buffer.from(original)),current_sha256:sha(Buffer.from(fixed.text))});
 }
 if(JSON.stringify(before)!==JSON.stringify(walk(outSite)))fail('reader_file_inventory_drift');
 const allow=new Set(routes);
 for(const route of before){
   const old=sha(fs.readFileSync(path.join(historySite,route)));
   const fresh=sha(fs.readFileSync(path.join(outSite,route)));
   if(!allow.has(route)&&old!==fresh)fail('unauthorized_reader_or_image_change:'+route);
 }
 if(labels!==(home?12:6)||hosts!==(home?10:4))
   fail('incorrect_correction_counts:'+labels+':'+hosts);
 const accepted=before.filter(x=>x.startsWith('briefs/images/'+DATE+'/')&&x.endsWith('.png'));
 if(accepted.length!==6||accepted.some(x=>
   sha(fs.readFileSync(path.join(historySite,x)))!==sha(fs.readFileSync(path.join(outSite,x)))))
   fail('six_accepted_premium_pngs_must_remain_identical');
 const historical=before.filter(x=>x.includes('2026-10-08/'));
 if(historical.length<17||historical.some(x=>
   sha(fs.readFileSync(path.join(historySite,x)))!==sha(fs.readFileSync(path.join(outSite,x)))))
   fail('oct8_immutable_history_not_preserved');
 return {schema_version:'daily-compiler-oct23-media-metadata-correction-v1',result:'PASS',
   edition_date:DATE,scope:rev.scope,homepage_latest_changed:home,files_changed:changed.length,
   misleading_media_labels_repaired:labels,unverified_host_fields_removed:hosts,
   accepted_png_files_byte_preserved:accepted.length,no_source_bundle_resealed:true,
   changed};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
 if(!receiptFile)fail('usage: node correct-oct23-media-metadata.mjs <revision.json> <history/site> <out> <receipt.json>');
 const receipt=correctOct23MediaMetadata({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}
