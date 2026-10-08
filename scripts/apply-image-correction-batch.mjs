import fs from 'node:fs';
import path from 'node:path';
import {applyImageCorrectionBatch} from '../operations/image-correction-batch.mjs';
const [bundlePath,requestPath,correctionsPath,assetRoot,outDir]=process.argv.slice(2);
if(!outDir) throw new Error('usage: node scripts/apply-image-correction-batch.mjs bundle.json request.json corrections.json asset-root output-directory');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const corrections=read(correctionsPath),root=path.resolve(assetRoot),assets={};
for(const c of corrections){
  const p=path.resolve(root,c.replacement.image.path);
  if(!p.startsWith(root+path.sep)) throw new Error('asset_outside_root');
  assets[c.target.story_id]=fs.readFileSync(p);
}
const result=applyImageCorrectionBatch({bundle:read(bundlePath),request:read(requestPath),corrections,assets});
fs.mkdirSync(outDir,{recursive:true});
for(const [name,value] of Object.entries(result)) fs.writeFileSync(path.join(outDir,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result.receipt));
