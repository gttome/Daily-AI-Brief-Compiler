import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD1CloudProof,validateD1Activation} from '../image-studio/activation.mjs';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {validateD1AcceptanceManifest} from '../image-studio/acceptance.mjs';
import {nextD1ProofAction} from '../image-studio/proof-state.mjs';

const check=f=>validateD1CloudProof(f.proof,{repoRoot:f.root});
const withFixture=fn=>{const f=makeD1QualificationFixture();try{return fn(f);}finally{f.cleanup();}};
const command=f=>['scripts/build-d1-cloud-proof.mjs',f.paths.state,f.paths.manifest,f.paths.handoff,f.paths.porter,f.evidencePath,'TEST_ONLY/qualification/built.json'];

test('I02-T01/T08: TEST_ONLY complete structural evidence builds a bound proof, never a live-proof assertion',()=>withFixture(f=>{
  assert.deepEqual(check(f),[]);
  const out=spawnSync(process.execPath,command(f),{cwd:f.root,encoding:'utf8'});
  assert.equal(out.status,0,out.stderr);
  const p=path.join(f.root,'TEST_ONLY/qualification/built.json'),before=fs.readFileSync(p);
  assert.deepEqual(JSON.parse(before).evidence,f.proof.evidence);
  assert.notEqual(spawnSync(process.execPath,command(f),{cwd:f.root,encoding:'utf8'}).status,0);
  assert.deepEqual(fs.readFileSync(p),before);
}));

test('I02-T08: aggregate-only proof cannot build or activate and rejected activation writes nothing',()=>withFixture(f=>{
  delete f.proof.evidence;f.write(f.proofPath,f.proof);
  const before=fs.readFileSync(path.join(f.root,'contracts/d1-image-contract.json'));
  assert.ok(check(f).includes('d1_evidence_reference'));
  assert.throws(()=>applyD1Activation({repoRoot:f.root,proofPath:f.proofPath}),/D1 cloud proof invalid/);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'contracts/d1-image-contract.json')),before);
  assert.equal(fs.existsSync(path.join(f.root,'proof/d1-work-browser/activation.json')),false);
  const oldArgs=command(f);oldArgs.splice(5,1);
  assert.notEqual(spawnSync(process.execPath,oldArgs,{cwd:f.root,encoding:'utf8'}).status,0);
}));

test('I02-T01/T05/T08: malformed, failed, incomplete or mistyped accepted sets fail closed',async t=>{
  for(const [name,mutate] of [
    ['missing layout count',f=>{delete f.data.manifest.set_review.distinct_layouts;}],
    ['string mechanism count',f=>{f.data.manifest.set_review.distinct_mechanisms='4';}],
    ['failed individual review',f=>{f.data.manifest.images[0].visual_acceptance='FAIL';}],
    ['failed manifest set',f=>{f.data.manifest.set_review.result='FAIL';}],
    ['one image only',f=>{f.data.manifest.images=f.data.manifest.images.slice(0,1);}],
    ['repeated pixels despite unique signatures',f=>{f.data.set_review.no_repeated_dominant_template=false;f.data.set_review.result='FAIL';}],
    ['no actual runtime record',f=>{delete f.evidence.runtime;}],
    ['no porter image rows',f=>{f.data.porter.images=[];}],
    ['porter scope violation',f=>{f.data.porter.visual_quality_review_performed=true;}],
    ['porter story hash mismatch',f=>{f.data.porter.images[0].readback_sha256='0'.repeat(64);}],
    ['accepted lock hash changed',f=>{f.data.attempt_log.stories[0].sha256='0'.repeat(64);f.data.state.specification_binding.attempt_log_sha256=canonicalSha(f.data.attempt_log);}],
    ['wrong exact allowlist',f=>{f.data.manifest.images[0].visible_text_allowlist=['Wrong'];}],
    ['no actual unattended capability',f=>{f.data.runtime.unattended_execution=false;}]
  ]) await t.test(name,()=>withFixture(f=>{mutate(f);f.refresh();assert.notDeepEqual(check(f),[]);}));
});

test('I02-T01: required canonical pixel observations, unique detail and temporal sequence cannot be omitted',async t=>{
  for(const [name,mutate] of [
    ['missing basic visual check',f=>{delete f.data.canonical_reviews.images[0].basic_gates.no_humanoids;}],
    ['duplicate component padding',f=>{f.data.canonical_reviews.images[0].meaningful_components.fill('same component');}],
    ['one internal substage',f=>{f.data.canonical_reviews.observations[0].internal_substages=1;}],
    ['one secondary relationship',f=>{f.data.canonical_reviews.observations[0].secondary_relationships=1;}],
    ['flat mechanism',f=>{f.data.canonical_reviews.observations[0].dimensional_mechanism_plate=false;}],
    ['empty useful canvas',f=>{f.data.canonical_reviews.observations[0].canvas_utilization_percent=0;}],
    ['decorative forms',f=>{f.data.canonical_reviews.observations[0].no_decorative_geometry=false;}],
    ['prior story still unlocked',f=>{f.data.runtime.sessions[1].started_at=f.data.runtime.sessions[0].started_at;}],
    ['review before generation',f=>{f.data.canonical_reviews.images[0].reviewed_at='2026-10-07T00:00:00Z';}],
    ['set review before all six locks',f=>{f.data.set_review.reviewed_at='2026-10-08T01:20:00Z';}],
    ['set review time missing',f=>{delete f.data.set_review.reviewed_at;}],
    ['retry context changed',f=>{f.data.runtime.sessions[0].attempts[0].context_id=f.data.runtime.sessions[1].context_id;}]
  ]) await t.test(name,()=>withFixture(f=>{mutate(f);f.refresh();assert.notDeepEqual(check(f),[]);}));
});

test('I02-T03: exact Git and canonical identities reject changed bytes, readback method and impossible normalization',async t=>{
  for(const [name,mutate] of [
    ['changed canonical bytes',f=>{const p=path.join(f.root,f.data.handoff.items[0].target_path),b=fs.readFileSync(p);b[b.length-1]^=1;fs.writeFileSync(p,b);}],
    ['unbound readback byte count',f=>{f.data.binary_readback.images[0].readback_bytes++;}],
    ['unpinned commit',f=>{f.data.binary_readback.commit='main';}],
    ['text connector readback',f=>{f.data.binary_readback.method='github_utf8_fetch';}],
    ['semantic normalization',f=>{f.data.binary_readback.images[0].normalization.semantic_editing=true;}],
    ['same raw bytes different dimensions',f=>{f.data.binary_readback.images[0].raw={...f.data.binary_readback.images[0].raw,width:1201};f.data.binary_readback.images[0].normalization.method='deterministic_resize_only';}]
  ]) await t.test(name,()=>withFixture(f=>{mutate(f);f.refresh();assert.notDeepEqual(check(f),[]);}));
});

test('I02-T02: retained resume checkpoints prove two immutable locks and the first Story 3 continuation',()=>withFixture(f=>{
  assert.deepEqual(check(f),[]);
  const before=structuredClone(f.data.attempt_log.stories.slice(0,2));
  assert.deepEqual(f.checkpoints.before_log.stories,before);
  assert.deepEqual(f.checkpoints.after_log.stories.slice(0,2),before);
  f.checkpoints.after_log.stories[0].sha256='0'.repeat(64);
  f.checkpoints.after_state.specification_binding.attempt_log_sha256=canonicalSha(f.checkpoints.after_log);
  f.data.resume.after.attempt_log.sha256=canonicalSha(f.checkpoints.after_log);
  f.data.resume.after.state.sha256=canonicalSha(f.checkpoints.after_state);
  f.refresh();assert.ok(check(f).includes('d1_qualification_resume_locks'));
}));

test('I02-T02: an inline reconstructed resume summary has no retained checkpoint proof',()=>withFixture(f=>{
  f.data.resume.before={locked:f.data.manifest.images.slice(0,2).map(x=>x.sha256),native_generations:2};
  f.refresh();assert.notDeepEqual(check(f),[]);
}));

test('I02-T02: Story 3 may pass on attempt 2 after its first pending generation was checkpointed',()=>withFixture(f=>{
  const firstTwo=structuredClone(f.data.attempt_log.stories.slice(0,2));
  const image=f.data.manifest.images[2],session=f.data.runtime.sessions[2],history=f.data.attempt_log.stories[2],review=f.data.canonical_reviews.images[2];
  image.attempt=2;
  const rejectedSha=canonicalSha('TEST_ONLY rejected Story 3 candidate');
  session.attempts[0]={...session.attempts[0],result:'FAIL',raw_sha256:rejectedSha};
  session.attempts.push({...session.attempts[0],attempt:2,result:'PASS',raw_sha256:image.sha256,generated_at:'2026-10-08T01:35:00Z',reviewed_at:'2026-10-08T01:36:00Z'});
  session.generated_at=session.attempts[1].generated_at;session.locked_at='2026-10-08T01:37:00Z';
  history.attempts=[{attempt:1,native_generation_completed:true,result:'FAIL'},{attempt:2,native_generation_completed:true,result:'PASS'}];
  history.accepted_attempt=2;history.accepted_at=session.locked_at;
  review.attempt=2;review.reviewed_at=session.attempts[1].reviewed_at;
  f.data.canonical_reviews.observations[2].review_sha256=canonicalSha(review);
  f.data.state.native_generations=7;f.data.attempt_log.native_generations=7;
  f.data.state.specification_binding.attempt_log_sha256=canonicalSha(f.data.attempt_log);
  f.data.handoff.manifest_sha256=canonicalSha(f.data.manifest);
  f.data.porter.manifest_sha256=canonicalSha(f.data.manifest);f.data.porter.ingest_handoff_sha256=canonicalSha(f.data.handoff);
  f.checkpoints.after_log.stories[2].attempts[0].raw_sha256=rejectedSha;
  f.checkpoints.after_state.specification_binding.attempt_log_sha256=canonicalSha(f.checkpoints.after_log);
  f.data.resume.after.attempt_log.sha256=canonicalSha(f.checkpoints.after_log);f.data.resume.after.state.sha256=canonicalSha(f.checkpoints.after_state);
  f.refresh();assert.deepEqual(check(f),[]);
  assert.deepEqual(f.data.attempt_log.stories.slice(0,2),firstTwo);
  assert.ok(Date.parse(f.checkpoints.after_state.updated_at)<Date.parse(session.generated_at));
}));

test('I02-T02: an earlier Story 1 invocation remains accepted across the Story 2 interruption',()=>withFixture(f=>{
  const before=structuredClone(f.data.attempt_log.stories.slice(0,2));
  f.data.runtime.sessions[0].invocation_id='ctx-'+canonicalSha('TEST_ONLY earlier Story 1 invocation');
  f.refresh();assert.deepEqual(check(f),[]);
  assert.deepEqual(f.data.attempt_log.stories.slice(0,2),before);
}));

test('I02-T02: the first pending Story 3 raw identity must match its runtime generation',()=>withFixture(f=>{
  f.checkpoints.after_log.stories[2].attempts[0].raw_sha256='0'.repeat(64);
  f.checkpoints.after_state.specification_binding.attempt_log_sha256=canonicalSha(f.checkpoints.after_log);
  f.data.resume.after.attempt_log.sha256=canonicalSha(f.checkpoints.after_log);f.data.resume.after.state.sha256=canonicalSha(f.checkpoints.after_state);
  f.refresh();assert.ok(check(f).includes('d1_qualification_resume_candidate'));
}));

test('I02-T07/T08: missing, tampered, traversing, symlinked or private evidence is rejected',async t=>{
  await t.test('changed JSON fails digest',()=>withFixture(f=>{f.write(f.paths.runtime,{...f.data.runtime,result:'FAIL'});assert.ok(check(f).some(x=>x.startsWith('d1_evidence_digest_mismatch:')));}));
  await t.test('traversal',()=>withFixture(f=>{f.evidence.runtime.path='../outside.json';f.refresh();assert.ok(check(f).includes('d1_evidence_unsafe_path'));}));
  await t.test('outside-root symlink',()=>withFixture(f=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-outside-'));try{const outside=path.join(dir,'runtime.json');fs.writeFileSync(outside,JSON.stringify(f.data.runtime));const p=path.join(f.root,f.paths.runtime);fs.unlinkSync(p);fs.symlinkSync(outside,p);assert.ok(check(f).includes('d1_evidence_path_escape'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}));
  for(const host of ['chatgpt.com','chat.openai.com']) await t.test('private context '+host,()=>withFixture(f=>{f.data.runtime.extra_reference='https://'+host+'/c/TEST_ONLY-private';f.refresh();assert.ok(check(f).includes('d1_evidence_private_chat_url'));}));
});

test('I02-T08: activation revalidates full evidence in a fresh process and allows only activation metadata drift',()=>withFixture(f=>{
  const archived=fs.readFileSync(path.join(f.root,f.paths.quality_contract));
  assert.equal(applyD1Activation({repoRoot:f.root,proofPath:f.proofPath,activatedAt:'2026-10-08T03:00:00Z'}).result,'PASS');
  assert.equal(validateD1Activation({repoRoot:f.root}).result,'PASS');
  const args=['--input-type=module','-e',"import {validateD1Activation} from './image-studio/activation.mjs'; const r=validateD1Activation(); console.log(JSON.stringify(r.errors)); process.exitCode=r.result==='PASS'?0:1;"];
  const fresh=spawnSync(process.execPath,args,{cwd:f.root,encoding:'utf8'});assert.equal(fresh.status,0,fresh.stdout+fresh.stderr);
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.paths.quality_contract)),archived);
  // Active operational state is deliberately separate from the frozen proof input.
  f.write('TEST_ONLY/active-execution-state.json',{...f.data.state,status:'COMPLETE'});
  assert.equal(validateD1Activation({repoRoot:f.root}).result,'PASS');
  const c=JSON.parse(fs.readFileSync(path.join(f.root,'contracts/d1-image-contract.json'),'utf8'));c.quality.minimum_meaningful_components=13;f.write('contracts/d1-image-contract.json',c);
  assert.equal(validateD1Activation({repoRoot:f.root}).result,'FAIL');
  assert.notEqual(spawnSync(process.execPath,args,{cwd:f.root,encoding:'utf8'}).status,0);
}));

test('I02-T03: accepted transport retry remains independent of new qualification evidence',()=>withFixture(f=>{
  const state=structuredClone(f.data.state);state.status='GIT_INGEST';delete state.specification_binding;
  const before=structuredClone(state);
  assert.equal(nextD1ProofAction(state).action,'RESUME_EXACT_BYTE_INGEST');assert.deepEqual(state,before);
  delete f.data.manifest.set_review.distinct_mechanisms;
  assert.ok(validateD1AcceptanceManifest(f.data.manifest).includes('d1_set_review'));
}));
