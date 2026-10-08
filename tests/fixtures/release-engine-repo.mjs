// TEST_ONLY local Git repositories; never a GitHub release or production run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sha256} from '../../image-capsules/util.mjs';

const SOURCE=fileURLToPath(new URL('../../',import.meta.url));
export const testGit=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export function writeTestFile(root,relative,value){
  const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');return file;
}
export function testCommit(root,message='TEST_ONLY fixture change'){
  testGit(root,'add','.');testGit(root,'commit','-m',message);return testGit(root,'rev-parse','HEAD');
}

export function makeReleaseEngineRepo(t,{copyRuntime=false,seed=()=>{}}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-engine-pin-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true,maxRetries:3,retryDelay:50}));
  const engineRoot=path.join(root,'engine'),semanticRoot=path.join(root,'semantic');fs.mkdirSync(engineRoot);
  testGit(engineRoot,'init','-b','main');testGit(engineRoot,'config','user.name','TEST ONLY');testGit(engineRoot,'config','user.email','test@example.invalid');
  // Throwaway fixtures need no detached Git housekeeping racing their teardown.
  // Configure this repository before its first commit; shared worktrees inherit it.
  testGit(engineRoot,'config','--local','gc.auto','0');
  testGit(engineRoot,'config','--local','maintenance.auto','false');
  writeTestFile(engineRoot,'engine.txt','TEST_ONLY prior protected engine\n');
  const legacySha=testCommit(engineRoot);
  if(copyRuntime){
    for(const dir of ['operations','compiler','contracts','image-capsules','image-studio','work-porter','scripts'])fs.cpSync(path.join(SOURCE,dir),path.join(engineRoot,dir),{recursive:true});
  }else writeTestFile(engineRoot,'operations/release-engine.mjs',fs.readFileSync(path.join(SOURCE,'operations/release-engine.mjs'),'utf8'));
  seed(engineRoot);
  const engineSha=testCommit(engineRoot,'TEST_ONLY protected engine with pin interface');
  testGit(engineRoot,'remote','add','origin',engineRoot);
  testGit(engineRoot,'update-ref','refs/remotes/origin/main',engineSha);
  const branch='shadow/2026-10-09',date='2026-10-09';
  testGit(engineRoot,'worktree','add','-b',branch,semanticRoot,engineSha);
  const bundle={schema_version:'daily-compiler-edition-bundle-v2',status:'BUNDLE_READY',edition_date:date,TEST_ONLY:'handoff fixture; not product-qualified'};
  const bundlePath=writeTestFile(semanticRoot,`shadow-runs/${date}/edition-bundle.json`,bundle);
  const state={schema_version:'daily-compiler-state-v1',edition_date:date,execution_id:'TEST_ONLY-engine-pin',branch,engine_sha:engineSha,
    state:'BUNDLE_READY',stage:'BUNDLE',editorial_bundle:{status:'complete',digest:'a'.repeat(64)},images:{required:6,accepted:[]},bundle:{status:'BUNDLE_READY',digest:sha256(fs.readFileSync(bundlePath))}};
  const statePath=writeTestFile(semanticRoot,`shadow-runs/${date}/compiler-state.json`,state);
  const semanticCommit=testCommit(semanticRoot);
  writeTestFile(engineRoot,'docs/advisory.md','TEST_ONLY later protected-main change\n');
  const mainSha=testCommit(engineRoot);testGit(engineRoot,'update-ref','refs/remotes/origin/main',mainSha);
  return {root,engineRoot,semanticRoot,engineSha,legacySha,semanticCommit,mainSha,branch,date,state,bundle,statePath,bundlePath,
    selection:{engineRoot,semanticRoot,branch},verifyEngine(){testGit(engineRoot,'checkout','--detach',engineSha);}};
}
