#!/usr/bin/env node
import fs from 'node:fs';
import {prepareImageOnlyMigration} from '../image-capsules/migration.mjs';

const [statePath,bundlePath,outPath]=process.argv.slice(2);
if(!statePath||!bundlePath||!outPath) throw new Error('usage: node scripts/prepare-image-only-migration.mjs <state.json> <bundle.json> <out.json>');
const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
const plan=prepareImageOnlyMigration({state,bundle});
fs.writeFileSync(outPath,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',semantic_rework:0,new_execution_allowed:false,plan:outPath},null,2));
