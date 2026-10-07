import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {proposal1rRenderingAllowed} from '../image-capsules/routing.mjs';

test('Proposal 1R remains available before D0 activation',()=>{
  const r=proposal1rRenderingAllowed({activationStatus:'proof_required',specPath:'shadow-runs/2026-10-08/images/specs/s1.json',runRoot:'shadow-runs/2026-10-08'});
  assert.deepEqual(r,{allowed:true,reason:'pre_activation_legacy_reader_path'});
});

test('D0 activation forbids Proposal 1R reader-story rendering',()=>{
  const r=proposal1rRenderingAllowed({activationStatus:'active',specPath:'shadow-runs/2026-10-08/images/specs/s1.json',runRoot:'shadow-runs/2026-10-08'});
  assert.equal(r.allowed,false);
  assert.equal(r.reason,'d0_active_reader_story_proposal1r_forbidden');
});

test('D0 activation preserves explicitly internal Proposal 1R fixtures',()=>{
  assert.equal(proposal1rRenderingAllowed({activationStatus:'active',specPath:'rehearsals/renderer-smoke/images/specs/x.json',runRoot:'rehearsals/renderer-smoke'}).allowed,true);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'p1r-fixture-'));
  fs.writeFileSync(path.join(root,'.proposal1r-internal-fixture'),'internal only\n');
  assert.equal(proposal1rRenderingAllowed({activationStatus:'active',specPath:path.join(root,'images/specs/x.json'),runRoot:root}).allowed,true);
});


test('D1 activation forbids Proposal 1R reader-story rendering while preserving internal fixtures',()=>{
  const reader=proposal1rRenderingAllowed({activationStatus:'proof_required',activeReaderStrategy:'d1_cloud_image_studio',specPath:'shadow-runs/2026-10-08/images/specs/s1.json',runRoot:'shadow-runs/2026-10-08'});
  assert.equal(reader.allowed,false);
  assert.equal(reader.reason,'d1_cloud_image_studio_reader_story_proposal1r_forbidden');
  const internal=proposal1rRenderingAllowed({activationStatus:'proof_required',activeReaderStrategy:'d1_cloud_image_studio',specPath:'rehearsals/renderer-smoke/images/specs/x.json',runRoot:'rehearsals/renderer-smoke'});
  assert.equal(internal.allowed,true);
});
