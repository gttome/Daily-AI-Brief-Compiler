import fs from 'node:fs';
import path from 'node:path';

export const D0_ACTIVE='active';

export function readImageActivationStatus(repoRoot='.'){
  const p=path.resolve(repoRoot,'contracts/image-contract.json');
  const c=JSON.parse(fs.readFileSync(p,'utf8'));
  return c?.activation_status??null;
}

export function isInternalProposal1RFixture({specPath,runRoot}={}){
  const p=String(specPath||'').replaceAll('\\','/');
  const r=String(runRoot||'').replaceAll('\\','/');
  if(p.startsWith('rehearsals/renderer-smoke/')) return true;
  if(r&&fs.existsSync(path.join(r,'.proposal1r-internal-fixture'))) return true;
  return false;
}

export function proposal1rRenderingAllowed({activationStatus,specPath,runRoot}={}){
  if(activationStatus!==D0_ACTIVE) return {allowed:true,reason:'pre_activation_legacy_reader_path'};
  if(isInternalProposal1RFixture({specPath,runRoot})) return {allowed:true,reason:'explicit_internal_fixture'};
  return {allowed:false,reason:'d0_active_reader_story_proposal1r_forbidden'};
}
