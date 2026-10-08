#!/usr/bin/env node
// Emit a transportable batch, never publish it or invoke a model/scheduler.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectD1RuntimeRecords,recordD1ImageEvent} from '../image-studio/runtime-records.mjs';
const [mode,inputPath,outputPath,...extra]=process.argv.slice(2);
if(!['validate-only','emit'].includes(mode)||!inputPath||extra.length||mode==='emit'&&!outputPath||mode==='validate-only'&&outputPath)throw new Error('usage: record-d1-image-event.mjs validate-only input.json | emit input.json NEW-batch.json');
const inputBytes=fs.readFileSync(inputPath);if(inputBytes.length>4_000_000)throw new Error('bounded_input_required');
const input=JSON.parse(inputBytes);
const known=['state','attemptLog','request','sourceEvidence','expectedStateSha256','expectedLogSha256','expectedHead','engineSha','event','raw_file','canonical_file'];
if(Object.keys(input).some(k=>!known.includes(k)))throw new Error('input_fields');
function bytes(relative){
 if(!relative)return undefined;
 if(path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw new Error('asset_path');
 const root=fs.realpathSync(path.dirname(path.resolve(inputPath))),file=fs.realpathSync(path.resolve(root,relative));
 if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile()||fs.statSync(file).size>64*1024*1024)throw new Error('asset_escape_or_size');
 return fs.readFileSync(file);
}
const result=mode==='validate-only'?inspectD1RuntimeRecords(input):recordD1ImageEvent({...input,rawBytes:bytes(input.raw_file),canonicalBytes:bytes(input.canonical_file)});
const text=JSON.stringify(result,null,2)+'\n';
if(outputPath){if(path.resolve(outputPath)===path.resolve(inputPath))throw new Error('output_overwrites_input');fs.writeFileSync(outputPath,text,{flag:'wx'});}
console.log(JSON.stringify({result:result.result??result.next_action,scope:mode==='validate-only'?'READ_ONLY':'LOCAL_BATCH_ONLY_NOT_GIT_PUBLICATION',state:result.status??result.state?.status,native_generations:result.native_generations??result.state?.native_generations,accepted_images:result.accepted_images??result.state?.accepted_assets.length,permitted_new_generations:result.permitted_new_generations??0,executable_sha256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),runtime_capability_proven:false,requested_engine_sha:input.engineSha??null,engine_checkout_verified:false,loaded_module_sha256:Object.fromEntries(['../image-studio/runtime-records.mjs','../image-studio/specification-projection.mjs','../contracts/d1-image-recipe-profile-v2.json'].map(p=>[p,createHash('sha256').update(fs.readFileSync(new URL(p,import.meta.url))).digest('hex')])),...(mode==='validate-only'?{inspection:result}:{batch_sha256:result.batch_sha256,output_path:outputPath})}));
