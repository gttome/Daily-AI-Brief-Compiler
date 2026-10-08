import fs from 'node:fs';
import {selectReleaseEngine,verifyReleaseEngineHandoff} from '../operations/release-engine.mjs';

const branch=process.argv[2] || process.env.GITHUB_REF_NAME || '';
const root=process.argv[3] || '.';
const allowVerified=process.argv.includes('--allow-verified');
const option=name=>{const index=process.argv.indexOf(name);if(index===-1)return null;const value=process.argv[index+1];if(!value||value.startsWith('--'))throw new Error(name+' requires a file');return value;};
const verifyPath=option('--verify-binding'),writePath=option('--write-binding');
if(verifyPath&&writePath)throw new Error('choose selection or verification');
const requireRemoteHead=process.argv.includes('--require-remote-head');
const binding=verifyPath?
  verifyReleaseEngineHandoff({binding:JSON.parse(fs.readFileSync(verifyPath,'utf8')),semanticRoot:root,branch,allowVerified,requireRemoteHead}):
  selectReleaseEngine({semanticRoot:root,branch,allowVerified,requireRemoteHead,
    expectedEngineSha:process.env.EXPECTED_ENGINE_SHA||'',expectedSemanticCommit:process.env.EXPECTED_SEMANTIC_COMMIT||'',expectedDigest:process.env.EXPECTED_DIGEST||''});
console.log('ready='+(binding?'true':'false'));
if(binding){
  if(writePath)fs.writeFileSync(writePath,JSON.stringify(binding,null,2)+'\n');
  console.log('branch='+branch);
  console.log('date='+binding.edition_date);
  console.log('bundle_digest='+binding.bundle_sha256);
  console.log('engine_sha='+binding.engine_sha);
  console.log('semantic_commit='+binding.semantic_commit);
}
