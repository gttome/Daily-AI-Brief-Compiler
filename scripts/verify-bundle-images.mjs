import fs from 'node:fs';
import {validateD0BundleImages} from '../image-capsules/bundle-gate.mjs';
import {validateD1BundleImages} from '../image-studio/bundle-gate.mjs';

const bundlePath=process.argv[2],repoRoot=process.argv[3]||'.';
if(!bundlePath) throw new Error('usage: node scripts/verify-bundle-images.mjs <edition-bundle.json> [repo-root]');
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
let result;
if(bundle?.image_system?.strategy==='d1_cloud_image_studio') result=validateD1BundleImages({bundle,repoRoot});
else result=validateD0BundleImages({bundle,repoRoot});
console.log(JSON.stringify(result,null,2));
if(result.result==='FAIL') process.exitCode=1;
