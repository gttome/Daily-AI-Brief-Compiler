#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {applyCorrectionToBundle,buildCorrectionRecompileState} from '../operations/correction-apply.mjs';
import {applyImageCorrectionBatch} from '../operations/image-correction-batch.mjs';
import {readCorrectionAsset,writeCorrectionDirectory} from '../operations/correction-files.mjs';

const [statePath,bundlePath,correctionPath,outBundlePath,outStatePath,assetRoot='.',previousRevisionPath]=process.argv.slice(2);
if(!statePath||!bundlePath||!correctionPath||!outBundlePath||!outStatePath) throw new Error('usage: node scripts/apply-post-publication-correction.mjs <base-state.json> <bundle.json> <correction.json> <new-directory/bundle.json> <new-directory/revision.json> [asset-root] [previous-revision.json]');
if(path.dirname(path.resolve(outBundlePath))!==path.dirname(path.resolve(outStatePath))||path.resolve(outBundlePath)===path.resolve(outStatePath)) throw new Error('correction_atomic_output_directory_required');
const beforeState=JSON.parse(fs.readFileSync(statePath,'utf8'));
const beforeBundleText=fs.readFileSync(bundlePath,'utf8'),beforeBundle=JSON.parse(beforeBundleText);
const correction=JSON.parse(fs.readFileSync(correctionPath,'utf8'));
const previousRevision=previousRevisionPath?JSON.parse(fs.readFileSync(previousRevisionPath,'utf8')):null;
const baseBundleText=previousRevision?.original_bundle_text||beforeBundleText;
let corrected,revision;
if(correction.correction_type==='replace_image'){
  const request={schema_version:'daily-compiler-image-correction-request-v1',request_id:correction.correction_id,edition_date:correction.edition_date,status:'READY_TO_APPLY',story_ids:[correction.target.story_id],preserve_original:true,new_execution_allowed:false,requested_at:correction.requested_at,revision_id:correction.revision_id};
  const assets={[correction.target.story_id]:readCorrectionAsset(assetRoot,correction.replacement.image.path)};
  const staged=applyImageCorrectionBatch({bundle:beforeBundle,request,corrections:[correction],assets,baseState:beforeState,bundleText:beforeBundleText,baseBundleText,previousRevision});
  corrected=staged.bundle;revision=staged.revision;
}else corrected=applyCorrectionToBundle(beforeBundle,correction);
if(isDeepStrictEqual(corrected,beforeBundle)){
  console.log(JSON.stringify({result:'UNCHANGED',correction_id:correction.correction_id,correction_created:false,new_execution_created:false}));
}else{
  const bundleText=JSON.stringify(corrected,null,2)+'\n';
  revision??=buildCorrectionRecompileState({beforeState,beforeBundle,beforeBundleText,baseBundleText,correctedBundle:corrected,correctedBundleText:bundleText,correction,previousRevision,updatedAt:correction.requested_at});
  const result=writeCorrectionDirectory({outDir:path.dirname(path.resolve(outBundlePath)),files:{[path.basename(outBundlePath)]:bundleText,[path.basename(outStatePath)]:JSON.stringify(revision,null,2)+'\n'},protectedPaths:[statePath,bundlePath,correctionPath,...(previousRevisionPath?[previousRevisionPath]:[])]});
  console.log(JSON.stringify({result,edition_date:beforeState.edition_date,base_execution_id:beforeState.execution_id,correction_id:correction.correction_id,revision_id:revision.revision_id,base_state:beforeState.state,revision_status:revision.status,new_execution_created:false,publication_verified:false}));
}
