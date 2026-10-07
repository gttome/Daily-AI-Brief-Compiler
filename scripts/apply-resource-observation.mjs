#!/usr/bin/env node
import fs from 'node:fs';
import {applyResourceObservation} from '../operations/resources.mjs';

const registryPath=process.argv[2]||'config/resource-registry.json';
const observationPath=process.argv[3];
if(!observationPath) throw new Error('usage: node scripts/apply-resource-observation.mjs [registry.json] <observation.json>');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const observation=JSON.parse(fs.readFileSync(observationPath,'utf8'));
const updated=applyResourceObservation(registry,observation);
fs.writeFileSync(registryPath,JSON.stringify(updated,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',resource_id:observation.resource_id,status:updated.resources.find(x=>x.resource_id===observation.resource_id).health.status,registry:registryPath},null,2));
