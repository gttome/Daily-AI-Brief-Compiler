import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Oct30 approved changes are prospective, reference real rejects and do not rework accepted images',()=>{
 const doc=fs.readFileSync('docs/automation/OCT30_APPROVED_AAR_IMPLEMENTATION.md','utf8');
 for(const anchor of ['#294','#295','16 genuine attempts','0/6 first-pass',
   'No paid API','40px','390px','12 article pairings','not duplicates'])
   assert.ok(doc.toLowerCase().includes(anchor.toLowerCase()),anchor);
 for(const p of ['docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md',
  'docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md'])
   assert.ok(fs.readFileSync(p,'utf8').includes('OCT30_APPROVED_AAR_IMPLEMENTATION.md'),p);
 const img=fs.readFileSync('.github/workflows/external-image-only-replacement.yml','utf8');
 assert.match(img,/node scripts\/capture-image-browser14\.mjs/);
 assert.match(img,/I3 actual 24 target image-area captures/);
});
