import fs from 'node:fs';
import {applyImageCorrectionBatch} from '../operations/image-correction-batch.mjs';
import {readCorrectionAsset,writeCorrectionDirectory} from '../operations/correction-files.mjs';
const [bundlePath,requestPath,correctionsPath,assetRoot,outDir,statePath,previousRevisionPath]=process.argv.slice(2);
if(!statePath) throw new Error('usage: node scripts/apply-image-correction-batch.mjs bundle.json request.json corrections.json asset-root output-directory base-state.json [previous-revision.json]');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const corrections=read(correctionsPath),assets=Object.create(null);
for(const c of corrections) assets[c.target.story_id]=readCorrectionAsset(assetRoot,c.replacement.image.path);
const bundleText=fs.readFileSync(bundlePath,'utf8'),previousRevision=previousRevisionPath?read(previousRevisionPath):null;
const result=applyImageCorrectionBatch({bundle:JSON.parse(bundleText),request:read(requestPath),corrections,assets,baseState:read(statePath),bundleText,baseBundleText:previousRevision?.original_bundle_text||bundleText,previousRevision});
if(result.receipt.result==='UNCHANGED') console.log(JSON.stringify(result.receipt));
else{
  const persisted=writeCorrectionDirectory({outDir,files:Object.fromEntries(Object.entries(result).map(([name,value])=>[name+'.json',JSON.stringify(value,null,2)+'\n'])),protectedPaths:[bundlePath,requestPath,correctionsPath,statePath,...(previousRevisionPath?[previousRevisionPath]:[])]});
  console.log(JSON.stringify({...result.receipt,persistence:persisted}));
}
