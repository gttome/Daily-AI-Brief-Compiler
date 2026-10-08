#!/usr/bin/env node
// Read-only repository audit; the sole write is the explicitly requested output.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {auditValueRelease} from '../operations/value-release.mjs';

const options={};
for(let index=2;index<process.argv.length;index+=2){
  const name=process.argv[index],value=process.argv[index+1];
  if(!['--root','--engine-sha','--out','--evidence','--schedule','--frozen'].includes(name)||value===undefined||Object.hasOwn(options,name))throw new Error('usage: audit-value-release.mjs --root . --engine-sha SHA --out FILE [--evidence JSON] [--schedule JSON] [--frozen JSON]');
  options[name]=value;
}
if(!options['--out'])throw new Error('value_release_output_required');
const read=key=>options[key]?JSON.parse(fs.readFileSync(options[key],'utf8')):undefined;
const output=path.resolve(options['--out']);
const root=path.resolve(options['--root']||'.');
let engineBinding=null;
try{
  const git=(...args)=>execFileSync('git',['--no-optional-locks',...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  if(fs.realpathSync(git('rev-parse','--show-toplevel'))!==fs.realpathSync(root))throw new Error('audit root is not the checkout root');
  engineBinding={source:'GIT_CHECKOUT',head_sha:git('rev-parse','HEAD'),tracked_files_clean:git('status','--porcelain','--untracked-files=no')===''};
}catch(error){if(process.env.GITHUB_ACTIONS==='true')throw new Error('value_release_checkout_identity_unavailable:'+error.message);}
const engineSha=options['--engine-sha']||engineBinding?.head_sha||process.env.GITHUB_SHA||null;
if(engineBinding&&(engineBinding.head_sha!==engineSha||engineBinding.tracked_files_clean!==true))throw new Error('value_release_checkout_engine_mismatch_or_tracked_changes');
const result=auditValueRelease({repoRoot:root,engineSha,engineBinding,
  evidence:read('--evidence'),scheduleReadback:read('--schedule'),frozen:read('--frozen')});
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
// Exit zero certifies successful audit recording, including honest release
// blockers. It never asserts successful CI from inside the still-running job.
console.log(JSON.stringify({audit_result:result.audit_result,engine_sha:result.inventory.engine_sha,CORE_RELEASE_READY:result.CORE_RELEASE_READY,
  SOURCE_ROLLOUT:result.SOURCE_ROLLOUT,OBSERVATION_RELEASE:result.OBSERVATION_RELEASE,LEARNING_REPORT:result.LEARNING_REPORT,
  unresolved_core_blockers:result.unresolved_core_blockers,release_authority:false,output},null,2));
