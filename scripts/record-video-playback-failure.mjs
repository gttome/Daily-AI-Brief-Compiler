// Preserve observed failed-video facts only. Metadata or a headless browser
// cannot establish that a video is private or unavailable to a real viewer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const fail=x=>{throw Error('VIDEO_FAILURE_EVIDENCE_'+x);};
export function summarizeFailedVideoPlayback(source,editionDate,stage){
 if(!/^20\d\d-\d\d-\d\d$/.test(editionDate||'')||
   !['PREPUBLISH_SIGNAL','READER_DEPLOY'].includes(stage)||
   source?.schema_version!=='daily-compiler-public-video-playback-v1'||
   source.edition_date!==editionDate||source.publication_approved!==false||
   source.result!=='BLOCKED_PLAYBACK_UNVERIFIED'||
   !Array.isArray(source.checked_videos)||source.checked_videos.length!==2||
   !Array.isArray(source.failed_indices)||!source.failed_indices.length)
   fail('INVALID_SOURCE_OR_SCOPE');
 const bad=new Set(source.failed_indices),failed=[];
 if(bad.size!==source.failed_indices.length)fail('DUPLICATE_FAILED_INDEX');
 for(const v of source.checked_videos){
   if(!bad.has(v.index))continue;
   if(!Number.isInteger(v.index)||v.index<1||v.index>2||
     v.result==='SIGNED_OUT_FULL_EPISODE_PLAYBACK_PASS'||
     v.playback_verified===true||typeof v.url!=='string'||!v.url.startsWith('https://'))
     fail('FALSE_FAILURE_OR_IDENTITY');
   failed.push({index:v.index,title:v.title,url:v.url,observed_result:v.result,
     playback_verified:false,
     headless_browser_limitation:typeof v.headless_browser_limitation==='string'?
       v.headless_browser_limitation.slice(0,650):null});
 }
 if(failed.length!==bad.size)fail('MISSING_FAILED_VIDEO');
 return {schema_version:'daily-compiler-video-playback-failure-evidence-v1',
   edition_date:editionDate,stage,original_checked_at:source.checked_at||null,
   original_result:source.result,failed_videos:failed,
   interpretation:'PLAYBACK_UNVERIFIED_NOT_INDEPENDENT_PROOF_OF_PRIVATE_VIDEO',
   required_recovery:'Verify an actual advancing signed-out full-length player for replacement candidates'};
}
function main(){
 const [input,edition,output,stage]=process.argv.slice(2);
 if(!input||!output)fail('USAGE');
 const evidence=summarizeFailedVideoPlayback(JSON.parse(fs.readFileSync(input,'utf8')),edition,stage);
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
 console.log('VIDEO_PLAYBACK_FAILURE_EVIDENCE_SAVED '+edition+' '+evidence.failed_videos.length);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
