import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeReleaseEngineRepo} from './fixtures/release-engine-repo.mjs';

test('protected readiness checker reads the supplied exact semantic worktree and emits both immutable identities',t=>{
  const f=makeReleaseEngineRepo(t,{copyRuntime:true});
  const output=execFileSync(process.execPath,[path.join(f.engineRoot,'scripts/check-current-shadow-ready.mjs'),f.branch,f.semanticRoot,'--require-remote-head'],{
    cwd:f.engineRoot,encoding:'utf8',env:{...process.env,EXPECTED_ENGINE_SHA:f.engineSha,EXPECTED_SEMANTIC_COMMIT:f.semanticCommit,EXPECTED_DIGEST:f.state.bundle.digest}});
  for(const [key,value] of Object.entries({ready:'true',bundle_digest:f.state.bundle.digest,engine_sha:f.engineSha,semantic_commit:f.semanticCommit}))assert.match(output,new RegExp('^'+key+'='+value+'$','m'));
});
