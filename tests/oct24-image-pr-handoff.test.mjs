import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const docs=[
  'docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md',
  'docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md',
  'docs/automation/TWO_TASK_DAILY_RUNBOOK.md'
];

test('October 24 Rev8 handoff uses protected PR head admission, not retired push CI',()=>{
  const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
  assert.match(ci,/on:\s*\n\s*pull_request:/);
  assert.doesNotMatch(ci,/^\s*- 'image-package\/\*\*'\s*$/m);
  assert.match(ci,/github\.event_name == 'pull_request' && startsWith\(github\.head_ref, 'image-package\/'\)/);
  assert.match(ci,/preflight-recurring-image-package\.mjs/);
  for(const path of docs){
    const body=fs.readFileSync(path,'utf8');
    assert.match(body,/PRE_PR_PACKAGE_PASS/);
    assert.match(body,/(?:PR.head|pull.request|pull-request).*?(?:CI|job|gate)/i);
    assert.doesNotMatch(body,/(?:require|wait for).*?(?:package|compiler-validation).*?push check.*?(?:before|open).*?PR/i);
  }
});
