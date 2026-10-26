#!/usr/bin/env node
// Offline preparation of 114-source evidence-review worklist; does NOT access
// any website, claim the sources were checked or modify protected registry.
import fs from 'node:fs';
import path from 'node:path';
import {buildDisabledSourceWorklist,validateDisabledSourceWorklist} from
  '../operations/oct28-source-qualification.mjs';
const [edition_date,execution_id,outputPath,registryPath='config/resource-registry.json']=process.argv.slice(2);
if(!edition_date||!execution_id||!outputPath)
 throw Error('usage: node scripts/build-oct28-source-worklist.mjs YYYY-MM-DD execution-id output.json [registry.json]');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const ledger=buildDisabledSourceWorklist(registry,{edition_date,execution_id,created_at:new Date().toISOString()});
const summary=validateDisabledSourceWorklist(registry,ledger);
fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({result:'WORKLIST_CREATED_NO_SOURCES_CLAIMED_CHECKED',
  edition_date,pending:summary.pending,verified:summary.verified,output:outputPath}));
