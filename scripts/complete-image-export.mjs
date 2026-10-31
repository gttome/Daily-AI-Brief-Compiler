// Local byte readiness only. Never generates, resizes, accepts or publishes art.
// The exporter must resolve only after its actual export has completed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkRealPng} from './stage-external-image-package.mjs';

export const MAX_EXPORT_BYTES=8*1024*1024;
const fail=message=>{throw Error('complete_image_export:'+message);};
function expectedIdentity({expectedSha256,expectedBytes},required=false){
  if(required||expectedSha256!==undefined||expectedBytes!==undefined){
    if(!/^[a-f0-9]{64}$/.test(expectedSha256||'')||
       !Number.isSafeInteger(expectedBytes)||expectedBytes<70||expectedBytes>MAX_EXPORT_BYTES)
      fail('completed_export_identity_required');
  }
}

/** Await the real exporter; expose final bytes only after strict local validation.
 * exportPng is a trusted in-process callback returning a completed Buffer. No
 * command, arbitrary module or exporter is loaded from a receipt or JSON file.
 * outputPath must be new: even identical previously accepted bytes are not replaced.
 */
export async function completeImageExport({outputPath,exportPng,expectedSha256,expectedBytes}){
  if(typeof outputPath!=='string'||!outputPath.trim()||typeof exportPng!=='function')
    fail('output_and_exporter_required');
  expectedIdentity({expectedSha256,expectedBytes});
  const output=path.resolve(outputPath);
  // Fail before invoking an exporter when the target already exists (including
  // dangling symlinks). linkSync below closes the competing-writer race.
  try{fs.lstatSync(output);fail('output_already_exists');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const completed=await exportPng();
  if(!Buffer.isBuffer(completed)||completed.length>MAX_EXPORT_BYTES)
    fail('completed_png_buffer_required');
  const bytes=Buffer.from(completed); // own a stable snapshot, not caller storage
  const checked=checkRealPng(bytes);
  if(expectedSha256!==undefined&&(checked.sha256!==expectedSha256||checked.bytes!==expectedBytes))
    fail('completed_export_identity_mismatch');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  // Same-directory temporary inode and exclusive hard link give atomic visibility
  // without rename's overwrite behavior. The final path never contains partial PNGs.
  const temporary=fs.mkdtempSync(path.join(path.dirname(output),'.image-export-'));
  const staged=path.join(temporary,'complete.png');
  try{
    const fd=fs.openSync(staged,'wx');
    try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    const persisted=fs.readFileSync(staged);
    const verified=checkRealPng(persisted);
    if(!persisted.equals(bytes)||verified.sha256!==checked.sha256)
      fail('local_persistence_mismatch');
    fs.linkSync(staged,output); // EEXIST preserves a competing/accepted output.
    return {schema_version:'complete-local-image-export-v1',
      result:'LOCAL_EXPORT_COMPLETE_NOT_VISUALLY_REVIEWED',output_path:output,
      ...checked,completion_basis:'awaited_exporter_buffer',exact_local_readback:true,
      saved_pixel_review_required:true,accepted_locked:false,
      github_readback_verified:false,publication_verified:false};
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}

/** CLI/foreign-export adapter. Identity must come from the completed exporter,
 * not be calculated from a file that might still be written. A stable-size poll
 * is not evidence of completion. This copies a validated snapshot only.
 */
export async function completeSavedImageExport({sourcePath,outputPath,expectedSha256,expectedBytes}){
  expectedIdentity({expectedSha256,expectedBytes},true);
  if(typeof sourcePath!=='string'||!sourcePath.trim())fail('source_required');
  if(path.resolve(sourcePath)===path.resolve(outputPath))fail('new_output_required');
  const receipt=await completeImageExport({outputPath,expectedSha256,expectedBytes,exportPng:async()=>{
    const stat=fs.statSync(sourcePath);
    if(!stat.isFile()||stat.size!==expectedBytes)fail('source_incomplete_or_changed');
    return fs.readFileSync(sourcePath);
  }});
  return {...receipt,completion_basis:'completed_export_identity_matched_snapshot'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [sourcePath,outputPath,expectedSha256,count,...extra]=process.argv.slice(2);
  if(!count||extra.length)fail('usage: node scripts/complete-image-export.mjs <completed.png> <new.png> <completed-sha256> <completed-byte-count>');
  const receipt=await completeSavedImageExport({sourcePath,outputPath,expectedSha256,expectedBytes:Number(count)});
  process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
}
