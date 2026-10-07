import fs from 'node:fs';
import path from 'node:path';
import {validateD0Activation} from './activation-gate.mjs';
import {validateD0BundleImages} from './bundle-gate.mjs';
import {buildMigratedState,semanticFingerprint} from './migration.mjs';
import {canonicalSha,sha256} from './util.mjs';

export function applyImageOnlyMigration({
  repoRoot='.',
  statePath,
  bundlePath,
  replacementBundlePath,
  receiptPath,
  updatedAt=new Date().toISOString()
}={}){
  if(!statePath||!bundlePath||!replacementBundlePath||!receiptPath) throw new Error('migration_apply_paths_required');
  const activation=validateD0Activation({repoRoot});
  if(activation.result!=='PASS') throw new Error('migration_requires_active_d0:'+activation.errors.join(','));

  const stateFull=path.resolve(repoRoot,statePath);
  const bundleFull=path.resolve(repoRoot,bundlePath);
  const replacementFull=path.resolve(repoRoot,replacementBundlePath);
  const receiptFull=path.resolve(repoRoot,receiptPath);

  const beforeState=JSON.parse(fs.readFileSync(stateFull,'utf8'));
  const beforeBundleText=fs.readFileSync(bundleFull,'utf8');
  const beforeBundle=JSON.parse(beforeBundleText);
  const replacementText=fs.readFileSync(replacementFull,'utf8');
  const replacementBundle=JSON.parse(replacementText);

  const d0Gate=validateD0BundleImages({bundle:replacementBundle,repoRoot});
  if(d0Gate.result!=='PASS') throw new Error('replacement_bundle_d0_gate:'+d0Gate.errors.join(','));

  const built=buildMigratedState({beforeState,beforeBundle,afterBundle:replacementBundle,bundleText:replacementText,updatedAt});
  fs.writeFileSync(bundleFull,replacementText);
  fs.writeFileSync(stateFull,JSON.stringify(built.state,null,2)+'\n');

  const receipt={
    schema_version:'daily-compiler-d0-image-migration-apply-v1',
    result:'PASS',
    edition_date:beforeState.edition_date,
    execution_id:beforeState.execution_id,
    branch:beforeState.branch,
    semantic_fingerprint_before:semanticFingerprint(beforeBundle),
    semantic_fingerprint_after:semanticFingerprint(replacementBundle),
    semantic_rework:0,
    source_bundle_sha256:sha256(beforeBundleText),
    replacement_bundle_sha256:sha256(replacementText),
    state_bundle_digest:built.state.bundle.digest,
    d0_bundle_gate:'PASS',
    activation_receipt_sha256:activation.receipt?canonicalSha(activation.receipt):null,
    reader_update_authorized:true,
    new_execution_created:false,
    owner_intervention:false
  };
  fs.mkdirSync(path.dirname(receiptFull),{recursive:true});
  fs.writeFileSync(receiptFull,JSON.stringify(receipt,null,2)+'\n');
  return {state:built.state,receipt,verification:built.verification};
}
