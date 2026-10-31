import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IMAGE_LAYOUT_REQUIREMENTS} from '../scripts/image-layout-contract.mjs';

const entrypoints=[
 'docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md',
 'docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md'
];
const current=fs.readFileSync('docs/external-app/CURRENT_IMAGE_REQUIREMENTS.md','utf8');
test('current image requirements match the effective machine-readable geometry and typography',()=>{
 for(const key of ['width','height','safe_margin_px','priority_font_px','secondary_font_px','effective_date']){
  assert.match(current,new RegExp('`'+key+'`: \\*\\*'+IMAGE_LAYOUT_REQUIREMENTS[key]+'\\*\\*'),key);
 }
 for(const field of ['composition_geometry','region_id','connector_anchors','prompt_geometry_review',
   'regions_match_composition','labels_match_regions','connectors_match_source',
   'complete-image-export.mjs','24','UNPROVEN'])assert.ok(current.includes(field),field);
});
test('both selected REV8 entrypoints use one current contract without superseded font floors',()=>{
 for(const p of entrypoints){
  const text=fs.readFileSync(p,'utf8');
  assert.ok(text.includes('CURRENT_IMAGE_REQUIREMENTS.md'),p);
  assert.doesNotMatch(text,/\b(?:22|26|30|32)\s*(?:px|pixels)\b/i,p);
  assert.match(text,/historical/i,p);
  assert.match(text,/PRE_PR_PACKAGE_PASS/,p);
  assert.match(text,/OCT30_APPROVED_AAR_IMPLEMENTATION\.md/,p);
 }
});
