#!/usr/bin/env node
import {applyImageOnlyMigration} from '../image-capsules/migration-apply.mjs';

const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{if(v.startsWith('--'))a.push([v.slice(2),arr[i+1]]);return a;},[]));
if(!args.state||!args.bundle||!args.replacement||!args.receipt) throw new Error('usage: node scripts/apply-image-only-migration.mjs --state <state.json> --bundle <edition-bundle.json> --replacement <d0-bundle.json> --receipt <receipt.json> [--repo-root <dir>]');
const result=applyImageOnlyMigration({
  repoRoot:args['repo-root']||'.',
  statePath:args.state,
  bundlePath:args.bundle,
  replacementBundlePath:args.replacement,
  receiptPath:args.receipt
});
console.log(JSON.stringify({result:'PASS',edition_date:result.receipt.edition_date,execution_id:result.receipt.execution_id,semantic_rework:0,new_execution_created:false,state:result.state.state,stage:result.state.stage,bundle_digest:result.state.bundle.digest},null,2));
