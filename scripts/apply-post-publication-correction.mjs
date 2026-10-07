#!/usr/bin/env node
import fs from 'node:fs';
import {applyCorrectionToBundle,buildCorrectionRecompileState} from '../operations/correction-apply.mjs';

const [statePath,bundlePath,correctionPath,outBundlePath,outStatePath]=process.argv.slice(2);
if(!statePath||!bundlePath||!correctionPath||!outBundlePath||!outStatePath){
  throw new Error('usage: node scripts/apply-post-publication-correction.mjs <state.json> <bundle.json> <correction.json> <out-bundle.json> <out-state.json>');
}
const beforeState=JSON.parse(fs.readFileSync(statePath,'utf8'));
const beforeBundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
const correction=JSON.parse(fs.readFileSync(correctionPath,'utf8'));
const corrected=applyCorrectionToBundle(beforeBundle,correction);
const bundleText=JSON.stringify(corrected,null,2)+'\n';
const next=buildCorrectionRecompileState({beforeState,beforeBundle,correctedBundle:corrected,correctedBundleText:bundleText,correction});
fs.writeFileSync(outBundlePath,bundleText);
fs.writeFileSync(outStatePath,JSON.stringify(next,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',edition_date:beforeState.edition_date,execution_id:beforeState.execution_id,correction_id:correction.correction_id,correction_type:correction.correction_type,new_execution_created:false,state:next.state,stage:next.stage},null,2));
