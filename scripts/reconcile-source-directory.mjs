#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {reconcileSourceDirectory,serializeResourceRegistry,resourceRegistryDigest} from '../operations/resources.mjs';

const usage='node scripts/reconcile-source-directory.mjs [--apply] [--registry PATH] [--source PATH] [--output-dir PATH] [--at UTC]';
const options={apply:false,registry:'config/resource-registry.json',source:'migrations/source-portfolio-v1/directory.json'};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(flag==='--help'){console.log(usage);process.exit(0);}
  if(flag==='--apply'){options.apply=true;continue;}
  const key={'--registry':'registry','--source':'source','--output-dir':'outputDir','--at':'at'}[flag];
  if(!key||!process.argv[i+1]||process.argv[i+1].startsWith('--')) throw new Error(usage);
  if(options[key]!==undefined&&['outputDir','at'].includes(key)) throw new Error('duplicate_option:'+flag);
  options[key]=process.argv[++i];
}
const registryPath=path.resolve(options.registry),sourcePath=path.resolve(options.source);
const registryBytes=fs.readFileSync(registryPath);
const registry=JSON.parse(registryBytes),source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const repoRoot=fileURLToPath(new URL('../',import.meta.url));
if(source.baseline_registry?.path!=='migrations/source-portfolio-v1/registry.before.json') throw new Error('source_directory_snapshot_path');
const snapshotPath=path.join(repoRoot,source.baseline_registry.path);
const snapshotBytes=fs.readFileSync(snapshotPath);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
if(sha256(snapshotBytes)!==source.baseline_registry.sha256) throw new Error('source_directory_snapshot_digest');
if(sha256(registryBytes)!==resourceRegistryDigest(registry)) throw new Error('source_directory_registry_serialization_mismatch');
if(registryPath===sourcePath||registryPath===snapshotPath) throw new Error('source_directory_input_collision');

const result=reconcileSourceDirectory(registry,source,{appliedAt:options.at||new Date().toISOString()});
const candidateBytes=serializeResourceRegistry(result.registry);
if(sha256(candidateBytes)!==result.mapping.candidate_registry_sha256) throw new Error('source_directory_candidate_digest');
const reportFiles=options.outputDir?[
  ['mapping.json',result.mapping],
  ['dry-run.json',{schema_version:'daily-compiler-source-directory-diff-v1',migration_id:source.migration_id,
    mode:options.apply?'apply':'dry_run',summary:result.mapping.summary,...result.diff}],
  ['qualification-worklist.json',result.qualification_worklist]
].map(([name,value])=>({path:path.resolve(options.outputDir,name),bytes:JSON.stringify(value,null,2)+'\n'})):[];
const protectedPaths=[registryPath,sourcePath,snapshotPath].map(p=>fs.realpathSync(p));
for(const report of reportFiles){
  const resolved=fs.existsSync(report.path)?fs.realpathSync(report.path):report.path;
  if(protectedPaths.includes(resolved)) throw new Error('source_directory_report_input_collision');
  if(fs.existsSync(report.path)&&!fs.readFileSync(report.path).equals(Buffer.from(report.bytes))) throw new Error('source_directory_report_exists_use_new_output_dir:'+report.path);
}
// All validation and report-collision checks precede the first write.
for(const report of reportFiles){
  fs.mkdirSync(path.dirname(report.path),{recursive:true});
  if(!fs.existsSync(report.path)) fs.writeFileSync(report.path,report.bytes,{flag:'wx'});
}
if(options.apply&&result.diff.registry_changed){
  // Refuse to overwrite another writer's change between read and application.
  if(!fs.readFileSync(registryPath).equals(registryBytes)) throw new Error('source_directory_registry_changed_before_apply');
  const temporary=registryPath+'.source-portfolio-'+process.pid+'.tmp';
  try{
    fs.writeFileSync(temporary,candidateBytes,{flag:'wx'});
    fs.renameSync(temporary,registryPath);
  }finally{
    if(fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
console.log(JSON.stringify({
  result:'SOURCE_CATALOGUE_RECONCILED',mode:options.apply?'apply':'dry_run',
  registry_written:options.apply&&result.diff.registry_changed,
  registry_sha256:result.mapping.candidate_registry_sha256,
  baseline_snapshot_sha256:sha256(snapshotBytes),summary:result.mapping.summary,diff:result.diff,
  qualification:'NOT_RUN',activation:'NOT_RUN',source_rollout:'SOURCE_ROLLOUT_PARTIAL'
},null,2));
