import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {readFinalizationRecord as readRecord,verifyFinalizationEvidence} from '../compiler/finalization-evidence.mjs';
export {verifyFinalizationEvidence} from '../compiler/finalization-evidence.mjs';
import {validateEdition} from '../compiler/compile.mjs';
import {assertCompleteReleaseEvidence} from '../compiler/release-evidence.mjs';
import {assertFinalizationEngine} from '../operations/release-engine.mjs';

const fail=message=>{throw new Error(message);};
const FINALIZATION_RECEIPT='finalization-receipt.json';

// A retry may retain the compile receipt for the input BUNDLE_READY state.
// Bind that exact first completion to the resulting immutable terminal bytes;
// never infer or reconstruct the old state from its terminal representation.
function readTerminalProof({run,state,stateSha256,date,pageUrl}){
  const file=path.join(run,'compiler',FINALIZATION_RECEIPT);
  if(!fs.existsSync(file))return null; // historical terminal records stay intact
  const proof=readRecord(file).record;
  if(proof.schema_version!=='daily-compiler-finalization-receipt-v1'||proof.result!=='PASS'||proof.edition_date!==date)fail('terminal finalization receipt identity mismatch');
  if(proof.terminal_state_sha256!==stateSha256||proof.finalized_at!==state.updated_at)fail('terminal state bytes changed after finalization');
  if(!/^[a-f0-9]{64}$/.test(proof.input_state_sha256||'')||proof.bundle_sha256!==state.bundle.digest)fail('terminal finalization input binding mismatch');
  if(proof.page_url!==pageUrl||state.preview?.url!==pageUrl||state.preview?.bundle_digest!==proof.bundle_sha256)fail('terminal finalization reader identity mismatch');
  return proof;
}

function verifyTerminalProof({proof,evidence,run,exactReplay}){
  if(!proof)return;
  if(exactReplay&&(proof.source_manifest_sha256!==evidence.manifestDigest||proof.production_reader_source_sha!==evidence.compile.production_reader_source_sha))fail('terminal finalization source binding mismatch');
  if(!Array.isArray(proof.receipts)||proof.receipts.length!==evidence.receipts.length||new Set(proof.receipts.map(row=>row.name)).size!==evidence.receipts.length)fail('terminal finalization receipt set mismatch');
  let originalCompile;
  for(const receipt of evidence.receipts){
    const bound=proof.receipts.find(row=>row.name===receipt.name);
    const persisted=fs.readFileSync(path.join(run,'compiler',receipt.name));
    if(!bound||bound.sha256!==sha256(persisted))fail('original terminal receipt bytes changed');
    if(exactReplay&&!receipt.bytes.equals(persisted))fail('same-build terminal retry requires the exact original receipts');
    if(receipt.name==='compile-receipt.json')originalCompile=JSON.parse(persisted.toString('utf8'));
  }
  if(originalCompile.state_sha256!==proof.input_state_sha256||originalCompile.bundle_sha256!==proof.bundle_sha256||canonicalSha(originalCompile.source_manifest)!==proof.source_manifest_sha256||originalCompile.production_reader_source_sha!==proof.production_reader_source_sha)fail('original terminal compile receipt binding mismatch');
}

// Observation consumes persisted receipts independently through the existing
// finalize-run-intelligence command. No observer runs on this critical path.
export function finalizeShadowState({root,date,pageUrl,buildDir='build',now=()=>new Date().toISOString(),requireReleaseBinding=false}){
  if(!root||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!pageUrl) fail('usage: node scripts/finalize-shadow-state.mjs <worktree> <date> <page-url>');
  const run=path.join(root,'shadow-runs',date);
  const statePath=path.join(run,'compiler-state.json');
  const inputState=readRecord(statePath);
  const state=inputState.record;
  if(state.schema_version!=='daily-compiler-state-v1') fail('base compiler state required; corrections use a separate revision record');
  const alreadyTerminal=state.state==='SHADOW_VERIFIED'&&state.stage==='VERIFY';
  if(!(state.state==='BUNDLE_READY'&&state.stage==='BUNDLE')&&!alreadyTerminal) fail('state is not a sealed bundle or verified terminal run');
  if(state.edition_date!==date) fail('finalization edition date mismatch');
  if(state.bundle?.status!=='BUNDLE_READY') fail('state/bundle changed during compile');
  if(sha256(fs.readFileSync(path.join(run,'edition-bundle.json')))!==state.bundle.digest) fail('bundle bytes changed during compile');
  const stateSha256=sha256(inputState.bytes);
  const terminalProof=alreadyTerminal?readTerminalProof({run,state,stateSha256,date,pageUrl}):null;
  const suppliedStateSha256=readRecord(path.join(buildDir,'reader-source','compile-receipt.json')).record.state_sha256;
  const exactReplay=Boolean(terminalProof&&suppliedStateSha256===terminalProof.input_state_sha256);
  const evidence=verifyFinalizationEvidence({date,pageUrl,buildDir,stateSha256:exactReplay?terminalProof.input_state_sha256:stateSha256,bundleSha256:state.bundle.digest});
  const {compile,manifestDigest,receipts}=evidence;

  // Compilation is not authority for content that changed afterward. Reuse the
  // existing product validator at the last checkpoint; do not duplicate its
  // image/media policy or swallow a real validation failure as telemetry noise.
  const validation=validateEdition({statePath,bundlePath:path.join(run,'edition-bundle.json'),repoRoot:root});
  const engineBinding=assertFinalizationEngine({state,bundle:validation.bundle,compile,semanticRoot:root,alreadyTerminal,requireBinding:requireReleaseBinding});
  const release=assertCompleteReleaseEvidence({evidence,bundle:validation.bundle,repoRoot:root,sourceDir:path.join(buildDir,'reader-source')});
  verifyTerminalProof({proof:terminalProof,evidence,run,exactReplay});
  const result={result:'PASS',edition_date:date,state:'SHADOW_VERIFIED',bundle_sha256:compile.bundle_sha256,source_manifest_sha256:manifestDigest,already_terminal:alreadyTerminal,...release};
  // A deterministic rebuild is not a new production completion. Keep the first
  // terminal state and all original receipts byte-for-byte, even when reverified.
  // Explicit corrections retain their own revision identity outside this record.
  if(alreadyTerminal) return result;

  const updatedAt=now();
  if(typeof updatedAt!=='string'||!Number.isFinite(Date.parse(updatedAt))) fail('invalid finalization timestamp');
  state.state='SHADOW_VERIFIED';
  state.stage='VERIFY';
  state.updated_at=updatedAt;
  state.retryable=false;
  state.last_error=null;
  state.preview={url:pageUrl,bundle_digest:compile.bundle_sha256};
  state.reader_parity={
    result:'PASS',
    contract:'reader-surface-parity-v2',
    production_reader_source_sha:compile.production_reader_source_sha,
    semantic_rework:0,
    accepted_image_regenerations:compile.verification?.accepted_image_regenerations ?? 0
  };
  const terminalBytes=Buffer.from(JSON.stringify(state,null,2)+'\n');
  const finalizationReceipt={
    schema_version:'daily-compiler-finalization-receipt-v1',edition_date:date,result:'PASS',finalized_at:updatedAt,
    input_state_sha256:stateSha256,terminal_state_sha256:sha256(terminalBytes),bundle_sha256:compile.bundle_sha256,
    source_manifest_sha256:manifestDigest,production_reader_source_sha:compile.production_reader_source_sha,page_url:pageUrl,
    receipts:receipts.map(({name,bytes})=>({name,sha256:sha256(bytes)}))
  };
  if(engineBinding)finalizationReceipt.engine_binding=engineBinding;
  fs.mkdirSync(path.join(run,'compiler'),{recursive:true});
  for(const {bytes,name} of receipts) fs.writeFileSync(path.join(run,'compiler',name),bytes);
  fs.writeFileSync(path.join(run,'compiler',FINALIZATION_RECEIPT),JSON.stringify(finalizationReceipt,null,2)+'\n');
  fs.writeFileSync(statePath,terminalBytes);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=finalizeShadowState({root:process.argv[2],date:process.argv[3],pageUrl:process.argv[4],requireReleaseBinding:true});
  console.log(JSON.stringify(result));
}
