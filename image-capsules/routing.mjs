import fs from 'node:fs';
import path from 'node:path';

export const D0_ACTIVE='active';
export const D1_ACTIVE='active';

export function readImageActivationStatus(repoRoot='.'){
  const p=path.resolve(repoRoot,'contracts/image-contract.json');
  const c=JSON.parse(fs.readFileSync(p,'utf8'));
  return c?.activation_status??null;
}

export function readD1ActivationStatus(repoRoot='.'){
  const p=path.resolve(repoRoot,'contracts/d1-image-contract.json');
  if(!fs.existsSync(p)) return null;
  const c=JSON.parse(fs.readFileSync(p,'utf8'));
  return c?.activation_status??null;
}

export function readReaderImageStrategy(repoRoot='.'){
  if(readD1ActivationStatus(repoRoot)===D1_ACTIVE) return 'd1_cloud_image_studio';
  if(readImageActivationStatus(repoRoot)===D0_ACTIVE) return 'd0_native_image_capsules';
  return 'proposal1r_legacy';
}

export function isInternalProposal1RFixture({specPath,runRoot}={}){
  const p=String(specPath||'').replaceAll('\\','/');
  const r=String(runRoot||'').replaceAll('\\','/');
  if(p.startsWith('rehearsals/renderer-smoke/')) return true;
  if(r&&fs.existsSync(path.join(r,'.proposal1r-internal-fixture'))) return true;
  return false;
}

export function proposal1rRenderingAllowed({activationStatus,activeReaderStrategy=null,specPath,runRoot}={}){
  const active=activeReaderStrategy||((activationStatus===D0_ACTIVE)?'d0_native_image_capsules':'proposal1r_legacy');
  if(active==='proposal1r_legacy') return {allowed:true,reason:'pre_activation_legacy_reader_path'};
  if(isInternalProposal1RFixture({specPath,runRoot})) return {allowed:true,reason:'explicit_internal_fixture'};
  return {allowed:false,reason:active+'_reader_story_proposal1r_forbidden'};
}
