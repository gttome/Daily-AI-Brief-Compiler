import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sha256,canonicalSha} from '../image-capsules/util.mjs';
import {validateHistoricalMedia} from '../compiler/media.mjs';
import {validateD1Activation,D1_STRATEGY} from '../image-studio/activation.mjs';
import {validateD0Activation} from '../image-capsules/activation-gate.mjs';

export const RELEASE_ENGINE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const ENGINE_HANDOFF_SCHEMA='daily-compiler-engine-handoff-v1';
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^shadow\/(\d{4}-\d{2}-\d{2})$/;
const fail=message=>{throw new Error('release_engine_'+message);};
const need=(condition,message)=>{if(!condition)fail(message);};
const git=(root,...args)=>execFileSync('git',['--no-replace-objects','-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

export function checkoutCommit(root){
  const commit=git(root,'rev-parse','--verify','HEAD^{commit}');
  need(SHA.test(commit),'checkout_commit_invalid');
  return commit;
}

export function assertCleanEngineCheckout(root){
  // This is the executing engine checkout, not the semantic worktree. Ignore
  // untracked build outputs and data worktrees; reject changed tracked code or
  // inputs behind an otherwise unchanged HEAD identity.
  need(git(root,'status','--porcelain','--untracked-files=no')==='','engine_checkout_modified');
  return true;
}

// A merged PR's second parent is not a protected release. Use only commits on
// the observed protected main first-parent line, including its exact head.
export function assertProtectedFirstParent({root,engineSha,protectedHeadSha}){
  need(SHA.test(engineSha||'')&&SHA.test(protectedHeadSha||''),'protected_commit_invalid');
  const commits=git(root,'rev-list','--first-parent',protectedHeadSha).split('\n');
  need(commits.includes(engineSha),'not_protected_main_first_parent');
  return true;
}

function safeFile(root,relative){
  need(typeof relative==='string'&&!path.isAbsolute(relative)&&!relative.includes('\\')&&!relative.split('/').some(x=>!x||x==='.'||x==='..'),'unsafe_input_path');
  const base=fs.realpathSync(root),file=fs.realpathSync(path.resolve(base,relative));
  need(file.startsWith(base+path.sep)&&fs.statSync(file).isFile(),'input_path_escape');
  return file;
}

export function readSealedSemantic({root,branch,allowVerified=false}){
  const match=BRANCH.exec(branch||'');
  if(!match)return null;
  const stateRelative=`shadow-runs/${match[1]}/compiler-state.json`;
  if(!fs.existsSync(path.resolve(root,stateRelative)))return null;
  const stateBytes=fs.readFileSync(safeFile(root,stateRelative)),state=JSON.parse(stateBytes);
  const sealed=state.state==='BUNDLE_READY'&&state.stage==='BUNDLE';
  const terminal=state.state==='SHADOW_VERIFIED'&&state.stage==='VERIFY';
  if(!sealed&&!(allowVerified&&terminal))return null;
  need(state.schema_version==='daily-compiler-state-v1'&&state.branch===branch&&state.edition_date===match[1]&&typeof state.execution_id==='string'&&state.execution_id.length>0,'semantic_identity_mismatch');
  const bundleRelative=`shadow-runs/${match[1]}/edition-bundle.json`;
  const bundleBytes=fs.readFileSync(safeFile(root,bundleRelative)),bundle=JSON.parse(bundleBytes);
  const bundleSha=sha256(bundleBytes);
  need(state.bundle?.status==='BUNDLE_READY'&&state.bundle.digest===bundleSha&&bundle.status==='BUNDLE_READY'&&bundle.edition_date===state.edition_date,'sealed_bundle_mismatch');
  return {state,bundle,stateBytes,bundleBytes,stateRelative,bundleRelative,stateSha:sha256(stateBytes),bundleSha};
}

export function assertStateEnginePin({state,bundle,bundleSha,expectedEngineSha,allowFixture=false}){
  const registry=JSON.parse(fs.readFileSync(new URL('../contracts/media-compatibility.json',import.meta.url),'utf8'));
  const imageRegistry=JSON.parse(fs.readFileSync(new URL('../contracts/image-compatibility.json',import.meta.url),'utf8'));
  const identity=row=>row.bundle_sha256===bundleSha&&row.edition_date===state.edition_date&&row.execution_id===state.execution_id&&row.branch===state.branch;
  need(allowFixture||![...registry.entries,...imageRegistry.entries].some(row=>row.purpose==='immutable_test_fixture'&&identity(row)),'fixture_not_production_history');
  if(state.engine_sha!==undefined){
    need(SHA.test(state.engine_sha),'state_pin_invalid');
    if(expectedEngineSha)need(expectedEngineSha===state.engine_sha,'payload_pin_mismatch');
    return {scope:'PINNED_RELEASE',engine_sha:state.engine_sha};
  }
  // Reuse the current historical validator. The exact registered bundle bytes,
  // edition, execution and branch are required; no date-based grandfathering.
  need(state.edition_date===bundle.edition_date,'historical_edition_mismatch');
  try{validateHistoricalMedia({state,bundle,bundleDigest:bundleSha});}
  catch{fail('missing_pin_for_new_edition');}
  const row=registry.entries.find(identity);
  need(row?.purpose==='immutable_terminal_history'||(allowFixture&&row?.purpose==='immutable_test_fixture'),'fixture_not_production_history');
  return {scope:row.purpose==='immutable_test_fixture'?'REGISTERED_TEST_FIXTURE':'REGISTERED_TERMINAL_HISTORY',engine_sha:null};
}

function assertSemanticBytesAtCommit(root,records,semanticCommit){
  need(checkoutCommit(root)===semanticCommit,'semantic_checkout_mismatch');
  for(const [relative,bytes] of [[records.stateRelative,records.stateBytes],[records.bundleRelative,records.bundleBytes]]){
    const committed=execFileSync('git',['--no-replace-objects','-C',root,'show',`${semanticCommit}:${relative}`],{stdio:['ignore','pipe','pipe']});
    need(committed.equals(bytes),'semantic_bytes_changed:'+relative);
  }
}

export function assertRemoteSemanticHead({root,branch,semanticCommit}){
  need(BRANCH.test(branch||'')&&SHA.test(semanticCommit||''),'remote_target_invalid');
  const rows=git(root,'ls-remote','--refs','origin',`refs/heads/${branch}`).split('\n').filter(Boolean);
  need(rows.length===1&&rows[0]===`${semanticCommit}\trefs/heads/${branch}`,'semantic_branch_head_changed');
  return true;
}

export function selectReleaseEngine({engineRoot=RELEASE_ENGINE_ROOT,semanticRoot,branch,allowVerified=false,expectedEngineSha='',expectedSemanticCommit='',expectedDigest='',requireRemoteHead=false}){
  const records=readSealedSemantic({root:semanticRoot,branch,allowVerified});
  if(!records)return null;
  // This entry point runs only in the workflow's protected-main bootstrap.
  // Semantic branch code is never imported or executed to choose the engine.
  const protectedHeadSha=git(engineRoot,'rev-parse','--verify','refs/remotes/origin/main^{commit}');
  need(checkoutCommit(engineRoot)===protectedHeadSha,'bootstrap_not_protected_main');
  assertCleanEngineCheckout(engineRoot);
  const pin=assertStateEnginePin({...records,bundleSha:records.bundleSha,expectedEngineSha});
  const engineSha=pin.engine_sha||protectedHeadSha;
  if(expectedEngineSha)need(SHA.test(expectedEngineSha)&&expectedEngineSha===engineSha,'payload_pin_mismatch');
  assertProtectedFirstParent({root:engineRoot,engineSha,protectedHeadSha});
  try{git(engineRoot,'cat-file','-e',`${engineSha}:operations/release-engine.mjs`);}
  catch{fail('selected_engine_missing_handoff_interface');}
  const semanticCommit=checkoutCommit(semanticRoot);
  if(expectedSemanticCommit)need(SHA.test(expectedSemanticCommit)&&expectedSemanticCommit===semanticCommit,'payload_semantic_commit_mismatch');
  if(expectedDigest)need(expectedDigest===records.bundleSha,'payload_bundle_mismatch');
  assertSemanticBytesAtCommit(semanticRoot,records,semanticCommit);
  if(requireRemoteHead)assertRemoteSemanticHead({root:semanticRoot,branch,semanticCommit});
  return {schema_version:ENGINE_HANDOFF_SCHEMA,scope:pin.scope,engine_sha:engineSha,semantic_commit:semanticCommit,
    branch,edition_date:records.state.edition_date,state_sha256:records.stateSha,bundle_sha256:records.bundleSha,protected_main_head_sha:protectedHeadSha};
}

// These are the only global activation roots read through semantic repoRoot.
// Their existing product validators bind the complete receipt/proof/evidence
// graph. Other policies, source maps and reader templates are module-relative
// inputs of the pinned engine. Edition evidence/assets retain their own hashes.
export function assertFrozenActivationRoots({engineRoot,semanticRoot,state,bundle}){
  const strategies=[state.images?.strategy,bundle.image_system?.strategy,bundle.producer_receipt?.bound_image_strategy,...(bundle.images||[]).map(x=>x?.image_system)];
  const d1=strategies.includes(D1_STRATEGY),d0=strategies.includes('d0_native_image_capsules');
  const files=d1?['contracts/d1-image-contract.json','contracts/d1-image-admission-contract.json']:d0?['contracts/image-contract.json']:[];
  const roots=files.map(relative=>{
    const expected=fs.readFileSync(safeFile(engineRoot,relative)),actual=fs.readFileSync(safeFile(semanticRoot,relative));
    need(expected.equals(actual),'activation_input_changed:'+relative);
    return {path:relative,sha256:sha256(expected)};
  });
  // F must actually retain its own complete activation evidence. A matching
  // contract alone cannot borrow a proof that exists only on a semantic branch.
  if(d1)need(validateD1Activation({repoRoot:engineRoot}).result==='PASS','pinned_d1_activation_invalid');
  if(d0)need(validateD0Activation({repoRoot:engineRoot}).result==='PASS','pinned_d0_activation_invalid');
  return roots;
}

export function verifyReleaseEngineHandoff({binding,engineRoot=RELEASE_ENGINE_ROOT,semanticRoot,branch=binding?.branch,allowVerified=false,requireRemoteHead=false}){
  need(binding?.schema_version===ENGINE_HANDOFF_SCHEMA&&SHA.test(binding.engine_sha||'')&&SHA.test(binding.semantic_commit||'')&&SHA.test(binding.protected_main_head_sha||''),'handoff_identity_invalid');
  const records=readSealedSemantic({root:semanticRoot,branch,allowVerified});
  need(records,'sealed_semantic_input_required');
  const pin=assertStateEnginePin({...records,bundleSha:records.bundleSha,expectedEngineSha:binding.engine_sha});
  need(binding.scope===pin.scope&&binding.branch===branch&&binding.edition_date===records.state.edition_date&&binding.state_sha256===records.stateSha&&binding.bundle_sha256===records.bundleSha,'handoff_input_mismatch');
  need(checkoutCommit(engineRoot)===binding.engine_sha,'compiler_checkout_pin_mismatch');
  assertCleanEngineCheckout(engineRoot);
  const protectedHeadSha=git(engineRoot,'rev-parse','--verify','refs/remotes/origin/main^{commit}');
  assertProtectedFirstParent({root:engineRoot,engineSha:binding.protected_main_head_sha,protectedHeadSha});
  assertProtectedFirstParent({root:engineRoot,engineSha:binding.engine_sha,protectedHeadSha:binding.protected_main_head_sha});
  assertSemanticBytesAtCommit(semanticRoot,records,binding.semantic_commit);
  if(requireRemoteHead)assertRemoteSemanticHead({root:semanticRoot,branch,semanticCommit:binding.semantic_commit});
  const frozenActivationInputs=assertFrozenActivationRoots({engineRoot,semanticRoot,...records});
  if(binding.frozen_activation_inputs!==undefined)need(canonicalSha(binding.frozen_activation_inputs)===canonicalSha(frozenActivationInputs),'activation_input_receipt_mismatch');
  return {...binding,frozen_activation_inputs:frozenActivationInputs};
}

// Pure local fixture compilation is useful development evidence, but carries
// no immutable-engine claim. Operational CLIs set requireBinding; a state that
// already has a pin always needs its actual Git-backed handoff, in either API.
export function compileEngineBinding({statePath,bundlePath,semanticRoot,binding,engineRoot=RELEASE_ENGINE_ROOT,requireBinding=false}){
  const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
  if(state.schema_version!=='daily-compiler-state-v1'){
    need(!binding,'base_edition_binding_required');
    return null; // existing separate correction workflow retains its own scope
  }
  if(!binding){
    need(state.engine_sha===undefined,'pinned_state_requires_handoff');
    if(requireBinding){
      const bytes=fs.readFileSync(bundlePath),bundle=JSON.parse(bytes);
      assertStateEnginePin({state,bundle,bundleSha:sha256(bytes),allowFixture:true});
    }
    return null;
  }
  const expectedState=path.resolve(semanticRoot,`shadow-runs/${binding.edition_date}/compiler-state.json`);
  const expectedBundle=path.resolve(semanticRoot,`shadow-runs/${binding.edition_date}/edition-bundle.json`);
  need(path.resolve(statePath)===expectedState&&path.resolve(bundlePath)===expectedBundle,'compiler_input_paths_mismatch');
  return verifyReleaseEngineHandoff({binding,engineRoot,semanticRoot,allowVerified:true});
}

export function assertCompiledEngineReceipt({binding,compile}){
  need(compile?.schema_version==='daily-compiler-compile-receipt-v2'&&compile.result==='PASS','compile_receipt_invalid');
  need(compile.state_sha256===binding.state_sha256&&compile.bundle_sha256===binding.bundle_sha256,'compile_receipt_input_mismatch');
  need(compile.engine_binding&&canonicalSha(compile.engine_binding)===canonicalSha(binding),'compile_receipt_handoff_mismatch');
  return true;
}

export function assertFinalizationEngine({state,bundle,compile,semanticRoot,engineRoot=RELEASE_ENGINE_ROOT,alreadyTerminal=false,requireBinding=false}){
  if(!compile.engine_binding){
    need(state.engine_sha===undefined,'compile_receipt_pin_missing');
    if(requireBinding)assertStateEnginePin({state,bundle,bundleSha:state.bundle.digest,allowFixture:false});
    return null;
  }
  const binding=compile.engine_binding;
  need(binding.engine_sha===state.engine_sha||(!state.engine_sha&&binding.scope==='REGISTERED_TERMINAL_HISTORY'),'compile_receipt_pin_mismatch');
  if(!alreadyTerminal)return verifyReleaseEngineHandoff({binding,engineRoot,semanticRoot});
  // Existing terminal proof separately checks the exact original receipt bytes.
  // Its pre-finalization semantic commit must not be relabelled to a later head.
  need(binding.schema_version===ENGINE_HANDOFF_SCHEMA&&SHA.test(binding.engine_sha||'')&&SHA.test(binding.semantic_commit||'')&&checkoutCommit(engineRoot)===binding.engine_sha,'terminal_compile_engine_mismatch');
  assertCleanEngineCheckout(engineRoot);
  need(binding.branch===state.branch&&binding.edition_date===state.edition_date&&binding.bundle_sha256===state.bundle.digest,'terminal_compile_target_mismatch');
  return binding;
}
