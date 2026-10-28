#!/usr/bin/env node
// Owner-reported private player: same official Okta video on its public
// YouTube channel. Link-only correction, no reseal or regenerated images.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const OLD='https://play.vidyard.com/8Cf5xrViAVpvQLikjEutkb?disable_popouts=1&amp;type=inline&amp;v=4.3.26&amp;autoplay=1';
const NEW='https://www.youtube.com/watch?v=TpJsRDZ29Os';
const TITLE='Todd’s Take: Securing identity in the age of AI';
const ROUTES=[
 'index.html',
 'latest.html',
 'latest.md',
 'briefs/2026-10-28/index.html',
 'videos/2026-10-28/agent-skills/index.html'
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=x=>{throw Error('oct28_private_last_video:'+x);};
function all(root,rel=''){
 return fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(e=>{
  const n=path.posix.join(rel,e.name);
  if(e.isDirectory())return all(root,n);
  if(!e.isFile())fail('unexpected_special_file:'+n);
  return [n];
 }).sort();
}
export function replaceOnlyPlayerHref(content,{route}){
 let text=String(content);
 if(text.split(OLD).length!==2||text.includes(NEW)||!text.includes(TITLE)||
    !text.includes('dab-video-2026-10-28-agent-skills'))
   fail('original_media_link_or_identity_drift:'+route);
 text=text.replace(OLD,NEW);
 if(route.startsWith('videos/')){
   const old='>Okta</a>';
   if(text.split(old).length!==2)fail('permanent_video_publisher_link_drift');
   text=text.replace(old,'>Okta — official YouTube</a>');
 }else{
   const old='>Watch on Okta</a>';
   if(text.split(old).length!==2)fail('brief_video_publisher_link_drift:'+route);
   text=text.replace(old,'>Watch on Okta’s official YouTube channel</a>');
 }
 if(text.includes(OLD)||text.split(NEW).length!==2||
    !text.includes('dab-video-2026-10-28-agent-skills'))
   fail('updated_media_identity_invalid:'+route);
 return text;
}
export function stagePublicVideoRepair({revisionFile,historySite,outSite}){
 const revision=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
 if(revision.schema_version!=='daily-compiler-reading-copy-correction-v1'||
    revision.correction_type!=='OCT28_PRIVATE_LAST_VIDEO_LINK_ONLY'||
    revision.scope!=='EXACT_FIVE_PUBLIC_VIDEO_LINK_SURFACES_ONLY'||
    revision.requested_by!=='owner'||revision.edition_date!=='2026-10-28'||
    revision.old_video_url!==OLD||revision.new_video_url!==NEW||
    revision.official_video_id!=='TpJsRDZ29Os'||
    !revision.expected_previous_pages||ROUTES.some(route=>
      !/^[a-f0-9]{40}$/.test(revision.expected_previous_pages[route]||'')))
   fail('revision_not_authorized_or_source_identity_changed');
 if(!historySite||!fs.existsSync(historySite)||!outSite||fs.existsSync(outSite))
   fail('history_source_missing_or_output_exists');
 const previous=all(historySite);
 const patched={};
 for(const route of ROUTES){
  const old=fs.readFileSync(path.join(historySite,route));
  if(blob(old)!==revision.expected_previous_pages[route])
    fail('published_video_reader_drift:'+route);
  patched[route]=Buffer.from(replaceOnlyPlayerHref(old.toString('utf8'),{route}));
 }
 fs.cpSync(historySite,outSite,{recursive:true,force:true});
 for(const [route,bytes] of Object.entries(patched))
   fs.writeFileSync(path.join(outSite,route),bytes);
 if(JSON.stringify(previous)!==JSON.stringify(all(outSite)))
   fail('site_inventory_changed');
 let changed=0;
 for(const route of previous){
  const before=fs.readFileSync(path.join(historySite,route));
  const after=fs.readFileSync(path.join(outSite,route));
  if(!before.equals(after)){
   if(!ROUTES.includes(route))fail('unauthorized_reader_image_or_media_change:'+route);
   changed++;
  }
 }
 if(changed!==ROUTES.length)fail('expected_five_link_replacements');
 return {
   schema_version:'daily-compiler-oct28-last-video-link-correction-v1',
   edition_date:revision.edition_date,result:'PASS',
   files_changed:changed,
   changed:ROUTES.map(route=>({route,
    previous_sha256:sha(fs.readFileSync(path.join(historySite,route))),
    current_sha256:sha(patched[route])})),
   publisher:'Okta',official_youtube_video_id:revision.official_video_id,
   owner_reported_original_player_private:true,
   replacement_verified_official_publisher_identity:true,
   original_semantic_bundle_unchanged:true,
   all_other_reader_and_accepted_image_bytes_preserved:true,
   no_video_download_or_reupload:true,
   no_paid_api_or_new_schedule:true,
   playback_observation_scope:'official_publisher_public_index_not_full_length_browser_playback'
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
 if(!receiptFile)fail('usage: stage-oct28-last-video-link.mjs <revision> <original-history/site> <patched/site> <receipt>');
 const r=stagePublicVideoRepair({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
 fs.writeFileSync(receiptFile,JSON.stringify(r,null,2)+'\n');
 console.log('OCT28_LAST_VIDEO_OFFICIAL_PUBLISHER_LINK_STAGED',r.files_changed);
}
