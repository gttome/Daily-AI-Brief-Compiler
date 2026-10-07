#!/usr/bin/env node
import fs from 'node:fs';
import {validateResourceRegistry} from '../operations/resources.mjs';

const registryPath=process.argv[2]||'config/resource-registry.json';
const inputPath=process.argv[3];
if(!inputPath) throw new Error('usage: node scripts/import-resources.mjs [registry.json] <resources.json>');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
const rows=Array.isArray(input)?input:[input];
for(const row of rows){
  if(!row.resource_id||!row.name||!row.url||!Array.isArray(row.content_types)||!row.content_types.length) throw new Error('resource_import_identity');
  if(registry.resources.some(x=>x.resource_id===row.resource_id||x.url===row.url)) throw new Error('resource_import_duplicate:'+row.resource_id);
  registry.resources.push({
    resource_id:row.resource_id,name:row.name,url:row.url,enabled:row.enabled!==false,
    content_types:row.content_types,priority:row.priority||'secondary',
    search_mode:row.search_mode||'site_search',endpoint:row.endpoint??null,publisher:row.publisher??null,notes:row.notes??null,
    health:{status:'unknown',last_checked_at:null,last_success_at:null,consecutive_failures:0,observed_yield_rate:null,freshness_hit_rate:null}
  });
}
registry.updated_at=new Date().toISOString();
const errors=validateResourceRegistry(registry);
if(errors.length) throw new Error(errors.join(';'));
fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',added:rows.length,total:registry.resources.length,registry:registryPath},null,2));
