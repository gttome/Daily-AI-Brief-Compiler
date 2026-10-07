import fs from 'node:fs';
import {validateD0BundleImages} from '../image-capsules/bundle-gate.mjs';

const bundlePath=process.argv[2],repoRoot=process.argv[3]||'.';
if(!bundlePath) throw new Error('usage: node scripts/verify-bundle-images.mjs <edition-bundle.json> [repo-root]');
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
const result=validateD0BundleImages({bundle,repoRoot});
console.log(JSON.stringify(result,null,2));
if(result.result==='FAIL') process.exitCode=1;
