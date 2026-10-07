import fs from 'node:fs';
import {validateD0BundleImages} from '../image-capsules/bundle-gate.mjs';

const statePath=process.argv[2],bundlePath=process.argv[3],repoRoot=process.argv[4]||'.';
if(!statePath||!bundlePath) throw new Error('usage: node scripts/verify-bundle-images.mjs <compiler-state.json> <edition-bundle.json> [repo-root]');
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
if(bundle.image_strategy!=='d0_native_image_capsules'){
  console.log(JSON.stringify({result:'NOT_APPLICABLE',strategy:bundle.image_strategy??'legacy'},null,2));
  process.exit(0);
}
const gate=validateD0BundleImages({state,bundle,repoRoot});
console.log(JSON.stringify({result:gate.errors.length?'FAIL':'PASS',strategy:bundle.image_strategy,image_count:gate.imageEvidence.length,errors:gate.errors},null,2));
if(gate.errors.length) process.exitCode=1;
