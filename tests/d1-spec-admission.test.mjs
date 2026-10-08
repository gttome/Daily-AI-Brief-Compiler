import test from 'node:test';
import assert from 'node:assert/strict';
import {makeD1SpecificationsFixture} from './fixtures/d1-specifications.mjs';
import {sealD1Specifications,admitD1Specifications,compileD1StoryPrompt,assertD1SubmittedPrompt} from '../image-studio/spec-admission.mjs';
import {canonicalSha,sha256} from '../image-capsules/util.mjs';
import {nextD0ImageOperation,assertAcceptedImageImmutable,validateAttemptHistory} from '../image-capsules/state.mjs';

function reseal(fixture){
  fixture.request=sealD1Specifications(fixture.request,fixture.sourceEvidence);
  return fixture;
}

function assertNoImageSideEffects(receipt){
  assert.equal(receipt.gate,'IMAGE_SPEC_ADMISSION');
  assert.equal(receipt.quality_attempts_consumed,0);
  assert.equal(receipt.story_chats_opened,0);
  assert.equal(receipt.generation_authorized,false);
  assert.equal(receipt.visual_quality,'NOT_EVALUATED');
  assert.equal(receipt.live_proof,'NOT_EVALUATED');
}

function expectRejected(fixture,{seal=true}={}){
  if(seal) reseal(fixture);
  const snapshot=JSON.stringify(fixture);
  const receipt=admitD1Specifications(fixture.request,fixture.sourceEvidence);
  assert.equal(receipt.result,'FAIL',JSON.stringify(receipt));
  assert.ok(Array.isArray(receipt.errors)&&receipt.errors.length>0);
  assertNoImageSideEffects(receipt);
  assert.equal(JSON.stringify(fixture),snapshot,'failed admission must preserve its inputs');
  return receipt;
}

function changeAssignment(fixture,index,field,value){
  fixture.request.set_plan.stories[index][field]=value;
  fixture.request.stories[index].generation.composition_assignment[field]=value;
}

test('I01-T06: a complete six-spec D1 fixture passes admission without claiming image quality or runtime proof',()=>{
  const fixture=makeD1SpecificationsFixture(),snapshot=JSON.stringify(fixture);
  const receipt=admitD1Specifications(fixture.request,fixture.sourceEvidence);
  assert.equal(receipt.result,'PASS',receipt.errors?.join(';'));
  assert.deepEqual(receipt.errors,[]);
  assert.equal(receipt.all_six_validated,true);
  assertNoImageSideEffects(receipt);
  assert.notEqual(receipt.proof_reuse,'ALREADY_SATISFIED');
  assert.equal(JSON.stringify(fixture),snapshot);
  assert.equal(fixture.request.source_evidence_sha256,canonicalSha(fixture.sourceEvidence));
  assert.equal(fixture.request.set_plan_sha256,canonicalSha(fixture.request.set_plan));
});

test('I01-T01: invalid final story prevents a first-story prompt and consumes no attempt',()=>{
  const fixture=makeD1SpecificationsFixture();
  fixture.request.stories[5].generation.core_mechanism='';
  expectRejected(fixture);
  assert.throws(()=>compileD1StoryPrompt(fixture.request,fixture.sourceEvidence,fixture.request.stories[0].story_id));
});

test('I01-T01: label limits, required facts and conceptual content, and premium density fail closed',async t=>{
  const cases=[
    ['empty label',g=>{g.visible_text_allowlist=[''];}],
    ['untrimmed label',g=>{g.visible_text_allowlist=[' Request'];}],
    ['duplicate label',g=>{g.visible_text_allowlist=['Request','Request'];}],
    ['label exceeds eighty characters',g=>{g.visible_text_allowlist=['A'.repeat(81)];}],
    ['label exceeds eight words',g=>{g.visible_text_allowlist=['One two three four five six seven eight nine'];}],
    ['subject exceeds limit',g=>{g.subject='A'.repeat(241);}],
    ['mechanism exceeds limit',g=>{g.core_mechanism='A'.repeat(1201);}],
    ['component description exceeds limit',g=>{g.meaningful_components_plan[0].description='A'.repeat(601);}],
    ['recipe transformation exceeds limit',g=>{g.mechanism_plan.internal_substages[0].transformation='A'.repeat(601);}],
    ['Unicode word joiner in a label',g=>{g.visible_text_allowlist=['Re\u2060quest'];}],
    ['Unicode word joiner in a mechanism',g=>{g.core_mechanism+=' A bounded\u2060 update follows.';}],
    ['noncanonical reference policy',g=>{g.reference_policy='Use this sealed specification and neutral quality rules only.';}],
    ['expanded reference policy',g=>{g.reference_policy='Only this sealed specification and neutral quality rules. Include any additional context needed.';}],
    ['missing mechanism',g=>{delete g.core_mechanism;}],
    ['empty facts',g=>{g.verified_visual_facts=[];}],
    ['empty conceptual elements',g=>{g.conceptual_elements=[];}],
    ['non-string fact',g=>{g.verified_visual_facts=[{}];}],
    ['non-string conceptual element',g=>{g.conceptual_elements=[null];}],
    ['missing negative patterns',g=>{g.prohibited_composition_patterns=[];}],
    ['missing prohibited specifics',g=>{g.prohibited_specifics=[];}],
    ['eleven components below current premium minimum',g=>{g.meaningful_components_plan.pop();}],
    ['duplicate component identity',g=>{g.meaningful_components_plan[1].component_id='c1';}],
    ['unsupported component kind',g=>{g.meaningful_components_plan[0].support='unverified_claim';}],
    ['out-of-range factual support',g=>{g.meaningful_components_plan[0].support_index=99;}],
    ['out-of-range conceptual support',g=>{g.meaningful_components_plan[3].support_index=99;}],
    ['one internal substage',g=>{g.mechanism_plan.internal_substages.pop();}],
    ['one secondary relationship',g=>{g.mechanism_plan.secondary_relationships.pop();}],
    ['missing component link',g=>{g.mechanism_plan.internal_substages[0].output_component_id='c40';}],
    ['same-endpoint secondary relation',g=>{g.mechanism_plan.secondary_relationships[0].to_component_id=g.mechanism_plan.secondary_relationships[0].from_component_id;}]
  ];
  for(const [name,mutate] of cases) await t.test(name,()=>{
    const fixture=makeD1SpecificationsFixture();mutate(fixture.request.stories[5].generation);expectRejected(fixture);
  });
});

test('I01-T01: exact label and field-length boundaries remain admissible',()=>{
  const fixture=makeD1SpecificationsFixture(),g=fixture.request.stories[0].generation;
  g.visible_text_allowlist=['L'.repeat(80),'One two three four five six seven eight'];
  g.subject='Q'.repeat(240);g.core_mechanism='K'.repeat(1200);
  g.meaningful_components_plan[0].description='M'.repeat(600);
  reseal(fixture);
  const receipt=admitD1Specifications(fixture.request,fixture.sourceEvidence);
  assert.equal(receipt.result,'PASS',receipt.errors?.join(';'));
  assertNoImageSideEffects(receipt);
});

test('I01-T01: malformed schema structures return a failure receipt instead of throwing',async t=>{
  const cases=[
    ['null request',f=>{f.request=null;}],
    ['null source evidence',f=>{f.sourceEvidence=null;}],
    ['stories is an object',f=>{f.request.stories={};}],
    ['set plan stories is an object',f=>{f.request.set_plan.stories={};}],
    ['null generation',f=>{f.request.stories[5].generation=null;}],
    ['null component',f=>{f.request.stories[5].generation.meaningful_components_plan[0]=null;}],
    ['null internal substage',f=>{f.request.stories[5].generation.mechanism_plan.internal_substages[0]=null;}],
    ['unexpected root field',f=>{f.request.dashboard={text:'private state'};}],
    ['unexpected generation field',f=>{f.request.stories[5].generation.orchestration_note='WIP';}],
    ['unexpected component field',f=>{f.request.stories[5].generation.meaningful_components_plan[0].extra=true;}],
    ['unexpected assignment field',f=>{f.request.stories[5].generation.composition_assignment.other_story='extra';}],
    ['unexpected recipe field',f=>{f.request.stories[5].generation.mechanism_plan.extra=true;}]
  ];
  for(const [name,mutate] of cases) await t.test(name,()=>{
    const fixture=makeD1SpecificationsFixture();mutate(fixture);expectRejected(fixture,{seal:false});
  });
});

test('I01-T01: six exact source, story, edition and contract bindings are required',async t=>{
  const cases=[
    ['five stories',f=>{f.request.stories.pop();}],
    ['seven stories',f=>{f.request.stories.push(structuredClone(f.request.stories[0]));}],
    ['duplicate story identity',f=>{f.request.stories[5].story_id=f.request.stories[0].story_id;}],
    ['wrong story content hash',f=>{f.request.stories[5].story_content_sha256='f'.repeat(64);}],
    ['unsupported visual fact',f=>{f.request.stories[5].generation.verified_visual_facts[0]='The system guarantees every outcome without review.';}],
    ['source fact changed independently',f=>{f.sourceEvidence.stories[5].verified_visual_facts[0]='A different factual assertion.';}],
    ['missing source story',f=>{f.sourceEvidence.stories.pop();}],
    ['mismatched edition',f=>{f.sourceEvidence.edition_date='2026-10-10';}],
    ['mismatched execution',f=>{f.sourceEvidence.execution_id='another-execution';}],
    ['mismatched source commit',f=>{f.sourceEvidence.source_commit='b'.repeat(40);}],
    ['old contract cannot lower density',f=>{f.request.contract_version='daily-compiler-image-contract-v3';}],
    ['wrong own assignment',f=>{f.request.stories[5].generation.composition_assignment=structuredClone(f.request.stories[0].generation.composition_assignment);}],
    ['source URL missing',f=>{delete f.sourceEvidence.stories[5].source_url;}]
  ];
  for(const [name,mutate] of cases) await t.test(name,()=>{
    const fixture=makeD1SpecificationsFixture();mutate(fixture);expectRejected(fixture);
  });
});

test('I01-T02: five compositions fail even when all declared thresholds claim success',()=>{
  const fixture=makeD1SpecificationsFixture();
  changeAssignment(fixture,5,'composition_signature',fixture.request.set_plan.stories[0].composition_signature);
  expectRejected(fixture);
});

test('I01-T02: each canonical differentiation dimension is independently enforced',async t=>{
  for(const [field,count] of [['layout_signature',3],['diagram_grammar',3],['hierarchy_signature',3],['annotation_pattern_signature',2]]){
    await t.test(field,()=>{
      const fixture=makeD1SpecificationsFixture();
      const originals=fixture.request.set_plan.stories.map(s=>s[field]);
      for(let i=0;i<6;i++) changeAssignment(fixture,i,field,originals[i%count]);
      expectRejected(fixture);
    });
  }
});

test('I01-T02: signatures cannot manufacture diversity using only case, whitespace or Unicode presentation',async t=>{
  for(const [name,transform] of [
    ['case',s=>s.toUpperCase()],['outer whitespace',s=>' '+s+' '],
    ['Unicode width',s=>s.replace(/[a-z]/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0))]
  ]) await t.test(name,()=>{
    const fixture=makeD1SpecificationsFixture();
    changeAssignment(fixture,5,'composition_signature',transform(fixture.request.set_plan.stories[0].composition_signature));
    expectRejected(fixture);
  });
});

test('I01-T02: palette, metaphor, evidence and feedback assignments must be reserved',async t=>{
  for(const field of ['palette_family','mechanism_metaphor','evidence_representation','feedback_pattern']) await t.test(field,()=>{
    const fixture=makeD1SpecificationsFixture();
    delete fixture.request.set_plan.stories[5][field];
    delete fixture.request.stories[5].generation.composition_assignment[field];
    expectRejected(fixture);
  });
});

test('I01-T02: additional assignment fields do not silently impose unsupported all-six uniqueness thresholds',()=>{
  const fixture=makeD1SpecificationsFixture();
  for(const field of ['palette_family','mechanism_metaphor','evidence_representation','feedback_pattern']){
    changeAssignment(fixture,5,field,fixture.request.set_plan.stories[0][field]);
  }
  reseal(fixture);
  const receipt=admitD1Specifications(fixture.request,fixture.sourceEvidence);
  assert.equal(receipt.result,'PASS',receipt.errors?.join(';'));
});

test('I01-T03: operational identifiers, paths and prior-story subject matter cannot enter any prompt',async t=>{
  const cases=[
    ['repository name',()=> 'gttome/Daily-AI-Brief-Compiler'],
    ['fullwidth repository name',()=> 'gttome/Daily-AI-Brief-Compiler'.replace(/[!-~]/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0))],
    ['repository URL',()=> 'https://github.com/gttome/Daily-AI-Brief-Compiler'],
    ['operational path',()=> '../shadow-runs/2026-10-09/images/stale.png'],
    ['execution identifier',f=>f.request.execution_id],
    ['request identifier',f=>f.request.request_id],
    ['another story identifier',f=>f.request.stories[0].story_id],
    ['another story subject',f=>f.request.stories[0].generation.subject],
    ['lowercase terminal state',()=> 'public_closed'],
    ['lowercase bundle state',()=> 'bundle_ready'],
    ['dashboard state',()=> 'The Kanban dashboard shows WIP and waiting tasks.']
  ];
  for(const [name,text] of cases) await t.test(name,()=>{
    const fixture=makeD1SpecificationsFixture();
    fixture.request.stories[5].generation.core_mechanism+=' '+text(fixture);
    expectRejected(fixture);
    assert.throws(()=>compileD1StoryPrompt(fixture.request,fixture.sourceEvidence,fixture.request.stories[0].story_id));
  });
});

test('I01-T03: clean projection contains only the chosen story and exact own assignments',()=>{
  const {request,sourceEvidence}=makeD1SpecificationsFixture();
  for(const story of request.stories){
    const compiled=compileD1StoryPrompt(request,sourceEvidence,story.story_id);
    assert.equal(compiled.prompt_sha256,sha256(compiled.prompt));
    assert.equal(compiled.projection_sha256,canonicalSha(compiled.projection));
    assert.equal(compiled.projection.subject,story.generation.subject);
    assert.deepEqual(compiled.projection.visible_text_allowlist,story.generation.visible_text_allowlist);
    assert.deepEqual(compiled.projection.composition_assignment,story.generation.composition_assignment);
    const encoded=JSON.stringify(compiled.projection);
    for(const secret of [request.execution_id,request.request_id,request.source_commit,request.source_evidence_sha256,
      ...request.stories.map(s=>s.story_id),...sourceEvidence.stories.map(s=>s.source_url)]){
      assert.ok(!encoded.includes(secret),'projection leaked '+secret);
      assert.ok(!compiled.prompt.includes(secret),'prompt leaked '+secret);
    }
    for(const other of request.stories.filter(s=>s.story_id!==story.story_id)){
      assert.ok(!encoded.includes(other.generation.subject));
      assert.ok(!compiled.prompt.includes(other.generation.subject));
    }
    assert.doesNotThrow(()=>assertD1SubmittedPrompt(request,sourceEvidence,story.story_id,compiled.prompt));
    assert.throws(()=>assertD1SubmittedPrompt(request,sourceEvidence,story.story_id,compiled.prompt+'\nAdditional operational instructions.'));
  }
  assert.throws(()=>compileD1StoryPrompt(request,sourceEvidence,'not-a-selected-story'));
});

test('I01-T03: nested projection-bearing fields cannot smuggle operational text',async t=>{
  const mutations=[
    ['component',g=>{g.meaningful_components_plan[0].description+=' See shadow-runs/2026-10-09/compiler-state.json';}],
    ['assignment',g=>{g.composition_assignment.reading_path+=' Read the Kanban dashboard.';}],
    ['recipe',g=>{g.mechanism_plan.secondary_relationships[0].relationship+=' Supervisor retries the stalled run.';}],
    ['reference policy',g=>{g.reference_policy='Inspect gttome/Daily-AI-Brief-Compiler before drawing.';}]
  ];
  for(const [name,mutate] of mutations) await t.test(name,()=>{
    const fixture=makeD1SpecificationsFixture();mutate(fixture.request.stories[5].generation);expectRejected(fixture);
  });
});

test('I01-T04: admission and a renamed request preserve accepted, pending and exhausted lineage',()=>{
  const fixture=makeD1SpecificationsFixture();
  const histories={
    accepted:[{attempt:1,state:'ACCEPTED_LOCKED',quality_attempt_consumed:true,context_id:'accepted-context',invocation_id:'accepted-invocation',sha256:'b'.repeat(64),git_blob_sha:'c'.repeat(40),accepted_locked:true}],
    pending:[{attempt:2,state:'RAW_PERSISTED',quality_attempt_consumed:true,context_id:'pending-context',invocation_id:'pending-invocation',sha256:'d'.repeat(64)}],
    exhausted:Array.from({length:4},(_,i)=>({attempt:i+1,state:'REJECTED_QUALITY',quality_attempt_consumed:true,context_id:'exhausted-context-'+i,invocation_id:'exhausted-invocation-'+i}))
  };
  const snapshot=JSON.stringify(histories);
  for(const history of Object.values(histories)) assert.deepEqual(validateAttemptHistory(history),[]);
  const receipt=admitD1Specifications(fixture.request,fixture.sourceEvidence);
  assert.equal(receipt.result,'PASS',receipt.errors?.join(';'));assertNoImageSideEffects(receipt);
  fixture.request.request_id='renamed-request-with-same-lineage';reseal(fixture);
  assertNoImageSideEffects(admitD1Specifications(fixture.request,fixture.sourceEvidence));
  fixture.request.stories[5].generation.visible_text_allowlist=[''];expectRejected(fixture);
  assert.equal(JSON.stringify(histories),snapshot);
  assert.deepEqual(nextD0ImageOperation(histories.accepted),{action:'REUSE_ACCEPTED_LOCKED',attempt:1});
  assert.deepEqual(nextD0ImageOperation(histories.pending),{action:'RESUME_EXISTING_CANDIDATE',attempt:2,state:'RAW_PERSISTED'});
  assert.deepEqual(nextD0ImageOperation(histories.exhausted),{action:'FAIL_ATTEMPT_LIMIT',attempt:null});
  assert.throws(()=>assertAcceptedImageImmutable(histories.accepted),/accepted_image_regeneration_forbidden/);
});

test('I01-T05: a compatible prior admission is reused, while a changed request requires current validation',()=>{
  const fixture=makeD1SpecificationsFixture();
  const first=admitD1Specifications(fixture.request,fixture.sourceEvidence);
  assert.equal(first.result,'PASS',first.errors?.join(';'));
  const priorSnapshot=JSON.stringify(first);
  const reused=admitD1Specifications(fixture.request,fixture.sourceEvidence,{previousReceipt:first});
  assert.equal(reused.result,'PASS',reused.errors?.join(';'));
  assert.equal(reused.proof_reuse,'ALREADY_SATISFIED');assertNoImageSideEffects(reused);
  assert.equal(JSON.stringify(first),priorSnapshot);
  fixture.request.request_id='changed-valid-admission-request';reseal(fixture);
  const changed=admitD1Specifications(fixture.request,fixture.sourceEvidence,{previousReceipt:first});
  assert.equal(changed.result,'PASS',changed.errors?.join(';'));
  assert.notEqual(changed.proof_reuse,'ALREADY_SATISFIED');assertNoImageSideEffects(changed);
  fixture.request.stories[5].generation.core_mechanism='';reseal(fixture);
  const invalid=admitD1Specifications(fixture.request,fixture.sourceEvidence,{previousReceipt:first});
  assert.equal(invalid.result,'FAIL');assert.notEqual(invalid.proof_reuse,'ALREADY_SATISFIED');
});

test('I01-T05: altered specification, plan and evidence hashes cannot claim already-satisfied admission',async t=>{
  for(const field of ['source_evidence_sha256','set_plan_sha256','specification_sha256']) await t.test(field,()=>{
    const fixture=makeD1SpecificationsFixture();
    const previousReceipt=admitD1Specifications(fixture.request,fixture.sourceEvidence);
    if(field==='specification_sha256') fixture.request.stories[5][field]='f'.repeat(64);
    else fixture.request[field]='f'.repeat(64);
    const receipt=admitD1Specifications(fixture.request,fixture.sourceEvidence,{previousReceipt});
    assert.equal(receipt.result,'FAIL');assert.notEqual(receipt.proof_reuse,'ALREADY_SATISFIED');assertNoImageSideEffects(receipt);
  });
});
