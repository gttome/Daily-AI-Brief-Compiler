import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const text=file=>fs.readFileSync(path.join(root,file),'utf8');
const policyPath='docs/external-app/STATIC_EDITORIAL_IMAGE_ADMISSION.md';
const entrypoints=[
  'docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md',
  'docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md',
  'EXTERNAL_APP_HANDOFF_REV8.md',
  'docs/external-app/Perfect_Image_Specification.md'
];

test('the recurring Rev8 entrypoints all reference the same static editorial image admission standard',()=>{
  assert.ok(fs.existsSync(path.join(root,policyPath)));
  for(const file of entrypoints){
    assert.ok(text(file).includes('STATIC_EDITORIAL_IMAGE_ADMISSION.md'),file+' missing classification reference');
  }
});
test('illustration admission preserves generator eligibility while distinguishing source-exact output requirements',()=>{
  const policy=text(policyPath);
  for(const phrase of [
    'static', 'editorial', 'native image creation', 'factual',
    'CAD', 'machine-readable', 'platform/tool', 'saved pixels',
    'exact label', 'GitHub', 'October 18', '21:15 America/Chicago',
    'No paid model/image APIs'
  ]) assert.ok(policy.toLowerCase().includes(phrase.toLowerCase()),'policy missing '+phrase);
  assert.match(policy,/not themselves reasons to refuse static illustration generation/i);
  assert.match(policy,/cannot override actual platform\/tool restrictions/i);
  assert.match(policy,/never claim completion before all six/i);
});
test('the correction is consistent with original full Rev8 requirements rather than creating an easy image fallback',()=>{
  const start=text(entrypoints[0]),full=text(entrypoints[1]),handoff=text(entrypoints[2]);
  for(const [name,doc] of [['start',start],['full',full],['handoff',handoff]]){
    assert.match(doc,/pixel/i,name+' missing actual pixel inspection');
    assert.match(doc,/1200/i,name+' missing required dimensions');
    assert.match(doc,/GitHub/i,name+' missing binary transport');
  }
  assert.match(full,/PRE_PR_PACKAGE_PASS/);
  assert.match(full,/24 actual desktop\/mobile/);
  assert.match(start,/exact binary GitHub readback/i);
  assert.match(handoff,/protected package PR/i);
});
