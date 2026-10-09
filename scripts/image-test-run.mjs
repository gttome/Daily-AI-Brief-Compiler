#!/usr/bin/env node
// Local preparation/serialization only. Existing authenticated runtime transport
// must publish each new namespace with expected-head and create-only checks.
import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';
import {prepareDevelopmentImageRun,preparePreproductionImageRun,initializePreproductionRuntime,inspectDevelopmentImageRun,resumeDevelopmentImageRun,resumePreproductionImageRun,recordDevelopmentImageEvent} from '../image-studio/test-run-policy.mjs';

const [mode,inputPath,outputPath,...extra]=process.argv.slice(2);
const commands={
  'prepare-development':prepareDevelopmentImageRun,
  'prepare-preproduction':preparePreproductionImageRun,
  'initialize-preproduction':initializePreproductionRuntime,
  'inspect-development':inspectDevelopmentImageRun,
  'resume-development':resumeDevelopmentImageRun,
  'resume-preproduction':resumePreproductionImageRun,
  'record-development':recordDevelopmentImageEvent
};
if(!Object.hasOwn(commands,mode)||!inputPath||!outputPath||extra.length)throw new Error('usage: image-test-run.mjs <prepare-development|prepare-preproduction|initialize-preproduction|inspect-development|resume-development|resume-preproduction|record-development> INPUT.json NEW_OUTPUT.json');
if(path.resolve(inputPath)===path.resolve(outputPath))throw new Error('output_must_be_new');
const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
function readAsset(relative){
  if(relative===undefined)return undefined;
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('asset_path');
  const base=fs.realpathSync(path.dirname(path.resolve(inputPath))),full=fs.realpathSync(path.join(base,relative));
  if(!full.startsWith(base+path.sep)||!fs.statSync(full).isFile())throw new Error('asset_path_escape');
  return fs.readFileSync(full);
}
if(Object.hasOwn(input,'raw_file')||Object.hasOwn(input,'canonical_file')){
  if(mode!=='record-development')throw new Error('assets_only_for_development_event');
  input.rawBytes=readAsset(input.raw_file);input.canonicalBytes=readAsset(input.canonical_file);
  delete input.raw_file;delete input.canonical_file;
}
const result=commands[mode](input);
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:result.result??'PREPARED_OR_INSPECTED',mode,out:outputPath,output_canonical_sha256:canonicalSha(result),environment:result.manifest?.environment??result.state?.environment??result.environment??'preproduction',native_generations:result.state?.native_generations??result.inspection?.native_generations??null,production_activation_performed:false,image_generation_performed:false,git_publication_performed:false}));
