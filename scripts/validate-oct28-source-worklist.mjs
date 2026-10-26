#!/usr/bin/env node
import fs from 'node:fs';
import {validateDisabledSourceWorklist} from '../operations/oct28-source-qualification.mjs';
const [ledgerFile,registryFile='config/resource-registry.json']=process.argv.slice(2);
if(!ledgerFile)throw Error('usage: node scripts/validate-oct28-source-worklist.mjs worklist.json [registry.json]');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const result=validateDisabledSourceWorklist(read(registryFile),read(ledgerFile),{requireAllReviewed:true});
console.log(JSON.stringify({result:result.result,reviewed:result.reviewed,pending:result.pending,
 verified:result.verified,editorial_selection:'SEPARATE_VERIFICATION_REQUIRED'}));
