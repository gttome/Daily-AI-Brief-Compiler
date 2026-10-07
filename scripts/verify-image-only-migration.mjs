#!/usr/bin/env node
import fs from 'node:fs';
import {verifyImageOnlyMigration} from '../image-capsules/migration.mjs';

const [beforeStatePath,beforeBundlePath,afterStatePath,afterBundlePath]=process.argv.slice(2);
if(!beforeStatePath||!beforeBundlePath||!afterStatePath||!afterBundlePath) throw new Error('usage: node scripts/verify-image-only-migration.mjs <before-state.json> <before-bundle.json> <after-state.json> <after-bundle.json>');
const result=verifyImageOnlyMigration({
  beforeState:JSON.parse(fs.readFileSync(beforeStatePath,'utf8')),
  beforeBundle:JSON.parse(fs.readFileSync(beforeBundlePath,'utf8')),
  afterState:JSON.parse(fs.readFileSync(afterStatePath,'utf8')),
  afterBundle:JSON.parse(fs.readFileSync(afterBundlePath,'utf8'))
});
console.log(JSON.stringify(result,null,2));
if(result.result!=='PASS') process.exitCode=1;
