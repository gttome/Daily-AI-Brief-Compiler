#!/usr/bin/env node
import {finalizeCorrection} from '../operations/correction-finalize.mjs';
const [repoRoot,revisionPath,bundlePath,buildDir,pageUrl,outDir,baseStatePath,baseBundlePath]=process.argv.slice(2);
if(!outDir)throw new Error('usage: node scripts/finalize-correction.mjs repo-root revision.json bundle.json build-dir page-url new-output-directory [base-state.json] [original-bundle.json]');
console.log(JSON.stringify(finalizeCorrection({repoRoot,revisionPath,bundlePath,buildDir,pageUrl,outDir,baseStatePath,baseBundlePath}),null,2));
