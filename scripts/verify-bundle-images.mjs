import fs from 'node:fs';
import {validateD0BundleImages} from '../image-capsules/bundle-gate.mjs';
import {validateD1BundleImages} from '../image-studio/bundle-gate.mjs';
import {D1_STRATEGY} from '../image-studio/activation.mjs';

const bundlePath=process.argv[2],repoRoot=process.argv[3]||'.';
if(!bundlePath) throw new Error('usage: node scripts/verify-bundle-images.mjs <edition-bundle.json> [repo-root]');
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
let result;
if(bundle?.image_system?.strategy===D1_STRATEGY) result=validateD1BundleImages({bundle,repoRoot});
else if(bundle?.image_system?.strategy==='d0_native_image_capsules')result=validateD0BundleImages({bundle,repoRoot});
else throw new Error('supported image strategy required; NOT_D1/NOT_D0 is not PASS');
console.log(JSON.stringify(result,null,2));
if(result.result!=='PASS') process.exitCode=1;
